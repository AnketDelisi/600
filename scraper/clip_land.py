"""Clip lon/lat electoral geometries to the land.

Canada (British Columbia) and New Zealand boundary datasets include water:
the BC electoral-district polygons carry the coastal waters and NZ's
Statistics NZ electorates include harbours, straits and lakes. The maps must
show land only, so each feature is intersected with a land polygon (GADM
country/province outline, minus the Natural Earth 10m lakes).

The source files are cached under scraper/.cache (downloaded on first use):
  gadm41_CAN_1.json   GADM 4.1 Canada provinces (BC = NAME_1)
  gadm41_NZL_0.json   GADM 4.1 New Zealand outline
  ne_10m_lakes.geojson  Natural Earth 10m lakes (major lakes only)
"""
import json
import os
import urllib.request

from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")
UA = {"User-Agent": "600-map-builder/1.0"}
GADM = ("https://geodata.ucdavis.edu/gadm/gadm4.1/json/")
SOURCES = {
    "bc": ("gadm41_CAN_1.json", "NAME_1", "British Columbia"),
    "nz": ("gadm41_NZL_0.json", None, None),
}
LAKES = "ne_10m_lakes.geojson"
LAKES_URL = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
             "master/geojson/ne_10m_lakes.geojson")
# BC's big lakes: Natural Earth only carries the very largest; the provincial
# Freshwater Atlas has every lake > 1 km2 (Okanagan, Shuswap, Babine, ...)
BC_LAKES = "bc_fwa_lakes_big.geojson"
BC_LAKES_URL = ("https://openmaps.gov.bc.ca/geo/pub/"
                "WHSE_BASEMAPPING.FWA_LAKES_POLY/ows?service=WFS&version=1.1.0"
                "&request=GetFeature&typeName=WHSE_BASEMAPPING.FWA_LAKES_POLY"
                "&outputFormat=application/json&srsName=EPSG:4326"
                "&CQL_FILTER=FEATURE_AREA_SQM%20%3E%201000000")


def _ensure(name):
    path = os.path.join(CACHE, name)
    if os.path.exists(path):
        return path
    if name == BC_LAKES:
        url = BC_LAKES_URL
    elif name.startswith("gadm"):
        url = GADM + name
    else:
        url = LAKES_URL
    os.makedirs(CACHE, exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    data = urllib.request.urlopen(req, timeout=900).read()
    with open(path, "wb") as fh:
        fh.write(data)
    print("  downloaded", name, len(data), "bytes")
    return path


def land_polygon(key, bbox):
    """Land polygon (lakes removed) for a country/province, in lon/lat."""
    name, field, value = SOURCES[key]
    frame = box(*bbox)
    data = json.load(open(_ensure(name), encoding="utf8"))
    want = value.replace(" ", "").lower() if value else None
    parts = []
    for f in data["features"]:
        if want and (f["properties"].get(field) or "").replace(" ", "").lower() != want:
            continue
        g = make_valid(shape(f["geometry"]))
        if not g.intersects(frame):
            continue
        parts.append(g)
    land = unary_union(parts).intersection(frame)
    lakes = json.load(open(_ensure(LAKES), encoding="utf8"))
    lake_layers = [lakes]
    if key == "bc":
        lake_layers.append(json.load(open(_ensure(BC_LAKES), encoding="utf8")))
    lparts = []
    for layer in lake_layers:
        for f in layer["features"]:
            g = shape(f["geometry"])
            if g.intersects(frame):
                lparts.append(g)
    if lparts:
        land = land.difference(unary_union(lparts))
    return land


def clip_features(features, land, min_area=1e-8):
    """Intersect every feature's geometry with the land polygon."""
    out = []
    for f in features:
        g = make_valid(shape(f["geometry"])).intersection(land)
        if g.is_empty:
            continue
        parts = [p for p in getattr(g, "geoms", [g])
                 if p.geom_type in ("Polygon", "MultiPolygon") and p.area >= min_area]
        if not parts:
            continue
        g2 = unary_union(parts)
        f2 = dict(f)
        f2["geometry"] = mapping(g2)
        out.append(f2)
    return out
