#!/usr/bin/env python3
"""2024 belediye meclisi uyeligi (council) results per province from YSK.

The official system (sonuc.ysk.gov.tr) is an Angular app; its API takes
secimId=hashData(secim_ID)=secim_ID*3+102 and answers curl but not python's
TLS fingerprint. Election 20260 = 31 Mart 2024 Mahalli Idareler; type 3 =
Belediye Meclisi Uyeligi. Per province: the party column headers, then the
per-ilce vote rows summed. Writes data/turkey/2024_local.json.

Usage: python scraper/scrape_turkey_2024.py [--il istanbul]
"""
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_turkey as bt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache')
JAR = os.path.join(CACHE, 'ysk_cookies.txt')
SECIM_ID = 20260
H = SECIM_ID * 3 + 102
TYPE_COUNCIL = 3
BASE = 'https://sonuc.ysk.gov.tr/api/'

COL_MAP = {
    'AK PARTİ': 'akp', 'CHP': 'chp', 'MHP': 'mhp', 'İYİ PARTİ': 'iyi',
    'DEM PARTİ': 'dem', 'YENİDEN REFAH': 'yrp', 'ZAFER PARTİSİ': 'zp',
    'TİP': 'tip', 'SAADET': 'saadet', 'BÜYÜK BİRLİK': 'bbp',
}
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125'


def curl(url):
    r = subprocess.run(['curl.exe', '-s', '--max-time', '90',
                        '-b', JAR, '-c', JAR, '-A', UA, url],
                       capture_output=True, text=True, timeout=120)
    return (r.stdout or '').strip()


def params(il_id, extra=''):
    return ('secimId=%d&secimTuru=%d&ilId=%s&ilceId=&beldeId=&birimId='
            '&muhtarlikId=&cezaeviId=&sandikTuru=-1&sandikNoIlk=&sandikNoSon='
            '&ulkeId=&disTemsilcilikId=&gumrukId=&yurtIciDisi=1&sandikRumuzIlk='
            '&sandikRumuzSon=&secimCevresiId=&sandikId=%s' % (H, TYPE_COUNCIL,
                                                             il_id, extra))


def main():
    only = None
    if '--il' in sys.argv:
        only = sys.argv[sys.argv.index('--il') + 1]
    curl('https://sonuc.ysk.gov.tr/sonuc')  # session cookies
    # the il list itself: mirror the app's call
    ils = json.loads(curl(
        BASE + 'getIlList?secimId=%d&secimTuru=%d&sandikTuru=-1'
               '&yurtIciDisi=1' % (H, TYPE_COUNCIL)))
    out = {}
    for ent in ils:
        pid = bt.fold(ent['il_ADI'])
        if only and pid != only:
            continue
        iid = ent['il_ID']
        hdr = curl(BASE + 'getSandikSecimSonucBaslikList?'
                   + params(iid) + '&sorguTuru=1')
        try:
            headers = json.loads(hdr)
        except Exception:
            print('%-14s header fail' % pid)
            continue
        col_key = {}
        for h in headers:
            col = h.get('column_NAME') or ''
            ad = (h.get('ad') or '').strip().upper()
            key = COL_MAP.get(ad)
            if key is None:
                for pre, k in (('DEM', 'dem'), ('YEŞİL SOL', 'dem'),
                               ('HDP', 'dem'), ('AK PART', 'akp'),
                               ('CHP', 'chp'), ('MHP', 'mhp'),
                               ('İYİ', 'iyi'),
                               ('YENİDEN REFAH', 'yrp'),
                               ('ZAFER', 'zp'), ('TÜRKİYE İŞÇİ', 'tip'),
                               ('TİP', 'tip'), ('SAADET', 'saadet'),
                               ('BÜYÜK BİRLİK', 'bbp')):
                    if ad.startswith(pre):
                        key = k
                        break
            col_key[col] = key or 'other'
        rows = json.loads(curl(BASE + 'getSecimSandikSonucList?'
                               + params(iid) + '&sorguTuru=2'))
        tot = {}
        for row in rows:
            for col, key in col_key.items():
                v = row.get(col)
                if isinstance(v, (int, float)) and v:
                    tot[key] = tot.get(key, 0) + int(v)
        tv = sum(tot.values())
        if not tv:
            print('%-14s no data' % pid)
            continue
        keep = ('akp', 'chp', 'mhp', 'iyi', 'dem', 'yrp', 'zp', 'tip',
                'saadet', 'bbp')
        out[pid] = {p: round(100.0 * tot.get(p, 0) / tv, 2) for p in keep}
        out[pid]['other'] = round(100.0 * tot.get('other', 0) / tv, 2)
        top = sorted(out[pid].items(), key=lambda x: -x[1])[:4]
        print('%-14s %s' % (pid, ', '.join('%s %.1f' % (k, v)
                                           for k, v in top)))
        time.sleep(0.4)
    path = os.path.join(ROOT, 'data', 'turkey', '2024_local.json')
    json.dump(out, open(path, 'w', encoding='utf8'),
              ensure_ascii=False, indent=1)
    print('wrote', path, len(out), 'provinces')


if __name__ == '__main__':
    main()
