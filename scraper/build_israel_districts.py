#!/usr/bin/env python3
"""Build the Israel district map (6 districts) + config map block.

The Knesset is elected in a single nationwide district, so the map is a
regional view: the 2022 party shares per district, aggregated from the
official Central Elections Committee results by locality (data.gov.il
"votes-knesset" dataset, Knesset 25) joined with the localities->districts
registry ("citiedistricts"). Locality names are matched with punctuation
and spacing stripped; unmatched rows (military/special committees, West
Bank localities) are dropped and reported. Geometry: geoBoundaries ISR
ADM1 (6 districts).

Writes img/israel.svg and inserts a map block into the israel config.

Usage: python scraper/build_israel_districts.py [--force]
"""
import json
import os
import re
import sys

import requests

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "israel.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "israel.svg")
RESULTS_URL = "https://data.gov.il/api/3/action/datastore_search"
RESULTS_RID = "b392b8ee-ba45-4ea0-bfed-f03a1a36e99c"   # Knesset 25 by locality
CITIES_RID = "b6ca0817-187e-470f-be34-4561c2e404b2"    # localities + districts
ATTRIBUTION = ("Risultati: ועדת הבחירות המרכזית (Knesset 25, data.gov.il); "
               "Geometria: geoBoundaries.org")

PARTIES = ["likud", "together", "rzp", "otzma", "blue_white", "shas", "utj",
           "yb", "raam", "joint_list", "dems", "yashar", "reservists",
           "amcha"]
# 2022 ballot letter -> config party (from the national totals)
LETTERS = {"מחל": "likud", "פה": "together", "כן": "blue_white",
           "שס": "shas", "ג": "utj", "ל": "yb", "עם": "raam",
           "ום": "joint_list", "אמת": "dems"}
# ט = Religious Zionism + Otzma Yehudit joint list: split like the config
RZP_SHARE = 5.4 / (5.4 + 4.6)
DISTRICTS = {"צפון": "north", "חיפה": "haifa", "ירושלים": "jerusalem",
             "מרכז": "central", "תל אביב": "tel_aviv", "דרום": "south"}
GEO_NAMES = {"Central District": "central", "Haifa": "haifa",
             "Jerusalem District": "jerusalem", "Northern District": "north",
             "Southern District": "south", "Tel Aviv": "tel_aviv"}
NAME_MAP = os.path.join(CACHE, "israel_geo_names.json")


def norm(s):
    return re.sub(r"[\s\-'\".,()]+", "", s or "")


