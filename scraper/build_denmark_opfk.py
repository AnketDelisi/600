#!/usr/bin/env python3
"""Build Denmark's lower map layer: 92 opstillingskredse.

The base map is the ten storkredse (img/denmark.svg). The DAGI opstillingskredse
layer has 311 polygons but 92 unique constituencies, so dissolve it by
OPSTILKRNR. The 2026 shares come from the Danish Wikipedia results table
(which also publishes the opstillingskreds breakdown).

Writes img/denmark_opfk.svg and inserts the map2 block into js/config.js.
Usage: python scraper/build_denmark_opfk.py [--force]
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OPFK_URL = ("https://data.information.dk/open/dagi/geojson/"
            "dagi-500-opstillingskredse.geojson")
RESULT_URL = ("https://da.wikipedia.org/wiki/"
              "Resultater_ved_folketingsvalget_2026")
OPFK = os.path.join(CACHE, "dk_opfk.geojson")
RESULT_HTML = os.path.join(CACHE, "dk_results_2026.html")
DISSOLVED = os.path.join(CACHE, "dk_opfk_dissolved.geojson")
OUT_SVG = os.path.join(ROOT, "img", "denmark_opfk.svg")
ATTRIBUTION = ("Resultater: Danmarks Statistik / Wikipedia (2026); "
               "Geometri: DAGI (data.information.dk)")

# Danish party letters in the results table -> config keys
LETTERS = {"A": "s", "B": "rv", "C": "kf", "F": "sf", "H": "bp",
           "I": "la", "M": "m", "O": "df", "V": "v",
           "\u00c6": "dd", "\u00d8": "el", "\u00c5": "alt"}
# DAGI still uses the old name for the constituency that Wikipedia calls
# Bispebjerg (same OPSTILKRNR 6).
ALIASES = {"Utterslev": "Bispebjerg"}


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def parse_results(force):
    html = fetch(RESULT_URL, "dk_results_2026.html", force).decode("utf8")
    soup = BeautifulSoup(html, "html.parser")
    table = next(t for t in soup.find_all("table")
                 if "Opstillingskreds" in t.get_text(" ", strip=True))
    out = {}
    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True)
                 for c in tr.find_all(["th", "td"])]
        if len(cells) < 13 or cells[0] in ("Opstillingskreds", ""):
            continue
        try:
            vals = [float(v.replace(",", ".")) for v in cells[1:13]]
        except ValueError:
            continue
        out[cells[0]] = {LETTERS[letter]: value
                         for letter, value in zip(LETTERS, vals)}
    assert len(out) == 92, len(out)
    return out


def clean(geom):
    if not geom.is_valid:
        geom = make_valid(geom)
    if geom.geom_type == "GeometryCollection":
        geom = MultiPolygon([p for p in geom.geoms
                             if p.geom_type == "Polygon" and not p.is_empty])
    parts = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    parts = [Polygon(p.exterior) for p in parts if p.area > 0]
    return MultiPolygon(parts) if len(parts) > 1 else parts[0]


def build_geojson(force):
    raw = json.loads(fetch(OPFK_URL, "dk_opfk.geojson", force)
                     .decode("utf8"))
    groups = {}
    for f in raw["features"]:
        p = f["properties"]
        key = str(p["OPSTILKRNR"])
        item = groups.setdefault(key, {"name": p["OPSTILNAVN"],
                                       "geoms": []})
        item["geoms"].append(shape(f["geometry"]))
    feats = []
    for key, item in sorted(groups.items(), key=lambda kv: int(kv[0])):
        geom = clean(unary_union(item["geoms"]))
        polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
        rings = []
        for poly in polys:
            rings.append([list(poly.exterior.coords)])
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": key, "name": item["name"]},
            "geometry": {"type": "MultiPolygon", "coordinates": rings},
        })
    assert len(feats) == 92, len(feats)
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


def map2_block(results, feats):
    names = {str(f["properties"]["shapeName"]): f["properties"]["name"]
             for f in feats}
    # DAGI's Utterslev is the current Bispebjerg constituency.
    for key, name in list(names.items()):
        if name in ALIASES:
            names[key] = ALIASES[name]
    for name in names.values():
        assert name in results, name
    districts = {key: key for key in names}
    gebiete = {key: results[name] for key, name in names.items()}
    j = lambda value: json.dumps(value, ensure_ascii=False)
    return """    map2: {
      svg: 'img/denmark_opfk.svg',
      selector: 'id',
      label: 'OPSTILLINGSKREDSE',
      layerCount: 92,
      districts: %s,
      names: %s,
      gebiete: %s,
    },
""" % (j(districts), j(names), j(gebiete))


def patch_config(block):
    path = os.path.join(ROOT, "js", "config.js")
    text = open(path, encoding="utf8").read()
    start = text.index("  dk: {")
    end = text.index("\n  fi: {", start)
    body = text[start:end]
    if "svg: 'img/denmark_opfk.svg'" in body:
        print("denmark map2 already present; leaving config unchanged")
        return
    anchor = "    pollsterMAE: {},\n    maeKey: 'DK2030',"
    pos = text.index(anchor, start)
    text = text[:pos] + block + text[pos:]
    open(path, "w", encoding="utf8", newline="").write(text)
    print("patched js/config.js with Denmark map2")


def main():
    force = "--force" in sys.argv
    results = parse_results(force)
    feats = build_geojson(force)
    build_svg(force)
    patch_config(map2_block(results, feats))


if __name__ == "__main__":
    main()
