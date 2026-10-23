"""
Sentinel-1 model pipeline -> dashboard artifact exporter.

Runs the research pipeline `train_and_compare_sentinel1_models.py` (which
lives in the digital-twin data folder, NOT in this repo) WITHOUT modifying
it, captures the in-memory results it hands to its own `save_*` functions,
and writes ONE versioned, schema-stable JSON artifact that the Next.js app
serves via /api/ml/sentinel1.

Why a wrapper instead of editing the research script:
  * The research script stays the single source of truth for modelling
    decisions; this file only does I/O.
  * The web app never imports torch/sklearn -- training is an offline batch
    job, the website only reads its results.

Usage
-----
    # Full run (trains all 9 models; LSTM/GNN/TCN are slow on CPU)
    python ml/sentinel1/export_sentinel1.py --data-dir "C:/path/to/data(digital_twin)"

    # Observed-only (seconds): exports the real Sentinel-1 ward flood record
    # without training -- useful to refresh after new S1 passes are labelled.
    python ml/sentinel1/export_sentinel1.py --observed-only

    # Fast smoke test of the whole integration (NOT final numbers)
    python ml/sentinel1/export_sentinel1.py --quick

The data dir can also be given via the DIGITAL_TWIN_DIR environment variable.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import math
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_VERSION = 1
PIPELINE_MODULE = "train_and_compare_sentinel1_models"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO_ROOT / "public" / "data" / "ml" / "sentinel1_report.json"

MODEL_FAMILY = {
    "Naive baseline": "baseline",
    "Linear Regression": "tabular",
    "Random Forest": "tabular",
    "LightGBM": "tabular",
    "Ensemble (Ridge+RF)": "tabular",
    "ARIMA": "time-series",
    "LSTM": "sequence",
    "LSTM+GNN": "sequence",
    "Temporal CNN": "sequence",
}


# ---------------------------------------------------------------------------
# Ward id mapping: pipeline ward_uid  ->  dashboard (city, ward_code)
# ---------------------------------------------------------------------------
# The dashboard normalises ward ids in src/lib/gis/WardData.ts:
#   mumbai      -> ward_code = BMC code ("G/S")
#   pune        -> ward_code = "P01".."P15"
#   navi_mumbai -> ward_code = numeric ward number ("24")
# Thane and KDMC are modelled by the pipeline but not shown on the map yet;
# they are still exported (city = None) so nothing is silently dropped.

_PUNE_RE = re.compile(r"Admin Ward\s+(\d+)", re.I)
_NMMC_RE = re.compile(r"Ward No\.?\s*(\d+)", re.I)


def map_ward_uid(ward_uid: str) -> tuple[str | None, str | None]:
    region, _, rest = ward_uid.partition("_")
    if region == "BMC":
        return "mumbai", rest.strip()
    if region == "Pune":
        m = _PUNE_RE.search(rest)
        return ("pune", f"P{int(m.group(1)):02d}") if m else ("pune", None)
    if region == "NMMC":
        m = _NMMC_RE.search(rest)
        return ("navi_mumbai", str(int(m.group(1)))) if m else ("navi_mumbai", None)
    return None, None


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def clean(value):
    """Recursively convert numpy/pandas values to JSON-safe python (NaN -> None)."""
    try:
        import numpy as np
    except ImportError:  # pragma: no cover
        np = None
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if np is not None:
        if isinstance(value, np.ndarray):
            return clean(value.tolist())
        if isinstance(value, np.integer):
            return int(value)
        if isinstance(value, np.floating):
            value = float(value)
        if isinstance(value, np.bool_):
            return bool(value)
    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else round(value, 6)
    return value


def atomic_write_json(path: Path, payload: dict) -> None:
    """Write to a temp file then rename, so the web app never reads a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class Tee(io.TextIOBase):
    """Mirror stdout to a log file while the pipeline runs."""

    def __init__(self, *streams):
        self.streams = streams

    def write(self, s):
        for st in self.streams:
            st.write(s)
            st.flush()
        return len(s)

    def flush(self):
        for st in self.streams:
            st.flush()


# ---------------------------------------------------------------------------
# Observed Sentinel-1 record (no training required)
# ---------------------------------------------------------------------------

