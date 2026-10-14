#!/usr/bin/env python3
"""Build the Turkey map + config block (600 seats, per-province D'Hondt).

Baselines: the 2023 general election. The per-province totals (seats,
valid votes, AKP/CHP/MHP/IYI/YSP/Other) come from the main article's
results-by-province table; the per-party detail (YRP/ZP/TIP/BBP included)
comes from the 81 per-province articles ("X'te 2023 Türkiye
cumhurbaşkanlığı ve genel seçimleri"), which also carry the per-Bölge
totals for the four split provinces (İstanbul I-III, Ankara I-III,
İzmir I-II, Bursa I-II) - those become the prDistricts, so the seats are
allocated in the real electoral districts. Yeni Parti inherits CHP's
geography; Anahtar Parti 75% İYİ + 25% AKP. Geometry: GADM 4.1 TUR ADM1,
no inset.

Writes img/turkey.svg and inserts the turkey block into js/config.js.

Usage: python scraper/build_turkey.py [--force]
"""
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
import build_map_svg as bm

ROOT = os.path.join(os.path.dirname(__file__), "..")
CACHE = os.path.join(ROOT, "scraper", ".cache")
OUT_SVG = os.path.join(ROOT, "img", "turkey.svg")
BMV_SVG = os.path.join(ROOT, "bmv", "img", "turkey.svg")
DIST_SVG = os.path.join(CACHE, "tr_map_87.svg")
GEOJSON = os.path.join(CACHE, "tr_provinces.geojson")
ARTICLE = "https://tr.wikipedia.org/wiki/2023_T%C3%BCrkiye_genel_se%C3%A7imleri"
ATTRIBUTION = ("Sonuçlar: YSK (2023 genel seçimi, tr.wikipedia); "
               "Geometri: GADM 4.1")
ALIAS = {"K.Maras": "Kahramanmaraş", "Kinkkale": "Kırıkkale",
         "Zinguldak": "Zonguldak", "Afyon": "Afyonkarahisar",
         # GADM ASCII spellings -> the Turkish names
         "Adiyaman": "Adıyaman", "Agri": "Ağrı", "Balikesir": "Balıkesir",
         "Diyarbakir": "Diyarbakır", "Eskisehir": "Eskişehir",
         "Gümüshane": "Gümüşhane", "Hakkari": "Hakkâri",
         "Istanbul": "İstanbul", "Izmir": "İzmir", "Mugla": "Muğla",
         "Mus": "Muş", "Nigde": "Niğde", "Sanliurfa": "Şanlıurfa",
         "Sirnak": "Şırnak", "Tekirdag": "Tekirdağ", "Usak": "Uşak",
         "Aydin": "Aydın", "Kirklareli": "Kırklareli",
         "Kirsehir": "Kırşehir", "Nevsehir": "Nevşehir",
         "Çankiri": "Çankırı"}

PARTIES = ["akp", "chp", "mhp", "iyi", "dem", "yrp", "zp", "tip", "a",
           "yep", "saadet", "bbp"]
# per-province article party labels -> config keys
ILCE_ALIAS = {"eyupsultan": "eyup", "kahramankazan": "kazan",
              "kkazan": "kazan", "khamam": "kizilcahamam",
              "sereflikochisar": "sultankochisar"}


PROV_COLS = {"ak parti": "akp", "akp": "akp", "chp": "chp",
             "mhp": "mhp", "iyiparti": "iyi", "iyi parti": "iyi",
             "yesil sol": "dem", "ysp": "dem", "yeniden refah": "yrp",
             "yrp": "yrp", "zafer": "zp", "zp": "zp", "tip": "tip",
             "bbp": "bbp"}


