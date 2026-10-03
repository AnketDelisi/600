#!/usr/bin/env python3
"""Build the Italy (Chamber of Deputies) map layer and config block.

Baselines: 2022 general election per-region party shares from the Italian
Wikipedia result tables (sourced from the Ministry of the Interior), plus the
official uninominal (FPTP) seat counts per region/coalition parsed from the
Ministry's historical archive (elezionistorico.interno.gov.it). The Valle
d'Aosta (single FPTP seat, regionalist lists) is taken from the official
regional tally (regione.vda.it). Geometry: geoBoundaries ITA ADM2 (20
regions). Party logos: img/it/ (prepared separately).

Writes img/italy.svg and inserts the italy block into js/config.js.
Run build_italy_fptp.py afterwards (it re-adds the FPTP constituencies
flag + map2 layer, which this script's block template does not carry).

Usage: python scraper/build_italy_regions.py [--force]
"""
import json
import os
import re
import sys
import urllib.request

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "italy.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "italy.svg")
COMBINED = os.path.join(CACHE, "it_regions.geojson")
UA = {"User-Agent": "Mozilla/5.0 (600 election site build)"}
ATTRIBUTION = ("Risultati: Ministero dell'Interno (elezioni 2022, via "
               "elezionistorico.interno.gov.it); Geometria: geoBoundaries.org")

PARTIES = ["fdi", "pd", "m5s", "lega", "fi", "a", "iv", "avs", "e", "nm", "fn"]
# Azione - Italia Viva joint list in 2022: 21 deputies (12 Azione, 9 IV)
AI_AZIONE = 12.0 / 21.0

REGIONS = {
    "abruzzo": "Abruzzo", "basilicata": "Basilicata", "calabria": "Calabria",
    "campania": "Campania", "emilia_romagna": "Emilia-Romagna",
    "friuli_venezia_giulia": "Friuli-Venezia Giulia", "lazio": "Lazio",
    "liguria": "Liguria", "lombardia": "Lombardia", "marche": "Marche",
    "molise": "Molise", "piemonte": "Piemonte", "puglia": "Puglia",
    "sardegna": "Sardegna", "sicilia": "Sicilia", "toscana": "Toscana",
    "trentino_alto_adige": "Trentino-Alto Adige", "umbria": "Umbria",
    "valle_d_aosta": "Valle d'Aosta", "veneto": "Veneto",
}
# it.wikipedia result-table region name -> key
TABLE_REGION = {
    "Piemonte": "piemonte", "Lombardia": "lombardia", "Veneto": "veneto",
    "Friuli-Venezia Giulia": "friuli_venezia_giulia", "Liguria": "liguria",
    "Emilia-Romagna": "emilia_romagna", "Toscana": "toscana",
    "Umbria": "umbria", "Marche": "marche", "Lazio": "lazio",
    "Abruzzo": "abruzzo", "Molise": "molise", "Campania": "campania",
    "Puglia": "puglia", "Basilicata": "basilicata", "Calabria": "calabria",
    "Sicilia": "sicilia", "Sardegna": "sardegna",
    "Trentino-Alto Adige": "trentino_alto_adige",
}
# geoBoundaries ITA ADM2 shapeName -> key
GEO_REGION = {
    "Abruzzo": "abruzzo", "Basilicata": "basilicata", "Calabria": "calabria",
    "Campania": "campania", "Emilia-Romagna": "emilia_romagna",
    "Friuli Venezia Giulia": "friuli_venezia_giulia", "Lazio": "lazio",
    "Liguria": "liguria", "Lombardia": "lombardia", "Marche": "marche",
    "Molise": "molise", "Piemonte": "piemonte", "Puglia": "puglia",
    "Sardegna": "sardegna", "Sicilia": "sicilia", "Toscana": "toscana",
    "Trentino-Alto Adige": "trentino_alto_adige", "Umbria": "umbria",
    "Valle d'Aosta": "valle_d_aosta", "Veneto": "veneto",
}
# FPTP districts per region, Camera 2022 apportionment (d.P.R. 21/07/2022;
# DAIT dossier "Elezioni politiche 2022", 147 in total)
FPTP_PER_REGION = {
    "piemonte": 10, "valle_d_aosta": 1, "lombardia": 23,
    "trentino_alto_adige": 4, "veneto": 12, "friuli_venezia_giulia": 3,
    "liguria": 4, "emilia_romagna": 11, "toscana": 9, "umbria": 2,
    "marche": 4, "lazio": 14, "abruzzo": 3, "molise": 1, "campania": 14,
    "puglia": 10, "basilicata": 1, "calabria": 5, "sicilia": 12,
    "sardegna": 4,
}


