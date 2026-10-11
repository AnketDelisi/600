#!/usr/bin/env python3
"""Scrape Icelandic parliamentary election opinion polls from is.wikipedia.

Polls are national party-support shares (%) for the next Althing election
(the 2024 election was on 30 November 2024). The is-wiki "Næstu
alþingiskosningar" page carries one table (53 rows): Fyrirtæki | Síðasti
dagur | Úrtak | Svarhlutfall | S | D | C | F | M | B | J | P | V | Aðrir |
Forskot. Icelandic decimal commas; the last row is the 2024 election itself
and is skipped. The en-wiki "next" polling title redirects to the stale 2021
article, so is-wiki is the live source.

Output schema matches the other country scrapers (data/is/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls
from scrape_spain import expand_grid

WIKI_URL = "https://is.wikipedia.org/wiki/N%C3%A6stu_al%C3%BEingiskosningar"
COUNTRY = "is"
CUTOFF = "2024-12-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "mai": 5, "jun": 6,
          "jul": 7, "agu": 8, "sep": 9, "okt": 10, "nov": 11, "des": 12}
# table column order: S D C F M B J P V
COLS = {4: "s", 5: "d", 6: "c", 7: "f", 8: "m", 9: "b", 10: "j", 11: "p",
        12: "v"}
MIN_PARTIES = 3


def parse_date(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip().lower()
    m = re.match(r"\s*(\d{1,2})\.\s*([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fd"
                 r"\u00e6\u00f6\u00f0\u00fe]+)\.?\s*(\d{4})", text)
    if not m:
        return None
    mon = MONTHS.get(m.group(2)[:3])
    if not mon:
        return None
    try:
        return "%04d-%02d-%02d" % (int(m.group(3)), mon, int(m.group(1)))
    except ValueError:
        return None


def parse_share(text):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    m = re.match(r"(\d+(?:,\d+)?)", text)
    if not m:
        return None
    v = float(m.group(1).replace(",", "."))
    return v if 0 <= v <= 100 else None


def parse_sample(text):
    digits = re.sub(r"[^\d]", "", re.sub(r"\[\d+\]", "", text or ""))
    return int(digits) if digits and 100 <= int(digits) <= 100000 else 0


def scrape():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=180)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    table = None
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) > 40:
            table = tb
            break
    assert table is not None, "polling table not found"
    grid, _ = expand_grid(table)
    head = [str(c).strip() for c in grid[0]]
    assert head[0] == "Fyrirtæki" and head[1].startswith("Síðasti dagur"), \
        head[:2]

    polls, seen = [], set()
    for ri in range(2, len(grid)):
        texts = grid[ri]
        if len(texts) < 14:
            continue
        date = parse_date(texts[1])
        if not date or date < CUTOFF:
            continue
        pollster = re.sub(r"\[\s*[^\]]*\s*\]", "", texts[0]).strip()
        if not pollster or len(pollster) < 2:
            continue
        low = pollster.lower()
        if any(w in low for w in ("kosning", "election", "result")):
            continue
        n = parse_sample(texts[2])
        votes = {}
        for ci, key in COLS.items():
            v = parse_share(texts[ci])
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
            "source": "Wikipedia (is)",
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
        "source": "Wikipedia (is)",
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