def build_observed(mod) -> tuple[list[dict], dict]:
    """
    Per ward, per year: real S1 passes, flagged-flooded passes, flooded rate.
    Uses the pipeline's OWN threshold and monsoon filter, but does NOT apply
    SENTINEL1_YEAR_MAX, so newer passes (2025+) appear in the dashboard
    record even though the models are only evaluated through 2024.
    """
    import pandas as pd

    s1 = pd.read_csv(mod.SENTINEL1_WARD_DAY_CSV, parse_dates=["date"])
    s1["year"] = s1["date"].dt.year
    s1 = s1[(s1["year"] >= mod.SENTINEL1_YEAR_MIN) & (s1["date"].dt.month.isin([6, 7, 8, 9, 10]))]
    s1["flooded"] = (s1["water_fraction"] >= mod.WARD_WATER_FRACTION_THRESHOLD).astype(int)

    g = (
        s1.groupby(["ward_uid", "year"])
        .agg(n_acq=("flooded", "count"), n_flooded=("flooded", "sum"),
             max_wf=("water_fraction", "max"))
        .reset_index()
    )
    wards = []
    for ward_uid, sub in g.groupby("ward_uid"):
        city, code = map_ward_uid(ward_uid)
        years = [
            {"year": int(r.year), "nAcquisitions": int(r.n_acq), "nFlooded": int(r.n_flooded),
             "floodedRate": r.n_flooded / r.n_acq if r.n_acq else None,
             "maxWaterFraction": r.max_wf}
            for r in sub.sort_values("year").itertuples()
        ]
        tot_acq = int(sub["n_acq"].sum())
        tot_fl = int(sub["n_flooded"].sum())
        wards.append({
            "wardUid": ward_uid,
            "region": ward_uid.split("_")[0],
            "city": city,
            "wardCode": code,
            "observed": years,
            "totals": {"nAcquisitions": tot_acq, "nFlooded": tot_fl,
                       "floodedRate": tot_fl / tot_acq if tot_acq else None},
        })
    meta = {
        "firstDate": s1["date"].min().strftime("%Y-%m-%d"),
        "lastDate": s1["date"].max().strftime("%Y-%m-%d"),
        "nPasses": int(len(s1)),
        "nWards": int(s1["ward_uid"].nunique()),
    }
    return wards, meta


# ---------------------------------------------------------------------------
# Training run with result capture
# ---------------------------------------------------------------------------

def run_training(mod, quick: bool) -> dict:
    captured: dict = {}

    if quick:
        # Shrink the expensive parts for an integration smoke test. These are
        # module globals the pipeline reads at call time.
        base = sys.modules["train_and_compare_models"]
        for m in (base, mod):
            if hasattr(m, "EPOCHS"):
                m.EPOCHS = 2
        if hasattr(base, "SAMPLE_WARD_FRAC"):
            base.SAMPLE_WARD_FRAC = 0.35
        if hasattr(base, "SAMPLE_YEAR_MIN"):
            base.SAMPLE_YEAR_MIN = 2015

    orig_cmp = mod.save_sentinel1_comparison
    orig_year = mod.save_sentinel1_by_year
    orig_clf = mod.save_sentinel1_classification

    def cap_cmp(results):
        captured["results"] = results
        return orig_cmp(results)

    def cap_year(all_model_rows):
        captured["rows"] = all_model_rows
        out = orig_year(all_model_rows)
        captured["by_year"] = out
        return out

    def cap_clf(wardyear_clf, acquisition_clf, threshold):
        captured["wardyear_clf"] = wardyear_clf
        captured["acquisition_clf"] = acquisition_clf
        captured["threshold"] = threshold
        return orig_clf(wardyear_clf, acquisition_clf, threshold)

    mod.save_sentinel1_comparison = cap_cmp
    mod.save_sentinel1_by_year = cap_year
    mod.save_sentinel1_classification = cap_clf

    t0 = time.time()
    mod.main()
    captured["duration_s"] = time.time() - t0

    missing = {"results", "rows", "wardyear_clf"} - captured.keys()
    if missing:
        raise RuntimeError(f"Pipeline finished but did not produce: {sorted(missing)}")
    return captured


def clf_to_json(clf: dict | None) -> dict | None:
    if not clf:
        return None
    cm = clf.get("confusion_matrix")
    out = {k: clf.get(k) for k in ("n", "accuracy", "precision", "recall", "f1", "pr_auc")}
    if cm is not None:
        (tn, fp), (fn, tp) = cm
        out.update({"TN": tn, "FP": fp, "FN": fn, "TP": tp})
    return clean(out)


