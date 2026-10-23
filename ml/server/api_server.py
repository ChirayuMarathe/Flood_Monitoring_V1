"""
api_server.py — FastAPI inference server for the AIDT Flood Digital Twin.

Implements the deployment blueprint from aidt.pdf §6:
  - Runs Type 1 (LSTM+GNN, annual ward-year hazard score) and
    Type 3 (RF+GBM, contiguous basin inundation) in parallel
  - Applies Profile A / B / C thresholds
  - Returns ward GeoJSON risk attributes for CesiumMapView.tsx

Start with:
    python ml/server/api_server.py          # default port 8000
    python ml/server/api_server.py --port 8001

Endpoints:
    GET  /health                         → server + model status
    POST /predict/ward                   → single-ward prediction
    GET  /predict/all-wards?city=mumbai  → all wards for a city (batch, <12ms target)
    GET  /predict/snapshot               → all 318 wards with GeoJSON risk attributes
    GET  /models/info                    → loaded model metadata
"""

from __future__ import annotations

import json
import logging
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("aidt-api")

REPO_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = Path(__file__).parent / "models"

# ---------------------------------------------------------------------------
# Threshold profiles from aidt.pdf Table 8
# ---------------------------------------------------------------------------
DEFAULT_THRESHOLDS = {
    "type3_rf":        {"A": 0.510, "B": 0.710, "C": 0.794},
    "type3_ensemble":  {"A": 0.527, "B": 0.696, "C": 0.821},
    "type2_lstmgnn":   {"A": 0.789, "B": 0.850, "C": 0.964},
}

TYPE3_FEATURES = [
    "ward_hist_flooded_rate",
    "twi_p90",
    "road_density_km_per_km2",
    "soil_moisture_mean",
    "is_coastal_region",
    "twi_mean",
    "rainfall_max",
]

# ---------------------------------------------------------------------------
# Global model state
# ---------------------------------------------------------------------------
_state: dict = {
    "rf": None,
    "gbm": None,
    "scaler": None,
    "thresholds": DEFAULT_THRESHOLDS.copy(),
    "feature_cols": TYPE3_FEATURES,
    "ward_static": {},       # ward_uid -> static features dict
    "loaded_at": None,
    "models_available": False,
}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class WardFeatures(BaseModel):
    ward_uid: str = Field(..., description="e.g. 'BMC_G/S', 'Pune_Admin Ward 01'")
    city: str = Field(..., description="'mumbai' | 'pune' | 'navi_mumbai'")
    ward_code: Optional[str] = Field(None, description="Dashboard ward code")

    # Dynamic weather features (current day)
    rainfall_max: float = Field(0.0, ge=0, description="Max rainfall today (mm)")
    soil_moisture_mean: float = Field(0.3, ge=0, le=1, description="ERA5 volumetric soil moisture")

    # Static terrain features (precomputed — loaded from CSV if available)
    ward_hist_flooded_rate: Optional[float] = Field(None, ge=0, le=1)
    twi_p90: Optional[float] = Field(None)
    twi_mean: Optional[float] = Field(None)
    road_density_km_per_km2: Optional[float] = Field(None, ge=0)
    is_coastal_region: Optional[float] = Field(None, ge=0, le=1)

    # Alert profile
    profile: str = Field("B", description="'A' (early warning) | 'B' (balanced) | 'C' (tactical)")


class PredictionResponse(BaseModel):
    ward_uid: str
    city: str
    ward_code: Optional[str]
    timestamp: str
    profile: str

    # Type 3: Contiguous basin (real-time map coloring)
    type3_prob: float
    type3_flagged: bool
    type3_alert_level: str     # "green" | "amber" | "red" | "critical"
    type3_color: str           # Cesium-ready hex color

    # Model confidence
    rf_prob: float
    gbm_prob: float
    ensemble_prob: float

    # Thresholds used
    threshold_used: float
    thresholds: dict


