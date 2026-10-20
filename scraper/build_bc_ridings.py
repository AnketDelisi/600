#!/usr/bin/env python3
"""Build the British Columbia riding map + config block.

93 single-member ridings, first-past-the-post. Baselines: the 2024 general
election per-riding party votes from the en.wikipedia article (Elections BC
data). Geometry: BC Data Catalogue WFS layer
WHSE_ADMIN_BOUNDARIES.EBC_ELECTORAL_DISTS_BS11_SVW (2023 redistribution),
clipped to the land (GADM British Columbia minus the Freshwater Atlas lakes
> 1 km2) - the source polygons carry the coastal waters and would otherwise
cover the sea. Party colors: en.wikipedia infobox colours (OneBC has none -
teal assumed).

The map carries five urban insets (Kelowna, Nanaimo, Greater Victoria,
Greater Vancouver, Fraser Valley) so the dense ridings stay readable.

Writes img/bc_ridings.svg, data/bc/constituencies.json and inserts the bc
block into js/config.js.

Usage: python scraper/build_bc_ridings.py [--force]
"""
import csv
import io
import json
import os
import re
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
import clip_land

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "bc_ridings.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "bc_ridings.svg")
CONST_JSON = os.path.join(ROOT, "data", "bc", "constituencies.json")
ZOOM_BOX = (-123.35, 49.0, -122.35, 49.55)  # Metro Vancouver (regionOf split)
GEOJSON = os.path.join(CACHE, "bc_ridings.geojson")
CLIPPED = os.path.join(CACHE, "bc_ridings_land.geojson")
ARTICLE = "https://en.wikipedia.org/wiki/2024_British_Columbia_general_election"
# 2024 elected members (Elections BC news release) and the final 2026
# candidate list (nominations closed 2026-10-03): a 2024 winner not on the
# 2026 ballot is retiring, and their seat loses the incumbent boost
ELECTED = "https://elections.bc.ca/news/2024-final-count-complete/"
CAND26 = ("https://elections.bc.ca/2026election/"
          "2026-provincial-general-election-candidates.csv")
WFS = ("https://openmaps.gov.bc.ca/geo/pub/WHSE_ADMIN_BOUNDARIES."
       "EBC_ELECTORAL_DISTS_BS11_SVW/ows?service=WFS&version=2.0.0"
       "&request=GetFeature&typeName=WHSE_ADMIN_BOUNDARIES."
       "EBC_ELECTORAL_DISTS_BS11_SVW&outputFormat=json&srsName=EPSG:4326")
ATTRIBUTION = ("Geometry: BC Data Catalogue "
               "(WHSE_ADMIN_BOUNDARIES.EBC_ELECTORAL_DISTS_BS11_SVW, clipped "
               "to land); Results: Elections BC")
# urban insets: label, riding ids, width in main-map px (the height follows
# the zoom map's aspect; the column is laid out dynamically below)
ZOOMS = [
    ("Kelowna", ['penticton-summerland', 'westkelowna-peachland',
                 'kelownacentre', 'kelowna-mission'], 75),
    ("Nanaimo", ['cowichanvalley', 'ladysmith-oceanside',
                 'nanaimo-gabriolaisland', 'nanaimo-lantzville'], 98),
    ("Greater Victoria", ['victoria-beaconhill', 'victoria-swanlake',
                          'saanichsouth', 'esquimalt-colwood',
                          'langford-highlands'], 51),
    ("Greater Vancouver", [
        'burnabycentre', 'burnabyeast', 'burnaby-newwestminster',
        'burnabynorth', 'burnabysouth-metrotown', 'portcoquitlam',
        'portmoody-burquitlam', 'vancouver-hastings', 'vancouver-kensington',
        'vancouver-langara', 'vancouver-littlemountain', 'vancouver-pointgrey',
        'vancouver-quilchena', 'vancouver-renfrew', 'vancouver-yaletown',
        'westvancouver-capilano', 'vancouver-southgranville',
        'vancouver-strathcona', 'vancouver-westend', 'richmondcentre',
        'richmond-queensborough', 'richmond-steveston', 'surreycitycentre',
        'surrey-cloverdale', 'surrey-fleetwood', 'surrey-guildford',
        'surrey-newton', 'surreynorth', 'surrey-panorama',
        'surrey-serpentineriver', 'surreysouth', 'surrey-whiterock',
        'vancouver-fraserview', 'coquitlam-burkemountain',
        'coquitlam-maillardville', 'deltanorth', 'deltasouth',
        'langley-abbotsford', 'langley-walnutgrove', 'langley-willowbrook',
        'mapleridgeeast', 'newwestminster-coquitlam',
        'northvancouver-lonsdale', 'northvancouver-seymour'], 131),
    ("Fraser Valley", ['abbotsford-mission', 'abbotsfordsouth',
                       'abbotsfordwest', 'chilliwack-cultuslake',
                       'chilliwacknorth', 'langley-abbotsford',
                       'langley-walnutgrove', 'mapleridgeeast'], 150),
]

