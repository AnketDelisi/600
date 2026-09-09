# 600 — Global Poll Aggregator & Election Forecast

## Architecture

- **Scraper** (Python, GitHub Actions): fetches polls → commits JSON to `data/`
- **Static site** (HTML/JS): reads `data/*.json`, renders charts & forecasts
- **GitHub Pages** serves from `stable` branch
