#!/usr/bin/env python3
"""Backtest polling accuracy for MV 2021 and Berlin 2023.

For each state election with an OFFICIAL result, scrape the pre-election
poll table from de.wikipedia.org, take each pollster's last N polls before
election day, and compute mean absolute error (MAE) over the party set that
was reported. Emits a JSON config fragment mapping pollster -> {election, overall}.

Matches the methodology used for ST2021/ST2026 in site/js/config.js.
"""

import json
import re
import sys
from datetime import datetime

import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "600-backtest/1.0"}

ELECTIONS = [
    {
        "key": "MV2021",
        "url": "https://de.wikipedia.org/wiki/Landtagswahl_in_Mecklenburg-Vorpommern_2021",
        "date": "2021-09-26",
        "cutoff": "2021-01-01",
        "parties": ["spd", "afd", "cdu", "linke", "gruene", "fdp"],
        "result": {  # official Landesergebnis 2021 (Zweitstimmen %)
            "spd": 39.6, "afd": 16.7, "cdu": 13.3, "linke": 9.9,
            "gruene": 6.3, "fdp": 5.8,
        },
        "ref_skip": {"landtagswahl 2021", "landtagswahl 2016", "bundestagswahl", "europawahl"},
        "header_map": {
            "institut": "institute", "umfrage": "institute", "datum": "date",
            "cdu": "cdu", "afd": "afd", "linke": "linke", "spd": "spd",
            "fdp": "fdp", "grüne": "gruene", "grune": "gruene",
            "bündnis 90/die grünen": "gruene", "bündnis 90 / die grünen": "gruene",
            "fw": "other", "sonstige": "other", "other": "other",
        },
    },
    {
        "key": "B2023",
        "url": "https://de.wikipedia.org/wiki/Wahl_zum_Abgeordnetenhaus_von_Berlin_2023",
        "date": "2023-02-12",
        "cutoff": "2022-01-01",
        "parties": ["cdu", "spd", "gruene", "linke", "afd"],
        "result": {  # official Ergebnis der Wiederholungswahl 2023 (Zweitstimmen %)
            "cdu": 28.2, "spd": 18.4, "gruene": 18.4, "linke": 12.2, "afd": 9.1,
        },
        "ref_skip": {"abgeordnetenhauswahl 2023", "abgeordnetenhauswahl 2021", "bundestagswahl", "europawahl"},
        "ref_prefix": ["abgeordnetenhauswahl", "landtagswahl", "bundestagswahl", "europawahl"],
        "header_map": {
            "institut": "institute", "umfrage": "institute", "datum": "date",
            "cdu": "cdu", "afd": "afd", "linke": "linke", "spd": "spd",
            "fdp": "fdp", "grüne": "gruene", "grune": "gruene",
            "bündnis 90/die grünen": "gruene", "bündnis 90 / die grünen": "gruene",
            "sonstige": "other", "other": "other",
        },
    },
]


def norm_header(text):
    text = re.sub(r"\[\s*\w+\s*\]", "", text or "")
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    text = re.sub(r"\s*-\s*", "-", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def expand_grid(table):
    rows = table.find_all("tr")
    grid, live = [], {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out, col, i = [], 0, 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1]); live[col][0] -= 1; col += 1
            c = cells[i]
            for hid in c.select('[style*="visibility:hidden"], [style*="visibility: hidden"]'):
                hid.decompose()
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs, rs = int(c.get("colspan") or 1), int(c.get("rowspan") or 1)
            for k in range(cs):
                out.append(txt)
                if rs > 1:
                    live[col + k] = [rs - 1, txt]
            col += cs; i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1]); live[col][0] -= 1; col += 1
        grid.append(out)
    return grid


def parse_date(t):
    t = re.sub(r"\[\s*\w+\s*\]", "", t or "").strip()
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if not m:
        return None
    try:
        d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None
    return d.strftime("%Y-%m-%d")


