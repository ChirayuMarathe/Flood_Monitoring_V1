#!/usr/bin/env python3
"""
Stage 2 of the 3D Tiles pipeline.

Turns the per-city building GPKGs from extract_buildings.py into a streaming
3D Tiles 1.1 tileset (tileset.json + .glb content) under public/tiles/<city>/.

Why this exists: 463k extruded footprints shipped as GeoJSON is ~200MB of text
that the browser parses on the main thread before drawing anything. As a tileset
the same buildings stream by view frustum with level-of-detail, so the first
frame is up in about a second and distant geometry is never built at all.

LOD scheme: a quadtree with ADD refinement. Every node keeps the tallest
buildings in its subtree and hands the rest to its children, so flying in adds
progressively shorter buildings on top of a skyline that was already there.

Buildings sit at absolute ellipsoid height (the app runs on the default
ellipsoid globe, no terrain provider). If Cesium World Terrain is switched on
later, these need a DEM pass to rebase them onto real ground elevation.

Usage:  python3 scripts/build_3dtiles.py [city ...]
"""
import json
import math
import struct
import sys
import time
from pathlib import Path

import geopandas as gpd
import numpy as np
from pyproj import Transformer
from shapely import get_coordinates

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "data" / "buildings"
OUT_DIR = ROOT / "public" / "tiles"

CITIES = ["mumbai", "navi_mumbai", "pune"]

MAX_PER_TILE = 1200          # buildings per tile before the node splits
MAX_DEPTH = 9
BASE_HEIGHT_M = -3.0         # sink slightly so footprints never float over the globe
MIN_HEIGHT_M = 3.0           # skip sheds and garages
SIMPLIFY_DEG = 4.5e-6        # ~0.5m: drops redundant OSM vertices
ROOT_GEOMETRIC_ERROR = 2400.0

# Same palette the runtime loader used, so the city keeps its look.
BUILDING_PALETTES = {
    "residential": ["#C4B5A0", "#B8A994", "#D4C5B0", "#BFB09B", "#A89888"],
    "apartments":  ["#C9B99A", "#D6C8A8", "#B5A68E", "#CABBA0", "#AFA08A"],
    "commercial":  ["#A8B0B8", "#98A0A8", "#B8C0C8", "#8890A0", "#C0C8D0"],
    "office":      ["#8898A8", "#7888A0", "#6880A0", "#B0BCC8", "#A0ACB8"],
    "industrial":  ["#8A8A80", "#7A7A70", "#9A9A90", "#6A6A60", "#A0A098"],
    "retail":      ["#C8B898", "#B8A888", "#D0C0A0", "#C0B090", "#A89878"],
    "hotel":       ["#B0A090", "#C0B0A0", "#A09888", "#D0C0B0", "#908070"],
    "hospital":    ["#E0D8D0", "#D0C8C0", "#F0E8E0", "#C8C0B8", "#E8E0D8"],
    "school":      ["#C8B8A0", "#B8A890", "#D8C8B0", "#A89880", "#D0C0A8"],
    "church":      ["#D8D0C0", "#C8C0B0", "#E0D8C8", "#B8B0A0", "#C0B8A8"],
}
DEFAULT_PALETTE = ["#C0B8A8", "#B0A898", "#D0C8B8", "#A89888", "#BEB6A6"]
GLASS_TINT = np.array([0x70, 0x90, 0xB0], dtype=np.float32)

to_ecef = Transformer.from_crs("EPSG:4326", "EPSG:4978", always_xy=True)


def hex_rgb(h: str) -> np.ndarray:
    return np.array([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)], dtype=np.float32)


PALETTE_RGB = {k: np.stack([hex_rgb(c) for c in v]) for k, v in BUILDING_PALETTES.items()}
DEFAULT_RGB = np.stack([hex_rgb(c) for c in DEFAULT_PALETTE])


def building_colors(heights: np.ndarray, types: np.ndarray) -> np.ndarray:
    """Per-building RGB, matching the old runtime palette logic."""
    out = np.empty((len(heights), 3), dtype=np.float32)
    idx = (np.abs(np.round(heights * 7.3)).astype(np.int64)) % 5

    for t in np.unique(types):
        sel = types == t
        pal = PALETTE_RGB.get(str(t).lower(), DEFAULT_RGB)
        out[sel] = pal[idx[sel]]

    # tall buildings pick up a glass curtain-wall tint
    tall = heights > 30.0
    if tall.any():
        t = np.clip((heights[tall] - 30.0) / 80.0, 0.0, 0.4)[:, None]
        out[tall] = out[tall] * (1 - t) + GLASS_TINT * t

    return np.clip(out, 0, 255).astype(np.uint8)


