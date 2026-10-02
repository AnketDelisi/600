#!/usr/bin/env python3
"""Build the Latvian municipality (novadi) map layer from official data.

Results: CVK 14. Saeimas velesanas (sv2022) open data (data.gov.lv,
department-level results with Type-2 municipality aggregates). Geometry:
"Administrativas teritorijas 2021/2026" GeoJSON (data.gov.lv, CC0, 42
municipalities; Varaklanu novads was merged into Madona by 2026 — its
2022 votes are folded in). Riga = departments 'riga-1' + 'arzemes' (the
abroad votes belong to the Riga constituency, so both layers agree).

Writes img/latvia_novadi.svg and patches the latvia block in
js/config.js with a map2 layer.

Usage: python scraper/build_latvia_novadi.py
"""
import json
import os
import re
import sys

import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
DEP_URL = ("https://data.gov.lv/dati/dataset/b89db791-7f89-4969-87ac-"
           "0700b2f541a0/resource/026eb30b-62b9-41de-8ba8-bfe8a2e572b6/"
           "download/departments.json")
RES_URL = ("https://data.gov.lv/dati/dataset/b89db791-7f89-4969-87ac-"
           "0700b2f541a0/resource/76858736-6f50-4fdb-a495-d93b5c11dac9/"
           "download/departmentresults.json")
GEO_URL = ("https://data.gov.lv/dati/dataset/"
           "7bb04db9-97ce-4a30-b93a-10ba8dafd104/resource/"
           "f1fe9a47-62af-4156-84ae-b11ac029b00f/download/"
           "administrativas_teritorijas_2026.geojson")
OUT_SVG = os.path.join(ROOT, "bmv", "img", "latvia_novadi.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "lv_novadi.geojson")
ATTRIBUTION = ("Rezultati: CVK 14. Saeimas velesanas (data.gov.lv); "
               "geometrija: data.gov.lv (CC0)")

SLUG_MAP = {
    "jauna-vienotiba": "jv",
    "latvijas-krievu-savieniba": "lks",
    "zalo-un-zemnieku-savieniba": "zzs",
    "suverena-vara": "sv",
    "saskana-socialdemokratiska-partija": "sc",
    "politiska-partija-stabilitatei": "st",
    "nacionala-apvieniba-visu-latvijai-tevzemei-un-brivibai-lnnk": "na",
    "latvija-pirmaja-vieta": "lpv",
    "konservativie": "jkp",
    "progresivie": "pro",
    "attistibai-par": "la",
    "apvienotais-saraksts-latvijas-zala-partija-latvijas-regionu-"
    "apvieniba-liepajas-partija": "as",
}


def base(name):
    n = bm.fold(name)
    m = re.search(r"(novads|nov)$", n)
    if m:
        return n[:m.start()] + "n"
    return n


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return json.loads(urllib.request.urlopen(req, timeout=180).read())


def main():
    res = fetch(RES_URL)

    def collect(type_no):
        votes = {}
        for r in res:
            d = r.get("Department") or {}
            if d.get("Type") != type_no:
                continue
            if type_no == 1:
                key = d["Id"]
            elif d["Id"] in ("riga-1", "arzemes"):
                # abroad votes belong to the Riga constituency, so the Riga
                # unit (both layers) = Riga city + Arzemes
                key = "riga"
            else:
                key = base(d["Name"])
            acc = votes.setdefault(key, {})
            for c in r.get("CandidateLists") or []:
                pk = SLUG_MAP.get(c.get("Id"))
                n = (c.get("ValidMarkCount") or {}).get("Count", 0)
                acc["_total"] = acc.get("_total", 0) + n
                if pk:
                    acc[pk] = acc.get(pk, 0) + n
        return votes

    def shares(raw):
        out = {}
        for key, acc in raw.items():
            total = acc.get("_total", 0)
            if total > 0:
                out[key] = {p: round(v * 100 / total, 2)
                            for p, v in acc.items() if p != "_total"}
        return out

    districts = shares(collect(1))
    print("official districts:", sorted(districts))
    votes = collect(2)
    # fold Varaklanu into Madona (2026 merger)
    var_key = next((k for k in votes if k.startswith("varak")), None)
    mad_key = next((k for k in votes if k.startswith("madonas")), None)
    if var_key and mad_key:
        for p, v in votes[var_key].items():
            votes[mad_key][p] = votes[mad_key].get(p, 0) + v
        del votes[var_key]
    gebiete = shares(votes)
    print("municipalities with results:", len(gebiete))

    gj = bm.load_geojson(GEO_URL)
    features, names, matched = [], {}, set()
    for f in gj["features"]:
        raw = f["properties"]["nosaukums"]
        key = "riga" if raw == "Rīga" else base(raw)
        if key not in gebiete:
            print("  no results for", raw, "->", key)
            continue
        matched.add(key)
        names[key] = raw
        features.append({"type": "Feature",
                         "properties": {"novads": key},
                         "geometry": f["geometry"]})
    print("features:", len(features), "| results without geometry:",
          sorted(set(gebiete) - matched))

    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "novads", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    bm.main()

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  latvia: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]
    map2 = {"svg": "img/latvia_novadi.svg", "selector": "id",
            "districts": {k: k for k in gebiete},
            "gebiete": gebiete, "names": names,
            "label": "novadi (42)"}
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
    # replace the estimated layer-1 district baselines with the official
    # CVK district results so both layers agree
    block = block.replace(
        "// Parties without exact per-constituency data use estimated values",
        "// Official CVK district aggregates (sv2022)")
    gm = re.search(r"\n(\s+)gebiete: \{", block)
    indent = gm.group(1)
    depth, k = 0, gm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    new_body = json.dumps(districts, ensure_ascii=False,
                          indent=len(indent))
    block = (block[:gm.start()] + "\n" + indent + "gebiete: " +
             new_body + block[k + 1:])
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (latvia map2 + official district baselines)")


if __name__ == "__main__":
    main()
