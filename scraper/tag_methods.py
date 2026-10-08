#!/usr/bin/env python3
"""Tag every poll with its fieldwork method: online / phone / face / mixed.

The polling articles almost never carry a method column, so the method is
resolved from the polling firm through a curated, deliberately conservative
pattern table - only firms whose fieldwork is well established get a tag
(YouGov online, Ipsos MORI phone, Datafolha face-to-face). Everything else
stays "unknown", and the report lists the biggest unknowns so the table can
grow from evidence instead of guesswork.

Writes the `method` field into every data/<cc>/polls.json. Idempotent.

    python scraper/tag_methods.py           write the tags
    python scraper/tag_methods.py --check   report only, change nothing
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# order matters: first match wins, so specific names come before generic ones
RULES = [
    (r"you ?gov", "online"),
    (r"opinium", "online"),
    (r"savanta", "online"),
    (r"\bbmg\b", "online"),
    (r"deltapoll", "online"),
    (r"survation", "online"),
    (r"panelbase", "online"),
    (r"civey", "online"),
    (r"focaldata", "online"),
    (r"j\.?l\.? partners", "online"),
    (r"find out now", "online"),
    (r"more in common", "online"),
    (r"public first", "online"),
    (r"techne", "online"),
    (r"redfield", "online"),
    (r"atlas intel", "online"),
    (r"stack data", "online"),
    (r"\bnorstat\b", "online"),
    (r"leger", "online"),
    (r"\bswg\b", "online"),
    (r"\bemg\b", "online"),
    (r"tecne|tecn\u00e8", "phone"),
    (r"quaest", "phone"),
    (r"ipsos mori", "phone"),
    (r"\bmori\b", "phone"),
    (r"comres", "phone"),
    (r"gallup", "phone"),
    (r"ssrs", "phone"),
    (r"quinnipiac", "phone"),
    (r"marist", "phone"),
    (r"monmouth", "phone"),
    (r"\bpew\b", "phone"),
    (r"forsa", "phone"),
    (r"dimap", "phone"),
    (r"datafolha", "face"),
    (r"\bipc\b", "face"),
    (r"\bskds\b", "face"),
    (r"kantar", "mixed"),
    (r"ipsos", "mixed"),
    (r"gfk", "mixed"),
    (r"infratest", "mixed"),
]


def resolve(pollster):
    s = (pollster or "").lower()
    for pat, method in RULES:
        if re.search(pat, s):
            return method
    return None


def main():
    check = "--check" in sys.argv
    counts, unknown = {}, {}
    changed = 0
    for d in sorted(DATA.iterdir()):
        pj = d / "polls.json"
        if not d.is_dir() or not pj.is_file():
            continue
        j = json.loads(pj.read_text(encoding="utf8"))
        touched = False
        for p in j.get("polls", []):
            m = resolve(p.get("pollster"))
            if p.get("method") != m and not (m is None and "method" not in p):
                if m is None:
                    p.pop("method", None)
                else:
                    p["method"] = m
                touched = True
                changed += 1
            if m:
                counts[m] = counts.get(m, 0) + 1
            else:
                ps = p.get("pollster", "?")
                unknown[ps] = unknown.get(ps, 0) + 1
        if touched and not check:
            pj.write_text(json.dumps(j, ensure_ascii=False, indent=1),
                          encoding="utf8", newline="")
    print("methods:", ", ".join("%s %d" % (k, v)
                                for k, v in sorted(counts.items())))
    top = sorted(unknown.items(), key=lambda x: -x[1])[:15]
    print("unknown polls: %d across %d pollsters; biggest:" %
          (sum(unknown.values()), len(unknown)))
    for ps, n in top:
        print("   %3d  %s" % (n, ps))
    print("%d tag(s) %s" % (changed, "would change" if check else "written"))


if __name__ == "__main__":
    main()
