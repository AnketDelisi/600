#!/usr/bin/env python3
"""Build the Germany federal map layer (16 Bundeslaender) and the germany
config block.

Results: official Bundeswahlleiterin 2025 Bundestag result (btw25_kerg2.csv,
Land-level Zweitstimme; CDU + CSU folded into the Union key). Geometry:
geoBoundaries DEU ADM1 (16 states, German names). Parties are the same as
the state-level models (cdu, spd, gruene, linke, afd, fdp, bsw).

Writes img/germany.svg and inserts/replaces the germany block in
js/config.js.

Usage: python scraper/build_germany_states.py [--force]
"""
import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CSV_PATH = os.path.join(ROOT, "scraper", ".cache", "de_btw25_kerg2.csv")
CSV_URL = ("https://www.bundeswahlleiterin.de/dam/jcr/"
           "f49a47a1-735b-4e9b-b4e1-4c73cad2292e/btw25_kerg2.csv")
OUT_SVG = os.path.join(ROOT, "img", "germany.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "germany.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "de_states.geojson")
ATTRIBUTION = ("Ergebnisse: Die Bundeswahlleiterin (BTW 2025); Geometrie: "
               "geoBoundaries.org (gbOpen)")

PARTY = {"CDU": "cdu", "CSU": "cdu", "SPD": "spd", "GRÜNE": "gruene",
         "AfD": "afd", "Die Linke": "linke", "FDP": "fdp", "BSW": "bsw"}
PARTIES = ["cdu", "spd", "gruene", "linke", "afd", "fdp", "bsw"]
SEATS = {"cdu": 208, "afd": 152, "spd": 120, "gruene": 85, "linke": 64,
         "bsw": 0, "fdp": 0}


