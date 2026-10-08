# Coverage roadmap

Current coverage: 24 countries in the calendar (Austria, BC, Brazil, Bulgaria
+ presidential, Czechia, Denmark, Estonia, Finland, Germany, Greece, Hungary,
Israel, Italy, Moldova, Netherlands, New Zealand, Poland, Portugal, Romania,
Serbia, Slovakia, Spain, UK), plus hidden pages reachable by URL (Sweden,
Latvia, Quebec, France as map-only), four German states (Berlin,
Mecklenburg-Vorpommern, Saxony-Anhalt and the machinery behind them) and the
separate US midterms page.

Candidates are ranked by proximity x data availability x effort. "Effort"
assumes the established pipeline: `scraper/scaffold.py` skeleton, a scraper on
the same Wikipedia article pattern, config block, audit entry, health baseline.

## Next up

| # | Election | When | System | Reuses | Effort |
|---|----------|------|--------|--------|--------|
| 1 | Baden-Wurttemberg state election | Mar 2026 | AMS-ish (70 FPTP + list, 5% threshold) | the existing German state machinery (Berlin/MV builders), state-swing noise already backtested on 114 Wahlkreise | S |
| 2 | Rhineland-Palatinate state election | Mar 2026 | same family (101 seats, 5%) | same as #1 | S |
| 3 | Scottish Parliament (Holyrood) | May 2026 | AMS: 73 FPTP + 56 list, leveling-style | the NZ model (sainte_lague_standard + overhang + electorate baselines) | M |
| 4 | Slovenia | 2026 (term ends April) | D'Hondt, 8 constituencies + 2 minority seats | reservedSeats hook (Romania/Denmark), per-district path | M |
| 5 | Norway | Sep 2029 | modified Sainte-Lague, 19 counties, 19 leveling seats | Denmark's national sainte_lague_standard + per-county seatDistricts (geoBoundaries NOR ADM1) | M |
| 6 | Croatia | 2028 | D'Hondt, 10 constituencies + diaspora | Poland's per-district path | M |
| 7 | Iceland | 2028 | D'Hondt, 6 constituencies + leveling | Norway playbook | M |
| 8 | Luxembourg | 2028 | D'Hondt, 4 constituencies | Poland playbook, small | S-M |
| 9 | Canada federal | 2029 | FPTP, 343 ridings | the BC/QC riding builders + Elections Canada data | L (map) |
| 10 | Argentina | 2027 | D'Hondt per province | Poland playbook, 24 provinces | M |

## Deferred, with reasons

- **Australia** (2028): instant-runoff (preferential) FPTP. The app's FPTP
  path is plurality - a preferential model needs per-riding preference flows
  or at least a two-candidate-preferred assumption; wrong model is worse than
  none. Revisit with a TCP-based winner rule and validate on 2025.
- **Malta, Ireland**: STV. No honest shortcut exists; an app that shows STV
  seats from a plurality-style model would misinform. Long-term project.
- **Lithuania** (2028): mixed 71 two-round FPTP + 70 PR - needs the runoff
  machinery generalised beyond presidential pages. M-L, after Scotland.
- **Japan** (2028), **South Korea** (2028): mixed FPTP+PR with complex
  dual-candidacy rules. L.
- **EU Parliament** (2029): 720 seats, 27 separate national PR systems in one
  page - a different product, not a country add.
- **Switzerland** (2027): panachage (voters split lists across parties) makes
  the poll-to-seat mapping genuinely ambiguous. M-L, needs care.
- **Turkey** (2028): national D'Hondt plus alliance-level pooling; data is
  available but the alliance rules need the Israel-style cartel machinery
  extended. M-L.

## Add-a-country checklist (the four-build distillation)

1. `python scraper/scaffold.py <cc> <Name> --seats N --method M` - creates
   the data skeleton and prints the config block. The `blocs` block is
   mandatory even for countries that hide it: the forecast sim reads
   `BLOCS.bloc1.parties` directly and crashes without it.
2. Scraper: copy the newest scraper of the same table family
   (`scrape_moldova.py` for colspan-heavy tables, `scrape_denmark.py` for
   multi-row headers). Wikipedia merges cells; the grid expander in
   `backtest.py` (rowspan AND colspan) is the reference implementation.
3. Config block: paste where the country fits the file's order. Party colors
   come from the article's rendered colour-swatch row (`sync_party_colors.py`
   checks it), never from module name matches alone.
4. Audit: add the country to `REF` in `scraper/audit.py` (seats, threshold,
   method, constituencies flag). Run `python scraper/release.py` - it bumps
   the token, mirrors `site/`, reports colour drift and fails on schema
   problems (missing blocs, undefined party codes, missing logos/data).
5. Map (optional but expected): geoBoundaries ADM1 first, official
   boundaries (dst.dk, DAGI, Elections Canada) when the administrative map
   does not match the electoral map. Store per-district baselines under the
   map block; keep `seatDistricts` summing to `seats` minus `reservedSeats`.
6. Validate before shipping: historical result through `scraper/seats_run.js`
   must reproduce the actual allocation (Finland 2023 exact, BC 2024 exact,
   Romania within 1 seat are the benchmarks). Add a cycle to
   `scraper/backtest.py` when per-district actuals exist.
7. `python scraper/check_data.py --update` to seed the health baseline, then
   `python scraper/build_summary.py` for the calendar.
8. CI: add the scraper to the "Scrape polls" step in
   `.github/workflows/update.yml`.
