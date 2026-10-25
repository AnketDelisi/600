"""Bulgaria 2026 presidential live feed (CIK results page)."""
import re
from concurrent.futures import ThreadPoolExecutor

import requests
from bs4 import BeautifulSoup

from live_common import write_live

ELECTION = "bulgaria-2026"
CIK_BASE = "https://results.cik.bg/pvr202610/rezultati"
CIK_URL = CIK_BASE + "/index.html"
ELEKT_URL = "https://elekt.io/elekt/api/v1/elections/bgr-presidential-2026"
HEADERS = {"User-Agent": "600-live-results/1.0"}
ALIASES = {
    "iotova": ("iotova", "йотова"),
    "gyurov": ("gyurov", "гюров"),
    "kostadinov": ("kostadinov", "костадинов"),
    "vasilev": ("vasilev", "василев"),
    "mihaylov": ("mihaylov", "михайлов"),
    "hristanov": ("hristanov", "христанов"),
}
REGIONS = [
    ("01", "Blagoevgrad", "blagoevgrad"),
    ("02", "Burgas", "burgas"),
    ("03", "Varna", "varna"),
    ("04", "Veliko Tarnovo", "veliko_tarnovo"),
    ("05", "Vidin", "vidin"),
    ("06", "Vratsa", "vratsa"),
    ("07", "Gabrovo", "gabrovo"),
    ("08", "Dobrich", "dobrich"),
    ("09", "Kardzhali", "kardzhali"),
    ("10", "Kyustendil", "kyustendil"),
    ("11", "Lovech", "lovech"),
    ("12", "Montana", "montana"),
    ("13", "Pazardzhik", "pazardzhik"),
    ("14", "Pernik", "pernik"),
    ("15", "Pleven", "pleven"),
    ("16", "Plovdiv City", "plovdiv"),
    ("17", "Plovdiv Region", "plovdiv"),
    ("18", "Razgrad", "razgrad"),
    ("19", "Ruse", "ruse"),
    ("20", "Silistra", "silistra"),
    ("21", "Sliven", "sliven"),
    ("22", "Smolyan", "smolyan"),
    ("23", "Sofia 23", "sofiacity"),
    ("24", "Sofia 24", "sofiacity"),
    ("25", "Sofia 25", "sofiacity"),
    ("26", "Sofia Region", "sofia"),
    ("27", "Stara Zagora", "stara_zagora"),
    ("28", "Targovishte", "targovishte"),
    ("29", "Haskovo", "haskovo"),
    ("30", "Shumen", "shumen"),
    ("31", "Yambol", "yambol"),
]
NAMES = {
    "iotova": ("IOTOVA", "Iliana Iotova", "#DB0F28"),
    "gyurov": ("GYUROV", "Andrey Gyurov", "#4200FF"),
    "kostadinov": ("KOSTADINOV", "Kostadin Kostadinov", "#C09F62"),
    "vasilev": ("VASILEV", "Radostin Vasilev", "#1A2C44"),
    "mihaylov": ("MIHAYLOV", "Ivelin Mihaylov", "#AC2225"),
    "hristanov": ("HRISTANOV", "Ivan Hristanov", "#C0CC66"),
}


def party(name):
    text = (name or "").lower()
    for key, needles in ALIASES.items():
        if any(needle in text for needle in needles):
            return key
    return None


def num(value):
    found = re.search(r"\d[\d.]*", (value or "").replace("\xa0", ""))
    return int(found.group(0).replace(".", "")) if found else 0


def pct(value):
    found = re.search(r"(\d+(?:[.,]\d+)?)\s*%", value or "")
    return float(found.group(1).replace(",", ".")) if found else None


def parse_region(region):
    code, label, map_id = region
    response = requests.get(CIK_BASE + "/" + code + ".html", headers=HEADERS, timeout=45)
    response.raise_for_status()
    soup = BeautifulSoup(response.content.decode("utf-8", "replace"), "lxml")
    rows = []
    total = 0
    for row in soup.find_all("tr"):
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]
        if len(cells) < 3:
            continue
        votes = num(cells[-2])
        total += votes
        key = party(cells[1])
        if key:
            rows.append((key, votes))
    if not rows or not total:
        return None
    text = soup.get_text(" ", strip=True)
    found = re.search(r"обработени\s*([\d.,]+)\s*%", text, re.I)
    counted = float(found.group(1).replace(",", ".")) if found else None
    winner, votes = max(rows, key=lambda row: row[1])
    return map_id, label, winner, votes, total, counted


def regional_areas():
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(parse_region, REGIONS))
    merged = {}
    for result in results:
        if not result:
            continue
        map_id, label, winner, votes, total, counted = result
        row = merged.setdefault(map_id, {"label": label, "votes": {}, "total": 0, "counted": 0})
        row["votes"][winner] = row["votes"].get(winner, 0) + votes
        row["total"] += total
        row["counted"] = max(row["counted"], counted or 0)
    labels = {"plovdiv": "Plovdiv", "sofiacity": "Sofia City", "sofia": "Sofia Region"}
    areas = []
    for map_id, row in merged.items():
        winner, votes = max(row["votes"].items(), key=lambda item: item[1])
        areas.append({
            "name": labels.get(map_id, row["label"]),
            "winner": winner,
            "winner_name": NAMES[winner][1],
            "pct": round(votes / row["total"] * 100, 2),
            "votes": votes,
            "counted": row["counted"] or None,
            "total": 100,
            "leading": True,
            "elected": False,
            "map_ids": [map_id],
        })
    return areas


