#!/usr/bin/env python3
"""Scrape full-candidate 2026 district results from ja.wikipedia.

Each "X第N区" article has a 選挙結果 section whose first table is the newest
election (8 Feb 2026) with every candidate's party (所属党派) and vote share
(得票率). This upgrades the district baselines from the en-wiki top-two
(winner + runner-up) to full party shares.

Output: data/jp/district_results.json  {key: {party: pct}}
Validated against the en-wiki winners (data/jp/results.json).
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
OUT = ROOT / "data" / "jp" / "district_results.json"
CACHE = ROOT / "scraper" / ".cache" / "jp_districts"
UA = {"User-Agent": "600-site-build/1.0 (research)"}

PREF_JP = {
    "hokkaido": "\u5317\u6d77\u9053", "aomori": "\u9752\u68ee\u770c",
    "iwate": "\u5ca9\u624b\u770c", "miyagi": "\u5bae\u57ce\u770c",
    "akita": "\u79cb\u7530\u770c", "yamagata": "\u5c71\u5f62\u770c",
    "fukushima": "\u798f\u5cf6\u770c", "ibaraki": "\u8328\u57ce\u770c",
    "tochigi": "\u6803\u6728\u770c", "gunma": "\u7fa4\u99ac\u770c",
    "saitama": "\u57fc\u7389\u770c", "chiba": "\u5343\u8449\u770c",
    "tokyo": "\u6771\u4eac\u90fd", "kanagawa": "\u795e\u5948\u5ddd\u770c",
    "niigata": "\u65b0\u6f5f\u770c", "toyama": "\u5bcc\u5c71\u770c",
    "ishikawa": "\u77f3\u5ddd\u770c", "fukui": "\u798f\u4e95\u770c",
    "yamanashi": "\u5c71\u68a8\u770c", "nagano": "\u9577\u91ce\u770c",
    "gifu": "\u5c90\u961c\u770c", "shizuoka": "\u9759\u5ca1\u770c",
    "aichi": "\u611b\u77e5\u770c", "mie": "\u4e09\u91cd\u770c",
    "shiga": "\u6ecb\u8cc0\u770c", "kyoto": "\u4eac\u90fd\u5e9c",
    "osaka": "\u5927\u962a\u5e9c", "hyogo": "\u5175\u5eab\u770c",
    "nara": "\u5948\u826f\u770c", "wakayama": "\u548c\u6b4c\u5c71\u770c",
    "tottori": "\u9ce5\u53d6\u770c", "shimane": "\u5cf6\u6839\u770c",
    "okayama": "\u5ca1\u5c71\u770c", "hiroshima": "\u5e83\u5cf6\u770c",
    "yamaguchi": "\u5c71\u53e3\u770c", "tokushima": "\u5fb3\u5cf6\u770c",
    "kagawa": "\u9999\u5ddd\u770c", "ehime": "\u611b\u5a9b\u770c",
    "kochi": "\u9ad8\u77e5\u770c", "fukuoka": "\u798f\u5ca1\u770c",
    "saga": "\u4f50\u8cc0\u770c", "nagasaki": "\u9577\u5d0e\u770c",
    "kumamoto": "\u718a\u672c\u770c", "oita": "\u5927\u5206\u770c",
    "miyazaki": "\u5bae\u5d0e\u770c", "kagoshima": "\u9e7f\u5150\u5cf6\u770c",
    "okinawa": "\u6c96\u7e04\u770c",
}
# ordered: first match wins (自由民主党 contains 民主党)
PARTY_SIGS = [
    ("\u81ea\u7531\u6c11\u4e3b\u515a", "ldp"),
    ("\u7acb\u61b2\u6c11\u4e3b\u515a", "cra"),
    ("\u4e2d\u9053\u6539\u9769", "cra"),
    ("\u56fd\u6c11\u6c11\u4e3b\u515a", "dpfp"),
    ("\u7dad\u65b0", "ishin"),
    ("\u516c\u660e\u515a", "komei"),
    ("\u5171\u7523\u515a", "jcp"),
    ("\u308c\u3044\u308f", "reiwa"),
    ("\u53c2\u653f\u515a", "sansei"),
    ("\u4fdd\u5b88\u515a", "cpj"),
    ("\u793e\u4f1a\u6c11\u4e3b\u515a", "sdp"),
    ("\u307f\u3089\u3044", "mirai"),
]


def pkey(raw):
    for sig, key in PARTY_SIGS:
        if sig in raw:
            return key
    return "other"


# en-wiki lists these ballot independents under a party caucus
KNOWN_INDEPENDENT_WINNERS = {"fukui_2"}


def parse_pct(text):
    m = re.search(r"(\d+(?:\.\d+)?)\s*%", text or "")
    return float(m.group(1)) if m else None


def scrape_one(pref_jp, num):
    title = "%s\u7b2c%d\u533a" % (pref_jp, num)
    url = ("https://ja.wikipedia.org/wiki/" +
           requests.utils.quote(title.replace(" ", "_")))
    r = requests.get(url, headers=UA, timeout=120)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    body = soup.find("div", {"id": "mw-content-text"}) or soup
    # the first candidate table inside 選挙結果 (newest election first)
    in_results = False
    for el in body.find_all(["h2", "table"]):
        if el.name == "h2":
            in_results = "\u9078\u6319\u7d50\u679c" in el.get_text(" ", strip=True)
            continue
        if not in_results or "wikitable" not in (el.get("class") or []):
            continue
        grid, _ = expand_grid(el)
        if not grid:
            continue
        hdr = [h.lower() for h in grid[0]]
        try:
            pi = next(i for i, h in enumerate(hdr)
                      if "\u5019\u88dc\u8005" in h)
            ki = next(i for i, h in enumerate(hdr)
                      if "\u6240\u5c5e\u515a\u6d3e" in h)
            ri = next(i for i, h in enumerate(hdr)
                      if "\u5f97\u7968\u7387" in h)
        except StopIteration:
            continue
        shares, cands, total = {}, [], 0.0
        for row in grid[1:]:
            if len(row) <= max(pi, ki, ri):
                continue
            pct = parse_pct(row[ri])
            if pct is None:
                continue
            key = pkey(row[ki])
            cands.append({"party": key, "pct": pct})
            shares[key] = shares.get(key, 0.0) + pct
            total += pct
        if total < 50:
            continue  # not a full result table
        cands.sort(key=lambda c: -c["pct"])
        return {"title": title, "cands": cands,
                "shares": {k: round(v, 2) for k, v in shares.items()},
                "total": round(total, 1)}
    return None


def main():
    res = json.loads((ROOT / "data" / "jp" / "results.json")
                     .read_text(encoding="utf8"))
    keys = sorted(res["districts"], key=lambda k: (k.rsplit("_", 1)[0],
                                                   int(k.rsplit("_", 1)[1])))
    CACHE.mkdir(parents=True, exist_ok=True)
    out, fails, mismatches = {}, [], []
    for i, key in enumerate(keys):
        pref, num = key.rsplit("_", 1)
        cf = CACHE / (key + ".json")
        w = res["districts"][key]["winner"]["party"]

        def load_cached():
            if not cf.exists():
                return None
            d = json.loads(cf.read_text(encoding="utf8"))
            if not d or "cands" not in d:
                return None
            top = max((p for p in d["shares"] if p != "other"),
                      key=lambda p: d["shares"][p], default=None)
            # self-heal: a cached parse whose top mapped party does not match
            # the known winner is stale (party sigs improved) - refetch
            if top != w and w != "other":
                return None
            return d

        d = load_cached()
        if d is None:
            try:
                d = scrape_one(PREF_JP[pref], int(num))
            except Exception as e:
                print("  FAIL", key, str(e)[:70])
                d = None
            cf.write_text(json.dumps(d, ensure_ascii=False), encoding="utf8")
            time.sleep(1.0)
        if not d:
            fails.append(key)
            continue
        out[key] = d["shares"]
        # validate: the top mapped party must match the en-wiki winner (the
        # 'other' bucket holds independents; fukui_2's winner is a ballot
        # independent that en-wiki lists under the LDP caucus)
        top = max((p for p in d["shares"] if p != "other"),
                  key=lambda p: d["shares"][p], default=None)
        if top != w and w != "other" and key not in KNOWN_INDEPENDENT_WINNERS:
            mismatches.append((key, w, top, d["shares"]))
        if (i + 1) % 40 == 0:
            print("  ... %d/%d" % (i + 1, len(keys)))
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf8")
    print("districts scraped:", len(out), "| fails:", len(fails),
          "| winner mismatches:", len(mismatches))
    for m in mismatches[:10]:
        print("  MISMATCH", m)
    if fails:
        print("  failed:", fails[:20])


if __name__ == "__main__":
    main()
