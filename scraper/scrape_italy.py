#!/usr/bin/env python3
"""Scrape Italian general election opinion polls from en.wikipedia.

Polls are national vote shares (%) for the next Chamber of Deputies
election. Only the "Party vote" tables are read (year by year; the
aggregator, approval-rating and preferred-PM tables are skipped). Party
columns are identified by their header text (FdI, PD, M5S, Lega, FI, A,
IV, AVS, +E, NM, FN); the minor-list columns (DSP, PLD, SUE, PTD, ScN,
Libertà, AP, Italexit, UP) fall into "Other".

Output schema matches the other country scrapers (data/italy/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_Italian_general_election")
COUNTRY = "italy"
CUTOFF = "2022-10-01"          # after the 25 September 2022 election
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

POLLSTER_ALIAS = {}

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

ALT_MAP = {
    "fdi": "fdi", "pd": "pd", "m5s": "m5s", "lega": "lega", "fi": "fi",
    "a": "a", "iv": "iv", "avs": "avs", "+e": "e", "+europa": "e",
    "nm": "nm", "fn": "fn",
}
KNOWN = set(ALT_MAP.values())
MIN_PARTIES = 4


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
                live[col][0] -= 1
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            img = c.find("img")
            if img and not txt:
                txt = (img.get("alt") or "").strip() or \
                    (img.get("src") or "").split("/")[-1]
            cs = int(re.match(r"\d+", c.get("colspan") or "1").group())
            rs = int(re.match(r"\d+", c.get("rowspan") or "1").group())
            mrow.append((col, cs, txt))
            for k in range(cs):
                out.append(txt)
                if rs > 1:
                    live[col + k] = [rs - 1, txt]
            col += cs
            i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1])
            live[col][0] -= 1
            col += 1
        grid.append(out)
        metas.append(mrow)
    return grid, metas


def map_header(txt):
    t = re.sub(r"\[[^\]]*\]", "", txt or "").strip().lower()
    return ALT_MAP.get(t)


def parse_date(text, ref_year=None):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
        return None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if not dates:
        return None
    day, mon_name = dates[-1]
    mon = MONTHS.get(mon_name.lower()[:3])
    if not mon:
        return None
    try:
        return datetime(year, mon, int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_share(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_italy():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    h2 = h3 = ""
    for el in soup.find_all(["h2", "h3", "table"]):
        if el.name == "h2":
            h2 = el.get_text(strip=True)
            continue
        if el.name == "h3":
            h3 = el.get_text(strip=True)
            continue
        if h2 != "Party vote":
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        ref_year = int(h3) if re.fullmatch(r"20\d{2}", h3) else None
        grid, metas = expand_grid(el)
        if not grid:
            continue
        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 3
                or not parse_date(grid[header_end][0], ref_year)):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue
        ncol = max(len(r) for r in grid[:header_end])
        hdr = [""] * ncol
        for col in range(ncol):
            for ri in range(header_end):
                if col < len(grid[ri]) and grid[ri][col]:
                    hdr[col] = grid[ri][col]
        mapped = [map_header(h) for h in hdr]
        if sum(1 for m in mapped if m) < MIN_PARTIES:
            continue
        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 5:
                continue
            date = parse_date(row[0], ref_year)
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[1])
            pollster = re.sub(r"\s+", " ", pollster).strip()
            if not pollster or len(pollster) < 3:
                continue
            if "election" in pollster.lower() or len(pollster) > 60:
                continue
            sample_text = re.sub(r"\[\w+\]", "", row[2]).strip()
            digits = sample_text.replace(",", "").replace(" ", "")
            n = int(digits) if digits.isdigit() else 0
            votes = {}
            for start, span, txt in metas[ri]:
                keys = [mapped[i] for i in range(start, min(start + span,
                                                           len(mapped)))
                        if i < len(mapped) and mapped[i]]
                keys = [k for k in keys if k in KNOWN]
                if not keys:
                    continue
                share = parse_share(txt)
                if share is None:
                    continue
                votes[keys[0]] = share
            votes = {k: v for k, v in votes.items() if k in KNOWN}
            if len(votes) < MIN_PARTIES:
                continue
            if not 40 <= sum(votes.values()) <= 110:
                continue
            key = (pollster.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({"pollster": pollster, "date": date, "n": n,
                          "country": COUNTRY, "source": "Wikipedia",
                          "source_url": WIKI_URL, "votes": votes})
    polls = canonicalize_polls(polls, POLLSTER_ALIAS)
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_italy()
    print(f"Scraped {len(polls)} polls")
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps({
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")
    if polls:
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        print("\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:5]
            print(f"  {p['date']} {p['pollster']:26s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