def norm_label(s):
    """'AK PARTI' / 'İYİPARTİ' / 'TİP' -> ascii-ish lower for matching."""
    import unicodedata
    s = unicodedata.normalize("NFKD", (s or "").strip().lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.replace("ı", "i")
# the four provinces split into electoral districts + their article names
SPLIT = {"istanbul": "İstanbul", "ankara": "Ankara", "izmir": "İzmir",
         "bursa": "Bursa"}
META = {
    "akp": ("AKP", "Adalet ve Kalkınma Partisi", "#fda000",
            "Right-wing populism"),
    "chp": ("CHP", "Cumhuriyet Halk Partisi", "#F08080",
            "Social liberalism"),
    "mhp": ("MHP", "Milliyetçi Hareket Partisi", "#C83737",
            "Turkish-Islamic Synthesis"),
    "iyi": ("İYİ", "İYİ Parti", "#3db5e6",
            "Nationalism, Liberal conservatism"),
    "dem": ("DEM", "Halkların Eşitlik ve Demokrasi Partisi", "#734B9C",
            "Kurdish nationalism, Democratic socialism"),
    "yrp": ("YRP", "Yeniden Refah Partisi", "#2E8B57",
            "Erbakanism"),
    "zp": ("ZP", "Zafer Partisi", "#373736",
           "Ultranationalism"),
    "tip": ("TİP", "Türkiye İşçi Partisi", "#BE0A11",
            "Left-wing populism"),
    "a": ("A", "Anahtar Parti", "#192B4F",
          "Turkish-Islamic Synthesis"),
    "yep": ("YENİ", "Yeni Parti", "#ED1C24",
            "Social democracy, Kemalism"),
    "saadet": ("SAADET", "Saadet Partisi", "#FF2E84",
               "Erbakanism"),
    "bbp": ("BBP", "Büyük Birlik Partisi", "#CC5252",
            "Turkish-Islamic Synthesis"),
}
LOGOS = {"akp": "AKP.svg", "chp": "CHP.svg", "mhp": "MHP.svg",
         "iyi": "IYI.svg", "dem": "DEM.svg", "yrp": "YRP.svg",
         "zp": "ZAFER.svg", "tip": "TIP.svg", "a": "A.svg",
         "yep": "YENI.svg", "saadet": "SAADET.svg", "bbp": "BBP.svg"}
SEATS23 = {"akp": 268, "chp": 169, "mhp": 50, "iyi": 43, "dem": 61,
           "yrp": 5, "tip": 4, "bbp": 0, "zp": 0, "a": 0, "yep": 0,
           "saadet": 0}
# the official 2023 shares (the displayed last election; YEP/A did not
# exist - they only carry the proxy geography for the swing)
RESULTS23 = {"akp": 35.62, "chp": 25.35, "mhp": 10.07, "iyi": 9.69,
             "dem": 8.82, "yrp": 2.81, "zp": 2.23, "tip": 1.73, "bbp": 0.97,
             "a": 0, "yep": 0, "saadet": 0}


def fold(s):
    return bm.fold(s or "")


def num(s):
    s = re.sub(r"\[[^\]]*\]", "", s or "")
    return int(re.sub(r"[^\d]", "", s) or 0)


def dec(s):
    m = re.search(r"(\d+(?:,\d+)?)", (s or "").replace(".", ""))
    return float(m.group(1).replace(",", ".")) if m else 0.0


def expand_grid(table):
    rows = table.find_all("tr")
    grid, live = [], {}
    for tr in rows:
        cells = tr.find_all(["td", "th"])
        out, col, i = [], 0, 0
        while i < len(cells):
            while col in live and live[col][0] > 0:
                out.append(live[col][1])
                live[col] = (live[col][0] - 1, live[col][1])
                col += 1
            c = cells[i]
            txt = " ".join(c.get_text(" ", strip=True).split())
            cs = int(c.get("colspan") or 1)
            rs = int(c.get("rowspan") or 1)
            for k in range(cs):
                out.append(txt)
                if rs > 1:
                    live[col + k] = (rs - 1, txt)
            col += cs
            i += 1
        while col in live and live[col][0] > 0:
            out.append(live[col][1])
            live[col] = (live[col][0] - 1, live[col][1])
            col += 1
        grid.append(out)
    return grid


def fetch(url, name, force=False):
    path = os.path.join(CACHE, name)
    if force or not os.path.isfile(path):
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"},
                         timeout=300)
        r.raise_for_status()
        open(path, "w", encoding="utf8").write(r.text)
    return open(path, encoding="utf8").read()


def fetch_geo(force=False):
    if force or not os.path.isfile(GEOJSON):
        r = requests.get("https://geodata.ucdavis.edu/gadm/gadm4.1/json/"
                         "gadm41_TUR_1.json",
                         headers={"User-Agent": "Mozilla/5.0"}, timeout=300)
        r.raise_for_status()
        open(GEOJSON, "w", encoding="utf8").write(r.text)
    gj = json.loads(open(GEOJSON, encoding="utf8").read())
    for f in gj["features"]:
        nm = f["properties"]["NAME_1"]
        f["properties"]["NAME_1"] = ALIAS.get(nm, nm)
    return gj


