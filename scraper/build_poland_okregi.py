#!/usr/bin/env python3
"""Build the 41 Polish Sejm okregi SVG from geoBoundaries powiaty.

Okreg areas (powiat lists) come from the Polish Wikipedia article
"Okregi wyborcze do Sejmu Rzeczypospolitej Polskiej" (cached JSON);
geometry is geoBoundaries POL ADM2 (380 powiaty; some names English or
renamed: Colberg = Kolobrzeg, jeleniogorski = karkonoski). Duplicated
powiat names (swidnicki, ostrowski, ...) are resolved by voivodeship.
Whole-voivodeship okregi use the ADM1 polygon. Features are dissolved
per okreg with shapely.

Note: the site's config/data used the English Wikipedia 2023 table names
for 7 okregi (Krakow I/II, Bielsko-Biala I/II, Katowice I/II/III), which
are outdated; this script emits the CURRENT official ids (Chrzanow,
Krakow, BielskoBiala, Gliwice, Rybnik, Katowice, Sosnowiec) and
scraper/patch_poland_config.py renames the config keys accordingly.

Usage: python scraper/build_poland_okregi.py [--apply]
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "bmv", "img", "Poland.gen.svg")
COMBINED = os.path.join(ROOT, "scraper", ".cache", "poland_okregi.geojson")
OKREGI = os.path.join(ROOT, "scraper", ".cache", "poland_okregi.json")
ADM1 = "https://www.geoboundaries.org/api/current/gbOpen/POL/ADM1/"
ADM2 = "https://www.geoboundaries.org/api/current/gbOpen/POL/ADM2/"
ATTRIBUTION = ("Geometrien: geoBoundaries.org (gbOpen) — powiaty, "
               "dissolved per okreg wyborczy")

IDS = {
    1: "Legnica", 2: "Walbrzych", 3: "Wroclaw", 4: "Bydgoszcz",
    5: "Torun", 6: "Lublin", 7: "Chelm", 8: "ZielonaGora", 9: "Lodz",
    10: "PiotrkowTrybunalsk", 11: "Sieradz", 12: "Chrzanow",
    13: "Krakow", 14: "NowySacz", 15: "Tarnow", 16: "Plock",
    17: "Radom", 18: "Siedlce", 19: "Warszawa1", 20: "Warszawa2",
    21: "Opole", 22: "Krosno", 23: "Rzeszow", 24: "Bialystok",
    25: "Gdansk", 26: "Slupsk", 27: "BielskoBiala", 28: "Czestochowa",
    29: "Gliwice", 30: "Rybnik", 31: "Katowice", 32: "Sosnowiec",
    33: "Kielce", 34: "Elblag", 35: "Olsztyn", 36: "Kalisz",
    37: "Konin", 38: "Pila", 39: "Poznan", 40: "Koszalin",
    41: "Szczecin",
}
WHOLE_VOIV = {
    "województwo lubuskie": "Lubusz Voivodeship",
    "województwo opolskie": "Opole Voivodeship",
    "województwo podlaskie": "Podlaskie Voivodeship",
    "województwo świętokrzyskie": "Świętokrzyskie Voivodeship",
}
EXCEPTIONS = {  # official token -> geoBoundaries name
    "karkonoski": "powiat jeleniogórski",
    "tarnogórski": "Tarnowskie Góry County",
    "raciborski": "Racibórz County",
    "kołobrzeski": "Colberg County",
    "lipnowski": "Lipno County",
    "kutnowski": "Kutno County",
}
NR_EXC = {  # (okreg nr, token) -> geoBoundaries name (disambiguation)
    (18, "siedlecki"): "Siedlce County",
    (20, "grodziski"): "Grodzisk Mazowiecki County",
    (29, "gliwicki"): "Gliwice County",
    (27, "bielski"): "Bielsko County",
    (38, "grodziski"): "powiat grodziski",
}
SKIP = {"zagranica", "statki"}


def norm(s):
    return re.sub(r"[^a-z0-9]", "", bm.fold(s))


def strip_words(s):
    s = bm.fold(s)
    for w in ("county", "citycounty", "city", "powiat", "miasto",
              "naprawachpowiatu", "voivodeship"):
        s = s.replace(w, "")
    return s


def area_tokens(obszar):
    text = obszar.replace("miasta na prawach powiatu:", "|")
    text = text.replace("miasto na prawach powiatu:", "|")
    text = text.replace("powiaty:", "|")
    tokens = []
    for part in text.split("|"):
        part = part.strip()
        if not part:
            continue
        part = re.sub(r"\s+i\s+", ", ", part)
        for t in part.split(","):
            t = t.strip().rstrip(".;")
            t = re.sub(r"^(powiat|miasto)\s+", "", t)
            if t:
                tokens.append(t)
    return tokens


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    from shapely.geometry import shape
    okregi = json.load(open(OKREGI, encoding="utf8"))
    adm1 = bm.load_geojson(ADM1)
    adm2 = bm.load_geojson(ADM2)

    pool = []
    for src, gj in (("adm2", adm2), ("adm1", adm1)):
        for f in gj["features"]:
            name = f["properties"]["shapeName"]
            pool.append({"sid": f"{src}:{name}", "src": src, "name": name,
                         "key": norm(strip_words(name)),
                         "geom": f["geometry"]})
    by_sid = {p["sid"]: p for p in pool}
    adm1_shapes = [(f["properties"]["shapeName"], shape(f["geometry"]))
                   for f in adm1["features"]]

    def voiv_of(geom):
        pt = shape(geom).representative_point()
        for name, s in adm1_shapes:
            if s.contains(pt):
                return name
        return min(adm1_shapes, key=lambda x: x[1].distance(pt))[0]

    used = set()
    per_okreg = {}
    deferred = []
    for o in okregi:
        nr = o["nr"]
        matched = []
        for tok in area_tokens(o["obszar"]):
            if tok in SKIP:
                continue
            if tok in WHOLE_VOIV:
                p = next(x for x in pool
                         if x["name"] == WHOLE_VOIV[tok])
                used.add(p["sid"])
                matched.append(p)
                continue
            forced = NR_EXC.get((nr, tok)) or EXCEPTIONS.get(tok)
            if forced:
                p = next((x for x in pool if x["name"] == forced
                          and x["sid"] not in used), None)
                if p:
                    used.add(p["sid"])
                    matched.append(p)
                else:
                    print(f"  EXCEPTION miss okreg {nr}: {tok} -> {forced}")
                continue
            ft = norm(tok)
            cands = []
            for p in pool:
                if p["sid"] in used:
                    continue
                k = p["key"]
                if norm(p["name"]) == ft:
                    cands.append((1200, p))
                elif k == ft:
                    cands.append((1000, p))
                elif len(k) >= 6 and (k.startswith(ft) or ft.startswith(k)):
                    cands.append((500 + min(len(k), len(ft)), p))
            if not cands:
                print(f"  UNMATCHED okreg {nr}: {tok!r}")
                continue
            cands.sort(key=lambda x: -x[0])
            strong = [p for s, p in cands if s >= 500]
            if len(strong) > 1:
                deferred.append((nr, tok, strong))
            else:
                used.add(cands[0][1]["sid"])
                matched.append(cands[0][1])
        per_okreg[nr] = matched

    for nr, tok, cands in deferred:
        voivs = [voiv_of(p["geom"]) for p in per_okreg[nr]]
        want = max(set(voivs), key=voivs.count) if voivs else None
        pool_c = [p for p in cands if voiv_of(p["geom"]) == want] or cands
        ft = norm(tok)
        exact = [p for p in pool_c if norm(p["name"]) == ft]
        pick = exact[0] if exact else pool_c[0]
        used.add(pick["sid"])
        per_okreg[nr].append(pick)
        print(f"  resolved {nr}: {tok} -> {pick['name']}")

    bad = 0
    for o in okregi:
        nr = o["nr"]
        voivs = {voiv_of(p["geom"]) for p in per_okreg[nr]}
        flag = "" if len(voivs) <= 1 else "  <-- MIXED VOIVODESHIPS"
        if flag:
            bad += 1
        print(f"  {nr:>2} {IDS[nr]:22s} {len(per_okreg[nr]):2d} units "
              f"{sorted(voivs)}{flag}")
    print(f"mixed-voivodeship okregi: {bad}")

    features = []
    for o in okregi:
        oid = IDS[o["nr"]]
        for p in per_okreg[o["nr"]]:
            features.append({"type": "Feature",
                             "properties": {"name": p["name"],
                                            "okreg": oid},
                             "geometry": p["geom"]})
    ids = sorted({f["properties"]["okreg"] for f in features})
    print(f"okregi with geometry: {len(ids)}")
    if set(ids) != set(IDS.values()):
        print("  missing:", sorted(set(IDS.values()) - set(ids)))
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)

    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "okreg", "--dissolve",
                "--attr", "id", "--no-prefix", "--out", OUT,
                "--attribution", ATTRIBUTION]
    bm.main()

    new = open(OUT, encoding="utf8").read()
    new_ids = set(re.findall(r'<path\b[^>]*\bid="([^"]+)"', new))
    print(f"new ids ({len(new_ids)}): {sorted(new_ids)}")
    if args.apply and set(ids) == set(IDS.values()) and bad == 0:
        for dst in (os.path.join(ROOT, "bmv", "img", "Poland.svg"),
                    os.path.join(ROOT, "img", "Poland.svg")):
            with open(dst, "w", encoding="utf8") as fh:
                fh.write(new)
        os.remove(OUT)
        print("applied to bmv/img and img")


if __name__ == "__main__":
    main()
