#!/usr/bin/env python3
"""Build the Moldova map (37 districts) + the md config block.

National closed-list PR: 101 seats, D'Hondt, 5% threshold. The map carries
the 2025 per-district result (PAS / BEP / Alternative / PN / PPDA, from the
en.wikipedia results-by-administrative-unit table) so the projection can
color each district by its swung winner; the 2025 blocs' successors inherit
the geography through swingProxy (BEP -> PSRM/PCRM, Alternative ->
MAN/PDCM/PRIM). Bender's shape has no row of its own in the table; it takes
the Left Bank row (its city sits on the left bank).

Writes img/moldova.svg and inserts the md block into js/config.js.

Usage: python scraper/build_moldova_districts.py [--force]
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
OUT_SVG = os.path.join(ROOT, "img", "moldova.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "moldova.svg")
GEOJSON = os.path.join(CACHE, "md_raions.geojson")
GEO_URL = "https://www.geoboundaries.org/api/current/gbOpen/MDA/ADM1/"
ARTICLE = os.path.join(CACHE, "md2025_article.html")
ARTICLE_URL = ("https://en.wikipedia.org/wiki/"
               "2025_Moldovan_parliamentary_election")
ATTRIBUTION = ("Rezultate: CEC (2025, via en.wikipedia); "
               "Geometrie: geoBoundaries.org")

# table unit -> config key (the map has 37 shapes; the table 36 rows + Bender)
NAMES = {
    "Chisinau": "chisinau", "Balti": "balti", "Gagauzia": "gagauzia",
    "Transnistria": "transnistria", "Bender": "bender",
    "Anenii Noi": "anenii_noi", "Basarabeasca": "basarabeasca",
    "Briceni": "briceni", "Cahul": "cahul", "Cantemir": "cantemir",
    "Calarasi": "calarasi", "Causeni": "causeni", "Cimislia": "cimislia",
    "Criuleni": "criuleni", "Donduseni": "donduseni", "Drochia": "drochia",
    "Dubasari": "dubasari", "Edinet": "edinet", "Falesti": "falesti",
    "Floresti": "floresti", "Glodeni": "glodeni", "Hincesti": "hincesti",
    "Ialoveni": "ialoveni", "Leova": "leova", "Nisporeni": "nisporeni",
    "Ocnita": "ocnita", "Orhei": "orhei", "Rezina": "rezina",
    "RIscani": "riscani", "SIngerei": "singerei", "Soroca": "soroca",
    "Straseni": "straseni", "Soldanesti": "soldanesti",
    "Stefan Voda": "stefan_voda", "Taraclia": "taraclia",
    "Telenesti": "telenesti", "Ungheni": "ungheni",
}
# table row label -> config key
ROWS = {
    "chisinau municipality": "chisinau",
    "balti municipality": "balti",
    "anenii noi": "anenii_noi", "basarabeasca": "basarabeasca",
    "briceni": "briceni", "cahul": "cahul", "cantemir": "cantemir",
    "calarasi": "calarasi", "causeni": "causeni", "cimislia": "cimislia",
    "criuleni": "criuleni", "donduseni": "donduseni", "drochia": "drochia",
    "dubasari": "dubasari", "edinet": "edinet", "falesti": "falesti",
    "floresti": "floresti", "glodeni": "glodeni", "hincesti": "hincesti",
    "ialoveni": "ialoveni", "leova": "leova", "nisporeni": "nisporeni",
    "ocnita": "ocnita", "orhei": "orhei", "rezina": "rezina",
    "riscani": "riscani", "singerei": "singerei", "soroca": "soroca",
    "straseni": "straseni", "soldanesti": "soldanesti",
    "stefan voda": "stefan_voda", "taraclia": "taraclia",
    "telenesti": "telenesti", "ungheni": "ungheni",
    "uta gagauzia": "gagauzia", "left bank of the dni": "transnistria",
}
DISPLAY = {
    "chisinau": "Chi\u0219in\u0103u", "balti": "B\u0103l\u021bi",
    "gagauzia": "UTA Gagauzia", "transnistria": "Left Bank",
    "bender": "Bender",
}
PARTIES = ["pas", "bep", "ba", "pn", "ppda"]


def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = s.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


NAMES_NORM = {norm(k): v for k, v in NAMES.items()}
ROWS_NORM = {norm(k): v for k, v in ROWS.items()}


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, encoding="utf8").read()


def load_geo(force=False):
    if force or not os.path.isfile(GEOJSON):
        api = json.loads(fetch(GEO_URL, "md_geo_api.json", force))
        dl = api.get("gjDownloadURL") or api.get("simplifiedGeometryGeoJSON")
        r = requests.get(dl, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(GEOJSON, "wb").write(r.content)
    return json.loads(open(GEOJSON, encoding="utf8").read())


def parse_districts(html):
    """2025 per-unit shares from the results-by-administrative-units table."""
    soup = BeautifulSoup(html, "lxml")
    out = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if not rows:
            continue
        hdr = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Territorial unit" not in hdr or "PAS" not in hdr:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 8:
                continue
            label = cells[0]
            if label.startswith("\u21b3") or label.lower() in (
                    "total", "diaspora"):
                continue
            key = ROWS_NORM.get(norm(label))
            if not key and norm(label).startswith("leftbank"):
                key = "transnistria"
            if not key:
                continue
            vals = []
            for c in cells[3:8]:
                m = re.match(r"(\d+(?:\.\d+)?)", c)
                vals.append(float(m.group(1)) if m else 0.0)
            om = re.match(r"(\d+(?:\.\d+)?)", cells[8]) if len(cells) > 8 \
                else None
            others = float(om.group(1)) if om else 0.0
            assert abs(sum(vals) + others - 100) <= 1.0, \
                f"{label}: parsed {vals} + others {others}"
            out[key] = dict(zip(PARTIES, vals))
    return out


def main():
    force = "--force" in sys.argv
    geo = load_geo(force)

    # shapeName -> key (via the ASCII-folded map)
    names, missing = {}, []
    for f in geo["features"]:
        shape = f["properties"].get("shapeName") or ""
        key = NAMES.get(shape) or NAMES_NORM.get(norm(shape))
        if key:
            names[shape] = key
        else:
            missing.append(shape)
    assert not missing, f"unmapped shapes: {missing}"
    assert len(set(names.values())) == 37, \
        f"expected 37 districts, got {len(set(names.values()))}"

    html = fetch(ARTICLE_URL, "md2025_article.html", force)
    units = parse_districts(html)
    print("districts with 2025 data:", len(units))
    # Bender has no row of its own: its city sits on the left bank
    units.setdefault("bender", dict(units["transnistria"]))

    keys = sorted(names.values())
    gebiete = {k: units[k] for k in keys}
    assert all(len(gebiete[k]) == len(PARTIES) for k in keys)

    name_map_path = os.path.join(CACHE, "md_name_map.json")
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
    NATIONAL = {"pas": 50.2, "bep": 24.2, "ba": 7.96, "pn": 6.2, "ppda": 5.62}
    RESULTS = {"pas": 50.2, "psrm": 0, "pcrm": 0, "pvm": 0, "prim": 0,
               "man": 0, "pdcm": 0, "pacc": 0, "pn": 6.2, "ppda": 5.62,
               "psde": 0.95, "bep": 24.2, "ba": 7.96}
    SEATS = {"pas": 55, "psrm": 0, "pcrm": 0, "pvm": 0, "prim": 0, "man": 0,
             "pdcm": 0, "pacc": 0, "pn": 6, "ppda": 6, "psde": 0,
             "bep": 26, "ba": 8}
    display = {k: DISPLAY.get(k, k.replace("_", " ").title()) for k in keys}

    block = f"""  md: {{
    name: 'Moldova',
    seats: 101,
    threshold: 5.0,
    method: 'dhondt',             // national closed-list PR, D'Hondt
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    defaultDays: 2026,            // sparse source: quarterly polls since 2025
    parties: {{
      pas:  {{ code: 'PAS',  name: 'Partidul Acțiune și Solidaritate', name_en: 'Party of Action and Solidarity', color: '#FFDD00' }},
      psrm: {{ code: 'PSRM', name: 'Partidul Socialiștilor din Republica Moldova', name_en: 'Party of Socialists of the Republic of Moldova', color: '#9C162E' }},
      pcrm: {{ code: 'PCRM', name: 'Partidul Comuniștilor din Republica Moldova', name_en: 'Party of Communists of the Republic of Moldova', color: '#C00302' }},
      pvm:  {{ code: 'PVM',  name: 'Partidul Viitorul Moldovei', name_en: 'Future of Moldova Party', color: '#FF7900' }},
      prim: {{ code: 'PRIM', name: 'Partidul Inima Moldovei', name_en: 'Heart of Moldova Party', color: '#0046AE' }},
      man:  {{ code: 'MAN',  name: 'Mișcarea Alternativa Națională', name_en: 'National Alternative Movement', color: '#0F7B61' }},
      pdcm: {{ code: 'PDCM', name: 'Partidul Dezvoltării și Consolidării Moldovei', name_en: 'Party of Development and Consolidation of Moldova', color: '#71004B' }},
      pacc: {{ code: 'PAC–CC', name: 'Partidul Acțiunea Comună – Congresul Civic', name_en: 'Common Action Party – Civil Congress', color: '#EF7F1A' }},
      pn:   {{ code: 'PN',   name: 'Partidul Nostru', name_en: 'Our Party', color: '#2680FA' }},
      ppda: {{ code: 'PPDA', name: 'Partidul Democrația Acasă', name_en: 'Democracy at Home Party', color: '#24247A' }},
      psde: {{ code: 'PSDE', name: 'Partidul Social Democrat European', name_en: 'European Social Democratic Party', color: '#D93029' }},
      bep:  {{ code: 'BEP',  name: 'Blocul Electoral Patriotic', name_en: 'Patriotic Electoral Bloc', color: '#BA1906', pastOnly: true }},
      ba:   {{ code: 'BA',   name: 'Blocul Alternativ', name_en: 'Alternative Bloc', color: '#026D59', pastOnly: true }},
    }},
    order: ['pas', 'psrm', 'pcrm', 'pvm', 'prim', 'man', 'pdcm', 'pacc', 'pn', 'ppda', 'psde', 'bep', 'ba'],
    parlOrder: ['pcrm', 'psrm', 'bep', 'pdcm', 'psde', 'pacc', 'pas', 'ppda', 'prim', 'man', 'ba', 'pn'],
    lastElection: {{
      date: '2025-09-28',
      // the 2025 blocs: BEP (PSRM/PCRM) and Alternative (MAN/PDCM/PRIM);
      // both dissolved, the components run separately in the polls
      results: {j(RESULTS, ensure_ascii=False)},
      seats: {j(SEATS, ensure_ascii=False)},
    }},
    map: {{
      svg: 'img/moldova.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the 5% threshold is national, not per district
      districtThreshold: false,
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j(display, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(NATIONAL, ensure_ascii=False)},
      // the dissolved blocs' successors inherit the bloc geography
      swingProxy: {{ psrm: 'bep', pcrm: 'bep', man: 'ba', pdcm: 'ba', prim: 'ba' }},
    }},
    pollsterMAE: {{}},
    maeKey: 'MD2029',
    logos: {{
      pas: 'img/md/PAS.svg', psrm: 'img/md/PSRM.svg', pcrm: 'img/md/PCRM.svg',
      pvm: 'img/md/PVM.svg', prim: 'img/md/PRIM.svg', man: 'img/md/MAN.svg',
      pdcm: 'img/md/PDCM.svg', pacc: 'img/md/PACCC.svg', pn: 'img/md/PN.svg',
      ppda: 'img/md/PPDA.svg', psde: 'img/md/PSDE.svg',
    }},
  }},
"""
    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    assert "\n  md: {" not in text, "md block already present"
    anchor = "\n  pt: {"
    assert anchor in text
    text = text.replace(anchor, "\n" + block.rstrip("\n") + anchor, 1)
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8").write(text)
    print("inserted md block before pt")


if __name__ == "__main__":
    main()
