#!/usr/bin/env python3
"""Scrape Brazilian presidential election opinion polls from en.wikipedia.

Brazil is a two-round presidential race: the "First round" tables give
candidate vote intentions (%) and the "Second round" tables give
head-to-head runoff pairs (Lula vs Bolsonaro, Lula vs Caiado, ...). Both
are read; runoff rows are merged into the matching first-round poll by
(pollster, fieldwork end date), or kept as runoff-only entries (the runoff
average reads p.runoff independently of p.votes).

Candidate columns are identified by their header text (Lula,
F. Bolsonaro, Caiado, Zema, Santos, Cury); other names (Freitas, Gomes,
Ratinho, Marcal, Haddad, J./M. Bolsonaro) fall into "Other".

Output schema matches data/brazil/polls.json (fieldwork_start + date, n,
votes, runoff).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_2026_Brazilian_presidential_election")
COUNTRY = "brazil"
CUTOFF = "2022-10-03"          # after the 2 October 2022 first round
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

POLLSTER_ALIAS = {}

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

# candidate header (first token, lowercased) -> config party key
CAND_MAP = {
    "lula": "lula",
    "f.": "flavio",            # F. Bolsonaro
    "caiado": "caiado",
    "zema": "zema",
    "santos": "renan",         # Renan Santos
    "cury": "cury",            # Augusto Cury
}
KNOWN = set(CAND_MAP.values())
MIN_CANDIDATES = 3


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


def map_candidate(txt):
    t = re.sub(r"\[[^\]]*\]", "", txt or "").strip().lower()
    first = t.split()[0] if t.split() else ""
    return CAND_MAP.get(first)


def parse_period(text, ref_year=None):
    """'10–13 Aug' -> ('2026-08-10', '2026-08-13'); year from text or h3."""
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
        return None, None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-z]{3,})", text)
    parsed = []
    for day, mon_name in dates:
        mon = MONTHS.get(mon_name.lower()[:3])
        if not mon:
            continue
        try:
            parsed.append(datetime(year, mon, int(day)).strftime("%Y-%m-%d"))
        except ValueError:
            pass
    if not parsed:
        return None, None
    return parsed[0], parsed[-1]


def parse_num(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_brazil():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=60)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    first, runoff = [], []
    h2 = h3 = h4 = ""
    for el in soup.find_all(["h2", "h3", "h4", "table"]):
        if el.name == "h2":
            h2 = el.get_text(strip=True)
            h3 = h4 = ""
            continue
        if el.name == "h3":
            h3 = el.get_text(strip=True)
            h4 = ""
            continue
        if el.name == "h4":
            h4 = el.get_text(strip=True)
            continue
        if h2 not in ("First round", "Second round"):
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        grid, metas = expand_grid(el)
        if not grid:
            continue
        hdr_txt = " ".join(grid[0])
        if "Aggregator" in hdr_txt or "Pollster" not in hdr_txt \
                and "Polling" not in hdr_txt:
            continue
        ref_year = int(h3) if re.fullmatch(r"20\d{2}", h3) else None
        # candidate columns: from the sub-header row(s) before the data
        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 2
                or not parse_period(grid[header_end][1], ref_year)[1]):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue
        ncol = max(len(r) for r in grid[:header_end])
        cand_col = {}
        sample_col = None
        others_col = None
        for col in range(ncol):
            for ri in range(header_end):
                if col < len(grid[ri]) and grid[ri][col]:
                    key = map_candidate(grid[ri][col])
                    if key:
                        cand_col[col] = key
                    low = grid[ri][col].lower()
                    if "sample" in low:
                        sample_col = col
                    elif low.startswith("other"):
                        others_col = col
        if len(set(cand_col.values())) < MIN_CANDIDATES:
            continue
        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 4:
                continue
            start, date = parse_period(row[1], ref_year)
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0])
            pollster = re.sub(r"\s+", " ", pollster).strip()
            if not pollster or len(pollster) < 3 or len(pollster) > 60:
                continue
            # after the 2026 first round the page carries the official result
            # as a row (pollster "Results", date October 4) - not a poll
            if re.search(r"\b(result|results|resultado|election|actual)\b",
                         pollster, re.I):
                continue
            sample_text = ""
            if sample_col is not None and sample_col < len(row):
                sample_text = row[sample_col]
            digits = sample_text.replace(",", "").replace(".", "")
            n = int(digits) if digits.isdigit() else 0
            values = {}
            for col, key in cand_col.items():
                if col >= len(row):
                    continue
                v = parse_num(row[col])
                if v is not None:
                    values[key] = v
            if h2 == "First round":
                values = {k: v for k, v in values.items() if k in KNOWN}
                if len(values) < MIN_CANDIDATES:
                    continue
                if not 40 <= sum(values.values()) <= 105:
                    continue
                # distribute the blank/null/undecided share: renormalize the
                # candidates plus the article's "Others" to 100% of decided
                # voters (the app then shows the other candidates as "Other")
                others = 0.0
                if others_col is not None and others_col < len(row):
                    others = parse_num(row[others_col]) or 0.0
                decided = sum(values.values()) + others
                if decided <= 0:
                    continue
                votes = {k: round(v * 100 / decided, 1)
                         for k, v in values.items()}
                first.append({"pollster": pollster, "fieldwork_start": start,
                              "date": date, "n": n, "votes": votes})
            else:
                pair = {k: v for k, v in values.items() if k in KNOWN}
                if len(pair) != 2:
                    continue
                # head-to-head shares are also reported among decided voters
                total = sum(pair.values())
                if total <= 0:
                    continue
                pair = {k: round(v * 100 / total, 1) for k, v in pair.items()}
                runoff.append({"pollster": pollster, "date": date,
                               "runoff": pair})

    # merge runoff pairs into the matching first-round poll
    by_key = {}
    for p in first:
        by_key[(p["pollster"].lower(), p["date"])] = p
    for r in runoff:
        key = (r["pollster"].lower(), r["date"])
        if key in by_key:
            # keep the headline matchup (first pair listed: Lula vs Bolsonaro)
            by_key[key].setdefault("runoff", r["runoff"])
        else:
            by_key[key] = {"pollster": r["pollster"], "date": r["date"],
                           "n": 0, "votes": {}, "runoff": r["runoff"]}
    polls = list(by_key.values())
    for p in polls:
        p["country"] = COUNTRY
        p["source"] = "Wikipedia"
        p["source_url"] = WIKI_URL
        p.setdefault("fieldwork_start", p["date"])
    polls = canonicalize_polls(polls, POLLSTER_ALIAS)
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_brazil()
    print(f"Scraped {len(polls)} polls "
          f"({sum(1 for p in polls if p.get('runoff'))} with runoff)")
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps({
        "country": COUNTRY,
        "sources": [{"name": "Wikipedia", "url": WIKI_URL}],
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
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            ro = p.get("runoff")
            print(f"  {p['date']} {p['pollster']:22s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}"
                  + (f" | runoff {ro}" if ro else ""))


if __name__ == "__main__":
    main()
