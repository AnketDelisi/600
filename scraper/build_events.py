#!/usr/bin/env python3
"""Build data/events.json - the annotation layer under the trend charts.

Derived: every country's last/next election date (from js/config.js).
Curated: party events verified from the sources (currently none; Turkey and
Spain are excluded from the annotation layer entirely by request).
Run after config changes; release.py runs it automatically.
"""
import json
import os
import subprocess

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

# no annotation markers for these countries (charts stay clean)
SKIP = {"turkey", "spain"}

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

CURATED = {}


def main():
    out = subprocess.run(["node", "-e", NODE], cwd=ROOT,
                         capture_output=True, text=True)
    if out.returncode != 0:
        print(out.stderr.strip()[:300])
        return
    cfg = json.loads(out.stdout)
    events = {}
    for cc, v in cfg.items():
        if cc in SKIP:
            continue
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
    for cc in events:
        events[cc].sort(key=lambda e: e["date"])
    path = os.path.join(ROOT, "data", "events.json")
    with open(path, "w", encoding="utf8") as fh:
        json.dump(events, fh, ensure_ascii=False, indent=1)
    print("events.json: %d countries, %d events"
          % (len(events), sum(len(v) for v in events.values())))


if __name__ == "__main__":
    main()
