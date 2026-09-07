#!/usr/bin/env python3
"""Scrape Berlin Abgeordnetenhaus opinion polls (Sonntagsfrage) from de.wikipedia.org.

Berlin poll table columns (varied order):
Institut | Auftraggeber | Zeitraum | CDU | SPD | Grüne | Linke | AfD | BSW | FDP | ... | Sonst. | Befragte
- Zeitraum (survey window, e.g. "12.–14.08.2026") -> date = END of window.
- Befragte (sample size) -> stored as n (unlike ST/MV which have no N column).
Issues vote shares in %.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://de.wikipedia.org/wiki/Wahl_zum_Abgeordnetenhaus_von_Berlin_2026"
COUNTRY = "berlin"
CUTOFF = "2025-01-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

HEADER_MAP = {
    "institut": "institute",
    "umfrage": "institute",
    "durchführendes institut": "institute",
    "zeitraum": "date",
    "datum": "date",
    "auftraggeber": "sponsor",
    "befragte": "n",
    "teilnehmer": "n",
    "cdu": "cdu",
    "spd": "spd",
    "grüne": "gruene",
    "grune": "gruene",
    "bündnis 90/die grünen": "gruene",
    "bündnis 90 / die grünen": "gruene",
    "linke": "linke",
    "die linke": "linke",
    "afd": "afd",
    "bsw": "bsw",
    "fdp": "fdp",
    "sonstige": "other",
    "sonste": "other",
}

PARTIES = ["cdu", "spd", "gruene", "linke", "afd", "bsw", "fdp"]
CORE = ["cdu", "spd", "gruene", "linke", "afd"]   # Berlin core five
REF_SKIP = {"abgeordnetenhauswahl 2026", "abgeordnetenhauswahl 2023", "abgeordnetenhauswahl 2021",
            "bundestagswahl", "europawahl", "sonstige"}


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


def parse_n(text):
    text = re.sub(r"\[\s*\w+\s*\]", "", text or "")
    text = text.replace("\u00a0", " ").replace("\u2013", "-").strip()
    if not text or text.lower() in ("–", "—", "-", "n/a"):
        return None
    m = re.search(r"(\d{1,3}(?:[.,]\d{3})*|\d+)", text)
    if not m:
        return None
    s = m.group(1).replace(".", "").replace(",", "")
    try:
        return int(s)
    except ValueError:
        return None


def scrape_berlin():
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

        header_idx = None
        for ri, row in enumerate(grid):
            keys = [HEADER_MAP.get(norm_header(h)) for h in row]
            npart = sum(1 for k in keys if k in PARTIES)
            if npart >= 6 and "date" in keys and ("institute" in keys or "sponsor" in keys):
                header_idx = ri
                col_keys = keys
                break
        if header_idx is None:
            continue

        col_ins = col_keys.index("institute") if "institute" in col_keys else \
            col_keys.index("sponsor")
        col_date = col_keys.index("date")
        col_n = col_keys.index("n") if "n" in col_keys else None
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
                continue
            date = parse_date(row[col_date])
            if not date or date < CUTOFF:
                continue
            n = parse_n(row[col_n]) if col_n is not None and col_n < len(row) else None

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
                "n": n,
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
    polls = scrape_berlin()
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
            print(f"  {p['date']} {p['pollster']:24s} n={p['n']}  {', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()