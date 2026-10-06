#!/usr/bin/env python3
"""Build the Quebec riding map + config block (127 ridings, FPTP).

Baselines: the official 2022 general election results by candidate
(Élections Québec open data, gen2022-10-03/candidats.csv, cp1252) divided
by each riding's valid votes; the 2022 election used the 125-riding 2017
map, while the 24 Oct 2026 election uses the 127-riding 2025 map, so six
renamed ridings are matched by crosswalk and the two new ridings
(Bellefeuille, Marie-Lacoste-Gérin-Lajoie) inherit the 2022 results of the
neighbouring riding they were split from. Geometry: the official 2026
electoral map GeoJSON (donnees.electionsquebec.qc.ca). Party colours from
the en.wikipedia infoboxes.

Writes img/quebec.svg, data/qc/constituencies.json and inserts the qc
block into js/config.js.

Usage: python scraper/build_quebec_ridings.py [--force]
"""
import csv
import io
import json
import os
import re
import sys
import unicodedata

import requests

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "quebec.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "quebec.svg")
CONST_JSON = os.path.join(ROOT, "data", "qc", "constituencies.json")
GEOJSON = os.path.join(CACHE, "qc_ridings_2026.geojson")
ZOOM_SVG = os.path.join(CACHE, "qc_montreal_detail.svg")
# Montreal island + Laval + the South Shore core (Longueuil, Saint-Hubert,
# Brossard, Boucherville, Saint-Bruno) - the dense urban area is unreadable
# at province scale. Bounds keep the exurban ring out (Blainville, Terrebonne,
# Repentigny, Chambly, La Prairie, Chateauguay): only fully-inside ridings
# are inset.
ZOOM_BOX = (-74.00, 45.38, -73.28, 45.71)
DGEQ = ("https://donnees.electionsquebec.qc.ca/production/provincial/"
        "resultats/archives/gen2022-10-03/")
GEO_URL = ("https://donnees.electionsquebec.qc.ca/autres/provincial/"
           "circonscriptions_electorales_sans_eau_2026.json")
# 2026 official candidate list: used for the incumbent deboost (a 2022 winner
# not on the 2026 ballot is retiring or was not renominated)
CAND26 = ("https://donnees.electionsquebec.qc.ca/production/provincial/"
          "candidatures/candidatures.json")
ATTRIBUTION = ("Risultati: Élections Québec (elezioni generali 2022, dati "
               "aperti); Geometria: Élections Québec (carta elettorale 2026)")

PARTIES = ["caq", "plq", "pq", "qs", "pcq"]
ABBR = {"C.A.Q.-E.F.L.": "caq", "P.L.Q./Q.L.P.": "plq", "Q.S.": "qs",
        "P.Q.": "pq", "P.C.Q-E.E.D.": "pcq"}
# 2017 -> 2025 riding renames
RENAMES = {"Arthabaska-L'Érable": "Arthabaska", "Daniel-Johnson": "Johnson",
           "Pierre-Laporte": "Laporte",
           "Matane-Matapédia-Mitis": "Matane-Matapédia",
           "Rivière-du-Loup–Témiscouata–Les Basques":
               "Rivière-du-Loup-Témiscouata",
           "Vimont-Auteuil": "Vimont"}
# new 2025 ridings: inherit the 2022 results of the riding they split from
NEW_RIDINGS = {"Bellefeuille": "Argenteuil",
               "Marie-Lacoste-Gérin-Lajoie": "Drummond-Bois-Francs"}