class SnapshotWard(BaseModel):
    ward_uid: str
    city: Optional[str]
    ward_code: Optional[str]
    type3_prob: float
    type3_flagged: bool
    alert_level: str
    color: str
    rf_prob: float
    gbm_prob: float


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_models():
    """Load Type 3 RF + GBM + scaler from MODELS_DIR. Graceful if not found."""
    global _state
    try:
        import joblib
    except ImportError:
        log.warning("joblib not installed — models cannot be loaded. pip install joblib")
        return

    rf_path = MODELS_DIR / "type3_rf.pkl"
    gbm_path = MODELS_DIR / "type3_gbm.pkl"
    scaler_path = MODELS_DIR / "type3_scaler.pkl"
    thr_path = MODELS_DIR / "thresholds.json"
    feat_path = MODELS_DIR / "type3_feature_cols.json"

    if not rf_path.exists():
        log.warning(
            f"Models not found at {MODELS_DIR}. "
            "Run: python ml/server/train_and_save.py --data-dir <data-dir> first. "
            "Server will run in DEMO mode with synthetic predictions."
        )
        _state["models_available"] = False
        _load_ward_static_features()
        return

    log.info("Loading Type 3 models …")
    _state["rf"] = joblib.load(rf_path)
    log.info(f"  RF loaded from {rf_path}")

    if gbm_path.exists():
        _state["gbm"] = joblib.load(gbm_path)
        log.info(f"  GBM loaded from {gbm_path}")

    if scaler_path.exists():
        _state["scaler"] = joblib.load(scaler_path)
        log.info(f"  Scaler loaded from {scaler_path}")

    if thr_path.exists():
        _state["thresholds"] = json.loads(thr_path.read_text())
        log.info(f"  Thresholds loaded: {_state['thresholds']}")

    if feat_path.exists():
        _state["feature_cols"] = json.loads(feat_path.read_text())

    _state["models_available"] = True
    _state["loaded_at"] = datetime.now(timezone.utc).isoformat()
    _load_ward_static_features()
    log.info("✅ Models ready.")


def _load_ward_static_features():
    """Load pre-computed static ward features from public/data or Desktop data folder."""
    candidates = [
        REPO_ROOT / "public" / "data" / "digital_twin" / "ward_year_master.csv",
        REPO_ROOT / "public" / "data" / "training_table_master.csv",
        REPO_ROOT / "public" / "data" / "ward_zonal_stats.csv",
        Path(os.environ.get("DIGITAL_TWIN_DIR", "")) / "ward_year_master.csv",
    ]
    csv_path = next((p for p in candidates if p.exists()), None)
    if csv_path is None:
        log.warning("No ward static feature CSV found — static features will use defaults.")
        return

    try:
        import pandas as pd
        df = pd.read_csv(csv_path)
        if "ward_uid" not in df.columns and "ward_id" in df.columns:
            df = df.rename(columns={"ward_id": "ward_uid"})

        if "year" in df.columns:
            # Use most recent year's data as static baseline
            df = df.sort_values("year").groupby("ward_uid").last().reset_index()

        for _, row in df.iterrows():
            wid = str(row.get("ward_uid", ""))
            if wid:
                _state["ward_static"][wid] = {
                    col: float(row[col]) if col in df.columns and not (
                        isinstance(row[col], float) and math.isnan(row[col])
                    ) else 0.0
                    for col in TYPE3_FEATURES
                }
        log.info(f"Loaded static features for {len(_state['ward_static'])} wards from {csv_path.name}")

        # Enrich with TWI zonal statistics if present
        twi_path = REPO_ROOT / "public" / "data" / "digital_twin" / "all_regions_ward_twi_zonal_stats.csv"
        if twi_path.exists():
            twi_df = pd.read_csv(twi_path)
            for _, row in twi_df.iterrows():
                region = str(row.get("region", ""))
                ward = str(row.get("ward", ""))
                uid = f"{region}_{ward}"
                if uid in _state["ward_static"]:
                    _state["ward_static"][uid]["twi_mean"] = float(row.get("twi_mean", 7.0))
                    _state["ward_static"][uid]["twi_p90"] = float(row.get("twi_p90", 8.0))
            log.info("Enriched ward features with real TWI zonal statistics.")
    except Exception as e:
        log.warning(f"Could not load ward static features: {e}")


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def _build_feature_vector(req: WardFeatures) -> np.ndarray:
    """Build the TYPE3_FEATURES vector for a single ward prediction."""
    static = _state["ward_static"].get(req.ward_uid, {})
    vec = []
    for col in _state["feature_cols"]:
        # Use request-provided value if given, else static CSV, else 0
        val = getattr(req, col, None)
        if val is None:
            val = static.get(col, 0.0)
        vec.append(float(val) if val is not None else 0.0)
    return np.array(vec, dtype=np.float32).reshape(1, -1)


