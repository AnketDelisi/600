#!/usr/bin/env python3
"""Build the Italy FPTP map layer (147 single-member districts) + config map2.

Geometry: the official geographic base of the current electoral colleges
(riformeistituzionali.gov.it, decreto legislativo 177/2020), Camera
uninominali layer (147 polygons, codes CU20_COD / names "Circoscrizione -
Uxx"). Baselines: each district inherits its region's 2022 party shares
(district-level party data is not published; the map's projection is
therefore uniform within a region) — the actual 2022 district winners are
taken from the elected-members table on it.wikipedia (Ministry of the
Interior data) and stored as winners2021 so the result view is exact.

Writes img/italy_fptp.svg, data/italy/constituencies.json and patches the
italy block in js/config.js (constituencies flag + map2).

Usage: python scraper/build_italy_fptp.py [--force]
"""
import json
import os
import re
import sys
import urllib.request

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "italy_fptp.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "italy_fptp.svg")
CONST_JSON = os.path.join(ROOT, "data", "italy", "constituencies.json")
SHP_URL = ("https://www.riformeistituzionali.gov.it/media/1431/"
           "collegi_elettorali_basigeografiche.zip")
SHP_NAME = ("CAMERA_CollegiUNINOMINALI_2020/"
            "CAMERA_CollegiUNINOMINALI_2020.shp")
DEPUTIES_URL = ("https://it.wikipedia.org/wiki/"
                "Deputati_della_XIX_legislatura_della_Repubblica_Italiana")
ATTRIBUTION = ("Geometria: basi geografiche dei collegi elettorali "
               "(d.lgs. 177/2020, riformeistituzionali.gov.it); Risultati: "
               "Ministero dell'Interno (elezioni 2022, via it.wikipedia)")

PARTIES = ["fdi", "pd", "m5s", "lega", "fi", "a", "iv", "avs", "e", "nm", "fn"]

# winning party name (group column) -> config party key
GROUP_KEY = {
    "fratelli d'italia": "fdi",
    "lega per salvini premier": "lega",
    "forza italia": "fi",
    "partito democratico": "pd",
    "movimento 5 stelle": "m5s",
    "alleanza verdi e sinistra": "avs",
    "+europa": "e",
    "noi moderati": "nm",
    "azione": "a",
    "italia viva": "iv",
}
# circoscrizione name -> region key (normalized via norm_circ)
CIRC_REGION = {
    "piemonte 1": "piemonte", "piemonte 2": "piemonte",
    "lombardia 1": "lombardia", "lombardia 2": "lombardia",
    "lombardia 3": "lombardia", "lombardia 4": "lombardia",
    "veneto 1": "veneto", "veneto 2": "veneto",
    "friuli-venezia giulia": "friuli_venezia_giulia", "liguria": "liguria",
    "emilia-romagna": "emilia_romagna", "toscana": "toscana",
    "umbria": "umbria", "marche": "marche", "lazio 1": "lazio",
    "lazio 2": "lazio", "abruzzo": "abruzzo", "molise": "molise",
    "campania 1": "campania", "campania 2": "campania", "puglia": "puglia",
    "basilicata": "basilicata", "calabria": "calabria",
    "sicilia 1": "sicilia", "sicilia 2": "sicilia", "sardegna": "sardegna",
    "trentino-alto adige": "trentino_alto_adige",
    "valle d'aosta": "valle_d_aosta",
}


def norm_circ(s):
    return (s or "").split("/")[0].strip().lower()


def group_key(txt):
    t = re.sub(r"\[[^\]]*\]", "", txt or "")
    t = re.sub(r"\([^)]*\)", "", t).strip().lower()
    for name, key in GROUP_KEY.items():
        if t.startswith(name):
            return key
    return "other"


def read_config_gebiete():
    """Region party shares from the italy block in js/config.js."""
    text = open(os.path.join(ROOT, "js", "config.js"),
                encoding="utf8").read()
    start = text.index("\n  italy: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start() if m else text.index(
        "\n};\n\n// ===== Active country")
    block = text[start:end]
    g = re.search(r"gebiete:\s*\{", block)
    depth, k = 0, g.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    return json.loads(block[g.end() - 1:k + 1])


