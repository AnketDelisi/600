/* 600 — 2026 U.S. midterms renderer (538-style, sidebar-free)
 * Data: data/us/forecast.json produced by scraper/us_scrape_model.py
 *       data/us/geo.json  pre-projected USA SVG paths + per-state zoom boxes
 */
window.__errs = [];
window.addEventListener('error', e => window.__errs.push(String(e)));
window.addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason || e)));
function dataBase() {
  const s = document.querySelector('script[src*="us.js"]');
  if (s) {
    let src = s.getAttribute("src") || "";
    if (src.startsWith("./")) src = src.slice(2);
    const i = src.lastIndexOf("js/us.js");
    if (i > 0) return src.slice(0, i);
  }
  return "../";
}
const US_BASE = dataBase();
const US_DATA = US_BASE + "data/us/forecast.json?v=20260905af";
const US_GEO = US_BASE + "data/us/geo.json?v=20260905af";
const US_LABELS = {
  senate: "Senate",
  house: "House",
  governor: "Governors",
};

const state = {
  forecast: null,
  geo: null,
  chamber: "senate",
  sort: "close",
  zoom: null, // state index for House drill-down
};

const fmt = (x) => (Math.abs(x) >= 100 ? Math.round(x) : (x % 1 === 0 ? String(Math.round(x)) : x.toFixed(1)));

/* ---- color helpers (diverging blue/red by win chance) ---- */
const C_NEUT = "#E8ECF2", C_D = "#3B82C4", C_R = "#FC454C", C_GRAY = "#D7DEE8", C_TOSSUP = "#E8C978";
function mixColor(a, b, t) {
  const r1 = (a >> 16) & 255, g1 = (a >> 8) & 255, b1 = a & 255;
  const r2 = (b >> 16) & 255, g2 = (b >> 8) & 255, b2 = b & 255;
  const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}
function raceColor(dem, rating) {
  if (rating && /tossup/i.test(rating)) return C_TOSSUP;
  const t = (dem - 50) / 50; // -1..1
  if (t >= 0) return mixColor(parseInt(C_NEUT.slice(1), 16), parseInt(C_D.slice(1), 16), t);
  return mixColor(parseInt(C_NEUT.slice(1), 16), parseInt(C_R.slice(1), 16), -t);
}

function ratingClass(rating) {
  if (!rating) return "none";
  const w = rating.toLowerCase();
  if (w.includes("solid") || w.includes("safe")) {
    if (w.includes("d")) return "d";
    if (w.includes("r")) return "r";
  }
  if (w.includes("likely") || w.includes("lean") || w.includes("tilt")) {
    if (w.includes("d")) return "d";
    if (w.includes("r")) return "r";
  }
  if (w.includes("tossup")) return "t";
  return "t";
}

function partyBadge(party) {
  if (party === "D") return '<span class="party-badge D">D</span>';
  if (party === "R") return '<span class="party-badge R">R</span>';
  if (party === "I") return '<span class="party-badge I">IND</span>';
  return '<span class="party-badge open">OPEN</span>';
}

function raceKey(race) {
  return `${race.state}|${race.district || ""}|${race.incumbent || ""}`;
}

function raceRow(race) {
  const name = race.district ? `${race.state} ${race.district}` : race.state;
  const d = race.dem_pct, r = race.rep_pct;
  const dW = d >= r;
  const dWidth = state.chamber === "governor" ? Math.max(d, r) : (dW ? d : r);
  const polls = race.polls
    ? `<span class="polling">D <b class="n">${fmt(race.polls.dem)}</b> · R <b class="u">${fmt(race.polls.rep)}</b></span>`
    : '<span class="polling"><span class="none">—</span></span>';
  const inc = race.incumbent && race.incumbent !== "None (new seat)"
    ? `(${race.incumbent})`
    : "Open seat";
  return `<tr data-key="${raceKey(race)}">
    <td class="race-name">${partyBadge(race.party)}<b>${name}</b><span class="inc">${inc}</span></td>
    <td><span class="rating ${ratingClass(race.rating)}">${race.rating || "No rating"}</span></td>
    <td>${polls}</td>
    <td>
      <div class="chance">
        <div class="d" style="width:${dWidth}%"></div>
        <div class="r" style="width:${100 - dWidth}%"></div>
        <div class="tick"></div>
        <span class="lbl pleft">${fmt(d)}</span>
        <span class="lbl pright">${fmt(r)}</span>
      </div>
    </td>
  </tr>`;
}

