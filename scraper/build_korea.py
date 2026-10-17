#!/usr/bin/env python3
"""Build the South Korea map (254 districts) + patch the kr map block.

Geometry: the Commons results map "2024 South Korean legislative election
results.svg" (1.7 MB). Paths carry data-sortkey (province code * 100 +
district No.; Seoul uses plain numbers), a Korean <title> (district name)
and a winner class (min/ppp/newfuture/reform/prog/rebuild/noparty). Two
island-inset paths repeat a title (Ongjin, Ulleung) - those are merged as
extra polygon parts; the Namyangju-B path carries the colliding sortkey 1035
(fixed to 36 by title). The Commons SVG is in SVG coordinates (y down) -
build_map_svg flips y for its Mercator inputs, so the converter pre-flips.

Baselines: data/kr/results.json (en-wiki 2024 winner/runner-up shares per
district; ko-wiki official national totals). The district tier is FPTP
(plurality of the winner/runner-up top-two); the 46 PR seats are a national
D'Hondt pool anchored on the 2024 proportional shares.

Writes img/south_korea.svg (+ bmv copy) and patches the map block into
js/config.js before the pollsterMAE anchor.

Usage: python scraper/build_korea.py [--force]
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm
from build_japan import parse_path

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
RAW_SVG = os.path.join(CACHE, "kr_districts_raw.svg")
GEOJSON = os.path.join(CACHE, "kr_districts.geojson")
OUT_SVG = os.path.join(ROOT, "img", "south_korea.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "south_korea.svg")
ATTRIBUTION = ("Rinkimai: en/ko.wikipedia, NEC (2024); "
               "Geometrija: Wikimedia Commons")

# province code (sortkey // 100) -> config province key
PROV_BY_CODE = {
    0: "seoul", 1: "busan", 2: "daegu", 3: "incheon", 4: "gwangju",
    5: "daejeon", 6: "ulsan", 7: "sejong", 10: "gyeonggi", 11: "gangwon",
    12: "north_chungcheong", 13: "south_chungcheong", 14: "north_jeolla",
    15: "south_jeolla", 16: "north_gyeongsang", 17: "south_gyeongsang",
    18: "jeju",
}
# map winner class -> config party key
CLASS_PARTY = {
    "min": "dpk", "ppp": "ppp", "newfuture": "nfp", "reform": "rp",
    "prog": "pp", "rebuild": "rkp", "noparty": "other",
}
# the source map skips Gyeonggi sortkey 1031: Goyang-D..Namyangju-A carry
# numbers one too high (and Namyangju A/B collide at 1035) - fixed by title
SORTKEY_FIX = {
    "고양시정": 31, "의왕시과천시": 32, "구리시": 33, "남양주시갑": 34,
    "남양주시을": 35,
}
SUFFIX = {"갑": "A", "을": "B", "병": "C", "정": "D"}


def extract_districts():
    """title -> (sortkey, class, [d, ...]) for the 254 real districts."""
    raw = open(RAW_SVG, encoding="utf8").read()
    groups = {}
    for m in re.finditer(r"<path\b([^>]*data-sortkey[^>]*)>(.*?)</path>",
                         raw, re.S):
        attrs, body = m.group(1), m.group(2)
        tm = re.search(r"<title>([^<]+)</title>", body)
        if not tm:
            continue
        title = tm.group(1).strip()
        sk = re.search(r'data-sortkey="(\d+)"', attrs)
        dm = re.search(r'\sd="([^"]+)"', attrs)
        cm = re.search(r'class="([^"]+)"', attrs)
        assert sk and dm, title
        cls = cm.group(1) if cm else ""
        gk = (title, int(sk.group(1)))
        if gk in groups:
            groups[gk][2].append(dm.group(1))
        else:
            groups[gk] = (int(sk.group(1)), cls, [dm.group(1)])
    districts = {}
    for (title, sk), (_, cls, paths) in groups.items():
        code = sk // 100
        assert code in PROV_BY_CODE, (title, sk)
        number = SORTKEY_FIX.get(title, sk % 100)
        key = "%s_%d" % (PROV_BY_CODE[code], number)
        assert key not in districts, (key, title)
        districts[key] = (cls, paths, title)
    assert len(districts) == 254, len(districts)
    # per-province numbering must be exactly 1..N (catches any other skip)
    per = {}
    for key in districts:
        prov, no = key.rsplit("_", 1)
        per.setdefault(prov, []).append(int(no))
    for prov, nums in per.items():
        assert sorted(nums) == list(range(1, len(nums) + 1)), (prov, sorted(nums))
    return districts


def build_geojson(districts):
    feats = []
    for key, (cls, paths, title) in sorted(districts.items()):
        rings = []
        for d in paths:
            for ring in parse_path(d):
                pts = [(px, -py) for px, py in ring]  # pre-flip
                if len(pts) < 3:
                    continue
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                w = max(xs) - min(xs)
                h = max(ys) - min(ys)
                area = abs(sum(xs[k] * ys[(k + 1) % len(pts)]
                               - xs[(k + 1) % len(pts)] * ys[k]
                               for k in range(len(pts)))) / 2
                if max(w, h) > 50 and area < 0.01 * w * h:
                    continue
                rings.append(pts)
        assert rings, key
        feats.append({
            "type": "Feature",
            "properties": {"shapeName": key},
            "geometry": {"type": "MultiPolygon",
                         "coordinates": [[r] for r in rings]},
        })
    with open(GEOJSON, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)
    print("geojson:", len(feats), "districts")
    return feats


def main():
    force = "--force" in sys.argv
    res = json.loads(open(os.path.join(ROOT, "data", "kr", "results.json"),
                          encoding="utf8").read())
    districts = extract_districts()
    assert set(districts) == set(res["districts"]), (
        "district key mismatch",
        sorted(set(districts) ^ set(res["districts"]))[:10])
    # the map's winner classes must agree with the scraped 2024 winners
    bad = []
    for key, (cls, _, title) in districts.items():
        want = res["districts"][key]["winner"]["party"]
        got = CLASS_PARTY.get(cls, "?")
        if got != want:
            bad.append((key, title, cls, got, want))
    assert not bad, ("map class vs 2024 winner mismatch", bad[:10])
    print("validated: map classes match the 2024 district winners (254)")
    # A/B/C suffixes in the en names must match 갑/을/병 in the map titles
    sub = []
    for key, (cls, _, title) in districts.items():
        name = res["districts"][key]["name"]
        m = re.search(r" ([ABCD])$", name)
        if m and title[-1] in SUFFIX:
            if SUFFIX[title[-1]] != m.group(1):
                sub.append((key, name, title))
    assert not sub, ("en A/B/C vs map 갑/을/병 mismatch", sub[:10])
    print("validated: A/B/C suffixes match the map titles")

    build_geojson(districts)
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    if os.path.isdir(os.path.dirname(BMV_SVG)):
        shutil.copy2(OUT_SVG, BMV_SVG)

    # ---- map block ----
    keys = sorted(res["districts"],
                  key=lambda k: (k.rsplit("_", 1)[0],
                                 int(k.rsplit("_", 1)[1])))
    names, gebiete = {}, {}
    for k in keys:
        d = res["districts"][k]
        names[k] = d["name"]
        g = {}
        for side in ("winner", "runner"):
            p = d[side]["party"]
            pct = d[side]["pct"]
            if p != "other" and pct:
                g[p] = round(g.get(p, 0) + pct, 2)
        gebiete[k] = g
    pr = {p: (v if v is not None else 0.0)
          for p, v in res["national"]["pr"].items()}

    j = json.dumps
    map_block = f"""    map: {{
      svg: 'img/south_korea.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // 254 single-member constituencies (Commons 2024 results map:
      // province groups + data-sortkey + Korean district titles) projected
      // by plurality from the 2024 winner/runner-up top-two baselines. The
      // 46 proportional seats are a national D'Hondt pool (3% threshold)
      // anchored on the 2024 proportional vote (national2021); the real
      // semi-linked system with satellite lists is approximated as a plain
      // national pool.
      winnerDistricts: {j({k: 1 for k in keys}, ensure_ascii=False)},
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j(names, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(pr, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/south_korea.svg'" not in text, \
        "korea map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'KR2028',"
    assert anchor in text, "kr block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (kr map block)")


if __name__ == "__main__":
    main()
