#!/usr/bin/env python3
"""Build the Hungary county map + config block.

Mixed system: 106 single-member constituencies (county-winner
approximation: the strongest party in each county takes that county's SMD
seats) + 93 national list seats (D'Hondt, 5% threshold). Baselines: the
2026 election party-list shares per county from the en.wikipedia article.
Geometry: geoBoundaries HUN ADM1 (19 counties + Budapest).

Writes img/hungary.svg, data/hu/counties.json and patches the hu block
into js/config.js.

Usage: python scraper/build_hungary_counties.py [--force]
"""

import json
import os
import re
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "hungary.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "hungary.svg")
DIST_JSON = os.path.join(ROOT, "data", "hu", "counties.json")
GEOJSON = os.path.join(CACHE, "hu_counties.geojson")
ARTICLE = ("https://en.wikipedia.org/wiki/"
           "2026_Hungarian_parliamentary_election")
GEO_URL = ("https://www.geoboundaries.org/api/current/gbHumanitarian/"
           "HUN/ADM1/")
ATTRIBUTION = ("Eredmények: Nemzeti Választási Iroda (2026, via en.wikipedia); "
               "Geometria: geoBoundaries.org")

PARTIES = ["tisza", "fidesz", "mh", "dk", "mkkp"]
NATIONAL = {"tisza": 53.18, "fidesz": 38.61, "mh": 5.63, "dk": 1.10,
            "mkkp": 0.82}
SEATS_2026 = {"tisza": 141, "fidesz": 52, "mh": 6, "dk": 0, "mkkp": 0}
# SMD seats per county (106 total, official 2026 apportionment)
SMD = {
    "budapest": 16, "pest": 14, "borsodabaujzemplen": 7,
    "szabolcsszatmarbereg": 6, "bacskiskun": 6, "hajdubihar": 6,
    "fejer": 5, "gyormosonsopron": 5, "baranya": 4, "csongradcsanad": 4,
    "somogy": 4, "veszprem": 4, "bekes": 4, "jasznagykunszolnok": 4,
    "heves": 3, "komaromesztergom": 3, "tolna": 3, "vas": 3, "zala": 3,
    "nograd": 2,
}
# table county name -> key
COUNTY = {k: k for k in SMD}


def fix(s):
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def norm(s):
    s = unicodedata.normalize("NFKD", fix(s))
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z]", "", s).lower()


COUNTY_NORM = {norm(k): k for k in COUNTY}
# gbHumanitarian spellings
COUNTY_NORM["csongrad"] = "csongradcsanad"
COUNTY_NORM["pestmegye"] = "pest"


def fetch(url, name, force=False, binary=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def pct(s):
    m = re.match(r"(\d+(?:\.\d+)?)\s*%?", (s or "").strip())
    return float(m.group(1)) if m else None


def parse_2026(html):
    soup = BeautifulSoup(html, "lxml")
    counties = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 18:
            continue
        hdr = [" ".join(c.get_text(" ", strip=True).split())
               for c in rows[0].find_all(["td", "th"])]
        if "TISZA" not in hdr or "Fidesz–KDNP" not in hdr:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 6:
                continue
            key = COUNTY_NORM.get(norm(cells[0]))
            if not key:
                continue
            shares = {}
            for i, pk in enumerate(PARTIES):
                v = pct(cells[1 + i])
                if v is not None:
                    shares[pk] = round(v, 2)
            if len(shares) >= 3:
                counties[key] = shares
        if counties:
            break
    return counties


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(GEO_URL, "hu_adm1_meta.json", force))
    geo = json.loads(fetch(gj["gjDownloadURL"], "hu_counties.geojson",
                           force, binary=True))
    print("features:", len(geo["features"]))
    names = {}
    for f in geo["features"]:
        shape = f["properties"].get("shapeName", "")
        key = COUNTY_NORM.get(norm(shape))
        if not key:
            print("unmapped shape:", repr(shape))
            continue
        names[shape] = key
    assert len(set(names.values())) == 20, \
        f"expected 20 counties, got {len(set(names.values()))}"

    counties = parse_2026(fetch(ARTICLE, "hu_2026_article.html", force))
    print("counties with 2026 results:", len(counties),
          "| missing:", sorted(set(names.values()) - set(counties)))
    assert len(counties) == 20

    os.makedirs(os.path.dirname(DIST_JSON), exist_ok=True)
    with open(DIST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "hu", "total_seats": 199,
                   "counties": counties}, fh, ensure_ascii=False, indent=1)

    name_map_path = os.path.join(CACHE, "hu_name_map.json")
    with open(name_map_path, "w", encoding="utf8") as fh:
        json.dump(names, fh, ensure_ascii=False)
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

    j = json.dumps
    keys = sorted(set(names.values()))
    block = f"""  hu: {{
    name: 'Hungary',
    seats: 199,
    threshold: 5.0,
    method: 'dhondt',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {{
      tisza:  {{ code: 'TISZA',  name: 'Tisza Párt', name_en: 'Tisza Party', color: '#00A9A5' }},
      fidesz: {{ code: 'FIDESZ', name: 'Fidesz–KDNP', name_en: 'Fidesz–KDNP', color: '#F47920' }},
      mh:     {{ code: 'MH',     name: 'Mi Hazánk Mozgalom', name_en: 'Our Homeland Movement', color: '#3C5E34' }},
      dk:     {{ code: 'DK',     name: 'Demokratikus Koalíció', name_en: 'Democratic Coalition', color: '#1D5DA8' }},
      mkkp:   {{ code: 'MKKP',   name: 'Magyar Kétfarkú Kutya Párt', name_en: 'Hungarian Two-Tailed Dog Party', color: '#8C8C8C' }},
    }},
    order: ['tisza', 'fidesz', 'mh', 'dk', 'mkkp'],
    parlOrder: ['dk', 'mkkp', 'tisza', 'mh', 'fidesz'],
    blocs: {{
      bloc1: {{ name: 'Government', short: 'GOV', parties: ['tisza'], color: '#00A9A5' }},
      bloc2: {{ name: 'Opposition', short: 'OPP', parties: ['fidesz', 'mh', 'dk', 'mkkp'], color: '#F47920' }},
    }},
    lastElection: {{
      date: '2026-04-12',
      results: {j(NATIONAL, ensure_ascii=False)},
      seats: {j(SEATS_2026, ensure_ascii=False)},
    }},
    map: {{
      svg: 'img/hungary.svg',
      selector: 'id',
      swingMethod: 'geometric',
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      gebiete: {j(counties, ensure_ascii=False)},
      // 106 single-member constituencies: the strongest party in each county
      // takes that county's seats (the 2026 reality: Tisza swept 96 of 106)
      winnerDistricts: {j(SMD, ensure_ascii=False)},
      national2021: {j(NATIONAL, ensure_ascii=False)},
    }},
    pollsterMAE: {{}},
    maeKey: 'HU2026',
    logos: {{
      tisza: 'img/hu/TISZA.svg', fidesz: 'img/hu/FIDESZ.svg',
      mh: 'img/hu/MH.svg', dk: 'img/hu/DK.svg', mkkp: 'img/hu/MKKP.svg',
    }},
  }},
"""
    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  hu: \{", text)
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
        anchor = "\n  pt: {"
        text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (hu block)")


if __name__ == "__main__":
    main()