def earclip(ring: np.ndarray) -> list[tuple[int, int, int]]:
    """Ear-clipping triangulation of a simple polygon ring (CCW or CW, no holes)."""
    n = len(ring)
    if n < 3:
        return []
    if n == 3:
        return [(0, 1, 2)]

    area2 = 0.0
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        area2 += x1 * y2 - x2 * y1
    ccw = area2 > 0

    idx = list(range(n)) if ccw else list(range(n - 1, -1, -1))
    tris: list[tuple[int, int, int]] = []
    guard = 0

    while len(idx) > 3 and guard < 4 * n:
        guard += 1
        clipped = False
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            ax, ay = ring[i0]
            bx, by = ring[i1]
            cx, cy = ring[i2]
            cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
            if cross <= 0:
                continue  # reflex or degenerate — not an ear
            # no other vertex may fall inside the candidate ear
            contains = False
            for j in idx:
                if j in (i0, i1, i2):
                    continue
                px, py = ring[j]
                d1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
                d2 = (cx - bx) * (py - by) - (cy - by) * (px - bx)
                d3 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx)
                if d1 >= 0 and d2 >= 0 and d3 >= 0:
                    contains = True
                    break
            if contains:
                continue
            tris.append((i0, i1, i2))
            idx.pop(k)
            clipped = True
            break
        if not clipped:
            break  # self-intersecting ring; keep what we have

    if len(idx) == 3:
        tris.append((idx[0], idx[1], idx[2]))
    return tris


def load_city(city: str):
    """Rings, heights and colors for one city, as flat arrays."""
    src = SRC_DIR / f"{city}.gpkg"
    gdf = gpd.read_file(src, layer="buildings")
    gdf = gdf[gdf.height_m >= MIN_HEIGHT_M].reset_index(drop=True)

    geom = gdf.geometry.simplify(SIMPLIFY_DEG, preserve_topology=False)
    # keep the largest part of a MultiPolygon; holes are dropped (courtyards are
    # not worth the vertex budget at city scale)
    geom = geom.explode(index_parts=False)
    order = geom.area.groupby(level=0).idxmax()
    geom = geom.loc[order]
    keep = geom.index.get_level_values(0) if geom.index.nlevels > 1 else geom.index

    heights = gdf.height_m.to_numpy(dtype=np.float32)[keep]
    types = gdf.building.to_numpy()[keep]

    rings: list[np.ndarray] = []
    valid = []
    for i, g in enumerate(geom.geometry if hasattr(geom, "geometry") else geom):
        if g is None or g.is_empty:
            continue
        c = get_coordinates(g.exterior)
        if len(c) < 4:
            continue
        rings.append(c[:-1])  # drop the closing duplicate vertex
        valid.append(i)

    valid = np.array(valid, dtype=np.int64)
    return rings, heights[valid], building_colors(heights[valid], types[valid])


def centroids(rings: list[np.ndarray]) -> np.ndarray:
    return np.array([r.mean(axis=0) for r in rings], dtype=np.float64)


def enu_basis(lon_deg: float, lat_deg: float) -> np.ndarray:
    """East/north/up unit vectors at a location, as ECEF columns."""
    lon_r, lat_r = math.radians(lon_deg), math.radians(lat_deg)
    east = np.array([-math.sin(lon_r), math.cos(lon_r), 0.0])
    north = np.array([
        -math.sin(lat_r) * math.cos(lon_r),
        -math.sin(lat_r) * math.sin(lon_r),
        math.cos(lat_r),
    ])
    up = np.array([
        math.cos(lat_r) * math.cos(lon_r),
        math.cos(lat_r) * math.sin(lon_r),
        math.sin(lat_r),
    ])
    return np.stack([east, north, up], axis=1)  # columns


