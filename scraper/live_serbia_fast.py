"""Fast Serbia national update; keeps the existing district/municipality layers."""
import json
from pathlib import Path

from live_common import write_live
from live_serbia import (ELECTION, URL, NAMES, dhondt, match, num, rik_api)


def main():
    try:
        data, _, _ = rik_api()
    except Exception as exc:
        print("serbia fast: RIK unavailable (%s)" % exc)
        return
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
        return
    dhondt(entries)
    entries.sort(key=lambda entry: -(entry["pct"] or 0))
    counted = num(stats.get("processed_stations"))
    total = num(stats.get("number_of_stations"))
    path = Path(__file__).resolve().parents[1] / "data" / "live" / (ELECTION + ".json")
    payload = json.loads(path.read_text(encoding="utf8")) if path.exists() else {}
    payload.update({
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
    })
    write_live(ELECTION, payload)


if __name__ == "__main__":
    main()
