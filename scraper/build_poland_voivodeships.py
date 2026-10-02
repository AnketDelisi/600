#!/usr/bin/env python3
"""Build the Polish voivodeship (16) map layer.

Results: official PKW 2023 Sejm per-voivodeship file
(wyniki_gl_na_listy_po_wojewodztwach_sejm_csv.zip, vote counts). The
config models the 2023 coalitions split into their components at fixed
national ratios (Trzecia Droga -> pl2050 + psl, Nowa Lewica -> lewica +
razem, Konfederacja -> kwin + kkp), so the same split is applied here.
Geometry: geoBoundaries POL ADM1 (16 voivodeships, English names).

Writes img/poland_voivodeships.svg and patches the poland block in
js/config.js with a map2 layer.

Usage: python scraper/build_poland_voivodeships.py [--force]
"""
import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
ZIP = os.path.join(ROOT, "scraper", ".cache", "pl_wojewodztwa_sejm.zip")
ZIP_URL = ("https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/data/csv/"
           "wyniki_gl_na_listy_po_wojewodztwach_sejm_csv.zip")
ZIP2 = os.path.join(ROOT, "scraper", ".cache", "pl_okregi_sejm.zip")
ZIP2_URL = ("https://sejmsenat2023.pkw.gov.pl/sejmsenat2023/data/csv/"
            "wyniki_gl_na_listy_po_okregach_sejm_csv.zip")
OUT_SVG = os.path.join(ROOT, "img", "poland_voivodeships.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "poland_voivodeships.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "pl_voivodeships.geojson")
ATTRIBUTION = ("Wyniki: PKW (Sejm 2023); Geometria: geoBoundaries.org "
               "(gbOpen)")

PARTIES = ["pis", "ko", "pl2050", "psl", "lewica", "razem", "kwin", "kkp",
           "r"]
# fixed component splits, matching the okreg-layer convention
SPLIT = {"td": {"pl2050": 7.2 / 13.1, "psl": 5.9 / 13.1},
         "lewica": {"lewica": 6.5 / 8.6, "razem": 2.1 / 8.6},
         "konf": {"kwin": 6.3 / 7.2, "kkp": 0.9 / 7.2}}
