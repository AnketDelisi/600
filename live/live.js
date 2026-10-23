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

const BC_DAY = 24 * 60 * 60 * 1000;
const BC_PARTIES = [
  { id: "bcndp", name: "BC NDP", color: "#F4A460", chartColor: "#A95500" },
  { id: "cpbc", name: "Conservatives", color: "#004AAD", chartColor: "#004AAD" },
  { id: "gpbc", name: "Greens", color: "#99C955", chartColor: "#4F7A1F" },
  { id: "onbc", name: "OneBC", color: "#C49B50", chartColor: "#7A5A12" },
  { id: "cbc", name: "CentreBC", color: "#EE2D30", chartColor: "#A61B1B" },
];
const BC_METHODS = {
  online: "Online panel", phone: "Telephone", face: "Face-to-face",
  mixed: "Mixed", "": "Not stated",
};
let bcPollsCache = null;

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

function bcAverage(polls, party, at) {
  let sw = 0, sv = 0;
  for (const p of polls) {
    const v = p.votes && p.votes[party];
    if (v == null) continue;
    const age = (at - dayValue(p.date)) / BC_DAY;
    if (age < 0) continue;
    const w = Math.pow(0.5, age / 7) * Math.min(1500, p.n || 1000) / 1000;
    sw += w;
    sv += w * v;
  }
  return sw ? sv / sw : null;
}

