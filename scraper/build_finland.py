#!/usr/bin/env python3
"""Build the Finland map (13 electoral districts) + the fi config block.

Eduskunta: 200 seats, open-list PR with the D'Hondt method in 13 multi-member
electoral districts (no national threshold). The district shapes come from
geoBoundaries FIN ADM1 (the 19 regions) regrouped into the 13 districts;
Helsinki city is split out of the Uusimaa region via the ADM2 "Helsinki
sub-region". Baselines: the 2023 per-district result from the en.wikipedia
results table. Validated: per-district D'Hondt on those shares with the real
district magnitudes reproduces every district's 2023 allocation exactly
(KOK 48 / PS 46 / SDP 43 / KESK 23 / VIHR 13 / VAS 11 / SFP 9 / KD 5 /
Liik 1 / Aland 1). Aland runs its own party system: it is a party with no
polls, so its district baseline (85.6) keeps the seat.

Writes img/finland.svg and inserts the fi block into js/config.js.

Usage: python scraper/build_finland.py [--force]
"""

import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "finland.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "finland.svg")
GEO1 = os.path.join(CACHE, "fi_regions.geojson")
GEO2 = os.path.join(CACHE, "fi_subregions.geojson")
GEOJSON = os.path.join(CACHE, "fi_districts.geojson")
ATTRIBUTION = ("Tulokset: Oikeusministerio (2023, via en.wikipedia); "
               "Geometria: geoBoundaries.org")

# ADM1 region names per district (Helsinki comes from the ADM2 sub-region)
GROUPS = {
    "uusimaa": ["Uusimaa"],
    "varsinais_suomi": ["Finland Proper"],
    "satakunta": ["Satakunta"],
    "hame": ["Tavastia Proper", "P\u00e4ij\u00e4t-H\u00e4me"],
    "pirkanmaa": ["Pirkanmaa"],
    "kaakkois_suomi": ["Kymenlaakso", "South Karelia"],
    "savo_karjala": ["Southern Savonia", "Northern Savonia", "North Karelia"],
    "vaasa": ["Ostrobothnia", "South Ostrobothnia", "Keski-Pohjanmaa"],
    "keski_suomi": ["Central Finland"],
    "oulu": ["Northern Ostrobothnia", "Kainuu"],
    "lappi": ["Lapland"],
    "ahvenanmaa": ["\u00c5land Islands"],
}
# 2023 district -> config key (the results table's labels)
DIST_KEY = {
    "Helsinki": "helsinki", "Uusimaa": "uusimaa",
    "Varsinais-Suomi": "varsinais_suomi", "Satakunta": "satakunta",
    "\u00c5land": "ahvenanmaa", "H\u00e4me": "hame",
    "Pirkanmaa": "pirkanmaa", "Southeast Finland": "kaakkois_suomi",
    "Savo-Karelia": "savo_karjala", "Vaasa": "vaasa",
    "Central Finland": "keski_suomi", "Oulu": "oulu", "Lapland": "lappi",
}
DISPLAY = {
    "helsinki": "Helsinki", "uusimaa": "Uusimaa",
    "varsinais_suomi": "Varsinais-Suomi", "satakunta": "Satakunta",
    "hame": "H\u00e4me", "pirkanmaa": "Pirkanmaa",
    "kaakkois_suomi": "Kaakkois-Suomi", "savo_karjala": "Savo-Karjala",
    "vaasa": "Vaasa", "keski_suomi": "Keski-Suomi", "oulu": "Oulu",
    "lappi": "Lappi", "ahvenanmaa": "Ahvenanmaa",
}
PARTIES = ["kok", "ps", "sdp", "kesk", "vihr", "vas", "sfp", "kd", "liik",
           "aland"]


def fetch(url, name, force=False, binary=True):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    if binary:
        return open(path, "rb").read()
    return open(path, encoding="utf8").read()


