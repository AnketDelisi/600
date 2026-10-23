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
    ${areas}
    ${d.notes ? `<div class="live-card"><p class="live-note" style="margin:0">${esc(d.notes)}</p></div>` : ""}
  `;
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
