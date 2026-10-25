"""Serbia 2026 parliamentary live feed (RIK results API)."""
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

from live_common import write_live

ELECTION = "serbia-2026"
URL = "https://www.rik.parlament.gov.rs/542645/rezultati/"
API = "https://www.rik.parlament.gov.rs"
ELEKT_URL = "https://elekt.io/elekt/api/v1/elections/srb-parliamentary-2026-2"
HEADERS = {
    "User-Agent": "600-live-results/1.0",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": URL,
}
DISTRICTS = [
    ("_1", "Belgrade", range(1, 18)),
    ("_6", "North Bačka", range(18, 21)),
    ("_7", "Central Banat", range(21, 26)),
    ("_5", "North Banat", range(26, 32)),
    ("_3", "South Banat", range(32, 40)),
    ("_2", "West Bačka", range(40, 44)),
    ("_4", "South Bačka", range(44, 56)),
    ("_8", "Srem", range(56, 63)),
    ("_11", "Mačva", range(63, 71)),
    ("_10", "Kolubara", range(71, 77)),
    ("_23", "Podunavlje", (77, 78, 79)),
    ("_18", "Braničevo", (80, 81, 82, 83, 84, 85, 86, 87, 88)),
    ("_16", "Šumadija", range(89, 96)),
    ("_13", "Pomoravlje", range(96, 102)),
    ("_17", "Bor", range(102, 106)),
    ("_19", "Zaječar", range(106, 110)),
    ("_9", "Zlatibor", (110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120)),
    ("_12", "Moravica", range(121, 125)),
    ("_15", "Raška", range(125, 130)),
    ("_14", "Rasina", range(130, 136)),
    ("_21", "Nišava", range(136, 147)),
    ("_25", "Toplica", range(147, 151)),
    ("_22", "Pirot", range(151, 155)),
    ("_20", "Jablanica", range(155, 161)),
    ("_24", "Pčinja", (161, 163, 164, 165, 166, 167, 168)),
]
PARENT_MUNICIPALITY = {
    "81": "pozarevac",
    "111": "uzice",
    "136": "nis",
    "137": "nis",
    "138": "nis",
    "139": "nis",
    "140": "nis",
}
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
GEO = json.loads((Path(__file__).resolve().parents[1] / "data" / "serbia" / "geo.json").read_text(encoding="utf8"))
MUNICIPALITY_IDS = set(GEO["map2"]["names"])
VALUE_TO_DISTRICT = {}
for district_id, _, values in DISTRICTS:
    for value in values:
        VALUE_TO_DISTRICT[str(value)] = district_id
CYR = "абвгдђежзијклљмнњопрстћуфхцчџш"
LAT = ["a", "b", "v", "g", "d", "dj", "e", "z", "z", "i", "j", "k", "l",
       "lj", "m", "n", "nj", "o", "p", "r", "s", "t", "c", "u", "f", "h",
       "c", "c", "dz", "s"]
TRANSLIT = str.maketrans(dict(zip(CYR, LAT)))


def match(name):
    text = (name or "").lower()
    for key, needles in ALIASES.items():
        if any(needle in text for needle in needles):
            return key
    return None


def num(value):
    found = re.search(r"\d[\d.]*", value or "")
    return int(found.group(0).replace(".", "")) if found else 0


def slug(name):
    text = (name or "").lower()
    text = re.sub(r"\([^)]*\)", "", text).strip()
    for prefix in ("градска општина", "град", "општина"):
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    text = text.translate(TRANSLIT)
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def dhondt(entries, total=250):
    rows = [e for e in entries if (e["pct"] or 0) >= 3.0 or e["id"] in
            ("vmsz", "spp", "sda", "rs", "kshlp")]
    scores = []
    for entry in rows:
        for divisor in range(1, total + 1):
            scores.append(((entry["pct"] or 0) / divisor, entry["id"]))
    scores.sort(reverse=True)
    seats = {entry["id"]: 0 for entry in rows}
    for _, key in scores[:total]:
        seats[key] += 1
    for entry in entries:
        entry["seats"] = seats.get(entry["id"], 0)


def rik_api():
    session = requests.Session()
    session.headers.update(HEADERS)
    rounds = session.post(API + "/get-elections/", data={"election_type": 2},
                          timeout=45).json().get("rounds") or {}
    round_id = next((key for key, name in rounds.items() if "2026" in name), None)
    if not round_id and rounds:
        round_id = max(rounds, key=lambda key: int(key))
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
    return response.json(), session, round_id


def municipality_list(session, round_id):
    municipalities = []
    for region in ("1", "2", "3", "4"):
        response = session.post(API + "/get-municipalities/", data={
            "election_type": 2,
            "election_round": round_id,
            "election_region": region,
        }, timeout=45)
        for found in re.finditer(
                r'<option data-id="([^"]*)" value="([^"]*)">([^<]*)</option>',
                response.text):
            municipalities.append((region, found.group(2), found.group(3).strip()))
    return municipalities


def municipality_result(round_id, region, value):
    response = requests.post(API + "/get_results/", headers=HEADERS, data={
        "should_update_pies": 0,
        "type": "municipality",
        "election_round": round_id,
        "region": region,
        "municipality": value,
        "election_station": 0,
    }, timeout=45)
    response.raise_for_status()
    return response.json()