def fetch_winners(force=False):
    path = os.path.join(CACHE, "it_deputati_xix.html")
    if force or not os.path.isfile(path):
        r = requests.get(DEPUTIES_URL, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=120)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    soup = BeautifulSoup(open(path, encoding="utf8").read(), "lxml")
    winners = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 100:
            continue
        hdr = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Collegio uninominale" not in hdr:
            continue
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 5:
                continue
            circ, unicol = cells[1], cells[3]
            if circ == "Estero" or unicol == "Proporzionale":
                continue
            group = cells[6] if len(cells) > 6 else ""
            m = re.match(r"(\d+)\s*[-–]\s*", unicol)
            if m:
                key = "%s - U%02d" % (norm_circ(circ), int(m.group(1)))
            elif norm_circ(circ) == "valle d'aosta":
                key = "valle d'aosta - U01"
            else:
                continue
            winners[key] = group_key(group) if group else "other"
    return winners


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    gebiete = read_config_gebiete()
    winners = fetch_winners(force)
    print("FPTP winners parsed:", len(winners))

    # geometry: official Camera uninominali shapefile -> SVG
    zip_path = os.path.join(CACHE, "it_collegi.zip")
    bm.fetch_bytes(SHP_URL, "it_collegi.zip")
    shp_path = bm.extract(zip_path, SHP_NAME)
    _, recs = bm.read_dbf(shp_path[:-4] + ".dbf")
    name_by_code = {r["CU20_COD"]: r["CU20_DEN"] for r in recs}
    print("shapefile districts:", len(name_by_code))
    sys.argv = ["build_map_svg.py", "--zip", SHP_URL, "--shp", SHP_NAME,
                "--id-field", "CU20_COD", "--name-field", "CU20_DEN",
                "--attr", "id", "--no-prefix", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # districts from the shapefile -> region baselines + 2022 winners
    cons = []
    missing_win = []
    for cid in sorted(name_by_code):
        name = name_by_code[cid]
        parts = name.rsplit(" - ", 1)
        circ = norm_circ(parts[0]) if len(parts) == 2 else name
        region = CIRC_REGION.get(circ)
        if not region:
            print("  no region for", name)
            continue
        w = winners.get("%s - %s" % (circ, parts[1].upper())
                        if len(parts) == 2 else name)
        if not w:
            missing_win.append(name)
        cons.append({"id": cid, "name": name, "seats": 1,
                     "region": region,
                     "results_2022": {p: gebiete[region].get(p, 0)
                                      for p in PARTIES},
                     "winner_2022": w or "other"})
    print("constituencies:", len(cons), "| without winner:", missing_win[:6])
    assert len(cons) == 147, "expected 147 districts"
    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "italy", "total_seats": 400,
                   "constituency_seats": 147, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    # patch config: constituencies flag + map2 layer with the 2022 winners
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  italy: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]
    if "constituencies: true" not in block:
        block = block.replace(
            "    constituencies: false,",
            "    constituencies: true,         // 147 FPTP districts "
            "(single-member)\n    constituencyRule: 'fptp',\n"
            "    hideConstituencyTable: true,")
    map2 = {"svg": "img/italy_fptp.svg", "selector": "id",
            "districts": {c["id"]: c["id"] for c in cons},
            "winners2021": {c["id"]: c["winner_2022"] for c in cons},
            "useConstituencies": True,
            "label": "FPTP districts (147)"}
    mm = re.search(r"\n\s+map: \{", block)
    depth, k = 0, mm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    m2 = re.search(r"\n\s+map2: \{", block)
    if m2:
        depth, k2 = 0, m2.end() - 1
        while k2 < len(block):
            if block[k2] == "{":
                depth += 1
            elif block[k2] == "}":
                depth -= 1
                if depth == 0:
                    break
            k2 += 1
        block = block[:m2.start()] + "\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k2 + 1:]
    else:
        block = block[:k + 1] + ",\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k + 1:]
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (italy constituencies + map2)")


if __name__ == "__main__":
    main()
