#!/usr/bin/env python3
"""Build the Canada federal riding map + config block (343 ridings, FPTP).

Baselines: the 2025 general election per-riding party votes from the
en.wikipedia "Results breakdown of the 2025 Canadian federal election"
article (the results-by-riding table: Lib/Con/NDP/BQ/PPC/Green/Ind/Other
votes + Total per riding). Geometry: the "Canada Federal Electoral
District (FED) Boundaries 2023" feature service (343 features, the 2023
Representation Order). Toronto/Montreal/Vancouver get insets at their own
scale (separate fine-resolution queries).

Writes img/canada.svg, data/canada/constituencies.json and inserts the
canada block into js/config.js.

Usage: python scraper/build_canada_ridings.py [--force]
"""
import json
import math
import os
import re
import shutil
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "canada.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "canada.svg")
CONST_JSON = os.path.join(ROOT, "data", "canada", "constituencies.json")
GEOJSON = os.path.join(CACHE, "ca_ridings.geojson")
ARTICLE = ("https://en.wikipedia.org/wiki/"
           "Results_breakdown_of_the_2025_Canadian_federal_election")
ATTRIBUTION = ("Risultati: Elections Canada (elezioni 2025, via "
               "en.wikipedia); Geometria: Elections Canada (limiti 2023)")
ZOOMS = [
    ("toronto", "Toronto", (790, 60)),
    ("montreal", "Montreal", (790, 250)),
    ("vancouver", "Vancouver", (790, 440)),
]

PARTIES = ["lpc", "cpc", "bq", "ndp", "gpc", "ppc", "other"]
# the results table's party vote columns -> config key (Ind folds into other)
COLS = {14: "lpc", 15: "cpc", 16: "ndp", 17: "bq", 18: "ppc", 19: "gpc",
        20: "other", 21: "other"}
WINMAP = {"Lib": "lpc", "Con": "cpc", "NDP": "ndp", "BQ": "bq",
          "PPC": "ppc", "Green": "gpc", "Ind": "other", "Other": "other"}
META = {
    "lpc": ("LPC", "Liberal Party of Canada", "#EA6D6A",
            "Liberalism, Centrism"),
    "cpc": ("CPC", "Conservative Party of Canada", "#6495ED",
            "Conservatism, Right-wing populism"),
    "bq": ("BQ", "Bloc Qu\u00e9b\u00e9cois", "#87CEFA",
           "Quebec nationalism, Social democracy"),
    "ndp": ("NDP", "New Democratic Party", "#F4A460",
            "Social democracy, Democratic socialism"),
    "gpc": ("GPC", "Green Party of Canada", "#99C955",
            "Green politics, Progressivism"),
    "ppc": ("PPC", "People's Party of Canada", "#6f5d9a",
            "Right-wing populism, Libertarianism"),
    "other": ("OTH", "Independents and minor parties", "#DCDCDC",
              "Independents and minor parties"),
}
LOGOS = {"lpc": "LPC.svg", "cpc": "CPC.svg", "bq": "BQ.svg",
         "ndp": "NDP.svg", "gpc": "GPC.svg", "ppc": "PPC.svg"}


def norm(s):
    s = re.sub(r"[\u2013\u2014\u2212]", "-", s or "")
    return s.replace("\u0153", "oe").replace("\u00e6", "ae")


def fold(s):
    return bm.fold(norm(s))


def clean_name(s):
    """Strip footnote markers and fix the one table typo."""
    s = re.sub(r"\[\s*[^\[\]]*\]", "", s or "").strip()
    if s.startswith("Taiaiko"):
        s = "Taiaiako\u2019n\u2014Parkdale\u2014High Park"
    return s


def num(s):
    s = re.sub(r"\[[^\]]*\]", "", s or "")
    return int(re.sub(r"[^\d]", "", s) or 0)


