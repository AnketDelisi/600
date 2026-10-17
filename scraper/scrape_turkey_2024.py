#!/usr/bin/env python3
"""2024 local elections (31 March) per-province party shares, from the
tr.wikipedia per-province articles ("<İl>'de 2024 Türkiye yerel seçimleri").

The article's first big party table is the province-wide mayoral race
(büyükşehir/belediye başkanlığı) - used directly. Provinces whose article
has no province table (non-metropolitan) sum their ilçe tables instead.
Output: data/turkey/2024_local.json {province_id: {party: pct}}.
"""
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_turkey as bt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache')
S = requests.Session()
S.headers['User-Agent'] = '600-poll-scraper/1.0'

FULL = dict(bt.PROV_COLS)
for lab, key in (('dem parti', 'dem'), ('yesil sol parti', 'dem'),
                 ('halklarin esitlik', 'dem'), ('yeniden refah partisi', 'yrp'),
                 ('zafer partisi', 'zp'), ('turkiye isci partisi', 'tip'),
                 ('buyuk birlik partisi', 'bbp'), ('cumhuriyet halk partisi', 'chp'),
                 ('milliyetci hareket partisi', 'mhp'), ('iyi parti', 'iyi'),
                 ('saadet partisi', 'saadet')):
    FULL.setdefault(lab, key)


def party_of(lab):
    if lab in FULL:
        return FULL[lab]
    for k, v in FULL.items():
        if lab.startswith(k + ' '):
            return v
    return None


def parse_table(grid):
    """Party rows of an 'Oy sayısı' result table -> {party: votes}."""
    hdr = None
    for ri, row in enumerate(grid[:8]):
        if row and any('oy sayısı' in (c or '').lower() for c in row):
            hdr = ri
            break
    if hdr is None:
        return None
    pcol = vcol = None
    for ci, cell in enumerate(grid[hdr]):
        low = (cell or '').lower()
        if 'oy sayısı' in low:
            vcol = ci
        if low.strip() in ('parti', 'parti̇'):
            pcol = ci
    if vcol is None:
        return None
    votes = {}
    for row in grid[hdr + 1:]:
        if not row or len(row) <= vcol:
            continue
        lab = bt.norm_label(row[pcol] if pcol is not None and pcol < len(row)
                            else '')
        key = party_of(lab)
        if not key:
            continue
        v = bt.num(row[vcol])
        if v:
            votes[key] = votes.get(key, 0) + v
    return votes or None


def main():
    gj = json.load(open(os.path.join(CACHE, 'tr_ilceler.geojson'),
                        encoding='utf8'))
    pnames = {}
    for f in gj['features']:
        nm = f['properties'].get('NAME_1')
        if nm:
            pnames[bt.bm.fold(nm)] = nm
    out = {}
    for pid, nm in sorted(pnames.items()):
        cfile = os.path.join(CACHE, 'tr24_%s.html' % pid)
        if os.path.exists(cfile):
            html = open(cfile, encoding='utf8').read()
        else:
            title = "%s'%s 2024 Türkiye yerel seçimleri" % (nm, bt.locative(nm))
            url = ('https://tr.wikipedia.org/wiki/'
                   + requests.utils.quote(title.replace(' ', '_')))
            r = S.get(url, timeout=120)
            if r.status_code != 200:
                print('%-14s MISS %s' % (pid, r.status_code))
                continue
            html = r.text
            open(cfile, 'w', encoding='utf8').write(html)
            time.sleep(0.8)
        soup = BeautifulSoup(html, 'lxml')
        h2 = None
        prov_votes = None
        sum_votes = {}
        for el in soup.find_all(['h2', 'table']):
            if el.name == 'h2':
                h2 = el.get_text(' ', strip=True)
                continue
            if 'wikitable' not in (el.get('class') or []):
                continue
            grid = bt.expand_grid(el)
            if not grid or len(grid) < 10:
                continue
            v = parse_table(grid)
            if not v:
                continue
            if prov_votes is None and h2 and \
                    re.search(r'belediye|büyükşehir', h2, re.I):
                prov_votes = v
            else:
                for p, x in v.items():
                    sum_votes[p] = sum_votes.get(p, 0) + x
        votes = prov_votes or sum_votes
        tv = sum(votes.values())
        if not tv:
            print('%-14s no data' % pid)
            continue
        keep = ('akp', 'chp', 'mhp', 'iyi', 'dem', 'yrp', 'zp', 'tip',
                'saadet', 'bbp')
        out[pid] = {p: round(100.0 * votes.get(p, 0) / tv, 2) for p in keep}
        top = sorted(out[pid].items(), key=lambda x: -x[1])[:4]
        print('%-14s %-8s %s' % (pid, 'prov' if prov_votes else 'ilce-sum',
                                 ', '.join('%s %.1f' % (k, x)
                                           for k, x in top)))
    path = os.path.join(ROOT, 'data', 'turkey', '2024_local.json')
    json.dump(out, open(path, 'w', encoding='utf8'),
              ensure_ascii=False, indent=1)
    print('wrote', path, len(out), 'provinces')


if __name__ == '__main__':
    main()
