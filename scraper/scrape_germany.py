#!/usr/bin/env python3
"""Scrape German federal (Bundestag) opinion polls from en.wikipedia.

Polls are national Zweitstimme vote shares (%). Germany elects 630 MPs in
a single national district with a 5% threshold (Sainte-Laguë/Schepers).
Tables live in "Opinion polling for the next German federal election";
the main table has one "Union" column (CDU/CSU combined), a second format
lists CDU and CSU separately - both are folded into the cdu key. Polls
before the 2025 election are dropped; the election row is skipped.

Output schema matches the other country scrapers (data/germany/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_German_federal_election")
COUNTRY = "germany"
CUTOFF = "2025-03-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

HEADER_MAP = {
    "union": "cdu", "cdu": "cdu", "cdu/csu": "cdu", "csu": "cdu",
    "spd": "spd",
    "grüne": "gruene", "grune": "gruene", "greens": "gruene",
    "linke": "linke", "the left": "linke",
    "afd": "afd", "bsw": "bsw", "fdp": "fdp",
}
KNOWN = {"cdu", "spd", "gruene", "linke", "afd", "fdp", "bsw"}
MIN_PARTIES = 3


def expand_grid(table):
    """Expand a <table> into (grid, metas) with rowspan/colspan handling."""
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


def norm_header(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "")
    for ch in "\u2013\u2014\u2015\u2011":
        text = text.replace(ch, "-")
    text = re.sub(r"\s+", " ", text).strip().lower()
    return re.sub(r"\s*-\s*", "-", text)


def parse_date(text, ref_year=None):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    if not text or text.lower() in ("-", "–", "—", "n/a"):
        return None
    year_m = re.search(r"\b(20\d{2})\b", text)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
        return None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]+)", text)
    if dates:
        day, mon_name = dates[-1]
        mon = MONTHS.get(mon_name.lower()[:3])
    else:
        mon_m = re.search(r"([A-Za-z]{3,})", text)
        mon = MONTHS.get(mon_m.group(1).lower()[:3]) if mon_m else None
        day = 15
    if not mon:
        return None
    try:
        return datetime(year, mon, int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_pct(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip().replace(",", ".")
    text = re.sub(r"[¹²³°\u2070-\u207f]+", "", text)
    if not text or text in ("-", "–", "—"):
        return None
    if not re.fullmatch(r"\d+(?:\.\d+)?", text):
        return None
    return float(text)


def scrape_germany():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        grid, metas = expand_grid(el)
        if not grid:
            continue

        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 3
                or not parse_date(grid[header_end][1])):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue

        ncol = max(len(r) for r in grid[:header_end])
        hdr = [""] * ncol
        for col in range(ncol):
            for ri in range(header_end):
                if col < len(grid[ri]) and grid[ri][col]:
                    hdr[col] = grid[ri][col]
        mapped = [HEADER_MAP.get(norm_header(h)) for h in hdr]
        if sum(1 for m in mapped if m) < MIN_PARTIES:
            continue

        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 4:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0])
            pollster = re.sub(r"\s+", " ", pollster).strip()
            if not pollster or len(pollster) < 3:
                continue
            if "election" in pollster.lower():
                continue
            date = parse_date(row[1])
            if not date or date < CUTOFF:
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
                pct = parse_pct(txt)
                if pct is None:
                    continue
                if span > 1 and len(set(keys)) > 1:
                    votes[keys[0]] = pct      # merged cell -> leftmost party
                elif len(set(keys)) == 1:
                    votes[keys[0]] = votes.get(keys[0], 0) + pct
                else:
                    votes[keys[0]] = votes.get(keys[0], 0) + pct

            votes = {k: v for k, v in votes.items() if k in KNOWN}
            if len(votes) < MIN_PARTIES:
                continue
            if not 40 <= sum(votes.values()) <= 115:
                continue
            key = (pollster.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({"pollster": pollster, "date": date, "n": n,
                          "country": COUNTRY, "source": "Wikipedia",
                          "source_url": WIKI_URL, "votes": votes})

    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_germany()
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
            print(f"  {p['date']} {p['pollster']:20s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
