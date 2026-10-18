"""EP-2024 regional blend data builder.

Fetches the European Parliament 2024 results from poliwave for the countries
whose model geography matches the EP reporting granularity, and writes
per-region EP shares into js/config.js as epGebiete/epNational (+ epBlend
weight). js/app.js blends them into projections only (never result views):

    base = base*(1-w) + ep*w       (districtShares, non-result mode)

Rationale and weights: backtested on the Bulgarian 2023 national -> EP 2024 ->
2024 national triple (same source): vote-weighted regional MAE 2.21 -> 2.06 at
w=0.15; every party improved. Only parties present in the base gebiete are
blended (new parties keep their seeded/proxy geography).

Usage: python scraper/build_ep_blend.py [--dry] [--refresh]
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scraper', '.cache')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124 Safari/537.36')
BLEND = 0.15

COUNTRIES = {
    'greece': {
        'url': 'https://poliwave.com/gr/ep/elections/2024',
        'regions': lambda rid, name: rid.lower(),
        'parties': {
            'ND': 'nd', 'SYRIZA': 'syriza', 'PASOK': 'pasok', 'KKE': 'kke',
            'EL': 'el', 'MERA25': 'm25', 'NIKI': 'niki', 'PE': 'pe',
            'FL': 'fl', 'NA': 'na',
        },
    },
    'latvia': {
        'url': 'https://poliwave.com/lv/ep/elections/2024',
        'regions': {
            'LVRIG': 'riga', 'LVVID': 'vidzeme', 'LVLAT': 'latgale',
            'LVKUR': 'kurzeme', 'LVZEM': 'zemgale',
        },
        'parties': {
            'LV24L15': 'jv', 'LV24L03': 'na', 'LV24L04': 'lpv',
            'LV24L05': 'la', 'LV24L08': 'as', 'LV24L09': 'pro',
            'LV24L01': 'sc', 'LV24L12': 'sv', 'LV24L14': 'zzs',
            'LV24L16': 'st', 'LV24L02': 'jkp', 'LV24L07': 'asl',
        },
    },
    'slovakia': {
        'url': 'https://poliwave.com/sk/ep/elections/2024',
        'regions': {
            'BAK': 'bratislava', 'BBK': 'banskabystrica', 'KEK': 'kosice',
            'NRK': 'nitra', 'POK': 'presov', 'TNK': 'trencin',
            'TTK': 'trnava', 'ZAK': 'zilina',
        },
        'parties': {
            'SK24L18': 'smer', 'SK24L21': 'ps', 'SK24L23': 'hlas',
            'SK24L04': 'aliancia', 'SK24L19': 'kdh', 'SK24L20': 'sas',
            'SK24L03': 'demokrati', 'SK24L10': 'sns', 'SK24L22': 'slovensko',
            'SK24L14': 'lsns', 'SK24L17': 'ku',
        },
    },
    'spain': {
        'url': 'https://poliwave.com/es/ep/elections/2024',
        'regions': {
            '01': 'alava', '02': 'albacete', '03': 'alicante',
            '04': 'almeria', '05': 'avila', '06': 'badajoz',
            '07': 'balears', '08': 'barcelona', '09': 'burgos',
            '10': 'caceres', '11': 'cadiz', '12': 'castellon',
            '13': 'ciudad_real', '14': 'cordoba', '15': 'coruna',
            '16': 'cuenca', '17': 'girona', '18': 'granada',
            '19': 'guadalajara', '20': 'gipuzkoa', '21': 'huelva',
            '22': 'huesca', '23': 'jaen', '24': 'leon', '25': 'lleida',
            '26': 'rioja', '27': 'lugo', '28': 'madrid', '29': 'malaga',
            '30': 'murcia', '31': 'navarra', '32': 'ourense',
            '33': 'asturias', '34': 'palencia', '35': 'palmas',
            '36': 'pontevedra', '37': 'salamanca', '38': 'tenerife',
            '39': 'cantabria', '40': 'segovia', '41': 'sevilla',
            '42': 'soria', '43': 'tarragona', '44': 'teruel',
            '45': 'toledo', '46': 'valencia', '47': 'valladolid',
            '48': 'bizkaia', '49': 'zamora', '50': 'zaragoza',
            '51': 'ceuta', '52': 'melilla',
        },
        'parties': {
            'PP': 'pp', 'PSOE': 'psoe', 'VOX': 'vox', 'SUMAR': 'sumar',
            'PODEMOS': 'podemos', 'SALF': 'salf', 'JUNTS': 'junts',
        },
    },
}


def fetch(url, cc, refresh):
    path = os.path.join(CACHE, 'epblend_%s.html' % cc)
    if os.path.exists(path) and not refresh:
        return open(path, encoding='utf8', errors='replace').read()
    try:
        import requests
        h = requests.get(url, headers={'User-Agent': UA}, timeout=60).text
        if 'rows:[{' not in h:
            raise RuntimeError('no rows')
    except Exception:
        h = subprocess.check_output(
            ['curl.exe', '-s', '-L', '--max-time', '60', '-A', UA, url],
            text=True, encoding='utf8', errors='replace')
    if 'rows:[{' not in h:
        raise SystemExit('%s: could not fetch %s' % (cc, url))
    os.makedirs(CACHE, exist_ok=True)
    open(path, 'w', encoding='utf8').write(h)
    return h


def ep_rows(h):
    seg = h[h.find('rows:[{'):]
    rows = []
    for ch in seg.split('{id:"')[1:]:
        rid = ch[:ch.find('"')]
        m = re.search(r'name:"((?:[^"\\]|\\.)*)"', ch)
        tv = re.search(r'total_votes:(\d+)', ch)
        cd = re.search(r'candidates:\[(.*?)\]', ch, re.S)
        if not (m and tv and cd):
            continue
        cand = re.findall(r'party:"([^"]+)"[^}]*?votes:(\d+)', cd.group(1))
        rows.append((rid, m.group(1), int(tv.group(1)),
                     {p: int(v) for p, v in cand}))
    return rows


def gebiete_keys(seg, cc):
    m = re.search(r'["\']?gebiete["\']?\s*:\s*\{', seg)
    i = m.end() - 1
    depth = 0
    j = i
    while j < len(seg):
        if seg[j] == '{':
            depth += 1
        elif seg[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    obj = seg[i:j + 1]
    # gebiete objects are JS: quote unquoted keys, drop trailing commas
    obj = re.sub(r'([{,])\s*([A-Za-z_][\w\-]*)\s*:', r'\1"\2":', obj)
    obj = re.sub(r',\s*([}\]])', r'\1', obj)
    return list(json.loads(obj).keys())


def build(cc, spec, seg, dry):
    keys = gebiete_keys(seg, cc)
    kset = set(keys)
    rows = ep_rows(fetch(spec['url'], cc, '--refresh' in sys.argv))
    agg = {}
    nat_v = {}
    nat_t = 0
    used = 0
    for rid, name, total, votes in rows:
        rmap = spec['regions']
        region = rmap(rid, name) if callable(rmap) else rmap.get(rid)
        if not region or region not in kset:
            continue
        used += 1
        nat_t += total
        for p, v in votes.items():
            cp = spec['parties'].get(p)
            if not cp:
                continue
            d = agg.setdefault(region, {})
            d[cp] = d.get(cp, 0) + v
            nat_v[cp] = nat_v.get(cp, 0) + v
    reg_out = {}
    totals = {}
    for rid, name, total, votes in rows:
        rmap = spec['regions']
        region = rmap(rid, name) if callable(rmap) else rmap.get(rid)
        if not region or region not in kset:
            continue
        totals[region] = totals.get(region, 0) + total
    for region in agg:
        reg_out[region] = {p: round(100.0 * v / totals[region], 2)
                           for p, v in agg[region].items()}
    missing = [k for k in keys if k not in reg_out]
    print('%s: regions %d/%d, parties %d, rows used %d%s'
          % (cc, len(reg_out), len(keys), len(nat_v), used,
             (' | missing: %s' % missing) if missing else ''))
    if dry:
        for region in list(reg_out)[:2]:
            print('   e.g. %s: %s' % (region, reg_out[region]))
        return None
    ep_nat = {p: round(100.0 * v / nat_t, 2) for p, v in nat_v.items()}
    return reg_out, ep_nat


def strip_old(t, cc):
    i = t.find('\n  %s: {' % cc)
    m = re.search(r'\n  \w+: \{', t[i + 10:])
    j = i + 10 + (m.start() if m else len(t))
    seg = t[i:j]
    for field in ('epBlend', 'epGebiete', 'epNational'):
        seg = re.sub(r'\n\s*%s\s*:[^\n]*' % field, '', seg)
    return t[:i] + seg + t[j:]


def main():
    dry = '--dry' in sys.argv
    path = os.path.join(ROOT, 'js', 'config.js')
    t = open(path, encoding='utf8').read()
    inserts = {}
    for cc in COUNTRIES:
        i = t.find('\n  %s: {' % cc)
        assert i > 0, cc
        m = re.search(r'\n  \w+: \{', t[i + 10:])
        seg = t[i:i + 10 + (m.start() if m else 300000)]
        out = build(cc, COUNTRIES[cc], seg, dry)
        if out:
            reg_out, ep_nat = out
            inserts[cc] = (json.dumps({'epBlend': BLEND, 'epGebiete': reg_out,
                                       'epNational': ep_nat},
                                      ensure_ascii=False, separators=(',', ':')))
    if dry:
        return
    for cc, blob in inserts.items():
        t = strip_old(t, cc)
        i = t.find('\n  %s: {' % cc)
        # the fields must live inside `map` (MAP_CONF returns c.map)
        mp = t.find('map', i)
        assert 0 < mp < i + 5000, (cc, 'map not found')
        brace = t.find('{', mp)
        fields = ''.join('\n      %s: %s,' % (k, json.dumps(v, ensure_ascii=False,
                                                           separators=(',', ':')))
                         for k, v in json.loads(blob).items())
        t = t[:brace + 1] + fields + t[brace + 1:]
    open(path, 'w', encoding='utf8', newline='').write(t)
    print('patched js/config.js for:', ', '.join(inserts))


if __name__ == '__main__':
    main()