def lcc(lon, lat):
    """Lambert conformal conic (sphere) - the classic Canada projection.
    Standard parallels 49N/77N, central meridian 95W. Units: radians."""
    r = math.radians
    lat1, lat2, lon0, lat0 = r(49.0), r(77.0), r(-95.0), r(49.0)
    lon, lat = r(lon), r(lat)
    n = (math.log(math.cos(lat1) / math.cos(lat2)) /
         math.log(math.tan(math.pi / 4 + lat2 / 2) /
                  math.tan(math.pi / 4 + lat1 / 2)))
    F = math.cos(lat1) * math.tan(math.pi / 4 + lat1 / 2) ** n / n
    rho = F / math.tan(math.pi / 4 + lat / 2) ** n
    rho0 = F / math.tan(math.pi / 4 + lat0 / 2) ** n
    x = rho * math.sin(n * (lon - lon0))
    y = rho0 - rho * math.cos(n * (lon - lon0))
    return x * 1000.0, y * 1000.0


def project_geojson(gj):
    def walk(c):
        if isinstance(c[0], (int, float)):
            return list(lcc(c[0], c[1]))
        return [walk(x) for x in c]

    for f in gj["features"]:
        f["geometry"]["coordinates"] = walk(f["geometry"]["coordinates"])
    return gj


def fetch_geo(force=False):
    if force or not os.path.isfile(GEOJSON):
        base = ("https://services6.arcgis.com/6BIQGZ90YbquvS74/arcgis/rest/"
                "services/Canada_Federal_Electoral_District_Boundaries_2023/"
                "FeatureServer/0/query")
        r = requests.get(base, params={
            "where": "1=1", "outFields": "FED_NUM,ED_NAMEE",
            "returnGeometry": "true", "f": "geojson", "outSR": "4326",
            "maxAllowableOffset": "0.003"},
            headers={"User-Agent": "Mozilla/5.0"}, timeout=600)
        r.raise_for_status()
        open(GEOJSON, "w", encoding="utf8").write(r.text)
    gj = json.loads(open(GEOJSON, encoding="utf8").read())
    # normalize dash variants in the names so bm.fold matches the results
    # side (em-dashes are stripped by fold, ASCII hyphens are kept)
    for f in gj["features"]:
        f["properties"]["ED_NAMEE"] = norm(f["properties"]["ED_NAMEE"])
    return gj


def parse_2025():
    r = requests.get(ARTICLE, headers={"User-Agent": "Mozilla/5.0"},
                     timeout=300)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) < 300:
            continue
        grid, _ = expand_grid(tb)
        if len(grid) < 5:
            continue
        head = " ".join(" ".join(r) for r in grid[:6]).lower()
        if "riding" not in head or "lib" not in head \
                or "total" not in head or "margin" not in head:
            continue
        out = {}
        for row in grid:
            if len(row) < 23 or not row[1].strip():
                continue
            name = clean_name(row[1])
            if not name or name.lower() in ("riding",):
                continue
            votes = {}
            for c, key in COLS.items():
                votes[key] = votes.get(key, 0) + num(row[c])
            win = WINMAP.get(row[5].strip())
            if not win:
                continue
            total = num(row[22])
            if not total:
                continue
            out[fold(name)] = {
                "name": name, "province": row[0].strip(), "winner": win,
                "votes": votes, "total": total,
                # 3dp so near-ties resolve by the real votes
                # (Windsor—Tecumseh—Lakeshore: Con by 4 votes)
                "shares": {p: round(100 * votes.get(p, 0) / total, 3)
                           for p in PARTIES},
            }
        if len(out) >= 340:
            return out
    raise SystemExit("results-by-riding table not found")


