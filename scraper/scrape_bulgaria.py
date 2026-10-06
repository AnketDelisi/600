#!/usr/bin/env python3
"""Scrape Bulgarian parliamentary election opinion polls from en.wikipedia.

Polls are national vote shares (%) for the next parliamentary election (the
2026 election was on 19 April 2026: Progressive Bulgaria 131 seats, GERB-SDS
39, PP-DB 37, DPS 21, Revival 12). The polling table has plain-text party
headers (PB, GERB-SDS, PP, DB, DPS, Vaz., MECh, Veli., BSP, APS).

Output schema matches the other country scrapers (data/bg/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Next_Bulgarian_parliamentary_election")
COUNTRY = "bg"
CUTOFF = "2026-04-20"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

HDR_MAP = {
    "pb": "pb", "gerb–sds": "gerb", "gerb-sds": "gerb", "gerb": "gerb",
    "pp": "pp", "db": "db", "pp–db": "ppdb", "pp-db": "ppdb",
    "dps": "dps", "vaz.": "vaz", "vaz": "vaz", "vazrazhdane": "vaz",
    "mech": "mech", "veli.": "veli", "veli": "veli", "bsp": "bsp",
    "bsp–ol": "bsp", "bsp-ol": "bsp", "aps": "aps",
}
PARTIES = ["pb", "gerb", "pp", "db", "dps", "vaz", "mech", "veli", "bsp",
           "aps"]
MIN_PARTIES = 5


def parse_date(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    if not year_m:
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
        return datetime(int(year_m.group(1)), mon, int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_share(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    v = float(m.group(1).replace(",", "."))
    return v if 0 <= v <= 100 else None


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=60)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    for table in soup.find_all("table"):
        if "wikitable" not in (table.get("class") or []):
            continue
        rows = table.find_all("tr")
        if len(rows) < 6:
            continue
        hdr = [" ".join(c.get_text(" ", strip=True).split()).lower()
               for c in rows[0].find_all(["td", "th"])]
        cols = {}
        for i, h in enumerate(hdr):
            key = HDR_MAP.get(h)
            if key and key not in cols.values():
                cols[i] = key
        if len(cols) < MIN_PARTIES:
            continue
        for tr in rows[1:]:
            cells = tr.find_all(["td", "th"])
            if len(cells) < 5:
                continue
            texts = [" ".join(c.get_text(" ", strip=True).split())
                     for c in cells]
            date = parse_date(texts[1]) if len(texts) > 1 else None
            pollster = texts[0]
            if not date:
                date = parse_date(texts[0])
                pollster = texts[1] if len(texts) > 1 else ""
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", pollster).strip()
            if not pollster or len(pollster) < 3:
                continue
            low = pollster.lower()
            if "election" in low or "result" in low:
                continue
            n = 0
            for k in (2,):
                if k < len(texts):
                    digits = texts[k].replace(",", "").replace(" ", "")
                    if digits.isdigit() and 100 <= int(digits) <= 100000:
                        n = int(digits)
            votes = {}
            for i, key in cols.items():
                v = parse_share(texts[i] if i < len(texts) else "")
                if v is not None:
                    votes[key] = v
            if len(votes) < MIN_PARTIES:
                continue
            sig = (pollster, date)
            if sig in seen:
                continue
            seen.add(sig)
            polls.append({
                "pollster": pollster, "date": date, "n": n,
                "country": COUNTRY, "source": "Wikipedia",
                "source_url": WIKI_URL, "votes": votes,
            })
    polls.sort(key=lambda p: (p["date"], p["pollster"]))
    polls = canonicalize_polls(polls)
    return polls


def main():
    polls = scrape()
    print(f"Parsed {len(polls)} polls "
          f"(latest: {polls[-1]['date'] if polls else '-'})")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out = {
        "country": COUNTRY, "source": "Wikipedia", "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls), "polls": polls,
    }
    path = OUTPUT_DIR / "polls.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                    encoding="utf8")
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
