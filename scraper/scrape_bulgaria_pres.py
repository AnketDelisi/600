#!/usr/bin/env python3
"""Scrape Bulgarian presidential election opinion polls from en.wikipedia.

First-round polls for the 25 October 2026 presidential election (27 tickets
registered; Iotova leads, Gyurov second, a runoff looks certain). The
polling table's candidate header row carries plain text with links
(Iotova Ind., Gyurov Ind., Kostadinov Revival, Vasilev MECh, Mihaylov
Velichie, Hristanov Ind.).

Output schema matches the other country scrapers
(data/bgpres/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls
from scrape_spain import expand_grid

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "2026_Bulgarian_presidential_election")
COUNTRY = "bgpres"
CUTOFF = "2026-07-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

CANDS = [("iotova", "iotova"), ("gyurov", "gyurov"),
         ("kostadinov", "kostadinov"), ("vasilev", "vasilev"),
         ("mihaylov", "mihaylov"), ("hristanov", "hristanov"),
         ("nota", "nota")]
# the Global Metrics poll asked about generic party-affiliated candidates,
# not the actual nominees (the article marks it [d])
SKIP = {("Global Metrics", "2026-07-11")}
PARTIES = [k for k, _ in CANDS]
MIN_CANDS = 3


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
        # the candidate header row carries plain text (Iotova Ind. etc.);
        # expand_grid aligns it with the data rows (the pollster/date/sample
        # cells sit in the rows above via rowspan)
        grid, metas = expand_grid(table)

        def is_name_cell(x):
            low = x.lower()
            return x and ".png" not in low and ".jpg" not in low \
                and ".svg" not in low

        cand_row = None
        for ri in range(min(5, len(grid))):
            texts = grid[ri]
            if any("Iotova" in x and is_name_cell(x) for x in texts) and \
                    any("Gyurov" in x and is_name_cell(x) for x in texts):
                cand_row = ri
                # party columns come from the whole header block: the
                # candidates sit in one row, NOTA in the row above
                cols = {}
                for rr in range(0, cand_row + 1):
                    for col, span, txt in metas[rr]:
                        low = txt.lower()
                        if not is_name_cell(txt):
                            continue
                        for key, _ in CANDS:
                            if low.startswith(key[:6]) and \
                                    key not in cols.values():
                                cols[col] = key
                break
        if cand_row is None or len(cols) < MIN_CANDS:
            continue
        for ri in range(cand_row + 1, len(grid)):
            texts = grid[ri]
            if len(texts) < 5:
                continue
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
            if len(votes) < MIN_CANDS:
                continue
            sig = (pollster, date)
            if sig in seen or sig in SKIP:
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