def main():
    force = "--force" in sys.argv
    gj = fetch_geo(force)
    feats = gj["features"]
    print("features:", len(feats))
    assert len(feats) == 343

    res = parse_2025()
    print("ridings parsed:", len(res))
    missing = [f["properties"]["ED_NAMEE"] for f in feats
               if fold(f["properties"]["ED_NAMEE"]) not in res]
    print("geometries without results:", missing)
    assert not missing, "name mismatch between the service and the table"
    extra = [k for k in res if k not in
             {fold(f["properties"]["ED_NAMEE"]) for f in feats}]
    print("results without geometry:", extra)
    assert not extra

    cons = []
    for f in feats:
        nm = f["properties"]["ED_NAMEE"]
        r = res[fold(nm)]
        cons.append({"id": fold(nm), "name": r["name"], "seats": 1,
                     "votes2022": r["total"], "results_2022": r["shares"]})
    ids = [c["id"] for c in cons]
    assert len(set(ids)) == 343, "duplicate folded ids"
    wins, nat, tot = {}, {p: 0 for p in PARTIES}, 0
    for f in feats:
        r = res[fold(f["properties"]["ED_NAMEE"])]
        wins[r["winner"]] = wins.get(r["winner"], 0) + 1
        # the map colors by argmax of the stored shares - it must reproduce
        # the declared winner for every riding
        top = max(r["shares"], key=r["shares"].get)
        assert top == r["winner"], "argmax %s != winner %s (%s)" \
            % (top, r["winner"], r["name"])
        for p in PARTIES:
            nat[p] += r["votes"].get(p, 0)
        tot += r["total"]
    print("2025 seat check:", wins)
    assert sum(wins.values()) == 343
    NAT = {p: round(100 * nat[p] / tot, 2) for p in PARTIES}
    print("2025 national:", NAT, "total votes:", tot)
    SEATS = {p: wins.get(p, 0) for p in PARTIES}
    assert abs(sum(NAT.values()) - 100) < 0.5

    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "canada", "total_seats": 343,
                   "constituency_seats": 343, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    # project to Lambert conic (the classic Canada shape; Mercator would
    # stretch the Arctic to ~60% of the canvas) and render linearly
    project_geojson(gj)
    geo_proj = os.path.join(CACHE, "ca_ridings_proj.geojson")
    with open(geo_proj, "w", encoding="utf8") as fh:
        json.dump(gj, fh)

    sys.argv = ["build_map_svg.py", "--geojson", geo_proj,
                "--name-field", "ED_NAMEE", "--fold", "--attr", "id",
                "--no-prefix", "--project", "none", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()

    # insets: separate fine-resolution queries per city box
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

    for name, label, at in ZOOMS:
        src = os.path.join(CACHE, "ca_%s.geojson" % name)
        if force or not os.path.isfile(src):
            boxes = {"toronto": (-79.75, 43.50, -79.00, 43.95),
                     "montreal": (-74.05, 45.35, -73.25, 45.75),
                     "vancouver": (-123.35, 49.0, -122.35, 49.55)}
            box = boxes[name]
            base = ("https://services6.arcgis.com/6BIQGZ90YbquvS74/arcgis/"
                    "rest/services/Canada_Federal_Electoral_District_"
                    "Boundaries_2023/FeatureServer/0/query")
            geom = json.dumps({"xmin": box[0], "ymin": box[1],
                               "xmax": box[2], "ymax": box[3],
                               "spatialReference": {"wkid": 4326}})
            r = requests.get(base, params={
                "where": "1=1", "outFields": "FED_NUM,ED_NAMEE",
                "returnGeometry": "true", "f": "geojson", "outSR": "4326",
                "geometry": geom, "geometryType": "esriGeometryEnvelope",
                "inSR": "4326", "spatialRel": "esriSpatialRelIntersects",
                "maxAllowableOffset": "0.0002"},
                headers={"User-Agent": "Mozilla/5.0"}, timeout=600)
            r.raise_for_status()
            open(src, "w", encoding="utf8").write(r.text)
        fine = json.loads(open(src, encoding="utf8").read())
        for f in fine["features"]:
            f["properties"]["ED_NAMEE"] = norm(f["properties"]["ED_NAMEE"])
        box = {"toronto": (-79.75, 43.50, -79.00, 43.95),
               "montreal": (-74.05, 45.35, -73.25, 45.75),
               "vancouver": (-123.35, 49.0, -122.35, 49.55)}[name]
        urban = []
        for f in fine["features"]:
            x0, y0, x1, y1 = bbox(f["geometry"])
            if x0 >= box[0] and y0 >= box[1] and x1 <= box[2] \
                    and y1 <= box[3]:
                urban.append(f)
        urban_ids = [fold(f["properties"]["ED_NAMEE"]) for f in urban]
        print("%s inset ridings: %d" % (label, len(urban_ids)))
        detail_gj = os.path.join(CACHE, "ca_%s_detail.geojson" % name)
        project_geojson({"type": "FeatureCollection", "features": urban})
        with open(detail_gj, "w", encoding="utf8") as fh:
            json.dump({"type": "FeatureCollection", "features": urban}, fh)
        detail_svg = os.path.join(CACHE, "ca_%s_detail.svg" % name)
        sys.argv = ["build_map_svg.py", "--geojson", detail_gj,
                    "--name-field", "ED_NAMEE", "--fold", "--attr", "id",
                    "--no-prefix", "--project", "none", "--out", detail_svg,
                    "--attribution", ATTRIBUTION, "--force"]
        bm.main()
        bm.add_inset(OUT_SVG, detail_svg, urban_ids, 150, at, label=label)
    if os.path.isdir(os.path.dirname(BMV_SVG)):
        shutil.copy2(OUT_SVG, BMV_SVG)

    # logos
    dst = os.path.join(ROOT, "img", "ca")
    os.makedirs(dst, exist_ok=True)
    logos = {}
    for key, logo in LOGOS.items():
        shutil.copy2(os.path.join(r"C:\Users\deneme\Desktop\600logo\CA",
                                  logo), os.path.join(dst, logo))
        logos[key] = "img/ca/" + logo

    j = json.dumps
    parties = "\n".join(
        "      %s: { code: '%s', name: '%s', name_en: '%s', color: '%s', "
        "ideology: \"%s\"}," % (k, META[k][0],
                                META[k][1].replace("'", "\\'"),
                                META[k][1].replace("'", "\\'"),
                                META[k][2], META[k][3])
        for k in PARTIES)
    block = """  canada: {
    name: 'Canada',
    seats: 343,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 343 single-member ridings
    constituencyRule: 'fptp',
    constituencies: true,         // the map is the 343 ridings
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
%s
    },
    order: ['lpc', 'cpc', 'bq', 'ndp', 'gpc', 'ppc', 'other'],
    parlOrder: ['ndp', 'gpc', 'bq', 'ppc', 'other', 'cpc', 'lpc'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['lpc'], color: '#EA6D6A' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['cpc', 'bq', 'ndp', 'gpc', 'ppc', 'other'], color: '#6495ED' },
    },
    lastElection: {
      date: '2025-04-28',
      // 2025 general election (Elections Canada)
      results: %s,
      seats: %s,
    },
    map: {
      svg: 'img/canada.svg',
      swingMethod: 'proportional',
      selector: 'id',
      useConstituencies: true,     // 343 ridings, projected winner takes the seat
      hideBlocToggle: true,        // no government-vs-rest bloc coloring
      districts: %s,
      gebiete: %s,
      // national baseline for the swing (= 2025 result)
      national2021: %s,
    },
    pollsterMAE: {},
    maeKey: 'CA2029',
    logos: %s,
  },
""" % (parties,
       j(NAT, ensure_ascii=False),
       j(SEATS, ensure_ascii=False),
       j({c["id"]: c["id"] for c in cons}),
       j({c["id"]: c["results_2022"] for c in cons}, ensure_ascii=False),
       j(NAT, ensure_ascii=False),
       '{ ' + ', '.join("%s: '%s'" % (k, v) for k, v in logos.items()) + ' }')

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  canada: \{", text)
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
        end = k + 1
        if text[end:end + 1] == ",":
            end += 1
        text = text[:m.start()] + "\n" + block.rstrip("\n") + text[end:]
    else:
        anchor = "\n  qc: {"
        text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (canada block)")

    meta = {
        "country": "canada", "name": "Canada",
        "election_date": "2029-10-15", "seats": 343, "threshold": 0,
        "method": "fptp", "constituencies": True,
        "notes": ("FPTP, 343 ridings (2023 Representation Order). "
                  "Baselines: the 2025 general election per-riding votes "
                  "(en.wikipedia breakdown, Elections Canada data). "
                  "Polling: the 46th election article's table "
                  "(scrape_canada.py)."),
    }
    os.makedirs(os.path.join(ROOT, "data", "canada"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "canada", "meta.json"), "w",
              encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    print("wrote data/canada/meta.json")


if __name__ == "__main__":
    main()
