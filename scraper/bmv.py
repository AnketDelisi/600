"""Build /bmv/ (repo root): ONE true single-page app for Berlin + Mecklenburg-
Vorpommern (2026-09-20, same day), Korean/Byun look matching the main site.

No iframes, no postMessage. The page renders the shared app TWICE in one
document — two scoped bundles (config+parliaments+app wrapped in an IIFE with
BMV_ROOT/BMV_PID scoping) drive two native side-by-side columns. ONE global
tab bar drives both columns via the app's existing document-level click
delegation (both instances listen; each switches its own panes).

Root js/config.js, js/parliaments.js and js/app.js are sources of truth and
stay untouched. Output lives entirely under bmv/.

Usage:
  python bmv.py
"""
import io, os, re, shutil, subprocess

ROOT = r"C:\Users\deneme\Desktop\600"
BMV = os.path.join(ROOT, "bmv")
SITE = os.path.join(ROOT, "site")

COUNTRIES = [
    ("berlin", "berlin", "Berlin", "Abgeordnetenhaus"),
    ("mv", "mecklenburg_vorpommern", "Mecklenburg-Vorpommern", "Landtag"),
]
# slug, data key (COUNTRIES key in config.js + data dir), label, chamber


def git_head():
    try:
        r = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"],
                           capture_output=True, text=True, timeout=10)
        return r.stdout.strip()
    except Exception:
        return "unknown"


def read(path):
    with io.open(path, "r", encoding="utf8") as f:
        return f.read()


def write(path, text):
    with io.open(path, "w", encoding="utf8", newline="\n") as f:
        f.write(text)


def scoped_bundle(slug, pid, country_key, root_id, cache):
    """Concatenate config+parliaments+app into ONE IIFE scoped to a column."""
    config = read(os.path.join(ROOT, "js", "config.js"))
    parl = read(os.path.join(ROOT, "js", "parliaments.js"))
    app = read(os.path.join(ROOT, "js", "app.js"))

    # scope the $ helper and class-based lookups to this column's root
    app = app.replace(
        "const $=s=>document.getElementById(s);",
        "const $=s=>BMV_ROOT.querySelector('#'+BMV_PID+s);")
    app = app.replace("document.getElementById('segnav')",
                      "BMV_ROOT.querySelector('#'+BMV_PID+'segnav')")
    app = app.replace("document.getElementById('pane-'+tabId)",
                      "BMV_ROOT.querySelector('#'+BMV_PID+'pane-'+tabId)")
    app = app.replace("document.getElementById('pane-polls')",
                      "BMV_ROOT.querySelector('#'+BMV_PID+'pane-polls')")
    # every class-based query goes through the column root; the global
    # document.* sites (script[src*=app.js], meta[data-social], selector var)
    # are left alone by the negative lookahead.
    app = re.sub(
        r"document\.querySelector(All)?\('(?!(script|meta))",
        r"BMV_ROOT.querySelector\1('", app)
    # pinned mode: hide the sidebar country selector, keep the legend
    app = app.replace(
        "const isPinnedCountry=()=>!!(typeof window!=='undefined'&&window.__600_COUNTRY__);",
        "const isPinnedCountry=()=>true;")

    bundle = (
        "(function(){\n"
        "'use strict';\n"
        "var BMV_PID=" + repr(pid + "-") + ";\n"
        "var BMV_ROOT=document.getElementById(" + repr(root_id) + ");\n"
        "window.__600_COUNTRY__=" + repr(country_key) + ";\n"
        "window.__600_LOCAL_ASSETS__=true;\n"
        + config + "\n" + parl + "\n" + app + "\n"
        "})();\n"
    )
    dest = os.path.join(BMV, "js", "instance-" + slug + ".js")
    js_dir = os.path.dirname(dest)
    if not os.path.isdir(js_dir):
        os.makedirs(js_dir)
    write(dest, bundle)
    return dest


def column_markup(slug, pid, country_key, name, chamber, cache):
    """One native column: app-shell with prefixed ids (inner segnav kept but
    visually suppressed by CSS; the global tab bar drives both columns)."""
    return f"""
    <div class="bmv-col" id="bmv-{slug}">
      <div class="bmv-col-head">
        <span class="bmv-col-name">{name}</span>
        <span class="bmv-col-chamber">{chamber} · 20 Sep 2026</span>
      </div>
      <div class="app-shell">
        <aside class="sidebar" id="{pid}-sidebar">
          <div class="sidebar-logo">
            <img src="img/600logo.svg" alt="AltıCiftSıfır">
          </div>
          <div id="{pid}-sidebar-content"></div>
        </aside>
        <main class="main-col" id="{pid}-main">
          <div class="seg-nav" id="{pid}-segnav">
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
          <div class="tab-pane" id="{pid}-pane-polls" style="display:none"></div>
          <div class="tab-pane" id="{pid}-pane-forecast" style="display:none"></div>
          <div class="tab-pane" id="{pid}-pane-history" style="display:none"></div>
          <div class="tab-pane active" id="{pid}-pane-live"></div>
          <div class="tab-pane" id="{pid}-pane-methodology" style="display:none"></div>
        </main>
      </div>
    </div>
"""


