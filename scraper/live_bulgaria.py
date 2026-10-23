"""Bulgaria 2026 presidential live feed.

CIK's own results host is behind a Cloudflare challenge from many networks.
Elekt's public API carries the same CIK count and is readable from Actions, so
it is the live source; the official CIK link stays on the page.
"""
import re

import requests
from bs4 import BeautifulSoup

from live_common import write_live

ELECTION = "bulgaria-2026"
URL = "https://elekt.io/elekt/api/v1/elections/bgr-presidential-2026"
CIK_URL = "https://results.cik.bg/pi2026/"
NAMES = {
    "iotova": ("IOTOVA", "Iliana Iotova", "#DB0F28"),
    "gyurov": ("GYUROV", "Andrey Gyurov", "#4200FF"),
    "kostadinov": ("KOSTADINOV", "Kostadin Kostadinov", "#C09F62"),
    "vasilev": ("VASILEV", "Radostin Vasilev", "#1A2C44"),
    "mihaylov": ("MIHAYLOV", "Ivelin Mihaylov", "#AC2225"),
    "hristanov": ("HRISTANOV", "Ivan Hristanov", "#C0CC66"),
}


def api_main():
    r = requests.get(URL, headers={"User-Agent": "600-live-results/1.0",
                                   "Accept": "application/json"}, timeout=45)
    r.raise_for_status()
    data = r.json().get("data", {})
    rows = data.get("contestants") or []
    if not rows:
        print("bulgaria: no counted candidates yet; leaving waiting")
        return True
    entries = []
    for row in rows:
        label = row.get("candidate") or row.get("label") or ""
        key = party(label) or re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
        name = NAMES.get(key, (None, label, "#6B7280"))
        entries.append({
            "id": key, "name": name[1] or label, "color": name[2],
            "pct": row.get("vote_share") or 0,
            "votes": row.get("votes") or 0,
            "seats": 0,
        })
    entries.sort(key=lambda e: -(e["pct"] or 0))
    status = "final" if data.get("results_status") in ("final", "declared") else "counting"
    write_live(ELECTION, {
        "name": "Bulgaria 2026",
        "date": "2026-10-25",
        "subtitle": "Presidential election · first round",
        "status": status,
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
        "notes": "First round on 25 October. A runoff, if needed, is on 1 November.",
    })
    return True


def party(name):
    t = (name or "").lower()
    for key, (needle, _, _) in NAMES.items():
        if needle.lower() in t or key in t:
            return key
    return None


def pct(s):
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*%", s or "")
    return float(m.group(1).replace(",", ".")) if m else None


def main():
    try:
        api_main()
        return
    except Exception as e:
        print("bulgaria: API unavailable (%s); trying CIK page" % e)
    try:
        r = requests.get(CIK_URL, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=45)
        r.raise_for_status()
    except Exception as e:
        print("bulgaria: source unavailable (%s); leaving waiting" % e)
        return
    soup = BeautifulSoup(r.text, "lxml")
    entries = []
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in row.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        key = party(cells[0]) or party(cells[1])
        if not key:
            continue
        text = " ".join(cells)
        p = pct(text)
        if p is None:
            continue
        entries.append({"id": key, "name": NAMES[key][1],
                        "color": NAMES[key][2], "pct": p, "votes": 0, "seats": 0})
    if not entries:
        print("bulgaria: no counted table yet; leaving waiting")
        return
    entries.sort(key=lambda e: -(e["pct"] or 0))
    write_live(ELECTION, {
        "name": "Bulgaria 2026",
        "date": "2026-10-25",
        "subtitle": "Presidential election · first round",
        "status": "counting",
        "counted": None,
        "total": None,
        "counted_label": "sections",
        "source": "Central Election Commission (CIK)",
        "source_url": CIK_URL,
        "result_title": "First-round vote",
        "result_note": "CIK preliminary count. A runoff, if needed, is on 1 November.",
        "entries": entries,
        "seat_total": None,
        "majority": None,
        "areas": [],
        "notes": "First round on 25 October. A runoff, if needed, is on 1 November.",
    })


if __name__ == "__main__":
    main()