function bcChart(polls, start, end) {
  const appWidth = (liveRoot && liveRoot.clientWidth) || 960;
  const W = Math.max(260, Math.min(960, appWidth - 40));
  const compact = W < 600;
  const H = compact ? 270 : 320;
  const L = compact ? 34 : 42;
  const R = compact ? 8 : 16;
  const T = 16;
  const B = compact ? 32 : 34;
  const values = [];
  for (const p of polls) for (const party of BC_PARTIES) {
    if (p.votes && p.votes[party.id] != null) values.push(p.votes[party.id]);
  }
  const maxValue = values.length ? Math.max(...values) : 0;
  const yMax = Math.max(50, Math.ceil((maxValue + 2) / 10) * 10);
  const x = (t) => L + ((t - start) / (end - start)) * (W - L - R);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = [];
  const tickDays = compact ? 4 : 2;
  for (let t = start; t <= end; t += tickDays * BC_DAY) ticks.push(t);
  if (ticks[ticks.length - 1] !== end) ticks.push(end);
  const yTicks = [];
  for (let v = 0; v <= yMax; v += 10) yTicks.push(v);

  const grid = yTicks.map((v) => `
    <line class="grid" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"></line>
    <text class="axis" x="${L - 7}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`).join("");
  const xAxis = ticks.map((t) => {
    const px = x(t);
    const anchor = px > W - 30 ? "end" : px < L + 20 ? "start" : "middle";
    return `<text class="axis" x="${px}" y="${H - 9}" text-anchor="${anchor}">${shortDate(new Date(t).toISOString().slice(0, 10))}</text>`;
  }).join("");

  const paths = BC_PARTIES.map((party) => {
    const pts = [];
    for (let t = start; t <= end; t += BC_DAY) {
      const v = bcAverage(polls, party.id, t);
      if (v != null) pts.push([x(t), y(v)]);
    }
    if (pts.length < 2) return "";
    return `<path class="party-line" stroke="${party.chartColor}" d="${pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")}"></path>`;
  }).join("");

  const dots = [];
  for (const p of polls) {
    for (const party of BC_PARTIES) {
      const v = p.votes && p.votes[party.id];
      if (v == null) continue;
      const label = `${p.pollster} · ${shortDate(p.date)} · ${BC_METHODS[p.method] || p.method || "Not stated"} · ${party.name} ${v.toFixed(1)}%`;
      dots.push(`<circle class="poll-dot" cx="${x(dayValue(p.date))}" cy="${y(v)}" r="${compact ? 2.8 : 3.2}" fill="${party.chartColor}"><title>${esc(label)}</title></circle>`);
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="British Columbia poll trend, final 14 days">
    ${grid}
    <line class="election-line" x1="${x(end)}" y1="${T}" x2="${x(end)}" y2="${H - B}"></line>
    <text class="axis" x="${x(end) - 4}" y="${T + 10}" text-anchor="end">Election day</text>
    ${paths}
    ${dots.join("")}
    ${xAxis}
  </svg>`;
}

function bcPollTable(polls) {
  const rows = polls.map((p) => `<tr>
    <td data-label="Date">${esc(shortDate(p.date))}</td>
    <td data-label="Pollster">${esc(p.pollster)}</td>
    <td data-label="Method">${esc(BC_METHODS[p.method] || p.method || "Not stated")}</td>
    <td data-label="N" class="num">${num(p.n)}</td>
    ${BC_PARTIES.map((party) => `<td data-label="${esc(party.name)}" class="num">${p.votes && p.votes[party.id] != null ? Number(p.votes[party.id]).toFixed(1) : "—"}</td>`).join("")}
  </tr>`).join("");
  return `<div class="live-table-wrap"><table class="live-table live-polls" aria-label="All polls in the final 14 days">
    <thead><tr><th>Date</th><th>Pollster</th><th>Method</th><th class="num">N</th>
    ${BC_PARTIES.map((party) => `<th class="num">${esc(party.name)}</th>`).join("")}
    </tr></thead><tbody>${rows}</tbody>
  </table></div>`;
}

function bcForecastHtml(data, pollsJson) {
  const end = dayValue(data.date);
  const start = end - 14 * BC_DAY;
  const polls = (pollsJson.polls || [])
    .filter((p) => p.date && dayValue(p.date) >= start && dayValue(p.date) <= end)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.pollster).localeCompare(String(b.pollster)));
  if (!polls.length) {
    return `<section class="live-card" id="bc-forecast"><h2>BC forecast · last 14 days</h2><p class="live-note">No polls in the final 14 days yet.</p></section>`;
  }
  const latest = BC_PARTIES.map((party) => ({
    ...party, value: bcAverage(polls, party.id, end),
  })).filter((party) => party.value != null);
  const summary = latest.map((party) =>
    `<span><i style="background:${party.color}"></i>${esc(party.name)} <b>${party.value.toFixed(1)}%</b></span>`
  ).join("");
  const houses = new Set(polls.map((p) => p.pollster)).size;
  return `<section class="live-card" id="bc-forecast" aria-labelledby="bc-forecast-title">
    <h2 id="bc-forecast-title">BC forecast · last 14 days</h2>
    <p class="live-note">Every published poll in the final 14 days, all pollsters and methods. Dots are individual polls; lines are the 600 recency-weighted average. Where the source does not state a method, the table says “Not stated”.</p>
    <div class="live-forecast-summary">${summary}</div>
    <div class="live-sub">${polls.length} polls · ${houses} pollsters · ${esc(shortDate(new Date(start).toISOString().slice(0, 10)))}–${esc(shortDate(data.date))}</div>
    <div class="live-chart">${bcChart(polls, start, end)}</div>
    <div class="live-chart-legend">${BC_PARTIES.map((party) => `<span><i style="background:${party.chartColor}"></i>${esc(party.name)}</span>`).join("")}<span>Dots: every poll</span></div>
    <h3>All polls</h3>
    ${bcPollTable(polls)}
    <div class="live-source">Polls: <a href="${esc(pollsJson.source_url || "#")}" target="_blank" rel="noopener">${esc(pollsJson.source || "source")}</a> · window ${esc(shortDate(new Date(start).toISOString().slice(0, 10)))}–${esc(shortDate(data.date))}</div>
  </section>`;
}

async function loadBcForecast(data) {
  const el = document.getElementById("bc-forecast");
  if (!el) return;
  try {
    if (!bcPollsCache) {
      bcPollsCache = await fetchJson("../data/bc/polls.json");
    }
    el.outerHTML = bcForecastHtml(data, bcPollsCache);
  } catch (err) {
    el.innerHTML = `<div class="live-card"><h2>BC poll tracker unavailable</h2><p class="live-note">The poll file could not be loaded. The live result source is still available.</p><button class="live-retry" type="button">Try again</button></div>`;
    const retry = el.querySelector(".live-retry");
    if (retry) retry.addEventListener("click", () => { bcPollsCache = null; loadBcForecast(data); });
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
  const tracker = d.id === "bc-2026"
    ? " BC tracker: every published poll in the final 14 days, with a 600 recency-weighted average."
    : "";
  liveFooter.innerHTML = `<p>Results: ${source} · Page checked <span class="live-check">${checkedAt()} UTC</span> · Refreshes every 30 seconds.</p>
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
  const status = `<div class="live-status" id="live-status" role="status" aria-live="polite" aria-atomic="true">${statusPill(d.status)}${counted}${turnout}${clock ? `<span id="live-count">${esc(clock)}</span>` : ""}<span>Checked <b>${checkedAt()} UTC</b></span></div>`;
  const trackerNote = d.id === "bc-2026" ? "The poll tracker below stays available before counting begins. " : "";
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
    ${d.id === "bc-2026" ? '<div id="bc-forecast"></div>' : ""}
    ${areas}
    ${d.notes ? `<div class="live-card"><p class="live-note" style="margin:0">${esc(d.notes)}</p></div>` : ""}
  `;
  renderFooter(d);
  if (d.id === "bc-2026") loadBcForecast(d);
}

async function loadElection(id) {
  if (!id) return;
  try {
    const d = await fetchJson(`../data/live/${encodeURIComponent(id)}.json`);
    const payload = JSON.stringify(d);
    if (payload === lastPayload) {
      currentData = d;
      updateCountdown();
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
    if (currentData && currentData.id === "bc-2026") renderElection(currentData);
  }, 150);
});

boot();