def parse_province_table(html):
    """The per-province article: {district_key: {party: votes}} plus the
    Bölge seats if the province is split. Returns (rows, n_bolge, compo,
    mv_rows): compo maps the Bölge number to its ilçe list (the article's
    per-Bölge ilçe tables = the official YSK compositions), mv_rows the
    per-party seat counts."""
    soup = BeautifulSoup(html, "lxml")
    rows, bolge = {}, 0
    compo = {}
    mv_rows = {}
    cur = None
    for el in soup.find_all(["h2", "h3", "h4", "table"]):
        if el.name != "table":
            txt = " ".join(el.get_text(" ", strip=True).split())
            m = re.match(r"^(\d)\.\s*Bölge", txt)
            if m:
                cur = int(m.group(1))
                bolge = max(bolge, cur)
            continue
        if len(el.find_all("tr")) < 5:
            continue
        grid = expand_grid(el)
        # the per-Bölge ilçe table: header starts with "Partiler"
        if cur and grid and (grid[0][0] or "").strip().lower().startswith(
                ("partiler", "partİler")):
            names = [re.sub(r"\[[^\]]*\]", "", x).strip()
                     for x in grid[0][1:]]
            names = [x for x in names if x and "toplam" not in x.lower()]
            if names and cur not in compo:
                compo[cur] = names
            continue
        # the result table's header is a few rows down (voter counts first)
        hrow = None
        for ri in range(min(6, len(grid))):
            hdr = " ".join(grid[ri]).upper()
            if "ÇEVRE OYU" in hdr and "TTIFAK" in hdr:
                hrow = ri
                break
        if hrow is None:
            continue
        ci = gi = mi = None
        for i, h in enumerate(grid[hrow]):
            hu = h.upper()
            if "ÇEVRE" in hu and ci is None:
                ci = i
            if ("GÜMRÜK" in hu or "YURT" in hu) and gi is None:
                gi = i
            if hu.strip() in ("MV SAYISI", "MV") and mi is None:
                mi = i
        if ci is None or gi is None:
            continue
        key = "b%d" % cur if cur else "all"
        if key in rows:
            continue
        votes = {}
        mvs = {}
        for row in grid[hrow + 1:]:
            if len(row) <= max(ci, gi):
                continue
            # the party label: the Kıs. column (index 1) or Parti (index 2)
            label = None
            for cell in row[1:4]:
                tok = norm_label(cell)
                if tok in PROV_COLS:
                    label = PROV_COLS[tok]
                    break
            if not label:
                continue
            v = num(row[ci]) + num(row[gi])
            if v:
                votes[label] = votes.get(label, 0) + v
            if mi is not None and mi < len(row):
                mvs[label] = mvs.get(label, 0) + num(row[mi])
        if len(votes) >= 5:
            rows[key] = votes
            mv_rows[key] = mvs
    return rows, bolge, compo, mv_rows



def parse_ilce_tables(html):
    """Per-ilçe 2023 general-election votes: {ilce: {party: votes}} plus the
    per-ilçe Toplam row when present. Only the "Partiler | ilçe..." tables
    (the presidential tables' rows are candidates, they do not match)."""
    soup = BeautifulSoup(html, "lxml")
    votes, totals = {}, {}
    for el in soup.find_all("table"):
        if len(el.find_all("tr")) < 5:
            continue
        grid = expand_grid(el)
        if not grid or not (grid[0][0] or "").strip().lower().startswith(
                ("partiler", "partİler".lower())):
            continue
        cols = []
        for ci, hname in enumerate(grid[0][1:], start=1):
            hname = re.sub(r"\[[^\]]*\]", "", hname or "").strip()
            if hname and "toplam" not in hname.lower():
                cols.append((ci, hname))
        if len(cols) < 3:
            continue
        for row in grid[1:]:
            lab = norm_label(row[0]) if row else ""
            party = PROV_COLS.get(lab)
            if party is None and lab == "toplam":
                for ci, hname in cols:
                    if ci < len(row) and num(row[ci]):
                        totals[hname] = num(row[ci])
                continue
            if party is None:
                continue
            for ci, hname in cols:
                if ci < len(row):
                    votes.setdefault(hname, {})[party] = num(row[ci])
    return votes, totals

