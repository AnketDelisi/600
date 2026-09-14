#!/usr/bin/env python3
"""Backtest polling accuracy for the last Slovakia/Austria/Estonia/Czechia elections.

Same methodology as backtest_mae.py (which handles German elections):
scrape the pre-election poll table from Wikipedia, take each pollster's last N
polls before election day, and compute mean absolute error (MAE) over the
official-result party set. Emits a config fragment pollster -> {EL_KEY, overall}.

English-month dates ("12–19 Jun 2024", "5 Mar", "Aug 2024") are parsed with an
optional per-heading reference year; the Czech 2025 page has blank party
headers, so its columns are anchored from the 2025 official result row.
"""

import re
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from backtest_mae import expand_grid, norm_header, parse_value, p_mae, last_n
from scrape_austria import in_nationwide_scope, table_ref_year

# Official results taken from js/config.js lastElection blocks.
ELECTIONS = [
    {
        "key": "SK2023",
        "url": "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2023_Slovak_parliamentary_election",
        "date": "2023-09-30",
        "cutoff": "2022-01-01",
        "result": {"smer": 22.95, "ps": 17.96, "hlas": 14.70, "slovensko": 8.89, "kdh": 6.82,
                   "sas": 6.32, "sns": 5.62, "republika": 4.75, "aliancia": 4.39,
                   "demokrati": 2.93, "rodina": 2.21, "lsns": 1.37},
        "ref_skip": {"2023 election", "european election", "2023 national council"},
        "header_map": {
            "polling firm": "institute", "date": "date", "sample size": "sample",
            "ol*a*no and friends": "slovensko", "ol*a*no": "slovensko",
            "smer": "smer", "sr": "rodina", "ľsns": "lsns", "ĺsns": "lsns",
            "ps": "ps", "saska": "sas", "kdh": "kdh", "alliance": "aliancia",
            "democrats": "demokrati", "sns": "sns", "hlas": "hlas", "rep": "republika",
        },
    },
    {
        "key": "AT2024",
        "url": "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2024_Austrian_legislative_election",
        "date": "2024-09-29",
        "cutoff": "2024-01-01",
        "result": {"fpoe": 28.8, "oevp": 26.3, "spoe": 21.1, "neos": 9.1, "gruene": 8.2, "kpoe": 2.4},
        "ref_skip": {"2024 legislative election", "2019 legislative election", "election"},
        "header_map": {
            "polling firm": "institute", "fieldwork date": "date", "sample size": "sample",
            "övp": "oevp", "spö": "spoe", "fpö": "fpoe", "grüne": "gruene",
            "neos": "neos", "kpö": "kpoe",
        },
        "nationwide": True,
        "ref_year": True,
    },
    {
        "key": "EE2023",
        "url": "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2023_Estonian_parliamentary_election",
        "date": "2023-03-05",
        "cutoff": "2022-06-01",
        "result": {"ref": 31.24, "kesk": 15.28, "ekre": 16.05, "isamaa": 8.21,
                   "sde": 9.27, "e200": 13.33, "eer": 0.96, "pp": 2.30},
        "ref_skip": {"election results"},
        "header_map": {
            "polling firm": "institute", "fieldwork date": "date", "fieldwork time": "date",
            "sample size": "sample", "ref": "ref", "kesk": "kesk", "ekre": "ekre",
            "isamaa": "isamaa", "sde": "sde", "e200": "e200", "eer": "eer",
            "parem": "pp", "parempoolsed": "pp",
        },
        "no_year": True,
    },
    {
        "key": "CZ2025",
        "url": "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2025_Czech_parliamentary_election",
        "date": "2025-10-04",
        "cutoff": "2024-01-01",
        "result": {"spolu": 23.36, "ano": 34.52, "stan": 11.23, "pirati": 8.97,
                   "spd": 7.78, "prisaha": 1.08, "auto": 6.77},
        "ref_skip": {"2025 legislative election"},
        "header_map": {},  # party headers are blank; cols anchored from the result row
        "fixed_cols": {3: "spolu", 6: "ano", 7: "stan", 8: "pirati", 10: "spd",
                       14: "prisaha", 15: "auto"},  # +col16='−' Stačilo! folds to other
        "fixed_prefix": 3,     # col0 pollster, col1 date, col2 sample
        "anchor": "2025 legislative election",
    },
]

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def parse_date_en(t, ref_year=None):
    """Return poll end date YYYY-MM-DD for English-month dates."""
    import calendar
    t = re.sub(r"\[\s*\w+\s*\]", "", t or "").strip()
    if not t or t.lower() in ("—", "–", "-", "n/a"):
        return None
    year_m = re.search(r"(20\d{2})", t)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
        return None
    pairs = [(int(d), MONTHS[m.lower()[:3]]) for d, m in re.findall(r"(\d{1,2})\s+([A-Za-z]+)", t)]
    if pairs:
        day, mon = pairs[-1]  # last (day, month) = end of fieldwork window
    else:
        mons = [MONTHS[m.lower()[:3]] for m in re.findall(r"[A-Za-z]+", t) if m.lower()[:3] in MONTHS]
        if not mons:
            return None
        mon = mons[-1]
        day = calendar.monthrange(year, mon)[1]  # month-only (e.g. "Aug 2024") -> month end
    try:
        return datetime(year, mon, day).strftime("%Y-%m-%d")
    except ValueError:
        return None


