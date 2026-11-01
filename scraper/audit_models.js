// Audit the live forecast models for party-average distortions and
// non-normalised probability groups.
//
//   node scraper/audit_models.js
//
// Loads config.js + app.js with the same VM stub as forecast_run.js, then for
// every country compares the deployed poll average with the Monte Carlo mean
// and checks the mutually-exclusive probability groups.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const noop = () => {};

function stubEl() {
  return {
    style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, removeEventListener: noop, appendChild: noop, removeChild: noop,
    setAttribute: noop, removeAttribute: noop, getAttribute: () => null,
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getContext: () => null, innerHTML: '', textContent: '', value: '', width: 0, height: 0,
    toBlob: noop, toDataURL: () => '', getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, left: 0 }),
  };
}

global.window = globalThis;
globalThis.__600_SEATAPI__ = true;
global.addEventListener = noop;
global.removeEventListener = noop;
global.document = {
  addEventListener: noop, removeEventListener: noop,
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
  createElement: () => stubEl(), body: stubEl(), documentElement: stubEl(), head: stubEl(), title: '',
};
global.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
global.sessionStorage = global.localStorage;
global.location = { search: '', pathname: '/', hash: '', href: 'http://localhost/' };
global.navigator = { userAgent: 'node' };
global.matchMedia = () => ({ matches: false, addEventListener: noop, addListener: noop });
global.requestAnimationFrame = noop;
global.alert = noop;
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
global.fetch = async (url) => {
  const p = path.join(ROOT, String(url).replace(/^\//, ''));
  try {
    const body = fs.readFileSync(p, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  } catch (e) {
    return { ok: false, status: 404, json: async () => { throw e; }, text: async () => { throw e; } };
  }
};
process.on('unhandledRejection', () => {});

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'), { filename: 'config.js' });
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8'), { filename: 'app.js' });

for (const cc of Object.keys(COUNTRIES)) {
  try {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', cc, 'geo.json'), 'utf8'));
    if (g.map) COUNTRIES[cc].map = g.map;
    if (g.map2) COUNTRIES[cc].map2 = g.map2;
  } catch (e) { /* inline map */ }
}

function recent(polls, days) {
  if (days >= 1900 && days <= 2100)
    return polls.filter((p) => String(p.date || '').slice(0, 4) === String(days));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return polls.filter((p) => new Date(p.date) >= cutoff);
}

function effectiveDays(conf, polls) {
  let d = conf.defaultDays || 30;
  if (d === 30 && polls.length && !recent(polls, 30).length) {
    for (const w of [60, 90, 2026, 9999]) {
      if (recent(polls, w).length) { d = w; break; }
    }
  }
  return d;
}

function loadPolls(cc) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', cc, 'polls.json'), 'utf8'));
    return Array.isArray(j) ? j : (j.polls || []);
  } catch (e) {
    return [];
  }
}

function sum(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

async function audit() {
  const findings = [];
  const rows = [];
  for (const cc of Object.keys(COUNTRIES)) {
    const conf = COUNTRIES[cc];
    const polls = loadPolls(cc);
    if (!polls.length) continue;
    const windows = [];
    const d = effectiveDays(conf, polls);
    const current = recent(polls, d);
    if (current.length) windows.push(['last-' + d, current]);
    if (current.length !== polls.length) windows.push(['all', polls]);
    for (const [label, set] of windows) {
      const avg = await globalThis.__600_avg(cc, set, false);
      if (!avg || Object.values(avg).every((v) => v == null)) continue;
      const effects = globalThis.__600_pollster_effects(cc, set);
      const sim = await globalThis.__600_forecast(cc, avg, 500, set.length, null, effects);
      const means = sim.voteMeans || sim.means || {};
      const diffs = [];
      const scale = conf.seatBased ? 100 / conf.seats : 1;
      for (const [p, v] of Object.entries(avg)) {
        if (p === 'other' || v == null || means[p] == null) continue;
        const poll = v * scale;
        const delta = means[p] - poll;
        if (Math.abs(delta) >= 3)
          diffs.push({ party: p, poll: +poll.toFixed(2), forecast: +means[p].toFixed(2), delta: +delta.toFixed(2) });
      }
      const largest = sum(sim.largest) / sim.nSims * 100;
      const maj = sum(sim.maj) / sim.nSims * 100;
      const voteTotal = sum(means);
      const base = (conf.lastElection && conf.lastElection.results) || {};
      const newPartyDrift = diffs.filter((x) => (base[x.party] || 0) <= 0.05 && x.poll >= 5);
      if (diffs.length)
        findings.push({ country: cc, window: label, type: 'forecast-vs-poll', diffs });
      if (Math.abs(largest - 100) > 0.6)
        findings.push({ country: cc, window: label, type: 'largest-total', value: +largest.toFixed(2) });
      if (Math.abs(maj - 100) > 0.6)
        findings.push({ country: cc, window: label, type: 'majority-total', value: +maj.toFixed(2) });
      if (Math.abs(voteTotal - 100) > 1.5)
        findings.push({ country: cc, window: label, type: 'vote-total', value: +voteTotal.toFixed(2) });
      if (newPartyDrift.length)
        findings.push({ country: cc, window: label, type: 'new-party-drift', diffs: newPartyDrift });
      rows.push({ country: cc, window: label, polls: set.length, diffs: diffs.length,
        largest: +largest.toFixed(2), majority: +maj.toFixed(2), voteTotal: +voteTotal.toFixed(2) });
    }
  }
  console.log(JSON.stringify({ rows, findings }, null, 1));
}

audit().catch((e) => { console.error(e); process.exit(1); });
