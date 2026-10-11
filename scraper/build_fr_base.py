#!/usr/bin/env python3
"""Add the 2024 EP previous-election base to the France model (base blend).

The france projection base is the 2022 presidential per-department
geography mapped onto the 2027 field (Macron split 60/40 Attal/Philippe,
Pecresse -> Retailleau, Jadot -> Tondelier, Hidalgo -> Faure). The field
is unsettled and the 2022 base rides on inheritance proxies, so this
script adds the 2024 European election's per-department shares (frwiki
"Par departement" table, the same source as build_fr_ep2024.py) as
prevGebiete + prevNational with baseBlend: 0.75: the projection reads
0.75 * 2022 + 0.25 * 2024 EP geography, result views stay pure 2022.

Mapping (documented in the config comment): ENS (Besoin d'Europe) ->
the camp split 60/40 Attal/Philippe, PS-PP -> Glucksmann (he led that
list; the other PS-family candidates hold their 2022-mapped baseline),
LFI -> Melenchon, LR -> Retailleau, LE -> Tondelier, REC -> Zemmour,
PCF -> Roussel. Parties absent from the EP table hold their 2022 base;
Glucksmann gains a real base where he previously had none (flat
uniform-swing projection).

Idempotent: rerunning replaces the block. Usage:
python scraper/build_fr_base.py [--force]
"""

import json
import os
import re
import sys

import requests

sys.path.insert(0, os.path.dirname(__file__))
from fr_departments import NAME_CODE
from build_france_map import fold

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
CONFIG = os.path.join(ROOT, "js", "config.js")
API = "https://fr.wikipedia.org/w/api.php"
PAGE = "Élections européennes de 2024 en France"
UA = {"User-Agent": "600-poll-scraper/1.0"}

# 2024 EP national result (official) -> the 2027 field. ENS splits 60/40
# like the 2022 inheritance; PS-PP to Glucksmann (its list leader)
NAT = {"lepen": 31.37, "attal": 8.76, "philippe": 5.84, "glucksmann": 13.83,
       "melenchon": 9.89, "retailleau": 7.25, "tondelier": 5.50,
       "zemmour": 5.47, "roussel": 2.36}


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    cache = os.path.join(CACHE, "fr_ep2024_section.wiki")
    if force or not os.path.isfile(cache):
        r = requests.get(API, params={
            "action": "parse", "page": PAGE, "prop": "sections",
            "format": "json", "redirects": 1}, headers=UA, timeout=60)
        r.raise_for_status()
        idx = next(s["index"] for s in r.json()["parse"]["sections"]
                   if s["line"].strip() == "Par département")
        r2 = requests.get(API, params={
            "action": "parse", "page": PAGE, "section": idx,
            "prop": "wikitext", "format": "json", "redirects": 1},
            headers=UA, timeout=60)
        r2.raise_for_status()
        open(cache, "w", encoding="utf8").write(
            r2.json()["parse"]["wikitext"]["*"])
    wt = open(cache, encoding="utf8").read()

    name_code = {fold(n): c for n, c in NAME_CODE.items()}
    assert len(name_code) == 96, len(name_code)
    metro = set(name_code.values())

    out = {}
    for row in wt.split("|-"):
        m = re.search(r'data-sort-value="([0-9AB]+)"', row)
        if not m:
            continue
        code = m.group(1).replace("20A", "2A").replace("20B", "2B")
        if code not in metro:
            continue
        pcts = [float(x.replace(",", "."))
                for x in re.findall(r"\d+,\d{1,2}", row)]
        if len(pcts) < 14:
            print("  WARN", code, "only", len(pcts), "cells")
            continue
        rn, ens, pspp, lfi, lr, le, rec, pcf = pcts[:8]
        out[code] = {
            "lepen": rn,
            "attal": round(0.6 * ens, 2),
            "philippe": round(0.4 * ens, 2),
            "glucksmann": pspp,
            "melenchon": lfi,
            "retailleau": lr,
            "tondelier": le,
            "zemmour": rec,
            "roussel": pcf,
        }
    assert len(out) == 96, len(out)
    print("departments:", len(out))
    print("sample 75:", out["75"])
    print("sample 59:", out["59"])
    print("sample 2A:", out["2A"])

    text = open(CONFIG, encoding="utf8").read()
    i = text.find("\n  france: {")
    assert i >= 0, "france block not found"
    depth, j = 0, i
    while j < len(text):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    seg = text[i:j]
    # idempotent: drop an existing block first
    seg = re.sub(r"\n      // previous-election base \(9 Jun 2024.*?"
                 r"baseBlend: [\d.]+,", "", seg, flags=re.S)
    m = re.search(r"national2021: \{[^}]*\}", seg, re.S)
    assert m, "france national2021 not found"
    jd = json.dumps
    block = (
        ",\n      // previous-election base (9 Jun 2024 EP, frwiki\n"
        "      // per-department table; scraper/build_fr_base.py): the\n"
        "      // projection blends 0.75 * 2022 + 0.25 * 2024 EP geography,\n"
        "      // result views stay pure 2022. ENS -> the camp split 60/40\n"
        "      // Attal/Philippe, PS-PP -> Glucksmann (its list leader; the\n"
        "      // other PS names hold their 2022-mapped baseline),\n"
        "      // LFI -> Melenchon, LR -> Retailleau, LE -> Tondelier,\n"
        "      // REC -> Zemmour, PCF -> Roussel. Parties absent from the EP\n"
        "      // hold their 2022 base; Glucksmann gains a real base (he\n"
        "      // previously projected flat).\n"
        "      prevGebiete: " + jd(out, ensure_ascii=False) + ",\n"
        "      prevNational: " + jd(NAT) + ",\n"
        "      baseBlend: 0.75"
    )
    seg = seg[:m.end()] + block + seg[m.end():]
    text = text[:i] + seg + text[j:]
    open(CONFIG, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (france prevGebiete + baseBlend 0.75)")


if __name__ == "__main__":
    main()
