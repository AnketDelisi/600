"""Bulgaria 2026 presidential live feed (CIK results page)."""
import re

import requests
from bs4 import BeautifulSoup

from live_common import write_live

ELECTION = "bulgaria-2026"
CIK_URL = "https://results.cik.bg/pvr202610/rezultati/index.html"
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
        "areas": [],
        "map_svg": "../img/bulgaria.svg",
        "map_title": "National map",
        "map_note": "CIK's regional feed is not publicly accessible, so the map shows the national leader.",
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
        "areas": [],
        "map_svg": "../img/bulgaria.svg",
        "map_title": "National map",
        "map_note": "CIK's regional feed is not publicly accessible, so the map shows the national leader.",
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