NAME_MAP = {
    "Lower Silesian Voivodeship": "dolnoslaskie",
    "Kuyavian-Pomeranian Voivodeship": "kujawsko_pomorskie",
    "Lublin Voivodeship": "lubelskie",
    "Lubusz Voivodeship": "lubuskie",
    "Łódź Voivodeship": "lodzkie",
    "Lesser Poland Voivodeship": "malopolskie",
    "Masovian Voivodeship": "mazowieckie",
    "Opole Voivodeship": "opolskie",
    "Subcarpathian Voivodeship": "podkarpackie",
    "Podlaskie Voivodeship": "podlaskie",
    "Pomeranian Voivodeship": "pomorskie",
    "Silesian Voivodeship": "slaskie",
    "Świętokrzyskie Voivodeship": "swietokrzyskie",
    "Warmian-Masurian Voivodeship": "warminsko_mazurskie",
    "Greater Poland Voivodeship": "wielkopolskie",
    "West Pomeranian Voivodeship": "zachodniopomorskie",
}
DISPLAY = {"dolnoslaskie": "Dolnośląskie", "kujawsko_pomorskie":
           "Kujawsko-Pomorskie", "lubelskie": "Lubelskie", "lubuskie":
           "Lubuskie", "lodzkie": "Łódzkie", "malopolskie": "Małopolskie",
           "mazowieckie": "Mazowieckie", "opolskie": "Opolskie",
           "podkarpackie": "Podkarpackie", "podlaskie": "Podlaskie",
           "pomorskie": "Pomorskie", "slaskie": "Śląskie", "swietokrzyskie":
           "Świętokrzyskie", "warminsko_mazurskie": "Warmińsko-Mazurskie",
           "wielkopolskie": "Wielkopolskie", "zachodniopomorskie":
           "Zachodniopomorskie"}


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(ZIP):
        req = urllib.request.Request(ZIP_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=180).read()
        with open(ZIP, "wb") as fh:
            fh.write(data)
        print("downloaded PKW csv:", len(data), "bytes")

    z = zipfile.ZipFile(ZIP)
    txt = z.read(z.namelist()[0]).decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(txt), delimiter=";"))
    hdr = rows[0]

    def col(needle):
        return next(i for i, h in enumerate(hdr) if needle in h)

    c_valid = col("Liczba głosów ważnych oddanych")
    c_bs = col("BEZPARTYJNI")
    c_td = col("TRZECIA DROGA")
    c_lew = col("NOWA LEWICA")
    c_pis = col("PRAWO I SPRAWIEDLIWOŚĆ")
    c_konf = col("KONFEDERACJA")
    c_ko = col("KOALICJA OBYWATELSKA")

    def num(s):
        return int(s.replace("\u00a0", "").replace(" ", "")) if s else 0

    gebiete, names = {}, {}
    v_votes, v_valid = {}, {}
    for r in rows[1:]:
        if not r or not r[0]:
            continue
        key = _slug(r[0])
        v = num(r[c_valid])
        votes = {}
        votes.update({"pis": num(r[c_pis]), "ko": num(r[c_ko])})
        for dst, factor in SPLIT["td"].items():
            votes[dst] = num(r[c_td]) * factor
        for dst, factor in SPLIT["lewica"].items():
            votes[dst] = num(r[c_lew]) * factor
        for dst, factor in SPLIT["konf"].items():
            votes[dst] = num(r[c_konf]) * factor
        votes["r"] = 0
        v_votes[key] = votes
        v_valid[key] = v
        names[key] = DISPLAY.get(key, r[0])

    # per-okreg official values for layer 1 (includes the abroad votes, which
    # the per-voivodeship file leaves out - fold their difference into
    # mazowieckie, home of okreg 19 Warszawa I)
    import build_poland_okregi as bp
    if force or not os.path.isfile(ZIP2):
        req = urllib.request.Request(ZIP2_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=180).read()
        with open(ZIP2, "wb") as fh:
            fh.write(data)
        print("downloaded PKW okregi csv:", len(data), "bytes")
    z2 = zipfile.ZipFile(ZIP2)
    txt2 = z2.read(z2.namelist()[0]).decode("utf-8-sig")
    rows2 = list(csv.reader(io.StringIO(txt2), delimiter=";"))
    okreg, nat_votes, nat_valid = {}, {}, 0
    for r in rows2[1:]:
        if not r or not r[0] or not r[0].isdigit():
            continue
        key = bp.IDS[int(r[0])]
        v = num(r[c_valid])
        votes = {"pis": num(r[c_pis]), "ko": num(r[c_ko])}
        for dst, factor in SPLIT["td"].items():
            votes[dst] = num(r[c_td]) * factor
        for dst, factor in SPLIT["lewica"].items():
            votes[dst] = num(r[c_lew]) * factor
        for dst, factor in SPLIT["konf"].items():
            votes[dst] = num(r[c_konf]) * factor
        votes["r"] = 0
        okreg[key] = {p: round(votes[p] * 100 / v, 2) for p in PARTIES}
        nat_valid += v
        for p, x in votes.items():
            nat_votes[p] = nat_votes.get(p, 0) + x
    national = {p: round(nat_votes[p] * 100 / nat_valid, 2) for p in PARTIES}
    print("okregi:", len(okreg), "| national:", national)

    # fold the abroad difference into mazowieckie so layer 2 sums to layer 1
    abroad = {p: nat_votes[p] - sum(v.get(p, 0) for v in v_votes.values())
              for p in PARTIES}
    print("abroad votes (folded into mazowieckie):",
          {p: int(abroad[p]) for p in PARTIES if abroad[p]})
    for p in PARTIES:
        v_votes["mazowieckie"][p] += abroad[p]
    v_valid["mazowieckie"] += sum(abroad.values())
    for key, votes in v_votes.items():
        gebiete[key] = {p: round(votes[p] * 100 / v_valid[key], 2)
                        for p in PARTIES}
    print("voivodeships:", len(gebiete))

    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/POL/ADM1/")
    features, matched = [], set()
    for f in gj["features"]:
        raw = f["properties"]["shapeName"]
        key = NAME_MAP.get(raw)
        if not key or key not in gebiete:
            print("  no mapping for", raw)
            continue
        matched.add(key)
        features.append({"type": "Feature", "properties": {"woj": key},
                         "geometry": f["geometry"]})
    print("features:", len(features), "| results without geometry:",
          sorted(set(gebiete) - matched))
    assert len(features) == 16, "expected 16 voivodeships"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "woj", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  poland: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]

    def replace(name, data, within=None):
        nonlocal block
        scope = block if within is None else within
        b = re.search(r"\n(\s+)%s: \{" % name, scope)
        indent = b.group(1)
        depth, k = 0, b.end() - 1
        while k < len(scope):
            if scope[k] == "{":
                depth += 1
            elif scope[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        body = json.dumps(data, ensure_ascii=False, indent=len(indent) + 2)
        body = body.replace("\n", "\n" + indent)
        new = (scope[:b.start()] + "\n" + indent + name + ": " + body +
               scope[k + 1:])
        if within is None:
            block = new
        else:
            block = block.replace(scope, new)

    # layer 1: official per-okreg gebiete + official national baselines
    replace("gebiete", okreg)
    replace("national2021", national)
    le = re.search(r"\n(\s+)lastElection: \{", block)
    depth, k = 0, le.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    replace("results", national, within=block[le.start():k + 1])

    map2 = {"svg": "img/poland_voivodeships.svg", "selector": "id",
            "districts": {k: k for k in gebiete}, "gebiete": gebiete,
            "names": names, "label": "województwa (16)"}
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
    print("patched config.js (poland map2)")


def _slug(name):
    s = name.replace("ł", "l").replace("Ł", "L")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


if __name__ == "__main__":
    main()
