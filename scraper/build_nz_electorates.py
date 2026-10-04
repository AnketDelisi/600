#!/usr/bin/env python3
"""Build the New Zealand electorate map + config block (MMP, 120 seats).

Geometry: the NZ Herald's GeoJSON conversions of the Electoral Commission's
2014 general and Maori electorate boundaries (github.com/nzherald), renamed
to their 2020 identities via the official 2014->2020 crosswalk
(github.com/dakvid/election2020). The 2026 election uses the 2025 review
boundaries (64 general + 7 Maori); the 2014 shapes renamed to the 2020
electorates are the closest freely available geometry. The 7 Maori
electorates and Takanini (new in 2020, no 2014 predecessor) have no SVG
path - they are data-only, so the map draws the 64 general electorates.

Baselines: the 2023 general election candidate-vote shares per electorate
from the per-electorate Wikipedia articles (the electorate winner metric),
plus the party votes per electorate for the national party-vote baseline.
National 2023: National 38.1%, Labour 26.9%, Green 11.6%, ACT 8.6%, NZ
First 6.1%, Te Pati Maori 3.1% (6 electorates -> overhang, 122 seats).

Writes img/nz.svg, data/nz/constituencies.json and inserts the nz block
into js/config.js.

Usage: python scraper/build_nz_electorates.py [--force]
"""
import csv
import io
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_nz import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "nz.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "nz.svg")
CONST_JSON = os.path.join(ROOT, "data", "nz", "constituencies.json")
GEOJSON = os.path.join(CACHE, "nz_electorates.geojson")
CROSSWALK_URL = ("https://raw.githubusercontent.com/dakvid/election2020/"
                 "main/data/electorates.csv")
GEO_BASE = ("https://raw.githubusercontent.com/nzherald/%s/master/"
            "geojson/%s.geojson")
ATTRIBUTION = ("Risultati: Wikipedia (elezioni 2023 per circoscrizione); "
               "Geometria: NZ Herald/Statistics NZ (confini 2014 rinominati "
               "secondo la revisione 2020)")

PARTIES = ["nat", "lab", "grn", "act", "nzf", "tpm", "opp"]
PARTY_NAMES = {
    "national": "nat", "labour": "lab", "green": "grn", "act": "act",
    "nz first": "nzf", "new zealand first": "nzf", "te pati maori": "tpm",
    "the opportunities party": "opp", "opportunities": "opp",
    "opportunities party": "opp",
}
# 2023 official seats (122 with Te Pati Maori's overhang)
SEATS_2023 = {"nat": 48, "lab": 34, "grn": 15, "act": 11, "nzf": 8, "tpm": 6}
# new 2020 electorate with no 2014 predecessor: data-only
NO_SHAPE = {"takanini"}


def fetch(url, name, force=False):
    path = os.path.join(CACHE, "nz", name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=600)
        r.raise_for_status()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "wb").write(r.content)
    return open(path, "rb").read()


def norm(s):
    s = (s or "").lower()
    for a, b in [("ā", "a"), ("ē", "e"), ("ī", "i"), ("ō", "o"), ("ū", "u"),
                 ("’", "'"), ("–", "-")]:
        s = s.replace(a, b)
    return s


def demacron(s):
    out = s or ""
    for a, b in [("ā", "a"), ("ē", "e"), ("ī", "i"), ("ō", "o"), ("ū", "u"),
                 ("Ā", "A"), ("Ē", "E"), ("Ī", "I"), ("Ō", "O"), ("Ū", "U")]:
        out = out.replace(a, b)
    return out


