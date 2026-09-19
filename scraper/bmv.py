"""Build /bmv/ (repo root): Berlin + Mecklenburg-Vorpommern live election-night
pages (2026-09-20, same day) shown side by side.

Creates self-contained pinned pages (own js/css/img + the country's data) under
bmv/{berlin,mv}/ plus a shell bmv/index.html embedding both as
side-by-side iframes. LIVE tab reads the 600-live worker (live.json is the
static fallback), polls/forecast read the copied data.

Usage:
  python bmv.py
"""
import io, json, os, shutil, subprocess

ROOT = r"C:\Users\deneme\Desktop\600"
SITE = os.path.join(ROOT, "site")
BMV = os.path.join(ROOT, "bmv")
COUNTRIES = [("berlin", "Berlin"), ("mv", "Mecklenburg-Vorpommern")]
COUNTRY_KEY = {"berlin": "berlin", "mv": "mecklenburg_vorpommern"}

def git_head():
    try:
        r = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"],
                           capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return "unknown"

def build_pinned(slug, country_key, name, dest):
    data_src = os.path.join(ROOT, "data", country_key)
    if not os.path.isdir(data_src):
        raise SystemExit("no data dir for country %r" % country_key)
    if os.path.isdir(dest):
        shutil.rmtree(dest)
    os.makedirs(dest)
    for item in ["js", "css", "img", "fonts"]:
        s = os.path.join(SITE, item)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(dest, item))
    shutil.copytree(data_src, os.path.join(dest, "data", country_key))
    cache = "v=" + git_head()
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AltıCiftSıfır — {name} (live)</title>
  <link rel="icon" type="image/svg+xml" href="img/600logo.svg">
  <link rel="stylesheet" href="css/style.css?{cache}">
  <script>window.__600_COUNTRY__='{country_key}';window.__600_LOCAL_ASSETS__=true;</script>
</head>
<body>
  <div class="app-shell" id="app">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <img src="img/600logo.svg" alt="AltıCiftSıfır">
      </div>
      <div id="sidebar-content"></div>
    </aside>
    <main class="main-col" id="main">
      <div class="seg-nav" id="segnav">
        <button class="tab-trigger" data-tab="polls">POLLS</button>
        <button class="tab-trigger" data-tab="forecast">FORECAST</button>
        <button class="tab-trigger" data-tab="history">HISTORY</button>
        <button class="tab-trigger" data-tab="live" data-active="true">LIVE</button>
        <button class="tab-trigger" data-tab="methodology">METHODOLOGY</button>
        <div class="segnav-right">
          <a class="tab-social" href="../" title="BMV split view">BMV</a>
          <a class="tab-social" href="../../" title="Main site">MAIN</a>
        </div>
      </div>
      <div class="tab-pane" id="pane-polls" style="display:none"></div>
      <div class="tab-pane" id="pane-forecast" style="display:none"></div>
      <div class="tab-pane" id="pane-history" style="display:none"></div>
      <div class="tab-pane active" id="pane-live"></div>
      <div class="tab-pane" id="pane-methodology" style="display:none"></div>
    </main>
  </div>
  <script src="js/config.js?{cache}"></script>
  <script src="js/parliaments.js?{cache}"></script>
  <script src="js/app.js?{cache}"></script>
</body>
</html>
"""
    io.open(os.path.join(dest, "index.html"), "w", encoding="utf8").write(html)

def build_shell():
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AltıCiftSıfır — Berlin + Mecklenburg-Vorpommern (live)</title>
  <link rel="icon" type="image/svg+xml" href="../img/600logo.svg">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <div class="app-shell" id="app">
    <main class="main-col" id="main" style="max-width:1400px;margin:0 auto;padding:16px">
      <div class="hero fc-hero" style="margin-bottom:12px">
        <div class="hero-title">BMV — 20 SEPTEMBER</div>
        <div class="hero-date">Berlin &amp; Mecklenburg-Vorpommern · live election results</div>
      </div>
      <div class="bmv-grid">
        <iframe src="berlin/" title="Berlin live results" loading="lazy"></iframe>
        <iframe src="mv/" title="Mecklenburg-Vorpommern live results" loading="lazy"></iframe>
      </div>
    </main>
  </div>
  <style>
    .bmv-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .bmv-grid iframe{width:100%;height:92vh;border:2px solid var(--c-edge);background:var(--c-surface);box-shadow:var(--shadow-md)}
    @media (max-width:980px){.bmv-grid{grid-template-columns:1fr}.bmv-grid iframe{height:88vh}}
  </style>
</body>
</html>
"""
    io.open(os.path.join(BMV, "index.html"), "w", encoding="utf8").write(html)

def main():
    if os.path.isdir(BMV):
        shutil.rmtree(BMV)
    os.makedirs(BMV)
    for slug, name in COUNTRIES:
        build_pinned(slug, COUNTRY_KEY[slug], name, os.path.join(BMV, slug))
        print("built", slug, "->", os.path.join(BMV, slug), flush=True)
    build_shell()
    print("built shell ->", os.path.join(BMV, "index.html"), flush=True)

if __name__ == "__main__":
    main()