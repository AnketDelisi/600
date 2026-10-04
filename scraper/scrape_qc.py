#!/usr/bin/env python3
"""Scrape Quebec election opinion polls from en.wikipedia.

The "Opinion polls" table on the 2026 Quebec general election article
(CAQ / QS / PQ / Liberal / PCQ / Other / Lead). The article also has a
language-subsample table (francophone/anglophone) and small duplicate
tables, so only the largest table matching the main polling header is
used; polls are deduped by (pollster, date).

Output schema matches the other country scrapers (data/qc/polls.json).
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from pollster_norm import canonicalize_polls

WIKI_URL = "https://en.wikipedia.org/wiki/2026_Quebec_general_election"
# French Wikipedia leads for Quebec politics: its "Sondages" tables (split
# by year) carry final-campaign polls the English article misses (the
# Pallas and Mainstreet polls of October 3, 2026, for example)
FR_WIKI_URL = ("https://fr.wikipedia.org/wiki/"
               "%C3%89lections_g%C3%A9n%C3%A9rales_qu%C3%A9b%C3%A9coises_de_2026")
COUNTRY = "qc"
CUTOFF = "2022-10-04"          # after the 3 October 2022 election
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / COUNTRY

POLLSTER_ALIAS = {
    "leger": "léger", "mainstreet": "mainstreetresearch",
    "pallas": "pallasdata",
}
# raw spelling -> polished display name, applied before canonicalize_polls
# (which otherwise picks the most common raw variant, letting the French
# article's spellings out-vote the English ones, and leaves co-branded
# variants as separate pollsters)
POLLSTER_FIX = {
    "pallas": "Pallas Data",
    "mainstreet": "Mainstreet Research",
    "liaison": "Liaison Strategies",
    "segma/radio-canada": "Segma",
    "synopsis/la presse": "Synopsis",
    "abacus": "Abacus Data",
}

# Sub-national signal: the article's only regional polling is the
# francophone / non-francophone crosstab table. The app blends a regional
# adjustment into the national swing (never the base point, same pattern as
# Spain), so the crosstabs are weighted into two regions by rough 2021
# census mother-tongue shares:
#   mtl  = Montreal island + Laval + South Shore (~52% fr / 48% non-fr)
#   rest = the rest of Quebec (~92% fr / 8% non-fr)
# Non-francophone subsamples are small (n~150) and noisy; the 0.5 default
# regionalBlend in the app tempers them.
N_LANG = 4                     # most recent crosstab pairs to average
REGION_LANG_WEIGHTS = {"mtl": (0.52, 0.48), "rest": (0.92, 0.08)}
LANG_COLS = {"caq": "caq", "liberal": "plq", "pq": "pq", "qs": "qs",
             "pcq": "pcq"}

MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
          "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

FR_MONTHS = {"janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5,
             "juin": 6, "juillet": 7, "août": 8, "septembre": 9,
             "octobre": 10, "novembre": 11, "décembre": 12}
FR_COLS = {"CAQ": "caq", "PLQ": "plq", "QS": "qs", "PQ": "pq", "PCQ": "pcq"}


def parse_fr_date(s):
    """'3 octobre 2026' / '3 oct. 2026' -> ISO date."""
    m = re.match(r"(\d{1,2})\s+([a-zéûô]+)\.?\s+(\d{4})",
                 (s or "").strip().lower())
    if not m:
        return None
    mon = FR_MONTHS.get(m.group(2).rstrip("."))
    if not mon:
        return None
    return "%04d-%02d-%02d" % (int(m.group(3)), mon, int(m.group(1)))


def parse_fr_polls(soup):
    """Polls from the French article's Sondages tables (one per period)."""
    polls = []
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        rows = el.find_all("tr")
        if len(rows) < 4:
            continue
        hdr = [c.get_text(" ", strip=True).replace("\u200b", "")
               for c in rows[0].find_all(["th", "td"])]
        if "Sondeur" not in hdr or "CAQ" not in hdr:
            continue
        pi = hdr.index("Sondeur")
        ni = hdr.index("Échantillon") if "Échantillon" in hdr else None
        cols = {i: FR_COLS[h.strip()] for i, h in enumerate(hdr)
                if h.strip() in FR_COLS}
        if len(cols) < MIN_PARTIES:
            continue
        for row in rows[1:]:
            cells = [c.get_text(" ", strip=True)
                     for c in row.find_all(["th", "td"])]
            if len(cells) <= max(cols):
                continue
            date = parse_fr_date(cells[0])
            if not date or date < CUTOFF:
                continue
            pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "",
                              cells[pi] if pi < len(cells) else "").strip()
            if not pollster or len(pollster) < 3 or len(pollster) > 60:
                continue
            votes = {}
            for i, key in cols.items():
                if i < len(cells):
                    v = re.sub(r"[^\d,.]", "", cells[i]).replace(",", ".")
                    if v:
                        try:
                            votes[key] = float(v)
                        except ValueError:
                            pass
            votes = {k: v for k, v in votes.items() if k in KNOWN}
            if len(votes) < MIN_PARTIES:
                continue
            if not 60 <= sum(votes.values()) <= 110:
                continue
            n = 0
            if ni is not None and ni < len(cells):
                digits = re.sub(r"[^\d]", "", cells[ni])
                if digits:
                    n = int(digits)
            polls.append({"pollster": pollster, "fieldwork_start": date,
                          "date": date, "n": n, "country": COUNTRY,
                          "source": "Wikipedia (FR)",
                          "source_url": FR_WIKI_URL, "votes": votes})
    return polls

