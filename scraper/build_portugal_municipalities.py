#!/usr/bin/env python3
"""Build Portugal's municipal lower layer (308 concelhos).

The base map is the 20 districts/regions. Results are the 2025 legislative
municipality totals from the public EleicoesPortuguesas TSV; geometry is the
geoBoundaries PRT ADM2 layer, matched to districts by centroid containment.
"""
import csv
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

import requests
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
TSV_URL = ("https://raw.githubusercontent.com/RuiNelson/"
           "EleicoesPortuguesas/main/legislativas2025.tsv")
ADM2_URL = ("https://github.com/wmgeolab/geoBoundaries/raw/90a1d52/"
            "releaseData/gbOpen/PRT/ADM2/"
            "geoBoundaries-PRT-ADM2_simplified.geojson")
DIST_URL = ("https://github.com/wmgeolab/geoBoundaries/raw/90a1d52/"
            "releaseData/gbOpen/PRT/ADM1/"
            "geoBoundaries-PRT-ADM1_simplified.geojson")
TSV = os.path.join(CACHE, "pt_leg2025.tsv")
ADM2 = os.path.join(CACHE, "prt_adm2.geojson")
DIST = os.path.join(CACHE, "pt_districts.geojson")
DISSOLVED = os.path.join(CACHE, "pt_municipalities.geojson")
OUT_SVG = os.path.join(ROOT, "img", "portugal_municipalities.svg")
ATTRIBUTION = ("Resultados: MAI / EleicoesPortuguesas (Legislativas 2025); "
               "Geometria: geoBoundaries PRT ADM2")

PARTY_COLS = {
    "PPD/PSD.CDS-PP": "ad",
    "PS": "ps",
    "CH": "ch",
    "IL": "il",
    "L": "livre",
    "PCP-PEV": "cdu",
    "B.E.": "be",
    "PAN": "pan",
    "JPP": "jpp",
}
# geoBoundaries spelling / naming differences
NAME_ALIASES = {
    "barriero": "barreiro",
    "ferrieradoalentejo": "ferreiradoalentejo",
    "setubul": "setubal",
    "alijezur": "aljezur",
    "povoadelanhosa": "povoadelanhoso",
    "alcanenena": "alcanena",
    "praiadavitoria": "viladapraiadavitoria",
    "serverdovouga": "severdovouga",
}


def fold(value):
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(c for c in value if not unicodedata.combining(c))
    return re.sub(r"[^a-z]", "", value.lower())


def district_key(value):
    key = fold(value)
    if "acores" in key or "aaores" in key:
        return "acores"
    if "madeira" in key:
        return "madeira"
    return key


def fetch(url, path, force=False):
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def clean(geom):
    if not geom.is_valid:
        geom = make_valid(geom)
    if geom.geom_type == "GeometryCollection":
        geom = MultiPolygon([p for p in geom.geoms
                             if p.geom_type == "Polygon" and not p.is_empty])
    parts = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    parts = [Polygon(p.exterior) for p in parts if p.area > 0]
    return MultiPolygon(parts) if len(parts) > 1 else parts[0]


def results():
    fetch(TSV_URL, TSV)
    rows = list(csv.DictReader(open(TSV, encoding="utf8"), delimiter="\t"))
    out = {}
    for row in rows:
        if row["Municipio"] == "*" or row["Freguesia"] != "*":
            continue
        key = (district_key(row["Distrito"]), fold(row["Municipio"]))
        votes = {}
        for label, party in PARTY_COLS.items():
            col = label + " - Votos (Corrente)"
            votes[party] = int(float(row.get(col) or 0))
        total = sum(votes.values())
        if total <= 0:
            continue
        out[key] = {
            "name": row["Municipio"],
            "shares": {p: round(v * 100 / total, 2)
                       for p, v in votes.items() if v > 0},
        }
    assert len(out) == 308, len(out)
    return out


def build_geojson(res):
    fetch(ADM2_URL, ADM2)
    fetch(DIST_URL, DIST)
    districts = []
    for f in json.load(open(DIST, encoding="utf8"))["features"]:
        geom = shape(f["geometry"])
        if not geom.is_valid:
            geom = make_valid(geom)
        districts.append((district_key(f["properties"]["shapeName"]), geom))
    groups = defaultdict(list)
    for f in json.load(open(ADM2, encoding="utf8"))["features"]:
        geom = shape(f["geometry"])
        centre = geom.centroid
        district = next((key for key, poly in districts
                         if poly.contains(centre)), None)
        if district is None:
            district = min(districts, key=lambda x: centre.distance(x[1]))[0]
        name = fold(f["properties"]["shapeName"])
        name = NAME_ALIASES.get(name, name)
        key = (district, name)
        if key not in res:
            matches = [k for k in res if k[1] == name]
            if len(matches) != 1:
                continue
            key = matches[0]
        groups[key].append(geom)
    feats = []
    for key, geoms in sorted(groups.items(), key=lambda kv: kv[0]):
        geom = clean(unary_union(geoms))
        polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
        rings = [[list(p.exterior.coords)] for p in polys]
        ident = key[0] + "__" + key[1]
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": ident, "name": res[key]["name"]},
            "geometry": {"type": "MultiPolygon", "coordinates": rings},
        })
    assert len(feats) == 308, len(feats)
    with open(DISSOLVED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    return feats


def build_svg(force):
    sys.argv = ["build_map_svg.py", "--geojson", DISSOLVED,
                "--name-field", "shapeName", "--no-prefix",
                "--simplify", "0.0002", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()


def map2_block(res, feats):
    names = {f["properties"]["shapeName"]: f["properties"]["name"]
             for f in feats}
    districts = {key: key for key in names}
    gebiete = {}
    for f in feats:
        key = f["properties"]["shapeName"]
        district, name = key.split("__", 1)
        # recover the result by the display name, with the same district key
        match = next(k for k in res
                     if k[0] == district and fold(res[k]["name"]) == name)
        gebiete[key] = res[match]["shares"]
    j = lambda value: json.dumps(value, ensure_ascii=False)
    return """    map2: {
      svg: 'img/portugal_municipalities.svg',
      selector: 'id',
      label: 'MUNICIPALITIES',
      layerCount: 308,
      districts: %s,
      names: %s,
      gebiete: %s,
    },
""" % (j(districts), j(names), j(gebiete))


def patch_config(block):
    path = os.path.join(ROOT, "js", "config.js")
    text = open(path, encoding="utf8").read()
    start = text.index("  pt: {")
    end = text.index("\n  uk: {", start)
    if "svg: 'img/portugal_municipalities.svg'" in text[start:end]:
        print("portugal map2 already present; leaving config unchanged")
        return
    anchor = "    pollsterMAE: {},\n    maeKey: 'PT2025',"
    pos = text.index(anchor, start)
    text = text[:pos] + block + text[pos:]
    open(path, "w", encoding="utf8", newline="").write(text)
    print("patched js/config.js with Portugal map2")


def main():
    force = "--force" in sys.argv
    res = results()
    feats = build_geojson(res)
    build_svg(force)
    patch_config(map2_block(res, feats))


if __name__ == "__main__":
    main()
