#!/usr/bin/env python3
"""Build the Serbian municipality (opstine, 145) map layer.

Results: RZS publication G20246006 "Izbori za narodne poslanike 2023 -
rezultati do nivoa opstine", Table 2.2 (votes per electoral list per
region/oblast/city/opstina; the printed % shares are used, same
convention as the okrug layer). The table is 3 parts x 6 list-columns,
each spread = one page with lists 1-3 (name first) + one with lists 4-6
(numbers first); columns are identified by their national vote totals.
Belgrade = sum of the 17 city municipalities. Geometry: geoBoundaries
SRB ADM2 (145 features, Belgrade as one).

Writes img/serbia_opstine.svg and patches the serbia block in
js/config.js with a map2 layer.

Usage: python scraper/build_serbia_opstine.py [--force]
"""
import json
import os
import re
import sys
import unicodedata
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
PDF = os.path.join(ROOT, "scraper", ".cache", "rs_izbori2023.pdf")
PDF_URL = "https://publikacije.stat.gov.rs/G2024/Pdf/G20246006.pdf"
OUT_SVG = os.path.join(ROOT, "img", "serbia_opstine.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "serbia_opstine.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "rs_opstine.geojson")
ATTRIBUTION = ("Rezultati: RZS (izbori 2023, G20246006); Geometrija: "
               "geoBoundaries.org (gbOpen)")

NATIONAL = {1783701: "sns", 249916: "sps", 55782: "srs", 191431: "nada",
            902450: "spn", 178830: "misn",
            # national-minority lists (2023 ballot order, exempt from the
            # 3% threshold)
            64747: "vmsz", 29066: "spp", 21827: "sda", 11369: "rs",
            13501: "kshlp"}
PARTIES = ["sns", "sps", "srs", "pes", "nps", "nada", "misn", "sl", "spn",
           "vmsz", "spp", "sda", "rs", "kshlp"]
# Belgrade's 17 city municipalities (gradske opstine): the RZS table lists
# them separately but geoBoundaries ADM2 has Belgrade as one polygon, so the
# geometry is fetched from OSM (admin_level 8) and replaces the big feature.
BELGRADE_UNITS = [("Барајево", "Barajevo"), ("Вождовац", "Voždovac"),
                  ("Врачар", "Vračar"), ("Гроцка", "Grocka"),
                  ("Звездара", "Zvezdara"), ("Земун", "Zemun"),
                  ("Лазаревац", "Lazarevac"), ("Младеновац", "Mladenovac"),
                  ("Нови Београд", "Novi Beograd"), ("Обреновац", "Obrenovac"),
                  ("Палилула", "Palilula"), ("Раковица", "Rakovica"),
                  ("Савски Венац", "Savski Venac"), ("Сопот", "Sopot"),
                  ("Стари Град", "Stari Grad"), ("Сурчин", "Surčin"),
                  ("Чукарица", "Čukarica")]
BELGRADE = ["Барајево", "Вождовац", "Врачар", "Гроцка", "Звездара", "Земун",
            "Лазаревац", "Младеновац", "Нови Београд", "Обреновац",
            "Палилула", "Раковица", "Савски Венац", "Сопот", "Стари Град",
            "Сурчин", "Чукарица"]
OBLAST = {"Београдска": "beograd", "Западнобачка": "west_backa",
          "Јужнобанатска": "south_banat", "Јужнобачка": "south_backa",
          "Севернобанатска": "north_banat", "Севернобачка": "north_backa",
          "Средњобанатска": "central_banat", "Сремска": "srem",
          "Златиборска": "zlatibor", "Колубарска": "kolubara",
          "Мачванска": "macva", "Моравичка": "moravica",
          "Поморавска": "pomoravlje", "Расинска": "rasina",
          "Рашка": "raska", "Шумадијска": "sumadija", "Борска": "bor",
          "Браничевска": "branicevo", "Зајечарска": "zajecar",
          "Јабланичка": "jablanica", "Нишавска": "nisava",
          "Пиротска": "pirot", "Подунавска": "podunavlje",
          "Пчињска": "pcinja", "Топличка": "toplica"}
