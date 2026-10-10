#!/usr/bin/env python3
"""Scrape the 2026 Japanese general election results (per district + per PR bloc).

Source: en.wikipedia "Results of the 2026 Japanese general election" (the
8 Feb 2026 snap election: LDP 316 seats). Per block section it carries a
single-member constituency table (winner + runner-up with votes/%) and a
proportional representation table (party votes/%/seats per bloc).

Output: data/jp/results.json
  districts: {key: {name, winner: {party, votes, pct}, runner: {party, votes, pct}}}
  blocs:     {key: {name, seats, parties: {party: {votes, pct, seats}}}}
  national:  {fptp: {party: pct}, pr: {party: pct}, seats: {party: n}}
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from scrape_spain import expand_grid

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "jp" / "results.json"
WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Results_of_the_2026_Japanese_general_election")
UA = {"User-Agent": "600-poll-scraper/1.0"}

PARTY_MAP = {
    "ldp": "ldp", "cra": "cra", "ishin": "ishin", "dpp": "dpfp",
    "dpfp": "dpfp", "sanseit\u014d": "sansei", "sanseito": "sansei",
    "sansei": "sansei", "team mirai": "mirai", "mirai": "mirai",
    "jcp": "jcp", "reiwa": "reiwa", "cdp": "cdp",
    "komei": "komei", "cpj": "cpj", "sdp": "sdp",
    "genzei\u2013yukoku": "other", "genzei-yukoku": "other",
    "genyu": "other", "ind.": "other",
    "independents": "other", "independent": "other",
    # full names (national tables)
    "liberal democratic party": "ldp",
    "centrist reform": "cra",
    "centrist reform alliance": "cra",
    "democratic party for the people": "dpfp",
    "japan innovation party": "ishin",
    "japanese communist party": "jcp",
    "reiwa shinsengumi": "reiwa",
    "constitutional democratic party": "cdp",
    "conservative party of japan": "cpj",
    "social democratic party": "sdp",
}

BLOCS = {
    "Hokkaido block": "hokkaido",
    "Tohoku block": "tohoku",
    "Northern Kanto block": "northern_kanto",
    "Southern Kanto block": "southern_kanto",
    "Tokyo block": "tokyo",
    "Hokuriku-Shin'etsu block": "hokuriku_shinetsu",
    "Tokai block": "tokai",
    "Kinki block": "kinki",
    "Chugoku block": "chugoku",
    "Shikoku block": "shikoku",
    "Kyushu block": "kyushu",
}


def fold(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("\u014d", "o").replace("\u016b", "u")
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def pkey(raw):
    return PARTY_MAP.get((raw or "").strip().lower())


def parse_pct(text):
    m = re.search(r"(\d+(?:\.\d+)?)", (text or "").replace(",", ""))
    return float(m.group(1)) if m else None


def parse_votes(text):
    m = re.match(r"\s*([\d,]+)", (text or ""))
    return int(m.group(1).replace(",", "")) if m else None


def main():
    r = requests.get(WIKI_URL, headers=UA, timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    (ROOT / "scraper" / ".cache").mkdir(parents=True, exist_ok=True)
    (ROOT / "scraper" / ".cache" / "jp_2026_results.html").write_text(
        r.text, encoding="utf8")

    tables = [t for t in soup.find_all("table")
              if "wikitable" in (t.get("class") or [])]

    districts, blocs = {}, {}
    for t in tables:
        head = " ".join(t.get_text(" ", strip=True).split())[:90]
        # single-member constituency table
        m = re.match(r"Single-member constituency results in (.+?) \[", head)
        if m and m.group(1) + " block" in BLOCS:
            grid, _ = expand_grid(t)
            for row in grid[1:]:
                if len(row) < 14:
                    continue
                dm = re.match(r"^(.+?)\s+(\d+)", row[0])
                if not dm:
                    continue
                key = "%s_%d" % (fold(dm.group(1)), int(dm.group(2)))
                w = pkey(row[6])
                ru = pkey(row[12])
                if not w:
                    continue
                districts[key] = {
                    "name": row[0],
                    "winner": {"party": w, "votes": parse_votes(row[7]),
                               "pct": parse_pct(row[8])},
                    "runner": {"party": ru or "other",
                               "votes": None, "pct": parse_pct(row[13])},
                }
            continue
        # PR table
        if head.startswith("Proportional representation results"):
            # find the owning bloc by walking back to the H2
            prev = t.find_previous("h2")
            if not prev:
                continue
            bname = " ".join(prev.get_text(" ", strip=True).split())
            if bname not in BLOCS:
                continue
            bk = BLOCS[bname]
            grid, _ = expand_grid(t)
            parties = {}
            for row in grid[1:]:
                if len(row) < 4:
                    continue
                pk = pkey(row[1])
                vm = re.match(r"([\d,]+)\s*\((\d+(?:\.\d+)?)%\)", row[2] or "")
                if pk and vm and pk not in parties:
                    nums = re.findall(r"\d+", row[3] or "")
                    if not nums:
                        continue
                    # "10 -> 4" = D'Hondt seats -> final allocation after the
                    # reallocation of seats forfeited by list exhaustion; the
                    # final number is the party's bloc seats
                    parties[pk] = {
                        "votes": int(vm.group(1).replace(",", "")),
                        "pct": float(vm.group(2)),
                        "seats": int(nums[-1]),
                    }
            if parties:
                blocs[bk] = {
                    "name": bname.replace(" block", ""),
                    "seats": sum(p["seats"] for p in parties.values()),
                    "parties": parties,
                }
            continue

    # national tables (first three wikitables)
    def nat_rows(t, min_cols=4):
        grid, _ = expand_grid(t)
        out = []
        for row in grid[1:]:
            if len(row) >= min_cols:
                out.append(row)
        return out

    seats = {}
    for row in nat_rows(tables[0]):
        pk = pkey(row[1])
        if pk and len(row) > 3 and re.match(r"^\d+$", (row[3] or "").strip()):
            seats[pk] = seats.get(pk, 0) + int(row[3])
    fptp, pr = {}, {}
    for row in nat_rows(tables[1]):
        pk = pkey(row[1])
        pct = parse_pct(row[2])
        if pk and pct is not None:
            fptp[pk] = pct
    for row in nat_rows(tables[2]):
        pk = pkey(row[1])
        pct = parse_pct(row[2])
        if pk and pct is not None:
            pr[pk] = pct

    out = {
        "country": "jp",
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "districts": districts,
        "blocs": blocs,
        "national": {"fptp": fptp, "pr": pr, "seats": seats},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf8")
    print("districts:", len(districts), "| blocs:", len(blocs),
          "| bloc seats:", sum(b["seats"] for b in blocs.values()))
    print("national seats:", seats)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
