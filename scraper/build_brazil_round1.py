#!/usr/bin/env python3
"""Fill the Brazil config's runoff2026 map baseline from the 2026 first-round
results (per federative unit), once Wikipedia's results table is complete.

The runoff map anchors on the round-1 two-way vote per state and swings with
the national head-to-head average (see runoffConf in js/app.js). Wikipedia
filled its per-state table gradually after the October 4 vote, so this script
is safe to run daily: it exits quietly while fewer than 27 units are present
and patches the config the first time all 27 are there.

Run it manually (the CI only commits data/, so the config patch
is committed by hand).

Usage: python scraper/build_brazil_round1.py
"""

import json
import os
import re

import requests
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(__file__), "..")
CONFIG = os.path.join(ROOT, "js", "config.js")
URL = "https://en.wikipedia.org/wiki/2026_Brazilian_general_election"

UF = {"Acre": "ac", "Alagoas": "al", "Amapá": "ap", "Amazonas": "am",
      "Bahia": "ba", "Ceará": "ce", "Distrito Federal": "df",
      "Federal District": "df", "Espírito Santo": "es", "Goiás": "go",
      "Maranhão": "ma", "Mato Grosso": "mt", "Mato Grosso do Sul": "ms",
      "Minas Gerais": "mg", "Pará": "pa", "Paraíba": "pb", "Paraná": "pr",
      "Pernambuco": "pe", "Piauí": "pi", "Rio de Janeiro": "rj",
      "Rio Grande do Norte": "rn", "Rio Grande do Sul": "rs",
      "Rondônia": "ro", "Roraima": "rr", "Santa Catarina": "sc",
      "São Paulo": "sp", "Sergipe": "se", "Tocantins": "to"}


def main():
    soup = BeautifulSoup(requests.get(
        URL, headers={"User-Agent": "600-poll-scraper/1.0"},
        timeout=60).text, "lxml")
    res = {}
    for tbl in soup.find_all("table", class_="wikitable"):
        rows = tbl.find_all("tr")
        if len(rows) < 8:
            continue
        hdr = [c.get_text(" ", strip=True)
               for c in rows[0].find_all(["th", "td"])]
        if "Federative unit" not in hdr or "Lula" not in hdr:
            continue
        for row in rows[1:]:
            cells = [c.get_text(" ", strip=True)
                     for c in row.find_all(["th", "td"])]
            if len(cells) < 5 or cells[0] not in UF:
                continue
            try:
                bol = float(cells[2])
                lul = float(cells[4])
            except ValueError:
                continue
            if bol + lul <= 0:
                continue
            res[UF[cells[0]]] = {"lula": round(100 * lul / (lul + bol), 1),
                                 "flavio": round(100 * bol / (lul + bol), 1)}
        break
    print("states with round-1 results: %d/27" % len(res))
    if len(res) < 27:
        print("table still incomplete - nothing to do (safe to re-run daily)")
        return
    text = open(CONFIG, encoding="utf8").read()
    block = ("    // 2026 first-round results by federative unit (official),\n"
             "    // two-way normalised against Flavio; the runoff map anchors\n"
             "    // here and swings with the national head-to-head average\n"
             "    runoff2026: "
             + json.dumps(res, ensure_ascii=False, indent=6).replace("\n", "\n    ")
             + ",\n")
    if "runoff2026:" in text:
        start = text.index("    runoff2026: ")
        depth, k = 0, text.index("{", start)
        while k < len(text):
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        end = text.index("\n", k) + 1
        text = text[:start] + block + text[end:]
    else:
        i = text.index("    nationalRunoff: ")
        text = text[:i] + block + text[i:]
    open(CONFIG, "w", encoding="utf8").write(text)
    print("patched runoff2026 into %s" % CONFIG)


if __name__ == "__main__":
    main()