def load_geo(iso, adm, path, force):
    if force or not os.path.isfile(path):
        api = json.loads(fetch("https://www.geoboundaries.org/api/current/"
                               "gbOpen/%s/%s/" % (iso, adm),
                               "fi_%s_api.json" % adm.lower(), force)
                         .decode("utf8"))
        dl = api.get("gjDownloadURL") or api.get("simplifiedGeometryGeoJSON")
        r = requests.get(dl, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return json.loads(open(path, encoding="utf8").read())


def parse_2023(force):
    html = fetch("https://en.wikipedia.org/wiki/"
                 "2023_Finnish_parliamentary_election",
                 "fi2023_article.html", force, binary=False)
    soup = BeautifulSoup(html, "lxml")
    table = None
    for t in soup.find_all("table"):
        hdr = " ".join(t.get_text(" ", strip=True).split())[:400]
        if "Electoral district" in hdr and "KOK" in hdr:
            table = t
            break
    assert table is not None, "per-district table not found"
    grid, _ = expand_grid(table)

    def pnum(t):
        m = re.match(r"(\d+(?:\.\d+)?)", t or "")
        return float(m.group(1)) if m else None

    out = {}
    for ri in range(3, len(grid)):
        row = grid[ri]
        if len(row) < 20:
            continue
        name = row[0].strip()
        key = DIST_KEY.get(name)
        if not key:
            continue
        shares, seats = {}, {}
        for k, p in enumerate(PARTIES):
            v = pnum(row[1 + 2 * k])
            s = pnum(row[2 + 2 * k])
            if v is not None:
                shares[p] = v
            if s is not None:
                seats[p] = int(s)
        out[key] = {"shares": shares, "seats": seats,
                    "mag": sum(seats.values())}
    assert len(out) == 13, list(out)
    return out


def main():
    force = "--force" in sys.argv
    adm1 = load_geo("FIN", "ADM1", GEO1, force)
    adm2 = load_geo("FIN", "ADM2", GEO2, force)
    reg = {f["properties"]["shapeName"]: f for f in adm1["features"]}
    hel = next(f for f in adm2["features"]
               if f["properties"]["shapeName"] == "Helsinki sub-region")
    hel_geom = shape(hel["geometry"])

    feats = []
    for key, regions in GROUPS.items():
        if key == "uusimaa":
            geom = shape(reg["Uusimaa"]["geometry"]).difference(hel_geom)
        else:
            geom = unary_union([shape(reg[r]["geometry"]) for r in regions])
        feats.append({"type": "Feature",
                      "properties": {"shapeName": key},
                      "geometry": mapping(geom)})
    feats.append({"type": "Feature",
                  "properties": {"shapeName": "helsinki"},
                  "geometry": mapping(hel_geom)})
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh,
                  ensure_ascii=False)
    print("districts:", len(feats))

    res = parse_2023(force)
    keys = sorted(DIST_KEY.values())
    name_map = {k: k for k in keys}
    name_map_path = os.path.join(CACHE, "fi_name_map.json")
    with open(name_map_path, "w", encoding="utf8") as fh:
        json.dump(name_map, fh, ensure_ascii=False)
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION,
                "--name-map", name_map_path]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    gebiete = {k: {p: round(res[k]["shares"].get(p, 0.0), 2)
                   for p in PARTIES} for k in keys}
    seats = {k: res[k]["mag"] for k in keys}
    j = json.dumps
    national = {"kok": 20.82, "ps": 20.06, "sdp": 19.95, "kesk": 11.29,
                "vihr": 7.04, "vas": 7.06, "sfp": 4.31, "kd": 4.22,
                "liik": 2.42, "aland": 0.37}
    results = dict(national)
    last_seats = {"kok": 48, "ps": 46, "sdp": 43, "kesk": 23, "vihr": 13,
                  "vas": 11, "sfp": 9, "kd": 5, "liik": 1, "aland": 1}

    block = f"""  fi: {{
    name: 'Finland',
    seats: 200,
    threshold: 0.0,               // no national threshold (district-level)
    method: 'dhondt',             // per-district D'Hondt
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 21,
    defaultDays: 90,
    parties: {{
      kok:   {{ code: 'KOK',  name: 'Kansallinen Kokoomus', name_en: 'National Coalition Party', color: '#006288' }},
      ps:    {{ code: 'PS',   name: 'Perussuomalaiset', name_en: 'Finns Party', color: '#FFDE55' }},
      sdp:   {{ code: 'SDP',  name: 'Suomen Sosialidemokraattinen Puolue', name_en: 'Social Democratic Party of Finland', color: '#F54B4B' }},
      kesk:  {{ code: 'KESK', name: 'Suomen Keskusta', name_en: 'Centre Party (Finland)', color: '#3AAD2E' }},
      vihr:  {{ code: 'VIHR', name: 'Vihre\\u00e4 liitto', name_en: 'Green League', color: '#006845' }},
      vas:   {{ code: 'VAS',  name: 'Vasemmistoliitto', name_en: 'Left Alliance (Finland)', color: '#F00A64' }},
      sfp:   {{ code: 'SFP',  name: 'Svenska folkpartiet', name_en: "Swedish People's Party of Finland", color: '#FFDD93' }},
      kd:    {{ code: 'KD',   name: 'Kristillisdemokraatit', name_en: 'Christian Democrats (Finland)', color: '#2B67C9' }},
      liik:  {{ code: 'LIIK', name: 'Liike Nyt', name_en: 'Movement Now', color: '#AE2375' }},
      aland: {{ code: '\\u00c5',   name: 'F\\u00f6r \\u00c5land', name_en: 'For \\u00c5land', color: '#9CA3AF' }},
    }},
    order: ['kok', 'ps', 'sdp', 'kesk', 'vas', 'vihr', 'sfp', 'kd', 'liik', 'aland'],
    parlOrder: ['vas', 'vihr', 'sdp', 'sfp', 'kesk', 'kd', 'kok', 'liik', 'ps', 'aland'],
    // the source polling table's own groupings: Government KOK+PS+SFP+KD
    // (the Orpo cabinet) vs the opposition
    blocs: {{
      bloc1: {{ name: 'Government', short: 'GOV', parties: ['kok', 'ps', 'sfp', 'kd'], color: '#006288' }},
      bloc2: {{ name: 'Opposition', short: 'OPP', parties: ['sdp', 'kesk', 'vas', 'vihr', 'liik'], color: '#F54B4B' }},
    }},
    lastElection: {{
      date: '2023-04-02',
      results: {j(results, ensure_ascii=False)},
      seats: {j(last_seats, ensure_ascii=False)},
    }},
    map: {{
      svg: 'img/finland.svg',
      selector: 'id',
      swingMethod: 'geometric',
      districtThreshold: false,
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j({k: DISPLAY[k] for k in keys}, ensure_ascii=False)},
      seatDistricts: {j({k: seats[k] for k in keys}, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(national, ensure_ascii=False)},
    }},
    pollsterMAE: {{}},
    maeKey: 'FI2027',
    logos: {{
      kok: 'img/fi/KOK.svg', ps: 'img/fi/PS.svg', sdp: 'img/fi/SDP.svg',
      kesk: 'img/fi/KESK.svg', vihr: 'img/fi/VIHR.svg', vas: 'img/fi/VAS.svg',
      sfp: 'img/fi/SFP.svg', kd: 'img/fi/KD.svg', liik: 'img/fi/LIIK.svg',
    }},
  }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "\n  fi: {" not in text, "fi block already present"
    anchor = "\n  pt: {"
    assert anchor in text
    text = text.replace(anchor, "\n" + block.rstrip("\n") + anchor, 1)
    # decode the escapes to literal characters (matching the file style)
    text = (text.replace("Vihre\\u00e4", "Vihre\u00e4")
                .replace("Svenska folkpartiet", "Svenska folkpartiet")
                .replace("F\\u00f6r \\u00c5land", "F\u00f6r \u00c5land")
                .replace("For \\u00c5land", "For \u00c5land")
                .replace("code: '\\u00c5'", "code: '\u00c5'"))
    open(cp, "w", encoding="utf8").write(text)
    print("inserted fi block before pt")


if __name__ == "__main__":
    main()
