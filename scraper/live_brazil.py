"""Brazil 2026 presidential runoff live feed (TSE official JSON)."""
import json
import re
import urllib.request

from live_common import write_live

ELECTION = "brazil-2026-r2"
URL = ("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/"
       "br-c0001-e006258-u.json")
NAMES = {
    "13": ("lula", "Luiz Inácio Lula da Silva", "#E20E28"),
    "22": ("flavio", "Flávio Bolsonaro", "#015AAA"),
}


def fetch():
    req = urllib.request.Request(URL, headers={
        "User-Agent": "600-live-results/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf8", "replace"))


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
    status = "waiting"
    if counted:
        status = "final" if data.get("and") == "f" or (total and counted >= total) else "counting"
    write_live(ELECTION, {
        "name": "Brazil 2026 runoff",
        "date": "2026-10-25",
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
        "areas": [],
        "notes": "The first round was Lula 45.16%, Flávio 47.03% of valid votes.",
    })


if __name__ == "__main__":
    main()