def _predict_type3(features: np.ndarray, profile: str) -> dict:
    """Run Type 3 RF + GBM ensemble prediction."""
    thr_rf = _state["thresholds"]["type3_rf"].get(profile, 0.710)
    thr_ens = _state["thresholds"]["type3_ensemble"].get(profile, 0.696)

    if not _state["models_available"]:
        # Demo mode: generate synthetic but realistic probability based on features
        # (ward_hist_flooded_rate + soil_moisture as the main drivers)
        feat = features[0]
        hist_rate = feat[0] if len(feat) > 0 else 0.1
        soil_moist = feat[3] if len(feat) > 3 else 0.3
        rain_max = feat[6] if len(feat) > 6 else 0.0
        # Synthetic probability: logistic-ish combination
        logit = -2.0 + 3.5 * hist_rate + 2.0 * soil_moist + 0.01 * rain_max
        prob = float(1 / (1 + math.exp(-logit)))
        rf_p = prob * 0.95 + 0.02
        gbm_p = prob * 1.05 - 0.02
        rf_p = max(0.0, min(1.0, rf_p))
        gbm_p = max(0.0, min(1.0, gbm_p))
        ens_p = 0.5 * rf_p + 0.5 * gbm_p
    else:
        scaler = _state["scaler"]
        feat_s = scaler.transform(features) if scaler is not None else features

        rf_p = float(_state["rf"].predict_proba(feat_s)[0, 1])
        if _state["gbm"] is not None:
            gbm_p = float(_state["gbm"].predict_proba(feat_s)[0, 1])
        else:
            gbm_p = rf_p
        ens_p = 0.5 * rf_p + 0.5 * gbm_p

    flagged = ens_p >= thr_ens

    # Color and alert level (aidt.pdf Profile A/B/C → Green/Amber/Red/Critical)
    if ens_p >= _state["thresholds"]["type3_ensemble"].get("C", 0.821):
        level, color = "critical", "#FF1744"
    elif ens_p >= thr_ens:
        level, color = "red", "#FF6D00"
    elif ens_p >= thr_ens * 0.65:
        level, color = "amber", "#FFD600"
    else:
        level, color = "green", "#00C853"

    return {
        "rf_prob": round(rf_p, 4),
        "gbm_prob": round(gbm_p, 4),
        "ensemble_prob": round(ens_p, 4),
        "type3_prob": round(ens_p, 4),
        "type3_flagged": flagged,
        "type3_alert_level": level,
        "type3_color": color,
        "threshold_used": thr_ens,
        "thresholds": _state["thresholds"],
    }


# ---------------------------------------------------------------------------
# Ward registry (for /predict/snapshot)
# ---------------------------------------------------------------------------

