"""Fast Bulgaria national update; keeps the existing regional map data."""
import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from live_common import write_live
from live_bulgaria import CIK_URL, ELECTION, HEADERS, NAMES, num, party, pct


def main():
    try:
        response = requests.get(CIK_URL, headers=HEADERS, timeout=45)
        response.raise_for_status()
    except Exception as exc:
        print("bulgaria fast: CIK unavailable (%s)" % exc)
        return
    soup = BeautifulSoup(response.content.decode("utf-8", "replace"), "lxml")
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
        return
    entries.sort(key=lambda entry: -(entry["pct"] or 0))
    text = soup.get_text(" ", strip=True)
    found = re.search(r"обработени\s*([\d.,]+)\s*%", text, re.I)
    counted = float(found.group(1).replace(",", ".")) if found else None
    updated = None
    found = re.search(r"Данни към\s*([^|]+?)\s*при обработени", text)
    if found:
        updated = found.group(1).strip()
    path = Path(__file__).resolve().parents[1] / "data" / "live" / (ELECTION + ".json")
    payload = json.loads(path.read_text(encoding="utf8")) if path.exists() else {}
    payload.update({
        "name": "Bulgaria 2026",
        "date": "2026-10-25",
        "close_at": "2026-10-25T18:00:00Z",
        "chart_start": "2026-09-25",
        "subtitle": "Presidential election · first round",
        "status": "final" if counted is not None and counted >= 100 else "counting",
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
    })
    write_live(ELECTION, payload)


if __name__ == "__main__":
    main()