def rows_for(data):
    rows = []
    total = 0
    for row in data.get("table_data") or []:
        votes = num(row.get("won_number"))
        total += votes
        key = match(row.get("list_name"))
        if key:
            rows.append((key, votes))
    return rows, total


def result_area(name, votes_by_party, total, counted, stations, map_ids):
    if not counted or not total or not votes_by_party:
        return None
    ranked = sorted(votes_by_party.items(), key=lambda row: row[1], reverse=True)
    winner, votes = ranked[0]
    top = [{
        "id": key,
        "name": NAMES[key][1],
        "color": NAMES[key][2],
        "pct": round(party_votes / total * 100, 2),
        "votes": party_votes,
    } for key, party_votes in ranked[:3]]
    return {
        "name": name,
        "winner": winner,
        "winner_name": NAMES[winner][1],
        "pct": round(votes / total * 100, 2),
        "votes": votes,
        "counted": counted,
        "total": stations,
        "leading": True,
        "elected": False,
        "map_ids": map_ids,
        "top": top,
    }


def municipality_layers(session, round_id):
    district_votes = {district_id: {} for district_id, _, _ in DISTRICTS}
    district_totals = {district_id: 0 for district_id, _, _ in DISTRICTS}
    district_counted = {district_id: 0 for district_id, _, _ in DISTRICTS}
    district_stations = {district_id: 0 for district_id, _, _ in DISTRICTS}
    muni_votes = {}
    muni_totals = {}
    muni_counted = {}
    muni_stations = {}
    municipalities = municipality_list(session, round_id)
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(municipality_result, round_id, region, value)
                   for region, value, _ in municipalities]
        for (region, value, label), future in zip(municipalities, futures):
            try:
                data = future.result()
            except Exception as exc:
                print("serbia: municipality", value, "unavailable:", exc)
                continue
            rows, total = rows_for(data)
            stats = data.get("stat_sum_numbers") or {}
            counted = num(stats.get("processed_stations"))
            stations = num(stats.get("number_of_stations"))
            district_id = VALUE_TO_DISTRICT.get(value)
            if district_id:
                for key, votes in rows:
                    district_votes[district_id][key] = district_votes[district_id].get(key, 0) + votes
                district_totals[district_id] += total
                district_counted[district_id] += counted
                district_stations[district_id] += stations
            map_id = PARENT_MUNICIPALITY.get(value, slug(label))
            if map_id not in MUNICIPALITY_IDS:
                continue
            muni_votes.setdefault(map_id, {})
            for key, votes in rows:
                muni_votes[map_id][key] = muni_votes[map_id].get(key, 0) + votes
            muni_totals[map_id] = muni_totals.get(map_id, 0) + total
            muni_counted[map_id] = muni_counted.get(map_id, 0) + counted
            muni_stations[map_id] = muni_stations.get(map_id, 0) + stations

    district_areas = []
    for district_id, name, _ in DISTRICTS:
        area = result_area(name, district_votes[district_id],
                           district_totals[district_id], district_counted[district_id],
                           district_stations[district_id], [district_id])
        if area:
            district_areas.append(area)
    municipality_areas = []
    for map_id, votes in sorted(muni_votes.items()):
        area = result_area(map_id.replace("_", " ").title(), votes,
                           muni_totals[map_id], muni_counted[map_id],
                           muni_stations[map_id], [map_id])
        if area:
            municipality_areas.append(area)
    return district_areas, municipality_areas


def main():
    try:
        data, session, round_id = rik_api()
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
    if not entries or not any((entry["pct"] or 0) > 0 for entry in entries):
        print("serbia: no counted rows from RIK; trying elekt")
        return elekt_main()
    dhondt(entries)
    entries.sort(key=lambda entry: -(entry["pct"] or 0))
    district_areas, municipality_areas = municipality_layers(session, round_id)
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
        "area_title": "Districts",
        "area_label": "District",
        "area_note": "District totals aggregated from RIK municipality results.",
        "areas": district_areas,
        "map_svg": "../img/serbia.svg",
        "map_title": "District map",
        "map_note": "Switch between districts and municipalities. Each area is coloured by its leading list.",
        "map_layers": [
            {"id": "district", "label": "Districts", "title": "District map",
             "svg": "../img/serbia.svg", "areas": district_areas},
            {"id": "municipality", "label": "Municipalities", "title": "Municipality map",
             "svg": "../img/serbia_opstine.svg", "areas": municipality_areas},
        ],
        "notes": "D'Hondt allocation with a 3% threshold; national-minority lists are exempt.",
    })


def elekt_main():
    try:
        response = requests.get(ELEKT_URL, headers={
            "User-Agent": "600-live-results/1.0", "Accept": "application/json"}, timeout=45)
        response.raise_for_status()
        data = response.json().get("data", {})
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
    if not entries or not any((entry["pct"] or 0) > 0 for entry in entries):
        print("serbia: no counted rows from RIK or elekt; leaving waiting")
        return
    if not any(entry["seats"] for entry in entries):
        dhondt(entries)
    entries.sort(key=lambda entry: -(entry["pct"] or 0))
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
