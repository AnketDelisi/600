#!/usr/bin/env python3
"""Build the Czechia region (kraje, 14) map layer.

Results: the region-level 2025 shares already in js/config.js (volby.cz
ps2025, used for the two-tier seat allocation). Geometry: geoBoundaries
CZE ADM1 (14 kraje, proper Czech names).

Writes img/Czechia_regions.svg and patches the czechia block in
js/config.js with a map2 layer.

Usage: python scraper/build_czechia_regions.py
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_SVG = os.path.join(ROOT, "bmv", "img", "Czechia_regions.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "cz_regions.geojson")
ATTRIBUTION = ("Vysledky: volby.cz (PS 2025); geometrie: "
               "geoBoundaries.org (gbOpen)")

NAME_MAP = {
    "Hlavní město Praha": "praha",
    "Středočeský kraj": "stredocesky",
    "Jihočeský kraj": "jihocesky",
    "Plzeňský kraj": "plzensky",
    "Karlovarský kraj": "karlovarsky",
    "Ústecký kraj": "ustecky",
    "Liberecký kraj": "liberecky",
    "Královéhradecký kraj": "kralovehradecky",
    "Pardubický kraj": "pardubicky",
    "Kraj Vysočina": "vysocina",
    "Jihomoravský kraj": "jihomoravsky",
    "Olomoucký kraj": "olomoucky",
    "Zlínský kraj": "zlinsky",
    "Moravskoslezský kraj": "moravskoslezsky",
}
DISPLAY = {
    "praha": "Praha", "stredocesky": "Středočeský kraj",
    "jihocesky": "Jihočeský kraj", "plzensky": "Plzeňský kraj",
    "karlovarsky": "Karlovarský kraj", "ustecky": "Ústecký kraj",
    "liberecky": "Liberecký kraj", "kralovehradecky": "Královéhradecký kraj",
    "pardubicky": "Pardubický kraj", "vysocina": "Vysočina",
    "jihomoravsky": "Jihomoravský kraj", "olomoucky": "Olomoucký kraj",
    "zlinsky": "Zlínský kraj", "moravskoslezsky": "Moravskoslezský kraj",
}


def main():
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  czechia: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]
    rm = re.search(r"regions: \{", block)
    depth, k = 0, rm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    regions_src = block[rm.end() - 1:k + 1]
    gebiete = {}
    for r in re.finditer(r"(\w+): \{ seats: (\d+), votes: (\d+), "
                         r"results: \{([^}]*)\} \}", regions_src):
        key = r.group(1)
        vals = dict(re.findall(r"(\w+): ([\d.]+)", r.group(4)))
        gebiete[key] = {p: float(v) for p, v in vals.items()}
    print("regions parsed:", len(gebiete))

    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/CZE/ADM1/")
    features = []
    for f in gj["features"]:
        raw = f["properties"]["shapeName"]
        key = NAME_MAP.get(raw)
        if not key:
            print("  no mapping for", raw)
            continue
        features.append({"type": "Feature",
                         "properties": {"region": key},
                         "geometry": f["geometry"]})
    print("features:", len(features))
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "region", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    bm.main()

    map2 = {"svg": "img/Czechia_regions.svg", "selector": "id",
            "districts": {k: k for k in gebiete},
            "gebiete": gebiete, "names": DISPLAY,
            "seatDots": {"method": "imperiali"},
            "label": "kraje (14)"}
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
        block = block[:m2.start()] + "\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k + 1:]
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
    print("patched config.js (czechia map2)")


if __name__ == "__main__":
    main()
