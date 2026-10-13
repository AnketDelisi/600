#!/usr/bin/env python3
"""Scrape Turkish general-election polls from the tr.wikipedia article.

The article groups tables by year ("2026", "2025", ...); each row is
Tarih | Anket şirketi | Örneklem | AKP | CHP | MHP | İYİ | DEM | YRP |
ZP | TİP | A | YEP | Diğer | Fark with comma decimals and dotted
thousands. Dates carry no year - it comes from the section heading.

Output schema matches the other country scrapers (data/turkey/polls.json).
"""

import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
from scrape_spain import expand_grid

WIKI_URL = ("https://tr.wikipedia.org/wiki/"
            "Bir_sonraki_T%C3%BCrkiye_genel_se%C3%A7imleri_i%C3%A7in_"
            "yap%C4%B1lan_anketler")
COUNTRY = "turkey"
CUTOFF = "2023-06-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"oca": 1, "şub": 2, "sub": 2, "mar": 3, "nis": 4, "may": 5,
          "haz": 6, "tem": 7, "ağu": 8, "agu": 8, "eyl": 9, "eki": 10,
          "kas": 11, "ara": 12}
COLS = {"akp": "akp", "chp": "chp", "mhp": "mhp", "iyi": "iyi",
        "dem": "dem", "yrp": "yrp", "zp": "zp", "tip": "tip",
        "a": "a", "yep": "yep"}


def norm_tok(s):
    """'İYİ'.lower() is 'i̇yi' (i + combining dot): strip combining marks."""
    s = unicodedata.normalize("NFKD", (s or "").lower())
    return "".join(c for c in s if not unicodedata.combining(c))
MIN_PARTIES = 3


def parse_date(text, year):
    """'29 Eyl-4 Eki' / '20-26 Ara' / '24 Temmuz' + the section year."""
    t = re.sub(r"\[\s*[^\[\]]*\]", "", text or "").strip()
    parts = re.findall(r"(\d{1,2})?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)", t)
    best = None
    for day, mon in parts:
        m = MONTHS.get(mon.lower())
        if m:
            best = (int(day) if day else 1, m)
    if not best:
        return None
    return "%04d-%02d-%02d" % (year, best[1], best[0])


def pct(s):
    m = re.search(r"(\d+(?:,\d+)?)", (s or "").strip())
    return float(m.group(1).replace(",", ".")) if m else None


def sample_n(s):
    m = re.search(r"(\d[\d.]*)", (s or ""))
    return int(m.group(1).replace(".", "")) if m else None


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=300)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    # walk the document so each table knows its year section
    polls = []
    year = None
    for el in soup.find_all(["h2", "h3", "table"]):
        if el.name in ("h2", "h3"):
            txt = " ".join(el.get_text(" ", strip=True).split())
            m = re.match(r"^(20\d\d)\b", txt)
            if m:
                year = int(m.group(1))
            continue
        if year is None or year < 2023:
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        if len(el.find_all("tr")) < 6:
            continue
        grid, _ = expand_grid(el)
        if not grid:
            continue
        cand_col = {}
        date_col = n_col = None
        seat_table = False
        for ri in range(min(2, len(grid))):
            for col, cell in enumerate(grid[ri]):
                low = norm_tok((cell or "").strip())
                if low == "analist":
                    seat_table = True
                if low in COLS and col not in cand_col:
                    cand_col[col] = COLS[low]
                if "tarih" in low and date_col is None:
                    date_col = col
                if "orneklem" in low and n_col is None:
                    n_col = col
        if seat_table:
            continue  # seat projection, not a vote poll
        if len(set(cand_col.values())) < MIN_PARTIES or date_col is None:
            continue
        for row in grid:
            if len(row) <= date_col + 1:
                continue
            date = parse_date(row[date_col], year)
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[^\[\]]*\]", "", row[1]).strip() \
                if len(row) > 1 else ""
            if not pollster or len(pollster) < 3:
                continue
            if re.search(r"(kuruldu|vefat|seçim|ittifak)", pollster, re.I):
                continue
            votes = {}
            for col, key in cand_col.items():
                v = pct(row[col]) if col < len(row) else None
                if v is not None:
                    votes[key] = v
            if len(votes) < MIN_PARTIES:
                continue
            if any(v > 100 for v in votes.values()):
                continue  # seat counts / stray columns
            n = sample_n(row[n_col]) if n_col and n_col < len(row) else None
            polls.append({"pollster": pollster, "date": date, "votes": votes,
                          "n": n or 1000})
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
        "sources": [{"name": "tr.wikipedia", "url": WIKI_URL}],
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Scraped {len(polls)} polls -> {out}")
    if polls:
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:22s} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)} n={p['n']}")


if __name__ == "__main__":
    main()
