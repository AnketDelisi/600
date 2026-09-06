#!/usr/bin/env python3
"""Scrape Saxony-Anhalt opinion polls (Sonntagsfrage) from de.wikipedia.org.

German state-election poll tables report VOTE SHARES in %. Columns are
Institut | Datum | CDU | AfD | Linke | SPD | FDP | Grüne | BSW | Sonst.
(the exact order varies per election). There is no sample-size column, so n
is stored as null and the site defaults the weight to n=1000.

The Wikipedia table has a leading caption/sub-header block plus reference
rows ("Bundestagswahl", "Europawahl", "Landtagswahl 2021") in italic that
must be skipped. We expand the table into a rowspan/colspan-aware grid,
locate the header row by matching >=6 recognized party headers, then read
each poll row by the mapped columns.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://de.wikipedia.org/wiki/Landtagswahl_in_Sachsen-Anhalt_2026"
COUNTRY = "saxony_anhalt"
TODAY = datetime.now()
CUTOFF = "2025-01-01"   # polls before the current campaign are dropped
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

# Normalized German column headers -> semantic key ("institute"/"date"/party key)
HEADER_MAP = {
    "institut": "institute",
    "datum": "date",
    "umfrage": "institute",
    "cdu": "cdu",
    "afd": "afd",
    "linke": "linke",
    "die linke": "linke",
    "spd": "spd",
    "fdp": "fdp",
    "grüne": "gruene",
    "grune": "gruene",
    "bündnis 90/die grünen": "gruene",
    "bündnis 90 / die grünen": "gruene",
    "bsw": "bsw",
}

PARTIES = ["cdu", "afd", "linke", "spd", "fdp", "gruene", "bsw"]
CORE = ["cdu", "afd", "linke", "spd", "gruene"]   # must all be present
# Reference rows in the table (italic) — exact Institute names, NOT a substring
# match ("wahl" would also hit "Forschungsgruppe Wahlen").
REF_SKIP = {"landtagswahl 2026", "landtagswahl 2021", "bundestagswahl", "europawahl"}


def norm_header(text):
    text = re.sub(r"\[\s*\w+\s*\]", "", text or "")
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    text = re.sub(r"\s*-\s*", "-", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def expand_grid(table):
    rows = table.find_all("tr")
    grid = []
    live = {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out = []
        col = 0
        i = 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col][0] -= 1
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(c.get("colspan") or 1)
            rs = int(c.get("rowspan") or 1)
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
    return grid


def parse_date(text):
    text = re.sub(r"\[\s*\w+\s*\]", "", text or "").strip()
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", text)
    if not m:
        return None
    try:
        d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None
    return d.strftime("%Y-%m-%d")


def parse_value(text):
    text = re.sub(r"\[\s*\w+\s*\]", "", text or "")
    text = re.sub(r"[\u00b9\u00b2\u00b3\u00b0\u2070-\u207f\u207a\u207b]+", "", text)
    text = text.replace("\u00a0", " ").replace("%", " ").strip()
    if not text or text.lower() in ("–", "—", "-", "n/a", "–%", "—%"):
        return None
    m = re.match(r"(-?\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_saxony_anhalt():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL, headers={"User-Agent": "600-poll-scraper/1.0"}, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls = []
    seen = set()

    for table in soup.find_all("table"):
        if "wikitable" not in (table.get("class") or []):
            continue
        grid = expand_grid(table)
        if not grid:
            continue

        # Locate the header row: >=6 recognized party/institute/date headers.
        header_idx = None
        for ri, row in enumerate(grid):
            keys = [HEADER_MAP.get(norm_header(h)) for h in row]
            npart = sum(1 for k in keys if k in PARTIES)
            if npart >= 6 and "date" in keys and "institute" in keys:
                header_idx = ri
                col_keys = keys
                break
        if header_idx is None:
            continue

        col_ins = col_keys.index("institute")
        col_date = col_keys.index("date")
        party_cols = [i for i, k in enumerate(col_keys) if k in PARTIES]
        if col_ins == col_date:
            continue

        for row in grid[header_idx + 1:]:
            if len(row) <= max(col_ins, col_date, max(party_cols)):
                continue
            institute = re.sub(r"\[\s*\w+\s*\]", "", row[col_ins]).strip()
            if len(institute) < 3:
                continue
            if institute.lower().strip() in REF_SKIP:
                continue   # reference rows: Bundestagswahl / Europawahl / Landtagswahl
            date = parse_date(row[col_date])
            if not date or date < CUTOFF:
                continue

            votes = {}
            for i in party_cols:
                v = parse_value(row[i])
                if v is not None:
                    votes[col_keys[i]] = v
            if not all(c in votes for c in CORE):
                continue
            if len(votes) < 6:
                continue

            key = (institute.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({
                "pollster": institute,
                "date": date,
                "votes": votes,
                "country": COUNTRY,
                "source": "Wikipedia",
                "source_url": WIKI_URL,
                "n": None,
            })

    uniq = []
    seen2 = set()
    for p in polls:
        k = (p["pollster"].lower(), p["date"], tuple(sorted(p["votes"].items())))
        if k not in seen2:
            seen2.add(k)
            uniq.append(p)
    uniq.sort(key=lambda p: p["date"], reverse=True)
    return uniq


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_saxony_anhalt()
    print(f"Scraped {len(polls)} polls")
    output = {
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")
    if polls:
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        print("\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:5]
            print(f"  {p['date']} {p['pollster']:24s} {', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()