ALT_MAP = {
    "caq": "caq", "qs": "qs", "pq": "pq", "liberal": "plq", "plq": "plq",
    "pcq": "pcq",
}
KNOWN = set(ALT_MAP.values())
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
    return ALT_MAP.get(t)


def parse_date(text, ref_year=None):
    text = re.sub(r"\[\d+\]", "", text or "").strip()
    year_m = re.search(r"\b(20\d{2})\b", text)
    year = int(year_m.group(1)) if year_m else ref_year
    if not year:
        return None, None
    for ch in "\u2013\u2014\u2015":
        text = text.replace(ch, "-")
    dates = re.findall(r"([A-Za-z]{3,})\s*(\d{1,2})", text)
    if not dates:
        dates = [(m, d) for d, m in
                 re.findall(r"(\d{1,2})\s*([A-Za-z]{3,})", text)]
    parsed = []
    for mon_name, day in dates:
        mon = MONTHS.get(mon_name.lower()[:3])
        if not mon:
            continue
        try:
            parsed.append(datetime(year, mon, int(day)).strftime("%Y-%m-%d"))
        except ValueError:
            pass
    if not parsed:
        return None, None
    return parsed[0], parsed[-1]


def parse_share(text):
    text = re.sub(r"\[[^\]]*\]", "", text or "").strip()
    m = re.match(r"(\d+(?:[.,]\d+)?)", text)
    if not m:
        return None
    return float(m.group(1).replace(",", "."))


def scrape_language(soup):
    """Recent francophone/non-francophone crosstabs -> regional averages."""
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        rows = el.find_all("tr")
        head = " ".join(rows[0].get_text(" ", strip=True).split())
        if "Language" not in head or "Firm" not in head:
            continue
        grid, metas = expand_grid(el)
        cols = {}
        for i, h in enumerate(grid[0]):
            key = LANG_COLS.get(h.strip().lower())
            if key:
                cols[i] = key
        series = {"francophone": [], "non-francophone": []}
        for ri in range(1, len(grid)):
            row = grid[ri]
            if len(row) < 4:
                continue
            lang = row[2].strip().lower()
            if lang not in series:
                continue
            _, date = parse_date(row[0])
            if not date or date < CUTOFF:
                continue
            votes = {}
            for start_c, span, txt in metas[ri]:
                for i in range(start_c, min(start_c + span, len(row))):
                    if i in cols:
                        share = parse_share(txt)
                        if share is not None:
                            votes[cols[i]] = share
            if len(votes) >= MIN_PARTIES:
                series[lang].append((date, votes))
        if not all(series.values()):
            return {}
        regional = {}
        for lang, entries in series.items():
            entries.sort(key=lambda e: e[0], reverse=True)
            entries = entries[:N_LANG]
            regional[lang] = {
                p: sum(v.get(p, 0) for _, v in entries) / len(entries)
                for p in LANG_COLS.values()}
        out = {}
        for region, (wf, wn) in REGION_LANG_WEIGHTS.items():
            out[region] = {
                p: round(wf * regional["francophone"][p]
                         + wn * regional["non-francophone"][p], 1)
                for p in LANG_COLS.values()}
        return out
    return {}


