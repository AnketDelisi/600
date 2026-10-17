#!/usr/bin/env python3
"""Build data/events.json - the annotation layer under the trend charts.

Derived: every country's last/next election date (from js/config.js).
Curated: the party events verified from the sources (Spain's Frente
Amplio milestones; Turkey's Yeni Parti split = its first polled date).
Run after config changes; release.py runs it automatically.
"""
import json
import os
import subprocess

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

NODE = (
    'const fs=require("fs"),vm=require("vm");'
    'const sb={window:{},console};sb.window=sb;vm.createContext(sb);'
    'vm.runInContext(fs.readFileSync("js/config.js","utf8")+";__o=COUNTRIES;",sb);'
    'const out={};'
    'for(const cc of Object.keys(sb.__o)){const c=sb.__o[cc];'
    'const pn={};for(const k of Object.keys(c.parties||{})){'
    'const d=c.parties[k];pn[k]={n:d.name||k,e:d.name_en||d.name||k};}'
    'out[cc]={last:(c.lastElection||{}).date||null,parties:pn,'
    'next:c.election_date||c.electionDate||c.nextElection||null};}'
    'console.log(JSON.stringify(out));'
)

CURATED = {
    "spain": [
        {"date": "2026-02-21", "en": "Broad Front launched",
         "tr": "Frente Amplio lansman\u0131"},
        {"date": "2026-09-25", "en": "Broad Front name revealed",
         "tr": "Frente Amplio ad\u0131 a\u00e7\u0131kland\u0131"},
        {"date": "2026-10-12", "en": "Ada Colau announced as candidate",
         "tr": "Ada Colau aday ilan edildi"},
    ],
}


def main():
    out = subprocess.run(["node", "-e", NODE], cwd=ROOT,
                         capture_output=True, text=True)
    if out.returncode != 0:
        print(out.stderr.strip()[:300])
        return
    cfg = json.loads(out.stdout)
    events = {}
    for cc, v in cfg.items():
        lst = []
        if v.get("last"):
            lst.append({"date": v["last"], "en": "Previous election",
                        "tr": "Son se\u00e7im"})
        if v.get("next"):
            lst.append({"date": v["next"], "en": "Election day",
                        "tr": "Se\u00e7im g\u00fcn\u00fc"})
        if lst:
            events[cc] = lst
    for cc, lst in CURATED.items():
        events.setdefault(cc, []).extend(lst)
    # data-derived party entrances: a party whose first appearance is well
    # after the series starts and that sticks around is a real system change
    # (a split, a new alliance, a new candidate entering the field)
    from datetime import date, timedelta
    data_dir = os.path.join(ROOT, "data")
    for cc in sorted(os.listdir(data_dir)):
        pj = os.path.join(data_dir, cc, "polls.json")
        if not os.path.exists(pj):
            continue
        try:
            polls = json.load(open(pj, encoding="utf8")).get("polls") or []
        except Exception:
            continue
        dated = [p for p in polls if p.get("date") and p.get("votes")]
        if len(dated) < 8:
            continue
        first = min(p["date"] for p in dated)
        cutoff = (date.fromisoformat(first) + timedelta(days=180)).isoformat()
        appeared = {}
        for p in dated:
            for k in p["votes"]:
                appeared.setdefault(k, []).append(p["date"])
        names = cfg.get(cc, {}).get("parties") or {}
        ent = []
        for k, ds in appeared.items():
            fd = min(ds)
            if fd <= cutoff or len(ds) < 5:
                continue
            ent.append((len(ds), fd, k))
        for n, fd, k in sorted(ent, reverse=True)[:3]:
            nm = names.get(k) or {}
            events.setdefault(cc, []).append(
                {"date": fd,
                 "en": "%s first polled" % (nm.get("e") or k.upper()),
                 "tr": "%s ilk kez anketlerde" % (nm.get("n") or k.upper())})
    for cc in events:
        events[cc].sort(key=lambda e: e["date"])
    path = os.path.join(ROOT, "data", "events.json")
    with open(path, "w", encoding="utf8") as fh:
        json.dump(events, fh, ensure_ascii=False, indent=1)
    print("events.json: %d countries, %d events"
          % (len(events), sum(len(v) for v in events.values())))


if __name__ == "__main__":
    main()
