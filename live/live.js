/* 600 live results page. Data: data/live/index.json + data/live/<id>.json */
const LIVE_INDEX = "../data/live/index.json";
const liveRoot = document.getElementById("app");
const liveNav = document.getElementById("elections");
const liveFooter = document.getElementById("live-footer");
let liveId = new URLSearchParams(location.search).get("e") || null;
let liveIndex = null;
let liveTimer = null;
let currentData = null;
let lastPayload = null;
let resizeTimer = null;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const num = (v) => (v == null ? "—" : Number(v).toLocaleString());
const pct = (v) => (v == null ? "—" : Number(v).toFixed(1) + "%");
const color = (e) => e.color || "#6C665B";
const DAY = 24 * 60 * 60 * 1000;

const POLL_CONFIG = {
  "bc-2026": {
    file: "../data/bc/polls.json",
    parties: [
      { id: "bcndp", name: "BC NDP", short: "NDP", color: "#F4A460" },
      { id: "cpbc", name: "Conservatives", short: "CON", color: "#004AAD" },
      { id: "gpbc", name: "Greens", short: "GRN", color: "#99C955" },
      { id: "onbc", name: "OneBC", short: "1BC", color: "#C49B50" },
      { id: "cbc", name: "CentreBC", short: "CBC", color: "#EE2D30" },
    ],
  },
  "serbia-2026": {
    file: "../data/serbia/polls.json",
    parties: [
      { id: "sns", name: "Vučić – United Serbia", short: "SNS", color: "#242970" },
      { id: "sl", name: "Student List", short: "SL", color: "#A81A32" },
      { id: "sps", name: "Socialist Party", short: "SPS", color: "#EB1B23" },
      { id: "pes", name: "European Serbia", short: "PES", color: "#C9A227" },
      { id: "nada", name: "NADA", short: "NADA", color: "#616264" },
      { id: "misn", name: "We – Power of the People", short: "MISN", color: "#1B3160" },
    ],
  },
  "brazil-2026-r2": {
    file: "../data/brazil/polls.json",
    runoff: true,
    parties: [
      { id: "lula", name: "Lula", short: "Lula", color: "#E20E28" },
      { id: "flavio", name: "Flávio", short: "Flávio", color: "#015AAA" },
    ],
  },
  "bulgaria-2026": {
    file: "../data/bgpres/polls.json",
    parties: [
      { id: "iotova", name: "Iotova", short: "IOT", color: "#DB0F28" },
      { id: "gyurov", name: "Gyurov", short: "GYU", color: "#4200FF" },
      { id: "kostadinov", name: "Kostadinov", short: "KOS", color: "#C09F62" },
      { id: "mihaylov", name: "Mihaylov", short: "MIH", color: "#AC2225" },
      { id: "vasilev", name: "Vasilev", short: "VAS", color: "#1A2C44" },
      { id: "hristanov", name: "Hristanov", short: "HRI", color: "#C0CC66" },
    ],
  },
};
const METHOD_LABELS = {
  online: "Online panel", phone: "Telephone", face: "Face-to-face",
  mixed: "Mixed", "": "Not stated",
};
const pollCache = new Map();

