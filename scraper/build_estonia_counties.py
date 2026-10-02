#!/usr/bin/env python3
"""Build the Estonian county (maakonnad, 15) map layer.

Results: official opendata.valimised.ee RK_2023
VOTING_RESULT_IN_COUNTIES.xml (party votes per county; Tallinn city
districts and Tartu city are listed separately and are folded into
Harju / Tartu county). Geometry: EHAK municipalities
(omavalitsuste_piirid, cached) dissolved by maakond.

Writes img/estonia_counties.svg and patches the estonia block in
js/config.js with a map2 layer.

Usage: python scraper/build_estonia_counties.py [--force]
"""
import json
import os
import re
import sys
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
XML = os.path.join(ROOT, "scraper", ".cache", "ee_counties.xml")
XML_URL = ("https://opendata.valimised.ee/api/RK_2023/"
           "VOTING_RESULT_IN_COUNTIES.xml")
EHAK = os.path.join(ROOT, "scraper", ".cache", "ehak_omavalitsused.json")
OUT_SVG = os.path.join(ROOT, "img", "estonia_counties.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "estonia_counties.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "ee_counties.geojson")
ATTRIBUTION = ("Tulemused: Valimised.ee (RK 2023, avaandmed); Geometria: "
               "EHAK (Maa- ja Ruumiamet)")

PARTIES = ["isamaa", "e200", "ref", "ekre", "kesk", "sde", "vl", "koos",
           "pp", "eer", "erk"]
CODE = {"IE": "isamaa", "EE200": "e200", "REF": "ref", "EKRE": "ekre",
        "KESK": "kesk", "SDE": "sde", "EÜVP": "vl", "KOOS": "koos",
        "PP": "pp", "ROH": "eer", "ERK": "erk"}
COUNTY = {"Harju maakond": "harju", "Rapla maakond": "rapla",
          "Hiiu maakond": "hiiu", "Lääne maakond": "laane",
          "Saare maakond": "saare", "Lääne-Viru maakond": "laane_viru",
          "Ida-Viru maakond": "ida_viru", "Järva maakond": "jarva",
          "Viljandi maakond": "viljandi", "Jõgeva maakond": "jogeva",
          "Tartu maakond": "tartu", "Tartu linn": "tartu",
          "Põlva maakond": "polva", "Valga maakond": "valga",
          "Võru maakond": "voru", "Pärnu maakond": "parnu"}
for _ln in ("Haabersti", "Kristiine", "Põhja-Tallinna", "Kesklinna",
            "Lasnamäe", "Pirita", "Mustamäe", "Nõmme"):
    COUNTY[_ln + " linnaosa"] = "harju"
DISPLAY = {"harju": "Harju", "rapla": "Rapla", "hiiu": "Hiiu",
           "laane": "Lääne", "saare": "Saare", "laane_viru": "Lääne-Viru",
           "ida_viru": "Ida-Viru", "jarva": "Järva", "viljandi": "Viljandi",
           "jogeva": "Jõgeva", "tartu": "Tartu", "polva": "Põlva",
           "valga": "Valga", "voru": "Võru", "parnu": "Pärnu"}


def norm(name):
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(XML):
        req = urllib.request.Request(XML_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=300).read()
        with open(XML, "wb") as fh:
            fh.write(data)
        print("downloaded counties xml:", len(data), "bytes")

    root = ET.parse(XML).getroot()
    ns = root.tag.split("}")[0] + "}"
    v = root.find(ns + "data").find(ns + "votingResult")
    votes, valid = {}, {}
    for d in v.find(ns + "districts").findall(ns + "district"):
        for c in d.find(ns + "counties").findall(ns + "county"):
            raw = c.findtext(ns + "countyName")
            key = COUNTY.get(raw)
            if not key:
                print("  no mapping for", raw)
                continue
            votes.setdefault(key, {})
            valid.setdefault(key, 0)
            for party in c.find(ns + "votesDistributionByParties"):
                pk = CODE.get(party.findtext(ns + "partyCode"))
                total = party.find(ns + "totalRows").find(ns + "totalRow")
                n = sum(int(cell.findtext(ns + "value") or 0)
                        for cell in total.find(ns + "votesDistributionRow")
                        .findall(ns + "votesDistributionCell"))
                valid[key] += n
                if pk:
                    votes[key][pk] = votes[key].get(pk, 0) + n
    print("counties:", len(votes))

    gebiete = {}
    for key, acc in votes.items():
        vv = valid[key]
        gebiete[key] = {p: round(acc.get(p, 0) * 100 / vv, 2)
                        for p in PARTIES}
    nat = {}
    for p in PARTIES:
        sv = sum(acc.get(p, 0) for acc in votes.values())
        tv = sum(valid.values())
        nat[p] = round(sv * 100 / tv, 2)
    print("national:", nat)

    gj = json.load(open(EHAK, encoding="utf8"))
    groups = {}
    for f in gj["features"]:
        raw = f["properties"]["maakond"]
        key = COUNTY.get(raw, norm(raw))
        groups.setdefault(key, []).append(f["geometry"])
    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union
    features, matched = [], set()
    for key, geoms in groups.items():
        if key not in gebiete:
            print("  no results for", key)
            continue
        matched.add(key)
        merged = mapping(unary_union([shape(g) for g in geoms]))
        features.append({"type": "Feature", "properties": {"maakond": key},
                         "geometry": merged})
    print("features:", len(features), "| results without geometry:",
          sorted(set(gebiete) - matched))
    assert len(features) == 15, "expected 15 counties"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "maakond", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  estonia: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]
    map2 = {"svg": "img/estonia_counties.svg", "selector": "id",
            "districts": {k: k for k in gebiete}, "gebiete": gebiete,
            "names": {k: DISPLAY[k] for k in gebiete},
            "label": "maakonnad (15)"}
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
    print("patched config.js (estonia map2)")


if __name__ == "__main__":
    main()
