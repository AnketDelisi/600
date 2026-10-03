#!/usr/bin/env python3
"""Build the Greece map layer and config block.

Results: June 2023 legislative election per-region table (en.wikipedia
"June 2023 Greek legislative election", official-sourced), aggregated to
the 8 geographic departments of geoBoundaries GRC ADM1 with the regions'
seat counts as weights (seats are apportioned by voters, so this is a
close approximation). Parties follow the polling-table columns
(ND, SYRIZA, PASOK, KKE, Spartans, EL, Victory, PE, MeRA25 + the newer
FL/NA/DPK/ELPIDA/ELAS at 0 in 2023). The projection uses the 2020 bonus
law (first party 20 seats at 25%, +1 per 0.5pp up to 50, then
Hare/Niemeyer among parties >= 3%). Logos: img/gr/ (prepared separately).

Writes img/greece.svg and inserts the greece block into js/config.js.

Usage: python scraper/build_greece_regions.py [--force]
"""
import json
import os
import re
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_SVG = os.path.join(ROOT, "img", "greece.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "greece.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "gr_regions.geojson")
CACHE = os.path.join(ROOT, "scraper", ".cache", "gr_2023_regions.json")
ATTRIBUTION = ("Results: June 2023 legislative election (per region); "
               "geometry: geoBoundaries.org (gbOpen)")
WIKI = ("https://en.wikipedia.org/wiki/"
        "June_2023_Greek_legislative_election")

PARTIES = ["nd", "syriza", "pasok", "kke", "sp", "el", "niki", "pe", "m25",
           "fl", "na", "dpk", "elpida", "elas"]
COL = {"ND": "nd", "SYRIZA": "syriza", "PASOK": "pasok", "KKE": "kke",
       "Spartans": "sp", "EL": "el", "Victory": "niki", "PE": "pe",
       "MERA25": "m25"}
# 13 election regions -> the 8 geographic departments of GRC ADM1
REGION = {
    "Attica": "attica",
    "Central Greece": "thessalia_central_greece",
    "Central Macedonia": "macedonia_thrace",
    "Crete": "crete",
    "Eastern Macedonia and Thrace": "macedonia_thrace",
    "Epirus": "epirus_western_macedonia",
    "Ionian Islands": "peloponnisos_w_greece_ionian",
    "North Aegean": "egean",
    "Peloponnese": "peloponnisos_w_greece_ionian",
    "South Aegean": "egean",
    "Thessaly": "thessalia_central_greece",
    "Western Greece": "peloponnisos_w_greece_ionian",
    "Western Macedonia": "epirus_western_macedonia",
}
GEOB = {
    "Agion Oros": "agion_oros",
    "Attica": "attica",
    "Crete": "crete",
    "Egean": "egean",
    "Epirus-Western Macedonia": "epirus_western_macedonia",
    "Macedonia-Thrace": "macedonia_thrace",
    "Peloponisos-W. Greece & Ionian": "peloponnisos_w_greece_ionian",
    "Thessalia-Central Greece": "thessalia_central_greece",
}
DISPLAY = {
    "attica": "Attica", "crete": "Crete", "egean": "Aegean",
    "epirus_western_macedonia": "Epirus–Western Macedonia",
    "macedonia_thrace": "Macedonia–Thrace",
    "peloponnisos_w_greece_ionian":
        "Peloponnese–Western Greece & Ionian",
    "thessalia_central_greece": "Thessaly–Central Greece",
    "agion_oros": "Mount Athos",
}
NATIONAL = {"nd": 40.56, "syriza": 17.83, "pasok": 11.84, "kke": 7.69,
            "sp": 4.68, "el": 4.44, "niki": 3.69, "pe": 3.17, "m25": 2.50,
            "fl": 0, "na": 0, "dpk": 0, "elpida": 0, "elas": 0}