def build_glb(
    rings, heights, colors, members: np.ndarray,
    center_ecef: np.ndarray, basis: np.ndarray,
):
    """
    One GLB holding every building in `members`.

    Everything is authored in a single city-wide ENU frame, not a per-tile one:
    3D Tiles composes a child's transform with its parent's, so per-tile
    matrices would be applied twice and throw the children off the globe. The
    root carries the only transform. float32 still resolves ~2mm across a 35km
    city, so there is no precision cost.

    Returns (glb_bytes, enu_min, enu_max) so the caller can fit a bounding box.
    """
    positions: list[np.ndarray] = []
    colors_out: list[np.ndarray] = []
    indices: list[np.ndarray] = []
    vbase = 0

    for m in members:
        ring = rings[m]
        h = float(heights[m])
        n = len(ring)

        lon = np.repeat(ring[:, 0], 2)
        lat = np.repeat(ring[:, 1], 2)
        alt = np.tile([BASE_HEIGHT_M, BASE_HEIGHT_M + h], n)
        x, y, z = to_ecef.transform(lon, lat, alt)
        # ECEF -> tile-local ENU, so +z is genuinely "up" for the shader
        rel = np.stack([np.asarray(x), np.asarray(y), np.asarray(z)], axis=1) - center_ecef
        enu = rel @ basis  # columns are east/north/up, so this projects onto them
        # z-up -> y-up: 3D Tiles glTF content is Y-up
        positions.append(np.stack([enu[:, 0], enu[:, 2], -enu[:, 1]], axis=1).astype(np.float32))
        colors_out.append(np.tile(colors[m], (2 * n, 1)))

        # walls: bottom/top pairs are interleaved, so vertex 2i is the base of edge i
        i0 = np.arange(n)
        i1 = (i0 + 1) % n
        b0, t0, b1, t1 = 2 * i0, 2 * i0 + 1, 2 * i1, 2 * i1 + 1
        wall = np.concatenate(
            [np.stack([b0, b1, t1], axis=1), np.stack([b0, t1, t0], axis=1)]
        )
        # roof: triangulate the ring, then lift to the top vertices
        roof = np.array(earclip(ring), dtype=np.int64)
        if len(roof):
            roof = roof * 2 + 1
            tris = np.concatenate([wall, roof])
        else:
            tris = wall

        indices.append((tris + vbase).astype(np.uint32))
        vbase += 2 * n

    pos = np.concatenate(positions)
    col = np.concatenate(colors_out).astype(np.uint8)
    idx = np.concatenate(indices).ravel()

    # pad vertex colors to RGBA
    rgba = np.empty((len(col), 4), dtype=np.uint8)
    rgba[:, :3] = col
    rgba[:, 3] = 255

    pos_b = pos.tobytes()
    col_b = rgba.tobytes()
    idx_b = idx.astype(np.uint32).tobytes()

    def pad4(b: bytes) -> bytes:
        return b + b"\x00" * (-len(b) % 4)

    pos_off = 0
    col_off = len(pad4(pos_b))
    idx_off = col_off + len(pad4(col_b))
    bin_chunk = pad4(pos_b) + pad4(col_b) + pad4(idx_b)

    gltf = {
        "asset": {"version": "2.0", "generator": "flood-prediction build_3dtiles.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{
            "attributes": {"POSITION": 0, "COLOR_0": 1},
            "indices": 2,
            "material": 0,
            "mode": 4,
        }]}],
        "materials": [{
            "pbrMetallicRoughness": {
                "baseColorFactor": [1, 1, 1, 1],
                "metallicFactor": 0.0,
                "roughnessFactor": 0.92,
            },
            "doubleSided": True,
        }],
        "accessors": [
            {
                "bufferView": 0, "componentType": 5126, "count": len(pos), "type": "VEC3",
                "min": pos.min(axis=0).tolist(), "max": pos.max(axis=0).tolist(),
            },
            {"bufferView": 1, "componentType": 5121, "count": len(rgba), "type": "VEC4", "normalized": True},
            {"bufferView": 2, "componentType": 5125, "count": len(idx), "type": "SCALAR"},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": pos_off, "byteLength": len(pos_b), "target": 34962},
            {"buffer": 0, "byteOffset": col_off, "byteLength": len(col_b), "target": 34962},
            {"buffer": 0, "byteOffset": idx_off, "byteLength": len(idx_b), "target": 34963},
        ],
        "buffers": [{"byteLength": len(bin_chunk)}],
    }

    json_chunk = json.dumps(gltf, separators=(",", ":")).encode()
    json_chunk += b" " * (-len(json_chunk) % 4)

    header = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(json_chunk) + 8 + len(bin_chunk))
    glb = (
        header
        + struct.pack("<II", len(json_chunk), 0x4E4F534A) + json_chunk
        + struct.pack("<II", len(bin_chunk), 0x004E4942) + bin_chunk
    )

    # back from glTF y-up to the ENU frame the bounding boxes live in
    lo, hi = pos.min(axis=0), pos.max(axis=0)
    enu_min = np.array([lo[0], -hi[2], lo[1]], dtype=np.float64)
    enu_max = np.array([hi[0], -lo[2], hi[1]], dtype=np.float64)
    return glb, enu_min, enu_max