def datastore(rid, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        d = requests.get(RESULTS_URL, params={"resource_id": rid,
                                              "limit": 32000},
                         headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300).json()["result"]
        json.dump(d, open(path, "w", encoding="utf8"), ensure_ascii=False)
    return json.load(open(path, encoding="utf8"))


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    res = datastore(RESULTS_RID, "il_k25_localities.json", force)
    cities = datastore(CITIES_RID, "il_cities_districts.json", force)
    print("localities:", len(res["records"]),
          "| registry:", len(cities["records"]))

    dist_of = {}
    for r in cities["records"]:
        key = DISTRICTS.get((r["DistrictName"] or "").strip())
        if key:
            dist_of[norm(r["CityName"])] = key

    votes = {k: {p: 0 for p in PARTIES} for k in DISTRICTS.values()}
    total = {k: 0 for k in DISTRICTS.values()}
    matched = dropped = 0
    for r in res["records"]:
        key = dist_of.get(norm(r["שם ישוב"]))
        if not key:
            dropped += 1
            continue
        matched += 1
        row = {p: 0 for p in PARTIES}
        for letter, p in LETTERS.items():
            row[p] += r.get(letter, 0) or 0
        tz = r.get("ט", 0) or 0
        row["rzp"] += tz * RZP_SHARE
        row["otzma"] += tz * (1 - RZP_SHARE)
        for p in PARTIES:
            votes[key][p] += row[p]
        # district valid total: all 41 list columns
        for col, val in r.items():
            if col in ("_id", "סמל ועדה", "שם ישוב", "סמל ישוב", "בזב",
                       "מצביעים", "פסולים", "כשרים"):
                continue
            if isinstance(val, int):
                total[key] += val
    print("matched:", matched, "| dropped:", dropped)
    gebiete = {}
    for key in DISTRICTS.values():
        vv = total[key] or 1
        gebiete[key] = {p: round(votes[key][p] * 100 / vv, 2) for p in PARTIES}
        print("  %-9s" % key, {p: gebiete[key][p] for p in PARTIES[:5]})
    national = {p: round(sum(votes[k][p] for k in votes) * 100 /
                         sum(total.values()), 2) for p in PARTIES}
    print("national:", national)

    # geometry: 6 districts
    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/ISR/ADM1/")
    features = []
    for f in gj["features"]:
        raw = f["properties"]["shapeName"]
        key = GEO_NAMES.get(raw)
        if not key:
            print("  no mapping for", raw)
            continue
        features.append({"type": "Feature", "properties": {"reg": key},
                         "geometry": f["geometry"]})
    assert len(features) == 6, "expected 6 districts"
    combined = os.path.join(CACHE, "israel_districts.geojson")
    json.dump({"type": "FeatureCollection", "features": features},
              open(combined, "w", encoding="utf8"))
    json.dump(GEO_NAMES, open(NAME_MAP, "w", encoding="utf8"))
    sys.argv = ["build_map_svg.py", "--geojson", combined,
                "--name-field", "reg", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # patch the israel config: map block + blocs (reservists unaligned, Arab
    # parties their own bloc)
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  israel: {")
    # block end by brace matching: neighbouring entries are not consistently
    # indented (saxony_anhalt sits at column 0), so a "next key" regex overruns
    depth, k = 0, text.index("{", start)
    while k < len(text):
        if text[k] == "{":
            depth += 1
        elif text[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    end = k + 1
    block = text[start:end]

    block = block.replace(
        "      bloc2: { name: 'Opposition', short: 'OPP', parties: ['together', 'yb', 'dems', 'yashar', 'blue_white', 'raam', 'joint_list', 'reservists'], color: '#E30613' },",
        "      bloc2: { name: 'Opposition', short: 'OPP', parties: ['together', 'yb', 'dems', 'yashar', 'blue_white'], color: '#E30613' },\n"
        "      bloc3: { name: 'Arab parties', short: 'ARAB', parties: ['raam', 'joint_list'], color: '#2E7D32' },")
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    map_block = """
    map: {
      svg: 'img/israel.svg',
      selector: 'id',
      maxHeight: 600,               // ~1:3 aspect: cap the rendered height
      districts: @@districts@@,
      names: @@names@@,
      // 2022 vote shares per district (Central Elections Committee, Knesset 25)
      gebiete: @@gebiete@@,
      // national baseline for the uniform-swing projection (= 2022 result)
      national2021: @@national@@,
    },"""
    names = {"north": "Northern District", "haifa": "Haifa",
             "jerusalem": "Jerusalem", "central": "Central District",
             "tel_aviv": "Tel Aviv", "south": "Southern District"}
    for ph, val in (
            ("districts", j({k: k for k in DISTRICTS.values()}, 8).replace(
                "\n", "\n      ")),
            ("names", j(names, 8).replace("\n", "\n      ")),
            ("gebiete", j(gebiete, 8).replace("\n", "\n      ")),
            ("national", j(national, 8).replace("\n", "\n      "))):
        map_block = map_block.replace("@@%s@@" % ph, val)
    # drop an existing map block first, so re-runs pick up template changes
    mm = re.search(r"map: \{", block)
    if mm:
        depth, k2 = 0, mm.end() - 1
        while k2 < len(block):
            if block[k2] == "{":
                depth += 1
            elif block[k2] == "}":
                depth -= 1
                if depth == 0:
                    break
            k2 += 1
        head = block[:mm.start()].rstrip()
        tail = block[k2 + 1:]
        if head.endswith(",") and tail.lstrip().startswith(","):
            tail = tail.lstrip()[1:]
        block = head + tail
    if "map: {" not in block:
        anchor = re.search(r"\n    lastElection: \{", block)
        depth, k = 0, anchor.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        block = block[:k + 2] + map_block + block[k + 2:]
    open(cfg_path, "w", encoding="utf8").write(
        text[:start] + block + text[end:])
    print("patched config.js (israel map + blocs)")


if __name__ == "__main__":
    main()