SEATS = {"nd": 158, "syriza": 47, "pasok": 32, "kke": 21, "sp": 12,
         "el": 12, "niki": 10, "pe": 8, "m25": 0, "fl": 0, "na": 0,
         "dpk": 0, "elpida": 0, "elas": 0}


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(CACHE):
        import requests
        from bs4 import BeautifulSoup
        r = requests.get(WIKI, headers={"User-Agent": "600-poll-scraper/1.0"},
                         timeout=30)
        soup = BeautifulSoup(r.text, "lxml")
        t = next(tb for tb in soup.find_all("table")
                 if "Attica" in tb.get_text() and "MERA25" in tb.get_text()
                 and len(tb.find_all("tr")) < 20)
        rows = []
        for tr in t.find_all("tr"):
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if not cells or cells[0] in ("Region",) or cells[0] == "%":
                continue
            if cells[0] == "Greece" or len(cells) < 3:
                continue
            name = cells[0]
            vals = {}
            for i, key in enumerate(
                    ["nd", "syriza", "pasok", "kke", "sp", "el", "niki",
                     "pe", "m25"]):
                ci = 1 + 2 * i
                if ci >= len(cells):
                    break
                try:
                    vals[key] = float(cells[ci].replace(",", "."))
                except ValueError:
                    vals[key] = 0.0
                try:
                    vals["_s" + key] = int(cells[ci + 1])
                except (ValueError, IndexError):
                    vals["_s" + key] = 0
            rows.append({"region": name, "votes": vals})
        with open(CACHE, "w", encoding="utf8") as fh:
            json.dump(rows, fh, ensure_ascii=False)
        print("parsed 2023 regions:", len(rows))
    rows = json.load(open(CACHE, encoding="utf8"))
    print("2023 regions:", [r["region"] for r in rows])

    acc, wsum = {}, {}
    for r in rows:
        key = REGION.get(r["region"])
        if not key:
            print("  no mapping for", r["region"])
            continue
        w = sum(v for k, v in r["votes"].items() if k.startswith("_s")) or 1
        acc.setdefault(key, {}).setdefault("_w", 0)
        acc[key]["_w"] += w
        for p, v in r["votes"].items():
            if p.startswith("_s"):
                continue
            acc[key][p] = acc[key].get(p, 0) + v * w
    gebiete = {}
    weights = {k: a["_w"] for k, a in acc.items()}
    for key, a in acc.items():
        w = a.pop("_w")
        gebiete[key] = {p: round(a.get(p, 0) / w, 2) for p in PARTIES}
    # Mount Athos has no separate election results (its votes are counted
    # within Macedonia-Thrace): mirror that region.
    if "agion_oros" not in gebiete and "macedonia_thrace" in gebiete:
        gebiete["agion_oros"] = dict(gebiete["macedonia_thrace"])
    print("regions built:", len(gebiete))
    tw = sum(weights.values()) or 1
    print("aggregate national:",
          {p: round(sum(gebiete[k][p] * weights[k] for k in weights) / tw, 2)
           for p in PARTIES[:9]})

    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/GRC/ADM1/")
    features, matched = [], set()
    for f in gj["features"]:
        key = GEOB.get(f["properties"]["shapeName"])
        if not key or key not in gebiete:
            print("  no mapping for", f["properties"]["shapeName"])
            continue
        matched.add(key)
        features.append({"type": "Feature", "properties": {"periferia": key},
                         "geometry": f["geometry"]})
    print("features:", len(features), "| without geometry:",
          sorted(set(gebiete) - matched))
    assert len(features) == 8, "expected 8 departments"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "periferia", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """  greece: {
    name: 'Greece',
    seats: 300,
    threshold: 3.0,
    method: 'hare_niemeyer',      // proportional part: Hare quota + remainders
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      nd:     { code: 'ND',      name: 'New Democracy',                    name_en: 'New Democracy',                    color: '#0D5EAF' },
      syriza: { code: 'SYRIZA',  name: 'Coalition of the Radical Left',    name_en: 'Coalition of the Radical Left',    color: '#C4262E' },
      pasok:  { code: 'PASOK',   name: 'PASOK – Movement for Change',      name_en: 'PASOK – Movement for Change',      color: '#009A44' },
      kke:    { code: 'KKE',     name: 'Communist Party of Greece',        name_en: 'Communist Party of Greece',        color: '#B71C1C' },
      sp:     { code: 'SP',      name: 'Spartans',                         name_en: 'Spartans',                         color: '#5D4037' },
      el:     { code: 'EL',      name: 'Greek Solution',                   name_en: 'Greek Solution',                   color: '#00A0DE' },
      niki:   { code: 'NIKI',    name: 'Victory',                          name_en: 'Victory',                          color: '#8D6E63' },
      pe:     { code: 'PE',      name: 'Course of Freedom',                name_en: 'Course of Freedom',                color: '#7B1FA2' },
      m25:    { code: 'M25',     name: 'MeRA25',                           name_en: 'MeRA25',                           color: '#F57C00' },
      fl:     { code: 'FL',      name: 'Voice of Reason',                  name_en: 'Voice of Reason',                  color: '#FDD835' },
      na:     { code: 'NA',      name: 'New Left',                         name_en: 'New Left',                         color: '#D81B60' },
      dpk:    { code: 'DPK',     name: 'Movement for Democracy',           name_en: 'Movement for Democracy',           color: '#00838F' },
      elpida: { code: 'ELPIDA',  name: 'Hope for Democracy',               name_en: 'Hope for Democracy',               color: '#E0B959' },
      elas:   { code: 'ELAS',    name: 'Greek Left Alliance',              name_en: 'Greek Left Alliance',              color: '#A40044' },
    },
    order: ['nd', 'syriza', 'pasok', 'kke', 'sp', 'el', 'niki', 'pe', 'm25', 'fl', 'na', 'dpk', 'elpida', 'elas'],
    parlOrder: ['kke', 'elas', 'na', 'syriza', 'pe', 'm25', 'dpk', 'pasok', 'elpida', 'nd', 'fl', 'el', 'niki', 'sp'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['nd'], color: '#0D5EAF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['syriza', 'pasok', 'kke', 'sp', 'el', 'niki', 'pe', 'm25', 'fl', 'na', 'dpk', 'elpida', 'elas'], color: '#C4262E' },
    },
    lastElection: {
      date: '2023-06-25',
      // June 2023 official result (bonus law: ND 40.56% -> 50 bonus seats)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/greece.svg',
      selector: 'id',
      // 2020 bonus law: first party 20 seats at 25%, +1 per 0.5pp up to 50
      bonus: { min: 25.0, minSeats: 20, step: 0.5, maxSeats: 50 },
      districts: @@districts@@,
      // 2023 per-region shares aggregated to the 8 geographic departments
      // (seat-weighted; Mount Athos mirrors Macedonia-Thrace)
      gebiete: @@gebiete@@,
      names: @@names@@,
      national2021: @@national@@,
    },
    pollsterMAE: @@mae@@,
    maeKey: 'GR2023',
    logos: {
      nd: 'img/gr/ND.svg', syriza: 'img/gr/SYRIZA.svg', pasok: 'img/gr/PASOK.svg',
      kke: 'img/gr/KKE.svg', sp: 'img/gr/SP.svg', el: 'img/gr/EL.svg',
      niki: 'img/gr/NIKI.svg', pe: 'img/gr/PE.svg', m25: 'img/gr/M25.svg',
      fl: 'img/gr/FL.svg', na: 'img/gr/NA.svg', dpk: 'img/gr/DPK.svg',
      elpida: 'img/gr/ELPIDA.svg', elas: 'img/gr/ELAS.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(NATIONAL, 8).replace("\n", "\n      ")),
            ("seats", j(SEATS, 8).replace("\n", "\n      ")),
            ("districts", j({k: k for k in gebiete}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j(gebiete, 8).replace("\n", "\n      ")),
            ("names", j(DISPLAY, 8).replace("\n", "\n      ")),
            ("mae", "{}")):
        block = block.replace("@@%s@@" % ph, val)
    m = re.search(r"\n  greece: \{", text)
    if m:
        depth, k = 0, m.end() - 1
        while k < len(text):
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        text = text[:m.start()] + "\n" + block.rstrip()[:-1] + text[k + 1:]
    else:
        anchor = "\n};\n\n// ===== Active country"
        idx = text.index(anchor)
        text = text[:idx] + "\n" + block.rstrip() + text[idx:]
    open(cfg_path, "w", encoding="utf8").write(text)
    print("patched config.js (greece block)")


if __name__ == "__main__":
    main()
