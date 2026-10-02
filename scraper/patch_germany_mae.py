#!/usr/bin/env python3
"""Compute and patch the German pollster MAE from the 2025 final polls.

Fetches the 2025 federal election polling article, takes each pollster's
last 5 polls before election day (2025-02-23), averages |poll - actual|
across the reported parties (union = CDU + CSU folded), and writes the
result into the germany block's pollsterMAE (maeKey BT2025).

Usage: python scraper/patch_germany_mae.py
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import scrape_germany as sg

ROOT = os.path.join(os.path.dirname(__file__), "..")
ACTUAL = {"cdu": 28.52, "afd": 20.80, "spd": 16.41, "gruene": 11.61,
          "linke": 8.77, "bsw": 4.98, "fdp": 4.33}
ELECTION = "2025-02-23"
N_LAST = 5


def main():
    sg.WIKI_URL = ("https://en.wikipedia.org/wiki/"
                   "Opinion_polling_for_the_2025_German_federal_election")
    sg.CUTOFF = "2020-01-01"
    polls = sg.scrape_germany()
    print("polls parsed:", len(polls))

    by_ps = {}
    for p in polls:
        if p["date"] >= ELECTION:
            continue
        by_ps.setdefault(p["pollster"], []).append(p)
    mae = {}
    for ps, lst in by_ps.items():
        last = sorted(lst, key=lambda x: x["date"])[-N_LAST:]
        errs = []
        for p in last:
            for party, actual in ACTUAL.items():
                if party in p["votes"]:
                    errs.append(abs(p["votes"][party] - actual))
        if errs:
            mae[ps] = round(sum(errs) / len(errs), 2)
    print("pollsters with MAE:", len(mae))
    for ps, m in sorted(mae.items(), key=lambda x: x[1]):
        print(f"  {ps:24s} {m:.2f}  (last {len(by_ps[ps])} polls)")

    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  germany: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = (start + 1 + m.start() if m
           else text.index("\n};\n\n// ===== Active country"))
    block = text[start:end]
    body = json.dumps({k: {"BT2025": v, "overall": v}
                       for k, v in mae.items()},
                      ensure_ascii=False, indent=6)
    b = re.search(r"\n(\s+)pollsterMAE: ", block)
    k = block.index("\n", block.index("{", b.end()) + 1)
    # replace up to the closing "}," of the pollsterMAE object
    depth, i = 0, block.index("{", b.end())
    while i < len(block):
        if block[i] == "{":
            depth += 1
        elif block[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    block = (block[:b.end()] + body + block[i + 1:])
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (germany pollsterMAE)")


if __name__ == "__main__":
    main()
