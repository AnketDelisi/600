#!/usr/bin/env python3
"""Build the Argentina presidential map + config block (two-round, 24 map
units: 23 provinces + the City of Buenos Aires).

Baselines: the 2023 presidential first round per province (en.wikipedia
2023 Argentine general election, table "Results by province"): the 2027
field is a set of declared/potential candidacies, so the 2023 candidates
are mapped onto it - Milei, Massa, Schiaretti and Bregman are in the 2027
field themselves; Bullrich (Juntos por el Cambio) -> Macri (PRO); the
other PJ-FP alternatives (Kicillof, Kirchner) inherit the Massa
geography, and the result view folds them back (resultMerge ->
massa/bullrich pastOnly). The runoff baselines are the 2023 runoff
per province (Milei 55.69 / Massa 44.31). Geometry: geoBoundaries ARG
ADM1. Logos: 600logo/AR (user-prepared).

Writes img/argentina.svg, data/argentina/meta.json and patches the
argentina block into js/config.js.

Usage: python scraper/build_argentina.py [--force]
"""

import json
import os
import re
import shutil
import sys
import unicodedata

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from scrape_spain import expand_grid

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "argentina.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "argentina.svg")
GEOJSON = os.path.join(CACHE, "ar_provinces.geojson")
# geoBoundaries' ARG ADM1 is missing Entre Rios (23 features, La Rioja
# mislabelled "La Roja"): GADM 4.1 has all 24, same as the France map
GEO_URL = ("https://geodata.ucdavis.edu/gadm/gadm4.1/json/"
           "gadm41_ARG_1.json")
ATTRIBUTION = ("Resultados: Cámara Nacional Electoral (2023, via "
               "en.wikipedia); Geometría: GADM 4.1")
ARTICLE = "https://en.wikipedia.org/wiki/2023_Argentine_general_election"
LOGO_SRC = "C:\\Users\\deneme\\Desktop\\600logo\\AR"

KEYS = ["buenos_aires", "buenos_aires_city", "catamarca", "chaco", "chubut",
        "cordoba", "corrientes", "entre_rios", "formosa", "jujuy",
        "la_pampa", "la_rioja", "mendoza", "misiones", "neuquen",
        "rio_negro", "salta", "san_juan", "san_luis", "santa_cruz",
        "santa_fe", "santiago_del_estero", "tierra_del_fuego", "tucuman"]
# GADM 4.1 NAME_1 -> key (fold-normalized; GADM joins the words)
SHAPE = {
    "BuenosAires": "buenos_aires",
    "CiudaddeBuenosAires": "buenos_aires_city",
    "Catamarca": "catamarca", "Chaco": "chaco", "Chubut": "chubut",
    "Córdoba": "cordoba", "Corrientes": "corrientes",
    "EntreRíos": "entre_rios", "Formosa": "formosa", "Jujuy": "jujuy",
    "LaPampa": "la_pampa", "LaRioja": "la_rioja", "Mendoza": "mendoza",
    "Misiones": "misiones", "Neuquén": "neuquen", "RíoNegro": "rio_negro",
    "Salta": "salta", "SanJuan": "san_juan", "SanLuis": "san_luis",
    "SantaCruz": "santa_cruz", "SantaFe": "santa_fe",
    "SantiagodelEstero": "santiago_del_estero",
    "TierradelFuego": "tierra_del_fuego",
    "Tucumán": "tucuman",
}
# 2023 national (official): first round + runoff. The Massa geography is
# split 50/25/25 among Massa/Kicillof/Kirchner so the result view's merge
# reconstructs the true Massa share exactly (the split only scales each
# candidate's base; the polls set the levels)
SPLIT = {"massa": 0.5, "kicillof": 0.25, "kirchner": 0.25}
NAT = {"milei": 29.99, "macri": 23.83, "schiaretti": 6.78, "bregman": 2.70}
for k, w in SPLIT.items():
    NAT[k] = round(36.69 * w, 2)
NAT_RUNOFF = {"milei": 55.69, "massa": 44.31}
# 2027 candidates: key -> (code, name, color, ideology, logo file)
CAND = {
    "milei": ("Milei", "Javier Milei", "#6C4C99",
              "Libertarianism, Right-wing populism", "LLA.svg"),
    "kicillof": ("Kicillof", "Axel Kicillof", "#318CE7",
                 "Peronism, Kirchnerism", "PJ.svg"),
    "kirchner": ("Kirchner", "Máximo Kirchner", "#318CE7",
                 "Kirchnerism, Peronism", "PJ.svg"),
    "massa": ("Massa", "Sergio Massa", "#0E3C61",
              "Peronism, Federal Peronism", "FR.svg"),
    "moreno": ("Moreno", "Guillermo Moreno", "#00ADEF",
               "Nationalism, Peronism", "PYV.svg"),
    "grabois": ("Grabois", "Juan Grabois", "#17A0DA",
                "Left-wing Peronism, Social justice", "PG.svg"),
    "macri": ("Macri", "Mauricio Macri", "#FFD700",
              "Liberal conservatism, Republicanism", "PRO.svg"),
    "schiaretti": ("Schiaretti", "Juan Schiaretti", "#27AE60",
                   "Federal Peronism, Regionalism", "PU.svg"),
    "bregman": ("Bregman", "Myriam Bregman", "#F65058",
                "Trotskyism, Socialism of the left", "FITU.svg"),
    "villarruel": ("Villarruel", "Victoria Villarruel", "#192B6B",
                   "National conservatism, Right-wing populism", "PD.svg"),
    "gebel": ("Gebel", "Gebel", "#9CA3AF", "Independent", None),
}
# 2027-only candidate order, then the 2023 pastOnly entries
ORDER = ["milei", "kicillof", "kirchner", "massa", "grabois", "macri",
         "villarruel", "schiaretti", "bregman", "moreno", "gebel",
         "bullrich"]