CYR = {"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ђ": "dj", "е": "e",
       "ж": "z", "з": "z", "и": "i", "ј": "j", "к": "k", "л": "l",
       "љ": "lj", "м": "m", "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r",
       "с": "s", "т": "t", "ћ": "c", "у": "u", "ф": "f", "х": "h", "ц": "c",
       "ч": "c", "џ": "dz", "ш": "s"}

NUM = r"(?P<v%s>[\d\u00a0 ]+?)\s+(?P<p%s>\d+,\d+)"
RE_A = re.compile(r"^(?P<name>\D.*?)\s+" + NUM % ("1", "1") + r"\s+" +
                  NUM % ("2", "2") + r"\s+" + NUM % ("3", "3") + r"$")
RE_B = re.compile(r"^" + NUM % ("1", "1") + r"\s+" + NUM % ("2", "2") +
                  r"\s+" + NUM % ("3", "3") + r"\s+(?P<name>\D.*)$")


def norm(name):
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def translit(name):
    if name.startswith("Град "):
        name = name[len("Град "):]
    return "".join(CYR.get(c.lower(), c) for c in name)


BEL_SET = {b.lower() for b in BELGRADE}


def is_belgrade(name):
    return name.lower() in BEL_SET


def fetch_belgrade(key, latin):
    """OSM (admin_level 8) polygon for a Belgrade city municipality."""
    path = os.path.join(CACHE, "rs_belgrade_%s.geojson" % key)
    if os.path.isfile(path):
        return json.load(open(path, encoding="utf8"))
    import time

    import requests
    for attempt in range(5):
        try:
            r = requests.get("https://nominatim.openstreetmap.org/search",
                             params={"q": "Gradska opština %s, Serbia" % latin,
                                     "format": "json", "polygon_geojson": 1,
                                     "limit": 6, "extratags": 1},
                             headers={"User-Agent": "600-election-model/1.0"},
                             timeout=120)
            hits = r.json() if r.status_code == 200 else []
        except Exception:
            hits = []
        for h in hits:
            gj = h.get("geojson") or {}
            et = h.get("extratags") or {}
            if h.get("class") == "boundary" and et.get("admin_level") == "8" \
                    and gj.get("type") in ("Polygon", "MultiPolygon"):
                json.dump(gj, open(path, "w", encoding="utf8"))
                return gj
        time.sleep(3 + 3 * attempt)
    raise RuntimeError("no OSM boundary for %s" % key)


# city rows whose components are listed separately right after them
GRAD = {"Град Ужице": "uzice", "Град Пожаревац": "pozarevac",
        "Град Ниш": "nis", "Град Врање": "vranje"}
COMPONENT = {"Ужице": "uzice", "Севојно": "uzice",
             "Пожаревац": "pozarevac", "Костолац": "pozarevac",
             "Ниш – Медијана": "nis", "Ниш – Нишка Бања": "nis",
             "Ниш – Палилула": "nis", "Ниш – Пантелеј": "nis",
             "Ниш – Црвени крст": "nis",
             "Врање": "vranje", "Врањска Бања": "vranje"}


def parse(page, rex):
    t = page.extract_text() or ""
    out = []
    for line in t.split("\n"):
        line = line.replace("\u00a0", " ").strip()
        m = rex.match(line)
        if not m:
            continue
        name = m.group("name").strip()
        if not re.search(r"[А-Ша-шђјљњћџЂЈЉЊЋЏ]", name):
            continue
        vals = []
        for i in ("1", "2", "3"):
            v = int(re.sub(r"\s", "", m.group("v" + i)))
            p = float(m.group("p" + i).replace(",", "."))
            vals.append((v, p))
        out.append([name, vals])
    return out