def build_shell(cache):
    cols = "".join(
        column_markup(slug, slug, key, name, chamber, cache)
        for slug, key, name, chamber in COUNTRIES)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AltıCiftSıfır — BMV: Berlin + Mecklenburg-Vorpommern (live)</title>
  <link rel="icon" type="image/svg+xml" href="img/600logo.svg">
  <link rel="stylesheet" href="css/style.css?{cache}">
  <script>window.__600_LOCAL_ASSETS__=true;</script>
</head>
<body>
  <div class="app-shell" id="app">
    <main class="main-col" id="main">
      <div class="hero fc-hero">
        <img class="hero-logo" src="img/600logo.svg" alt="AltıCiftSıfır">
        <div class="hero-title">BMV — 20 SEPTEMBER</div>
        <div class="hero-date">Berlin + Mecklenburg-Vorpommern · live election results</div>
        <div class="seg-nav" id="bmv-segnav">
          <button class="tab-trigger" data-tab="polls">POLLS</button>
          <button class="tab-trigger" data-tab="forecast">FORECAST</button>
          <button class="tab-trigger" data-tab="history">HISTORY</button>
          <button class="tab-trigger" data-tab="live" data-active="true">LIVE</button>
          <button class="tab-trigger" data-tab="methodology">METHODOLOGY</button>
          <div class="segnav-right">
            <a class="tab-social tab-social-accent" href="../" title="Main site">MAIN</a>
          </div>
        </div>
      </div>
      <div class="bmv-cols">{cols}
      </div>
    </main>
  </div>
  <script>
    /* global tab bar visual state (switching itself is handled by each
       instance's own document-level tab-trigger delegation) */
    (function(){{
      var bar=document.getElementById('bmv-segnav');
      bar.addEventListener('click',function(ev){{
        var t=ev.target.closest('.tab-trigger'); if(!t) return;
        bar.querySelectorAll('.tab-trigger').forEach(function(b){{
          if(b===t) b.setAttribute('data-active','true'); else b.removeAttribute('data-active');
        }});
      }});
    }})();
  </script>
  <script src="js/instance-berlin.js?{cache}"></script>
  <script src="js/instance-mv.js?{cache}"></script>
  <style>
    .bmv-cols{{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}}
    .bmv-col{{min-width:0}}
    .bmv-col-head{{display:flex;align-items:baseline;gap:10px;padding:8px 14px;margin-bottom:10px;
      background:var(--c-surface);border:2px solid var(--c-edge);border-radius:var(--radius-sm);box-shadow:var(--shadow-md)}}
    .bmv-col-name{{font-weight:900;letter-spacing:.02em}}
    .bmv-col-chamber{{color:var(--c-text-muted);font-size:.85em}}
    /* inner per-column segnavs are redundant — the one global bar drives both */
    .bmv-col .seg-nav{{display:none}}
    /* columns keep the app's own sidebar (legend/notes) but tighter */
    .bmv-col .app-shell{{grid-template-columns:240px minmax(0,1fr);gap:12px}}
    @media (max-width:1080px){{.bmv-cols{{grid-template-columns:1fr}}.bmv-col .app-shell{{grid-template-columns:280px minmax(0,1fr)}}}}
    @media (max-width:640px){{.bmv-col .app-shell{{grid-template-columns:1fr}}}}
  </style>
</body>
</html>
"""
    write(os.path.join(BMV, "index.html"), html)


def copy_assets():
    for item in ["js", "css", "img", "fonts", "data"]:
        s = os.path.join(ROOT, item)
        d = os.path.join(BMV, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)


def main():
    if os.path.isdir(BMV):
        shutil.rmtree(BMV)
    os.makedirs(BMV)
    cache = "v=" + git_head()
    for slug, pid, key, name, chamber in (
            ("berlin", "berlin", "berlin", "Berlin", "Abgeordnetenhaus"),
            ("mv", "mv", "mecklenburg_vorpommern", "Mecklenburg-Vorpommern", "Landtag")):
        dest = scoped_bundle(slug, pid, key, "bmv-" + slug, cache)
        print("built", dest, flush=True)
    copy_assets()
    # data/ in bmv/ only needs the two countries; drop the rest
    data_dir = os.path.join(BMV, "data")
    for item in os.listdir(data_dir):
        if item not in ("berlin", "mecklenburg_vorpommern"):
            shutil.rmtree(os.path.join(data_dir, item))
    # drop mirrored site assets we don't need in the bundle (js only has the instances)
    for f in os.listdir(os.path.join(BMV, "js")):
        if f.startswith("instance-"):
            continue
        p = os.path.join(BMV, "js", f)
        if os.path.isfile(p):
            os.remove(p)
    build_shell(cache)
    print("built shell ->", os.path.join(BMV, "index.html"), flush=True)


if __name__ == "__main__":
    main()