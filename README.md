# 600 — Global Poll Aggregator & Election Forecast

Inspired by FiveThirtyEight, built for the world.

Starting with Sweden (Riksdag 2026), expanding to Brazil, Israel, United States, and New Zealand.

## Architecture

- **Scraper** (Python, GitHub Actions): fetches polls → commits JSON to `data/`
- **Static site** (HTML/JS): reads `data/*.json`, renders charts & forecasts
- **GitHub Pages** serves from `stable` branch

## Countries

| Country | System | Threshold | Next Election |
|---------|--------|-----------|---------------|
| Sweden | PR + leveling seats | 4% | Sep 2026 |
| Brazil | PR + presidential runoff | — | Oct 2026 |
| Israel | PR (single district) | 3.25% | TBD |
| US | FPTP + Electoral College | — | Nov 2028 |
| New Zealand | MMP | 5% | TBD |
