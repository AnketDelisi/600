#!/usr/bin/env python3
"""Fill the pollsterMAE tables for the countries that have backtest cycles.

Methodology matches scraper/backtest_mae.py: for each pollster, take its
last 5 polls before the cycle's election (>=2 required) and average the
mean absolute error over the cycle's official-result party set (missing
values count as 0). The entry key is the country's configured maeKey
(the label the app looks up) plus 'overall' (the archive/fallback key).

Only countries whose pollsterMAE is empty and that have a cycle in
scraper/backtest.py are touched; countries without a cycle keep the empty
table (uniform weights - an honest default).

Usage: python scraper/build_pollster_mae.py [--dry]
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scraper'))
import backtest

CONFIG = ROOT / 'js' / 'config.js'
# pt is excluded: its 2024 cycle article's AD column cannot be parsed by
# parse_cycle (see the CYCLES spec note), so every poll would be scored
# against AD's 28.8% with a missing value and the MAEs (4.4-5.9) would be
# artifacts rather than pollster accuracy.
FILL = ['uk', 'spain', 'bc', 'qc', 'nz', 'germany', 'lt', 'jp',
        'kr', 'hr', 'is', 'si']


def pollster_maes(cc):
    cycles = backtest.CYCLES[cc]
    year = max(cycles)
    spec = cycles[year]
    spec.setdefault('prev', '1900-01-01')
    polls = backtest.parse_cycle(backtest.fetch(spec['article'], False), spec)
    result = spec.get('result') or {}
    parties = list(result)
    assert parties, f'{cc}: no result party set'
    by_p = {}
    for p in polls:
        by_p.setdefault(p['pollster'], []).append(p)
    out = {}
    for ps, pl in by_p.items():
        last5 = sorted(pl, key=lambda x: x['date'], reverse=True)[:5]
        if len(last5) < 2:
            continue
        maes = []
        for p in last5:
            errs = [abs((p['votes'].get(k) or 0.0) - result[k])
                    for k in parties]
            maes.append(sum(errs) / len(errs))
        out[ps] = round(sum(maes) / len(maes), 2)
    return year, out


def main():
    dry = '--dry' in sys.argv
    text = CONFIG.read_text(encoding='utf8')
    for cc in FILL:
        i = text.find('\n  %s: {' % cc)
        assert i >= 0, f'{cc} block not found'
        depth, j = 0, i
        while j < len(text):
            if text[j] == '{':
                depth += 1
            elif text[j] == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        seg = text[i:j]
        mk = re.search(r"maeKey:\s*'([^']+)'", seg)
        assert mk, f'{cc}: maeKey not found'
        key = mk.group(1)
        pm = re.search(r'pollsterMAE:\s*\{', seg)
        assert pm, f'{cc}: pollsterMAE key not found'
        # existing table bounds (brace matching from the opening {)
        depth, k = 0, pm.end() - 1
        while k < len(seg):
            if seg[k] == '{':
                depth += 1
            elif seg[k] == '}':
                depth -= 1
                if depth == 0:
                    break
            k += 1
        body = seg[pm.end():k]
        if body.strip():
            print(f'{cc}: table not empty, skipped')
            continue
        year, maes = pollster_maes(cc)
        if not maes:
            print(f'{cc}: no pollster with >=2 polls, skipped')
            continue
        lines = ',\n'.join(
            f'      {json.dumps(ps, ensure_ascii=False)}: '
            f'{{ {key}: {v}, overall: {v} }}'
            for ps, v in sorted(maes.items()))
        new = 'pollsterMAE: {\n%s\n    }' % lines
        seg2 = seg[:pm.start()] + new + seg[k + 1:]
        text = text[:i] + seg2 + text[j:]
        j = i + len(seg2)          # keep later offsets consistent
        print(f'{cc}: cycle {year}, {len(maes)} pollsters, key {key} '
              f'| best {min(maes.values())} worst {max(maes.values())}')
    if dry:
        print('(dry run, not written)')
        return
    CONFIG.write_text(text, encoding='utf8', newline='')
    print('patched config.js')


if __name__ == '__main__':
    main()
