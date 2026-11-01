#!/usr/bin/env python3
"""Scrape UK general election opinion polls from en.wikipedia.

The "Opinion polling for the next United Kingdom general election" article
has three big national tables (2024, 2025, 2026) with columns:
Date(s) conducted | Pollster | Client | Area | Sample size | Lab | Con |
Ref | LD | Grn | SNP | PC | [RB] | Others | Lead. Dates carry no year -
it comes from the section heading. Restore Britain (RB) appears from 2026.

Output schema matches the other country scrapers (data/uk/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_United_Kingdom_general_election")
SCOTLAND_URL = ("https://en.wikipedia.org/wiki/"
                "Opinion_polling_in_Scotland_for_the_next_United_Kingdom_general_election")
COUNTRY = "uk"
CUTOFF = "2024-07-05"          # after the 4 July 2024 election
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

POLLSTER_ALIAS = {}

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

ALT_MAP = {
    "lab": "lab", "con": "con", "ref": "ref", "ld": "lib", "grn": "grn",
    "snp": "snp", "pc": "plc", "rb": "res",
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
        return None, None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"([A-Za-z]{3,})\s*(\d{1,2})", text)
    if not dates:
        dates = [(m, d) for d, m in
                 re.findall(r"(\d{1,2})\s*([A-Za-z]{3,})", text)]
    parsed = []
    for mon_name, day in dates:
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


def parse_share(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_uk():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=120)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        rows = el.find_all("tr")
        if len(rows) < 40:
            continue
        head_txt = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Pollster" not in head_txt or "Sample" not in head_txt:
            continue
        h = el.find_previous(["h2", "h3"])
        section = " ".join(h.get_text(" ", strip=True).split()) if h else ""
        year_m = re.search(r"\b(20\d{2})\b", section)
        ref_year = int(year_m.group(1)) if year_m else None
        # only the three national tables sit under a year heading; this skips
        # the Scotland / Wales / tactical-voting scenario tables
        if ref_year is None:
            continue
        print(f"  table [{section[:20]}] {len(rows)} rows, year={ref_year}")
        grid, metas = expand_grid(el)
        # header row = the one containing 'Pollster'
        header_end = 0
        for ri in range(min(4, len(grid))):
            if any("pollster" in (c or "").lower() for c in grid[ri]):
                header_end = ri + 1
                break
        hdr = grid[header_end - 1]
        col_map = {}
        sample_col = None
        for i, htxt in enumerate(hdr):
            key = map_header(htxt)
            if key:
                col_map[i] = key
            if re.search(r"sample", htxt, re.I):
                sample_col = i
        if sum(1 for k in col_map.values()) < MIN_PARTIES:
            continue
        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 6:
                continue
            start, date = parse_date(row[0], ref_year)
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[1])
            pollster = re.sub(r"\s+", " ", pollster).strip()
            if not pollster or len(pollster) < 3 or len(pollster) > 60:
                continue
            if "election" in pollster.lower():
                continue
            n = 0
            if sample_col is not None and sample_col < len(row):
                digits = re.sub(r"[^\d]", "", row[sample_col] or "")
                if digits:
                    n = int(digits)
            votes = {}
            for start_c, span, txt in metas[ri]:
                for i in range(start_c, min(start_c + span, len(row))):
                    if i in col_map:
                        share = parse_share(txt)
                        if share is not None:
                            votes[col_map[i]] = share
            if len(votes) < MIN_PARTIES:
                continue
            if not 60 <= sum(votes.values()) <= 110:
                continue
            key = (pollster.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({"pollster": pollster, "fieldwork_start": start,
                          "date": date, "n": n, "country": COUNTRY,
                          "source": "Wikipedia", "source_url": WIKI_URL,
                          "votes": votes})
    polls = canonicalize_polls(polls, POLLSTER_ALIAS)
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def table_after_heading(soup, heading):
    """First wikitable after an exact h2/h3/h4 heading."""
    for h in soup.find_all(["h2", "h3", "h4"]):
        title = " ".join(h.get_text(" ", strip=True).split())
        if title != heading:
            continue
        t = h.find_next("table")
        if t is not None and "wikitable" in (t.get("class") or []):
            return t
    return None


def parse_regional_table(table, region, url, ref_year=2026):
    grid, metas = expand_grid(table)
    header_end = 0
    for ri in range(min(4, len(grid))):
        if any("pollster" in (c or "").lower() for c in grid[ri]):
            header_end = ri + 1
            break
    if not header_end:
        return []
    hdr = grid[header_end - 1]
    col_map, sample_col = {}, None
    for i, htxt in enumerate(hdr):
        key = map_header(htxt)
        if key:
            col_map[i] = key
        if re.search(r"sample", htxt, re.I):
            sample_col = i
    if len(col_map) < 3:
        return []
    polls = []
    for ri in range(header_end, len(grid)):
        row = grid[ri]
        if len(row) < 5:
            continue
        start, date = parse_date(row[0], ref_year)
        if not date or date < CUTOFF:
            continue
        pollster = re.sub(r"\[[^\]]*\]", "", row[1] or "")
        pollster = re.sub(r"\s+", " ", pollster).strip()
        if not pollster or len(pollster) < 3 or len(pollster) > 60:
            continue
        if "election" in pollster.lower():
            continue
        n = 0
        if sample_col is not None and sample_col < len(row):
            digits = re.sub(r"[^\d]", "", row[sample_col] or "")
            if digits:
                n = int(digits)
        votes = {}
        for start_c, span, txt in metas[ri]:
            for i in range(start_c, min(start_c + span, len(row))):
                if i in col_map:
                    share = parse_share(txt)
                    if share is not None:
                        votes[col_map[i]] = share
        if len(votes) < 3 or not 60 <= sum(votes.values()) <= 110:
            continue
        polls.append({"pollster": pollster, "date": date, "n": n,
                      "region": region, "votes": votes,
                      "source_url": url})
    return polls


def regional_averages(polls):
    """Recent-sample weighted regional average, normalized over polled parties."""
    now = datetime.now(timezone.utc)
    out = {}
    for region in sorted({p["region"] for p in polls}):
        rows = sorted((p for p in polls if p["region"] == region),
                      key=lambda p: p["date"], reverse=True)[:10]
        if len(rows) < 2:
            continue
        sums, weights = {}, 0.0
        for p in rows:
            try:
                age = (now - datetime.fromisoformat(p["date"] + "T00:00:00+00:00")).days
            except ValueError:
                age = 0
            w = max(1, min(1500, p.get("n") or 1000)) * (0.5 ** (max(0, age) / 120))
            weights += w
            for party, share in p["votes"].items():
                sums[party] = sums.get(party, 0.0) + w * share
        if weights <= 0 or not sums:
            continue
        avg = {party: value / weights for party, value in sums.items()}
        total = sum(avg.values())
        if total <= 0:
            continue
        out[region] = {party: round(100 * value / total, 2)
                       for party, value in avg.items()}
    return out


def scrape_regional():
    print("Fetching regional tables...")
    scot = BeautifulSoup(requests.get(
        SCOTLAND_URL, headers={"User-Agent": "600-poll-scraper/1.0"},
        timeout=120).text, "lxml")
    main = BeautifulSoup(requests.get(
        WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"},
        timeout=120).text, "lxml")
    polls = []
    for region, soup, heading, url in (
            ("scotland", scot, "Polls", SCOTLAND_URL),
            ("wales", main, "Wales", WIKI_URL),
            ("london", main, "London", WIKI_URL)):
        table = table_after_heading(soup, heading)
        if table is None:
            print("  missing table:", region)
            continue
        rows = parse_regional_table(table, region, url)
        print("  %s: %d polls" % (region, len(rows)))
        polls.extend(rows)
    return regional_averages(polls)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_uk()
    print(f"Scraped {len(polls)} polls")
    out = OUTPUT_DIR / "polls.json"
    previous = {}
    if out.exists():
        try:
            previous = json.loads(out.read_text(encoding="utf-8"))
        except Exception:
            previous = {}
    try:
        regional = scrape_regional()
    except Exception as exc:
        print("regional scrape failed:", exc)
        regional = previous.get("regional", {})
    if not regional:
        regional = previous.get("regional", {})
    out.write_text(json.dumps({
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "regional": regional,
        "polls": polls,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")
    if polls:
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters[:18])}")
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        print("\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:22s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
