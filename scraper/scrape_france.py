#!/usr/bin/env python3
"""Scrape French presidential election opinion polls from en.wikipedia.

France is a two-round presidential race and its 2027 candidate field is
UNSETTLED: the "First round" tables test alternative hypothetical fields
(the same pollster/fieldwork date appears in several rows, each testing a
different candidate combination, and the field widens/narrows between
periods - 19 to 33 columns). Handling:

  - the First round section (h2) only; the "Second round" section's pair
    tables and the scenario sections (Bardella runs / generic / 2022 re-run)
    are parsed separately or skipped by construction;
  - rows sharing (pollster, fieldwork end date) are MERGED, each candidate
    taking the first value tested for them - one pollster-date contributes
    one number per candidate, never two;
  - candidates are matched by their linked name (the header text carries a
    "(party)" suffix in some periods); names not in the config's candidate
    list are dropped (they fold into the app's "Other");
  - head-to-head runoff pairs come from the "X vs. Y" section headings and
    merge into the matching first-round poll by (pollster, date) or stand
    alone (the runoff average reads p.runoff independently).

Writes data/france/polls.json (schema matches data/brazil/polls.json:
fieldwork_start + date, n, votes, runoff).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_2027_French_presidential_election")
COUNTRY = "france"
CUTOFF = "2022-04-11"          # after the 10 April 2022 first round
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

# candidate name (lowercase, accent-exact) -> config key
NAME_MAP = {
    "nathalie arthaud": "arthaud",
    "jean-luc m\u00e9lenchon": "melenchon",
    "fabien roussel": "roussel",
    "fran\u00e7ois ruffin": "ruffin",
    "marine tondelier": "tondelier",
    "emmanuel maurel": "maurel",
    "s\u00e9gol\u00e8ne royal": "royal",
    "olivier faure": "faure",
    "karim bouamrane": "bouamrane",
    "j\u00e9r\u00f4me guedj": "guedj",
    "fran\u00e7ois hollande": "hollande",
    "rapha\u00ebl glucksmann": "glucksmann",
    "gabriel attal": "attal",
    "bruno le maire": "lemaire",
    "\u00e9douard philippe": "philippe",
    "dominique de villepin": "villepin",
    "xavier bertrand": "bertrand",
    "david lisnard": "lisnard",
    "bruno retailleau": "retailleau",
    "nicolas dupont-aignan": "dupont",
    "marine le pen": "lepen",
    "sarah knafo": "knafo",
    "\u00e9ric zemmour": "zemmour",
    "laurent wauquiez": "wauquiez",
}
KNOWN = set(NAME_MAP.values())
MIN_CANDIDATES = 4

# the second-round section headings use surnames only ("Philippe vs. Le Pen")
SURNAME_MAP = {
    "arthaud": "arthaud", "m\u00e9lenchon": "melenchon",
    "roussel": "roussel", "ruffin": "ruffin", "tondelier": "tondelier",
    "maurel": "maurel", "royal": "royal", "faure": "faure",
    "bouamrane": "bouamrane", "guedj": "guedj", "hollande": "hollande",
    "glucksmann": "glucksmann", "attal": "attal", "le maire": "lemaire",
    "philippe": "philippe", "villepin": "villepin", "bertrand": "bertrand",
    "lisnard": "lisnard", "retailleau": "retailleau",
    "dupont-aignan": "dupont", "le pen": "lepen", "knafo": "knafo",
    "zemmour": "zemmour", "wauquiez": "wauquiez",
}


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
            if not txt:
                img = c.find("img")
                if img:
                    txt = (img.get("alt") or "").strip()
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
    t = re.sub(r"\[[^\]]*\]", "", txt or "").strip()
    t = re.sub(r"\s*\((?:[^()]*)\)\s*$", "", t).strip().lower()
    return NAME_MAP.get(t)


def map_pair(title):
    """'Philippe vs. Le Pen' -> ('philippe', 'lepen') or None."""
    m = re.match(r"^(.+?)\s+vs\.?\s+(.+)$", title.strip())
    if not m:
        return None
    a = NAME_MAP.get(m.group(1).strip().lower()) or \
        SURNAME_MAP.get(m.group(1).strip().lower())
    b = NAME_MAP.get(m.group(2).strip().lower()) or \
        SURNAME_MAP.get(m.group(2).strip().lower())
    return (a, b) if a and b else None


def parse_period(text, ref_year=None):
    """'25- 29 Sep 2026' -> ('2026-09-25', '2026-09-29')."""
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
    if text.startswith("<"):
        text = text[1:]
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=180)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    first, runoff = [], []
    h2 = h3 = ""
    for el in soup.find_all(["h2", "h3", "table"]):
        if el.name == "h2":
            h2 = el.get_text(strip=True)
            h3 = ""
            continue
        if el.name == "h3":
            h3 = el.get_text(strip=True)
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        grid, _ = expand_grid(el)
        if not grid:
            continue
        hdr_txt = " ".join(grid[0])
        if "Polling" not in hdr_txt and "Pollster" not in hdr_txt:
            continue
        # data starts after the header row(s): first row whose col 1 parses
        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 2
                or not parse_period(grid[header_end][1])[1]):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue

        if h2 == "First round":
            ncol = max(len(r) for r in grid[:header_end])
            cand_col = {}
            sample_col = None
            for col in range(ncol):
                for ri in range(header_end):
                    if col < len(grid[ri]) and grid[ri][col]:
                        key = map_candidate(grid[ri][col])
                        if key:
                            cand_col[col] = key
                        if "sample" in grid[ri][col].lower():
                            sample_col = col
            if len(set(cand_col.values())) < MIN_CANDIDATES:
                continue
            for ri in range(header_end, len(grid)):
                row = grid[ri]
                if len(row) < 5:
                    continue
                start, date = parse_period(row[1])
                if not date or date < CUTOFF:
                    continue
                pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0])
                pollster = re.sub(r"\s+", " ", pollster).strip()
                if not pollster or len(pollster) < 3 or len(pollster) > 60:
                    continue
                if re.search(r"\b(result|results|election|actual)\b",
                             pollster, re.I):
                    continue
                n = 0
                if sample_col is not None and sample_col < len(row):
                    digits = re.sub(r"[^\d]", "", row[sample_col])
                    if digits.isdigit():
                        n = int(digits)
                values = {}
                for col, key in cand_col.items():
                    if col >= len(row):
                        continue
                    v = parse_num(row[col])
                    if v is not None:
                        values[key] = v
                if len(values) < MIN_CANDIDATES:
                    continue
                if not 80 <= sum(values.values()) <= 110:
                    continue
                first.append({"pollster": pollster, "fieldwork_start": start,
                              "date": date, "n": n, "votes": values})
        elif h2 == "Second round":
            pair = map_pair(h3)
            if not pair:
                continue
            for ri in range(header_end, len(grid)):
                row = grid[ri]
                if len(row) < 5:
                    continue
                start, date = parse_period(row[1])
                if not date or date < CUTOFF:
                    continue
                pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0])
                pollster = re.sub(r"\s+", " ", pollster).strip()
                if not pollster or len(pollster) < 3:
                    continue
                if re.search(r"\b(result|results|election|actual)\b",
                             pollster, re.I):
                    continue
                n = 0
                digits = re.sub(r"[^\d]", "", row[2] if len(row) > 2 else "")
                if digits.isdigit():
                    n = int(digits)
                va = parse_num(row[3] if len(row) > 3 else "")
                vb = parse_num(row[4] if len(row) > 4 else "")
                if va is None or vb is None:
                    continue
                total = va + vb
                if total <= 0:
                    continue
                runoff.append({
                    "pollster": pollster, "date": date, "n": n,
                    "runoff": {pair[0]: round(va * 100 / total, 1),
                               pair[1]: round(vb * 100 / total, 1)},
                })

    # merge scenario rows: one pollster-date, one value per candidate
    merged = {}
    for p in first:
        key = (p["pollster"].lower(), p["date"])
        if key not in merged:
            merged[key] = p
            continue
        tgt = merged[key]
        for k, v in p["votes"].items():
            tgt["votes"].setdefault(k, v)
        if not tgt["n"] and p["n"]:
            tgt["n"] = p["n"]
    # merge runoff pairs into the matching first-round poll
    for r in runoff:
        key = (r["pollster"].lower(), r["date"])
        if key in merged:
            merged[key].setdefault("runoff", r["runoff"])
        else:
            merged[key] = {"pollster": r["pollster"], "date": r["date"],
                           "n": r.get("n", 0), "votes": {},
                           "runoff": r["runoff"],
                           "fieldwork_start": r["date"]}
    polls = list(merged.values())
    for p in polls:
        p["country"] = COUNTRY
        p["source"] = "Wikipedia"
        p["source_url"] = WIKI_URL
    polls = canonicalize_polls(polls)
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape()
    n_ro = sum(1 for p in polls if p.get("runoff"))
    print(f"Scraped {len(polls)} polls ({n_ro} with runoff)")
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
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:5]
            ro = p.get("runoff")
            print(f"  {p['date']} {p['pollster']:22s} n={p['n']:<6d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}"
                  + (f" | runoff {ro}" if ro else ""))


if __name__ == "__main__":
    main()