def main():
    force = "--force" in sys.argv
    gj = fetch_geo(force)
    feats = gj["features"]
    assert len(feats) == 81

    # ---- the main article: seats + valid votes + the 6-party shares ----
    soup = BeautifulSoup(fetch(ARTICLE, "tr_2023_main.html", force), "lxml")
    prov = {}
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) < 80:
            continue
        grid = expand_grid(tb)
        if not grid or "Seçim çevresi" not in " ".join(grid[0][:2]):
            continue
        cols = {}
        for i, h in enumerate(grid[0]):
            h = h.strip()
            if h in ("AKP", "CHP", "MHP", "İYİ", "YSP", "Diğer"):
                cols[i] = h
        for row in grid[1:]:
            if len(row) < 21:
                continue
            name = row[0].replace(" (toplam)", "").strip()
            if re.search(r"\((?:I|II|III)\)$", row[0]) or not name:
                continue
            if name == "Türkiye toplamı":
                continue
            prov[fold(name)] = {"seats": num(row[1]), "valid": num(row[2])}
        break
    assert len(prov) == 81, len(prov)

    # ---- the 81 per-province articles: full per-party votes ----
    prov_names = {fold(f["properties"]["NAME_1"]):
                  f["properties"]["NAME_1"] for f in feats}
    VOWELS = "aeıioöuü"
    BACK = "aıou"
    VOICELESS = "fstkçşhp"

    def locative(word):
        w = word.lower().replace("â", "a").replace("î", "i")
        last_v = next((c for c in reversed(w) if c in VOWELS), "a")
        v = "a" if last_v in BACK else "e"
        d = "t" if w[-1] in VOICELESS else "d"
        return d + v

    districts = {}   # allocation districts: 77 provinces + 10 sub-districts
    geo_shares = {}
    ilce_dist = {}  # per-district party shares (akp..bbp; others implied)
    compo_map = {}   # split provinces: Bölge -> ilçe list
    mvs_by_prov = {}  # (province, bölge) -> per-party 2023 seats
    mv2023 = {}      # district -> {party: seats} (the 2023 real result)
    for pid, nm in sorted(prov_names.items()):
        title = "%s'%s 2023 Türkiye cumhurbaşkanlığı ve genel seçimleri" \
            % (nm, locative(nm))
        from urllib.parse import quote
        url = "https://tr.wikipedia.org/wiki/" + quote(title)
        _html = fetch(url, "tr_prov_%s.html" % pid, force)
        rows, n_bolge, compo, mvs = parse_province_table(_html)
        # the per-ilçe 2023 shares (the ilçe-level base map)
        _iv, _itot = parse_ilce_tables(_html)
        for _iname, _pv in _iv.items():
            _ifold = ILCE_ALIAS.get(bm.fold(_iname), bm.fold(_iname))
            _iid = "%s-%s" % (pid, _ifold)
            _tot = _itot.get(_iname) or sum(_pv.values())
            if not _tot:
                continue
            geo_shares[_iid] = {k: round(100.0 * _pv.get(k, 0) / _tot, 2)
                                for k in ("akp", "chp", "mhp", "iyi",
                                          "dem", "yrp", "zp", "tip", "bbp")}
            ilce_dist[_iid] = pid
        if pid in SPLIT and n_bolge >= 2:
            # sub-districts from the per-Bölge tables; the shares use the
            # official valid votes: the province's valid votes scaled by the
            # unlisted-party fraction (listed sum vs valid)
            subs = {bi: rows.get("b%d" % bi) for bi in range(1, n_bolge + 1)}
            for bi, v in subs.items():
                assert v, "%s b%d missing" % (pid, bi)
            listed_parent = sum(sum(v.values()) for v in subs.values())
            scale = prov[pid]["valid"] / max(1, listed_parent)
            for bi, v in subs.items():
                key = "%s-%s" % (pid, "i" * bi)
                valid = sum(v.values()) * scale
                geo_shares[key] = {k: round(100 * v.get(k, 0) / valid, 2)
                                   for k in ("akp", "chp", "mhp", "iyi",
                                             "dem", "yrp", "zp", "tip",
                                             "bbp")}
            # Güdül moved from Ankara II to Ankara III (2022 change)
            if pid == "ankara" and 2 in compo and "Güdül" in compo[2]:
                compo[2].remove("Güdül")
                compo.setdefault(3, []).append("Güdül")
            compo_map[pid] = compo
            # the split provinces' ilçes report their Bölge's seat pills
            for _bi, _lst in compo.items():
                for _nm2 in _lst:
                    _f2 = ILCE_ALIAS.get(bm.fold(_nm2), bm.fold(_nm2))
                    ilce_dist["%s-%s" % (pid, _f2)] = \
                        "%s-%s" % (pid, "i" * _bi)
            for bi, v in mvs.items():
                if bi != "all":
                    mvs_by_prov[(pid, int(bi[1:]))] = v
            districts[pid] = None  # seat count from the sub-rows below
        else:
            v = rows.get("all") or rows.get("b1")
            assert v, "%s: no result table" % pid
            valid = prov[pid]["valid"]
            geo_shares[pid] = {k: round(100 * v.get(k, 0) / valid, 2)
                               for k in ("akp", "chp", "mhp", "iyi",
                                         "dem", "yrp", "zp", "tip", "bbp")}
            districts[pid] = prov[pid]["seats"]
            mv2023[pid] = {k: v for k, v in mvs.get("all", mvs.get("b1", {}))
                           .items() if v}

    # ---- the sub-district seats from the main table ----
    sub_seats = {}
    for tb in soup.find_all("table"):
        if len(tb.find_all("tr")) < 80:
            continue
        grid = expand_grid(tb)
        if not grid or "Seçim çevresi" not in " ".join(grid[0][:2]):
            continue
        for row in grid[1:]:
            m = re.match(r"^(%s)\s*\((I|II|III)\)$"
                         % "|".join(SPLIT.values()), row[0].strip())
            if m:
                pid = fold(m.group(1))
                key = "%s-%s" % (pid, "i" * {"I": 1, "II": 2, "III": 3}[m.group(2)])
                sub_seats[key] = num(row[1])
        break
    for pid in SPLIT:
        n = sum(v for k, v in sub_seats.items() if k.startswith(pid + "-"))
        assert n == prov[pid]["seats"], (pid, n, prov[pid]["seats"])
        for k, v in sub_seats.items():
            if k.startswith(pid + "-"):
                districts[k] = v

    # ---- YSK karari (3 Mart 2026): the per-province seats from the 2025
    # nufus (AA 3847431). The old article tables still show the 2023 numbers
    YSK26 = {"adana": 15, "adiyaman": 5, "afyonkarahisar": 6, "agri": 4,
             "amasya": 3, "ankara": 37, "antalya": 18, "artvin": 2,
             "aydin": 8, "balikesir": 9, "bilecik": 2, "bingol": 3,
             "bitlis": 3, "bolu": 3, "burdur": 3, "bursa": 21,
             "canakkale": 4, "cankiri": 2, "corum": 4, "denizli": 7,
             "diyarbakir": 12, "edirne": 4, "elazig": 5, "erzincan": 2,
             "erzurum": 5, "eskisehir": 7, "gaziantep": 14, "giresun": 4,
             "gumushane": 2, "hakkari": 3, "hatay": 10, "isparta": 4,
             "mersin": 13, "istanbul": 96, "izmir": 28, "kars": 3,
             "kastamonu": 3, "kayseri": 10, "kirklareli": 3, "kirsehir": 2,
             "kocaeli": 14, "konya": 15, "kutahya": 4, "malatya": 6,
             "manisa": 10, "kahramanmaras": 8, "mardin": 6, "mugla": 8,
             "mus": 3, "nevsehir": 3, "nigde": 3, "ordu": 6, "rize": 3,
             "sakarya": 8, "samsun": 9, "siirt": 3, "sinop": 2, "sivas": 5,
             "tekirdag": 8, "tokat": 5, "trabzon": 6, "tunceli": 2,
             "sanliurfa": 15, "usak": 3, "van": 8, "yozgat": 3,
             "zonguldak": 5, "aksaray": 4, "bayburt": 1, "karaman": 3,
             "kirikkale": 3, "batman": 5, "sirnak": 4, "bartin": 2,
             "ardahan": 2, "igdir": 2, "yalova": 3, "karabuk": 2,
             "kilis": 2, "osmaniye": 4, "duzce": 3}
    for pid, n in YSK26.items():
        prov[pid]["seats"] = n
        if pid not in SPLIT:
            districts[pid] = n
    # the split provinces: the official bolge seats from YSK 2026/109
    # (3 Mar 2026, 2025 nufus); the ilce compositions there match ours 1:1
    for k, v in (("ankara-i", 13), ("ankara-ii", 11), ("ankara-iii", 13),
                 ("istanbul-i", 35), ("istanbul-ii", 25), ("istanbul-iii", 36),
                 ("izmir-i", 14), ("izmir-ii", 14),
                 ("bursa-i", 11), ("bursa-ii", 10)):
        districts[k] = v
    assert sum(v for v in districts.values() if v) == 600, sum(v for v in districts.values() if v)

    # the sub-district 2023 seats (per-Bölge MV)
    for pid in SPLIT:
        for bi in range(1, 4):
            key = "%s-%s" % (pid, "i" * bi)
            mv = mvs_by_prov.get((pid, bi))
            if key in districts and mv:
                mv2023[key] = {k: v for k, v in mv.items() if v}

    # ---- proxies: YEP = CHP, A = 75% İYİ + 25% AKP ----
    for key, sh in geo_shares.items():
        sh["yep"] = sh["chp"]        # Yeni Parti is a CHP split
        sh["a"] = round(0.75 * sh["iyi"] + 0.25 * sh["akp"], 2)
        sh["saadet"] = sh["yrp"]     # Saadet inherits YRP's geography

    # ---- national 2021 = the vote-weighted mean of the district shares ----
    wsum = {}
    totw = 0
    for key, sh in geo_shares.items():
        if key in SPLIT:
            continue  # map-only province entry; the sub-districts cover it
        if key in ilce_dist:
            continue  # ilçe rows colour the detail map only
        if "-" in key:
            parent = key.split("-")[0]
            w = (prov[parent]["valid"] * districts[key]
                 / max(1, prov[parent]["seats"]))
        else:
            w = prov[key]["valid"]
        totw += w
        for p in PARTIES:
            wsum[p] = wsum.get(p, 0) + (sh.get(p, 0) or 0) * w
    NAT = {p: round(wsum[p] / totw, 2) for p in PARTIES}

    # ---- electoral-district geometry: dissolve the ilçeler per Bölge ----
    from shapely.geometry import shape, mapping
    from shapely.ops import unary_union
    adm2 = json.loads(fetch("https://geodata.ucdavis.edu/gadm/gadm4.1/json/"
                            "gadm41_TUR_2.json", "tr_ilceler.geojson",
                            force))
    rev = {}
    for gname, tname in ALIAS.items():
        rev.setdefault(tname, gname)
    sub_feats = []
    for pid in SPLIT:
        tname = prov_names[pid]
        gadm_prov = rev.get(tname, tname)
        by_name = {}
        for f in adm2["features"]:
            if f["properties"]["NAME_1"] == gadm_prov:
                by_name[fold(f["properties"]["NAME_2"])] = f
        compo = compo_map[pid]
        for bi in sorted(compo):
            geoms = []
            for nm in compo[bi]:
                k2 = fold(nm)
                k2 = ILCE_ALIAS.get(k2, k2)
                f = by_name.get(k2)
                if f is None:
                    print("  WARN %s b%d: ilçe %s missing in GADM"
                          % (pid, bi, nm))
                    continue
                geoms.append(shape(f["geometry"]))
            assert geoms, "%s b%d: no geometry" % (pid, bi)
            # close the GADM inter-ilçe gaps: buffer out, merge, buffer back
            u = unary_union([g.buffer(0.0006) for g in geoms])
            u = u.buffer(-0.0006)
            roman = ["", "I", "II", "III"][bi]
            sub_feats.append({"type": "Feature",
                              "properties": {"NAME_1": "%s-%s"
                                             % (tname, roman)},
                              "geometry": mapping(u)})
    print("electoral-district polygons:", len(sub_feats))
    assert len(sub_feats) == 10
    map_gj = {"type": "FeatureCollection",
              "features": [f for f in feats
                           if fold(f["properties"]["NAME_1"]) not in SPLIT]
              + sub_feats}

    # ---- geometry + svg ----
    geo_norm = os.path.join(CACHE, "tr_map_87.geojson")
    with open(geo_norm, "w", encoding="utf8") as fh:
        json.dump(map_gj, fh)
    sys.argv = ["build_map_svg.py", "--geojson", geo_norm,
                "--name-field", "NAME_1", "--fold", "--attr", "id",
                "--no-prefix", "--out", DIST_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()

    # the visible base map is ilçe-level; ids = fold(province)-fold(ilçe)
    adm2 = json.loads((CACHE / "tr_ilceler.geojson").read_text(encoding="utf8")) \
        if hasattr(CACHE, "read_text") else json.load(
            open(os.path.join(CACHE, "tr_ilceler.geojson"), encoding="utf8"))
    ilce_gj = {"type": "FeatureCollection", "features": []}
    ilce_names = {}
    for f in adm2["features"]:
        pnm = f["properties"].get("NAME_1") or ""
        inm = f["properties"].get("NAME_2") or ""
        if not pnm or not inm:
            continue
        pnm = ALIAS.get(pnm, pnm)
        iid = "%s-%s" % (bm.fold(pnm), bm.fold(inm))
        ilce_names[iid] = inm
        ilce_gj["features"].append(
            {"type": "Feature",
             "properties": {"NAME_2": iid},
             "geometry": f["geometry"]})
    ilce_norm = os.path.join(CACHE, "tr_ilceler_ids.geojson")
    with open(ilce_norm, "w", encoding="utf8") as fh:
        json.dump(ilce_gj, fh)
    sys.argv = ["build_map_svg.py", "--geojson", ilce_norm,
                "--name-field", "NAME_2", "--fold", "--attr", "id",
                "--no-prefix", "--out", OUT_SVG,
                "--attribution", ATTRIBUTION]
    if force:
        sys.argv.append("--force")
    bm.main()
    # inject the 87 district outlines as invisible seat-circle anchors
    dsvg = open(DIST_SVG, encoding="utf8").read()
    dps = re.findall(r"<path\b[^>]*?/>", dsvg)
    if dps:
        inj = "".join(
            (p2 if "class=" in p2 else p2.replace(
                "<path ", '<path class="seat-area" fill="none" '
                          'stroke="none" pointer-events="none" ', 1))
            for p2 in dps)
        tsvg = open(OUT_SVG, encoding="utf8").read()
        tsvg = tsvg.replace("</svg>", inj + "</svg>")
        open(OUT_SVG, "w", encoding="utf8", newline="").write(tsvg)
    print("ilce map:", len(ilce_gj["features"]), "paths +", len(dps),
          "district overlays")
    # the articles abbreviate some ilçe names (D.Bey, A.Eylül): align the
    # parsed keys with the GADM-derived svg ids within each province
    ids_by_prov = {}
    for k in ilce_names:
        pfx, _, rest = k.partition("-")
        ids_by_prov.setdefault(pfx, []).append(rest)

    def _is_abbrev(a, b):
        it = iter(b)
        return bool(a) and all(ch in it for ch in a)

    _ren = {}
    for k in list(geo_shares):
        pfx, sep, rest = k.partition("-")
        if not sep or k in ilce_names:
            continue
        for cand in ids_by_prov.get(pfx, []):
            if pfx + "-" + cand in geo_shares:
                continue
            if _is_abbrev(rest, cand):
                _ren[k] = pfx + "-" + cand
                break
    for k, v in _ren.items():
        geo_shares[v] = geo_shares.pop(k)
        if k in ilce_dist:
            ilce_dist[v] = ilce_dist.pop(k)
    if _ren:
        print("ilçe name alignment:", len(_ren))

    # GADM keeps pre-2012 names for some ilçes; the exact renames first
    REN = {"giresun-sultankarahisar": "giresun-sebinkarahisar",
           "malatya-arapkir": "malatya-arapgir",
           "malatya-poturge": "malatya-puturge",
           "siirt-tillo": "siirt-aydinlar",
           "afyonkarahisar-sinanpasa": "afyonkarahisar-sincanli",
           "agri-dogubayazit": "agri-dogubeyazit",
           "antalya-demre": "antalya-kale"}
    _n2 = 0
    for _k, _v in REN.items():
        if _k in geo_shares and _v in ilce_names and _v not in geo_shares:
            geo_shares[_v] = geo_shares.pop(_k)
            if _k in ilce_dist:
                ilce_dist[_v] = ilce_dist.pop(_k)
            _n2 += 1
    # the article's modern büyükşehir centre ilçes merge into GADM's Merkez
    _macc = {}
    for _k in list(geo_shares):
        _pfx, _sep, _rest = _k.partition("-")
        if not _sep or _k in ilce_names:
            continue
        _mk = _pfx + "-merkez"
        if _mk in ilce_names and _mk not in geo_shares:
            _macc.setdefault(_pfx, []).append(geo_shares.pop(_k))
            ilce_dist.pop(_k, None)
    for _pfx, _lst in _macc.items():
        _mk = _pfx + "-merkez"
        _keys = set()
        for _s in _lst:
            _keys |= set(_s)
        geo_shares[_mk] = {_p: round(sum(_s.get(_p, 0) for _s in _lst)
                                     / len(_lst), 2) for _p in _keys}
        ilce_dist[_mk] = _pfx
    print("ilçe renames:", _n2, "merkez merges:", len(_macc))


    import shutil
    shutil.copy2(OUT_SVG, BMV_SVG)

    # logos
    dst = os.path.join(ROOT, "img", "tr")
    os.makedirs(dst, exist_ok=True)
    logos = {}
    for key, logo in LOGOS.items():
        shutil.copy2(os.path.join(r"C:\Users\deneme\Desktop\600logo\TR",
                                  logo), os.path.join(dst, logo))
        logos[key] = "img/tr/" + logo

    names_map = dict(prov_names)
    for k in districts:
        if "-" in k:
            base = prov_names[k.split("-")[0]]
            bi = len(k.split("-")[1])
            names_map[k] = "%s %s" % (base, ["", "I", "II", "III"][bi])
    j = json.dumps
    parties = "\n".join(
        "      %s: { code: '%s', name: '%s', name_en: '%s', color: '%s', "
        "ideology: \"%s\"}," % (k, META[k][0], META[k][1], META[k][1],
                                META[k][2], META[k][3])
        for k in PARTIES)
    block = """  turkey: {
    name: 'Turkey',
    name_tr: 'T\\u00fcrkiye',
    seats: 600,
    threshold: 7.0,               // 7%% national threshold (2022 change)
    method: 'dhondt',             // D'Hondt per electoral district
    seatBased: false,             // polls report vote shares (%%)
    constituencies: false,        // the 600 seats are allocated per district
    recencyHalfLifeDays: 7,
    parties: {
%s
    },
    order: ['akp', 'chp', 'mhp', 'iyi', 'dem', 'yrp', 'zp', 'tip', 'a', 'yep', 'saadet', 'bbp'],
    parlOrder: ['tip', 'dem', 'yep', 'chp', 'iyi', 'zp', 'saadet', 'a', 'yrp', 'akp', 'bbp', 'mhp'],
    // the ittifak structure (2028 state): an alliance's total counts for
    // the 7%% threshold (so MHP/BBP/TİP take seats below it); the seat
    // allocation itself is plain per-district D'Hondt, party by party.
    // YRP left the Cumhur and İYİ runs alone (no Millet).
    alliances: {
      cumhur: ['akp', 'mhp', 'bbp'],
      emek: ['dem', 'tip'],
    },
    blocs: {
      bloc1: { name: 'Government camp', short: 'GOV', parties: ['akp', 'mhp', 'bbp'], color: '#fda000' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['chp', 'iyi', 'dem', 'yrp', 'zp', 'tip', 'a', 'yep', 'saadet'], color: '#ED1C24' },
    },
    logos: {
%s
    },
    pollsterMAE: {},
    maeKey: 'TR2028',
    lastElection: {
      date: '2023-05-14',
      // 2023 general election (YSK); YSP is the DEM vehicle, YRP/TIP ran
      // inside the Cumhur/Emek lists (their seats split out here)
      results: %s,
      seats: %s,
    },
    map: {
      svg: 'img/turkey.svg',
      selector: 'id',
      swingMethod: 'proportional',
      // the 85 allocation districts: the 77 single-district provinces + the
      // İstanbul I-III / Ankara I-III / İzmir I-II / Bursa I-II electoral
      // districts (the map still colors the 81 provinces; the four split
      // provinces carry their province-wide shape for the map)
      districts: %s,
      names: %s,
      gebiete: %s,
      national2021: %s,
      prDistricts: %s,
      // the real 2023 per-district seat counts (the map's result view)
      mv2023: %s,
      // the result views must not show parties absent from the
      // 2023 election (these carry proxy geography for the swing)
      proxyParties: ['a', 'yep', 'saadet'],
      ilceDistrict: %s,
    },
  },
""" % (parties,
       ', '.join("%s: '%s'" % (k, v) for k, v in logos.items()),
       j(RESULTS23, ensure_ascii=False),
       j(SEATS23, ensure_ascii=False),
       j(dict(list({k: k for k, v in districts.items() if v}.items()) + [(k, k) for k in ilce_dist]), ensure_ascii=False),
       j(dict(list(names_map.items()) + list(ilce_names.items())), ensure_ascii=False),
       j(geo_shares, ensure_ascii=False),
       j(NAT, ensure_ascii=False),
       j({k: v for k, v in districts.items() if v}),
       j(mv2023, ensure_ascii=False),
      j(ilce_dist))

    text = open(os.path.join(ROOT, "js", "config.js"), encoding="utf8").read()
    m = re.search(r"\n  turkey: \{", text)
    assert m, "turkey block not found"
    depth, k = 0, m.end() - 1
    while k < len(text):
        if text[k] == "{":
            depth += 1
        elif text[k] == "}":
            depth -= 1
            if depth == 0:
                break
        k += 1
    end = k + 1
    if text[end:end + 1] == ",":
        end += 1
    text = text[:m.start()] + "\n" + block.rstrip("\n") + text[end:]
    open(os.path.join(ROOT, "js", "config.js"), "w",
         encoding="utf8", newline="").write(text)
    print("patched config.js (turkey block)")
    print("districts:", len(districts), "with seats:", sum(1 for v in districts.values() if v))
    print("seat total:", sum(v for v in districts.values() if v))
    print("national:", NAT)

    meta = {
        "country": "turkey", "name": "Turkey",
        "election_date": "2028-05-07", "seats": 600, "threshold": 7.0,
        "method": "dhondt", "constituencies": False,
        "notes": ("Per-district D'Hondt (87 electoral districts: 77 "
                  "provinces + the İstanbul/Ankara/İzmir/Bursa "
                  "sub-districts), 7% national threshold with the ittifak "
                  "exemption (Cumhur: AKP/MHP/BBP, Emek: DEM/TİP; YRP and "
                  "İYİ run alone). Baselines: the 2023 general election "
                  "(tr.wikipedia per-province articles). Polling: the "
                  "tr.wikipedia next-election polling article "
                  "(scrape_turkey.py)."),
    }
    os.makedirs(os.path.join(ROOT, "data", "turkey"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "turkey", "meta.json"), "w",
              encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    print("wrote data/turkey/meta.json")


if __name__ == "__main__":
    main()
