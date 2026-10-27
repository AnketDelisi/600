"""Israel 2026 Knesset live results (CEC data via Knesset Count)."""
import re
from datetime import datetime, timezone

import requests

from live_common import write_live

ELECTION = "israel-2026"
URL = "https://knesset-count.lol/api/results?k=26"
SOURCE_URL = "https://knesset-count.lol/"
LETTERS = {
    "מחל": ("likud", "Likud", "#1F5AA5"),
    "רק": ("together", "Together", "#2A2A78"),
    "דרך": ("yashar", "Yashar", "#62B9F2"),
    "ט": ("rzp", "Religious Zionist Party", "#4F9298"),
    "ב": ("otzma", "Otzma Yehudit", "#FF4500"),
    "שס": ("shas", "Shas", "#000000"),
    "ג": ("utj", "United Torah Judaism", "#003366"),
    "ל": ("yb", "Yisrael Beiteinu", "#23C2EB"),
    "כן": ("blue_white", "Blue and White", "#0DAAFF"),
    "די": ("reservists", "The Reservists", "#68692C"),
    "אמת": ("dems", "The Democrats", "#2A38D7"),
    "עם": ("raam", "Ra'am", "#15793D"),
    "ודם": ("joint_list", "Joint List", "#01B2AC"),
    "ך": ("amcha", "Amcha Yisrael", "#8F36BF"),
}


def waiting_text():
    close = datetime(2026, 10, 27, 19, 0, tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= close:
        return "Polls have closed. Waiting for the first official results."
    return "Polls close at 22:00 Israel time on Tuesday, 27 October."


def waiting():
    write_live(ELECTION, {
        "name": "Israel 2026",
        "date": "2026-10-27",
        "close_at": "2026-10-27T19:00:00Z",
        "chart_start": "2026-09-01",
        "subtitle": "Knesset · 120 seats · 3.25% threshold",
        "status": "waiting",
        "counted": None,
        "total": None,
        "counted_label": "votes counted",
        "source": "Knesset Count (CEC data)",
        "source_url": SOURCE_URL,
        "waiting_text": waiting_text(),
        "result_title": "Vote share",
        "result_note": "Official CEC count, with Bader-Ofer seat allocation.",
        "entries": [],
        "seat_total": 120,
        "majority": 61,
        "areas": [],
        "notes": "Knesset seats use the Bader-Ofer method and the 3.25% threshold. Results are preliminary until the CEC publishes the official record.",
    })


def main():
    try:
        response = requests.get(URL, headers={"User-Agent": "600-live-results/1.0",
                                              "Accept": "application/json"}, timeout=45)
        if response.status_code != 200:
            print("israel: results not published yet")
            return waiting()
        data = response.json()
    except Exception as exc:
        print("israel: source unavailable (%s)" % exc)
        return waiting()
    rows = data.get("lists") or []
    entries = []
    for row in rows:
        key = LETTERS.get(row.get("letters"))
        if not key:
            continue
        entries.append({
            "id": key[0], "name": key[1], "color": key[2],
            "pct": None, "votes": int(row.get("votes") or 0),
            "seats": int(row.get("seats") or 0),
        })
    if not entries:
        print("israel: no results yet")
        return waiting()
    total_votes = sum(int(row.get("votes") or 0) for row in rows)
    for entry in entries:
        entry["pct"] = round(entry["votes"] / total_votes * 100, 2) if total_votes else None
    entries.sort(key=lambda e: (-e["seats"], -e["votes"]))
    summary = data.get("summary") or []
    turnout = None
    for row in summary:
        if isinstance(row, list) and len(row) >= 2 and ("שיעור" in str(row[0]) or "הצבעה" in str(row[0])):
            found = re.search(r"(\d+(?:[.,]\d+)?)\s*%", str(row[1]))
            if found:
                turnout = float(found.group(1).replace(",", "."))
    write_live(ELECTION, {
        "name": "Israel 2026",
        "date": "2026-10-27",
        "close_at": "2026-10-27T19:00:00Z",
        "chart_start": "2026-09-01",
        "subtitle": "Knesset · 120 seats · 3.25% threshold",
        "status": "counting",
        "counted": None,
        "total": None,
        "counted_label": "votes counted",
        "turnout": turnout,
        "source": "Knesset Count (CEC data)",
        "source_url": SOURCE_URL,
        "result_title": "Vote share",
        "result_note": "Official CEC count, with Bader-Ofer seat allocation.",
        "entries": entries,
        "seat_total": 120,
        "majority": 61,
        "areas": [],
        "notes": "Knesset seats use the Bader-Ofer method and the 3.25% threshold. Results are preliminary until the CEC publishes the official record.",
    })


if __name__ == "__main__":
    main()
