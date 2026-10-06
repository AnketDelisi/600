#!/usr/bin/env python3
"""Scrape Hungarian parliamentary election opinion polls from en.wikipedia.

Polls are national vote shares (%) for the next parliamentary election
(the 2026 election was on 12 April 2026: Tisza 141 seats, Fidesz-KDNP 52,
Mi Hazank 6). The polling table's party columns carry logo images (TISZA,
Fidesz - with an empty alt, matched via the cell link or the file name -
MH as plain text, DK, MKKP); 'Others' and 'Lead' are skipped.

Output schema matches the other country scrapers (data/hu/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_Hungarian_parliamentary_election")
COUNTRY = "hu"
CUTOFF = "2026-04-13"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

ALT_MAP = {"tisza": "tisza", "dk": "dk", "mkkp": "mkkp", "mh": "mh"}
TEXT_MAP = {"tisza": "tisza", "fidesz": "fidesz", "fidesz-kdnp": "fidesz",
            "fidesz–kdnp": "fidesz", "mh": "mh", "mi hazank": "mh",
            "mi hazánk": "mh", "dk": "dk", "mkkp": "mkkp"}
KNOWN = {"tisza", "fidesz", "mh", "dk", "mkkp"}
MIN_PARTIES = 3


def party_of_cell(cell):
    img = cell.find("img")
    if img:
        alt = (img.get("alt") or "").strip().lower()
        if alt in ALT_MAP:
            return ALT_MAP[alt]
        src = (img.get("src") or "").rsplit("/", 1)[-1].lower()
        if "fidesz" in src:
            return "fidesz"
        if "tisza" in src:
            return "tisza"
        for k, v in ALT_MAP.items():
            if k in src:
                return v
    a = cell.find("a")
    if a:
        title = (a.get("title") or "").strip().lower()
        for name, key in (("fidesz", "fidesz"), ("tisza", "tisza"),
                          ("mi haz", "mh"), ("democratic coalition", "dk"),
                          ("two-tailed", "mkkp"), ("kétfarkú", "mkkp")):
            if name in title:
                return key
    txt = " ".join(cell.get_text(" ", strip=True).split()).lower()
    if txt in TEXT_MAP:
        return TEXT_MAP[txt]
    return None


def parse_date(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    if not year_m:
        return None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"(\d{1,2})\s*([A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]+)", text)
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
            date = parse_date(texts[0]) or parse_date(
                texts[1] if len(texts) > 1 else "")
            if not date or date < CUTOFF:
                continue
            pollster = texts[0] if parse_date(texts[1] if len(texts) > 1
                                              else "") else (
                texts[1] if len(texts) > 1 else "")
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", pollster).strip()
            if not pollster or len(pollster) < 3:
                continue
            low = pollster.lower()
            if "election" in low or "result" in low or "turnout" in low:
                continue
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