def build_models_section(cap: dict) -> tuple[list[dict], str | None]:
    models = []
    for name, metrics in cap["results"].items():
        models.append({
            "name": name,
            "family": MODEL_FAMILY.get(name, "other"),
            "regression": clean(metrics),
            "wardYearClassification": clf_to_json(cap["wardyear_clf"].get(name)),
        })

    # Best = highest ward-year NSE among non-baseline models that beat the baseline.
    def nse(m):
        v = (m["regression"] or {}).get("NSE")
        return v if isinstance(v, (int, float)) else -math.inf

    candidates = [m for m in models if m["family"] != "baseline"]
    best = max(candidates, key=nse, default=None)
    return models, (best["name"] if best and nse(best) > -math.inf else None)


def build_predictions(cap: dict) -> dict[str, list[dict]]:
    """ward_uid -> [{year, actual, nAcquisitions, predictions: {model: value}}]"""
    per_ward: dict[str, dict[int, dict]] = {}
    for model, rows in cap["rows"].items():
        if rows is None or len(rows) == 0:
            continue
        for r in rows.itertuples(index=False):
            entry = per_ward.setdefault(r.ward_uid, {}).setdefault(int(r.year), {
                "year": int(r.year),
                "actual": clean(r.actual),
                "nAcquisitions": clean(getattr(r, "n_acquisitions", None)),
                "predictions": {},
            })
            entry["predictions"][model] = clean(r.predicted)
    return {w: [ys[y] for y in sorted(ys)] for w, ys in per_ward.items()}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", default=os.environ.get("DIGITAL_TWIN_DIR"),
                    help="Folder containing train_and_compare_sentinel1_models.py and its CSV inputs.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="Output JSON path.")
    ap.add_argument("--observed-only", action="store_true", help="Skip training; export observed S1 record only.")
    ap.add_argument("--quick", action="store_true", help="Fast smoke test (few epochs, subsampled wards).")
    args = ap.parse_args()

    if not args.data_dir:
        ap.error("--data-dir is required (or set DIGITAL_TWIN_DIR).")
    data_dir = Path(args.data_dir).expanduser().resolve()
    script = data_dir / f"{PIPELINE_MODULE}.py"
    if not script.exists():
        ap.error(f"{script} not found.")
    out_path = Path(args.out).resolve()

    # The pipeline resolves every input relative to CWD, so run inside it.
    os.chdir(data_dir)
    sys.path.insert(0, str(data_dir))

    log_path = out_path.with_name("sentinel1_pipeline.log")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "w", encoding="utf-8") as log, contextlib.redirect_stdout(Tee(sys.__stdout__, log)):
        started = datetime.now(timezone.utc)
        mod = __import__(PIPELINE_MODULE)

        print(f"[export] Building observed Sentinel-1 record from {mod.SENTINEL1_WARD_DAY_CSV} ...")
        wards, observed_meta = build_observed(mod)

        models, best_model, by_year, threshold, duration = [], None, [], None, None
        status = "observed-only"
        predictions: dict[str, list[dict]] = {}
        acquisition = []
        if not args.observed_only:
            print("[export] Running training pipeline (this can take a long time on CPU) ...")
            cap = run_training(mod, quick=args.quick)
            models, best_model = build_models_section(cap)
            predictions = build_predictions(cap)
            threshold = clean(cap.get("threshold"))
            duration = round(cap["duration_s"], 1)
            if cap.get("by_year") is not None:
                by_year = clean(cap["by_year"].to_dict(orient="records"))
            acquisition = [
                {"name": n, **(clf_to_json(c) or {})}
                for n, c in (cap.get("acquisition_clf") or {}).items() if c
            ]
            status = "quick" if args.quick else "complete"

        for w in wards:
            w["predictions"] = predictions.get(w["wardUid"], [])

        payload = {
            "schemaVersion": SCHEMA_VERSION,
            "status": status,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "startedAt": started.isoformat(),
            "durationSeconds": duration,
            "pipeline": {
                "script": script.name,
                "sha256": sha256_of(script),
            },
            "config": clean({
                "yearMin": mod.SENTINEL1_YEAR_MIN,
                "yearMax": mod.SENTINEL1_YEAR_MAX,
                "testStartYear": mod.SENTINEL1_TEST_START_YEAR,
                "waterFractionThreshold": mod.WARD_WATER_FRACTION_THRESHOLD,
                "binaryThreshold": threshold,
                "target": "n_flooded_acquisitions per ward-year (count of flagged Sentinel-1 passes)",
            }),
            "observedMeta": observed_meta,
            "bestModel": best_model,
            "models": models,
            "acquisitionClassification": acquisition,
            "byYear": by_year,
            "wards": wards,
        }
        atomic_write_json(out_path, payload)
        print(f"[export] Wrote {out_path} ({out_path.stat().st_size / 1024:.0f} KB), status={status}, "
              f"wards={len(wards)}, models={len(models)}, best={best_model}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
