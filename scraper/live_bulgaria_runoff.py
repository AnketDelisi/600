"""Bulgaria 2026 presidential runoff live feed (CIK)."""
from concurrent.futures import ThreadPoolExecutor

import requests
from live_common import write_live
from live_bulgaria import HEADERS, NAMES, REGIONS, party, pct

ELECTION = "bulgaria-2026-r2"


def vnum(value):
    digits = "".join(c for c in str(value or "") if c.isdigit())
    return int(digits) if digits else 0
CIK_BASE = "https://results.cik.bg/pvr202610/tur2/rezultati"
CIK_URL = CIK_BASE + "/index.html"


def parse_main():
    response = requests.get(CIK_URL, headers=HEADERS, timeout=45)
    response.raise_for_status()
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(response.content.decode("utf-8", "replace"), "lxml")
    entries = []
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True).replace("\xa0", " ")
                 for c in row.find_all(["td", "th"])]
        if len(cells) < 3:
            continue
        key = party(cells[1])
        share = pct(cells[-1])
        if key is None:
            if "не подкрепям" in cells[1].lower():
                key = "nota"
            else:
                continue
        entries.append({"id": key,
                        "name": "None of the above" if key == "nota"
                                else NAMES[key][1],
                        "color": "#9CA3AF" if key == "nota"
                                 else NAMES[key][2],
                        "pct": share, "votes": vnum(cells[-2]), "seats": 0})
    entries.sort(key=lambda e: -(e["pct"] or 0))
    text = soup.get_text(" ", strip=True)
    import re
    found = re.search(r"обработени\s*([\d.,]+)\s*%", text, re.I)
    counted = float(found.group(1).replace(",", ".")) if found else None
    updated = None
    found = re.search(r"Данни към\s*([^|]+?)\s*при обработени", text)
    if found:
        updated = found.group(1).strip()
    return entries, counted, updated


def parse_region(region):
    code, label, map_id = region
    response = requests.get(CIK_BASE + "/" + code + ".html",
                            headers=HEADERS, timeout=45)
    response.raise_for_status()
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(response.content.decode("utf-8", "replace"), "lxml")
    rows, total = [], 0
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True).replace("\xa0", " ")
                 for c in row.find_all(["td", "th"])]
        if len(cells) < 3:
            continue
        votes = vnum(cells[-2])
        total += votes
        key = party(cells[1])
        if key:
            rows.append((key, votes))
    if not rows or not total:
        return None
    text = soup.get_text(" ", strip=True)
    import re
    found = re.search(r"обработени\s*([\d.,]+)\s*%", text, re.I)
    counted = float(found.group(1).replace(",", ".")) if found else None
    return map_id, label, dict(rows), total, counted


def areas():
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(parse_region, REGIONS))
    merged = {}
    for result in results:
        if not result:
            continue
        map_id, label, votes, total, counted = result
        row = merged.setdefault(map_id, {"label": label, "votes": {},
                                         "total": 0, "counted": 0})
        for key, value in votes.items():
            row["votes"][key] = row["votes"].get(key, 0) + value
        row["total"] += total
        row["counted"] = max(row["counted"], counted or 0)
    labels = {"plovdiv": "Plovdiv", "sofiacity": "Sofia City",
              "sofia": "Sofia Region"}
    out = []
    for map_id, row in merged.items():
        if not row["votes"]:
            continue
        ranked = sorted(row["votes"].items(), key=lambda x: x[1], reverse=True)
        winner, votes = ranked[0]
        top = [{"id": k, "name": NAMES[k][1], "color": NAMES[k][2],
                "pct": round(v / row["total"] * 100, 2), "votes": v}
               for k, v in ranked[:3]]
        out.append({"name": labels.get(map_id, row["label"]),
                    "winner": winner, "winner_name": NAMES[winner][1],
                    "pct": round(votes / row["total"] * 100, 2),
                    "votes": votes, "counted": row["counted"] or None,
                    "total": 100, "leading": True, "elected": False,
                    "map_ids": [map_id], "top": top})
    return out


def main():
    try:
        entries, counted, updated = parse_main()
    except Exception as exc:
        print("bulgaria runoff: no CIK result (%s)" % exc)
        return
    if not entries:
        print("bulgaria runoff: no result rows")
        return
    payload = {
        "name": "Bulgaria 2026 runoff",
        "date": "2026-11-01",
        "close_at": "2026-11-01T18:00:00Z",
        "chart_start": "2026-10-25",
        "subtitle": "Presidential election · runoff",
        "status": "final" if counted is not None and counted >= 100 else "counting",
        "counted": counted,
        "total": 100,
        "counted_label": "percent of sections",
        "source": "Central Election Commission (CIK)",
        "source_url": CIK_URL,
        "source_updated_at": updated,
        "result_title": "Runoff vote",
        "result_note": "CIK runoff count; the official record governs.",
        "entries": entries,
        "seat_total": None,
        "majority": None,
        "area_title": "Regions",
        "area_label": "Region",
        "area_note": "CIK runoff totals by region.",
        "areas": areas(),
        "map_svg": "../img/bulgaria.svg",
        "map_title": "Regional map",
        "map_note": "Colour shows the leading runoff candidate in each CIK region.",
        "notes": "Presidential runoff, 1 November 2026.",
    }
    write_live(ELECTION, payload)


if __name__ == "__main__":
    main()