def cik_main():
    response = requests.get(CIK_URL, headers=HEADERS, timeout=45)
    response.raise_for_status()
    html = response.content.decode("utf-8", "replace")
    soup = BeautifulSoup(html, "lxml")
    entries = []
    for row in soup.find_all("tr"):
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]
        if len(cells) < 3:
            continue
        key = party(cells[1])
        if not key:
            continue
        share = pct(cells[-1])
        if share is None:
            continue
        entries.append({
            "id": key,
            "name": NAMES[key][1],
            "color": NAMES[key][2],
            "pct": share,
            "votes": num(cells[-2]),
            "seats": 0,
        })
    if not entries:
        print("bulgaria: no counted table yet")
        return False
    entries.sort(key=lambda entry: -(entry["pct"] or 0))
    text = soup.get_text(" ", strip=True)
    counted = None
    found = re.search(r"обработени\s*([\d.,]+)\s*%", text, re.I)
    if found:
        counted = float(found.group(1).replace(",", "."))
    updated = None
    found = re.search(r"Данни към\s*([^|]+?)\s*при обработени", text)
    if found:
        updated = found.group(1).strip()
    status = "final" if counted is not None and counted >= 100 else "counting"
    areas = regional_areas()
    write_live(ELECTION, {
        "name": "Bulgaria 2026",
        "date": "2026-10-25",
        "close_at": "2026-10-25T18:00:00Z",
        "chart_start": "2026-09-25",
        "subtitle": "Presidential election · first round",
        "status": status,
        "counted": counted,
        "total": 100,
        "counted_label": "percent of sections",
        "source": "Central Election Commission (CIK)",
        "source_url": CIK_URL,
        "source_updated_at": updated,
        "result_title": "First-round vote",
        "result_note": "CIK preliminary count. A runoff, if needed, is on 1 November.",
        "entries": entries,
        "seat_total": None,
        "majority": None,
        "area_title": "Regions",
        "area_label": "Region",
        "area_note": "CIK regional totals. Regions are coloured by their leading candidate.",
        "areas": areas,
        "map_svg": "../img/bulgaria.svg",
        "map_title": "Regional map",
        "map_note": "Colour shows the leading candidate in each CIK region.",
        "notes": "First round on 25 October. A runoff, if needed, is on 1 November.",
    })
    return True


def elekt_main():
    response = requests.get(ELEKT_URL, headers={
        "User-Agent": "600-live-results/1.0", "Accept": "application/json"}, timeout=45)
    response.raise_for_status()
    data = response.json().get("data", {})
    rows = data.get("contestants") or []
    if not rows:
        return False
    entries = []
    for row in rows:
        label = row.get("candidate") or row.get("label") or ""
        key = party(label)
        if not key:
            continue
        entries.append({
            "id": key,
            "name": NAMES[key][1],
            "color": NAMES[key][2],
            "pct": row.get("vote_share") or 0,
            "votes": row.get("votes") or 0,
            "seats": 0,
        })
    if not entries:
        return False
    entries.sort(key=lambda entry: -(entry["pct"] or 0))
    write_live(ELECTION, {
        "name": "Bulgaria 2026",
        "date": "2026-10-25",
        "close_at": "2026-10-25T18:00:00Z",
        "chart_start": "2026-09-25",
        "subtitle": "Presidential election · first round",
        "status": "final" if data.get("results_status") in ("final", "declared") else "counting",
        "counted": None,
        "total": None,
        "counted_label": "sections",
        "source": "CIK (via elekt)",
        "source_url": "https://elekt.io/bulgaria/presidential-2026",
        "result_title": "First-round vote",
        "result_note": "CIK preliminary count, compiled by elekt. A runoff, if needed, is on 1 November.",
        "entries": entries,
        "seat_total": None,
        "majority": None,
        "area_title": "Regions",
        "area_label": "Region",
        "area_note": "CIK regional totals. Regions are coloured by their leading candidate.",
        "areas": [],
        "map_svg": "../img/bulgaria.svg",
        "map_title": "National map",
        "map_note": "The available feed has no regional totals, so the map shows the national leader.",
        "notes": "First round on 25 October. A runoff, if needed, is on 1 November.",
    })
    return True


def main():
    try:
        if cik_main():
            return
    except Exception as exc:
        print("bulgaria: CIK unavailable (%s); trying elekt" % exc)
    try:
        elekt_main()
    except Exception as exc:
        print("bulgaria: no live source (%s); leaving waiting" % exc)


if __name__ == "__main__":
    main()