def bbox_of(cents: np.ndarray, members: np.ndarray):
    sub = cents[members]
    return sub[:, 0].min(), sub[:, 1].min(), sub[:, 0].max(), sub[:, 1].max()


def make_tile(city_out, rings, heights, colors, cents, members, depth, counter, stats, frame):
    """Recursive quadtree node. Returns a 3D Tiles tile dict."""
    west, south, east, north = bbox_of(cents, members)
    origin_ecef, basis = frame

    if len(members) > MAX_PER_TILE and depth < MAX_DEPTH:
        order = np.argsort(-heights[members])
        mine = members[order[:MAX_PER_TILE]]
        rest = members[order[MAX_PER_TILE:]]
    else:
        mine, rest = members, np.array([], dtype=np.int64)

    glb, enu_min, enu_max = build_glb(rings, heights, colors, mine, origin_ecef, basis)

    tid = counter[0]
    counter[0] += 1
    name = f"t{tid}.glb"
    (city_out / name).write_bytes(glb)
    stats["bytes"] += len(glb)
    stats["buildings"] += len(mine)

    # Box fitted to the geometry actually in this tile, in the shared city frame.
    box_center = (enu_min + enu_max) / 2
    half = np.maximum((enu_max - enu_min) / 2, [20.0, 20.0, 10.0])

    tile = {
        "boundingVolume": {"box": [
            *box_center.tolist(),
            half[0], 0, 0,
            0, half[1], 0,
            0, 0, half[2],
        ]},
        "geometricError": 0.0 if not len(rest) else ROOT_GEOMETRIC_ERROR / (2 ** depth),
        "refine": "ADD",
        "content": {"uri": name},
    }

    # Only the root carries a transform — child transforms compose with their
    # parent's, so repeating it at every level would apply it many times over.
    if depth == 0:
        tile["transform"] = [
            *basis[:, 0].tolist(), 0,
            *basis[:, 1].tolist(), 0,
            *basis[:, 2].tolist(), 0,
            *origin_ecef.tolist(), 1,
        ]

    if len(rest):
        mx, my = (west + east) / 2, (south + north) / 2
        quads = [
            rest[(cents[rest, 0] < mx) & (cents[rest, 1] < my)],
            rest[(cents[rest, 0] >= mx) & (cents[rest, 1] < my)],
            rest[(cents[rest, 0] < mx) & (cents[rest, 1] >= my)],
            rest[(cents[rest, 0] >= mx) & (cents[rest, 1] >= my)],
        ]
        children = [
            make_tile(city_out, rings, heights, colors, cents, q, depth + 1, counter, stats, frame)
            for q in quads if len(q)
        ]
        if children:
            tile["children"] = children

    return tile


def process(city: str) -> None:
    t0 = time.time()
    print(f"[{city}] loading footprints…")
    rings, heights, colors = load_city(city)
    print(f"[{city}] {len(rings):,} buildings after filtering ({time.time() - t0:.1f}s)")

    cents = centroids(rings)
    city_out = OUT_DIR / city
    city_out.mkdir(parents=True, exist_ok=True)
    for old in city_out.glob("*.glb"):
        old.unlink()

    # One ENU frame for the whole city — see build_glb for why it isn't per-tile.
    origin_lon, origin_lat = float(cents[:, 0].mean()), float(cents[:, 1].mean())
    frame = (
        np.array(to_ecef.transform(origin_lon, origin_lat, 0.0), dtype=np.float64),
        enu_basis(origin_lon, origin_lat),
    )

    counter = [0]
    stats = {"bytes": 0, "buildings": 0}
    root = make_tile(
        city_out, rings, heights, colors, cents,
        np.arange(len(rings)), 0, counter, stats, frame,
    )

    tileset = {
        "asset": {"version": "1.1"},
        "geometricError": ROOT_GEOMETRIC_ERROR,
        "root": root,
    }
    (city_out / "tileset.json").write_text(json.dumps(tileset, separators=(",", ":")))

    print(
        f"[{city}] {counter[0]} tiles, {stats['buildings']:,} buildings, "
        f"{stats['bytes'] / 1e6:.1f}MB total, "
        f"{stats['bytes'] / max(counter[0], 1) / 1e3:.0f}KB avg/tile "
        f"({time.time() - t0:.1f}s)"
    )


if __name__ == "__main__":
    for c in sys.argv[1:] or CITIES:
        process(c)
