#!/usr/bin/env python3
"""Build Bulgaria's municipal lower layer (obshtini) from CEC opendata.

Base map: 28 provinces. Lower geometry: geoBoundaries BGR ADM2 (265
municipalities). CEC section coordinates are point-matched to the municipal
polygons; votes.txt is aggregated per municipality.
"""
import json
import os
import re
import sys
import zipfile
from collections import defaultdict

import requests
from shapely.geometry import MultiPolygon, Point, Polygon, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.validation import make_valid

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
ZIP = os.path.join(CACHE, "bg_pe202604_export.zip")
ADM2 = os.path.join(CACHE, "bgr_adm2.geojson")
DISSOLVED = os.path.join(CACHE, "bg_municipalities.geojson")
OUT_SVG = os.path.join(ROOT, "img", "bulgaria_municipalities.svg")
ZIP_URL = "https://results.cik.bg/pe202604/opendata/export.zip"
ADM2_URL = ("https://github.com/wmgeolab/geoBoundaries/raw/9469f09/"
            "releaseData/gbOpen/BGR/ADM2/"
            "geoBoundaries-BGR-ADM2_simplified.geojson")
ATTRIBUTION = ("Rezultati: CIK (NS 19.04.2026, opendata); "
               "Geometria: geoBoundaries BGR ADM2")
# party number in cik_parties -> config key
PARTIES = {
    "4": "mech", "5": "bsp", "7": "ppdb", "8": "vaz", "11": "aps",
    "14": "veli", "15": "gerb", "17": "dps", "21": "pb",
}


def fetch(url, path, force=False):
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=900)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def db(z, prefix):
    for name in z.namelist():
        if prefix in name and name.endswith(".txt"):
            return z.read(name).decode("utf-8-sig", errors="replace")
    raise SystemExit("missing " + prefix)


def slug(value):
    value = re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").lower()
    return value or "m"


def clean(geom):
    if not geom.is_valid:
        geom = make_valid(geom)
    if geom.geom_type == "GeometryCollection":
        geom = MultiPolygon([p for p in geom.geoms
                             if p.geom_type == "Polygon" and not p.is_empty])
    parts = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    parts = [Polygon(p.exterior) for p in parts if p.area > 0]
    return MultiPolygon(parts) if len(parts) > 1 else parts[0]


def build_results(z):
    sections = {}
    for line in db(z, "sections").splitlines():
        p = line.split(";")
        if len(p) < 8 or p[0][:2] == "32":
            continue
        try:
            sections[p[0]] = (float(p[6]), float(p[7]))
        except ValueError:
            continue
    votes = defaultdict(lambda: defaultdict(int))
    totals = defaultdict(int)
    for line in db(z, "votes").splitlines():
        p = line.split(";")
        if len(p) < 8:
            continue
        pos = sections.get(p[1])
        if not pos:
            continue
        for i in range(3, len(p) - 2, 4):
            try:
                value = int(p[i + 1])
            except (ValueError, IndexError):
                continue
            totals[p[1]] += value
            key = PARTIES.get(p[i].strip())
            if key:
                votes[p[1]][key] += value
    return sections, votes, totals


def build_geojson(force):
    fetch(ADM2_URL, ADM2, force)
    fetch(ZIP_URL, ZIP, force)
    z = zipfile.ZipFile(ZIP)
    sections, votes, totals = build_results(z)
    feats = []
    for f in json.load(open(ADM2, encoding="utf8"))["features"]:
        geom = shape(f["geometry"])
        if not geom.is_valid:
            geom = make_valid(geom)
        feats.append((f["properties"]["shapeName"], geom))
    tree = STRtree([g for _, g in feats])
    grouped = defaultdict(list)
    for code, (lon, lat) in sections.items():
        point = Point(lon, lat)
        hits = tree.query(point)
        hit = next((i for i in hits if feats[i][1].contains(point)), None)
        if hit is None:
            continue
        name = feats[hit][0]
        if code not in votes or totals[code] <= 0:
            continue
        grouped[name].append(code)
    out = []
    for name, codes in sorted(grouped.items()):
        geom = next(g for n, g in feats if n == name)
        geom = clean(geom)
        polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
        rings = [[list(p.exterior.coords)] for p in polys]
        acc = defaultdict(int)
        total = 0
        for code in codes:
            total += totals[code]
            for key, value in votes[code].items():
                acc[key] += value
        if total <= 0:
            continue
        shares = {k: round(v * 100 / total, 2) for k, v in acc.items() if v}
        out.append({
            "type": "Feature",
            "properties": {"shapeName": slug(name), "name": name},
            "geometry": {"type": "MultiPolygon", "coordinates": rings},
            "shares": shares,
        })
    # move shares out of GeoJSON properties for the map builder
    shares = {f["properties"]["shapeName"]: f.pop("shares") for f in out}
    with open(DISSOLVED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": out}, fh,
                  ensure_ascii=False)
    return out, shares


def build_svg(force):
    sys.argv = ["build_map_svg.py", "--geojson", DISSOLVED,
                "--name-field", "shapeName", "--no-prefix",
                "--simplify", "0.0002", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()


def map2_block(feats, shares):
    names = {f["properties"]["shapeName"]: f["properties"]["name"]
             for f in feats}
    districts = {key: key for key in names}
    gebiete = {key: shares[key] for key in names}
    j = lambda value: json.dumps(value, ensure_ascii=False)
    return """    map2: {
      svg: 'img/bulgaria_municipalities.svg',
      selector: 'id',
      label: 'MUNICIPALITIES',
      layerCount: %d,
      districts: %s,
      names: %s,
      gebiete: %s,
    },
""" % (len(names), j(districts), j(names), j(gebiete))


def patch_config(block):
    path = os.path.join(ROOT, "js", "config.js")
    text = open(path, encoding="utf8").read()
    start = text.index("  bg: {")
    end = text.index("\n  lt: {", start)
    if "svg: 'img/bulgaria_municipalities.svg'" in text[start:end]:
        print("bulgaria map2 already present; leaving config unchanged")
        return
    anchor = "    pollsterMAE: {},\n    maeKey: 'BG2026',"
    pos = text.index(anchor, start)
    text = text[:pos] + block + text[pos:]
    open(path, "w", encoding="utf8", newline="").write(text)
    print("patched js/config.js with Bulgaria map2")


def main():
    force = "--force" in sys.argv
    feats, shares = build_geojson(force)
    build_svg(force)
    patch_config(map2_block(feats, shares))


if __name__ == "__main__":
    main()