def scrape_past(e):
    print(f"Fetching {e['url'].split('/')[-1]} ...")
    resp = requests.get(e["url"], headers={"User-Agent": "600-backtest/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    polls = []

    for table in soup.find_all("table"):
        if "wikitable" not in (table.get("class") or []):
            continue
        if e.get("nationwide") and not in_nationwide_scope(table):
            continue
        grid = expand_grid(table)
        if not grid:
            continue

        ncol = max((len(r) for r in grid), default=0)
        # Find the header row: enough party columns recognized in one row.
        header_idx, pcols = None, []
        for ri, row in enumerate(grid):
            keys = [e["header_map"].get(norm_header(h)) for h in row]
            party_idx = [i for i, k in enumerate(keys) if k in e["result"]]
            if len(party_idx) >= 4 and "date" in keys and "institute" in keys:
                header_idx, pcols = ri, party_idx
                break
        if header_idx is None and e.get("fixed_cols"):
            # Czech page: party header cells are blank; anchor col order from
            # the official-result row (its numbers match e["result"] exactly).
            for ri, row in enumerate(grid):
                if row and e.get("anchor") and e["anchor"] not in row[0]:
                    continue
                paired = {e["fixed_cols"][i]: parse_value(v) for i, v in enumerate(row)
                          if i in e["fixed_cols"]}
                if len(paired) >= 5 and abs(sum(paired.values()) - sum(e["result"].values())) < 5:
                    header_idx, pcols = ri, sorted(e["fixed_cols"])
                    break
        if header_idx is None:
            continue

        col_ins = col_date = None
        for i, h in enumerate(grid[header_idx][:ncol]):
            k = e["header_map"].get(norm_header(h))
            if k == "institute":
                col_ins = i
            elif k == "date":
                col_date = i
        if e.get("fixed_cols"):
            col_ins, col_date = 0, 1  # fixed layout: pollster/date/sample prefix
        if col_ins is None or col_date is None:
            continue

        ref_year = table_ref_year(table) if e.get("ref_year") or e.get("no_year") else None
        if e.get("fixed_cols") and not (e.get("ref_year") or e.get("no_year")):
            ref_year = None
        for row in grid[header_idx + 1:]:
            if len(row) <= max(col_ins, col_date, *(pcols or [0])):
                continue
            inst = re.sub(r"\[\s*\w+\s*\]", "", row[col_ins]).strip()
            low = inst.lower()
            if len(inst) < 3 or any(all(w in low for w in s.split()) for s in e["ref_skip"]):
                continue
            date = parse_date_en(row[col_date], ref_year)
            if not date or not (e["date"] >= date >= e["cutoff"]):
                continue
            votes = {}
            for i in pcols:
                v = parse_value(row[i])
                if v is not None:
                    votes[e["fixed_cols"][i] if e.get("fixed_cols") else
                          e["header_map"].get(norm_header(grid[header_idx][i]))] = v
            if len(votes) < 5:
                continue
            total = sum(votes.values())
            if total < 85 or total > 115:
                continue
            polls.append({"pollster": inst, "date": date, "votes": votes})

    uniq, seen = [], set()
    for p in sorted(polls, key=lambda x: x["date"]):
        k = (p["pollster"].lower(), p["date"], tuple(sorted(p["votes"].items())))
        if k not in seen:
            seen.add(k)
            uniq.append(p)
    return uniq


def main():
    out = {}
    for e in ELECTIONS:
        polls = scrape_past(e)
        byP = {}
        for p in polls:
            byP.setdefault(p["pollster"], []).append(p)
        print(f"\n== {e['key']} : {len(polls)} polls, {len(byP)} pollsters ==")
        frag = {}
        for ps in sorted(byP, key=lambda x: -len(byP[x])):
            last5 = last_n(byP[ps], 5)
            if len(last5) < 2:
                continue
            maes = [p_mae(p, e["result"], list(e["result"])) for p in last5]
            mae = sum(maes) / len(maes)
            print(f"  {ps:28s} n={len(last5):2d} polls: MAE={mae:.2f}")
            frag[ps] = {e["key"]: round(mae, 2)}
        out[e["key"]] = frag
    print("\n=== CONFIG FRAGMENT (MAE) ===")
    print(json_dumps(out))


def json_dumps(o):
    import json
    return json.dumps(o, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()