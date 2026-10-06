#!/usr/bin/env python3
"""Build the Portugal district map + config block.

230 seats in 22 multi-member districts (18 mainland districts + Azores +
Madeira), closed-list D'Hondt per district, no legal threshold. Baselines:
the 2025 legislative election per-district party shares and seat counts
from the en.wikipedia results-by-constituency table. Geometry:
geoBoundaries PRT ADM1. Party colors: en.wikipedia (Module:Political
party); logos: img/pt/*.svg (user-prepared).

Writes img/portugal.svg, data/pt/districts.json and patches the pt block
into js/config.js.

Usage: python scraper/build_portugal_districts.py [--force]
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
from scrape_spain import expand_grid


def shift_coords(c, dlon, dlat):
    if isinstance(c[0], (int, float)):
        return [c[0] + dlon, c[1] + dlat]
    return [shift_coords(x, dlon, dlat) for x in c]

# Azores and Madeira are shifted towards the mainland (standard cartographic
# inset practice) so the map does not waste space on the Atlantic gap
ISLAND_SHIFT = {"azores": (15.4, -0.6), "madeira": (6.4, 3.6)}

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "portugal.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "portugal.svg")
DIST_JSON = os.path.join(ROOT, "data", "pt", "districts.json")
GEOJSON = os.path.join(CACHE, "pt_districts.geojson")
ARTICLE = "https://en.wikipedia.org/wiki/2025_Portuguese_legislative_election"
GEO_URL = ("https://www.geoboundaries.org/api/current/gbOpen/PRT/ADM1/")
ATTRIBUTION = ("Resultados: Ministério da Administração Interna "
               "(legislativas 2025, via en.wikipedia); Geometria: "
               "geoBoundaries.org")

# geoBoundaries shapeName -> district key
SHAPE = {
    "Aveiro": "aveiro", "Beja": "beja", "Braga": "braga",
    "Bragança": "braganca", "Castelo Branco": "castelo_branco",
    "Coimbra": "coimbra", "Évora": "evora", "Faro": "faro",
    "Guarda": "guarda", "Leiria": "leiria", "Lisboa": "lisboa",
    "Portalegre": "portalegre", "Porto": "porto", "Santarém": "santarem",
    "Setúbal": "setubal", "Viana do Castelo": "viana_do_castelo",
    "Vila Real": "vila_real", "Viseu": "viseu", "Açores": "azores",
    "Azores": "azores", "Madeira": "madeira",
    "Região Autónoma da Madeira": "madeira",
    "Região Autónoma dos Açores": "azores",
}
# constituency name in the article -> district key
CONST = {
    "Azores": "azores", "Aveiro": "aveiro", "Beja": "beja",
    "Braga": "braga", "Bragança": "braganca",
    "Castelo Branco": "castelo_branco", "Coimbra": "coimbra",
    "Évora": "evora", "Faro": "faro", "Guarda": "guarda",
    "Leiria": "leiria", "Lisbon": "lisboa", "Portalegre": "portalegre",
    "Porto": "porto", "Santarém": "santarem", "Setúbal": "setubal",
    "Viana do Castelo": "viana_do_castelo", "Vila Real": "vila_real",
    "Viseu": "viseu", "Madeira": "madeira",
    "Europe": "europe", "Outside Europe": "outside_europe",
}
PARTIES = ["ad", "ps", "ch", "il", "livre", "cdu", "be", "pan", "jpp"]
# 2025 national result (Assembly of the Republic, official totals)
NATIONAL = {"ad": 31.78, "ps": 22.83, "ch": 22.76, "il": 5.36,
            "livre": 4.07, "cdu": 2.91, "be": 1.99, "pan": 1.38,
            "jpp": 0.33}
SEATS_2025 = {"ad": 91, "ps": 58, "ch": 60, "il": 9, "cdu": 3, "be": 1,
              "livre": 6, "pan": 1, "jpp": 1}


def fix(s):
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def norm(s):
    s = unicodedata.normalize("NFKD", fix(s))
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z]", "", s).upper()


SHAPE_NORM = {norm(k): v for k, v in SHAPE.items()}


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
    m = re.match(r"(\d+(?:\.\d+)?)", (s or "").strip())
    return float(m.group(1)) if m else None


def parse_2025(html):
    soup = BeautifulSoup(html, "lxml")
    districts = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 20:
            continue
        grid, metas = expand_grid(t)
        # party header row (constituency cell is rowspan'd above): the cells
        # span two columns each (share, seats)
        party_row = None
        for ri, row in enumerate(grid[:3]):
            names = [c.split(" ")[0].strip("[] ") for c in row]
            uniq = [n for i, n in enumerate(names)
                    if i == 0 or n != names[i - 1]]
            if "AD" in uniq[:3] and "CH" in uniq[:4] and "PS" in uniq[:5]:
                party_row = ri
                break
        if party_row is None:
            continue
        pmap = []
        for col, span, txt in metas[party_row]:
            nm = txt.split(" ")[0].strip("[] ")
            key = {"ad": "ad", "ch": "ch", "ps": "ps", "il": "il",
                   "l": "livre", "cdu": "cdu", "be": "be", "pan": "pan",
                   "jpp": "jpp"}.get(nm.lower())
            if key:
                pmap.append((col, key))
        if len(pmap) < 5:
            continue
        for ri in range(party_row + 1, len(grid)):
            row = grid[ri]
            if not row:
                continue
            name = row[0]
            key = CONST.get(name)
            if not key:
                continue
            shares, seats = {}, {}
            for col, pk in pmap:
                share = num(row[col]) if col < len(row) else None
                seat = num(row[col + 1]) if col + 1 < len(row) else None
                if share is not None:
                    shares[pk] = round(share, 2)
                seats[pk] = int(seat) if seat else 0
            districts[key] = {"shares": shares, "seats": seats}
        break
    return districts


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)

    gj = json.loads(fetch(GEO_URL, "pt_adm1_meta.json", force))
    geojson_url = gj["gjDownloadURL"]
    geo = json.loads(fetch(geojson_url, "pt_districts.geojson", force,
                           binary=True))
    print("features:", len(geo["features"]))
    names = {}
    for f in geo["features"]:
        shape = f["properties"].get("shapeName", "")
        key = SHAPE_NORM.get(norm(shape))
        if not key:
            print("unmapped shape:", repr(shape))
            continue
        names[shape] = key
    assert len(set(names.values())) == 20, \
        f"expected 20 districts, got {len(set(names.values()))}"

    # shift the island groups towards the mainland and write the processed
    # geojson for the SVG builder
    feats = []
    for f in geo["features"]:
        key = names.get(f["properties"].get("shapeName", ""))
        geom = f["geometry"]
        if key in ISLAND_SHIFT:
            dlon, dlat = ISLAND_SHIFT[key]
            geom = {"type": geom["type"],
                    "coordinates": shift_coords(geom["coordinates"],
                                                dlon, dlat)}
        feats.append({"type": "Feature",
                      "properties": f["properties"],
                      "geometry": geom})
    shifted_path = os.path.join(CACHE, "pt_shifted.geojson")
    with open(shifted_path, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    GEOJSON_SHIFTED = shifted_path

    dists = parse_2025(fetch(ARTICLE, "pt_2025_article.html", force))
    print("districts with 2025 results:", len(dists),
          "| missing:", sorted(set(names.values()) - set(dists)))
    mags = {k: sum(v["seats"].values()) for k, v in dists.items()}
    print("seat magnitudes:", mags, "| total:", sum(mags.values()))
    gebiete = {k: v["shares"] for k, v in dists.items()}
    seat_districts = {k: mags[k] for k in dists}
    # regional party: JPP contests Madeira (and a few others) - pin where it
    # had no 2025 presence
    no_candidate = {}
    for k, v in gebiete.items():
        if (v.get("jpp") or 0) <= 0.01:
            no_candidate[k] = ["jpp"]
    print("districts without JPP:", len(no_candidate))

    os.makedirs(os.path.dirname(DIST_JSON), exist_ok=True)
    with open(DIST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "pt", "total_seats": 230,
                   "districts": dists}, fh, ensure_ascii=False, indent=1)

    name_map_path = os.path.join(CACHE, "pt_name_map.json")
    with open(name_map_path, "w", encoding="utf8") as fh:
        json.dump(names, fh, ensure_ascii=False)
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON_SHIFTED,
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
    block = f"""  pt: {{
    name: 'Portugal',
    seats: 230,
    threshold: 0,
    method: 'dhondt',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {{
      ad:    {{ code: 'AD',    name: 'Aliança Democrática', name_en: 'Democratic Alliance', color: '#3777BC' }},
      ps:    {{ code: 'PS',    name: 'Partido Socialista', name_en: 'Socialist Party (Portugal)', color: '#FF66FF' }},
      ch:    {{ code: 'CH',    name: 'Chega', name_en: 'Chega', color: '#222256' }},
      il:    {{ code: 'IL',    name: 'Iniciativa Liberal', name_en: 'Liberal Initiative', color: '#00ADEF' }},
      livre: {{ code: 'L',     name: 'LIVRE', name_en: 'LIVRE', color: '#C2D216' }},
      cdu:   {{ code: 'CDU',   name: 'CDU (PCP-PEV)', name_en: 'Unitary Democratic Coalition', color: '#FF0000' }},
      be:    {{ code: 'BE',    name: 'Bloco de Esquerda', name_en: 'Left Bloc', color: '#8B0000' }},
      pan:   {{ code: 'PAN',   name: 'Pessoas–Animais–Natureza', name_en: 'People Animals Nature', color: '#008080' }},
      jpp:   {{ code: 'JPP',   name: 'Juntos Pelo Povo', name_en: 'Together for the People', color: '#00A28B' }},
    }},
    order: ['ad', 'ps', 'ch', 'il', 'livre', 'cdu', 'be', 'pan', 'jpp'],
    parlOrder: ['cdu', 'be', 'livre', 'pan', 'jpp', 'ps', 'ad', 'il', 'ch'],
    blocs: {{
      bloc1: {{ name: 'Government', short: 'GOV', parties: ['ad'], color: '#3777BC' }},
      bloc2: {{ name: 'Opposition', short: 'OPP', parties: ['ps', 'ch', 'il', 'livre', 'cdu', 'be', 'pan', 'jpp'], color: '#E63946' }},
    }},
    lastElection: {{
      date: '2025-05-18',
      results: {j(NATIONAL, ensure_ascii=False)},
      seats: {j(SEATS_2025, ensure_ascii=False)},
    }},
    map: {{
      svg: 'img/portugal.svg',
      selector: 'id',
      districtThreshold: false,
      districts: {j({k: k for k in dists}, ensure_ascii=False)},
      seatDistricts: {j(seat_districts, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(NATIONAL, ensure_ascii=False)},
      noCandidate: {j(no_candidate, ensure_ascii=False)},
    }},
    pollsterMAE: {{}},
    maeKey: 'PT2025',
    logos: {{
      ad: 'img/pt/AD.svg', ps: 'img/pt/PS.svg', ch: 'img/pt/CH.svg',
      il: 'img/pt/IL.svg', livre: 'img/pt/LIVRE.svg', cdu: 'img/pt/CDU.svg',
      be: 'img/pt/BE.svg', pan: 'img/pt/PAN.svg', jpp: 'img/pt/JPP.svg',
    }},
  }},
"""
    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  pt: \{", text)
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
        anchor = "\n  uk: {"
        text = text.replace(anchor, "\n" + block + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (pt block)")


if __name__ == "__main__":
    main()