PARL = ["bregman", "kirchner", "massa", "kicillof", "grabois", "moreno",
        "schiaretti", "macri", "gebel", "villarruel", "milei", "bullrich"]


def fold(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def fetch(url, name, force=False, binary=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, "rb").read() if binary else \
        open(path, encoding="utf8").read()


def num(s):
    m = re.match(r"([\d.]+)", (s or "").replace(",", "").strip())
    return float(m.group(1)) if m else None


def parse_2023():
    # province label (en.wikipedia) -> key via fold (Buenos Aires City ->
    # buenosairescity = buenos_aires_city)
    key_by_fold = {fold(k): k for k in KEYS}
    soup = BeautifulSoup(fetch(ARTICLE, "ar2023_article.html"), "lxml")
    r1, ro = {}, {}
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) < 20:
            continue
        grid, _ = expand_grid(tb)
        hdr = " ".join(c for c in grid[0][:12]).lower()
        if "massa" in hdr and "milei" in hdr and "bullrich" in hdr:
            # first round: Province | M v,% | Mi v,% | B v,% | Sc v,% |
            # Br v,% | blanks
            for row in grid[3:]:
                key = key_by_fold.get(fold(row[0]))
                if not key:
                    continue
                pcts = [num(c) for c in row]
                # cells: 0 province, 1..10 the votes/% pairs
                r1[key] = {"massa": pcts[2], "milei": pcts[4],
                           "bullrich": pcts[6], "schiaretti": pcts[8],
                           "bregman": pcts[10]}
        elif "margin" in hdr and "milei" in hdr:
            # runoff: Province | Milei v,% | Massa v,% | margin ...
            for row in grid[3:]:
                key = key_by_fold.get(fold(row[0]))
                if not key:
                    continue
                pcts = [num(c) for c in row]
                ro[key] = {"milei": pcts[2], "massa": pcts[4]}
    assert len(r1) == 24, len(r1)
    assert len(ro) == 24, len(ro)
    return r1, ro


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(GEO_URL, "ar_adm1_meta.json", force))
    geo = gj
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump(geo, fh)
    names = {}
    for f in geo["features"]:
        shape = f["properties"].get("NAME_1", "")
        for k, v in SHAPE.items():
            if fold(shape) == fold(k):
                names[shape] = v
                break
        else:
            print("unmapped shape:", repr(shape))
    assert len(set(names.values())) == 24, \
        f"expected 24 districts, got {len(set(names.values()))}"

    r1, ro = parse_2023()
    print("R1 provinces:", len(r1), "| runoff:", len(ro))
    print("buenos_aires R1:", r1["buenos_aires"])
    print("cordoba runoff:", ro["cordoba"])

    # gebiete: the 2023 geography mapped to the 2027 field (the Massa
    # geography split 50/25/25 across the PJ-FP alternatives)
    gebiete = {}
    for key in KEYS:
        row = {"milei": r1[key]["milei"],
               "macri": r1[key]["bullrich"],
               "schiaretti": r1[key]["schiaretti"],
               "bregman": r1[key]["bregman"]}
        for k, w in SPLIT.items():
            row[k] = round(r1[key]["massa"] * w, 2)
        gebiete[key] = row
    runoff = {k: {"milei": ro[k]["milei"], "massa": ro[k]["massa"]}
              for k in KEYS}

    os.makedirs(os.path.join(ROOT, "data", "argentina"), exist_ok=True)
    name_map_path = os.path.join(CACHE, "ar_name_map.json")
    with open(name_map_path, "w", encoding="utf8") as fh:
        json.dump(names, fh, ensure_ascii=False)
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "NAME_1", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG, "--attribution", ATTRIBUTION,
                "--name-map", name_map_path]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    shutil.copy2(OUT_SVG, BMV_SVG)

    # logos
    dst = os.path.join(ROOT, "img", "ar")
    os.makedirs(dst, exist_ok=True)
    logos = {}
    for key, (code, name, color, ideol, logo) in CAND.items():
        if logo:
            shutil.copy2(os.path.join(LOGO_SRC, logo),
                         os.path.join(dst, logo))
            logos[key] = "img/ar/" + logo

    j = json.dumps
    parties = []
    for key in ORDER:
        if key == "bullrich":
            parties.append(
                '      bullrich: { code: \'Bullrich\', name: \'Patricia '
                'Bullrich\', name_en: \'Patricia Bullrich\', '
                'color: \'#FFD700\', pastOnly: true, ideology: '
                '"Liberal conservatism, Republicanism"},')
            continue
        code, name, color, ideol, _ = CAND[key]
        parties.append(
            f'      {key}: {{ code: \'{code}\', name: \'{name}\', '
            f'name_en: \'{name}\', color: \'{color}\', ideology: '
            f'"{ideol}"}},')
    # 2027-only candidates in lastElection results: 0
    last_res = {"massa": 36.69, "milei": 29.99, "bullrich": 23.83,
                "schiaretti": 6.78, "bregman": 2.70}
    for key in ORDER:
        last_res.setdefault(key, 0)
    block = """  argentina: {
    name: 'Argentina',
    // presidential two-round: the map units are the 24 districts (23
    // provinces + the City of Buenos Aires). The 2027 field is a set of
    // declared/potential candidacies - the polls test alternative fields,
    // so the field selector is on. The 2023 geography is mapped onto the
    // 2027 field: Milei/Massa/Schiaretti/Bregman are in it themselves,
    // Bullrich (JxC) -> Macri (PRO), and the other PJ-FP alternatives
    // (Kicillof, Kirchner) inherit the Massa geography (the result view
    // folds them back to the true 2023 candidates via resultMerge).
    seats: 24,                    // 24 map units (departments of the map)
    threshold: 50,
    method: 'hare_niemeyer',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    defaultDays: 90,
    fieldSelector: true,
    hideBlocs: true,
    mapOnly: true,
    unitLabel: {
      en: 'districts',
      tr: 'bölge'
    },
    parties: {
%s
    },
    order: %s,
    parlOrder: %s,
    blocs: {
      bloc1: { name: 'Milei', short: 'LLA', parties: ['milei'], color: '#6C4C99' },
      bloc2: { name: 'Field', short: 'FLD', parties: ['kicillof', 'kirchner', 'massa', 'grabois', 'macri', 'villarruel', 'schiaretti', 'bregman', 'moreno', 'gebel'], color: '#318CE7' },
    },
    lastElection: {
      date: '2023-10-22',
      // the TRUE 2023 first round (Massa 36.69, Milei 29.99, Bullrich
      // 23.83, Schiaretti 6.78, Bregman 2.70); the 2027-only candidates
      // read 0. Milei won the runoff 55.69/44.31
      results: %s,
      seats: { milei: 1 },
    },
    map: {
      svg: 'img/argentina.svg',
      selector: 'id',
      districts: %s,
      gebiete: %s,
      national2021: %s,
      // result views show the 2023 candidates as they ran: the inherited
      // 2027 candidates fold back into them
      resultMerge: { kicillof: 'massa', kirchner: 'massa', macri: 'bullrich' },
      // the 2023 runoff baselines per district (Milei vs Massa); the app
      // looks up runoff2026/2023/2022 and remaps when the pairing differs
      runoff2023: %s,
      nationalRunoff: %s,
    },
    pollsterMAE: {},
    maeKey: 'AR2027',
    logos: %s,
  },
""" % ("\n".join(parties),
       j(ORDER).replace('"', "'"),
       j(PARL).replace('"', "'"),
       j(last_res, ensure_ascii=False),
       j({k: k for k in KEYS}),
       j(gebiete, ensure_ascii=False),
       j(NAT, ensure_ascii=False),
       j(runoff, ensure_ascii=False),
       j(NAT_RUNOFF),
       '{ ' + ', '.join("%s: '%s'" % (k, v) for k, v in logos.items()) + ' }')

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  argentina: \{", text)
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
        anchor = "\n  bgpres: {"
        text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (argentina block)")

    meta = {
        "country": "argentina", "name": "Argentina",
        "election_date": "2027-10-31", "election_date_runoff": "2027-11-28",
        "seats": 24, "threshold": 50, "method": "hare_niemeyer",
        "constituencies": False,
        "notes": ("Presidential two-round; the map units are the 24 "
                  "districts. Baselines: the 2023 first round per "
                  "province mapped onto the 2027 field (Bullrich -> "
                  "Macri, the other PJ-FP alternatives inherit Massa's "
                  "geography); runoff2023 per district (Milei 55.69 / "
                  "Massa 44.31). Field unsettled -> fieldSelector on. "
                  "Polling: the 2027 general election article's candidate "
                  "table (scrape_argentina.py)."),
    }
    with open(os.path.join(ROOT, "data", "argentina", "meta.json"), "w",
              encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    print("wrote data/argentina/meta.json")


if __name__ == "__main__":
    main()
