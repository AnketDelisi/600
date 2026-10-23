"""British Columbia 2026 live feed (Elections BC / BC LocalLink results page)."""
import re

import requests
from bs4 import BeautifulSoup

from live_common import write_live

ELECTION = "bc-2026"
URL = "https://bc.locallink.ca/election-2026/results/"
PARTIES = {
    "bcndp": ("BC NDP", "#F4A460"),
    "cpbc": ("BC Conservatives", "#004AAD"),
    "gpbc": ("BC Greens", "#99C955"),
    "cbc": ("CentreBC", "#EE2D30"),
    "onbc": ("OneBC", "#C49B50"),
    "ind": ("Independents", "#6B7280"),
}


def party_key(s):
    t = (s or "").lower()
    if "ndp" in t or "new democratic" in t:
        return "bcndp"
    if "conservative" in t:
        return "cpbc"
    if "green" in t:
        return "gpbc"
    if "centre" in t:
        return "cbc"
    if "onebc" in t or "one bc" in t:
        return "onbc"
    if "independent" in t:
        return "ind"
    return None


def intnum(s):
    m = re.search(r"\d[\d,]*", s or "")
    return int(m.group(0).replace(",", "")) if m else 0


def pctnum(s):
    m = re.search(r"(\d+(?:\.\d+)?)\s*%", s or "")
    return float(m.group(1)) if m else None


def main():
    html = requests.get(URL, headers={"User-Agent": "600-live-results/1.0"},
                        timeout=45).text
    soup = BeautifulSoup(html, "lxml")
    rows = []
    for tbl in soup.find_all("table"):
        head = [c.get_text(" ", strip=True) for c in tbl.find_all("tr")[0].find_all(["th", "td"])] if tbl.find_all("tr") else []
        lo = [h.lower() for h in head]
        di = next((i for i, h in enumerate(lo) if "riding" in h or "district" in h or "electoral" in h), None)
        pi = next((i for i, h in enumerate(lo) if "party" in h or "candidate" in h), None)
        vi = next((i for i, h in enumerate(lo) if "vote" in h and "%" not in h and "share" not in h), None)
        si = next((i for i, h in enumerate(lo) if "share" in h or "%" in h), None)
        if di is None or pi is None:
            continue
        for tr in tbl.find_all("tr")[1:]:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) <= max(di, pi):
                continue
            key = party_key(cells[pi])
            if not key:
                continue
            votes = intnum(cells[vi]) if vi is not None and vi < len(cells) else 0
            share = pctnum(cells[si]) if si is not None and si < len(cells) else None
            rows.append({
                "district": cells[di], "party": key,
                "candidate": cells[pi], "votes": votes, "pct": share,
            })
    if not rows:
        print("bc: no results table yet; leaving waiting")
        return

    by_district = {}
    for r in rows:
        d = by_district.setdefault(r["district"], [])
        d.append(r)
    areas = []
    seats = {k: 0 for k in PARTIES}
    votes_total = {k: 0 for k in PARTIES}
    for district, rs in by_district.items():
        rs.sort(key=lambda x: -(x["votes"] or x["pct"] or 0))
        top = rs[0]
        seats[top["party"]] = seats.get(top["party"], 0) + 1
        areas.append({
            "name": district, "winner": top["party"],
            "winner_name": top["candidate"], "pct": top["pct"],
            "leading": True, "elected": False,
        })
    for r in rows:
        votes_total[r["party"]] = votes_total.get(r["party"], 0) + (r["votes"] or 0)
    total_votes = sum(votes_total.values()) or 1
    entries = []
    for key, (name, color) in PARTIES.items():
        entries.append({
            "id": key, "name": name, "color": color,
            "votes": votes_total.get(key, 0),
            "pct": round(votes_total.get(key, 0) / total_votes * 100, 1),
            "seats": seats.get(key, 0),
        })
    entries.sort(key=lambda e: -e["votes"])
    areas.sort(key=lambda a: a["name"])
    write_live(ELECTION, {
        "name": "British Columbia 2026",
        "date": "2026-10-24",
        "close_at": "2026-10-25T03:00:00Z",
        "chart_start": "2026-09-22",
        "subtitle": "Legislative Assembly · 93 ridings · 47 for a majority",
        "status": "counting" if len(areas) < 93 else "final",
        "counted": len(areas),
        "total": 93,
        "counted_label": "ridings",
        "source": "Elections BC",
        "source_url": "https://elections.bc.ca/2026-provincial-election/",
        "result_title": "Seats and vote share",
        "result_note": "Riding leaders from the election-night count; leading is not elected.",
        "entries": entries,
        "seat_total": 93,
        "majority": 47,
        "areas": areas,
        "area_title": "Ridings",
        "area_label": "Riding",
        "area_note": "Leader in each riding as results are reported.",
        "notes": "Initial count; mail-in and absentee ballots are added at the final count on 6–10 November.",
    })


if __name__ == "__main__":
    main()