def num(s):
    return int(re.sub(r"[^\d]", "", s) or 0)


def pct(s):
    return float(s.replace(".", "").replace(",", ".").strip() or 0)


def fetch(url, cache_name, force=False):
    path = os.path.join(CACHE, cache_name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers=UA, timeout=120)
        r.raise_for_status()
        with open(path, "wb") as fh:
            fh.write(r.content)
    return open(path, encoding="utf8").read()


def parse_wiki_tables(html):
    """Region -> party shares from the it.wikipedia result tables.

    Table 23 covers 18 regions, table 22 the 27 circoscrizioni (adds
    Trentino-Alto Adige). Columns: FdI | LSP | FI | NM | tot | PD-IDP | AVS |
    +Europa | IC-CD | tot | M5S | Az-IV | Altri.
    """
    soup = BeautifulSoup(html, "lxml")
    out = {}
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 15:
            continue
        hdr = " ".join(rows[1].get_text(" ", strip=True).split()) \
            if len(rows) > 1 else ""
        if "PD-IDP" not in hdr:
            continue
        for tr in rows[2:]:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            if len(cells) < 14 or not cells[0]:
                continue
            name = cells[0]
            if name.startswith("Italia"):
                continue
            key = TABLE_REGION.get(name)
            if not key:
                continue
            fdi, lega, fi, nm = pct(cells[1]), pct(cells[2]), pct(cells[3]), \
                pct(cells[4])
            pd, avs, e = pct(cells[6]), pct(cells[7]), pct(cells[8])
            m5s, aziv = pct(cells[11]), pct(cells[12])
            out[key] = {
                "fdi": fdi, "lega": lega, "fi": fi, "nm": nm, "pd": pd,
                "avs": avs, "e": e, "m5s": m5s,
                "a": round(aziv * AI_AZIONE, 2),
                "iv": round(aziv * (1 - AI_AZIONE), 2), "fn": 0.0,
            }
    return out


def parse_national(html):
    """National 2022 shares + official seat totals from the article."""
    soup = BeautifulSoup(html, "lxml")
    shares, seats = {}, {}
    names = {
        "Fratelli d'Italia": "fdi", "Lega per Salvini Premier": "lega",
        "Forza Italia": "fi", "Noi Moderati": "nm",
        "Partito Democratico - Italia Democratica e Progressista": "pd",
        "Alleanza Verdi e Sinistra": "avs", "+Europa": "e",
        "Movimento 5 Stelle": "m5s",
    }
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if len(rows) < 20:
            continue
        txt = " ".join(t.get_text(" ", strip=True).split())
        if "Proporzionale" not in txt or "Maggioritario" not in txt:
            continue
        for tr in rows:
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            vals = [c for c in cells if c]
            if len(vals) < 3:
                continue
            key = names.get(vals[0])
            if key and vals[2]:
                shares[key] = pct(vals[2])
            elif vals[0] == "Azione - Italia Viva" and vals[2]:
                v = pct(vals[2])
                shares["a"] = round(v * AI_AZIONE, 2)
                shares["iv"] = round(v * (1 - AI_AZIONE), 2)
        break
    # official seat totals (Camera, incl. abroad): infobox rows
    for t in soup.find_all("table"):
        txt = " ".join(t.get_text(" ", strip=True).split())
        if "Seggi" not in txt or "Fratelli d'Italia" not in txt:
            continue
        for tr in t.find_all("tr"):
            cells = [" ".join(c.get_text(" ", strip=True).split())
                     for c in tr.find_all(["td", "th"])]
            cells = [c for c in cells if c]
            if not cells or len(cells) < 2:
                continue
            key = names.get(cells[0])
            m = re.match(r"^(\d+)", cells[-1].replace(".", ""))
            if key and m and "Camera" in txt:
                seats[key] = int(m.group(1))
        if seats:
            break
    if "a" not in seats:
        seats.update({"fdi": 119, "pd": 69, "m5s": 52, "lega": 66, "fi": 45,
                      "a": 12, "iv": 9, "avs": 12, "e": 2, "nm": 7, "fn": 0})
    seats.setdefault("fn", 0)
    return shares, seats


