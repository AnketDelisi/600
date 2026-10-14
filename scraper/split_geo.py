#!/usr/bin/env python3
"""Split the heavy per-country map configs out of js/config.js.

For every country whose `map` (plus `map2`) serializes above 30 KB, the map
object moves to data/<cc>/geo.json and the config keeps `map: {}`. The app
fetches geo.json when a country's map is empty (js/app.js loadData). Run
after any builder that rewrites a country block; release.py runs it too.

Usage: python scraper/split_geo.py [--threshold KB]
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")

NODE = (
    'const fs=require("fs"),vm=require("vm");'
    'const sb={window:{},console};sb.window=sb;vm.createContext(sb);'
    'vm.runInContext(fs.readFileSync("js/config.js","utf8")+";__out=COUNTRIES;",sb);'
    'const o={};'
    'for(const cc of Object.keys(sb.__out)){const c=sb.__out[cc];'
    'if(!c.map)continue;'
    'o[cc]={size:JSON.stringify(c.map).length'
    '+(c.map2?JSON.stringify(c.map2).length:0),map:c.map,map2:c.map2||null};}'
    'console.log(JSON.stringify(o));'
)


def brace_end(text, open_idx):
    """Index just past the brace-matched close of the '{' at open_idx."""
    depth = 0
    k = open_idx
    while k < len(text):
        ch = text[k]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return k + 1
        k += 1
    raise ValueError("unbalanced braces")


def main():
    threshold = 30000
    if "--threshold" in sys.argv:
        threshold = int(sys.argv[sys.argv.index("--threshold") + 1]) * 1024

    out = subprocess.run(["node", "-e", NODE], cwd=ROOT,
                         capture_output=True, text=True)
    if out.returncode != 0:
        print(out.stderr.strip()[:400])
        sys.exit(1)
    data = json.loads(out.stdout)
    targets = {cc: v for cc, v in data.items() if v["size"] > threshold}
    if not targets:
        print("split_geo: nothing above the threshold")
        return

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    moved = []
    for cc, v in sorted(targets.items()):
        d = os.path.join(ROOT, "data", cc)
        os.makedirs(d, exist_ok=True)
        geo = {"map": v["map"]}
        if v["map2"] and len(json.dumps(v["map2"])) > 4000:
            geo["map2"] = v["map2"]
        with open(os.path.join(d, "geo.json"), "w", encoding="utf8") as fh:
            json.dump(geo, fh, ensure_ascii=False)
        # stub the country's map block in place
        i = text.find("\n  %s: {" % cc)
        assert i > 0, "country block not found: " + cc
        cb_open = text.find("{", i)
        cb_end = brace_end(text, cb_open)
        block = text[i:cb_end]
        mi = block.find("\n    map: {")
        assert mi > 0, "map block not found: " + cc
        m_open = block.find("{", mi)
        m_end = brace_end(block, m_open)
        block = block[:mi] + "\n    map: {}" + block[m_end:]
        if "map2" in geo:
            m2 = re.search(r"\n[ \t]*map2: \{", block)
            if m2:
                m2_open = block.find("{", m2.start())
                m2_end = brace_end(block, m2_open)
                block = block[:m2.start()] + "\n    map2: {}" + block[m2_end:]
        text = text[:i] + block + text[cb_end:]
        moved.append((cc, round(v["size"] / 1024)))
    with open(os.path.join(ROOT, "js", "config.js"), "w",
              encoding="utf8", newline="") as fh:
        fh.write(text)
    for cc, kb in moved:
        print("split_geo: %s -> data/%s/geo.json (%d KB moved)" % (cc, cc, kb))
    print("split_geo: %d countries split, config now %d KB" % (
        len(moved), round(os.path.getsize(os.path.join(ROOT, "js", "config.js")) / 1024)))


if __name__ == "__main__":
    main()