def _load_ward_registry() -> list[dict]:
    """Load all wards from public GeoJSON files."""
    wards = []
    import json as jsonlib

    city_files = {
        "mumbai": REPO_ROOT / "public" / "data" / "wards" / "mumbai.geojson",
        "pune": REPO_ROOT / "public" / "data" / "wards" / "pune.geojson",
        "navi_mumbai": REPO_ROOT / "public" / "data" / "wards" / "navi_mumbai.geojson",
    }

    # Ward UID mapping helpers (mirrors export_sentinel1.py)
    import re
    _PUNE_RE = re.compile(r"Admin Ward\s+(\d+)", re.I)
    _NMMC_RE = re.compile(r"Ward No\.?\s*(\d+)", re.I)

    def map_ward_uid(city: str, code: str) -> str:
        if city == "mumbai":
            return f"BMC_{code}"
        if city == "pune":
            m = _PUNE_RE.search(code)
            n = int(m.group(1)) if m else 0
            return f"Pune_Admin Ward {n:02d}"
        if city == "navi_mumbai":
            m = re.search(r"(\d+)", code)
            n = int(m.group(1)) if m else 0
            return f"NMMC_Navi Mumbai (M Corp.) - Ward No.{n}"
        return code

    for city, path in city_files.items():
        if not path.exists():
            continue
        try:
            gj = jsonlib.loads(path.read_text(encoding="utf-8"))
            for feat in gj.get("features", []):
                props = feat.get("properties", {})
                if city == "mumbai":
                    code = props.get("Name") or props.get("NAME2") or props.get("ward_code", "")
                elif city == "pune":
                    code = props.get("name") or props.get("ward_code", "")
                elif city == "navi_mumbai":
                    code = props.get("sourcewardcode") or props.get("ward_lgd_name") or props.get("ward_lgd_code", "")
                else:
                    code = props.get("ward_code") or props.get("name", "")
                code = str(code).strip()
                uid = map_ward_uid(city, code)
                wards.append({"ward_uid": uid, "city": city, "ward_code": code})
        except Exception as e:
            log.warning(f"Could not parse {path}: {e}")

    # Fallback: derive from static features dict
    if not wards:
        for wid, feats in _state["ward_static"].items():
            region = wid.split("_")[0] if "_" in wid else "unknown"
            city_map = {"BMC": "mumbai", "Pune": "pune", "NMMC": "navi_mumbai"}
            wards.append({
                "ward_uid": wid,
                "city": city_map.get(region),
                "ward_code": None,
            })

    return wards


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


