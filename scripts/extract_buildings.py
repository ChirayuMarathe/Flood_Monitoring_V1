#!/usr/bin/env python3
"""
Stage 1 of the 3D Tiles pipeline.

Reads building footprints out of the OSM geopackages, attaches a height in metres
to each one, and writes a GeoParquet per city for the tiler (stage 2) to consume.

Height priority:
  1. Google Open Buildings 2.5D raster (*_building_height.tif) — max of 5 sample
     points inside the footprint, so a tall block isn't flattened by one bad pixel
  2. OSM `building:levels` x 3.2 m
  3. OSM `height` tag
  4. 8.0 m default

Usage:  python3 scripts/extract_buildings.py [city ...]
"""
import re
import sys
import time
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "data" / "buildings"

MUMBAI_GPKG = ROOT / "upload/planet_72.721,18.871_73.311,19.293-geopackage/planet_72.721,18.871_73.311,19.293.gpkg"
PUNE_GPKG = ROOT / "upload/pune_geopackage/planet_73.705,18.423_74.015,18.647-geopackage/planet_73.705,18.423_74.015,18.647.gpkg"

# Mumbai and Navi Mumbai share one geopackage; they're split by the raster bbox.
CITIES = {
    "mumbai":      {"gpkg": MUMBAI_GPKG, "raster": ROOT / "mumbai_building_height.tif"},
    "navi_mumbai": {"gpkg": MUMBAI_GPKG, "raster": ROOT / "navi_mumbai_building_height.tif"},
    "pune":        {"gpkg": PUNE_GPKG,   "raster": ROOT / "pune_building_height.tif"},
}

LEVEL_HEIGHT_M = 3.2
DEFAULT_HEIGHT_M = 8.0

_levels_re = re.compile(r'"building:levels"=>"([\d.]+)"')
_height_re = re.compile(r'"height"=>"([\d.]+)"')


def tag_height(other_tags) -> float:
    """Height from OSM tags, or NaN if the tags don't carry one."""
    if not isinstance(other_tags, str) or not other_tags:
        return np.nan
    m = _levels_re.search(other_tags)
    if m:
        try:
            return float(m.group(1)) * LEVEL_HEIGHT_M
        except ValueError:
            pass
    m = _height_re.search(other_tags)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return np.nan


def raster_heights(gdf: gpd.GeoDataFrame, raster_path: Path) -> np.ndarray:
    """Max height across 5 sample points per footprint. NaN outside the raster."""
    with rasterio.open(raster_path) as src:
        left, bottom, right, top = src.bounds
        b = gdf.geometry.bounds
        cx = ((b.minx + b.maxx) / 2).to_numpy()
        cy = ((b.miny + b.maxy) / 2).to_numpy()
        # centroid plus four points pulled 25% in from the footprint bbox corners
        qx0 = (b.minx + (b.maxx - b.minx) * 0.25).to_numpy()
        qx1 = (b.minx + (b.maxx - b.minx) * 0.75).to_numpy()
        qy0 = (b.miny + (b.maxy - b.miny) * 0.25).to_numpy()
        qy1 = (b.miny + (b.maxy - b.miny) * 0.75).to_numpy()

        samples = [(cx, cy), (qx0, qy0), (qx1, qy0), (qx0, qy1), (qx1, qy1)]
        best = np.full(len(gdf), np.nan, dtype="float32")

        for xs, ys in samples:
            inside = (xs >= left) & (xs <= right) & (ys >= bottom) & (ys <= top)
            if not inside.any():
                continue
            coords = np.column_stack([xs[inside], ys[inside]])
            vals = np.array([v[0] for v in src.sample(coords)], dtype="float32")
            vals[vals <= 0] = np.nan
            slot = np.full(len(gdf), np.nan, dtype="float32")
            slot[inside] = vals
            best = np.fmax(best, slot)

    return best


def process(city: str) -> None:
    cfg = CITIES[city]
    raster = cfg["raster"]
    t0 = time.time()

    with rasterio.open(raster) as src:
        bbox = tuple(src.bounds)  # (left, bottom, right, top)

    print(f"[{city}] reading footprints from {cfg['gpkg'].name} within {tuple(round(v, 3) for v in bbox)}")
    gdf = gpd.read_file(
        cfg["gpkg"],
        layer="multipolygons",
        columns=["osm_id", "name", "building", "other_tags"],
        where="building IS NOT NULL",
        bbox=bbox,
    )
    print(f"[{city}] {len(gdf):,} footprints in {time.time() - t0:.1f}s")
    if gdf.empty:
        print(f"[{city}] nothing to do")
        return

    gdf = gdf.set_crs("EPSG:4326", allow_override=True)

    h_raster = raster_heights(gdf, raster)
    h_tags = gdf["other_tags"].map(tag_height).to_numpy(dtype="float32")

    height = np.where(np.isfinite(h_raster), h_raster, h_tags)
    height = np.where(np.isfinite(height), height, DEFAULT_HEIGHT_M).astype("float32")
    height = np.clip(height, 2.0, 400.0)

    out = gpd.GeoDataFrame(
        {
            "osm_id": gdf["osm_id"].fillna("").astype(str),
            "name": gdf["name"].fillna("").astype(str),
            "building": gdf["building"].fillna("yes").astype(str),
            "height_m": height,
            "src": np.where(
                np.isfinite(h_raster), "raster",
                np.where(np.isfinite(h_tags), "osm", "default"),
            ),
        },
        geometry=gdf.geometry,
        crs="EPSG:4326",
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"{city}.gpkg"
    dest.unlink(missing_ok=True)
    out.to_file(dest, driver="GPKG", layer="buildings")

    counts = pd.Series(out["src"]).value_counts().to_dict()
    print(
        f"[{city}] wrote {dest.relative_to(ROOT)} — {len(out):,} buildings, "
        f"height source {counts}, median {float(np.median(height)):.1f}m, "
        f"max {float(height.max()):.1f}m  ({time.time() - t0:.1f}s)"
    )


if __name__ == "__main__":
    targets = sys.argv[1:] or list(CITIES)
    for c in targets:
        if c not in CITIES:
            raise SystemExit(f"unknown city {c!r}; expected one of {list(CITIES)}")
        process(c)
