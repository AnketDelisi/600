#!/usr/bin/env python3
"""Patch the German state map baselines (Berlin + Mecklenburg-Vorpommern).

- Berlin: the config's wkResults/winners2021 were the 2021 per-Wahlkreis
  values while the national baseline is the 2023 repeat, and the 2026
  re-cut (WK 206 fk -> 907 tk) never reached the baselines. Replaces both
  maps with the dpa ElectionsData past_election (2023 repeat, already
  mapped to the 2026 constituencies), for all 78 WKs.
- Mecklenburg-Vorpommern: wkResults already match the official 2021 data
  (<=0.05pp) but winners2021 disagrees with the data for 2 WKs; it is
  recomputed from wkResults.

Usage: python scraper/patch_de_baselines.py
"""
import json
import os
import re

import requests

ROOT = os.path.join(os.path.dirname(__file__), "..")
CFG = os.path.join(ROOT, "js", "config.js")
ABBREV = {"SPD": "spd", "CDU": "cdu", "CSU": "cdu", "Grüne": "gruene",
          "B90/GRÜNE": "gruene", "Die Linke": "linke", "LINKE": "linke",
          "AfD": "afd", "FDP": "fdp", "BSW": "bsw"}
EXPECTED = {str(b * 100 + w)
            for b, cnt in [(1, 7), (2, 5), (3, 9), (4, 7), (5, 5), (6, 7),
                           (7, 7), (8, 6), (9, 7), (10, 6), (11, 6), (12, 6)]
            for w in range(1, cnt + 1)}


def country_block(text, name):
    start = text.index("\n  %s: {" % name)
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    return start, start + 1 + m.start(), text[start:start + 1 + m.start()]


def brace(t, start):
    depth, k = 0, start
    while k < len(t):
        if t[k] == "{":
            depth += 1
        elif t[k] == "}":
            depth -= 1
            if depth == 0:
                return k
        k += 1
    return len(t) - 1


def replace_block(block, name, data, indent):
    b = re.search(r"\n(\s+)%s: \{" % name, block)
    k = brace(block, b.end() - 1)
    body = json.dumps(data, ensure_ascii=False, indent=len(indent) + 2)
    body = body.replace("\n", "\n" + indent)
    tail = re.sub(r"^\s*,", "", block[k + 1:], count=1)
    return (block[:b.start()] + "\n" + indent + name + ": " + body + "," +
            tail)


def fetch_past(el):
    d = requests.get("https://api.dpa-electionsdata.com/results",
                     params={"election": el, "stage": "live"},
                     headers={"User-Agent": "600-patch/1.0"},
                     timeout=60).json()
    pid = {p["id"]: ABBREV.get(p.get("abbreviation"))
           for p in d["parties"]}
    num = {}
    for c in d.get("constituencies") or []:
        ocd = (c.get("ocd_path") or "").split("ed:")[-1]
        try:
            num[c["id"]] = str(int(ocd))
        except (TypeError, ValueError):
            pass
    out = {}
    for pc in d["election"]["contest"][0].get("results_per_constituency") or []:
        key = num.get(pc.get("constituency_id"))
        if not key:
            continue
        raw = {}
        for x in pc["past_election"]["results"]:
            k = pid.get(x.get("target_id"))
            for p in x.get("percent") or []:
                if p.get("type") == "second_vote" and k and \
                        (p.get("value") or {}).get("absolute") is not None:
                    raw[k] = round(raw.get(k, 0) + p["value"]["absolute"], 1)
        out[key] = raw
    return out


def main():
    text = open(CFG, encoding="utf8").read()

    # --- Berlin: official 2023 repeat per 2026 WK
    be = fetch_past("de_be-2026")
    bogus = [x for x in be if x not in EXPECTED]
    missing = sorted(EXPECTED - set(be))
    for bx in bogus:
        cand = next((m for m in missing
                     if m.startswith(bx[:1]) and len(m) == 3), None)
        if cand:
            be[cand] = be.pop(bx)
            missing.remove(cand)
            print(f"  berlin: reassigned {bx} -> {cand}")
    print(f"berlin wk: {len(be)} | bogus {bogus} | missing {missing}")
    winners = {k: max(v, key=v.get) for k, v in be.items()}
    start, end, block = country_block(text, "berlin")
    block = replace_block(block, "wkResults", be, "      ")
    block = replace_block(block, "winners2021", winners, "      ")
    text = text[:start] + block + text[end:]

    # --- MV: recompute winners2021 from the (already official) wkResults
    start, end, block = country_block(text, "mecklenburg_vorpommern")
    b = re.search(r"\n\s+wkResults: \{", block)
    k = brace(block, b.end() - 1)
    wk = json.loads(block[b.end() - 1:k + 1])
    mw = re.search(r"\n\s+winners2021: \{", block)
    k2 = brace(block, mw.end() - 1)
    old = dict(re.findall(r"(\d+):\s*'(\w+)'", block[mw.end() - 1:k2 + 1]))
    fixed = {key: max(val, key=val.get) for key, val in wk.items()}
    changed = {k3: (old.get(k3), fixed[k3]) for k3 in fixed
               if old.get(k3) != fixed[k3]}
    print("mv winners2021 fixes:", changed)
    block = replace_block(block, "winners2021", fixed, "      ")
    text = text[:start] + block + text[end:]

    open(CFG, "w", encoding="utf8").write(text)
    print("patched config.js (berlin baselines + mv winners)")


if __name__ == "__main__":
    main()
