"""Snapshot a country's site into site/archive/<slug>/ as a self-contained
static snapshot (own js/css/img + the country's data), pinned to a country.

Usage:
  python snapshot.py <slug> <country> [--note "text"]

The archive is fully standalone: it carries its own JS/CSS/images/data, so
future site changes never break it. It is served at /600/archive/<slug>/.
snapshot.json records date/commit/note. archive/index.html is a manifest of
all snapshots (regenerated on every run).
"""
import argparse, io, json, os, shutil, subprocess, datetime

ROOT = r"C:\Users\deneme\Desktop\600"
SITE = os.path.join(ROOT, "site")
ARCHIVE = os.path.join(SITE, "archive")
COUNTRY_NAME = {
    "sweden": "Sweden", "israel": "Israel", "saxony_anhalt": "Saxony-Anhalt",
    "mecklenburg_vorpommern": "Mecklenburg-Vorpommern", "berlin": "Berlin",
}

def git_head():
    try:
        r = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"],
                           capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return "unknown"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("country")
    ap.add_argument("--note", default="")
    args = ap.parse_args()

    data_src = os.path.join(ROOT, "data", args.country)
    if not os.path.isdir(data_src):
        raise SystemExit("no data dir for country %r" % args.country)

    dest = os.path.join(ARCHIVE, args.slug)
    if os.path.isdir(dest):
        shutil.rmtree(dest)
    os.makedirs(dest)

    # copy shared assets (self-contained snapshot)
    for item in ["js", "css", "img"]:
        s = os.path.join(SITE, item)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(dest, item))

    # copy the country's data
    shutil.copytree(data_src, os.path.join(dest, "data", args.country))

    # election date from meta.json
    election = None
    try:
        meta = json.load(io.open(os.path.join(data_src, "meta.json"), encoding="utf8"))
        election = meta.get("election_date")
    except Exception:
        pass

    # pinned wrapper with local asset paths
    commit = git_head()
    cache = "v=" + commit
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AltıCiftSıfır — {COUNTRY_NAME.get(args.country, args.country)} (archive: {args.slug})</title>
  <link rel="icon" type="image/svg+xml" href="img/600logo.svg">
  <link rel="stylesheet" href="css/style.css?{cache}">
  <script>window.__600_COUNTRY__='{args.country}';window.__600_LOCAL_ASSETS__=true;</script>
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
        <button class="tab-trigger" data-tab="polls" data-active="true">POLLS</button>
        <button class="tab-trigger" data-tab="forecast">FORECAST</button>
        <button class="tab-trigger" data-tab="history">HISTORY</button>
        <button class="tab-trigger" data-tab="live">LIVE</button>
        <button class="tab-trigger" data-tab="methodology">METHODOLOGY</button>
        <a class="tab-social" href="../" title="Archive index">ARCHIVE</a>
        <a class="tab-social" href="../../" title="Main site">MAIN</a>
      </div>
      <div class="tab-pane active" id="pane-polls"></div>
      <div class="tab-pane" id="pane-forecast" style="display:none"></div>
      <div class="tab-pane" id="pane-history" style="display:none"></div>
      <div class="tab-pane" id="pane-live" style="display:none"></div>
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

    snap = {
        "slug": args.slug,
        "country": args.country,
        "country_name": COUNTRY_NAME.get(args.country, args.country),
        "date": datetime.date.today().isoformat(),
        "commit": commit,
        "election": election,
        "note": args.note,
    }
    io.open(os.path.join(dest, "snapshot.json"), "w", encoding="utf8").write(
        json.dumps(snap, ensure_ascii=False, indent=1))

    rebuild_manifest()
    print("archived", args.slug, "->", dest, flush=True)

def rebuild_manifest():
    if not os.path.isdir(ARCHIVE):
        return
    rows = []
    for d in sorted(os.listdir(ARCHIVE)):
        sp = os.path.join(ARCHIVE, d, "snapshot.json")
        if not os.path.isfile(sp):
            continue
        try:
            s = json.load(io.open(sp, encoding="utf8"))
        except Exception:
            continue
        rows.append((s.get("date", ""), s.get("slug", d), s.get("country_name", ""),
                     s.get("election", ""), s.get("note", "")))
    rows.sort(reverse=True)
    cards = "\n".join(
        f'<a class="arc-card" href="{slug}/"><div class="arc-name">{name}</div>'
        f'<div class="arc-meta">{date} · election {election or "?"}</div>'
        f'<div class="arc-note">{note}</div></a>'
        for date, slug, name, election, note in rows)
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AltıCiftSıfır — Archive</title>
  <link rel="icon" type="image/svg+xml" href="../img/600logo.svg">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <div class="app-shell" id="app">
    <main class="main-col" id="main" style="max-width:860px;margin:0 auto;padding:24px">
      <div class="hero fc-hero" style="margin-bottom:16px">
        <div class="hero-title">ARCHIVE</div>
        <div class="hero-date">Frozen snapshots of forecast models and election-night pages</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
        %CARDS%
      </div>
    </main>
  </div>
  <style>
    .arc-card{background:var(--c-surface);border:2px solid var(--c-edge);box-shadow:var(--shadow-md);padding:14px 16px;text-decoration:none;color:var(--c-text-main)}
    .arc-card:hover{border-color:var(--c-accent)}
    .arc-name{font-weight:900;font-size:13px;letter-spacing:0.5px;text-transform:uppercase}
    .arc-meta{font-size:11px;color:var(--c-text-muted);margin-top:4px;font-family:var(--font-mono)}
    .arc-note{font-size:11px;color:var(--c-text-muted);margin-top:6px}
  </style>
</body>
</html>
""".replace("%CARDS%", cards)
    io.open(os.path.join(ARCHIVE, "index.html"), "w", encoding="utf8").write(html)

if __name__ == "__main__":
    main()