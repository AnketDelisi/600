#!/usr/bin/env python3
"""Build the Italy Senate FPTP map layer (74 single-member districts).

Same pipeline as build_italy_fptp.py (the Chamber's 147 colleges) on the
Senate layer of the same official shapefile: geometry from
riformeistituzionali.gov.it (d.lgs. 177/2020, SENATO_CollegiUNINOMINALI_2020),
baselines from the it.wikipedia per-college articles
("Collegio uninominale <Circ> - NN (2020)", Ministry of the Interior data),
winners from the XIX-legislature senators article stored as winners2021 so
the result view is exact.

Writes img/italy_senate.svg, data/italy/senate_constituencies.json and
patches the italy block in js/config.js with a `senate` map block.

Usage: python scraper/build_italy_senate.py [--force]
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "italy_senate.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "italy_senate.svg")
CONST_JSON = os.path.join(ROOT, "data", "italy", "senate_constituencies.json")
COMBINED_SHP = os.path.join(CACHE, "it_senate_trimmed.geojson")
MIN_Y = 4000000.0
SHP_URL = ("https://www.riformeistituzionali.gov.it/media/1431/"
           "collegi_elettorali_basigeografiche.zip")
SHP_NAME = ("SENATO_CollegiUNINOMINALI_2020/"
            "SENATO_CollegiUNINOMINALI_2020.shp")
SENATORS_URL = ("https://it.wikipedia.org/wiki/"
                "Senatori_della_XIX_legislatura_della_Repubblica_Italiana")
ATTRIBUTION = ("Geometria: basi geografiche dei collegi elettorali "
               "(d.lgs. 177/2020, riformeistituzionali.gov.it); Risultati: "
               "Ministero dell'Interno (elezioni 2022, via it.wikipedia)")

PARTIES = ["fdi", "pd", "m5s", "lega", "fi", "a", "iv", "avs", "e", "nm",
           "fn", "svp"]

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
CIRC_REGION = {
    # the Senate's circoscrizioni are the regions themselves (unlike the
    # Chamber's numbered Piemonte 1/2, Lombardia 1-4, ...)
    "piemonte": "piemonte",
    "lombardia": "lombardia",
    "veneto": "veneto",
    "friuli-venezia giulia": "friuli_venezia_giulia", "liguria": "liguria",
    "emilia-romagna": "emilia_romagna", "toscana": "toscana",
    "umbria": "umbria", "marche": "marche", "lazio": "lazio",
    "abruzzo": "abruzzo", "molise": "molise",
    "campania": "campania", "puglia": "puglia",
    "basilicata": "basilicata", "calabria": "calabria",
    "sicilia": "sicilia", "sardegna": "sardegna",
    "trentino-alto adige": "trentino_alto_adige",
    "valle d'aosta": "valle_d_aosta",
}


def norm_circ(s):
    return (s or "").split("/")[0].strip().lower()


def group_key(txt):
    raw = re.sub(r"\[[^\]]*\]", "", txt or "")
    t = re.sub(r"\([^)]*\)", "", raw).strip().lower()
    if "europa" in t and "viva" not in raw.lower():
        return "e"
    for name, key in GROUP_KEY.items():
        if t.startswith(name):
            return key
    return "other"


def list_key(txt):
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
    if "VOLKSPARTEI" in u or "SÜDTIROLER" in u:
        return "svp"
    return None


def parse_int(txt):
    digits = re.sub(r"[^\d]", "", txt or "")
    return int(digits) if digits else None


def fetch_collegio(circ, u_num, force=False):
    """Party shares of one Senate college from its it.wikipedia article."""
    name = "it_sen_%s_%02d.html" % (norm_circ(circ).replace(" ", "_"), u_num)
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        base = "Collegio_uninominale_%s_-_%02d" % (circ, u_num)
        for suffix in ["_(2020)", "_%28Senato_della_Repubblica_2020%29"]:
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
    path = os.path.join(CACHE, "it_senatori_xix.html")
    if force or not os.path.isfile(path):
        r = requests.get(SENATORS_URL, headers={"User-Agent": "Mozilla/5.0"},
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
        cols = [c.lower() for c in
                re.split(r"\s{2,}|\n", rows[0].get_text(" ", strip=True))]
        gi = next((i for i, c in enumerate(cols) if "gruppo" in c), 5)
        for tr in rows[1:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 5:
                continue
            circ, unicol = cells[1], cells[3]
            if circ == "Estero" or unicol == "Proporzionale":
                continue
            group = cells[gi] if len(cells) > gi else ""
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
    print("Senate FPTP winners parsed:", len(winners))

    zip_path = os.path.join(CACHE, "it_collegi.zip")
    bm.fetch_bytes(SHP_URL, "it_collegi.zip")
    shp_path = bm.extract(zip_path, SHP_NAME)
    _, recs = bm.read_dbf(shp_path[:-4] + ".dbf")
    name_by_code = {r["SU20_COD"]: r["SU20_DEN"] for r in recs}
    print("shapefile districts:", len(name_by_code))
    feats = []
    for idx, rings in bm.read_shp(shp_path):
        kept = [r for r in rings if max(y for _, y in r) >= MIN_Y]
        if not kept:
            continue
        feats.append({"type": "Feature",
                      "properties": {"cid": recs[idx]["SU20_COD"]},
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
                # the Valle d'Aosta Senate seat runs on regional lists
                shares = fetch_collegio(parts[0].split("/")[0].strip(),
                                        int(m.group(1)), force)
        if shares is None:
            missing_shares.append(name)
            shares = {p: gebiete[region].get(p, 0) for p in PARTIES}
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
    print("senate constituencies:", len(cons),
          "| without winner:", missing_win[:6],
          "| without per-college shares:", len(missing_shares),
          missing_shares[:6])
    assert len(cons) == 74, "expected 74 Senate districts"
    os.makedirs(os.path.dirname(CONST_JSON), exist_ok=True)
    with open(CONST_JSON, "w", encoding="utf8") as fh:
        json.dump({"country": "italy", "total_seats": 200,
                   "constituency_seats": 74, "leveling_seats": 0,
                   "constituencies": cons}, fh, ensure_ascii=False, indent=1)

    # national baseline: the official 2022 Senate national result (the
    # per-college mean undershoots by ~2.5pp because small colleges split
    # more), anchoring the swing
    nat = {"fdi": 26.00, "pd": 18.93, "m5s": 15.55, "lega": 8.84,
           "fi": 8.27, "a": 4.42, "iv": 3.31, "avs": 3.53, "e": 2.94,
           "nm": 0.90, "fn": 0, "svp": 0}

    # patch config: insert the senate map block before the upper block
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  italy: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]
    senate = {
        "svg": "img/italy_senate.svg", "selector": "id",
        "districts": {c["id"]: c["id"] for c in cons},
        "winners2021": {c["id"]: c["winner_2022"] for c in cons},
        "regionOf": {c["id"]: c["region"] for c in cons},
        "useConstituencies": True, "senateStore": True,
        "national2021": nat,
        "label": "Senate districts (74)",
    }
    j = json.dumps(senate, ensure_ascii=False, indent=6)
    j = j.replace("\n", "\n    ")
    newblock = block
    anchor = "\n    upper: { label: 'Senate'"
    assert anchor in newblock, "upper anchor not found"
    newblock = newblock.replace(
        anchor, "\n    // Senate's own 74 single-member districts (d.lgs.\n"
                "    // 177/2020) + 126 PR seats - built by\n"
                "    // scraper/build_italy_senate.py.\n"
                "    senate: " + j + "," + anchor)
    text = text[:start] + newblock + text[end:]
    open(cfg_path, "w", encoding="utf8", newline="").write(text)
    print("patched config: italy.senate (national baseline:",
          {k: nat[k] for k in ("fdi", "pd", "m5s", "lega", "fi")}, ")")


if __name__ == "__main__":
    main()
