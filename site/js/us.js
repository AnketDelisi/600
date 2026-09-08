/* 600 — 2026 U.S. midterms renderer (538-style, sidebar-free)
 * Data: data/us/forecast.json produced by scraper/us_scrape_model.py
 */
window.__errs = [];
window.addEventListener('error', e => window.__errs.push(String(e)));
window.addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason || e)));
const US_DATA = (() => {
  // Same trick as app.js's dataBase(): derive the base from where us.js loads.
  const s = document.querySelector('script[src*="us.js"]');
  if (s) {
    let src = s.getAttribute("src") || "";
    if (src.startsWith("./")) src = src.slice(2);
    const i = src.lastIndexOf("js/us.js");
    if (i > 0) return src.slice(0, i) + "data/us/forecast.json?v=20260905ab";
  }
  return "../data/us/forecast.json?v=20260905ab";
})();
const US_LABELS = {
  senate: "Senate",
  house: "House",
  governor: "Governors",
};

const state = {
  forecast: null,
  chamber: "senate",
  sort: "close",
};

const fmt = (x) => (Math.abs(x) >= 100 ? Math.round(x) : (x % 1 === 0 ? String(Math.round(x)) : x.toFixed(1)));

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
  return `<tr>
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
  const need = 51; // majority marker (Senate); House 218
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

  const table = `<div class="card">
    <h2>Every ${US_LABELS[state.chamber].toLowerCase()} race</h2>
    <p class="note">${data.races.length} races · sorted ${state.sort === "close" ? "by closeness" : state.sort === "rd" ? "by Democratic probability" : "by Republican probability"}</p>
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
    <div class="card">
      <h2>Seat distribution</h2>
      <p class="note">Share of simulated nights producing each number of Democratic seats (2-seat buckets). Blue bars are Democratic-majority outcomes.</p>
      <div class="chart">${distributionSVG(data, state.chamber === "house" ? 435 : 100)}</div>
    </div>
    ${table}
    <p class="foot">
      Method: the 600 in-house model converts race ratings (Cook, Inside Elections, Sabato)
      and per-race polling averages into a two-party margin, then runs a national-swing
      simulation (${fmt(f.environment ? f.environment.n_sims : 20000)} nights, national swing σ = ${fmt(f.environment ? f.environment.national_swing_sigma : 2.5)} pts).
      Races without public polling are shown as "—"; their probability comes from the rating and partisan lean.
      Sources: Wikipedia (2026 Senate / House / gubernatorial election articles and ratings), generic-ballot aggregates.
      Model generated: ${f.generated ? new Date(f.generated).toUTCString() : "—"}.
    </p>`;
}

function setSort(v) {
  state.sort = v;
  render();
}

function selectChamber(ch) {
  state.chamber = ch;
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

fetch(US_DATA)
  .then((res) => res.json())
  .then((f) => {
    state.forecast = f;
    document.getElementById("updated").textContent =
      `Updated ${new Date(f.generated).toUTCString()} · ${f.model || ""}`;
    render();
  })
  .catch((err) => {
    document.getElementById("pane-senate").innerHTML =
      '<div class="load">Could not load forecast data.</div>';
    console.error(err);
  });