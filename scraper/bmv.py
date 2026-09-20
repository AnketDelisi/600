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


def scoped_bundle(slug, country_key, root_id, cache):
    """Concatenate config+parliaments+app into ONE IIFE scoped to a column.

    Scoping is root-based (no id prefixes): the app's dynamically-created
    elements (sidebar-content, filter-days, ...) keep their original ids and
    resolve inside each column's root via BMV_ROOT.querySelector('#id')."""
    config = read(os.path.join(ROOT, "js", "config.js"))
    parl = read(os.path.join(ROOT, "js", "parliaments.js"))
    app = read(os.path.join(ROOT, "js", "app.js"))

    # scope the $ helper and id/class lookups to this column's root
    app = app.replace(
        "const $=s=>document.getElementById(s);",
        "const $=s=>BMV_ROOT.querySelector('#'+s);")
    app = app.replace("document.getElementById('segnav')",
                      "BMV_ROOT.querySelector('#segnav')")
    app = app.replace("document.getElementById('pane-'+tabId)",
                      "BMV_ROOT.querySelector('#pane-'+tabId)")
    app = app.replace("document.getElementById('pane-polls')",
                      "BMV_ROOT.querySelector('#pane-polls')")
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
        "var BMV_ROOT=document.getElementById(" + repr(root_id) + ");\n"
        "window.__600_COUNTRY__=" + repr(country_key) + ";\n"
        "window.__600_LOCAL_ASSETS__=true;\n"
        + config + "\n" + parl + "\n" + app + "\n"
        # registry: filter changes (onchange="window._600.applyFilters()")
        # re-render BOTH columns, not just the last-loaded instance
        "var __api=window._600;\n"
        "window.__600_BMV__=window.__600_BMV__||[];\n"
        "if(__api&&__api.applyFilters)window.__600_BMV__.push(__api);\n"
        "window._600={applyFilters:function(){"
        "(window.__600_BMV__||[]).forEach(function(a){try{a.applyFilters()}catch(e){}});"
        "}};\n"
        "})();\n"
    )
    dest = os.path.join(BMV, "js", "instance-" + slug + ".js")
    js_dir = os.path.dirname(dest)
    if not os.path.isdir(js_dir):
        os.makedirs(js_dir)
    write(dest, bundle)
    return dest


def column_markup(slug, name, chamber):
    """One native column, mirroring the main site's real structure exactly
    (app-shell > main-col > segnav + tab-panes, unprefixed ids). The inner
    segnav is visually suppressed; the shell's ONE global tab bar drives both
    columns via the app's existing document-level click delegation."""
    return f"""
    <div class="bmv-col" id="bmv-{slug}">
      <div class="bmv-col-head">
        <span class="bmv-col-bar"></span>
        <span class="bmv-col-name">{name}</span>
        <span class="bmv-col-chamber">{chamber} · 20 Sep 2026</span>
      </div>
      <div class="app-shell">
        <main class="main-col" id="main">
          <div class="seg-nav" id="segnav">
            <button class="tab-trigger" data-tab="polls" data-active="true">POLLS</button>
            <button class="tab-trigger" data-tab="forecast">FORECAST</button>
            <button class="tab-trigger" data-tab="history">HISTORY</button>
            <button class="tab-trigger" data-tab="live">LIVE</button>
            <button class="tab-trigger" data-tab="methodology">METHODOLOGY</button>
          </div>
          <div class="tab-pane active" id="pane-polls"></div>
          <div class="tab-pane" id="pane-forecast" style="display:none"></div>
          <div class="tab-pane" id="pane-history" style="display:none"></div>
          <div class="tab-pane" id="pane-live" style="display:none"></div>
          <div class="tab-pane" id="pane-methodology" style="display:none"></div>
        </main>
      </div>
    </div>
"""


def build_shell(cache):
    cols = "".join(
        column_markup(slug, name, chamber)
        for slug, key, name, chamber in COUNTRIES)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AltıCiftSıfır — B&MV: Berlin + Mecklenburg-Vorpommern (live)</title>
  <link rel="icon" type="image/svg+xml" href="img/600logo.svg">
  <link rel="stylesheet" href="css/style.css?{cache}">
  <script>window.__600_LOCAL_ASSETS__=true;</script>