app = FastAPI(
    title="AIDT Flood Digital Twin — Inference API",
    description=__doc__,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_available": _state["models_available"],
        "mode": "live" if _state["models_available"] else "demo",
        "loaded_at": _state["loaded_at"],
        "ward_static_loaded": len(_state["ward_static"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/models/info")
async def models_info():
    return {
        "type1": {
            "name": "LSTM+GNN",
            "purpose": "Annual ward-year climate risk (municipal planning)",
            "metrics": {"NSE": 0.7804, "MAE": 0.1008, "RMSE": 0.4526},
            "status": "benchmark results — live model pending training",
        },
        "type2": {
            "name": "LSTM+GNN",
            "purpose": "Satellite-pass verification (SAR audit)",
            "metrics": {"PR_AUC": 0.607, "recall": 0.735, "threshold": 0.850},
            "status": "benchmark results — live model pending training",
        },
        "type3": {
            "name": "RF + GBM Ensemble",
            "purpose": "Real-time contiguous basin inundation (map coloring)",
            "metrics": {"F1": 0.675, "PR_AUC": 0.695},
            "models_loaded": _state["models_available"],
            "thresholds": _state["thresholds"].get("type3_ensemble", {}),
        },
        "profiles": {
            "A": "Early Warning — Recall ≥80%, max missed floods (SMS, sirens, floodgates)",
            "B": "Balanced Operational — Max F1, default dashboard (Green→Amber→Red)",
            "C": "Tactical Dispatch — High precision ~75%, deploy pumps/NDRF",
        },
    }


@app.post("/predict/ward", response_model=PredictionResponse)
async def predict_ward(req: WardFeatures):
    """Single-ward real-time flood risk prediction (Type 3)."""
    t0 = time.perf_counter()
    features = _build_feature_vector(req)
    result = _predict_type3(features, req.profile)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    log.debug(f"predict_ward {req.ward_uid} → {result['type3_alert_level']} ({elapsed_ms:.1f}ms)")

    return PredictionResponse(
        ward_uid=req.ward_uid,
        city=req.city,
        ward_code=req.ward_code,
        timestamp=datetime.now(timezone.utc).isoformat(),
        profile=req.profile,
        **result,
    )


@app.get("/predict/all-wards")
async def predict_all_wards(
    city: Optional[str] = Query(None, description="Filter by city: mumbai | pune | navi_mumbai"),
    profile: str = Query("B", description="Alert profile: A | B | C"),
    rainfall_max: float = Query(0.0, description="Current max rainfall (mm) broadcast to all wards"),
    soil_moisture: float = Query(0.3, description="Current ERA5 soil moisture broadcast"),
):
    """
    Batch prediction for all wards — target <12ms on CPU (aidt.pdf §6.1).
    Returns GeoJSON feature collection with risk attributes for CesiumMapView.tsx.
    """
    t0 = time.perf_counter()
    wards = _load_ward_registry()

    if city:
        wards = [w for w in wards if w.get("city") == city]

    results = []
    for ward in wards:
        static = _state["ward_static"].get(ward["ward_uid"], {})
        features = np.array(
            [
                static.get("ward_hist_flooded_rate", 0.1),
                static.get("twi_p90", 8.0),
                static.get("road_density_km_per_km2", 5.0),
                soil_moisture,
                static.get("is_coastal_region", 0.0),
                static.get("twi_mean", 7.0),
                rainfall_max,
            ],
            dtype=np.float32,
        ).reshape(1, -1)

        pred = _predict_type3(features, profile)
        results.append(
            SnapshotWard(
                ward_uid=ward["ward_uid"],
                city=ward.get("city"),
                ward_code=ward.get("ward_code"),
                type3_prob=pred["type3_prob"],
                type3_flagged=pred["type3_flagged"],
                alert_level=pred["type3_alert_level"],
                color=pred["type3_color"],
                rf_prob=pred["rf_prob"],
                gbm_prob=pred["gbm_prob"],
            )
        )

    elapsed_ms = (time.perf_counter() - t0) * 1000
    flagged_count = sum(1 for r in results if r.type3_flagged)

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "mode": "live" if _state["models_available"] else "demo",
        "elapsed_ms": round(elapsed_ms, 2),
        "total_wards": len(results),
        "flagged_wards": flagged_count,
        "input": {"rainfall_max": rainfall_max, "soil_moisture": soil_moisture},
        "wards": [r.model_dump() for r in results],
    }


@app.get("/predict/snapshot")
async def predict_snapshot(
    profile: str = Query("B"),
    rainfall_max: float = Query(0.0),
    soil_moisture: float = Query(0.3),
):
    """
    Full 318-ward GeoJSON snapshot for CesiumMapView.tsx polygon coloring.
    Calls /predict/all-wards internally and wraps in GeoJSON FeatureCollection.
    """
    all_result = await predict_all_wards(
        city=None, profile=profile,
        rainfall_max=rainfall_max, soil_moisture=soil_moisture,
    )
    features = []
    for w in all_result["wards"]:
        features.append({
            "type": "Feature",
            "properties": {
                "ward_uid": w["ward_uid"],
                "city": w["city"],
                "ward_code": w["ward_code"],
                "type3_prob": w["type3_prob"],
                "flagged": w["type3_flagged"],
                "alert_level": w["alert_level"],
                "fill_color": w["color"],
            },
            "geometry": None,   # geometry loaded client-side from GeoJSON files
        })

    return {
        "type": "FeatureCollection",
        "timestamp": all_result["timestamp"],
        "profile": profile,
        "mode": all_result["mode"],
        "elapsed_ms": all_result["elapsed_ms"],
        "flagged_wards": all_result["flagged_wards"],
        "features": features,
    }


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--reload", action="store_true")
    args = ap.parse_args()
    if args.reload:
        import sys
        sys.path.insert(0, str(Path(__file__).parent))
        uvicorn.run("api_server:app", host=args.host, port=args.port, reload=True)
    else:
        uvicorn.run(app, host=args.host, port=args.port)