PARTIES = ["bcndp", "cpbc", "gpbc", "cbc", "onbc"]
# 2024 party columns in the per-riding table -> config keys
COLS = ["bcndp", "cpbc", "gpbc"]          # then Ind, Other, Total


def num(s):
    return int(re.sub(r"[^\d]", "", s or "") or 0)


def fetch(url, name, force=False, binary=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def parse_results(html, names):
    soup = BeautifulSoup(html, "lxml")
    out, totals, ind24 = {}, {}, {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 90:
            continue
        hdr = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Riding" not in hdr:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            cells = [c for c in cells if c]
            if len(cells) < 8:
                continue
            key = bm.fold(cells[0])
            if key not in names:
                continue
            tail = cells[-6:]
            votes = {COLS[i]: num(tail[i]) for i in range(3)}
            total = num(tail[5])
            if total <= 0:
                continue
            out[key] = {p: round(votes.get(p, 0) * 100 / total, 2)
                        for p in PARTIES}
            ind24[key] = round(num(tail[3]) * 100 / total, 2)  # Ind column
            totals[key] = total
    return out, totals, ind24


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(WFS, "bc_ridings.geojson", force, binary=True))
    print("features:", len(gj["features"]))
    names = {bm.fold(f["properties"]["ED_NAME"]): f["properties"]["ED_NAME"]
             for f in gj["features"]}
    assert len(names) == 93, "expected 93 ridings"

    results, totals, ind24 = parse_results(
        fetch(ARTICLE, "bc_2024_article.html", force), names)
    print("ridings with 2024 results:", len(results),
          "| missing:", sorted(set(names) - set(results))[:8])

    cons = []
    for key, disp in sorted(names.items()):
        r = results.get(key, {p: 0 for p in PARTIES})
        cons.append({"id": key, "name": disp, "seats": 1,
                     "votes2022": totals.get(key, 0), "results_2022": r})

    # 2024 elected members + the 2026 candidate list -> retiring seats
    soup = BeautifulSoup(fetch(ELECTED, "bc_2024_elected.html", force), "lxml")
    elected = {}
    for t in soup.find_all("table"):
        if "Candidate Elected" not in t.get_text():
            continue
        for tr in t.find_all("tr"):
            cells = [c.get_text(" ", strip=True)
                     for c in tr.find_all(["td", "th"])]
            if len(cells) >= 3 and cells[0] and cells[0] != "Electoral District":
                elected[bm.fold(cells[0])] = cells[1]
    print("elected members parsed:", len(elected))
    raw = fetch(CAND26, "bc_cand_2026.csv", force, binary=True).decode("cp1252")
    by26 = {}
    aff26 = {}
    ind26 = {}
    AFF_KEY = {"BC NDP": "bcndp", "Conservative Party": "cpbc",
               "BC Green Party": "gpbc", "CentreBC": "cbc", "OneBC": "onbc"}
    for row in csv.DictReader(io.StringIO(raw)):
        key = bm.fold(row["Electoral District"])
        by26.setdefault(key, []).append(row["Candidate Ballot Name"])
        aff = AFF_KEY.get(row["Affiliation"])
        if aff:
            aff26.setdefault(key, set()).add(aff)
        if row["Affiliation"] in ("Independent", "Unaffiliated"):
            ind26.setdefault(key, []).append(row["Candidate Ballot Name"])
    print("2026 districts with candidates:", len(by26))

    # ridings where a modelled party fields no candidate: the projection pins
    # its share to zero there and the others absorb it (BC slates are partial:
    # NDP 92/93, Green 73, CentreBC 35, OneBC 33, so their nonzero baselines
    # would otherwise project phantom votes)
    no_candidate = {}
    for c in cons:
        present = aff26.get(c["id"], set())
        missing = [p for p in PARTIES if p not in present]
        if missing:
            no_candidate[c["id"]] = missing
    print("ridings with a party absent:", len(no_candidate))

    def nl(s):
        s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore")
        return re.sub(r"[^A-Za-z ]", " ", s.decode()).split()

    retiring = {}
    for c in cons:
        nm, cands = elected.get(c["id"]), by26.get(c["id"])
        if not nm or not cands:
            continue
        p = nl(nm)
        surname, first = p[-1].lower(), p[0].lower()
        hit = any(nl(x) and nl(x)[-1].lower() == surname
                  and nl(x)[0].lower()[:1] == first[:1] for x in cands)
        if not hit:
            retiring[c["id"]] = max(c["results_2022"],
                                    key=c["results_2022"].get)
    print("retiring seats (2024 winner absent from the 2026 ballot):",
          len(retiring))

    # a sitting MLA running as an independent (2026: Peace River North's
    # Jordan Kealy, the 2024 Conservative winner now running alone). The
    # projected personal vote follows BC's 2024 precedent, where five BC
    # United incumbents running as independents kept 16.3-30.4% (mean ~22;
    # Davies, the previous Peace River North MLA, kept 20.2 in this very
    # riding).
    IND_INCUMBENT_EST = 22
    ind_inc = {}
    for c in cons:
        nm, cands = elected.get(c["id"]), ind26.get(c["id"])
        if not nm or not cands:
            continue
        p = nl(nm)
        surname, first = p[-1].lower(), p[0].lower()
        if any(nl(x) and nl(x)[-1].lower() == surname
               and nl(x)[0].lower()[:1] == first[:1] for x in cands):
            ind_inc[c["id"]] = {"name": nm, "past": ind24.get(c["id"], 0),
                                "now": IND_INCUMBENT_EST}
    print("sitting MLAs running as independents:", len(ind_inc),
          sorted(ind_inc))
    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "bc", "total_seats": 93,
                   "constituency_seats": 93, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    # Metro Vancouver vs the rest: the simulation's regional swing error uses
    # this partition (there is no BC regional polling, so no mean blend).
    # Computed on the source geometries (the water does not change a riding's
    # membership).
    def bbox(geom):
        xs, ys = [], []

        def walk(c):
            if isinstance(c[0], (int, float)):
                xs.append(c[0])
                ys.append(c[1])
            else:
                for x in c:
                    walk(x)
        walk(geom["coordinates"])
        return min(xs), min(ys), max(xs), max(ys)

    urban = []
    for f in gj["features"]:
        x0, y0, x1, y1 = bbox(f["geometry"])
        if x0 >= ZOOM_BOX[0] and y0 >= ZOOM_BOX[1] and \
                x1 <= ZOOM_BOX[2] and y1 <= ZOOM_BOX[3]:
            urban.append(f)
    urban_ids = [bm.fold(f["properties"]["ED_NAME"]) for f in urban]
    print("metro vancouver ridings:", len(urban_ids))
    metro = set(urban_ids)
    region_of = {c["id"]: ("metro" if c["id"] in metro else "rest")
                 for c in cons}

    # land clip: the riding polygons carry the coastal waters (and the
    # provincial lakes); the map must show only land
    land = clip_land.land_polygon("bc", (-139.5, 48.0, -113.5, 60.1))
    gj["features"] = clip_land.clip_features(gj["features"], land)
    print("clipped features:", len(gj["features"]))
    with open(CLIPPED, "w", encoding="utf8") as fh:
        json.dump(gj, fh)

    def build_svg(geojson_path, out_path):
        sys.argv = ["build_map_svg.py", "--geojson", geojson_path,
                    "--name-field", "ED_NAME", "--fold", "--attr", "id",
                    "--no-prefix", "--out", out_path,
                    "--attribution", ATTRIBUTION, "--simplify", "0.00012"]
        bm.main()

    build_svg(CLIPPED, OUT_SVG)

    # urban insets: the dense ridings are unreadable at province scale;
    # render them separately and stack them in the ocean column on the left
    by_id = {bm.fold(f["properties"]["ED_NAME"]): f for f in gj["features"]}
    main_h = float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"',
                             open(OUT_SVG, encoding="utf8").read()).group(1))
    zooms = []
    for label, ids, width in ZOOMS:
        sel = [by_id[i] for i in ids if i in by_id]
        zpath = os.path.join(CACHE, "bc_zoom_%s.geojson" % bm.fold(label))
        with open(zpath, "w", encoding="utf8") as fh:
            json.dump({"type": "FeatureCollection", "features": sel}, fh)
        zsvg = os.path.join(CACHE, "bc_zoom_%s.svg" % bm.fold(label))
        build_svg(zpath, zsvg)
        sh = float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"',
                             open(zsvg, encoding="utf8").read()).group(1))
        zooms.append((label, ids, width, sh, zsvg))
    gap, top = 32, 145
    bottom = main_h - 24
    total = sum(w * sh / 1000 for _l, _i, w, sh, _s in zooms)
    total += gap * (len(zooms) - 1)
    k = min(1.0, (bottom - top) / total) if total > 0 else 1.0
    y = top
    for label, ids, width, sh, zsvg in zooms:
        h = sh * width * k / 1000
        bm.add_inset(OUT_SVG, zsvg, ids, width * k, (30, y), label=label)
        y += h + gap
    import shutil
    if os.path.isdir(os.path.dirname(BMV_SVG)):
        shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """  bc: {
    name: 'British Columbia',
    seats: 93,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 93 single-member ridings
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 93 ridings
    constituencyRule: 'fptp',
    hideBlocs: true,              // no governing/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-10-24 election: momentum is a nudge,
    // not the driver - anchored at the recent poll mean, total move capped
    // at 0.15pp/day (3.2pp over the 21-day horizon), damped and blended at
    // 0.4; the old loose caps moved NDP ~+8pp / ~+29 seats on a noisy slope
    trend: {
      electionDate: '2026-10-24',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from Template:Canadian party colour (en.wikipedia)
    parties: {
      bcndp: { code: 'BCNDP',   name: 'British Columbia New Democratic Party', name_en: 'British Columbia New Democratic Party', color: '#F4A460' },
      cpbc:  { code: 'CPBC',   name: 'Conservative Party of British Columbia', name_en: 'Conservative Party of British Columbia', color: '#004AAD' },
      gpbc:  { code: 'GPBC', name: 'Green Party of British Columbia', name_en: 'Green Party of British Columbia', color: '#99C955' },
      cbc:   { code: 'CBC', name: 'CentreBC',  name_en: 'CentreBC', color: '#EE2D30' },
      onbc:  { code: '1BC',    name: 'OneBC',     name_en: 'OneBC',    color: '#C49B50' },
      ind:   { code: 'IND',    name: 'Independent', name_en: 'Independent', color: '#6B7280' },
    },
    order: ['bcndp', 'cpbc', 'gpbc', 'cbc', 'onbc', 'ind'],
    parlOrder: ['bcndp', 'gpbc', 'cbc', 'onbc', 'cpbc', 'ind'],
    // governing party vs the rest (majority = 47 seats)
    blocs: {
      bloc1: { name: 'BC NDP',     short: 'NDP', parties: ['bcndp'], color: '#F4A460' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['cpbc', 'gpbc', 'cbc', 'onbc'], color: '#004AAD' },
    },
    lastElection: {
      date: '2024-10-19',
      // 2024 general election (Elections BC): NDP 47, Con 44, Green 2
      results: { bcndp: 44.86, cpbc: 43.28, gpbc: 8.24, cbc: 0, onbc: 0 },
      seats:   { bcndp: 47, cpbc: 44, gpbc: 2, cbc: 0, onbc: 0 },
    },
    map: {
      svg: 'img/bc_ridings.svg',
      // swing method: geometric mean of log-odds proportional and uniform
      // swing (bounded, no ratio explosions on strongholds)
      // proportional swing: the seat-level backtests (QC 2026: MAE 18 vs
      // 28; BC 2024: 45/52 vs 44/52) favour it over the geometric for
      // stable party systems - it captures collapses and surges
      swingMethod: 'proportional',
      selector: 'id',
      useConstituencies: true,     // 93 ridings, projected winner takes the seat
      hideBlocToggle: true,        // no NDP-vs-rest bloc coloring
      // parties with no 2024 past inherit a proxy's geographic shape: both
      // OneBC (right-wing split) and CentreBC (the BC United successor) draw
      // from the Conservative vote, so they track the CPBC's 2024 map
      swingProxy: { onbc: 'cpbc', cbc: 'cpbc' },
      // the borrowed shape is shrunk halfway toward the Conservatives'
      // national share (see swingProxyConfidence in districtShares)
      swingProxyConfidence: { onbc: 0.5, cbc: 0.5 },
      // sitting-member personal-vote lift for the party that won the riding
      // last time, with a symmetric deboost where the 2024 winner is not on
      // the 2026 ballot (retiringSeats, from the final Elections BC candidate
      // list: absent winner = retiring)
      incumbentBoost: 2.0,
      retiringSeats: @@retiringSeats@@,
      // ridings where a modelled party fields no 2026 candidate (partial
      // slates): its projected share is pinned to zero there
      noCandidate: @@noCandidate@@,
      // sitting MLAs running as independents: their personal vote is
      // projected out of the field (name, 2024 Ind share, 2026 estimate)
      indIncumbents: @@indIncumbents@@,
      districts: @@districts@@,
      // 2024 vote shares per riding (Elections BC)
      gebiete: @@gebiete@@,
      // national baseline for the uniform-swing projection (= 2024 result)
      national2021: { bcndp: 44.86, cpbc: 43.28, gpbc: 8.24, cbc: 0, onbc: 0 },
      // Metro Vancouver vs the rest: used by the simulation's regional swing
      // error (no regional polls, so no regional mean blend)
      regionOf: @@regionOf@@,
    },
    pollsterMAE: {},
    maeKey: 'BC2024',
    logos: {
      bcndp: 'img/bc/BCNDP.svg', cpbc: 'img/bc/CPBC.svg',
      gpbc: 'img/bc/GPBC.svg', cbc: 'img/bc/CBC.svg', onbc: 'img/bc/1BC.svg',
    },
  },
"""
    for ph, val in (
            ("districts", j({c["id"]: c["id"] for c in cons}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j({c["id"]: c["results_2022"] for c in cons},
                          8).replace("\n", "\n      ")),
            ("regionOf", j(region_of, 8).replace("\n", "\n      ")),
            ("retiringSeats", j(retiring, 8).replace("\n", "\n      ")),
            ("noCandidate", j(no_candidate, 8).replace("\n", "\n      ")),
            ("indIncumbents", j(ind_inc, 8).replace("\n", "\n      ")),
            ):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  bc: \{", text)
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
    print("patched config.js (bc block)")


if __name__ == "__main__":
    main()