async function fetchJson(url, timeout = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function checkedAt() {
  return new Date().toISOString().slice(11, 19);
}

function statusText(s) {
  return ({ waiting: "Waiting", counting: "Counting", final: "Final" })[s] || s || "Waiting";
}

function statusPill(s) {
  return `<span class="live-pill ${esc(s || "waiting")}">${esc(statusText(s))}</span>`;
}

function countdown(closeAt) {
  if (!closeAt) return "";
  const ms = new Date(closeAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "Polls closed";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  if (days) return `Closes in ${days}d ${hours}h`;
  if (hours) return `Closes in ${hours}h ${rest}m`;
  return `Closes in ${rest}m`;
}

function dayValue(s) {
  return new Date(s + "T00:00:00Z").getTime();
}

function shortDate(s) {
  return new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}

function pollAverage(polls, party, at) {
  let sw = 0, sv = 0;
  for (const p of polls) {
    const v = p.votes && p.votes[party];
    if (v == null) continue;
    const age = (at - dayValue(p.date)) / DAY;
    if (age < 0) continue;
    const w = Math.pow(0.5, age / 7) * Math.min(1500, p.n || 1000) / 1000;
    sw += w;
    sv += w * v;
  }
  return sw ? sv / sw : null;
}

function pollChart(data, polls, start, end, parties) {
  const appWidth = (liveRoot && liveRoot.clientWidth) || 960;
  const W = Math.max(260, Math.min(960, appWidth - 40));
  const compact = W < 600;
  const H = compact ? 270 : 320;
  const L = compact ? 42 : 42;
  const R = compact ? 8 : 16;
  const T = 16;
  const B = compact ? 44 : 38;
  const values = [];
  for (const p of polls) for (const party of parties) {
    if (p.votes && p.votes[party.id] != null) values.push(p.votes[party.id]);
  }
  const maxValue = values.length ? Math.max(...values) : 0;
  const yMax = Math.max(50, Math.ceil((maxValue + 2) / 10) * 10);
  const x = (t) => L + ((t - start) / (end - start)) * (W - L - R);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = [];
  const spanDays = Math.max(1, Math.round((end - start) / DAY));
  const tickDays = compact ? Math.max(4, Math.ceil(spanDays / 4)) : 4;
  for (let t = start; t <= end; t += tickDays * DAY) ticks.push(t);
  if (ticks[ticks.length - 1] !== end) ticks.push(end);
  const yTicks = [];
  for (let v = 0; v <= yMax; v += 10) yTicks.push(v);

  const grid = yTicks.map((v) => `
    <line class="grid" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"></line>
    <text class="axis" x="${L - 7}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`).join("");
  const xAxis = ticks.map((t) => {
    const px = x(t);
    const anchor = px > W - 32 ? "end" : px < L + 20 ? "start" : "middle";
    return `<text class="axis" x="${px}" y="${H - 9}" text-anchor="${anchor}">${shortDate(new Date(t).toISOString().slice(0, 10))}</text>`;
  }).join("");

  const paths = parties.map((party) => {
    const pts = [];
    for (let t = start; t <= end; t += DAY) {
      const v = pollAverage(polls, party.id, t);
      if (v != null) pts.push([x(t), y(v)]);
    }
    if (pts.length < 2) return "";
    return `<path class="party-line" stroke="${party.color}" d="${pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")}"></path>`;
  }).join("");

  const dots = [];
  for (const p of polls) {
    for (const party of parties) {
      const v = p.votes && p.votes[party.id];
      if (v == null) continue;
      const label = `${p.pollster} · ${shortDate(p.date)} · ${METHOD_LABELS[p.method] || p.method || "Not stated"} · ${party.name} ${v.toFixed(1)}%`;
      dots.push(`<circle class="poll-dot" cx="${x(dayValue(p.date))}" cy="${y(v)}" r="${compact ? 2.8 : 3.2}" fill="${party.color}"><title>${esc(label)}</title></circle>`);
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.name)} campaign poll trend">
    ${grid}
    <line class="election-line" x1="${x(end)}" y1="${T}" x2="${x(end)}" y2="${H - B}"></line>
    <text class="axis" x="${x(end) - 4}" y="${T + 10}" text-anchor="end">Election day</text>
    ${paths}
    ${dots.join("")}
    ${xAxis}
  </svg>`;
}

function pollLeader(p, parties) {
  let best = null, value = -1;
  for (const party of parties) {
    const v = p.votes && p.votes[party.id];
    if (v != null && v > value) { value = v; best = party; }
  }
  return best;
}

function pollTable(polls, parties) {
  const rows = polls.map((p) => {
    const lead = pollLeader(p, parties);
    return `<tr>
    <td data-label="Date">${esc(shortDate(p.date))}</td>
    <td data-label="Pollster">${esc(p.pollster)}</td>
    <td data-label="Method" class="c">${esc(METHOD_LABELS[p.method] || p.method || "Not stated")}</td>
    <td data-label="N" class="c">${num(p.n)}</td>
    ${parties.map((party) => `<td data-label="${esc(party.name)}" class="c party-col${lead && lead.id === party.id ? " lead" : ""}" style="--pc:${party.color}">${p.votes && p.votes[party.id] != null ? Number(p.votes[party.id]).toFixed(1) : "—"}</td>`).join("")}
  </tr>`;
  }).join("");
  return `<div class="live-table-wrap live-poll-table" tabindex="0" role="region" aria-label="Campaign poll table">
    <p class="live-scroll-note">Scroll sideways to see every party column.</p>
    <table class="polls-table compact-table live-polls" aria-label="All campaign polls">
      <thead><tr><th>Date</th><th>Pollster</th><th class="c">Method</th><th class="c">N</th>
      ${parties.map((party) => `<th class="c party-col" scope="col" style="--pc:${party.color}"><span class="party-dot"></span>${esc(party.name)}</th>`).join("")}
      </tr></thead><tbody>${rows}</tbody>
    </table>
  </div>`;
}

function pollTrackerHtml(data, pollsJson, cfg) {
  const end = dayValue(data.date);
  const start = dayValue(data.chart_start || new Date(end - 14 * DAY).toISOString().slice(0, 10));
  const polls = (pollsJson.polls || [])
    .map((p) => ({ ...p, votes: cfg.runoff ? (p.runoff || {}) : (p.votes || {}) }))
    .filter((p) => p.date && Object.keys(p.votes).length && dayValue(p.date) >= start && dayValue(p.date) <= end)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.pollster).localeCompare(String(b.pollster)));
  if (!polls.length) {
    return `<section class="live-card" id="live-poll-tracker"><h2>Campaign poll tracker</h2><p class="live-note">No campaign polls yet.</p></section>`;
  }
  const latest = cfg.parties.map((party) => ({
    ...party, value: pollAverage(polls, party.id, end),
  })).filter((party) => party.value != null);
  const summary = latest.map((party) =>
    `<span><i style="background:${party.color}"></i>${esc(party.name)} <b>${party.value.toFixed(1)}%</b></span>`
  ).join("");
  const houses = new Set(polls.map((p) => p.pollster)).size;
  return `<section class="live-card" id="live-poll-tracker" aria-labelledby="poll-tracker-title">
    <h2 id="poll-tracker-title">Campaign polls</h2>
    <p class="live-note">Every poll from the campaign, from every pollster, with the method shown when the source gives one. Dots are individual polls; the lines are the 600 recency-weighted average.</p>
    <div class="live-summary">${summary}</div>
    <div class="live-sub">${polls.length} polls · ${houses} pollsters · ${esc(shortDate(new Date(start).toISOString().slice(0, 10)))}–${esc(shortDate(data.date))}</div>
    <div class="live-chart">${pollChart(data, polls, start, end, cfg.parties)}</div>
    <div class="live-chart-legend">${cfg.parties.map((party) => `<span><i style="background:${party.color}"></i>${esc(party.name)}</span>`).join("")}<span>Dots: every poll</span></div>
    <h3>All polls</h3>
    ${pollTable(polls, cfg.parties)}
    <div class="live-source">Polls: <a href="${esc(pollsJson.source_url || "#")}" target="_blank" rel="noopener">${esc(pollsJson.source || "source")}</a> · campaign ${esc(shortDate(new Date(start).toISOString().slice(0, 10)))}–${esc(shortDate(data.date))}</div>
  </section>`;
}

async function loadPollTracker(data) {
  const el = document.getElementById("live-poll-tracker");
  const cfg = POLL_CONFIG[data.id];
  if (!el || !cfg) return;
  try {
    if (!pollCache.has(data.id)) pollCache.set(data.id, await fetchJson(cfg.file));
    el.outerHTML = pollTrackerHtml(data, pollCache.get(data.id), cfg);
  } catch (err) {
    el.innerHTML = `<div class="live-card"><h2>Poll tracker unavailable</h2><p class="live-note">The campaign poll file could not be loaded. The live result source is still available.</p><button class="live-retry" type="button">Try again</button></div>`;
    const retry = el.querySelector(".live-retry");
    if (retry) retry.addEventListener("click", () => loadPollTracker(data));
    console.error(err);
  }
}

async function loadIndex() {
  return fetchJson(LIVE_INDEX);
}

function renderNav(elections) {
  liveNav.innerHTML = elections.map((e) => `
    <button type="button" data-id="${esc(e.id)}" class="${e.id === liveId ? "active" : ""}" aria-pressed="${e.id === liveId}">${esc(e.name)}</button>
  `).join("");
  liveNav.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      if (id === liveId) return;
      liveId = id;
      history.pushState(null, "", `?e=${encodeURIComponent(liveId)}`);
      renderNav(elections);
      loadElection(liveId);
    });
  });
}

function updateChecked() {
  const el = document.getElementById("live-checked");
  if (el) el.textContent = checkedAt() + " UTC";
}

function updateCountdown() {
  const el = document.getElementById("live-count");
  if (!el || !currentData || !currentData.close_at) return;
  const value = countdown(currentData.close_at);
  if (value) el.textContent = value;
}

function renderFooter(d) {
  if (!liveFooter) return;
  const source = d.source_url
    ? `<a href="${esc(d.source_url)}" target="_blank" rel="noopener">${esc(d.source || d.source_url)}</a>`
    : esc(d.source || "official source");
  const tracker = POLL_CONFIG[d.id]
    ? " Campaign tracker: every poll from the campaign, with a 600 recency-weighted average."
    : "";
  liveFooter.innerHTML = `<p>Results: ${source} · Refreshes every 30 seconds.</p>
    <p>Preliminary counts; the official record governs.${tracker}</p>`;
}

function renderError(title, message, retryFn) {
  currentData = null;
  lastPayload = null;
  if (liveFooter) liveFooter.innerHTML = "";
  liveRoot.innerHTML = `<div class="live-card"><h2>${esc(title)}</h2><p class="live-note">${esc(message)}</p><button class="live-retry" type="button">Try again</button></div>`;
  const retry = liveRoot.querySelector(".live-retry");
  if (retry) retry.addEventListener("click", retryFn);
}

function renderElection(d) {
  const entries = d.entries || [];
  const waiting = d.status === "waiting" && !entries.some((e) => Number(e.pct) > 0);
  const maxPct = Math.max(1, ...entries.map((e) => Number(e.pct) || 0));
  const bars = entries.map((e) => {
    const p = Number(e.pct) || 0;
    const w = Math.max(0.5, (p / maxPct) * 100);
    return `<div class="live-bar">
      <span class="name">${esc(e.name || e.id)}</span>
      <span class="track"><span class="fill" style="width:${w}%;background:${color(e)}"></span></span>
      <span class="pct">${pct(p)}</span>
    </div>`;
  }).join("");

  let seats = "";
  if (d.seat_total && entries.some((e) => Number(e.seats) > 0)) {
    const total = Number(d.seat_total);
    const seg = entries.filter((e) => Number(e.seats) > 0).map((e) =>
      `<i style="width:${(Number(e.seats) / total) * 100}%;background:${color(e)}" title="${esc(e.name)}: ${num(e.seats)}"></i>`
    ).join("");
    seats = `<div class="live-seats">${seg}</div>
      <div class="live-seat-legend">${entries.filter((e) => Number(e.seats) > 0)
        .map((e) => `<span><b>${num(e.seats)}</b> ${esc(e.name)}</span>`).join("")}
        ${d.majority ? `<span>Majority: <b>${num(d.majority)}</b></span>` : ""}</div>`;
  }

  const areas = Array.isArray(d.areas) && d.areas.length ? `
    <div class="live-card">
      <h2>${esc(d.area_title || "Areas")}</h2>
      <p class="live-note">${esc(d.area_note || "Results as reported by the source.")}</p>
      <div class="live-table-wrap" tabindex="0" role="region" aria-label="${esc(d.area_title || "Area results")}">
      <table class="live-table live-areas">
        <thead><tr>
          <th>${esc(d.area_label || "Area")}</th>
          <th>Leader</th>
          <th>%</th>
          <th>Counted</th>
        </tr></thead>
        <tbody>${d.areas.map((a) => `<tr>
          <td>${esc(a.name)}</td>
          <td>${esc(a.winner_name || a.winner || "—")}${a.leading ? '<span class="live-tag lead">Leading</span>' : ""}${a.elected ? '<span class="live-tag win">Elected</span>' : ""}</td>
          <td class="num">${pct(a.pct)}</td>
          <td class="num">${a.counted == null ? "—" : num(a.counted)}${a.total ? " / " + num(a.total) : ""}</td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>` : "";

  const counted = d.counted == null ? "" :
    d.total == null
      ? `<span><b>${num(d.counted)}</b> ${esc(d.counted_label || "counted")}</span>`
      : `<span><b>${num(d.counted)}</b> / ${num(d.total)} ${esc(d.counted_label || "counted")}</span>`;
  const turnout = d.turnout == null ? "" : `<span>Turnout <b>${pct(d.turnout)}</b></span>`;
  const clock = countdown(d.close_at);
  const status = `<div class="live-status" id="live-status" role="status" aria-live="polite">${statusPill(d.status)}${counted}${turnout}${clock ? `<span id="live-count">${esc(clock)}</span>` : ""}<span>Checked <b id="live-checked">${checkedAt()} UTC</b></span></div>`;
  const hasTracker = !!POLL_CONFIG[d.id];
  const trackerNote = hasTracker ? "While you wait, the campaign polls are below. " : "";
  const detailNote = d.seat_total ? `Seat and ${(d.area_label || "area").toLowerCase()} results will appear when counting starts.` : "Detailed results will appear when counting starts.";
  const wait = waiting
    ? `<div class="live-notice"><div><strong>${esc(d.waiting_text || "Waiting for the first official results.")}</strong><p>${trackerNote}${detailNote}</p></div></div>`
    : `<div class="live-card">
        <h2>${esc(d.result_title || "Result")}</h2>
        <p class="live-note">${esc(d.result_note || "Vote share as reported by the source.")}</p>
        <div class="live-bars">${bars}</div>
        ${seats}
        <div class="live-source">${d.source_url ? `Source: <a href="${esc(d.source_url)}" target="_blank" rel="noopener">${esc(d.source || d.source_url)}</a>` : `Source: ${esc(d.source || "—")}`}</div>
      </div>`;

  liveRoot.innerHTML = `
    <section class="live-head">
      <div>
        <h1>${esc(d.name)}</h1>
        <div class="sub">${esc(d.date || "")}${d.subtitle ? " · " + esc(d.subtitle) : ""}</div>
      </div>
      ${status}
    </section>
    ${wait}
    ${hasTracker ? '<div id="live-poll-tracker"></div>' : ""}
    ${areas}
    ${d.notes ? `<div class="live-card"><p class="live-note" style="margin:0">${esc(d.notes)}</p></div>` : ""}
  `;
  renderFooter(d);
  if (hasTracker) loadPollTracker(d);
}

async function loadElection(id) {
  if (!id) return;
  try {
    const d = await fetchJson(`../data/live/${encodeURIComponent(id)}.json`);
    const payload = JSON.stringify(d);
    if (payload === lastPayload) {
      currentData = d;
      updateCountdown();
      updateChecked();
      renderFooter(d);
      return;
    }
    lastPayload = payload;
    currentData = d;
    renderElection(d);
  } catch (err) {
    renderError("Results unavailable", `Could not load ${id}. Check your connection and try again.`, () => loadElection(id));
    console.error(err);
  }
}

async function boot() {
  clearInterval(liveTimer);
  try {
    const data = await loadIndex();
    const elections = data.elections || data;
    if (!Array.isArray(elections) || !elections.length) throw new Error("No elections configured");
    liveIndex = elections;
    if (!liveId || !elections.some((e) => e.id === liveId)) {
      const active = elections.find((e) => e.status === "counting")
        || elections.find((e) => e.status === "waiting")
        || elections[0];
      liveId = active && active.id;
    }
    if (liveId) history.replaceState(null, "", `?e=${encodeURIComponent(liveId)}`);
    renderNav(elections);
    await loadElection(liveId);
    clearInterval(liveTimer);
    liveTimer = setInterval(() => {
      if (!document.hidden) loadElection(liveId);
      if (!document.hidden) updateCountdown();
      if (!document.hidden) updateChecked();
    }, 30000);
  } catch (err) {
    renderError("Live results unavailable", "The live-results index could not be loaded. Check your connection and try again.", boot);
    console.error(err);
  }
}

window.addEventListener("popstate", () => {
  const id = new URLSearchParams(location.search).get("e");
  if (!id || id === liveId || !liveIndex || !liveIndex.some((e) => e.id === id)) return;
  liveId = id;
  renderNav(liveIndex);
  loadElection(id);
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (currentData && POLL_CONFIG[currentData.id]) renderElection(currentData);
  }, 150);
});

boot();
