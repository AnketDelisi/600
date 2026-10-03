#!/usr/bin/env python3
"""Scrape Spanish general election opinion polls from en.wikipedia.

Polls are national vote shares (%). Spain elects 350 MPs in 52
constituencies (provinces) by D'Hondt with a 3% threshold per
constituency. Only the "Voting intention estimates" tables are read (the
voting-preferences, hypothetical-scenario, sub-national and leadership
tables poll different things). Party columns carry logo images; the
header is mapped from the image alt (Adelante Andalucia has an empty alt
and is matched by its file name). Each data cell holds "share seats"
(e.g. "33.9 145" or "32.7 142/144"): the leading number is the share.
The table's year comes from the div preceding the table.

Output schema matches the other country scrapers (data/spain/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = ("https://en.wikipedia.org/wiki/"
            "Opinion_polling_for_the_next_Spanish_general_election")
SUB_URL = ("https://en.wikipedia.org/wiki/"
           "Sub-national_opinion_polling_for_the_next_Spanish_general_"
           "election")
COUNTRY = "spain"
CUTOFF = "2023-08-01"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

REGION = {
    "Andalusia": "andalucia", "Aragon": "aragon", "Asturias": "asturias",
    "Balearic Islands": "balears", "Basque Country": "pais_vasco",
    "Canary Islands": "canarias", "Cantabria": "cantabria",
    "Castile and León": "castilla_y_leon",
    "Castilla–La Mancha": "castilla_la_mancha",
    "Catalonia": "cataluna", "Extremadura": "extremadura",
    "Galicia": "galicia", "La Rioja": "rioja", "Madrid": "madrid",
    "Region of Murcia": "murcia", "Murcia": "murcia",
    "Navarre": "navarra", "Valencian Community": "valenciana",
}
N_REGIONAL = 8

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

ALT_MAP = {
    "pp": "pp", "psoe": "psoe", "psc": "psoe", "vox": "vox",
    "sumar": "sumar", "erc": "erc", "junts": "junts", "eh bildu": "bildu",
    "pnv": "pnv", "bng": "bng", "cca": "cc", "upn": "upn",
    "podemos": "podemos", "podem": "podemos", "salf": "salf",
    "aliança.cat": "ac", "alianca.cat": "ac",
    "adelante andalucía": "aa", "adelante andalucia": "aa",
}
KNOWN = {"pp", "psoe", "vox", "sumar", "erc", "junts", "bildu", "pnv",
         "bng", "cc", "upn", "aa", "podemos", "salf", "ac"}
MIN_PARTIES = 3


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
            img = c.find("img")
            if img and not txt:
                txt = (img.get("alt") or "").strip() or \
                    (img.get("src") or "").split("/")[-1]
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


def map_header(txt):
    t = re.sub(r"\[[^\]]*\]", "", txt or "").strip().lower()
    t = t.replace("_", " ")
    if t in ALT_MAP:
        return ALT_MAP[t]
    if "adelante" in t:
        return "aa"
    if "alian" in t:
        return "ac"
    if t.startswith("sumar"):
        return "sumar"
    if t in ("psc-psoe", "psdeg-psoe", "pse-ee/psoe"):
        return "psoe"
    return None


def parse_date(text, ref_year):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
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
        return datetime(year, mon, int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_share(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_spain():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    polls, seen = [], set()
    h2 = h3 = h4 = ""
    year = None
    for el in soup.find_all(["h2", "h3", "h4", "div", "table"]):
        if el.name == "h2":
            h2 = el.get_text(strip=True)
            continue
        if el.name == "h3":
            h3 = el.get_text(strip=True)
            continue
        if el.name == "h4":
            h4 = el.get_text(strip=True)
            continue
        if el.name == "div":
            m = re.fullmatch(r"\s*(20\d{2})\s*", el.get_text())
            if m:
                year = int(m.group(1))
            continue
        if h2 != "Electoral polling" or h3 != "Nationwide polling" or \
                h4 != "Voting intention estimates":
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        grid, metas = expand_grid(el)
        if not grid:
            continue
        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 3
                or not parse_date(grid[header_end][1], year)):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue
        ncol = max(len(r) for r in grid[:header_end])
        hdr = [""] * ncol
        for col in range(ncol):
            for ri in range(header_end):
                if col < len(grid[ri]) and grid[ri][col]:
                    hdr[col] = grid[ri][col]
        mapped = [map_header(h) for h in hdr]
        if sum(1 for m in mapped if m) < MIN_PARTIES:
            continue
        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 5:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0])
            pollster = re.sub(r"\s+", " ", pollster).strip()
            if not pollster or len(pollster) < 3:
                continue
            if "election" in pollster.lower():
                continue
            date = parse_date(row[1], year)
            if not date or date < CUTOFF:
                continue
            sample_text = re.sub(r"\[\w+\]", "", row[2]).strip()
            digits = sample_text.replace(",", "").replace(" ", "")
            n = int(digits) if digits.isdigit() else 0
            votes = {}
            for start, span, txt in metas[ri]:
                keys = [mapped[i] for i in range(start, min(start + span,
                                                           len(mapped)))
                        if i < len(mapped) and mapped[i]]
                keys = [k for k in keys if k in KNOWN]
                if not keys:
                    continue
                share = parse_share(txt)
                if share is None:
                    continue
                if span > 1 and len(set(keys)) > 1:
                    votes[keys[0]] = share
                else:
                    votes[keys[0]] = votes.get(keys[0], 0) + share
            votes = {k: v for k, v in votes.items() if k in KNOWN}
            if len(votes) < MIN_PARTIES:
                continue
            if not 40 <= sum(votes.values()) <= 110:
                continue
            key = (pollster.lower(), date)
            if key in seen:
                continue
            seen.add(key)
            polls.append({"pollster": pollster, "date": date, "n": n,
                          "country": COUNTRY, "source": "Wikipedia",
                          "source_url": WIKI_URL, "votes": votes})
    polls = canonicalize_polls(polls)
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls


def scrape_subnational():
    """Latest regional polling averages per autonomous community.

    These are used by the app as a *regional adjustment* blended into the
    2023-based district projection (not as the base point).
    """
    print(f"Fetching {SUB_URL}...")
    resp = requests.get(SUB_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    out = {}
    h3 = ""
    for el in soup.find_all(["h3", "table"]):
        if el.name == "h3":
            h3 = el.get_text(strip=True)
            continue
        key = REGION.get(h3)
        if not key or "wikitable" not in (el.get("class") or []):
            continue
        grid, metas = expand_grid(el)
        if not grid:
            continue
        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 3
                or not parse_date(grid[header_end][1], None)):
            header_end += 1
        if header_end == 0 or header_end >= len(grid):
            continue
        ncol = max(len(r) for r in grid[:header_end])
        hdr = [""] * ncol
        for col in range(ncol):
            for ri in range(header_end):
                if col < len(grid[ri]) and grid[ri][col]:
                    hdr[col] = grid[ri][col]
        mapped = [map_header(h) for h in hdr]
        if sum(1 for m in mapped if m) < MIN_PARTIES:
            continue
        polls = []
        for ri in range(header_end, len(grid)):
            row = grid[ri]
            if len(row) < 4:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0]).strip()
            if not pollster or "election" in pollster.lower():
                continue
            date = parse_date(row[1], None)
            if not date or date < CUTOFF:
                continue
            votes = {}
            for start, span, txt in metas[ri]:
                keys = [mapped[i] for i in range(start, min(start + span,
                                                           len(mapped)))
                        if i < len(mapped) and mapped[i]]
                keys = [k for k in keys if k in KNOWN]
                if not keys:
                    continue
                share = parse_share(txt)
                if share is None:
                    continue
                votes[keys[0]] = share
            if len(votes) < MIN_PARTIES:
                continue
            polls.append((date, votes))
        if not polls:
            continue
        polls.sort(key=lambda x: x[0])
        last = polls[-N_REGIONAL:]
        acc = {}
        for _d, votes in last:
            for p, v in votes.items():
                acc.setdefault(p, []).append(v)
        out[key] = {p: round(sum(vs) / len(vs), 2)
                    for p, vs in acc.items()}
    return out


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls = scrape_spain()
    print(f"Scraped {len(polls)} polls")
    regional = scrape_subnational()
    print(f"Regional averages: {len(regional)} communities")
    for k in sorted(regional):
        print(f"  {k:18s} {regional[k]}")
    out = OUTPUT_DIR / "polls.json"
    out.write_text(json.dumps({
        "country": COUNTRY,
        "source": "Wikipedia",
        "source_url": WIKI_URL,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count": len(polls),
        "polls": polls,
        "regional": regional,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")
    if polls:
        pollsters = sorted(set(p["pollster"] for p in polls))
        print(f"Pollsters ({len(pollsters)}): {', '.join(pollsters)}")
        print(f"Date range: {polls[-1]['date']} to {polls[0]['date']}")
        print("\nLatest 5:")
        for p in polls[:5]:
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:5]
            print(f"  {p['date']} {p['pollster']:28s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