def fetch(url, name, force=False, binary=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0",
                                       "Referer": "https://www.dgeq.org/"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def read_csv(name, force=False):
    raw = fetch(DGEQ + name, "qc_" + name, force, binary=True)
    return list(csv.reader(io.StringIO(raw.decode("cp1252")), delimiter=";"))


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    gj = json.loads(fetch(GEO_URL, "qc_ridings_2026.geojson", force,
                          binary=True))
    geo_names = [f["properties"]["NM_CEP"] for f in gj["features"]]
    print("map ridings:", len(geo_names))

    # 2022 results by candidate -> votes per riding/party
    cand = read_csv("candidats.csv", force)
    circ = read_csv("circonscriptions.csv", force)
    valid = {}
    name_of = {}
    for row in circ[1:]:
        if len(row) > 6 and row[0]:
            name_of[row[0]] = row[1]
            valid[row[0]] = int(re.sub(r"[^\d]", "", row[6]) or 0)
    votes = {}
    top = {}
    for row in cand[1:]:
        if len(row) < 7 or not row[0]:
            continue
        v = int(re.sub(r"[^\d]", "", row[6]) or 0)
        if v > top.get(row[0], (0,))[0]:
            top[row[0]] = (v, row[2], row[3])
        key = ABBR.get(row[5])
        if not key:
            continue
        votes.setdefault(row[0], {}).setdefault(key, 0)
        votes[row[0]][key] += v
    shares = {}
    raw = {}
    for num, v in votes.items():
        vv = valid.get(num) or sum(v.values()) or 1
        name = name_of.get(num, num)
        shares[name] = {p: round(v.get(p, 0) * 100 / vv, 2) for p in PARTIES}
        raw[name] = (v, vv)
    print("2022 ridings with shares:", len(shares))

    # national 2022 result + seat counts (official)
    parties = read_csv("partispolitiques.csv", force)
    nat, seats = {}, {}
    for row in parties[1:]:
        if len(row) < 7:
            continue
        key = ABBR.get(row[2])
        if not key:
            continue
        nat[key] = round(float(row[4].replace(",", ".")), 2)
        seats[key] = int(re.sub(r"[^\d]", "", row[5]) or 0)
    print("national:", nat, "| seats:", seats)

    def resolve(name):
        if name in shares:
            return name
        if name in RENAMES and RENAMES[name] in shares:
            return RENAMES[name]
        if name in NEW_RIDINGS and NEW_RIDINGS[name] in shares:
            return NEW_RIDINGS[name]
        return None

    def lookup(name):
        src = resolve(name)
        return shares[src] if src else None

    missing = [n for n in geo_names if lookup(n) is None]
    print("without baseline:", missing)

    # 2026 official candidates (ballot names): where the 2022 winner is not on
    # the 2026 ballot, the seat loses the incumbent boost (deboost). The 2026
    # candidate JSON's depute_sortant flag cross-checks this (it agreed on
    # every one of the 66 running winners).
    cand26 = json.loads(fetch(CAND26, "qc_candidatures_2026.json", force))
    by26 = {}
    for c in cand26:
        by26.setdefault(norm(c["nom_circonscription"]), []).append(
            (norm(c["nom_bulletin_vote"]), norm(c["prenom_bulletin_vote"])))
    no26 = [n for n in geo_names if norm(n) not in by26]
    print("2026 candidate lists:", len(by26), "| geo names without list:", no26)
    num_of = {v: k for k, v in name_of.items()}
    retiring = {}
    for n in geo_names:
        src = resolve(n)
        if not src or norm(n) not in by26:
            continue
        w = top.get(num_of.get(src))
        if not w:
            continue
        _, nom, prenom = w
        n22, p22 = norm(nom), norm(prenom)
        if not any(a == n22 and b[:1] == p22[:1] for a, b in by26[norm(n)]):
            retiring[bm.fold(n)] = max(votes[num_of[src]],
                                       key=votes[num_of[src]].get)
    print("retiring seats (2022 winner absent from the 2026 ballot):",
          len(retiring))

    # a sitting MNA running as an independent (2026: Chomedey's Sona
    # Lakhoyan Olivier, the 2022 CAQ winner now running alone; the DGEQ
    # flags her depute_sortant with no party). The projected personal vote
    # reuses the BC-derived prior (~22, the mean of five incumbent
    # independents' 2024 shares there); Quebec has no recent comparable
    # case to calibrate against.
    IND_INCUMBENT_EST = 22
    ind_inc = {}
    for c in cand26:
        if c.get("depute_sortant") != "O" or c.get("nom_parti") is not None:
            continue
        gn = next((n for n in geo_names
                   if norm(n) == norm(c["nom_circonscription"])), None)
        src = resolve(gn) if gn else None
        r = shares.get(src) if src else None
        if not gn or r is None:
            continue
        ind_inc[bm.fold(gn)] = {
            "name": (c["prenom_bulletin_vote"] + " "
                     + c["nom_bulletin_vote"]).strip(),
            "past": round(max(0.0, 100 - sum(r.values())), 2),
            "now": IND_INCUMBENT_EST}
    print("sitting MNAs running as independents:", len(ind_inc), sorted(ind_inc))
    cons = []
    for key in sorted(set(bm.fold(n) for n in geo_names)):
        disp = next(n for n in geo_names if bm.fold(n) == key)
        r = lookup(disp) or {p: 0 for p in PARTIES}
        src = resolve(disp)
        cons.append({"id": key, "name": disp, "seats": 1,
                     "votes2022": raw[src][1] if src else 0,
                     "results_2022": r})
    assert len(cons) == 127, "expected 127 ridings"
    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "qc", "total_seats": 127,
                   "constituency_seats": 127, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "NM_CEP", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # Montreal inset: render the island + Laval separately at their own scale
    # (fine detail) and drop a smaller copy into the empty north-east corner
    # (the Labrador side of the map, outside the province boundary).
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
    urban_ids = [bm.fold(f["properties"]["NM_CEP"]) for f in urban]
    print("montreal ridings:", len(urban_ids))
    zoom_gj = os.path.join(CACHE, "qc_montreal.geojson")
    with open(zoom_gj, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": urban}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", zoom_gj,
                "--name-field", "NM_CEP", "--fold", "--attr", "id",
                "--no-prefix", "--out", ZOOM_SVG, "--attribution", ATTRIBUTION,
                "--force"]
    bm.main()
    bm.add_inset(OUT_SVG, ZOOM_SVG, urban_ids, 150, (790, 60),
                 label="Montreal")
    shutil.copy2(OUT_SVG, BMV_SVG)

    # Regional baselines for the sub-national blend: "mtl" is the inset area
    # (island + Laval + South Shore), everything else is "rest"; the 2022
    # shares are vote-weighted sums of the riding results.
    mtl = set(urban_ids)
    region_of = {c["id"]: ("mtl" if c["id"] in mtl else "rest") for c in cons}
    rv = {"mtl": {}, "rest": {}}
    rvv = {"mtl": 0, "rest": 0}
    for c in cons:
        reg = region_of[c["id"]]
        v, vv = raw[resolve(c["name"])]
        for p in PARTIES:
            rv[reg][p] = rv[reg].get(p, 0) + v.get(p, 0)
        rvv[reg] += vv
    region_base = {reg: {p: round(100 * rv[reg].get(p, 0) / rvv[reg], 2)
                         for p in PARTIES} for reg in ("mtl", "rest")}
    print("region base:", region_base)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """
  qc: {
    name: 'Quebec',
    hidden: true, // 2026 election held 2026-10-05; hidden from the nav
    seats: 127,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 127 single-member ridings
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 127 ridings
    constituencyRule: 'fptp',
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-10-05 election: momentum is a nudge,
    // not the driver (anchored at the recent poll mean, 0.15pp/day cap,
    // 10-day damping, blend 0.4); with 2 days left the damped move is tiny
    trend: {
      electionDate: '2026-10-05',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from the en.wikipedia party infoboxes
    parties: {
      caq:  { code: 'CAQ',  name: 'Coalition Avenir Québec',           name_en: 'Coalition Avenir Québec',           color: '#1E90FF' },
      plq:  { code: 'PLQ',  name: 'Parti libéral du Québec',           name_en: 'Quebec Liberal Party',              color: '#EA6D6A' },
      pq:   { code: 'PQ',   name: 'Parti québécois',                   name_en: 'Parti Québécois',                   color: '#87CEFA' },
      qs:   { code: 'QS',   name: 'Québec solidaire',                  name_en: 'Québec solidaire',                  color: '#FF8040' },
      pcq:  { code: 'PCQ',  name: 'Parti conservateur du Québec',      name_en: 'Conservative Party of Quebec',      color: '#313E6B' },
      ind:  { code: 'IND',  name: 'Independent',                       name_en: 'Independent',                       color: '#6B7280' },
    },
    order: ['caq', 'plq', 'pq', 'qs', 'pcq', 'ind'],
    parlOrder: ['qs', 'pq', 'plq', 'caq', 'pcq', 'ind'],
    // incumbent CAQ vs the rest (cards hidden)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['caq'], color: '#1E90FF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['plq', 'pq', 'qs', 'pcq'], color: '#E30613' },
    },
    lastElection: {
      date: '2022-10-03',
      // 2022 general election (Élections Québec, official)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/quebec.svg',
      // swing method: geometric mean of log-odds proportional and uniform
      // swing (bounded, no ratio explosions on strongholds)
      // proportional swing (see the QC 2026 seat-level post-mortem:
      // seat-total MAE 18 vs 28 for the geometric, and it catches the
      // CAQ collapse and the PCQ surge)
      swingMethod: 'proportional',
      selector: 'id',
      useConstituencies: true,     // 127 ridings, projected winner takes the seat
      // sitting-member personal-vote lift for the party that won the seat
      // last time, with a symmetric deboost where the 2022 winner is not on
      // the 2026 ballot (retiringSeats, from the official 2026 candidate
      // list: absent winner = retired or not renominated)
      incumbentBoost: 2.0,
      retiringSeats: @@retiringSeats@@,
      // sitting MNAs running as independents: their personal vote is
      // projected out of the field (name, 2022 Ind/other share, 2026 estimate)
      indIncumbents: @@indIncumbents@@,
      hideBlocToggle: true,
      districts: @@districts@@,
      // 2022 vote shares per riding (Élections Québec; 2 new 2025 ridings
      // inherit the riding they split from)
      gebiete: @@gebiete@@,
      // national baseline for the uniform-swing projection (= 2022 result)
      national2021: @@national@@,
      // Sub-national adjustment: the article's francophone/non-francophone
      // crosstabs weighted into two regions by rough 2021 mother-tongue
      // shares (mtl = island + Laval + South Shore), blended into the
      // national swing at the default 0.5 (same pattern as Spain; the
      // regional data is an adjustment, never the base point).
      regionOf: @@regionOf@@,
      regionBase: @@regionBase@@,
    },
    pollsterMAE: {},
    maeKey: 'QC2022',
    logos: {
      caq: 'img/qc/CAQ.svg', plq: 'img/qc/PLQ.svg', pq: 'img/qc/PQ.svg',
      qs: 'img/qc/QS.svg', pcq: 'img/qc/PCQ.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(nat, 8).replace("\n", "\n      ")),
            ("seats", j(seats, 8).replace("\n", "\n      ")),
            ("districts", j({c["id"]: c["id"] for c in cons}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j({c["id"]: c["results_2022"] for c in cons},
                          8).replace("\n", "\n      ")),
            ("regionOf", j(region_of, 8).replace("\n", "\n      ")),
            ("retiringSeats", j(retiring, 8).replace("\n", "\n      ")),
            ("indIncumbents", j(ind_inc, 8).replace("\n", "\n      ")),
            ("regionBase", j(region_base, 8).replace("\n", "\n      "))):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  qc: \{", text)
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
    print("patched config.js (qc block)")


if __name__ == "__main__":
    main()
