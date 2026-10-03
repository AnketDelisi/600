#!/usr/bin/env python3
"""Build the UK constituency map + config block (650 seats, FPTP).

Baselines: the official 2024 general election results per constituency from
the House of Commons Library's psephology SQLite database
(github.com/ukparliament/psephology-datasette), joined to the ONS
Westminster Parliamentary Constituencies (July 2024) boundaries (BUC,
ultra generalised) by ONS code. Labour/Co-operative joint candidates count
as Labour; Scottish Green and Green Party NI count as Green; everything
else (independents, Speaker, NI parties, minors) is "Other". Restore
Britain (2025) has no 2024 past and inherits Reform UK's geographic shape
for the swing (swingProxy).

Writes img/uk.svg, data/uk/constituencies.json and inserts the uk block
into js/config.js.

Usage: python scraper/build_uk_ridings.py [--force]
"""
import json
import os
import re
import sqlite3
import sys

import requests

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "uk.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "uk.svg")
CONST_JSON = os.path.join(ROOT, "data", "uk", "constituencies.json")
DB_PATH = os.path.join(CACHE, "uk_psephology.db")
GEOJSON = os.path.join(CACHE, "uk_buc.geojson")
DB_URL = ("https://raw.githubusercontent.com/ukparliament/"
          "psephology-datasette/main/psephology.db")
GEO_URL = ("https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/"
           "services/Westminster_Parliamentary_Constituencies_July_2024_"
           "Boundaries_UK_BUC/FeatureServer/0/query")
ATTRIBUTION = ("Risultati: House of Commons Library (elezioni 2024, "
               "psephology database); Geometria: ONS (Westminster "
               "constituencies, July 2024)")

PARTIES = ["lab", "con", "ref", "lib", "grn", "snp", "plc", "res"]
# DB party abbreviation -> modelled party (None/others -> Other)
ABBR = {"Lab": "lab", "Co-op": "lab", "Con": "con", "RUK": "ref",
        "LD": "lib", "Green": "grn", "SNP": "snp", "PC": "plc"}
CURRENT_SETS = (1, 2, 3, 4)    # 2024-05-31 boundary sets: England/Scot/Wales/NI


