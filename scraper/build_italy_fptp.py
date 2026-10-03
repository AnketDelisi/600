#!/usr/bin/env python3
"""Build the Italy FPTP map layer (147 single-member districts) + config map2.

Geometry: the official geographic base of the current electoral colleges
(riformeistituzionali.gov.it, decreto legislativo 177/2020), Camera
uninominali layer (147 polygons, codes CU20_COD / names "Circoscrizione -
Uxx"). Baselines: the 2022 party-level list votes per college from the
it.wikipedia per-college articles ("Collegio uninominale <Circ> - NN
(Camera dei deputati 2020)", Ministry of the Interior data); the actual
2022 winners come from the elected-members table and are stored as
winners2021 so the result view is exact.

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
COMBINED_SHP = os.path.join(CACHE, "it_fptp_trimmed.geojson")
# Drop the Pelagie (Lampedusa/Linosa, UTM32N northing < 4.0M ~ 36.0N): they
# are invisible at this scale but stretch the map's bounding box ~12% south.
MIN_Y = 4000000.0
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
    raw = re.sub(r"\[[^\]]*\]", "", txt or "")
    t = re.sub(r"\([^)]*\)", "", raw).strip().lower()
    # Mixed-group winners keep their component in parentheses: the +Europa
    # component is a modelled party (e), the rest (SVP/UV/ScN/MA/èViva) is not
    if "europa" in t and "viva" not in raw.lower():
        return "e"
    for name, key in GROUP_KEY.items():
        if t.startswith(name):
            return key
    return "other"


def list_key(txt):
    """2022 supporting-list name -> config party key (None = unmodelled)."""
    u = re.sub(r"\[[^\]]*\]", "", txt or "").upper()
    if "FRATELLI D'ITALIA" in u:
        return "fdi"
    if "LEGA" in u:
        return "lega"
    if "FORZA ITALIA" in u:
        return "fi"
    if "NOI MODERAT" in u:
        return "nm"
    if "PARTITO DEMOCRATICO" in u:
        return "pd"
    if "VERDI E SINISTRA" in u:
        return "avs"
    if "+EUROPA" in u:
        return "e"
    if "MOVIMENTO 5 STELLE" in u:
        return "m5s"
    return None


def parse_int(txt):
    digits = re.sub(r"[^\d]", "", txt or "")
    return int(digits) if digits else None


def fetch_collegio(circ, u_num, force=False):
    """Party shares of one college from its it.wikipedia article.

    Title formats differ: named circoscrizioni use "(Camera dei deputati
    2020)", numbered ones (Piemonte 1, Lombardia 1, ...) use "(2020)".
    """
    name = "it_col_%s_%02d.html" % (norm_circ(circ).replace(" ", "_"), u_num)
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        base = "Collegio_uninominale_%s_-_%02d" % (circ, u_num)
        for suffix in ["_%28Camera_dei_deputati_2020%29",
                       "_%282020%29"]:
            r = requests.get("https://it.wikipedia.org/wiki/" + base + suffix,
                             headers={"User-Agent": "Mozilla/5.0"},
                             timeout=90)
            if r.status_code == 200:
                open(path, "wb").write(r.content)
                break
        else:
            return None
    soup = BeautifulSoup(open(path, encoding="utf8").read(), "lxml")
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if not rows:
            continue
        hdr = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Candidati" not in hdr or "Liste" not in hdr:
            continue
        votes, total = {}, 0
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            cells = [c for c in cells if c]
            if len(cells) >= 6:
                lst, v = cells[3], cells[4]
            elif len(cells) == 3:
                lst, v = cells[0], cells[1]
            else:
                continue
            low = lst.lower()
            if lst.startswith("↳") or any(w in low for w in
                                          ("totale", "schede", "votanti",
                                           "elettori", "valid")):
                continue
            n = parse_int(v)
            if n is None:
                continue
            total += n
            key = list_key(lst)
            if "AZIONE" in lst.upper() and "ITALIA VIVA" in lst.upper():
                votes["a"] = votes.get("a", 0) + n * 12 / 21
                votes["iv"] = votes.get("iv", 0) + n * 9 / 21
            elif key:
                votes[key] = votes.get(key, 0) + n
        if total > 0:
            return {p: round(votes.get(p, 0) * 100 / total, 2)
                    for p in PARTIES}
    return None


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
            winners[key] = {"party": group_key(group) if group else "other",
                            "coalition": cells[4]}
    return winners


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    gebiete = read_config_gebiete()
    winners = fetch_winners(force)
    print("FPTP winners parsed:", len(winners))

    # geometry: official shapefile -> GeoJSON, dropping the Pelagie
    # (Lampedusa/Linosa, ~35.5-35.9N): invisible at this scale but they
    # stretch the map's bounding box ~12% south. Also used for the region
    # map (scraper/trim_italy_islands.py rebuilds img/italy.svg the same way).
    zip_path = os.path.join(CACHE, "it_collegi.zip")
    bm.fetch_bytes(SHP_URL, "it_collegi.zip")
    shp_path = bm.extract(zip_path, SHP_NAME)
    _, recs = bm.read_dbf(shp_path[:-4] + ".dbf")
    name_by_code = {r["CU20_COD"]: r["CU20_DEN"] for r in recs}
    print("shapefile districts:", len(name_by_code))
    feats = []
    for idx, rings in bm.read_shp(shp_path):
        kept = [r for r in rings if max(y for _, y in r) >= MIN_Y]
        if not kept:
            continue
        feats.append({"type": "Feature",
                      "properties": {"cid": recs[idx]["CU20_COD"]},
                      "geometry": {"type": "MultiPolygon",
                                   "coordinates": [[r] for r in kept]}})
    with open(COMBINED_SHP, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED_SHP,
                "--name-field", "cid", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # districts from the shapefile -> per-college 2022 shares + winners
    cons = []
    missing_win = []
    missing_shares = []
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
        shares = None
        if len(parts) == 2:
            m = re.match(r"U(\d+)", parts[1])
            if m:
                # no 2020 per-college article exists for the Valle d'Aosta
                # (the regional lists ran there); its region baseline is used
                shares = fetch_collegio(parts[0].split("/")[0].strip(),
                                        int(m.group(1)), force)
        if shares is None:
            missing_shares.append(name)
            shares = {p: gebiete[region].get(p, 0) for p in PARTIES}
        # Winner = the deputy's parliamentary group; a Mixed-group winner
        # elected on a coalition list falls back to that coalition's leading
        # party in the district (e.g. an unaffiliated CDX winner -> FdI).
        winner = w["party"] if w else "other"
        if w and winner == "other" and w["coalition"] in (
                "Centro-destra", "Centro-sinistra"):
            bloc = (["fdi", "lega", "fi", "nm"]
                    if w["coalition"] == "Centro-destra"
                    else ["pd", "avs", "e"])
            winner = max(bloc, key=lambda p: shares.get(p, 0))
        cons.append({"id": cid, "name": name, "seats": 1,
                     "region": region,
                     "results_2022": shares,
                     "winner_2022": winner})
    print("constituencies:", len(cons), "| without winner:", missing_win[:6],
          "| without per-college shares:", len(missing_shares),
          missing_shares[:6])
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