def main():
    force = "--force" in sys.argv
    if force or not os.path.isfile(PDF):
        req = urllib.request.Request(PDF_URL,
                                     headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=300).read()
        with open(PDF, "wb") as fh:
            fh.write(data)
        print("downloaded pdf:", len(data), "bytes")

    import pdfplumber
    pdf = pdfplumber.open(PDF)
    rows_by_part = {}
    keys_by_part = {}
    for pname, starts in (("I", range(24, 38, 2)), ("II", range(38, 52, 2)),
                          ("III", range(52, 66, 2))):
        rows = []
        for a in starts:
            ra = parse(pdf.pages[a - 1], RE_A)
            rb = parse(pdf.pages[a + 1 - 1], RE_B)
            assert len(ra) == len(rb), f"row count mismatch {a}"
            for x, y in zip(ra, rb):
                assert x[0] == y[0], f"row mismatch {a}: {x[0]} vs {y[0]}"
                rows.append([x[0], x[1] + y[1]])
        # identify columns via national votes
        nat = rows[0][1]
        keys = [NATIONAL.get(v[0]) for v in nat]
        print(f"part {pname}: rows {len(rows)} | columns "
              f"{[v[0] for v in nat]} -> {keys}")
        assert [k for k in keys if k], "no known columns"
        rows_by_part[pname] = rows
        keys_by_part[pname] = keys

    names0 = [r[0] for r in rows_by_part["I"]]
    for pname, rows in rows_by_part.items():
        assert [r[0] for r in rows] == names0, f"parts differ ({pname})"

    units = {}
    for i, name in enumerate(names0):
        acc = {p: [0, 0.0] for p in PARTIES}
        for pname, rows in rows_by_part.items():
            for col, key in enumerate(keys_by_part[pname]):
                if key:
                    v, p = rows[i][1][col]
                    acc[key][0] += v
                    acc[key][1] = p
        units[name] = acc
    print("rows parsed:", len(units))

    # verify: each oblast row = sum of its member municipalities (votes)
    order = names0
    cur, members = None, []
    worst = 0.0

    def close():
        nonlocal worst
        if not cur:
            return
        row = units[cur]
        for p in PARTIES:
            mv = sum(units[m][p][0] for m in members)
            if row[p][0] and mv:
                worst = max(worst, abs(mv - row[p][0]) * 100 / row[p][0])

    for name in order:
        if name.endswith("област"):
            close()
            cur, members = name, []
        elif name in COMPONENT:
            continue
        elif name in GRAD or norm(translit(name)) in GEOB_KEYS or \
                is_belgrade(name):
            if cur:
                members.append(name)
        else:
            close()
            cur, members = None, []
    close()
    print(f"oblast sum-check worst vote deviation: {worst:.3f}%")

    # build gebiete: printed % per unit (Belgrade's 17 city municipalities
    # are individual units, their geometry comes from OSM)
    gebiete, names = {}, {}
    skipped = []
    for name in order:
        acc = units[name]
        if name in COMPONENT:
            continue
        if is_belgrade(name):
            key = norm(translit(name))
            gebiete[key] = {p: acc[p][1] if acc[p][1] else 0.0
                            for p in PARTIES}
            names[key] = translit(name)
            continue
        if name in GRAD:
            key = GRAD[name]
        else:
            key = norm(translit(name))
            if key not in GEOB_KEYS:
                skipped.append(name)
                continue
        gebiete[key] = {p: acc[p][1] if acc[p][1] else 0.0 for p in PARTIES}
        names[key] = translit(name)
    print("units with shares:", len(gebiete), "| skipped rows:",
          len(skipped))
    print("  skipped:", skipped)
    missing = sorted(GEOB_KEYS - set(gebiete))
    print("geometry keys without results:", missing)

    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/SRB/ADM2/")
    features = []
    for f in gj["features"]:
        key = geob_key(f["properties"]["shapeName"])
        if key == "belgrade":
            continue      # replaced by the 17 city municipalities below
        if key not in gebiete:
            print("  no results for", f["properties"]["shapeName"])
            continue
        features.append({"type": "Feature", "properties": {"opstina": key},
                         "geometry": f["geometry"]})
    for cyr, latin in BELGRADE_UNITS:
        key = norm(translit(cyr))
        features.append({"type": "Feature", "properties": {"opstina": key},
                         "geometry": fetch_belgrade(key, latin)})
    print("features:", len(features))
    assert len(features) == 161, "expected 161 opstine (144 + 17 Belgrade)"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "opstina", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # compare oblast rows with the okrug layer 1
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    start = text.index("\n  serbia: {")
    m = re.search(r"\n  \w+: \{", text[start + 1:])
    end = start + 1 + m.start()
    block = text[start:end]
    print("oblast vs layer-1 check:")

    def js_obj(text, key):
        mm = re.search(r"\n\s+\"?" + key + r"\"?:\s*\{", text)
        if not mm:
            return None
        depth, kk = 0, mm.end() - 1
        while kk < len(text):
            if text[kk] == "{":
                depth += 1
            elif text[kk] == "}":
                depth -= 1
                if depth == 0:
                    break
            kk += 1
        return text[mm.end():kk]

    for name in order:
        if not name.endswith("област"):
            continue
        ok = OBLAST.get(name[:-len(" област")].strip())
        if not ok:
            continue
        row = units[name]
        body = js_obj(block, ok)
        g = dict(re.findall(r"\"?(\w+)\"?:\s*([\d.]+)", body)) if body else {}
        worst = max(PARTIES, key=lambda p: abs(
            row[p][1] - float(g.get(p, 0))))
        print(f"  {name:22s} worst {worst} "
              f"{row[worst][1] - float(g.get(worst, 0)):+.2f}pp")

    map2 = {"svg": "img/serbia_opstine.svg", "selector": "id",
            "districts": {k: k for k in gebiete},
            "gebiete": gebiete, "names": names, "label": "opštine (161)"}
    # recompute the layer-1 (okrug) gebiete from the oblast rows so the
    # minority lists appear there too
    okrug = {}
    for name in order:
        if not name.endswith("област"):
            continue
        key = OBLAST.get(name[:-len(" област")].strip())
        if not key:
            continue
        okrug[key] = {p: units[name][p][1] if units[name][p][1] else 0.0
                      for p in PARTIES}
    assert len(okrug) == 25, "expected 25 okrugs, got %d" % len(okrug)
    mg = re.search(r"\n      gebiete: \{", block)
    if mg:
        depth, k3 = 0, mg.end() - 1
        while k3 < len(block):
            if block[k3] == "{":
                depth += 1
            elif block[k3] == "}":
                depth -= 1
                if depth == 0:
                    break
            k3 += 1
        block = block[:mg.start()] + "\n      gebiete: " + \
            json.dumps(okrug, ensure_ascii=False, indent=8) + block[k3 + 1:]
        print("patched config.js (serbia okrug gebiete incl. minority lists)")
    mm = re.search(r"\n\s+map: \{", block)
    depth, k = 0, mm.end() - 1
    while k < len(block):
        if block[k] == "{":
            depth += 1
        elif block[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    m2 = re.search(r"\n\s+map2: \{", block)
    if m2:
        depth, k2 = 0, m2.end() - 1
        while k2 < len(block):
            if block[k2] == "{":
                depth += 1
            elif block[k2] == "}":
                depth -= 1
                if depth == 0:
                    break
            k2 += 1
        block = block[:m2.start()] + "\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k2 + 1:]
    else:
        block = block[:k + 1] + ",\n      map2: " + \
            json.dumps(map2, ensure_ascii=False, indent=6) + block[k + 1:]
    open(cfg_path, "w", encoding="utf8").write(text[:start] + block + text[end:])
    print("patched config.js (serbia map2)")


def geob_key(name):
    n = re.sub(r"\s+(Municipality|City|Municipal\*?)$", "", name)
    return norm(n)


GEOB_KEYS = None


if __name__ == "__main__":
    gj0 = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/SRB/ADM2/")
    GEOB_KEYS = {geob_key(f["properties"]["shapeName"])
                 for f in gj0["features"]}
    main()
