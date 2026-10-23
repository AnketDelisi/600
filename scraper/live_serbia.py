"""Serbia 2026 parliamentary live feed (RIK results page)."""
import re

import requests
from bs4 import BeautifulSoup

from live_common import write_live

ELECTION = "serbia-2026"
URL = "https://www.rik.parlament.gov.rs/542645/rezultati/"
NAMES = {
    "sns": ("Vučić", "Vučić – United Serbia", "#242970"),
    "sl": ("Student", "Student List", "#A81A32"),
    "sps": ("Socialist", "Socialist Party", "#EB1B23"),
    "pes": ("European Serbia", "European Serbia", "#C9A227"),
    "nada": ("NADA", "NADA", "#616264"),
    "misn": ("Power of the People", "We – Power of the People", "#1B3160"),
    "vmsz": ("Vojvodina", "Vojvodina Hungarians", "#00732B"),
    "spp": ("Reconciliation", "Justice and Reconciliation", "#16321B"),
    "sda": ("Sandžak", "SDA Sandžak", "#069443"),
    "rs": ("Russian Party", "Russian Party", "#0D3B66"),
    "sdp": ("Social Democrat", "Social Democrats", "#FF004F"),
    "kshlp": ("Preševo", "Preševo Valley Albanians", "#0081CC"),
}


def match(name):
    for key, (needle, _, _) in NAMES.items():
        if needle.lower() in name.lower():
            return key
    return None


def num(s):
    m = re.search(r"\d[\d.]*", s or "")
    return int(m.group(0).replace(".", "")) if m else 0


def pct(s):
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*%", s or "")
    return float(m.group(1).replace(",", ".")) if m else None


def dhondt(entries, total=250):
    rows = [e for e in entries if (e["pct"] or 0) >= 3.0 or e["id"] in
            ("vmsz", "spp", "sda", "rs", "kshlp")]
    scores = []
    for e in rows:
        for d in range(1, total + 1):
            scores.append(((e["pct"] or 0) / d, e["id"]))
    scores.sort(reverse=True)
    seats = {e["id"]: 0 for e in rows}
    for _, key in scores[:total]:
        seats[key] += 1
    for e in entries:
        e["seats"] = seats.get(e["id"], 0)


def main():
    html = requests.get(URL, headers={"User-Agent": "600-live-results/1.0"},
                        timeout=45).text
    soup = BeautifulSoup(html, "lxml")
    entries = []
    for tbl in soup.find_all("table"):
        for row in tbl.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in row.find_all("td")]
            if len(cells) < 5:
                continue
            name = cells[2]
            key = match(name)
            if not key:
                continue
            vote_text = cells[3]
            p = pct(cells[4]) if len(cells) > 4 else None
            if p is None:
                p = pct(vote_text)
            entries.append({
                "id": key,
                "name": NAMES[key][1],
                "color": NAMES[key][2],
                "pct": p,
                "votes": num(vote_text),
                "seats": 0,
            })
    if not entries or not any((e["pct"] or 0) > 0 for e in entries):
        print("serbia: no counted rows yet; leaving waiting")
        return
    dhondt(entries)
    entries.sort(key=lambda e: -(e["pct"] or 0))
    text = soup.get_text(" ", strip=True)
    total = None
    counted = None
    m = re.search(r"Број бирачких места\s*(\d[\d.]*)", text)
    if m:
        total = int(m.group(1).replace(".", ""))
    m = re.search(r"Број обрађених бирачких места\s*(\d[\d.]*)", text)
    if m:
        counted = int(m.group(1).replace(".", ""))
    write_live(ELECTION, {
        "name": "Serbia 2026",
        "date": "2026-10-25",
        "subtitle": "National Assembly · 250 seats · 3% threshold",
        "status": "counting",
        "counted": counted,
        "total": total,
        "counted_label": "polling stations",
        "source": "Republic Electoral Commission (RIK)",
        "source_url": URL,
        "result_title": "Vote share and seats",
        "result_note": "RIK preliminary count. Seat allocation is an approximation from current vote shares.",
        "entries": entries,
        "seat_total": 250,
        "majority": 126,
        "areas": [],
        "notes": "D'Hondt allocation with a 3% threshold; national-minority lists are exempt.",
    })


if __name__ == "__main__":
    main()
