"""Brazil 2026 presidential runoff live feed (TSE official JSON)."""
import json
import shutil
import subprocess
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from live_common import write_live

ELECTION = "brazil-2026-r2"
BASE = "https://resultados.tse.jus.br/oficial/ele2026/6258/dados"
URL = BASE + "/br/br-c0001-e006258-u.json"
STATES = ("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO").split()
LIVE_DIR = Path(__file__).resolve().parents[1] / "data" / "live"
NAMES = {
    "13": ("lula", "Luiz Inácio Lula da Silva", "#E20E28"),
    "22": ("flavio", "Flávio Bolsonaro", "#015AAA"),
}


def fetch_json(url):
    headers = {"User-Agent": "600-live-results/1.0", "Accept": "application/json"}
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf8", "replace"))
        except Exception as exc:
            last = exc
            time.sleep(1 + attempt)
    if shutil.which("curl"):
        try:
            out = subprocess.run(
                ["curl", "-fsSL", "--max-time", "30", "-A", headers["User-Agent"], url],
                check=True, capture_output=True)
            return json.loads(out.stdout.decode("utf8", "replace"))
        except Exception as exc:
            last = exc
    raise last


def fetch():
    return fetch_json(URL)


def pct(v):
    if v is None:
        return None
    try:
        return float(str(v).replace("%", "").replace(",", "."))
    except ValueError:
        return None


def main():
    data = fetch()
    counted = int(data.get("s", {}).get("st") or 0)
    total = int(data.get("s", {}).get("ts") or 0)
    entries = []
    for carg in data.get("carg") or []:
        for agr in carg.get("agr") or []:
            for par in agr.get("par") or []:
                for cand in par.get("cand") or []:
                    n = str(cand.get("n") or "")
                    if n not in NAMES:
                        continue
                    cid, name, color = NAMES[n]
                    entries.append({
                        "id": cid,
                        "name": name,
                        "color": color,
                        "pct": pct(cand.get("pvap")),
                        "votes": int(cand.get("vap") or 0),
                        "seats": 0,
                    })
    if not entries:
        print("brazil: no runoff candidates in feed; leaving waiting")
        return
    entries.sort(key=lambda e: -(e["pct"] or 0))
    areas = []
    if counted:
        previous = {}
        path = LIVE_DIR / (ELECTION + ".json")
        if path.exists():
            try:
                previous = {a["name"]: a for a in json.loads(path.read_text(encoding="utf8")).get("areas", [])}
            except Exception:
                previous = {}
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(fetch_state, STATES))
        for code, state in zip(STATES, results):
            area = state_area(code, state) if state else None
            if area:
                areas.append(area)
            elif code.upper() in previous:
                areas.append(previous[code.upper()])
        areas.sort(key=lambda a: a["name"])
    status = "waiting"
    if counted:
        status = "final" if data.get("and") == "f" or (total and counted >= total) else "counting"
    write_live(ELECTION, {
        "name": "Brazil 2026 runoff",
        "date": "2026-10-25",
        "close_at": "2026-10-25T20:00:00Z",
        "chart_start": "2026-10-05",
        "subtitle": "Presidential runoff · Lula vs Flávio Bolsonaro",
        "status": status,
        "counted": counted,
        "total": total,
        "counted_label": "sections",
        "source": "Superior Electoral Court (TSE)",
        "source_url": URL,
        "source_updated_at": ((data.get("dg") or "") + " " + (data.get("hg") or "")).strip(),
        "waiting_text": "Polls close at 17:00 Brasília time on Sunday, 25 October.",
        "result_title": "Valid vote",
        "result_note": "Official TSE totalization. Percentages are of valid votes.",
        "entries": entries,
        "seat_total": None,
        "majority": None,
        "area_title": "State results",
        "area_label": "State",
        "area_note": "State-level leaders as reported by TSE. States are coloured by the leading candidate.",
        "areas": areas,
        "map_svg": "../img/brazil.svg",
        "map_title": "State map",
        "map_note": "States are coloured by the leading candidate in the official TSE count.",
        "notes": "The first round was Lula 45.16%, Flávio 47.03% of valid votes.",
    })


def fetch_state(code):
    try:
        return fetch_json(BASE + "/" + code.lower() + "/" + code.lower() + "-c0001-e006258-u.json")
    except Exception as exc:
        print("brazil: state", code, "unavailable:", exc)
        return None


def state_area(code, data):
    s = data.get("s") or {}
    counted = int(s.get("st") or 0)
    total = int(s.get("ts") or 0)
    if not counted:
        return None
    rows = []
    for carg in data.get("carg") or []:
        for agr in carg.get("agr") or []:
            for par in agr.get("par") or []:
                for cand in par.get("cand") or []:
                    n = str(cand.get("n") or "")
                    if n not in NAMES:
                        continue
                    cid, name, _ = NAMES[n]
                    rows.append({
                        "id": cid, "name": name,
                        "pct": pct(cand.get("pvap")),
                        "votes": int(cand.get("vap") or 0),
                    })
    if not rows:
        return None
    ranked = sorted(rows, key=lambda r: ((r["pct"] or 0), r["votes"]), reverse=True)
    top = ranked[0]
    return {
        "name": code.upper(),
        "winner": top["id"],
        "winner_name": top["name"],
        "pct": top["pct"],
        "votes": top["votes"],
        "counted": counted,
        "total": total,
        "leading": True,
        "elected": False,
        "top": ranked[:2],
    }


if __name__ == "__main__":
    main()
