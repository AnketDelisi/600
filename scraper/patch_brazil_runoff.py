#!/usr/bin/env python3
"""Add the 2022 per-state runoff baselines to the brazil config block.

The Brazil map shows the first-round projection; a separate runoff mode
needs the second-round baselines. The per-federative-unit 2022 runoff
(Lula vs Bolsonaro) comes from the "2022 Brazilian general election"
article on en.wikipedia (Ministry of the Interior / TSE data); the
national runoff (50.90 / 49.10) matches data/brazil/meta.json.

Inserts into the brazil block of js/config.js:
  nationalRunoff: {lula: 50.90, flavio: 49.10},
  map: { ..., runoff2022: { <uf>: {lula: %, flavio: %}, ... } }

Usage: python scraper/patch_brazil_runoff.py [--force]
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
URL = "https://en.wikipedia.org/wiki/2022_Brazilian_general_election"
NAT = {"lula": 50.90, "flavio": 49.10}


def fetch(force=False):
    path = os.path.join(CACHE, "br_2022_article.html")
    if force or not os.path.isfile(path):
        r = requests.get(URL, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=120)
        r.raise_for_status()
        open(path, "wb").write(r.content)
    return open(path, encoding="utf8").read()


def parse_states(html):
    soup = BeautifulSoup(html, "lxml")
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 20:
            continue
        txt = " ".join(t.get_text(" ", strip=True).split())
        if "Federative unit" not in txt or "Second round" not in txt:
            continue
        out = {}
        for tr in rows:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 5 or not cells[0]:
                continue
            state = cells[0]
            lula = re.match(r"([\d.]+)", cells[2])
            bolso = re.match(r"([\d.]+)", cells[4])
            if state == "Abroad" or not lula or not bolso:
                continue
            try:
                out[state] = {"lula": round(float(lula.group(1)), 2),
                              "flavio": round(float(bolso.group(1)), 2)}
            except ValueError:
                continue
        if len(out) >= 20:
            return out
    return {}


def main():
    force = "--force" in sys.argv
    states = parse_states(fetch(force))
    print("states parsed:", len(states))
    assert len(states) == 27, "expected 27 federative units"

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  brazil: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]

    # config names map: uf key -> state name (single-quoted JS object)
    nm = re.search(r"names:\s*\{", block)
    depth, k = 0, nm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    names = dict(re.findall(r"(\w+):\s*'([^']+)'", block[nm.end():k]))
    name_to_key = {v: kk for kk, v in names.items()}
    name_to_key["Federal District"] = "df"
    runoff = {}
    for state, vals in states.items():
        key = name_to_key.get(state)
        if not key:
            print("  no uf key for", state)
            continue
        runoff[key] = vals
    print("runoff baselines:", len(runoff))

    # insert nationalRunoff after the national2021 object, runoff2022 after gebiete
    def insert_after(block, field, payload):
        m = re.search(r"\n(\s+)%s:\s*\{" % field, block)
        depth, k = 0, m.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        indent = m.group(1)
        return block[:k + 1] + ",\n" + indent + payload + block[k + 1:]

    def drop_field(block, field):
        m = re.search(r",?\n\s+%s:\s*\{" % field, block)
        if not m:
            return block
        depth, k = 0, m.end() - 1
        while k < len(block):
            if block[k] == "{":
                depth += 1
            elif block[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        return block[:m.start()] + block[k + 1:]

    block = drop_field(block, "runoff2022")
    block = drop_field(block, "nationalRunoff")
    payload = "runoff2022: " + json.dumps(
        runoff, ensure_ascii=False, indent=2).replace("\n", "\n      ")
    block = insert_after(block, "gebiete", payload)
    block = insert_after(block, "national2021",
                         "nationalRunoff: " + json.dumps(NAT))
    open(cfg_path, "w", encoding="utf8").write(
        text[:start] + block + text[end:])
    print("patched config.js (brazil runoff baselines)")


if __name__ == "__main__":
    main()
