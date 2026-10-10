#!/usr/bin/env python3
"""Scrape the 2024 South Korean legislative election baselines.

Districts: the en-wiki results-by-constituency table (256 rows: 254 districts,
columns City/Province | No. | Name | Turnout% | winner cand/party/votes/% |
runner cand/party/votes/% | margin). Keys are fold(province)_<No.>, matching
the Commons results-map sortkeys (province code * 100 + No.; Seoul uses plain
numbers).

National: the ko-wiki official NEC summary (regional + proportional votes,
shares and seats per party; satellites folded into their parent: Democratic
Alliance -> DPK, People Future Party -> PPP).

Writes data/kr/results.json.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scrape_spain import expand_grid

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "kr" / "results.json"
EN_URL = ("https://en.wikipedia.org/wiki/"
          "2024_South_Korean_legislative_election")
KO_URL = ("https://ko.wikipedia.org/wiki/"
          "%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD_%EC%A0%9C22%EB%8C%80_"
          "%EA%B5%AD%ED%9A%8C%EC%9D%98%EC%9B%90_%EC%84%A0%EA%B1%B0")

PARTY_MAP = {
    "DPK": "dpk", "PPP": "ppp", "PP": "pp", "Jinbo": "pp",
    "NFP": "nfp", "NRP": "rp", "RP": "rp", "Ind.": "other",
    "Ind": "other", "Independent": "other", "NPA": "other",
    "LUP": "other", "GJP": "other", "SP": "other", "CP": "other",
}
PROV_FOLD = {
    "Seoul": "seoul", "Busan": "busan", "Daegu": "daegu",
    "Incheon": "incheon", "Gwangju": "gwangju", "Daejeon": "daejeon",
    "Ulsan": "ulsan", "Sejong": "sejong", "Gyeonggi": "gyeonggi",
    "Gangwon": "gangwon", "North Chungcheong": "north_chungcheong",
    "South Chungcheong": "south_chungcheong", "North Jeolla": "north_jeolla",
    "South Jeolla": "south_jeolla", "North Gyeongsang": "north_gyeongsang",
    "South Gyeongsang": "south_gyeongsang", "Jeju Province": "jeju",
    "Jeju": "jeju",
}
# ko-wiki row prefix -> config key (satellites folded into parents)
KO_MAP = {
    "더불어민주당": "dpk", "국민의힘": "ppp", "조국혁신당": "rkp",
    "개혁신당": "rp", "진보당": "pp", "새로운미래": "nfp",
}


def num(text):
    m = re.search(r"[\d.]+", str(text).replace(",", ""))
    return float(m.group(0)) if m else None


def scrape_districts():
    r = requests.get(EN_URL, headers={"User-Agent": "600-poll-scraper/1.0"},
                     timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    table = None
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) == 256 and "City/Province" in \
                tb.get_text(" ", strip=True)[:60]:
            table = tb
            break
    assert table is not None, "district table not found"
    grid, _ = expand_grid(table)
    districts = {}
    for row in grid[2:]:
        if len(row) < 15 or not re.match(r"^\d+$", str(row[1]).strip()):
            continue
        prov = PROV_FOLD.get(str(row[0]).strip())
        assert prov, "unknown province: %r" % row[0]
        no = int(row[1])
        wparty = PARTY_MAP.get(str(row[6]).strip())
        # runners may be any of the minor parties -> "other" (unmodelled)
        rparty = PARTY_MAP.get(str(row[11]).strip(), "other")
        assert wparty, "unknown winner party: %r" % row[6]
        assert wparty != "other", "unmodelled winner: %r" % row[6]
        key = "%s_%d" % (prov, no)
        assert key not in districts, key
        districts[key] = {
            "name": str(row[2]).strip(),
            "turnout": num(row[3]),
            "winner": {"party": wparty, "pct": num(row[8])},
            "runner": {"party": rparty, "pct": num(row[13])},
        }
    assert len(districts) == 254, len(districts)
    return districts


def scrape_national():
    r = requests.get(KO_URL, headers={"User-Agent": "600-poll-scraper/1.0"},
                     timeout=180)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    table = None
    for tb in soup.find_all("table"):
        if "비례대표" in tb.get_text(" ", strip=True)[:120] and \
                "지역구" in tb.get_text(" ", strip=True)[:120]:
            table = tb
            break
    assert table is not None, "ko-wiki results table not found"
    grid, _ = expand_grid(table)
    fptp, pr, seats = {}, {}, {}
    for row in grid:
        if len(row) < 8:
            continue
        head = unicodedata.normalize("NFC", str(row[0])).strip()
        key = None
        for prefix, k in KO_MAP.items():
            if head.startswith(prefix):
                key = k
                break
        if not key:
            continue
        fptp[key] = num(row[2])
        pr[key] = num(row[5])
        seats[key] = int(num(row[7]))
    assert len(seats) == 6, seats
    assert sum(seats.values()) == 300, seats
    # parties with no 2024 PR list: no PR vote (anchored at 0)
    pr.setdefault("bip", 0.0)
    pr.setdefault("sdp", 0.0)
    return fptp, pr, seats


def main():
    districts = scrape_districts()
    fptp, pr, seats = scrape_national()
    print("districts:", len(districts))
    print("fptp:", fptp)
    print("pr:", pr)
    print("seats:", seats)
    winners = {}
    for d in districts.values():
        winners[d["winner"]["party"]] = winners.get(d["winner"]["party"], 0) + 1
    print("district winners:", winners)
    out = {
        "country": "kr",
        "source": "en/ko.wikipedia (2024 election; NEC figures via ko-wiki)",
        "districts": districts,
        "national": {"fptp": fptp, "pr": pr, "seats": seats},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1),
                   encoding="utf8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
