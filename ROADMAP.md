# Coverage roadmap

Reviewed 2026-10-10 (France presidential built 2026-10-11). Current coverage: 36 country models in the calendar
(Austria, BC, Brazil, Bulgaria + presidential, **Croatia**, Czechia,
Denmark, Estonia, Finland, France (+ presidential), Germany, Greece, Hungary, **Iceland**,
Israel, Italy, **Japan**, Latvia, **Lithuania**, Moldova, Netherlands,
**Norway**, New Zealand, Poland, Portugal, Quebec, Romania, Serbia,
**Slovenia**, Slovakia, **South Korea**, Spain, Sweden, UK)
plus three German states (Berlin, Mecklenburg-Vorpommern, Saxony-Anhalt)
and the separate US midterms page. Norway, Lithuania, Japan, South Korea,
Croatia, Iceland and Slovenia all have measured backtests now (T-0 seat
MAE: NO n/a, LT 2.18, JP 8.89 - the JP residual is the unmodellable
list-exhaustion forfeiture; KR 2.33; HR 0.67; IS 2.00; SI 2.89). KR, HR,
IS and SI reproduce the historical allocation through seats_run (KR
175/109/12/2/1/1 vs actual 175/108/12/3/1/1 - the semi-linked vs plain
D'Hondt delta; HR, IS and SI exactly).

Since the last review, several listed candidates are resolved: the
March 2026 German state elections and May 2026 Holyrood vote passed
(could still be added as result pages, low value), Slovenia's 2026
election was held on 22 March 2026 (next cycle 2030) and is now built,
and Lithuania / Japan / Norway / South Korea / Croatia / Iceland /
Slovenia were built.

Candidates below were re-verified on 2026-10-10 by checking the live
polling pages: "rows" is the polling table size (a proxy for data
sufficiency), the system notes map to the existing machinery.

## Next up

| # | Election | When | Polling (rows) | System | Reuses | Effort |
|---|----------|------|----------------|--------|--------|--------|
| 1 | ~~**Argentina** presidential~~ | ~~Oct 2027~~ | **shipped 2026-10-12** | national two-round, 24 districts | the France/Brazil presidential machinery | done |
| 2 | **Canada** federal | Oct 2029 (fixed) | ~400 (very rich) | FPTP, 343 ridings | the BC/QC riding builders + Elections Canada geodata | M model + L map (343 ridings) |
| 3 | **Mexico** midterms | Jun 2027 | ~35 (moderate) | 500 = 300 FPTP + 200 PR (5 regional lists) | the Japan winnerDistricts + prDistricts path | M-L (300 district geodata is the risk; states-level map fallback) |
| 4 | **France presidential** | Apr 2027 | very rich (dedicated page) | national two-round | the Brazil runoff machinery + the presidential page style (bgpres) as a new `frpres` key | M (no new map needed if national) |
| 5 | **Australia** federal | by May 2028 | ~350 (very rich) | preferential (IRV) FPTP | needs a TCP-based winner rule validated on 2025 | M-L (model is the risk, not data) |
| 6 | **Ireland** Dáil | by ~2030 | ~48 (moderate) | STV | no honest shortcut exists | L (defer) |
| 7 | **Ontario / Alberta** provincial | 2029 / 2027 | rich / moderate | FPTP ridings | the BC/QC riding builders | M each |

## Thin data - wait

- **Luxembourg** (8 Oct 2028): the system is easy (60 seats, 4
  constituencies, D'Hondt) but the article has no polling table >10 rows
  (Politmonitor ~quarterly). Revisit when the cycle thickens.
- **Taiwan** (Jan 2028): en-wiki has no polling tables (the 2028
  presidential article is a stub; "Next Taiwanese legislative election"
  exists). Rich data lives in zh.wiki/news - needs a different scraper
  family. Defer.
- **Turkey** (Jun 2028): no dedicated polling page (the "next" title
  redirects to the 2023 article). Data weaker than earlier assumed.
- **Switzerland** (Oct 2027): no polling page; panachage makes the
  poll-to-seat mapping ambiguous anyway.

## Deferred, with reasons

- **Malta, Ireland**: STV. No honest shortcut exists; an app that shows
  STV seats from a plurality-style model would misinform.
- **EU Parliament** (2029): 720 seats, 27 separate national PR systems in
  one page - a different product, not a country add.
- **Germany federal** (2029), **Poland** (2027), **Italy** (2027),
  **Greece** (2027): already covered; their "next election" polling pages
  are live and the daily scrapers keep them current.

## Model backlog

- **Base blend (recency-weighted previous election)** - shipped for
  **Portugal** (0.75 * 2025 + 0.25 * 2024), **Bulgaria** (0.75 * 2026 +
  0.25 * Oct 2024, official CEC opendata; the same rebuild replaced the
  bg base's 2021-pattern proxies with the real 2026 per-province shares),
  **France** (0.75 * 2022 + 0.25 * 2024 EP; ENS -> camp 60/40, PS-PP ->
  Glucksmann, who gained a real base) and the cheap batch
  **Iceland / Austria / Netherlands** (2024+2021, 2024+2019, 2025+2023).
  Backtest evidence (PT 2024 and 2025 cycles, seat-level, same T-0 votes
  per cycle): blending never hurt and helped by 0.2-0.75 seat MAE in 3 of
  4 arms; 0.75 was never worse. Test-first tier verdicts: **Germany**
  rejected - projecting the 2025 per-state winners (the only thing the
  state gebiete drive there; the seat allocation is national) gives 15/16
  for the pure 2021 base vs 14/16 for the 2021+2017 blends (the 2017
  CDU-dominance drags Hamburg/Mecklenburg-Vorpommern/Saxony-Anhalt
  wrong). **Italy parked**: the 2018 per-region table is not on
  en.wikipedia (the Interior Ministry scraper would be needed) and the
  region gebiete only drive the region map - the same class where the
  German test came back negative. UK stays parked: notional 2017 on the
  2024 boundaries does not exist publicly, so the FPTP blend can't be
  tested cheaply. Do not add blanket - stable systems
  (DK/FI/NO/CH/SE/IE/ES) stay last-election-only.

## Add-a-country checklist (the four-build distillation)

1. `python scraper/scaffold.py <cc> <Name> --seats N --method M` - creates
   the data skeleton and prints the config block. The `blocs` block is
   mandatory even for countries that hide it: the forecast sim reads
   `BLOCS.bloc1.parties` directly and crashes without it.
2. Scraper: copy the newest scraper of the same table family
   (`scrape_moldova.py` for colspan-heavy tables, `scrape_denmark.py` for
   multi-row headers, `scrape_japan.py` for heading-year tables and
   section scoping). The grid expander in `backtest.py` (rowspan AND
   colspan) is the reference implementation.
3. Config block: paste where the country fits the file's order. Party
   colors come from the wiki module (`sync_party_colors.py`), with
   OVERRIDES for module-name mismatches.
4. Audit: add the country to `REF` in `scraper/audit.py` (seats,
   threshold, method, constituencies flag). Run `python scraper/release.py`
   - it bumps the token, mirrors `site/`, reports colour drift and fails
   on schema problems.
5. Map: the Commons election-results SVG (Japan/Italy pattern: remap
   `data-name` labels, filter degenerate rings, pre-flip y) beats
   geoBoundaries when the electoral map differs from the administrative
   one. Store per-district baselines under the map block; keep
   `seatDistricts` summing to `seats` minus `reservedSeats`.
6. Validate before shipping: historical result through
   `scraper/seats_run.js` must reproduce the actual allocation (Finland
   2023 exact, BC 2024 exact, Lithuania PR exact, Japan districts exact
   with the FPTP anchor). Add a cycle to `scraper/backtest.py` (article +
   cols + result + seats; use `section` scoping for multi-table pages).
7. `python scraper/check_data.py --update` to seed the health baseline,
   then `python scraper/build_summary.py` for the calendar.
8. CI: add the scraper to the "Scrape polls" step in
   `.github/workflows/update.yml`.
