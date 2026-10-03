#!/usr/bin/env python3
"""Build the Greek constituency (59) map layer for the greece map2.

Geometry: the 52 single-prefecture constituencies use the old prefecture
polygons (kboul/greek-national-elections-july-2019 greekPrefectures.json,
which carries the election-prefecture IDs); the 7 urban splits are built
from the geoBoundaries GRC ADM3 municipalities:
  Athens A = Municipality of Athens
  Athens B1 = North Athens municipalities + Nea Filadelfeia-Chalkidona,
              Nea Ionia, Galatsi
  Athens B2 = West Athens municipalities
  Athens B3 = South Athens municipalities + Zografou, Kaisariani, Vyronas,
              Dafni-Ymittos, Ilioupoli
  Piraeus A = Municipality of Piraeus; Piraeus B = Piraeus prefecture - city
  Thessaloniki A = Municipality of Thessaloniki; B = prefecture - city
Results: the June 2023 per-constituency table (en.wikipedia, official
sourced). Mount Athos is not a constituency and is left uncoloured.

Usage: python scraper/build_greece_constituencies.py [--force]
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
PREF = os.path.join(ROOT, "scraper", ".cache", "gr_prefectures.json")
MUNI = os.path.join(ROOT, "scraper", ".cache", "gr_municipalities.geojson")
CACHE = os.path.join(ROOT, "scraper", ".cache", "gr_2023_constituencies.json")
OUT_SVG = os.path.join(ROOT, "img", "greece_constituencies.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "greece_constituencies.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache",
                        "gr_constituencies.geojson")
ATTRIBUTION = ("Results: June 2023 legislative election (per constituency); "
               "geometry: greekPrefectures (kboul) + geoBoundaries.org")
WIKI = ("https://en.wikipedia.org/wiki/"
        "June_2023_Greek_legislative_election")

PARTIES = ["nd", "syriza", "pasok", "kke", "sp", "el", "niki", "pe", "m25",
           "fl", "na", "dpk", "elpida", "elas"]
ORDER9 = ["nd", "syriza", "pasok", "kke", "sp", "el", "niki", "pe", "m25"]
# constituency key -> prefecture feature name (52 singles)
PREF_MAP = {
    "achaea": "Achaia", "aetolia_acarnania": "Aitoloakarnania",
    "argolis": "Argolida", "arcadia": "Arkadia", "arta": "Arta",
    "boeotia": "Viotia", "cephalonia": "Kefallonia",
    "chalkidiki": "Chalkidiki", "chania": "Chania", "chios": "Chios",
    "corfu": "Kerkyra", "corinthia": "Korinthos", "cyclades": "Kyklades",
    "dodecanese": "Dodekanisa", "drama": "Drama", "elis": "Ilia",
    "euboea": "Evia", "evros": "Evros", "evrytania": "Euritania",
    "florina": "Florina", "grevena": "Grevena", "heraklion": "Heraklio",
    "imathia": "Imathia", "ioannina": "Ioannina", "karditsa": "Karditsa",
    "kastoria": "Kastoria", "kavala": "Kavala", "kilkis": "Kilkis",
    "kozani": "Kozani", "laconia": "Lakonia", "larissa": "Larisa",
    "lasithi": "Lasithio", "lefkada": "Lefkada", "lesbos": "Lesvos",
    "magnesia": "Magnisia", "messenia": "Mesinia", "pella": "Pella",
    "phocis": "Fokida", "phthiotis": "Fthiotida", "pieria": "Pieria",
    "preveza": "Preveza", "rethymno": "Rethymno", "rhodope": "Rodopi",
    "samos": "Samos", "serres": "Serres", "thesprotia": "Thesprotia",
    "trikala": "Trikala", "xanthi": "Xanthi", "zakynthos": "Zakynthos",
    "east_attica": "East Attica", "west_attica": "West Attica",
}
B1 = ["Kifisia", "Penteli", "Metamorfosi", "Lykovrysi-Pefki", "Marousi",
      "Vrilissia", "Irakleio", "Chalandri", "Agia Paraskevi",
      "Filadelfeia-Chalkidona", "Nea Ionia", "Galatsi", "Filothei-Psychiko",
      "Papagou-Cholargos"]
B2 = ["Peristeri", "Ilion", "Egaleo", "Agioi Anargyroi-Kamatero",
      "Petroupoli", "Haidari", "Agia Varvara"]
B3 = ["Agios Dimitrios", "Alimos", "Vyronas", "Glyfada", "Dafni-Ymittos",
      "Elliniko-Argyroupoli", "Zografou", "Ilioupoli", "Kaisariani",
      "Kallithea", "Moschato-Tavros", "Nea Smyrni", "Palaio Faliro"]
# results-table name -> key
NAME2KEY = {
    "Achaea": "achaea", "Aetolia-Acarnania": "aetolia_acarnania",
    "Argolis": "argolis", "Arcadia": "arcadia", "Arta": "arta",
    "Athens A": "athens_a", "Athens B1 – North Athens": "athens_b1",
    "Athens B2 – West Athens": "athens_b2",
    "Athens B3 – South Athens": "athens_b3", "East Attica": "east_attica",
    "West Attica": "west_attica", "Boeotia": "boeotia",
    "Cephalonia": "cephalonia", "Chalkidiki": "chalkidiki",
    "Chania": "chania", "Chios": "chios", "Corfu": "corfu",
    "Corinthia": "corinthia", "Cyclades": "cyclades",
    "Dodecanese": "dodecanese", "Drama": "drama", "Elis": "elis",
    "Euboea": "euboea", "Evros": "evros", "Evrytania": "evrytania",
    "Florina": "florina", "Grevena": "grevena",
    "Heraklion": "heraklion", "Imathia": "imathia", "Ioannina": "ioannina",
    "Karditsa": "karditsa", "Kastoria": "kastoria", "Kavala": "kavala",
    "Kilkis": "kilkis", "Kozani": "kozani", "Laconia": "laconia",
    "Larissa": "larissa", "Lasithi": "lasithi", "Lefkada": "lefkada",
    "Lesbos": "lesbos", "Magnesia": "magnesia", "Messenia": "messenia",
    "Pella": "pella", "Phocis": "phocis", "Phthiotis": "phthiotis",
    "Pieria": "pieria", "Piraeus A": "piraeus_a", "Piraeus B": "piraeus_b",
    "Preveza": "preveza", "Rethymno": "rethymno", "Rhodope": "rhodope",
    "Samos": "samos", "Serres": "serres", "Thesprotia": "thesprotia",
    "Thessaloniki A": "thessaloniki_a",
    "Thessaloniki B": "thessaloniki_b", "Trikala": "trikala",
    "Xanthi": "xanthi", "Zakynthos": "zakynthos",
}
DISPLAY = {v: k for k, v in NAME2KEY.items()}


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(CACHE):
        import requests
        from bs4 import BeautifulSoup
        r = requests.get(WIKI, headers={"User-Agent": "600-poll-scraper/1.0"},
                         timeout=30)
        soup = BeautifulSoup(r.text, "lxml")
        t = soup.find_all("table")[7]
        rows = {}
        for tr in t.find_all("tr"):
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if not cells or cells[0] in ("Constituency", "%") or \
                    len(cells) < 4:
                continue
            key = NAME2KEY.get(cells[0])
            if not key:
                print("  no key for", cells[0])
                continue
            vals = {}
            for i, p in enumerate(ORDER9):
                ci = 1 + 2 * i
                if ci >= len(cells):
                    break
                try:
                    vals[p] = float(cells[ci].replace(",", "."))
                except ValueError:
                    vals[p] = 0.0
            rows[key] = vals
        with open(CACHE, "w", encoding="utf8") as fh:
            json.dump(rows, fh, ensure_ascii=False)
        print("parsed 2023 constituencies:", len(rows))
    res = json.load(open(CACHE, encoding="utf8"))
    print("constituencies with results:", len(res))

    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union
    pref = json.load(open(PREF, encoding="utf8"))
    pref_by = {f["properties"]["name"]: shape(f["geometry"])
               for f in pref["features"]}
    muni = json.load(open(MUNI, encoding="utf8"))
    muni_by = {f["properties"]["shapeName"]: shape(f["geometry"])
               for f in muni["features"]}

    geoms = {}
    for key, pname in PREF_MAP.items():
        if pname in pref_by:
            geoms[key] = pref_by[pname]
        else:
            print("  missing prefecture", pname)
    for key, names in (("athens_b1", B1), ("athens_b2", B2),
                       ("athens_b3", B3)):
        parts = []
        for n in names:
            if n in muni_by:
                parts.append(muni_by[n])
            else:
                print("  missing municipality", n)
        geoms[key] = unary_union(parts)
    for key, mname in (("athens_a", "Athens"), ("piraeus_a", "Pireas"),
                       ("thessaloniki_a", "Thessaloniki")):
        if mname in muni_by:
            geoms[key] = muni_by[mname]
        else:
            print("  missing municipality", mname)
    geoms["piraeus_b"] = pref_by["Peiraias and islands"].difference(
        muni_by["Pireas"])
    geoms["thessaloniki_b"] = pref_by["Thessaloniki B"].difference(
        muni_by["Thessaloniki"])
    print("geometries:", len(geoms))

    gebiete = {k: {p: res[k].get(p, 0.0) for p in PARTIES} for k in geoms
               if k in res}
    missing = sorted(set(geoms) - set(gebiete))
    print("without results:", missing)
    features = []
    for key, geom in geoms.items():
        if key not in gebiete:
            continue
        features.append({"type": "Feature", "properties": {"eklogiki": key},
                         "geometry": mapping(geom)})
    assert len(features) == 59, "expected 59 constituencies, got %d" % \
        len(features)
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "eklogiki", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  greece: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]
    map2 = {"svg": "img/greece_constituencies.svg", "selector": "id",
            "districts": {k: k for k in gebiete},
            "gebiete": gebiete,
            "names": {k: DISPLAY.get(k, k) for k in gebiete},
            "label": "constituencies (59)"}
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
    print("patched config.js (greece map2 constituencies)")


if __name__ == "__main__":
    main()
