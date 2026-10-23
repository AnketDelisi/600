/* 600 live results page. Data: data/live/index.json + data/live/<id>.json */
const LIVE_INDEX = "../data/live/index.json";
const liveRoot = document.getElementById("app");
const liveNav = document.getElementById("elections");
let liveId = new URLSearchParams(location.search).get("e") || null;
let liveTimer = null;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const num = (v) => (v == null ? "—" : Number(v).toLocaleString());
const pct = (v) => (v == null ? "—" : Number(v).toFixed(1) + "%");
const color = (e) => e.color || "#6C665B";

const BC_DAY = 24 * 60 * 60 * 1000;
const BC_PARTIES = [
  { id: "bcndp", name: "BC NDP", color: "#F4A460" },
  { id: "cpbc", name: "Conservatives", color: "#004AAD" },
  { id: "gpbc", name: "Greens", color: "#99C955" },
  { id: "onbc", name: "OneBC", color: "#C49B50" },
  { id: "cbc", name: "CentreBC", color: "#EE2D30" },
];
const BC_METHODS = {
  online: "Online panel", phone: "Telephone", face: "Face-to-face",
  mixed: "Mixed", "": "Not stated",
};
let bcPollsCache = null;

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
  const W = 960, H = 320, L = 42, R = 16, T = 18, B = 34;
  const values = [];
  for (const p of polls) for (const party of BC_PARTIES) {
    if (p.votes && p.votes[party.id] != null) values.push(p.votes[party.id]);
  }
  const maxValue = values.length ? Math.max(...values) : 0;
  const yMax = Math.max(50, Math.ceil((maxValue + 2) / 10) * 10);
  const x = (t) => L + ((t - start) / (end - start)) * (W - L - R);
  const y = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = [];
  for (let t = start; t <= end; t += 2 * BC_DAY) ticks.push(t);
  if (ticks[ticks.length - 1] !== end) ticks.push(end);
  const yTicks = [];
  for (let v = 0; v <= yMax; v += 10) yTicks.push(v);

  const grid = yTicks.map((v) => `
    <line class="grid" x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}"></line>
    <text class="axis" x="${L - 8}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`).join("");
  const xAxis = ticks.map((t) => `
    <text class="axis" x="${x(t)}" y="${H - 10}" text-anchor="middle">${shortDate(new Date(t).toISOString().slice(0, 10))}</text>`).join("");

  const paths = BC_PARTIES.map((party) => {
    const pts = [];
    for (let t = start; t <= end; t += BC_DAY) {
      const v = bcAverage(polls, party.id, t);
      if (v != null) pts.push([x(t), y(v)]);
    }
    if (pts.length < 2) return "";
    return `<path class="party-line" stroke="${party.color}" d="${pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ")}"></path>`;
  }).join("");

  const dots = [];
  for (const p of polls) {
    for (const party of BC_PARTIES) {
      const v = p.votes && p.votes[party.id];
      if (v == null) continue;
      const label = `${p.pollster} · ${shortDate(p.date)} · ${p.method || "method not stated"} · ${party.name} ${v.toFixed(1)}%`;
      dots.push(`<circle class="poll-dot" cx="${x(dayValue(p.date))}" cy="${y(v)}" r="3.2" fill="${party.color}"><title>${esc(label)}</title></circle>`);
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="British Columbia poll trend, final 14 days">
    ${grid}
    <line class="election-line" x1="${x(end)}" y1="${T}" x2="${x(end)}" y2="${H - B}"></line>
    <text class="axis" x="${x(end) - 5}" y="${T + 10}" text-anchor="end">Election day</text>
    ${paths}
    ${dots.join("")}
    ${xAxis}
  </svg>`;
}

function bcPollTable(polls) {
  const rows = polls.map((p) => `<tr>
    <td>${esc(shortDate(p.date))}</td>
    <td>${esc(p.pollster)}</td>
    <td>${esc(BC_METHODS[p.method] || p.method || "Not stated")}</td>
    <td class="num">${num(p.n)}</td>
    ${BC_PARTIES.map((party) => `<td class="num">${p.votes && p.votes[party.id] != null ? Number(p.votes[party.id]).toFixed(1) : "—"}</td>`).join("")}
  </tr>`).join("");
  return `<div class="live-table-wrap"><table class="live-table live-polls">
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
    .sort((a, b) => a.date.localeCompare(b.date) || a.pollster.localeCompare(b.pollster));
  if (!polls.length) return "";
  const latest = BC_PARTIES.map((party) => ({
    ...party, value: bcAverage(polls, party.id, end),
  })).filter((party) => party.value != null);
  const summary = latest.map((party) =>
    `<span><i style="background:${party.color}"></i>${esc(party.name)} <b>${party.value.toFixed(1)}%</b></span>`
  ).join("");
  const houses = new Set(polls.map((p) => p.pollster)).size;
  return `<section class="live-card" id="bc-forecast">
    <h2>BC forecast · last 14 days</h2>
    <p class="live-note">Every published poll in the final 14 days, all pollsters and methods. Dots are individual polls; lines are the 600 recency-weighted average. The table lists every poll behind the chart; where the source does not state a method, it says “Not stated”.</p>
    <div class="live-forecast-summary">${summary}</div>
    <div class="live-sub">${polls.length} polls · ${houses} pollsters · ${esc(shortDate(new Date(start).toISOString().slice(0, 10)))}–${esc(shortDate(data.date))}</div>
    <div class="live-chart">${bcChart(polls, start, end)}</div>
    <div class="live-chart-legend">${BC_PARTIES.map((party) => `<span><i style="background:${party.color}"></i>${esc(party.name)}</span>`).join("")}<span>Dots: every poll</span></div>
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
      const r = await fetch("../data/bc/polls.json", { cache: "no-store" });
      if (!r.ok) throw new Error("No BC polls");
      bcPollsCache = await r.json();
    }
    el.outerHTML = bcForecastHtml(data, bcPollsCache);
  } catch (err) {
    el.remove();
    console.error(err);
  }
}

async function loadIndex() {
  const r = await fetch(LIVE_INDEX, { cache: "no-store" });
  if (!r.ok) throw new Error("No live index");
  return r.json();
}

function renderNav(elections) {
  liveNav.innerHTML = elections.map((e) => `
    <button data-id="${esc(e.id)}" class="${e.id === liveId ? "active" : ""}">${esc(e.name)}</button>
  `).join("");
  liveNav.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      liveId = b.dataset.id;
      history.replaceState(null, "", `?e=${encodeURIComponent(liveId)}`);
      renderNav(elections);
      loadElection(liveId);
    });
  });
}

function statusText(s) {
  return ({ waiting: "Waiting for results", counting: "Counting", final: "Final" })[s] || s || "Waiting";
}

function renderElection(d) {
  const entries = d.entries || [];
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
  if (d.seat_total) {
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
      <table class="live-table">
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
      </table>
    </div>` : "";

  const counted = d.counted == null ? "" :
    `<span><b>${num(d.counted)}</b> / ${num(d.total)} ${esc(d.counted_label || "counted")}</span>`;
  const turnout = d.turnout == null ? "" : `<span>Turnout <b>${pct(d.turnout)}</b></span>`;
  const updated = d.updated_at ? `<span>Updated <b>${esc(d.updated_at)}</b></span>` : "";
  const status = `<span>Status <b>${esc(statusText(d.status))}</b></span>`;

  liveRoot.innerHTML = `
    <section class="live-head">
      <div>
        <h1>${esc(d.name)}</h1>
        <div class="sub">${esc(d.date || "")}${d.subtitle ? " · " + esc(d.subtitle) : ""}</div>
      </div>
      <div class="live-status">${status}${counted}${turnout}${updated}</div>
    </section>
    ${d.status === "waiting" && !entries.some((e) => Number(e.pct) > 0)
      ? `<div class="live-card"><div class="live-wait">${esc(d.waiting_text || "Waiting for the first official results.")}<br>This page refreshes automatically.</div></div>`
      : `<div class="live-card">
          <h2>${esc(d.result_title || "Result")}</h2>
          <p class="live-note">${esc(d.result_note || "Vote share as reported by the source.")}</p>
          <div class="live-bars">${bars}</div>
          ${seats}
          <div class="live-source">${d.source_url ? `Source: <a href="${esc(d.source_url)}" target="_blank" rel="noopener">${esc(d.source || d.source_url)}</a>` : `Source: ${esc(d.source || "—")}`}</div>
        </div>`}
    ${d.id === "bc-2026" ? '<div id="bc-forecast"></div>' : ""}
    ${areas}
    ${d.notes ? `<div class="live-card"><p class="live-note" style="margin:0">${esc(d.notes)}</p></div>` : ""}
  `;
  if (d.id === "bc-2026") loadBcForecast(d);
}

async function loadElection(id) {
  if (!id) return;
  try {
    const r = await fetch(`../data/live/${encodeURIComponent(id)}.json`, { cache: "no-store" });
    if (!r.ok) throw new Error("No data");
    renderElection(await r.json());
  } catch (err) {
    liveRoot.innerHTML = `<div class="live-error">Could not load ${esc(id)}. The election may not have started yet.</div>`;
    console.error(err);
  }
}

async function boot() {
  try {
    const data = await loadIndex();
    const elections = data.elections || data;
    if (!liveId || !elections.some((e) => e.id === liveId)) {
      const active = elections.find((e) => e.status === "counting")
        || elections.find((e) => e.status === "waiting")
        || elections[0];
      liveId = active && active.id;
    }
    renderNav(elections);
    await loadElection(liveId);
    clearInterval(liveTimer);
    liveTimer = setInterval(() => {
      if (!document.hidden) loadElection(liveId);
    }, 30000);
  } catch (err) {
    liveRoot.innerHTML = '<div class="live-error">No live results configured yet.</div>';
    console.error(err);
  }
}

boot();