def main():
    force = "--force" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    art_url = ("https://it.wikipedia.org/wiki/"
               "Elezioni_politiche_in_Italia_del_2022")
    art = fetch(art_url, "it_2022_article.html", force)
    region = parse_wiki_tables(art)
    national, seats = parse_national(art)
    print("regions from tables:", len(region))
    print("national:", national)
    print("seats:", seats)

    # Valle d'Aosta: official regional tally (regione.vda.it). The seat was
    # won by the Vallée d'Aoste autonomist list (38.63%); the CDX ran one
    # joint list (29.80%), no separate CSX/M5S lists existed.
    vda_cdx = 29.80
    ratio = {p: national[p] / sum(national[q] for q in
                                  ("fdi", "lega", "fi", "nm"))
             for p in ("fdi", "lega", "fi", "nm")}
    region["valle_d_aosta"] = {p: 0.0 for p in PARTIES}
    for p in ("fdi", "lega", "fi", "nm"):
        region["valle_d_aosta"][p] = round(vda_cdx * ratio[p], 2)

    fptp_seats = dict(FPTP_PER_REGION)
    print("FPTP total:", sum(fptp_seats.values()))

    missing = [k for k in REGIONS if k not in region]
    assert not missing, "regions without baselines: %s" % missing
    assert len(fptp_seats) == 20, "expected 20 regions"
    assert sum(fptp_seats.values()) == 147, "expected 147 FPTP seats"

    # geometry: geoBoundaries ITA ADM2 (20 regions)
    gj = bm.load_geojson(
        "https://www.geoboundaries.org/api/current/gbOpen/ITA/ADM2/")
    features, matched = [], set()
    for f in gj["features"]:
        raw = f["properties"]["shapeName"]
        key = GEO_REGION.get(raw)
        if not key:
            print("  no mapping for", raw)
            continue
        matched.add(key)
        features.append({"type": "Feature", "properties": {"reg": key},
                         "geometry": f["geometry"]})
    print("features:", len(features), "| without geometry:",
          sorted(set(REGIONS) - matched))
    assert len(features) == 20, "expected 20 regions"
    with open(COMBINED, "w", encoding="utf8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh)
    sys.argv = ["build_map_svg.py", "--geojson", COMBINED,
                "--name-field", "reg", "--attr", "id", "--no-prefix",
                "--out", OUT_SVG, "--attribution", ATTRIBUTION, "--force"]
    bm.main()
    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    gebiete = {k: {p: region[k].get(p, 0) for p in PARTIES}
               for k in REGIONS}
    cfg_path = os.path.join(ROOT, "js", "config.js")
    text = open(cfg_path, encoding="utf8").read()
    j = lambda o, ind: json.dumps(o, ensure_ascii=False, indent=ind)
    block = """  italy: {
    name: 'Italy',
    seats: 400,
    threshold: 3.0,
    method: 'dhondt',             // national PR pool (Rosatellum)
    mixedFptp: true,              // 147 FPTP districts + 253-seat PR pool
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      fdi:  { code: 'FdI',   name: 'Fratelli d\\'Italia',            name_en: 'Brothers of Italy',             color: '#0F2D5C' },
      pd:   { code: 'PD',    name: 'Partito Democratico',           name_en: 'Democratic Party',              color: '#E4002B' },
      m5s:  { code: 'M5S',   name: 'Movimento 5 Stelle',            name_en: 'Five Star Movement',            color: '#FDD500' },
      lega: { code: 'Lega',  name: 'Lega per Salvini Premier',      name_en: 'League for Salvini Premier',    color: '#2B2B2B' },
      fi:   { code: 'FI',    name: 'Forza Italia',                  name_en: 'Forza Italia',                  color: '#0087D1' },
      a:    { code: 'A',     name: 'Azione',                        name_en: 'Action',                        color: '#0E5C9E' },
      iv:   { code: 'IV',    name: 'Italia Viva',                   name_en: 'Italia Viva',                   color: '#E6226B' },
      avs:  { code: 'AVS',   name: 'Alleanza Verdi e Sinistra',     name_en: 'Greens and Left Alliance',      color: '#4C9E38' },
      e:    { code: '+E',    name: '+Europa',                       name_en: 'More Europe',                   color: '#0073B9' },
      nm:   { code: 'NM',    name: 'Noi Moderati',                  name_en: 'Us Moderates',                  color: '#1B4F9C' },
      fn:   { code: 'FN',    name: 'Futuro Nazionale',              name_en: 'National Future',               color: '#4A4A4A' },
    },
    order: ['fdi', 'pd', 'm5s', 'lega', 'fi', 'a', 'iv', 'avs', 'e', 'nm', 'fn'],
    parlOrder: ['avs', 'pd', 'm5s', 'a', 'iv', 'e', 'nm', 'fi', 'lega', 'fdi', 'fn'],
    // Rosatellum coalitions: the FPTP districts go to the winning coalition
    blocs: {
      bloc1: { name: 'Centre-right coalition', short: 'CDX', parties: ['fdi', 'lega', 'fi', 'nm'], color: '#1B4F9C' },
      bloc2: { name: 'Centre-left coalition',  short: 'CSX', parties: ['pd', 'avs', 'e'], color: '#E4002B' },
    },
    lastElection: {
      date: '2022-09-25',
      // 2022 general election, Chamber of Deputies (official)
      results: @@national@@,
      seats: @@seats@@,
    },
    map: {
      svg: 'img/italy.svg',
      selector: 'id',
      districts: @@districts@@,
      names: @@names@@,
      // FPTP districts per region (2022 apportionment, 147 in total)
      fptpSeats: @@fptpSeats@@,
      // Valle d'Aosta's seat went to the regionalist Vallée d'Aoste list
      winners2021: { "valle_d_aosta": "other" },
      regionOf: @@regionOf@@,
      region2022: @@gebiete@@,
      // 2022 vote share % per region (Ministry of the Interior)
      gebiete: @@gebiete@@,
      // national baseline for the swing projection (= 2022 result)
      national2021: @@national@@,
    },
    pollsterMAE: {},
    maeKey: 'IT2022',
    logos: {
      fdi: 'img/it/FDI.svg', pd: 'img/it/PD.svg', m5s: 'img/it/M5S.svg',
      lega: 'img/it/LEGA.svg', fi: 'img/it/FI.svg', a: 'img/it/A.svg',
      iv: 'img/it/IV.svg', avs: 'img/it/AVS.svg', e: 'img/it/E.svg',
      nm: 'img/it/NM.svg', fn: 'img/it/FN.svg',
    },
  },
"""
    for ph, val in (
            ("national", j(national, 8).replace("\n", "\n      ")),
            ("seats", j(seats, 8).replace("\n", "\n      ")),
            ("districts", j({k: k for k in REGIONS}, 8).replace(
                "\n", "\n      ")),
            ("names", j({k: REGIONS[k] for k in REGIONS}, 8).replace(
                "\n", "\n      ")),
            ("fptpSeats", j(fptp_seats, 8).replace("\n", "\n      ")),
            ("regionOf", j({k: k for k in REGIONS}, 8).replace(
                "\n", "\n      ")),
            ("gebiete", j(gebiete, 8).replace("\n", "\n      "))):
        block = block.replace("@@%s@@" % ph, val)

    m = re.search(r"\n  italy: \{", text)
    if m:
        depth, k = 0, m.end() - 1
        while k < len(text):
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        text = text[:m.start()] + "\n" + block.rstrip()[:-1] + text[k + 1:]
    else:
        anchor = "\n};\n\n// ===== Active country"
        idx = text.index(anchor)
        text = text[:idx] + "\n" + block.rstrip() + text[idx:]
    open(cfg_path, "w", encoding="utf8").write(text)
    print("patched config.js (italy block)")


if __name__ == "__main__":
    main()