def parse_table(t):
    """(candidate shares, party votes, total party votes) from one table."""
    rows = t.find_all("tr")
    if len(rows) < 4:
        return None, None, 0.0
    grid, metas = expand_grid(t)
    hdr = None
    for ri, row in enumerate(grid[:4]):
        cells = [c.strip().lower() for c in row]
        if "candidate" in cells and "party" in cells:
            hdr = ri
            break
    if hdr is None:
        return None, None, 0.0
    col = {}
    for i, htxt in enumerate(grid[hdr]):
        h = htxt.strip().lower()
        if h == "party":
            col["party"] = i
        elif h == "%" and "cand_pct" not in col:
            col["cand_pct"] = i
        elif h == "party votes":
            col["pv"] = i
    cand_pct = col.get("cand_pct")
    pv = col.get("pv")
    if cand_pct is None:
        return None, None, 0.0
    shares, pvotes = {}, {}
    pv_total = 0.0
    for ri in range(hdr + 1, len(grid)):
        row = grid[ri]
        if len(row) <= cand_pct:
            continue
        # the party is the first non-empty, non-numeric cell (colspans are
        # duplicated by expand_grid, and the leading colour cell is empty)
        party = ""
        for c in row:
            c = c.strip()
            if c and not re.match(r"^[\d.,\u2013\u2014-]+$", c):
                party = c
                break
        if re.search(r"^(total|informal|valid|majority)", party, re.I):
            continue
        # the denominator for the national shares must include the parties we
        # do not model (others), so count every party row's party votes
        if pv is not None and pv < len(row):
            m2 = re.match(r"(\d+(?:\.\d+)?)", row[pv].replace(",", ""))
            if m2:
                pv_total += float(m2.group(1))
        key = PARTY_NAMES.get(norm(party).strip())
        if not key:
            continue
        m = re.match(r"(\d+(?:\.\d+)?)", row[cand_pct].replace(",", ""))
        if m:
            shares[key] = float(m.group(1))
        if pv is not None and pv < len(row):
            m2 = re.match(r"(\d+(?:\.\d+)?)", row[pv].replace(",", ""))
            if m2:
                pvotes[key] = float(m2.group(1))
    return shares, pvotes, pv_total


def parse_results(html, electorate):
    """2023 candidate-vote shares + party votes per party from the article.

    Port Waikato's candidate contest was the delayed by-election (its general
    election table has only party votes), so fall back to that table for the
    candidate shares.
    """
    soup = BeautifulSoup(html, "lxml")
    general = byel = None
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 4:
            continue
        head = " ".join(rows[0].get_text(" ", strip=True).split())
        if head.startswith("2023 general election"):
            general = t
        elif re.match(r"2023 .*by-election", head):
            byel = t
    shares = pvotes = pv_total = None
    if general is not None:
        shares, pvotes, pv_total = parse_table(general)
    if (not shares) and byel is not None:
        shares, _, _ = parse_table(byel)
    return shares, pvotes, pv_total


def drop_antimeridian(geom):
    """Drop polygons west of the antimeridian (Rongotai's Chatham Islands).

    The Chathams sit at lon -176.5, so the raw polygon spans 352 degrees and
    would squash the whole map; they are two tiny islands ~800 km east and are
    trimmed like Italy's Pelagie islands.
    """
    if geom.get("type") == "MultiPolygon":
        polys = [p for p in geom["coordinates"]
                 if sum(pt[0] for pt in p[0]) / len(p[0]) > 0]
        geom = {"type": "MultiPolygon", "coordinates": polys}
    return geom