def scrape_qc():
    print(f"Fetching {WIKI_URL}...")
    resp = requests.get(WIKI_URL,
                        headers={"User-Agent": "600-poll-scraper/1.0"},
                        timeout=60)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    candidates = []
    for el in soup.find_all("table"):
        if "wikitable" not in (el.get("class") or []):
            continue
        grid, metas = expand_grid(el)
        if not grid:
            continue
        header_end = 0
        while header_end < len(grid) and (
                len(grid[header_end]) < 3
                or not parse_date(grid[header_end][1])[1]):
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
        sample_col = next((i for i, h in enumerate(hdr)
                           if re.search(r"sample|taille", h, re.I)), None)
        candidates.append((len(grid), grid, metas, mapped, header_end,
                           sample_col))
    if not candidates:
        return []
    _, grid, metas, mapped, header_end, sample_col = max(
        candidates, key=lambda c: c[0])

    polls, seen = [], set()
    for ri in range(header_end, len(grid)):
        row = grid[ri]
        if len(row) < 6:
            continue
        start, date = parse_date(row[1])
        if not date or date < CUTOFF:
            continue
        pollster = re.sub(r"\[\s*[\w\d]+\s*\]", "", row[0])
        pollster = re.sub(r"\s+", " ", pollster).strip()
        if not pollster or len(pollster) < 3 or len(pollster) > 60:
            continue
        if "election" in pollster.lower():
            continue
        n = 0
        if sample_col is not None and sample_col < len(row):
            digits = re.sub(r"[^\d]", "", row[sample_col] or "")
            if digits:
                n = int(digits)
        votes = {}
        for start_c, span, txt in metas[ri]:
            keys = [mapped[i] for i in range(start_c,
                                              min(start_c + span,
                                                  len(mapped)))
                    if i < len(mapped) and mapped[i]]
            keys = [k for k in keys if k in KNOWN]
            if not keys:
                continue
            share = parse_share(txt)
            if share is None:
                continue
            votes[keys[0]] = share
        votes = {k: v for k, v in votes.items() if k in KNOWN}
        if len(votes) < MIN_PARTIES:
            continue
        if not 60 <= sum(votes.values()) <= 110:
            continue
        key = (pollster.lower(), date)
        if key in seen:
            continue
        seen.add(key)
        polls.append({"pollster": pollster, "fieldwork_start": start,
                      "date": date, "n": n, "country": COUNTRY,
                      "source": "Wikipedia", "source_url": WIKI_URL,
                      "votes": votes})
    print(f"Fetching {FR_WIKI_URL}...")
    resp_fr = requests.get(FR_WIKI_URL,
                           headers={"User-Agent": "600-poll-scraper/1.0"},
                           timeout=60)
    resp_fr.raise_for_status()
    fr_polls = parse_fr_polls(BeautifulSoup(resp_fr.text, "lxml"))
    print(f"French article: {len(fr_polls)} polls")
    polls.extend(fr_polls)
    for p in polls:
        fix = POLLSTER_FIX.get(
            re.sub(r"\s*/\s*", "/", p["pollster"]).strip().lower())
        if fix:
            p["pollster"] = fix
    polls = canonicalize_polls(polls, POLLSTER_ALIAS)
    # the same poll can appear on both wikis: dedupe on canonical name + date
    seen2, deduped = set(), []
    for p in polls:
        key = (p["pollster"].lower(), p["date"])
        if key in seen2:
            continue
        seen2.add(key)
        deduped.append(p)
    polls = deduped
    polls.sort(key=lambda p: p["date"], reverse=True)
    return polls, scrape_language(soup)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    polls, regional = scrape_qc()
    print(f"Scraped {len(polls)} polls")
    if regional:
        print("Regional averages (francophone/non-francophone crosstabs):")
        for k in sorted(regional):
            print(f"  {k:5s} {regional[k]}")
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
            top = sorted(p["votes"].items(), key=lambda x: -x[1])[:4]
            print(f"  {p['date']} {p['pollster']:22s} n={p['n']:<5d} "
                  f"{', '.join(f'{k}:{v}' for k, v in top)}")


if __name__ == "__main__":
    main()
