#!/usr/bin/env python3
"""Parse per-race polling averages for 2026 U.S. races from Wikipedia.

Preference order per race:
  1. "Aggregate polls" table on the state-specific articles
     (270toWin / DDHQ / Race to the WH / Silver Bulletin / FiftyPlusOne
     averages) — take the "Average" row if present, else first data row.
  2. Simple average of the latest direct candidate polls (up to 5) if no
     aggregate table exists.

Sources:
  https://en.wikipedia.org/wiki/2026_United_States_Senate_election_in_<State>
  .../2026_United_States_gubernatorial_election_in_<State>
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "us"
HEADERS = {"User-Agent": "600-us-midterms/1.0"}

RACE_ID_MAP = {
    # races whose state-article title differs from a plain "in <State>"
    "Florida": "2026_United_States_Senate_special_election_in_Florida",
    "Ohio": "2026_United_States_Senate_special_election_in_Ohio",
}


def fetch(url):
    resp = requests.get(url, headers=HEADERS, timeout=40)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def pct(s):
    m = re.match(r"\s*(\d{1,3}(?:\.\d+)?)\s*%", s)
    return float(m.group(1)) if m else None


def party_cols(header):
    """Return (dem_idx, rep_idx) when both (D) and (R) are annotated, else None."""
    dem_i = rep_i = None
    for i, h in enumerate(header):
        if "(D" in h.upper():
            dem_i = i
        elif "(R" in h.upper():
            rep_i = i
    if dem_i is None or rep_i is None:
        return None
    return dem_i, rep_i


def parse_aggregate(soup):
    """Read the latest general-election 'Aggregate polls' table -> dict or None.

    A qualifying table has a candidate header annotated with both (R) and (D)
    plus an 'Average' data row. The latest such table in the article wins.
    """
    best = None
    for tbl in soup.find_all("table", class_="wikitable"):
        rows = tbl.find_all("tr")
        if len(rows) < 4:
            continue
        header = [c.get_text(" ", strip=True).replace("\u200b", "") for c in rows[0].find_all(["th", "td"])]
        cols = party_cols(header)
        if cols is None:
            continue
        dem_i, rep_i = cols
        chosen = None
        for row in rows[1:]:
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            if "average" in cells[0].lower():
                chosen = cells
        if chosen is None:
            continue
        # the Average row may skip merged 'Dates' columns -> realign by gap
        gap = len(header) - len(chosen)
        dem_i, rep_i = dem_i - gap, rep_i - gap
        if dem_i < 0 or rep_i < 0 or dem_i >= len(chosen) or rep_i >= len(chosen):
            continue
        d, r = pct(chosen[dem_i]), pct(chosen[rep_i])
        if d is None or r is None or not (60.0 <= d + r <= 100.0):
            # not a two-way general-election aggregate (e.g. primary/fragment)
            continue
        best = {"dem": round(d, 1), "rep": round(r, 1), "source": "Aggregate (Wikipedia)"}
    return best


def parse_direct(soup):
    """Simple average of the latest 5 polls of the newest (R)/(D) table."""
    best = None
    tables = soup.find_all("table", class_="wikitable")
    for tbl in tables[::-1]:  # newest matchup tables appear later
        rows = tbl.find_all("tr")
        if len(rows) < 4:
            continue
        header = [c.get_text(" ", strip=True).replace("\u200b", "") for c in rows[0].find_all(["th", "td"])]
        cols = party_cols(header)
        if cols is None:
            continue
        dem_i, rep_i = cols
        found = []
        for row in rows[1:]:
            cells = [c.get_text(" ", strip=True) for c in row.find_all(["th", "td"])]
            if len(cells) <= max(dem_i, rep_i):
                continue
            if not cells[0] or cells[0].lower() in ("average", ""):
                continue
            d, r = pct(cells[dem_i]), pct(cells[rep_i])
            if d is None or r is None:
                continue
            found.append((d, r))
        if len(found) < 3:
            continue
        last = found[-5:]
        return {
            "dem": round(sum(d for d, _ in last) / len(last), 1),
            "rep": round(sum(r for _, r in last) / len(last), 1),
            "source": "Simple avg (latest 5 polls)",
            "n_polls": len(last),
        }
    return best


def scrape_race(chamber, race):
    key = race["state"].replace(" ", "_")
    if chamber == "senate":
        tmpl = RACE_ID_MAP.get(key.split("_")[0])
        base = "2026_United_States_Senate_election_in_"
        url = "https://en.wikipedia.org/wiki/" + (tmpl or base + key)
    else:
        url = "https://en.wikipedia.org/wiki/2026_United_States_gubernatorial_election_in_" + key
    soup = fetch(url)
    if soup is None:
        return None
    agg = parse_aggregate(soup)
    if agg:
        return agg
    return parse_direct(soup)


def scrape_races(chamber):
    base = json.loads((OUTPUT_DIR / "races.json").read_text(encoding="utf-8"))
    results = {}
    races = base["races"][chamber]
    for race in races:
        label = race["state"].replace("_", " ")
        if chamber == "house":
            label += " " + race["district"]
        res = scrape_race(chamber, race) if chamber != "house" else None
        results[label] = res
        print(f"  {label}: {res}")
    return results


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Senate...")
    senate = scrape_races("senate")
    print("Governor...(shared state articles only)")
    governor = scrape_races("governor")
    out = {
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "senate": senate,
        "governor": governor,
    }
    out_file = OUTPUT_DIR / "polling.json"
    out_file.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()