function distributionSVG(chamberData, total) {
  const buckets = chamberData.distribution_buckets || [];
  if (!buckets.length) return "";
  const W = 1080, H = 170, padB = 20;
  const maxPct = Math.max(...buckets.map((b) => b.pct));
  const nxt = total;
  const x = (seats) => (seats / nxt) * W;
  const marker = state.chamber === "house" ? 218 : 50;
  let bars = "";
  for (const b of buckets) {
    const h = (b.pct / maxPct) * (H - padB - 6);
    const demControl = b.seats >= marker;
    bars += `<rect x="${x(b.seats - 1)}" y="${H - padB - h}" width="${Math.max(2, x(b.seats + 1) - x(b.seats - 1) - 1)}" height="${h}" fill="${demControl ? "var(--d-blue)" : "var(--d-red)"}"/>`;
  }
  let ticks = "";
  for (let s = 0; s <= nxt; s += Math.max(1, Math.round(nxt / 8))) {
    ticks += `<text class="axis" x="${x(s)}" y="${H - 5}" text-anchor="middle">${s}</text>`;
  }
  const markerX = x(marker);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${bars}
    <line x1="${markerX}" y1="2" x2="${markerX}" y2="${H - padB}" stroke="#111827" stroke-width="2" stroke-dasharray="4 3"/>
    ${ticks}
  </svg>`;
}

function controlCard(chamberData) {
  const maj = chamberData.majority || {};
  const d = maj.dem_pct ?? null;
  if (d === null) return "";
  const r = maj.rep_pct;
  return `<div class="ctl">
    <div class="cell d"><div class="big">${fmt(d)}<span style="font-size:20px">%</span></div>
      <div class="lbl">Democrats win ${US_LABELS[state.chamber]}</div></div>
    <div class="cell r"><div class="big">${fmt(r)}<span style="font-size:20px">%</span></div>
      <div class="lbl">Republicans win ${US_LABELS[state.chamber]}</div></div>
  </div>
  <p class="line" style="margin-top:14px;color:var(--c-text-muted);font-size:13px">
    Expected seats — Democrats <b>${fmt(chamberData.expected_d_seats)}</b>, Republicans <b>${fmt(chamberData.expected_r_seats)}</b>.
    ${state.chamber === "senate" ? "50 seats are needed for a majority (a 50–50 split leaves control in White House hands)." : "218 seats are needed for a majority."}
  </p>`;
}

function governorCard(chamberData) {
  return `<div class="ctl">
    <div class="cell d"><div class="big">${fmt(chamberData.expected_d_seats)}</div>
      <div class="lbl">Expected Democratic governors</div></div>
    <div class="cell r"><div class="big">${fmt(chamberData.expected_r_seats)}</div>
      <div class="lbl">Expected Republican governors</div></div>
  </div>
  <p class="line" style="margin-top:14px;color:var(--c-text-muted);font-size:13px">
    ${chamberData.races.length} governorships are contested in 2026.
  </p>`;
}

/* ---- map ---- */
function raceByKey(data, key) {
  return data.races.find((r) => raceKey(r) === key) || null;
}
function stateRace(races, stateName) {
  return races.find((r) => r.state === stateName) || null;
}

function legendGradient() {
  const g = [];
  for (let i = 0; i <= 40; i++) g.push(`<i style="width:2.5%;background:${raceColor(i * 2.5)}"></i>`);
  return `<div class="map-leg">
    <b>Democratic win chance</b>
    <div class="bar">${g.join("")}</div>
    <span>0%</span><b style="border-left:2px solid var(--c-edge);padding-left:4px">50%</b><span>100%</span>
    <span style="margin-left:auto"><span class="sw" style="background:${C_TOSSUP};display:inline-block;width:12px;height:10px;border:1.5px solid var(--c-edge);margin-right:4px;vertical-align:0"></span>tossup</span>
    <span style="margin-left:10px"><span class="sw" style="background:${C_GRAY};display:inline-block;width:12px;height:10px;border:1.5px solid var(--c-edge);margin-right:4px;vertical-align:0"></span>no race / not up</span>
  </div>`;
}

function mapCard(chamberData) {
  const isHouse = state.chamber === "house";
  const zoomed = isHouse && state.zoom !== null;
  const zoomName = state.zoom !== null ? state.geo.states[state.zoom].name : "";
  const ctrls = `<div class="map-ctrls">
    <span class="map-title">${isHouse ? (zoomed ? `${zoomName} · click a district for details` : "All 435 districts · click a state to zoom in") : "Click a state for details"}</span>
    ${zoomed ? `<button onclick="mapReset()">← Back to all states</button>` : ""}
  </div>`;
  const tip = `<div class="map-tip"></div>`;
  return `<div class="card">
    <h2>${US_LABELS[state.chamber]} map</h2>
    <p class="map-note">${isHouse
      ? "Every congressional district is filled by which party the 600 model makes the favorite (intensity = win chance)."
      : `Every state contesting ${US_LABELS[state.chamber].toLowerCase()} seats in 2026 is filled by the favored party.`}</p>
    ${ctrls}
    <div class="mapwrap">
      <div class="map-stage"></div>
      ${tip}
    </div>
    ${legendGradient()}
  </div>`;
}

function buildMapHTML(chamberData) {
  const geo = state.geo;
  const isHouse = state.chamber === "house";
  const W = geo.w, H = geo.h;
  const races = chamberData.races;

  const stateD = [];
  for (const st of geo.states) {
    const race = stateRace(races, st.name);
    const fill = race ? raceColor(race.dem_pct, race.rating) : C_GRAY;
    stateD.push(`<path class="st" data-name="${st.name}" data-idx="${geo.states.indexOf(st)}" d="${st.d}" style="fill:${fill}"${race ? ` data-race="${raceKey(race)}"` : ""}/>`);
  }

  let body;
  if (isHouse && state.zoom !== null) {
    const si = state.zoom;
    const st = geo.states[si];
    const [x0, y0, x1, y1] = st.box;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const pad = 0.82; // leave 18% margin
    const s = Math.min((W * pad) / (x1 - x0 || 1), (H * pad) / (y1 - y0 || 1));
    const t = `translate(${W / 2},${H / 2}) scale(${s}) translate(${-cx},${-cy})`;
    const dists = geo.districts.filter((d) => d.s === si);
    const dPaths = dists.map((d) => {
      const race = races.find((r) => r.state === st.name && String(r.district || "") === d.cd);
      const fill = race ? raceColor(race.dem_pct, race.rating) : C_GRAY;
      return `<path class="dist" data-name="${st.name} ${d.cd}" d="${d.d}" style="fill:${fill}"${race ? ` data-race="${raceKey(race)}"` : ""}/>`;
    });
    body = `<g transform="${t}">${dPaths.join("")}</g>`;
  } else if (isHouse) {
    const dPaths = geo.districts.map((d) => {
      const st = geo.states[d.s];
      const race = races.find((r) => r.state === st.name && String(r.district || "") === d.cd);
      const fill = race ? raceColor(race.dem_pct, race.rating) : C_GRAY;
      return `<path class="dist" data-name="${st.name} ${d.cd === "at-large" ? "At Large" : d.cd}" data-idx="${d.s}" d="${d.d}" style="fill:${fill}"${race ? ` data-race="${raceKey(race)}"` : ""}/>`;
    });
    body = `${dPaths.join("")}<g class="sub">${geo.states.map((s) => `<path d="${s.d}"/>`).join("")}</g>`;
  } else {
    body = `<g class="land"><path d="${geo.nation}"/></g>${stateD.join("")}`;
  }
  return `<svg class="map-svg" viewBox="0 0 ${W} ${H}">${body}</svg>`;
}

function attachMap(pane, chamberData) {
  const svg = pane.querySelector(".map-svg");
  if (!svg) return;
  const tip = pane.querySelector(".map-tip");
  const isHouse = state.chamber === "house";
  const races = chamberData.races;
  const zoomed = isHouse && state.zoom !== null;

  svg.querySelectorAll(".st, .dist").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = svg.parentElement.getBoundingClientRect();
      const name = el.getAttribute("data-name");
      const key = el.getAttribute("data-race");
      const race = key ? raceByKey(chamberData, key) : null;
      tip.style.display = "block";
      tip.style.left = Math.min(rect.width - 180, e.clientX - rect.left + 14) + "px";
      tip.style.top = Math.max(4, e.clientY - rect.top - 8) + "px";
      if (race) {
        const rn = state.chamber === "house" ? name : race.state;
        tip.innerHTML = `<div class="t">${rn}</div>
          <div class="r"><span class="d">D ${fmt(race.dem_pct)}%</span> · <span class="u">R ${fmt(race.rep_pct)}%</span></div>
          <div class="m">Margin ${race.margin >= 0 ? "D+" : "R+"}${fmt(Math.abs(race.margin))} ${race.rating ? "· " + race.rating : ""}</div>`;
      } else {
        tip.innerHTML = `<div class="t">${name}</div><div class="m">No 2026 race</div>`;
      }
    });
    el.addEventListener("mouseleave", () => { tip.style.display = "none"; });
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-race");
      if (isHouse && !zoomed && key) {
        const idx = parseInt(el.getAttribute("data-idx"), 10);
        if (idx !== null && !isNaN(idx) && state.geo.states[idx]) {
          state.zoom = idx;
          render();
          return;
        }
      }
      if (key) selectRace(pane, key);
    });
  });
  svg.querySelectorAll(".st").forEach((el) => {
    el.addEventListener("mouseenter", () => { svg.querySelectorAll(".st,.dist").forEach((p) => p.classList.remove("focus")); el.classList.add("focus"); });
  });
}

function selectRace(pane, key) {
  pane.querySelectorAll("tr").forEach((tr) => tr.classList.remove("selected"));
  const tr = pane.querySelector(`tr[data-key="${CSS.escape(key)}"]`);
  if (tr && tr.scrollIntoView) {
    tr.classList.add("selected");
    tr.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function mapReset() {
  state.zoom = null;
  render();
}

function render() {
  const f = state.forecast;
  if (!f) return;
  const data = f[state.chamber];
  const pane = document.getElementById("pane-" + state.chamber);
  const headerCard =
    state.chamber === "governor" ? governorCard(data) : controlCard(data);

  let races = data.races.slice();
  if (state.sort === "close") races.sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin));
  else if (state.sort === "rd") races.sort((a, b) => b.dem_pct - a.dem_pct);
  else if (state.sort === "rr") races.sort((a, b) => a.dem_pct - b.dem_pct);

  const sortSel = state.chamber === "governor"
    ? `<select class="sort" onchange="setSort(this.value)" title="Sort">
        <option value="close" ${state.sort === "close" ? "selected" : ""}>Closest races first</option>
        <option value="rd" ${state.sort === "rd" ? "selected" : ""}>Dems favored first</option>
        <option value="rr" ${state.sort === "rr" ? "selected" : ""}>GOP favored first</option>
      </select>`
    : "";

  const mapHtml = state.geo ? mapCard(data) : "";

  const table = `<div class="card">
    <h2>Every ${US_LABELS[state.chamber].toLowerCase()} race</h2>
    <p class="note">${data.races.length} races · sorted ${state.sort === "close" ? "by closeness" : state.sort === "rd" ? "by Democratic probability" : "by Republican probability"} · click a row to see it on the map</p>
    <div class="toggle-flow">${sortSel}</div>
    <table>
      <thead><tr><th>Race</th><th>Rating</th><th>Polling average</th><th>Win probability</th></tr></thead>
      <tbody>${races.map(raceRow).join("")}</tbody>
    </table>
    <div class="legend">
      <span><span class="sw d"></span>Democrats</span>
      <span><span class="sw r"></span>Republicans</span>
      <span>Bars are the 600 model's win chance; the tick marks 50%.</span>
    </div>
  </div>`;

  const env = f.environment ? `Generic congressional ballot: <b>${fmt(f.environment.generic_ballot_generic_margin)}</b> points Democratic.` : "";

  pane.innerHTML = `
    <div class="card">
      <h2>Race for the ${state.chamber === "house" ? "U.S. House" : state.chamber === "senate" ? "U.S. Senate" : "governors' mansions"}</h2>
      <p class="note">Model chance shown is the share of 20,000 simulated election nights in which each party wins the chamber, accounting for the generic-ballot environment (${env}).</p>
      ${headerCard}
    </div>
    ${mapHtml}
    <div class="card">
      <h2>Seat distribution</h2>
      <p class="note">Share of simulated nights producing each number of Democratic seats (2-seat buckets). Blue bars are Democratic-majority outcomes.</p>
      <div class="chart">${distributionSVG(data, state.chamber === "house" ? 435 : 100)}</div>
    </div>
    ${table}
    <p class="foot">
      Method: the 600 in-house model converts race ratings (Cook, Inside Elections, Sabato)
      and per-race polling averages into a two-party margin, then runs a national-swing
      simulation (${fmt(f.environment ? f.environment.n_sims : 20000)} nights, national swing σ = ${fmt(f.environment ? f.environment.national_swing_sigma : 2.5)} pts centered on the generic ballot).
      Races without public polling are shown as "—"; their probability comes from the rating and partisan lean.
      Sources: Wikipedia (2026 Senate / House / gubernatorial election articles and ratings), generic-ballot aggregates.
      Model generated: ${f.generated ? new Date(f.generated).toUTCString() : "—"}.
    </p>`;

  if (state.geo) {
    const stage = pane.querySelector(".map-stage");
    stage.innerHTML = buildMapHTML(data);
    attachMap(pane, data);
  }
  attachRows(pane, data);
}

function attachRows(pane, data) {
  pane.querySelectorAll("tr[data-key]").forEach((tr) => {
    tr.style.cursor = "pointer";
    tr.addEventListener("mouseenter", () => {
      const key = tr.getAttribute("data-key");
      const el = pane.querySelector(`.map-svg [data-race="${CSS.escape(key)}"]`);
      if (el) { el.classList.add("focus"); }
    });
    tr.addEventListener("mouseleave", () => {
      pane.querySelectorAll(".map-svg .focus").forEach((p) => p.classList.remove("focus"));
    });
    tr.addEventListener("click", () => {
      const key = tr.getAttribute("data-key");
      if (state.chamber === "house" && state.zoom === null) {
        const race = raceByKey(data, key);
        if (race) { state.zoom = state.geo.states.findIndex((s) => s.name === race.state); render(); return; }
      }
      selectRace(pane, key);
    });
  });
}

function setSort(v) {
  state.sort = v;
  render();
}

function selectChamber(ch) {
  state.chamber = ch;
  state.zoom = null;
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.chamber === ch);
  });
  document.querySelectorAll(".pane").forEach((p) => {
    p.classList.toggle("active", p.id === "pane-" + ch);
  });
  render();
}

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => selectChamber(t.dataset.chamber));
});

Promise.all([fetch(US_DATA), fetch(US_GEO)])
  .then(([rf, rg]) => Promise.all([rf.json(), rg.json()]))
  .then(([f, g]) => {
    state.forecast = f;
    state.geo = g;
    document.getElementById("updated").textContent =
      `Updated ${new Date(f.generated).toUTCString()} · ${f.model || ""}`;
    render();
  })
  .catch((err) => {
    document.getElementById("pane-senate").innerHTML =
      '<div class="load">Could not load forecast data.</div>';
    console.error(err);
  });