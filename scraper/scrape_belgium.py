#!/usr/bin/env python3
"""Scrape Belgian federal polling (Flanders/Wallonia/Brussels tables)."""
import json, os, re, sys
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup
sys.path.insert(0, os.path.dirname(__file__))
from backtest import expand_grid

URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2029_Belgian_elections"
OUT = Path(__file__).resolve().parent.parent / "data" / "belgium"
KEYS = ["nva","vb","cdv","and","vooruit","groen","ptb","mr","ps","le","eco","defi","tfa"]
COLMAP = [
 ('nva', r'^n\s*[-‑–]?\s*va'), ('vb', r'^vb'), ('cdv', r'^cd&v|^cda'),
 ('and', r'^open vld|^anders|^and$'), ('vooruit', r'^vooruit|^vrt$'),
 ('groen', r'^groen|^grn'), ('ptb', r'^pvda|^ptb'),
 ('mr', r'^mr$'), ('ps', r'^ps$'), ('le', r'^le$|^les engag'),
 ('eco', r'^ecolo$|^eco$'), ('defi', r'^d[eé]fi$'), ('tfa', r'^tfa$'),
]
MONTHS = {m:i for i,m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split(),1)}
REGIONS = {"Flanders":"flanders","Wallonia":"wallonia","Brussels":"brussels"}

def date_of(text):
    t = re.sub(r"\[.*?\]", "", text or "")
    year = re.search(r"(20\d\d)", t)
    year = int(year.group(1)) if year else 2026
    hits = re.findall(r"(\d{1,2})\s*([A-Za-z]{3})", t)
    for day, mon in reversed(hits):
        m = MONTHS.get(mon.lower())
        if m: return "%04d-%02d-%02d" % (year, m, int(day))
    return None

def num(text):
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*%?", text or "")
    return float(m.group(1).replace(",", ".")) if m else None

def sample_n(text):
    digits = re.sub(r"[^\d]", "", text or "")
    return int(digits) if digits else 1000

def main():
    r = requests.get(URL, headers={"User-Agent":"600-poll-scraper/1.0"}, timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    raw = {k: [] for k in REGIONS.values()}
    region = None
    for el in soup.find_all(["h2","h3","table"]):
        if el.name in ("h2","h3"):
            txt = " ".join(el.get_text(" ", strip=True).split())
            if el.name == "h2":
                region = None
            else:
                region = REGIONS.get(txt)
            continue
        if not region: continue
        if raw[region]: continue  # only the first table under each section
        rows = el.select("tr")
        if len(rows) < 5: continue
        grid = expand_grid(el)
        if not grid: continue
        hdr = [str(x or "").lower() for x in grid[0]]
        cols = {}
        for key, pat in COLMAP:
            for i,h in enumerate(hdr):
                if re.search(pat, h): cols[key]=i; break
        di = next((i for i,h in enumerate(hdr) if "date" in h), None)
        pi = next((i for i,h in enumerate(hdr) if "polling" in h or "pollster" in h), None)
        ni = next((i for i,h in enumerate(hdr) if "sample" in h), None)
        if di is None or pi is None or len(cols) < 3: continue
        for row in grid[1:]:
            if len(row) <= max(list(cols.values())+[di,pi]): continue
            date = date_of(row[di])
            pollster = re.sub(r"\[.*?\]", "", row[pi] or "").strip()
            if not date or not pollster or len(pollster) < 3: continue
            if re.search(r"election|result", pollster, re.I): continue
            votes = {}
            for k,i in cols.items():
                v = num(row[i])
                if v is not None: votes[k]=v
            if len(votes) < 3: continue
            raw[region].append({"pollster":pollster,"date":date,"votes":votes,
                                "n": sample_n(row[ni]) if ni is not None and ni < len(row) else 1000})
    # Latest regional averages for the map's regional override.
    regional = {}
    for reg, ps in raw.items():
        ps = sorted(ps, key=lambda p:p["date"], reverse=True)[:4]
        regional[reg] = {k: round(sum(p["votes"].get(k,0) for p in ps)/max(1,len(ps)),2) for k in KEYS}
    # Synthetic national poll series (region-electorate weighted) for the hero/chart/forecast.
    groups = {}
    weights = {"flanders":0.60,"wallonia":0.31,"brussels":0.09}
    for reg, ps in raw.items():
        for p in ps:
            groups.setdefault((p["pollster"],p["date"]),{})[reg]=p
    national = []
    for (pollster,date), byreg in sorted(groups.items(), key=lambda kv:kv[0][1], reverse=True):
        present = {r:p for r,p in byreg.items() if r in weights}
        wt = sum(weights[r] for r in present)
        if not wt: continue
        votes = {k: round(sum(present[r]["votes"].get(k,0)*weights[r] for r in present)/wt,2) for k in KEYS}
        total = sum(votes.values())
        if total <= 0: continue
        votes = {k: round(v*100/total,2) for k,v in votes.items()}
        national.append({"pollster":pollster,"date":date,"votes":votes,
                         "n": int(sum(p["n"] for p in present.values())/len(present))})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT/"polls.json").write_text(json.dumps({
        "country":"belgium","source":"Wikipedia","source_url":URL,
        "scraped_at":datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "poll_count":len(national),"polls":national,"regional":regional,
        "syntheticNational":True,"regionalWeights":weights,
    },ensure_ascii=False,indent=1)+"\n",encoding="utf8")
    print("wrote",len(national),"national polls; regions", {k:len(v) for k,v in raw.items()})

if __name__ == "__main__": main()
