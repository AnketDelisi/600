#!/usr/bin/env python3
"""Scrape Argentina 2027 presidential candidate polls from en.wikipedia.

The polling lives in the "2027 Argentine general election" article's
"Opinion polls" -> "Pre-campaign period" section: a candidate table
(Milei LLA, Kicillof PJ-FP, Kirchner, Massa FR-FP, Moreno PyV-FP,
Grabois PG-FP, Macri PRO, Schiaretti PU, Bregman FIT-U, Villarruel PD,
Gebel Ind.). A dash means the candidate was not tested in that poll; the
site's field selector handles the alternative fields.

Output schema matches the other country scrapers (data/argentina/
polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/2027_Argentine_general_election"
COUNTRY = "argentina"
CUTOFF = "2025-06-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}
# header token (first word, lower) -> config key
COL_MAP = {"milei": "milei", "kicillof": "kicillof", "kirchner": "kirchner",
           "massa": "massa", "moreno": "moreno", "grabois": "grabois",
           "macri": "macri", "schiaretti": "schiaretti",
           "bregman": "bregman", "villarruel": "villarruel",
           "gebel": "gebel"}
KNOWN = set(COL_MAP.values())
MIN_CANDIDATES = 4


def expand_grid(table):
    rows = table.find_all("tr")
    grid, metas = [], []
    live = {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out, mrow = [], []
        col = i = 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                mrow.append(live[col][1])
                live[col] = (live[col][0] - 1, live[col][1])
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(c.get("colspan") or 1)
            rs = int(c.get("rowspan") or 1)
            for k in range(cs):
                out.append(txt)
                mrow.append(txt)
                if rs > 1:
                    live[col + k] = (rs - 1, txt)
            col += cs
            i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1])
            mrow.append(live[col][1])
            live[col] = (live[col][0] - 1, live[col][1])
            col += 1
        grid.append(out)
        metas.append(mrow)
    return grid, metas


def parse_period(text):
    """'2–9 Sep 2026' -> (start, end) ISO; '5 Mar' -> yearless guess."""
    t = re.sub(r"\[\s*\w+\s*\]", "", text or "").strip()
    m = re.match(r"(\d{1,2})?\s*[–—-]\s*(\d{1,2})\s+([A-Za-z]{3})\.?\s*(\d{4})?", t)
    if m:
        mon = MONTHS.get(m.group(3).lower())
        if mon and m.group(4):
            return None, "%s-%02d-%02d" % (m.group(4), mon, int(m.group(2)))
    m = re.match(r"(\d{1,2})\s+([A-Za-z]{3})\.?\s*(\d{4})", t)
    if m:
        mon = MONTHS.get(m.group(2).lower())
        if mon:
            return None, "%s-%02d-%02d" % (m.group(3), mon, int(m.group(1)))
    m = re.match(r"([A-Za-z]{3})\.?\s+(\d{4})", t)
    if m:
        mon = MONTHS.get(m.group(1).lower())
        if mon:
            return None, "%s-%02d-01" % (m.group(2), mon)
    return None, None


def pct(s):
    m = re.search(r"(\d+(?:[.,]\d+)?)", (s or "").replace(",", "."))
    return float(m.group(1)) if m else None


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=180)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        grid, _ = expand_grid(el)
        if len(grid) < 8:
            continue
        # candidate table: header rows carry the candidate tokens
        cand_col = {}
        for ri in range(min(3, len(grid))):
            for col, cell in enumerate(grid[ri]):
                tok = re.sub(r"[^a-z]", "", (cell or "").split(" ")[0].lower())
                if tok in COL_MAP and col not in cand_col:
                    cand_col[col] = COL_MAP[tok]
        if len(set(cand_col.values())) < MIN_CANDIDATES:
            continue
        # data rows: col 0 = fieldwork date, col 1 = polling firm
        for row in grid:
            if len(row) < 4:
                continue
            _, date = parse_period(row[0])
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*\w+\s*\]", "", row[1]).strip()
            if not pollster or len(pollster) < 3:
                continue
            if re.search(r"\b(election|result)\b", pollster, re.I):
                continue
            votes = {}
            for col, key in cand_col.items():
                v = pct(row[col]) if col < len(row) else None
                if v is not None and row[col] not in ("–", "—", "-"):
                    votes[key] = v
            if len(votes) < MIN_CANDIDATES:
                continue
            try:
                n = int(re.sub(r"\D", "", row[2]) or 0) or 1000
            except ValueError:
                n = 1000
            polls.append({"pollster": pollster, "date": date, "votes": votes,
                          "n": n})
    # dedupe (pollster, date)
    seen, out = set(), []
    for p in sorted(polls, key=lambda x: x["date"], reverse=True):
        k = (p["pollster"], p["date"])
        if k in seen:
            continue
        seen.add(k)
        out.append(p)
    return out


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape()
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps({
        "country": COUNTRY,
        "sources": [{"name": "Wikipedia", "url": WIKI_URL}],
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Scraped {len(polls)} polls -> {out}")
    if polls:
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:20s} n={p['n']:<6d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
