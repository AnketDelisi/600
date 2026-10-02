#!/usr/bin/env python3
"""Build the Slovak okresy (79 districts) map layer from official data.

Results: NRSR2023 per-okres party shares (Statistical Office SR, CSV).
Geometry: geoBoundaries SVK ADM2 (79 okresy; shapeNames are garbled by
geoBoundaries, so each CSV okres is matched to the ADM2 feature of its
kraj (ADM1) by fuzzy name similarity — validated as a unique bijection).

Writes img/Slovakia_okresy.svg and patches the slovakia block in
js/config.js with a map2 layer (selector 'id', 79 okresy).

Usage: python scraper/build_slovakia_okresy.py
"""
import csv
import difflib
import io
import json
import os
import re
import sys

import requests
from shapely.geometry import shape

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CSV_URL = ("https://volby.statistics.sk/opendata/nrsr/2023/"
           "NRSR2023_SK_tab03d.csv")
OUT_SVG = os.path.join(ROOT, "bmv", "img", "Slovakia_okresy.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "sk_okresy.geojson")
ATTRIBUTION = ("Vysledky: Statisticky urad SR (NRSR 2023) — "
               "geometria: geoBoundaries.org (gbOpen)")

KRAJ_MAP = {
    "Bratislavský kraj": "Region of Bratislava",
    "Trnavský kraj": "Region of Trnava",
    "Trenčiansky kraj": "Region of Trenčín",
    "Nitriansky kraj": "Region of Nitra",
    "Žilinský kraj": "Region of Žilina",
    "Banskobystrický kraj": "Region of Banská Bystrica",
    "Prešovský kraj": "Region of Prešov",
    "Košický kraj": "Region of Košice",
}
PARTY_MAP = {
    "SMER - sociálna demokracia": "smer",
    "Progresívne Slovensko": "ps",
    "HLAS - sociálna demokracia": "hlas",
    "Kresťanskodemokratické hnutie": "kdh",
    "Sloboda a Solidarita": "sas",
    "Slovenská národná strana": "sns",
    "REPUBLIKA": "republika",
    "Demokrati": "demokrati",
    "SME RODINA": "rodina",
    "Kotlebovci - Ľudová strana Naše Slovensko": "lsns",
}


def party_key(name):
    if name in PARTY_MAP:
        return PARTY_MAP[name]
    if name.startswith("OĽANO A PRIATELIA"):
        return "slovensko"
    if name.startswith("SZÖVETSÉG"):
        return "aliancia"
    return None


def okres_id(name):
    return bm.fold(name).replace(" ", "")


def main():
    r = requests.get(CSV_URL, headers={"User-Agent": "Mozilla/5.0"},
                     timeout=60)
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8", "replace"))))
    okresy = {}
    for row in rows[1:]:
        if len(row) < 10 or row[1] == "Cudzina":
            continue
        o = okresy.setdefault(row[4], {"name": row[5], "kraj": row[1],
                                       "parties": {}})
        key = party_key(row[7])
        if key:
            o["parties"][key] = float(row[9])
    print(f"okresy: {len(okresy)}")

    adm1 = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/SVK/ADM1/")
    adm2 = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/SVK/ADM2/")
    kraj_shapes = {f["properties"]["shapeName"]: shape(f["geometry"])
                   for f in adm1["features"]}
    by_kraj = {}
    for f in adm2["features"]:
        geom = shape(f["geometry"])
        pt = geom.representative_point()
        k = next((n for n, s in kraj_shapes.items() if s.contains(pt)), None)
        if k is None:
            k = min(kraj_shapes, key=lambda n: kraj_shapes[n].distance(pt))
        by_kraj.setdefault(k, []).append((f["properties"]["shapeName"],
                                          f["geometry"]))

    features, gebiete, names, used = [], {}, {}, set()
    low = []
    for code, o in okresy.items():
        cands = by_kraj[KRAJ_MAP[o["kraj"]]]
        scored = sorted(((difflib.SequenceMatcher(None, bm.fold(o["name"]),
                                                  bm.fold(c)).ratio(), c, g)
                         for c, g in cands), key=lambda x: -x[0])
        ratio, adm_name, geom = scored[0]
        if adm_name in used:
            print(f"  DUPLICATE match: {o['name']} -> {adm_name}")
        used.add(adm_name)
        if ratio < 0.55:
            low.append((ratio, o["name"], adm_name))
        oid = okres_id(o["name"])
        gebiete[oid] = o["parties"]
        names[oid] = o["name"]
        features.append({"type": "Feature",
                         "properties": {"okres": oid},
                         "geometry": geom})
    print(f"matched: {len(features)} | unique: {len(used)}")
    if low:
        print("low-confidence matches:")
        for ratio, a, b in sorted(low):
            print(f"  {ratio:.2f} {a} -> {b}")

    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "okres", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    bm.main()

    # patch config.js: replace/insert map2 in the slovakia block
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  slovakia: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]
    map2 = {"svg": "img/Slovakia_okresy.svg", "selector": "id",
            "districts": {k: k for k in gebiete},
            "gebiete": gebiete, "names": names,
            "label": "okresy (79)"}
    m2 = re.search(r"\n\s+map2: \{", block)
    if m2:
        depth, k = 0, m2.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        block = block[:m2.start()] + \
            "\n      map2: " + json.dumps(map2, ensure_ascii=False,
                                          indent=6) + block[k + 1:]
    else:
        mm = re.search(r"\n\s+map: \{", block)
        depth, k = 0, mm.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        block = block[:k + 1] + ",\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k + 1:]
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (slovakia map2)")


if __name__ == "__main__":
    main()
