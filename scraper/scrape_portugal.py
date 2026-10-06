#!/usr/bin/env python3
"""Scrape Portuguese legislative election opinion polls from en.wikipedia.

Polls are national vote shares (%) for the next legislative election (the
2025 election was on 18 May 2025; the next is due by October 2029). The
polling table's party columns carry logo images whose alt text names the
party (AD, PS, CH, IL, L, CDU, BE, PAN, plus one empty-alt column - JPP);
the header cells link to the party articles, used as a fallback.

Output schema matches the other country scrapers (data/pt/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_Portuguese_legislative_election")
COUNTRY = "pt"
CUTOFF = "2025-05-19"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

ALT_MAP = {"ad": "ad", "ps": "ps", "ch": "ch", "il": "il", "l": "livre",
           "livre": "livre", "cdu": "cdu", "be": "be", "pan": "pan",
           "jpp": "jpp"}
KNOWN = set(ALT_MAP.values())
MIN_PARTIES = 5


def party_of_cell(cell):
    img = cell.find("img")
    if img:
        alt = (img.get("alt") or "").strip().lower()
        if alt in ALT_MAP:
            return ALT_MAP[alt]
        src = (img.get("src") or "").rsplit("/", 1)[-1].lower()
        for k in ALT_MAP:
            if k and k in src:
                return ALT_MAP[k]
    a = cell.find("a")
    if a:
        title = (a.get("title") or "").strip().lower()
        for name, key in (("aliansa democratica", "ad"),
                          ("alianca democratica", "ad"),
                          ("partido socialista", "ps"),
                          ("chega", "ch"),
                          ("iniciativa liberal", "il"),
                          ("livre", "livre"),
                          ("unitaria", "cdu"),
                          ("bloco de esquerda", "be"),
                          ("pessoas-animais-natureza", "pan"),
                          ("juntos pelo povo", "jpp")):
            if name in title:
                return key
    return None


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
        if len(rows) < 8:
            continue
        hdr_cells = rows[0].find_all(["td", "th"])
        cols = {i: party_of_cell(c) for i, c in enumerate(hdr_cells)}
        if sum(1 for v in cols.values() if v) < MIN_PARTIES:
            continue
        for tr in rows[1:]:
            cells = tr.find_all(["td", "th"])
            if len(cells) < 6:
                continue
            texts = [" ".join(c.get_text(" ", strip=True).split())
                     for c in cells]
            date = parse_date(texts[1] if len(texts) > 1 else "")
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
            if "election" in low or "result" in low or "turnout" in low:
                continue
            sample_idx = 2 if parse_date(texts[1] if len(texts) > 1 else "") else None
            n = 0
            for k in (2, 3):
                if k < len(texts):
                    digits = texts[k].replace(",", "").replace(" ", "")
                    if digits.isdigit() and 100 <= int(digits) <= 100000:
                        n = int(digits)
                        break
            votes = {}
            for i, c in enumerate(cells):
                key = cols.get(i)
                if not key:
                    continue
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
                "pollster": pollster,
                "date": date,
                "n": n,
                "country": COUNTRY,
                "source": "Wikipedia",
                "source_url": WIKI_URL,
                "votes": votes,
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
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
    }
    path = OUTPUT_DIR / "polls.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                    encoding="utf8")
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