def parse_value(t):
    t = re.sub(r"\[\s*\w+\s*\]", "", t or "")
    t = re.sub(r"[\u00b9\u00b2\u00b3\u00b0\u2070-\u207f\u207a\u207b]+", "", t)
    t = t.replace("\u00a0", " ").replace("%", " ").strip()
    if not t or t.lower() in ("–", "—", "-", "n/a", "–%", "—%"):
        return None
    m = re.match(r"(-?\d+(?:[.,]\d+)?)", t)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_past(url, key, elec_date, cutoff, parties, ref_skip, header_map, ref_prefix=()):
    print(f"Fetching {url.split('/')[-1]} ...")
    resp = requests.get(url, headers=UA, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    polls = []
    for table in soup.find_all("table"):
        if "wikitable" not in (table.get("class") or []):
            continue
        grid = expand_grid(table)
        if not grid:
            continue
        header_idx = None
        for ri, row in enumerate(grid):
            keys = [header_map.get(norm_header(h)) for h in row]
            npart = sum(1 for k in keys if k in parties)
            if npart >= 4 and "date" in keys and "institute" in keys and header_idx is None:
                header_idx = ri; col_keys = keys
        if header_idx is None:
            continue
        col_ins = col_keys.index("institute")
        col_date = col_keys.index("date")
        pcols = [i for i, k in enumerate(col_keys) if k in parties]
        for row in grid[header_idx + 1:]:
            if len(row) <= max(col_ins, col_date, *(pcols or [0])) if pcols else len(row) <= max(col_ins, col_date):
                continue
            inst = re.sub(r"\[\s*\w+\s*\]", "", row[col_ins]).strip()
            low = inst.lower().strip()
            if len(inst) < 3 or low in ref_skip:
                continue
            if any(low.startswith(p) for p in ref_prefix):
                continue
            date = parse_date(row[col_date])
            if not date or not (elec_date >= date >= cutoff):
                continue
            votes = {}
            for i in pcols:
                v = parse_value(row[i])
                if v is not None:
                    votes[col_keys[i]] = v
            # require the core: cdu, spd, gruene, linke, afd where applicable
            if len(votes) < 4:
                continue
            polls.append({"pollster": inst, "date": date, "votes": votes})
    # de-dup
    uniq, seen = [], set()
    for p in sorted(polls, key=lambda x: x["date"]):
        k = (p["pollster"].lower(), p["date"], tuple(sorted(p["votes"].items())))
        if k not in seen:
            seen.add(k); uniq.append(p)
    return uniq


def last_n(polls, n):
    return sorted(polls, key=lambda x: x["date"], reverse=True)[:n]


def p_mae(poll, result, parties):
    errs = []
    for k in parties:
        v = poll["votes"].get(k)
        if v is None:
            v = 0.0  # below threshold / folded into 'other'
        errs.append(abs(v - result[k]))
    return sum(errs) / len(errs)


def p_signed_bias(poll, result, parties):
    errs = {}
    for k in parties:
        v = poll["votes"].get(k)
        if v is None:
            v = 0.0
        errs[k] = v - result[k]
    return errs


def main():
    out = {}
    for e in ELECTIONS:
        polls = scrape_past(e["url"], e["key"], e["date"], e["cutoff"],
                            e["parties"], e["ref_skip"], e["header_map"],
                            e.get("ref_prefix", ()))
        byP = {}
        for p in polls:
            byP.setdefault(p["pollster"], []).append(p)
        print(f"\n== {e['key']} : {len(polls)} polls, {len(byP)} pollsters ==")
        frag = {}
        for ps in sorted(byP, key=lambda x: -len(byP[x])):
            last5 = last_n(byP[ps], 5)
            if len(last5) < 2:
                continue
            maes = [p_mae(p, e["result"], e["parties"]) for p in last5]
            mae = sum(maes) / len(maes)
            bias = {}
            for k in e["parties"]:
                vals = [p_signed_bias(p, e["result"], e["parties"])[k] for p in last5]
                bias[k] = round(sum(vals) / len(vals), 2)
            per = "poll" if len(last5) == 1 else "polls"
            print(f"  {ps:28s} n={len(last5):2d} {per}: MAE={mae:.2f}  bias={bias}")
            frag[ps] = {e["key"]: round(mae, 2)}
        out[e["key"]] = frag
    print("\n=== CONFIG FRAGMENT (MAE) ===")
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()