# 600 — Global Poll Aggregator & Election Forecast

## Architecture

- **Scraper** (Python, GitHub Actions): fetches polls → commits JSON to `data/`
- **Static site** (HTML/JS): reads `data/*.json`, renders charts & forecasts
- **Live results** (`live/`): reads normalized snapshots from `data/live/`;
  `live-results.yml` refreshes them every five minutes on 24–27 October. The BC
  page adds a final-14-day poll tracker (all pollsters/methods) from `data/bc/`.
- **GitHub Pages** serves from `stable` branch
