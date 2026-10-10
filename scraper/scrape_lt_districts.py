#!/usr/bin/env python3
"""Scrape per-constituency 2024 results from lt.wikipedia.

Each of the ~41 existing "X rinkimų apygarda" articles carries the 2024
first-round candidate table (candidate, nominating party, votes, %) and the
runoff table. This script aggregates round-1 votes by party into district
vote shares and records the runoff pair/winner, keyed by the constituency
number (from the intro "(Nr. N)").

Writes data/lt/districts.json:
  { number: {title, round1: {party: pct}, total: N,
             runoff: [{party, pct}...], winner} }

The 30 constituencies without an article get their baselines synthesized at
build time (winner premium calibrated on these 41).
"""

import json
import re
import time
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from scrape_spain import expand_grid

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "lt" / "districts.json"
CACHE = ROOT / "scraper" / ".cache" / "lt_districts"
UA = {"User-Agent": "600-site-build/1.0 (research)"}

SIGNATURES = [
    ("tevynes", "tslkd"),
    ("socialdemokratu", "lsdp"),
    ("liberalu sajudis", "ls"),
    ("lietuvos respublikos liberal", "ls"),
    ("laisves partija", "lp"),
    ("nemuno ausra", "na"),
    ("vardan lietuvos", "dsvl"),
    ("valstieciu", "lvzs"),
    ("darbo partija", "dp"),
    ("regionu partija", "lrp"),
    ("zaliuju partija", "lzp"),
    ("tautos ir teisingumo", "tts"),
    ("nacionalinis susivienijimas", "ns"),
    ("lenku rinkimu", "llrakss"),
    ("centro desines", "cds"),
    ("lietuva - visu", "lv"),
]


def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = (s.replace("\u0117", "e").replace("\u0173", "u").replace("\u016b", "u")
         .replace("\u0105", "a").replace("\u0119", "e").replace("\u010d", "c")
         .replace("\u0161", "s").replace("\u017e", "z").replace("\u012f", "i"))
    for ch in "\u2013\u2014\u2015\u2212":
        s = s.replace(ch, "-")
    return re.sub(r"\s+", " ", s.lower())


def party_key(raw):
    n = norm(raw)
    for sig, key in SIGNATURES:
        if sig in n:
            return key
    return None


def parse_pct(text):
    m = re.search(r"(\d+(?:[.,]\d+)?)", text or "")
    if not m:
        return None
    v = float(m.group(1).replace(",", "."))
    return v if 0 <= v <= 100 else None


def scrape_one(title):
    url = ("https://lt.wikipedia.org/wiki/" +
           requests.utils.quote(title.replace(" ", "_")))
    r = requests.get(url, headers=UA, timeout=120)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    body = soup.find("div", {"id": "mw-content-text"}) or soup
    intro = body.find("p")
    m = re.search(r"Nr\.\s*(\d+)", intro.get_text(" ", strip=True) if intro else "")
    if not m:
        return None
    number = int(m.group(1))

    tables = []
    cur = None
    for el in body.find_all(["h2", "h3", "table"]):
        if el.name in ("h2", "h3"):
            txt = " ".join(el.get_text(" ", strip=True).split())
            m = re.match(r"(20\d{2})\s*m\.", txt)
            cur = int(m.group(1)) if m else None
            continue
        if cur != 2024:
            continue
        if "wikitable" not in (el.get("class") or []):
            continue
        rows = el.find_all("tr")
        head = " ".join(rows[0].get_text(" ", strip=True).split()) if rows else ""
        if "Kandidatas" in head and "I\u0161k\u0117l\u0117" in head:
            tables.append(el)
    if not tables:
        return None
    # the first table under the 2024 heading is round 1; the second (when the
    # district went to a runoff) is round 2
    r1 = tables[0]
    r2 = tables[1] if len(tables) > 1 else None

    def rows_of(t):
        grid, _ = expand_grid(t)
        out = []
        for row in grid[2:]:
            if len(row) < 4:
                continue
            cand, who, votes, pct = row[0], row[1], row[2], row[3]
            if norm(who).startswith("is viso") or norm(cand).startswith("is viso"):
                continue
            if not cand and not who:
                continue
            out.append((cand.strip(), who.strip(), votes.strip(), parse_pct(pct)))
        return out

    round1 = {}
    total = 0
    top = (None, -1)
    for cand, who, votes, pct in rows_of(r1):
        vm = re.match(r"([\d\s\u00a0]+)", votes)
        n = int(re.sub(r"[^\d]", "", vm.group(1))) if vm else 0
        total += n
        key = party_key(who)
        if key:
            round1[key] = round1.get(key, 0) + n
        if n > top[1]:
            top = (key or "other", n)
    if not total:
        return None
    shares = {k: round(100.0 * v / total, 2) for k, v in round1.items()}

    runoff = []
    winner = None
    if r2 is not None:
        for cand, who, votes, pct in rows_of(r2):
            key = party_key(who)
            runoff.append({"party": key or "other", "name": cand, "pct": pct})
        if runoff:
            winner = max(runoff, key=lambda x: x["pct"] or 0)["party"]
    if winner is None:
        # won outright in round 1 (no runoff table)
        winner = top[0]

    return {
        "number": number,
        "title": title,
        "round1": shares,
        "total": total,
        "runoff": runoff,
        "winner": winner,
    }


def article_titles():
    """The lt.wikipedia category listing (cached)."""
    cat_file = ROOT / "scraper" / ".cache" / "lt_cat41.json"
    if cat_file.exists():
        return json.loads(cat_file.read_text(encoding="utf8"))
    r = requests.get("https://lt.wikipedia.org/w/api.php", params={
        "action": "query", "list": "categorymembers",
        "cmtitle": "Kategorija:Lietuvos rinkim\u0173 apygardos",
        "cmlimit": "200", "format": "json"}, headers=UA, timeout=60)
    titles = [m["title"] for m in
              r.json()["query"]["categorymembers"]]
    cat_file.parent.mkdir(parents=True, exist_ok=True)
    cat_file.write_text(json.dumps(titles, ensure_ascii=False, indent=1),
                        encoding="utf8")
    return titles


def main():
    titles = [t for t in article_titles()
              if "rinkim\u0173 apygarda" in t]
    print("articles:", len(titles))
    CACHE.mkdir(parents=True, exist_ok=True)
    out = {}
    for i, title in enumerate(titles):
        cache = CACHE / (re.sub(r"[^A-Za-z0-9]+", "_", title)[:60] + ".json")
        if cache.exists():
            d = json.loads(cache.read_text(encoding="utf8"))
        else:
            try:
                d = scrape_one(title)
            except Exception as e:
                print("  FAIL", title, str(e)[:70])
                d = None
            cache.write_text(json.dumps(d, ensure_ascii=False), encoding="utf8")
            time.sleep(1.1)
        if d:
            out[str(d["number"])] = d
            print("  %2d | %-45s | %s | %s" % (
                d["number"], title[:45],
                " ".join("%s %.1f" % (k, v) for k, v in
                         sorted(d["round1"].items(), key=lambda x: -x[1])[:4]),
                d["winner"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
    print("wrote", OUT, "districts:", len(out))


if __name__ == "__main__":
    main()