def fetch(url, name, force=False, binary=False, params=None):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, params=params,
                         headers={"User-Agent": "Mozilla/5.0"}, timeout=600)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    db = fetch(DB_URL, "uk_psephology.db", force, binary=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # 2024 results by constituency, on the current boundary sets. Co-operative
    # Party certifications are adjuncts to the Labour ones (joint candidates)
    # and must be dropped or every Labour-Co-op candidacy counts twice.
    rows = cur.execute("""
        select ca.geographic_code, cg.name, c.vote_count,
               pp.abbreviation, c.is_winning_candidacy
        from elections e
        join constituency_groups cg on cg.id = e.constituency_group_id
        join constituency_areas ca on ca.id = cg.constituency_area_id
        join candidacies c on c.election_id = e.id
        left join certifications cert on cert.candidacy_id = c.id
        left join political_parties pp on pp.id = cert.political_party_id
        where e.polling_on = '2024-07-04'
          and ca.boundary_set_id in (1,2,3,4)
          and (cert.adjunct_to_certification_id is null)
    """).fetchall()
    print("2024 candidacies:", len(rows))
    results = {}
    seats = {p: 0 for p in PARTIES}
    seats["other"] = 0
    nat = {p: 0 for p in PARTIES}
    nat["other"] = 0
    for code, name, votes, abbr, won in rows:
        key = ABBR.get(abbr, "other")
        v = votes or 0
        r = results.setdefault(code, {"name": name, "votes": {}, "total": 0})
        r["votes"][key] = r["votes"].get(key, 0) + v
        r["total"] += v
        nat[key] += v
        if won:
            seats[key] += 1
    assert len(results) == 650, "expected 650 constituencies, got %d" % len(results)
    grand = sum(nat.values())
    national = {p: round(nat[p] * 100 / grand, 2) for p in nat}
    print("national 2024:", national)
    print("seats 2024:", seats)

    # region per constituency (English regions; otherwise country)
    region_of = {}
    for code, region in cur.execute("""
            select ca.geographic_code, coalesce(er.name, co.name)
            from constituency_areas ca
            left join english_regions er on er.id = ca.english_region_id
            left join countries co on co.id = ca.country_id
            where ca.boundary_set_id in (1,2,3,4)
    """):
        region_of[code] = bm.fold(region)
    print("regions:", sorted(set(region_of.values())))

    # boundaries
    gj = json.loads(fetch(GEO_URL, "uk_buc.geojson", force, binary=True,
                          params={"where": "1=1",
                                  "outFields": "PCON24CD,PCON24NM",
                                  "returnGeometry": "true", "f": "geojson",
                                  "outSR": "4326",
                                  "resultRecordCount": 1000}))
    feats = gj["features"]
    print("boundary features:", len(feats))
    assert len(feats) == 650

    cons = []
    missing = []
    for f in feats:
        props = f["properties"]
        code = props["PCON24CD"]
        name = props["PCON24NM"]
        r = results.get(code)
        if not r:
            missing.append((code, name))
            shares = {p: 0 for p in PARTIES}
        else:
            shares = {p: round(r["votes"].get(p, 0) * 100 / r["total"], 2)
                      for p in PARTIES}
        cons.append({"id": bm.fold(name), "name": name, "seats": 1,
                     "results_2022": shares, "_code": code})
    print("without results:", missing)
    ids = [c["id"] for c in cons]
    assert len(set(ids)) == 650, "duplicate folded ids"
    region_by_id = {c["id"]: region_of.get(c["_code"], "rest")
                    for c in cons}

    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "uk", "total_seats": 650,
                   "constituency_seats": 650, "leveling_seats": 0,
                   "constituencies": [{k: v for k, v in c.items()
                                       if k != "_code"} for c in cons]},
                  fh, ensure_ascii=False, indent=1)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "PCON24NM", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION,
                "--simplify", "0.0007"]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """
  uk: {
    name: 'United Kingdom',
    seats: 650,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 650 single-member seats
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 650 constituencies
    constituencyRule: 'fptp',
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // colours from the en.wikipedia party infoboxes
    parties: {
      lab: { code: 'LAB', name: 'Labour Party',             name_en: 'Labour Party',             color: '#E41C3E' },
      con: { code: 'CON', name: 'Conservative Party',       name_en: 'Conservative Party',       color: '#0087DC' },
      ref: { code: 'REF', name: 'Reform UK',                name_en: 'Reform UK',                color: '#1EB8D0' },
      lib: { code: 'LD',  name: 'Liberal Democrats',        name_en: 'Liberal Democrats',        color: '#FAA61A' },
      grn: { code: 'GRN', name: 'Green Party',              name_en: 'Green Party',              color: '#02A95B' },
      snp: { code: 'SNP', name: 'Scottish National Party',  name_en: 'Scottish National Party',  color: '#FDF38E' },
      plc: { code: 'PC',  name: 'Plaid Cymru',              name_en: 'Plaid Cymru',              color: '#008672' },
      res: { code: 'RES', name: 'Restore Britain',          name_en: 'Restore Britain',          color: '#051D3F' },
    },
    order: ['lab', 'con', 'ref', 'lib', 'grn', 'snp', 'plc', 'res'],
    parlOrder: ['grn', 'snp', 'plc', 'lab', 'lib', 'con', 'ref', 'res'],
    // governing party vs the rest (majority = 326)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['lab'], color: '#E41C3E' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['con', 'ref', 'lib', 'grn', 'snp', 'plc', 'res'], color: '#0087DC' },
    },
    lastElection: {
      date: '2024-07-04',
      // 2024 general election (House of Commons Library, official)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/uk.svg',
      selector: 'id',
      useConstituencies: true,     // 650 seats, projected winner takes the seat
      hideBlocToggle: true,
      // Restore Britain (2025) has no 2024 past: it inherits Reform UK's
      // geographic shape for the swing, so its vote concentrates where
      // Reform is strong instead of being flat across every seat
      swingProxy: { res: 'ref' },
      districts: @@districts@@,
      // 2024 vote shares per constituency (House of Commons Library)
      gebiete: @@gebiete@@,
      // national baseline for the uniform-swing projection (= 2024 result)
      national2021: @@national@@,
      // regions (English regions + Scotland/Wales/NI): used by the
      // simulation's regional swing error
      regionOf: @@regionOf@@,
    },
    pollsterMAE: {},
    maeKey: 'UK2024',
    logos: {
      lab: 'img/uk/LAB.svg', con: 'img/uk/CONS.svg', ref: 'img/uk/REF.svg',
      lib: 'img/uk/LIB.svg', grn: 'img/uk/GRN.svg', snp: 'img/uk/SNP.svg',
      plc: 'img/uk/PLC.svg', res: 'img/uk/RES.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(national, 8).replace("\n", "\n      ")),
            ("seats", j(seats, 8).replace("\n", "\n      ")),
            ("districts", j({c["id"]: c["id"] for c in cons}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j({c["id"]: c["results_2022"] for c in cons},
                          8).replace("\n", "\n      ")),
            ("regionOf", j(region_by_id, 8).replace("\n", "\n      "))):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  uk: \{", text)
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
        head = text[:m.start()].rstrip("\n") + "\n\n"
        text = head + block.strip("\n")[:-1] + text[k + 1:]
    else:
        anchor = "\n};\n\n// ===== Active country"
        idx = text.index(anchor)
        text = text[:idx] + "\n" + block.strip("\n") + text[idx:]
    open(cfg_path, "w", encoding="utf8").write(text)
    print("patched config.js (uk block)")


if __name__ == "__main__":
    main()
