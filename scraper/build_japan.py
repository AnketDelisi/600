#!/usr/bin/env python3
"""Build the Japan map (289 single-member constituencies) + patch the jp block.

Geometry: the Commons results map "2024 Japanese House of Representatives
election.svg" (2.97 MB). Its paths carry data-name="<Prefecture>-<N>" labels
inside per-prefecture groups; Akita's paths are unlabeled and Wakayama-2 has
a typo ("Wakay-2ama") - both handled. Six prefectures carry the 2022
reapportionment cuts (Akita 3, Wakayama 2, Okayama 4, Yamaguchi 3, Ehime 3,
Nagasaki 3). Legend swatches (no class / "tn") and the bloc overlay group
("Regions") are skipped.

The Commons SVG is in SVG coordinates (y down) - build_map_svg flips y for
its Mercator inputs, so the converter pre-flips to cancel that.

Usage: python scraper/build_japan.py [--geometry-only]
"""

import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
RAW_SVG = os.path.join(CACHE, "jp_districts_raw.svg")
GEOJSON = os.path.join(CACHE, "jp_districts.geojson")
OUT_SVG = os.path.join(ROOT, "img", "japan.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "japan.svg")
ATTRIBUTION = ("Rinkimai: ja/en.wikipedia (2026); "
               "Geometrija: Wikimedia Commons")

PREFECTURES = {
    "Hokkaid\u014d", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata",
    "Fukushima", "Ibaraki", "Tochigi", "Gunma", "Saitama", "Chiba",
    "T\u014dky\u014d", "Kanagawa", "Niigata", "Toyama", "Ishikawa", "Fukui",
    "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi", "Mie", "Shiga",
    "Kyot\u014d", "\u014csaka", "Hy\u014dgo", "Nara", "Wakayama", "Tottori",
    "Shimane", "Okayama", "Hiroshima", "Yamaguchi", "Tokushima", "Kagawa",
    "Ehime", "K\u014dchi", "Fukuoka", "Saga", "Nagasaki", "Kumamoto",
    "\u014cita", "Miyazaki", "Kagoshima", "Okinawa",
}
SKIP_CLASSES = {"", "tn", "st"}


def fold(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("\u014d", "o").replace("\u016b", "u")
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def parse_path(d):
    """M/L/H/V/C/S/Q/T (+ relative, implicit repeats, z) -> rings.

    Curves are flattened by sampling (the Commons paths use c/s/q)."""
    tokens = re.findall(r"[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    rings, cur = [], []
    x = y = sx = sy = px = py = 0.0
    i = 0
    cmd = None

    def num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    def cubic(p0, p1, p2, p3, n=6):
        out = []
        for k in range(1, n + 1):
            t = k / n
            mt = 1 - t
            out.append((
                mt**3 * p0[0] + 3 * mt * mt * t * p1[0]
                + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                mt**3 * p0[1] + 3 * mt * mt * t * p1[1]
                + 3 * mt * t * t * p2[1] + t**3 * p3[1]))
        return out

    while i < len(tokens):
        tok = tokens[i]
        if re.match(r"[MLHVCSQTAZmlhvcsqtaz]$", tok):
            cmd = tok
            i += 1
            if cmd in "zZ":
                if cur:
                    rings.append(cur)
                    cur = []
                x, y = sx, sy
                cmd = None
                continue
        if cmd is None:
            break
        c = cmd.upper()
        rel = cmd.islower()
        if c == "M":
            nx, ny = num(), num()
            if rel:
                nx, ny = x + nx, y + ny
            if cur:
                rings.append(cur)
            x, y = nx, ny
            sx, sy = x, y
            cur = [(x, y)]
            cmd = "l" if rel else "L"
        elif c == "L":
            nx, ny = num(), num()
            if rel:
                nx, ny = x + nx, y + ny
            x, y = nx, ny
            cur.append((x, y))
        elif c == "H":
            nx = num()
            if rel:
                nx = x + nx
            x = nx
            cur.append((x, y))
        elif c == "V":
            ny = num()
            if rel:
                ny = y + ny
            y = ny
            cur.append((x, y))
        elif c == "C":
            x1, y1, x2, y2, nx, ny = (num() for _ in range(6))
            if rel:
                x1, y1, x2, y2, nx, ny = (x + x1, y + y1, x + x2, y + y2,
                                          x + nx, y + ny)
            cur.extend(cubic((x, y), (x1, y1), (x2, y2), (nx, ny)))
            px, py = x2, y2
            x, y = nx, ny
        elif c == "S":
            x2, y2, nx, ny = (num() for _ in range(4))
            if rel:
                x2, y2, nx, ny = x + x2, y + y2, x + nx, y + ny
            x1, y1 = 2 * x - px, 2 * y - py
            cur.extend(cubic((x, y), (x1, y1), (x2, y2), (nx, ny)))
            px, py = x2, y2
            x, y = nx, ny
        elif c in ("Q", "T"):
            if c == "Q":
                x1, y1, nx, ny = (num() for _ in range(4))
                if rel:
                    x1, y1, nx, ny = x + x1, y + y1, x + nx, y + ny
            else:
                nx, ny = num(), num()
                if rel:
                    nx, ny = x + nx, y + ny
                x1, y1 = 2 * x - px, 2 * y - py
            cx1, cy1 = x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y)
            cx2, cy2 = nx + 2 / 3 * (x1 - nx), ny + 2 / 3 * (y1 - ny)
            cur.extend(cubic((x, y), (cx1, cy1), (cx2, cy2), (nx, ny)))
            px, py = x1, y1
            x, y = nx, ny
        elif c == "A":
            vals = [num() for _ in range(7)]
            nx, ny = vals[5], vals[6]
            if rel:
                nx, ny = x + nx, y + ny
            x, y = nx, ny
            cur.append((x, y))
        else:
            break
    if cur:
        rings.append(cur)
    return rings


def extract_districts():
    raw = open(RAW_SVG, encoding="utf8").read()
    stack = []
    per = {}
    for m in re.finditer(r'<(/?)(g|path)\b([^>]*)>', raw):
        close, tag, attrs = m.group(1), m.group(2), m.group(3)
        if tag == "g":
            if close:
                if stack:
                    stack.pop()
                continue
            dn = re.search(r'data-name="([^"]+)"', attrs)
            stack.append(dn.group(1) if dn else None)
            continue
        cur = None
        for name in reversed(stack):
            if name in PREFECTURES:
                cur = name
                break
        if not cur:
            continue
        cls = re.search(r'class="([^"]+)"', attrs)
        if (cls.group(1) if cls else "") in SKIP_CLASSES:
            continue
        dm = re.search(r'\sd="([^"]+)"', attrs)
        assert dm, "path without d"
        dn = re.search(r'data-name="([^"]+)"', attrs)
        nm = dn.group(1) if dn else ""
        num = None
        if nm and not nm.lower().startswith("path"):
            mn = re.match(r"^(.+)-(\d+)(ama)?$", nm)
            if mn:
                num = int(mn.group(2))
        per.setdefault(cur, []).append((num, dm.group(1)))

    districts = {}
    for pref, items in per.items():
        named = [n for n, _ in items if n is not None]
        unl = sum(1 for n, _ in items if n is None)
        if unl:
            top = max(named) if named else unl
            missing = [n for n in range(top, 0, -1) if n not in named]
            assert len(missing) >= unl, (pref, named, unl)
            mi = 0
            fixed = []
            for n, d in items:
                if n is None:
                    fixed.append((missing[mi], d))
                    mi += 1
                else:
                    fixed.append((n, d))
            items = fixed
        nums = sorted(n for n, _ in items)
        assert nums == list(range(1, len(nums) + 1)), (pref, nums)
        for n, d in items:
            districts["%s_%d" % (fold(pref), n)] = d
    assert len(districts) == 289, len(districts)
    return districts


def build_geojson():
    districts = extract_districts()
    feats = []
    for key, d in districts.items():
        rings = []
        for ring in parse_path(d):
            pts = [(px, -py) for px, py in ring]  # pre-flip for build_map_svg
            if len(pts) >= 3:
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
    return districts


def main():
    force = "--force" in sys.argv
    build_geojson()
    sys.argv = ["build_map_svg.py", "--geojson", GEOJSON,
                "--name-field", "shapeName", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    os.makedirs(os.path.dirname(BMV_SVG), exist_ok=True)
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # ---- map block ----
    res = json.loads(open(os.path.join(ROOT, "data", "jp", "results.json"),
                          encoding="utf8").read())
    mapkeys = {f["properties"]["shapeName"]
               for f in json.loads(open(GEOJSON, encoding="utf8").read())["features"]}
    assert set(res["districts"]) == mapkeys, "district key mismatch"

    keys = sorted(mapkeys, key=lambda k: (k.rsplit("_", 1)[0],
                                          int(k.rsplit("_", 1)[1])))
    names, gebiete = {}, {}
    for k in keys:
        d = res["districts"][k]
        names[k] = d["name"]
        g = {}
        w = d["winner"]
        if w["party"] != "other" and w["pct"]:
            g[w["party"]] = w["pct"]
        r = d["runner"]
        if r["party"] != "other" and r["pct"]:
            g[r["party"]] = g.get(r["party"], 0) + r["pct"]
        gebiete[k] = g

    fptp = res["national"]["fptp"]
    prn = res["national"]["pr"]
    prD, prG = {}, {}
    for bk, b in res["blocs"].items():
        prD[bk] = b["seats"]
        prG[bk] = {p: v["pct"] for p, v in b["parties"].items()}

    j = json.dumps
    map_block = f"""    map: {{
      svg: 'img/japan.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // 289 single-member constituencies (Commons 2024 map, data-name
      // labels) projected by plurality from the 2026 top-two baselines
      // (winner + runner-up shares; no run-off). The district swing is
      // anchored on the national PR baseline (national2021), the same
      // measure as the party-support polls; the 176 PR seats are allocated
      // per bloc (D'Hondt, prDistricts) with a uniform swing from the same
      // baseline (prNational2021).
      winnerDistricts: {j({k: 1 for k in keys}, ensure_ascii=False)},
      districts: {j({k: k for k in keys}, ensure_ascii=False)},
      names: {j(names, ensure_ascii=False)},
      gebiete: {j(gebiete, ensure_ascii=False)},
      national2021: {j(prn, ensure_ascii=False)},
      prDistricts: {j(prD, ensure_ascii=False)},
      prGebiete: {j(prG, ensure_ascii=False)},
      prNational2021: {j(prn, ensure_ascii=False)},
    }},
"""
    cp = os.path.join(ROOT, "js", "config.js")
    text = open(cp, encoding="utf8").read()
    assert "    map: {\n      svg: 'img/japan.svg'" not in text, \
        "japan map already present"
    anchor = "    pollsterMAE: {},\n    maeKey: 'JP2030',"
    assert anchor in text, "jp block anchor"
    text = text.replace(anchor, map_block + anchor, 1)
    open(cp, "w", encoding="utf8", newline="").write(text)
    print("patched config.js (jp map block)")


if __name__ == "__main__":
    main()