def norm(name):
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(CSV_PATH):
        req = urllib.request.Request(CSV_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=300).read()
        with open(CSV_PATH, "wb") as fh:
            fh.write(data)
        print("downloaded kerg2:", len(data), "bytes")

    txt = open(CSV_PATH, encoding="utf-8-sig").read()
    rows = list(csv.reader(io.StringIO(txt), delimiter=";"))
    hi = next(i for i, r in enumerate(rows) if r and r[0] == "Wahlart")
    hdr = rows[hi]
    data = [dict(zip(hdr, r)) for r in rows[hi + 1:] if len(r) >= len(hdr)]

    def num(s):
        return int(s.replace(".", "").replace(",", "")) if s else 0

    def pct(s):
        return float(s.replace(",", ".")) if s else 0.0

    land_votes, land_pct, bund_votes, bund_pct = {}, {}, {}, {}
    for r in data:
        if r["Gruppenart"] != "Partei" or r["Stimme"] != "2":
            continue
        key = PARTY.get(r["Gruppenname"])
        if not key:
            continue
        if r["Gebietsart"] == "Land":
            land_votes.setdefault(r["Gebietsname"], {}).setdefault(key, 0)
            land_votes[r["Gebietsname"]][key] += num(r["Anzahl"])
            land_pct.setdefault(r["Gebietsname"], {}).setdefault(key, 0.0)
            land_pct[r["Gebietsname"]][key] += pct(r["Prozent"])
        elif r["Gebietsart"] == "Bund":
            bund_votes[key] = bund_votes.get(key, 0) + num(r["Anzahl"])
            bund_pct[key] = bund_pct.get(key, 0.0) + pct(r["Prozent"])
    print("states:", len(land_pct), "| national parties:", sorted(bund_pct))

    gebiete, names = {}, {}
    for name, pp in land_pct.items():
        key = norm(name)
        gebiete[key] = {p: round(pp.get(p, 0.0), 2) for p in PARTIES}
        names[key] = name
    national = {p: round(bund_pct.get(p, 0.0), 2) for p in PARTIES}
    print("national:", national)

    # verify: state votes sum to the national count per party
    for p in PARTIES:
        sv = sum(v.get(p, 0) for v in land_votes.values())
        diff = sv - bund_votes.get(p, 0)
        print(f"  sum-check {p:7s} states {sv:>10,} vs Bund "
              f"{bund_votes.get(p, 0):>10,} ({diff:+d})")

    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/DEU/ADM1/")
    features, matched = [], set()
    for f in gj["features"]:
        key = norm(f["properties"]["shapeName"])
        if key not in gebiete:
            print("  no results for", f["properties"]["shapeName"])
            continue
        matched.add(key)
        features.append({"type": "Feature", "properties": {"land": key},
                         "geometry": f["geometry"]})
    print("features:", len(features), "| without geometry:",
          sorted(set(gebiete) - matched))
    assert len(features) == 16, "expected 16 states"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "land", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """  germany: {
    name: 'Germany',
    seats: 630,
    threshold: 5.0,
    method: 'sainte_lague_standard', // Sainte-Laguë/Schepers (divisors 1, 3, 5, …)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single national district (Zweitstimme)
    recencyHalfLifeDays: 14,
    parties: {
      cdu:  { code: 'CDU/CSU', name: 'Christlich Demokratische Union / Christlich-Soziale Union', name_en: 'Christian Democratic Union / Christian Social Union', color: '#151518' },
      spd:  { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany', color: '#E3000F' },
      gruene:{ code: 'GRÜNE', name: 'Bündnis 90/Die Grünen', name_en: 'Alliance 90/The Greens', color: '#409A3C' },
      linke:{ code: 'LINKE', name: 'Die Linke', name_en: 'The Left', color: '#BE3075' },
      afd:  { code: 'AfD',   name: 'Alternative für Deutschland', name_en: 'Alternative for Germany', color: '#00A2DE' },
      fdp:  { code: 'FDP',   name: 'Freie Demokratische Partei', name_en: 'Free Democratic Party', color: '#FFED00' },
      bsw:  { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht', name_en: 'Sahra Wagenknecht Alliance', color: '#792351' },
    },
    order: ['cdu', 'afd', 'spd', 'gruene', 'linke', 'bsw', 'fdp'],
    parlOrder: ['linke', 'spd', 'gruene', 'bsw', 'cdu', 'fdp', 'afd'],
    // Firewall = everyone but the AfD; BSW as kingmaker (like the state models)
    blocs: {
      bloc1: { name: 'Firewall', short: 'FIRE', parties: ['cdu', 'spd', 'gruene', 'linke', 'fdp'], color: '#111827' },
      bloc2: { name: 'AfD', short: 'AFD', parties: ['afd'], color: '#40A0D8' },
      kingmaker: 'bsw', kingmakerLabel: 'BSW Kingmaker', kingmakerColor: '#8E44AD',
    },
    lastElection: {
      date: '2025-02-23',
      // 2025 Bundestag official result (Zweitstimme %, Union = CDU + CSU)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/germany.svg',
      selector: 'id',
      districts: @@districts@@,
      // 2025 Zweitstimme share % per Bundesland (source: Die Bundeswahlleiterin, kerg2)
      gebiete: @@gebiete@@,
      names: @@names@@,
      // national baseline for the uniform-swing projection (= 2025 result)
      national2021: @@national@@,
    },
    pollsterMAE: @@mae@@,
    maeKey: 'BT2025',
    logos: {
      cdu: 'img/de/Union.svg', spd: 'img/de/SPD.svg', gruene: 'img/de/Grune.svg',
      linke: 'img/de/Linke.svg', afd: 'img/de/AFD.svg', fdp: 'img/de/FDP.svg',
      bsw: 'img/de/BSW.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(national, 8).replace("\n", "\n      ")),
            ("seats", j(SEATS, 8).replace("\n", "\n      ")),
            ("districts", j({k: k for k in gebiete}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j(gebiete, 8).replace("\n", "\n      ")),
            ("names", j(names, 8).replace("\n", "\n      ")),
            ("mae", "{}")):
        block = block.replace("@@%s@@" % ph, val)
    m = re.search(r"\n  germany: \{", text)
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
    print("patched config.js (germany block)")


if __name__ == "__main__":
    main()