def main():
    force = "--force" in sys.argv
    os.makedirs(os.path.join(CACHE, "nz"), exist_ok=True)

    # crosswalk
    text = fetch(CROSSWALK_URL, "crosswalk.csv", force).decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    print("crosswalk rows:", len(rows))
    general = [r for r in rows if r["id_14"] and int(r["id_14"]) <= 64]
    by14 = {norm(r["electorate_name_14"]): r for r in general}
    by20 = {norm(r["electorate_name"]): r for r in rows}

    # 2023 results per 2020 electorate from the Wikipedia articles
    results, pvotes_by_el, nat_pv = {}, {}, {}
    votes_by_el = {}
    nat_total = 0.0
    missing = []
    for r in rows:
        name = r["electorate_name"]
        key = bm.fold(name)
        html = None
        for title in [name + " (New Zealand electorate)",
                      name.replace("Mt ", "Mount ") + " (New Zealand electorate)"]:
            url = ("https://en.wikipedia.org/wiki/"
                   + title.replace(" ", "_"))
            data = fetch(url, "wiki_%s.html" % bm.fold(title), force)
            if b"2023 general election" in data:
                html = data
                break
        shares, pv, pv_total = (parse_results(html, name) if html
                                else (None, None, 0.0))
        if not shares:
            missing.append(name)
            shares = {p: 0 for p in PARTIES}
        results[key] = shares
        for p, v in (pv or {}).items():
            nat_pv[p] = nat_pv.get(p, 0) + v
            pvotes_by_el.setdefault(key, {})[p] = v
        if pv_total:
            nat_total += pv_total
            votes_by_el[key] = pv_total
    print("without 2023 results:", missing)
    assert not missing, "missing 2023 results: %s" % missing
    national = {p: round(nat_pv.get(p, 0) * 100 / nat_total, 2)
                for p in PARTIES}
    print("national party vote 2023:", national)

    # Maori electorates are decided by the candidate vote, not the party-vote
    # swing (Te Pati Maori's candidates run far ahead of their party vote):
    # hold their 2023 winners, which is also what produces the overhang.
    maori_rows = [r for r in rows if r["id_14"] and int(r["id_14"]) >= 65]
    hold_seats = {}
    for r in maori_rows:
        key = bm.fold(r["electorate_name"])
        shares = results[key]
        hold_seats[key] = max(PARTIES, key=lambda p: shares.get(p, 0))
    print("maori holds:", hold_seats)

    # geometry: 2014 general electorates renamed to their 2020 identities
    feats = []
    used = set()
    for r in general:
        old = r["electorate_name_14"]
        src = None
        for repo in ["nz_general_electorates_geojson",
                     "nz_maori_electorates_geojson"]:
            for fname in [old, demacron(old)]:
                try:
                    raw = fetch(GEO_BASE % (repo, fname),
                                "geo_%s.geojson" % norm(fname), force)
                    src = json.loads(raw)
                    break
                except Exception:
                    continue
            if src is not None:
                break
        if src is None:
            print("  no geometry for", old)
            continue
        used.add(norm(old))
        gj = src if src.get("type") == "FeatureCollection" else \
            {"type": "FeatureCollection", "features": [src]}
        for f in gj["features"]:
            f["properties"] = {"name": r["electorate_name"]}
            f["geometry"] = drop_antimeridian(f.get("geometry") or {})
            feats.append(f)
    print("map features:", len(feats), "(2014 shapes:", len(used), ")")
    # maori electorates: data-only (they overlap the general ones)
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)

    cons = []
    for r in sorted(rows, key=lambda r: r["electorate_name"]):
        name = r["electorate_name"]
        key = bm.fold(name)
        cons.append({"id": key, "name": name, "seats": 1,
                     "votes2022": int(votes_by_el.get(key, 0)),
                     "results_2022": results[key]})
    assert len(cons) == 72
    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "nz", "total_seats": 120,
                   "constituency_seats": 72, "leveling_seats": 48,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "name", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION,
                "--simplify", "0.0008"]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """
  nz: {
    name: 'New Zealand',
    seats: 120,
    threshold: 5.0,               // 5% or one electorate (MMP)
    method: 'sainte_lague_standard', // Sainte-Lague/Schepers, national party vote
    seatBased: false,             // polls report party-vote shares (%)
    constituencies: true,         // the map is the 72 electorates
    constituencyRule: 'fptp',     // 72 electorate seats (64 general + 7 Maori)
    hideBlocs: true,
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-11-07 election: fresh campaign polls
    // (weekly trackers); momentum is a nudge, not the driver
    trend: {
      electionDate: '2026-11-07',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from the en.wikipedia party infoboxes
    parties: {
      nat: { code: 'NAT', name: 'New Zealand National Party', name_en: 'New Zealand National Party', color: '#00529F' },
      lab: { code: 'LAB', name: 'New Zealand Labour Party',   name_en: 'New Zealand Labour Party',   color: '#D82A20' },
      grn: { code: 'GRN', name: 'Green Party of Aotearoa New Zealand', name_en: 'Green Party of Aotearoa New Zealand', color: '#098137' },
      act: { code: 'ACT', name: 'ACT New Zealand',            name_en: 'ACT New Zealand',            color: '#FDE401' },
      nzf: { code: 'NZF', name: 'New Zealand First',          name_en: 'New Zealand First',          color: '#000000' },
      tpm: { code: 'TPM', name: 'Te Pati Maori',              name_en: 'Te Pati Maori',              color: '#B2001A' },
      opp: { code: 'OPP', name: 'The Opportunities Party',    name_en: 'The Opportunities Party',    color: '#00EDE1' },
    },
    order: ['nat', 'lab', 'grn', 'act', 'nzf', 'tpm', 'opp'],
    parlOrder: ['grn', 'tpm', 'lab', 'opp', 'nat', 'act', 'nzf'],
    // right bloc (2023 government) vs the left bloc; the sim's correlated
    // swing moves the two blocs in opposite directions
    blocs: {
      bloc1: { name: 'National-ACT-NZ First', short: 'RIGHT', parties: ['nat', 'act', 'nzf'], color: '#00529F' },
      bloc2: { name: 'Labour-Green-Maori', short: 'LEFT', parties: ['lab', 'grn', 'tpm', 'opp'], color: '#D82A20' },
    },
    // leveling seats: Te Pati Maori's overhang grows the house past 120
    // (fixed: the overhang is computed on the 120-seat house, as in the
    // Electoral Act, not iteratively like the German leveling states)
    overhang: { cap: 125, rows: 10, fixed: true },
    lastElection: {
      date: '2023-10-14',
      // 2023 general election (official): party vote and seats (122 total)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/nz.svg',
      selector: 'id',
      useConstituencies: true,
      // swing method: geometric mean of log-odds proportional and uniform
      // swing (bounded, no ratio explosions on strongholds); the baselines
      // are 2023 candidate-vote shares per electorate while the national
      // anchor is the party vote, same hybrid as the proportional method
      swingMethod: 'geometric',
      // sitting-member personal-vote lift for the party that won the
      // electorate last time (baseline-winner heuristic: no target-candidate
      // data, so only the positive arm; retiring-MP deboost needs candidate
      // lists)
      incumbentBoost: 2.0,
      hideBlocToggle: true,
      // Maori electorates hold their 2023 winners: they are decided by the
      // candidate vote, not the party-vote swing
      holdSeats: @@holdSeats@@,
      districts: @@districts@@,
      // 2023 candidate-vote shares per electorate (electorate winner metric)
      gebiete: @@gebiete@@,
      // national baseline for the swing (= 2023 party vote, the poll metric)
      national2021: @@national@@,
    },
    pollsterMAE: {},
    maeKey: 'NZ2023',
    logos: {
      nat: 'img/nz/NAT.svg', lab: 'img/nz/LAB.svg', grn: 'img/nz/GRN.svg',
      act: 'img/nz/ACT.svg', nzf: 'img/nz/NZF.svg', tpm: 'img/nz/TPM.svg',
      opp: 'img/nz/OPP.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(national, 8).replace("\n", "\n      ")),
            ("seats", j(SEATS_2023, 8).replace("\n", "\n      ")),
            ("holdSeats", j(hold_seats, 8).replace("\n", "\n      ")),
            ("districts", j({c["id"]: c["id"] for c in cons}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j({c["id"]: c["results_2022"] for c in cons},
                          8).replace("\n", "\n      "))):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  nz: \{", text)
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
    print("patched config.js (nz block)")


if __name__ == "__main__":
    main()
