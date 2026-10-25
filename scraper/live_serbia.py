"""Serbia 2026 parliamentary live feed (RIK results page)."""
import re

import requests
from bs4 import BeautifulSoup

from live_common import write_live

ELECTION = "serbia-2026"
URL = "https://www.rik.parlament.gov.rs/542645/rezultati/"
API = "https://www.rik.parlament.gov.rs"
ELEKT_URL = "https://elekt.io/elekt/api/v1/elections/srb-parliamentary-2026-2"
ALIASES = {
    "sns": ("vučić", "serbia must not stop", "вучић", "уједињена србија"),
    "sl": ("student", "студентска"),
    "sps": ("socialist", "dačić", "дачић", "социјалистичка"),
    "pes": ("european serbia", "европска србија"),
    "nada": ("nada", "нада"),
    "misn": ("power of the people", "моћ народа", "снага народа"),
    "vmsz": ("vojvodina", "војвођански"),
    "spp": ("reconciliation", "помирење"),
    "sda": ("sandžak", "санџак"),
    "rs": ("russian party", "руска странка"),
    "sdp": ("social democrat", "социјалдемократска"),
    "kshlp": ("preševo", "прешево"),
}
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
    t = (name or "").lower()
    for key, needles in ALIASES.items():
        if any(needle in t for needle in needles):
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


def rik_api():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "600-live-results/1.0",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": URL,
    })
    rounds = session.post(API + "/get-elections/", data={"election_type": 2},
                          timeout=45).json().get("rounds") or {}
    round_id = next((k for k, v in rounds.items() if "2026" in v), None)
    if not round_id and rounds:
        round_id = max(rounds, key=lambda k: int(k))
    if not round_id:
        raise RuntimeError("no 2026 parliamentary round")
    response = session.post(API + "/get_results/", data={
        "should_update_pies": 1,
        "type": "region",
        "election_round": round_id,
        "region": 0,
        "municipality": 0,
        "election_station": 0,
    }, timeout=45)
    response.raise_for_status()
    return response.json()


def main():
    try:
        data = rik_api()
    except Exception as exc:
        print("serbia: RIK API unavailable (%s); trying elekt" % exc)
        return elekt_main()
    stats = data.get("stat_sum_numbers") or {}
    entries = []
    for row in data.get("table_data") or []:
        key = match(row.get("list_name"))
        if not key:
            continue
        p = row.get("won_percent")
        entries.append({
            "id": key,
            "name": NAMES[key][1],
            "color": NAMES[key][2],
            "pct": float(p) if p is not None else None,
            "votes": num(row.get("won_number")),
            "seats": 0,
        })
    if not entries or not any((e["pct"] or 0) > 0 for e in entries):
        print("serbia: no counted rows from RIK; trying elekt")
        return elekt_main()
    dhondt(entries)
    entries.sort(key=lambda e: -(e["pct"] or 0))
    counted = num(stats.get("processed_stations"))
    total = num(stats.get("number_of_stations"))
    write_live(ELECTION, {
        "name": "Serbia 2026",
        "date": "2026-10-25",
        "close_at": "2026-10-25T19:00:00Z",
        "chart_start": "2026-09-09",
        "subtitle": "National Assembly · 250 seats · 3% threshold",
        "status": "final" if (counted and total and counted >= total) else "counting",
        "counted": counted or None,
        "total": total or None,
        "counted_label": "polling stations",
        "source": "Republic Electoral Commission (RIK)",
        "source_url": URL,
        "source_updated_at": stats.get("datetime"),
        "result_title": "Vote share and seats",
        "result_note": "RIK preliminary count. Seat allocation is an approximation from current vote shares.",
        "entries": entries,
        "seat_total": 250,
        "majority": 126,
        "areas": [],
        "map_svg": "../img/serbia.svg",
        "map_title": "National map",
        "map_note": "RIK's live feed does not publish regional totals, so the map shows the national leader.",
        "notes": "D'Hondt allocation with a 3% threshold; national-minority lists are exempt.",
    })


def elekt_main():
    try:
        r = requests.get(ELEKT_URL, headers={"User-Agent": "600-live-results/1.0",
                                             "Accept": "application/json"}, timeout=45)
        r.raise_for_status()
        data = r.json().get("data", {})
    except Exception as exc:
        print("serbia: no live source (%s); leaving waiting" % exc)
        return
    entries = []
    for row in data.get("contestants") or []:
        label = row.get("candidate") or row.get("label") or ""
        key = match(label)
        if not key:
            continue
        entries.append({
            "id": key,
            "name": NAMES[key][1],
            "color": NAMES[key][2],
            "pct": row.get("vote_share") or 0,
            "votes": row.get("votes") or 0,
            "seats": row.get("seats") or 0,
        })
    if not entries or not any((e["pct"] or 0) > 0 for e in entries):
        print("serbia: no counted rows from RIK or elekt; leaving waiting")
        return
    if not any(e["seats"] for e in entries):
        dhondt(entries)
    entries.sort(key=lambda e: -(e["pct"] or 0))
    write_live(ELECTION, {
        "name": "Serbia 2026",
        "date": "2026-10-25",
        "close_at": "2026-10-25T19:00:00Z",
        "chart_start": "2026-09-09",
        "subtitle": "National Assembly · 250 seats · 3% threshold",
        "status": "final" if data.get("results_status") in ("final", "declared") else "counting",
        "counted": None,
        "total": None,
        "counted_label": "polling stations",
        "source": "RIK (via elekt)",
        "source_url": URL,
        "result_title": "Vote share and seats",
        "result_note": "Preliminary count via elekt while the RIK page is unavailable. Seat totals are as published.",
        "entries": entries,
        "seat_total": 250,
        "majority": 126,
        "areas": [],
        "map_svg": "../img/serbia.svg",
        "map_title": "National map",
        "map_note": "The available feed has no regional totals, so the map shows the national leader.",
        "notes": "D'Hondt allocation with a 3% threshold; national-minority lists are exempt.",
    })


if __name__ == "__main__":
    main()