</head>
<body>
  <div class="app-shell" id="app">
    <main class="main-col" id="main">
      <div class="seg-nav" id="bmv-segnav">
        <img src="img/600logo2.svg" alt="AltıCiftSıfır" class="nav-logo">
        <button class="tab-trigger" data-tab="polls" data-active="true">POLLS</button>
        <button class="tab-trigger" data-tab="forecast">FORECAST</button>
        <button class="tab-trigger" data-tab="history">HISTORY</button>
        <button class="tab-trigger" data-tab="live">LIVE</button>
        <button class="tab-trigger" data-tab="methodology">METHODOLOGY</button>
        <div class="segnav-right">
          <a class="tab-social tab-social-accent" href="../" title="Main site">MAIN</a>
        </div>
      </div>
      <div class="bmv-title">
        <div class="bmv-title-main">B&MV — 20 SEPTEMBER</div>
        <div class="bmv-title-sub">Berlin + Mecklenburg-Vorpommern · live election results</div>
      </div>
      <div class="bmv-cols">{cols}
      </div>
      <div class="bmv-footer">
        <span class="bmv-visits">Visits: <b id="bmv-visit-count">—</b></span>
      </div>
    </main>
  </div>
  <script>
    /* visual active state for the ONE global tab bar; the actual tab
       switching is handled by each column's own document-level click
       delegation (both listen to the same .tab-trigger clicks) */
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
  <script>
    /* visit counter: our Cloudflare worker when deployed, else Tallywire */
    (function(){{
      var el=document.getElementById('bmv-visit-count');
      if(!el) return;
      var shown=0;
      var hit=function(url,key){{
        fetch(url).then(function(r){{return r.json()}}).then(function(d){{
          var v=d&&(d.value!=null?d.value:(d.count!=null?d.count:null));
          if(v==null||shown) return;
          shown=1;
          el.textContent=Number(v).toLocaleString();
        }}).catch(function(){{}});
      }};
      hit('https://600-election-night.600-live.workers.dev/counter/bmv');
      setTimeout(function(){{
        if(!shown) hit('https://tallywire.cronpulse.workers.dev/hit/anketdelisi/600-bmv');
      }},800);
    }})();
  </script>
  <style>
    /* page identity row (between the global nav and the split) */
    .bmv-title{{text-align:center;margin:18px 0 14px}}
    .bmv-title-main{{font-size:17px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--c-text-main)}}
    .bmv-title-sub{{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--c-text-muted);margin-top:4px}}
    /* two framed panels, equal height */
    .bmv-cols{{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch;margin-top:6px}}
    .bmv-col{{min-width:0;background:var(--c-surface);border:2px solid var(--c-edge);
      border-radius:var(--radius);box-shadow:var(--shadow-md);padding:12px 14px 18px}}
    .bmv-col .app-shell{{min-height:0}}
    /* kicker-style column label (accent bar + uppercase), mirrors .sb-kicker */
    .bmv-col-head{{display:flex;align-items:center;gap:8px;padding:4px 2px 8px;margin-bottom:10px;border-bottom:2px solid var(--c-edge)}}
    .bmv-col-bar{{width:6px;height:15px;background:var(--c-accent);border-radius:2px;flex-shrink:0}}
    .bmv-col-name{{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1.2px}}
    .bmv-col-chamber{{color:var(--c-text-muted);font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;margin-left:auto}}
    /* inner per-column segnavs are redundant — the one global bar drives both */
    .bmv-col .seg-nav{{display:none}}
    /* tighter side card inside the half-width panels so charts/tables breathe */
    .bmv-col .page-top{{grid-template-columns:270px minmax(0,1fr);gap:14px}}
    .bmv-col .side-card{{overflow-y:auto}}
    @media (max-width:1280px){{.bmv-col .page-top{{grid-template-columns:230px minmax(0,1fr)}}}}
    @media (max-width:1180px){{.bmv-cols{{grid-template-columns:1fr}}.bmv-col .page-top{{grid-template-columns:320px minmax(0,1fr)}}}}
    .bmv-footer{{display:flex;justify-content:center;margin-top:16px;padding:10px 0 4px;border-top:2px solid var(--c-edge)}}
    .bmv-visits{{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--c-text-muted)}}
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
    for slug, key, name, chamber in COUNTRIES:
        dest = scoped_bundle(slug, key, "bmv-" + slug, cache)
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