// Run the app's real Monte Carlo forecast offline, from the command line.
//
//   node scraper/forecast_run.js <country> '{"sds":30.4,...}' [nSims] [nPolls]
//
// Loads js/config.js and js/app.js in a Node VM with a minimal DOM stub (the
// same stub seats_run.js uses) and calls the guarded __600_forecast hook.
// Prints the slim summary JSON: {maj:{rg,td,hung,km}, largest, means,
// medians, modal, nSims}. Used by scraper/backtest.py for the probability
// calibration - no Python re-implementation of the model, so the harness can
// never drift from the app.
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
globalThis.__600_BACKTEST_MODE__ = true;
globalThis.__600_SEATAPI__ = true;
global.addEventListener = noop;
global.removeEventListener = noop;
global.document = {
  addEventListener: noop, removeEventListener: noop,
  querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null, createElement: () => stubEl(),
  body: stubEl(), documentElement: stubEl(), head: stubEl(), title: '',
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

async function main() {
  // <country> <polls-json> [nSims] [nPolls] [horizon] [effects|base]
  const cc = process.argv[2];
  const pollsArg = process.argv[3];
  const polls = JSON.parse(pollsArg.startsWith('@')
    ? fs.readFileSync(pollsArg.slice(1), 'utf8') : pollsArg);
  const nSims = process.argv[4] ? parseInt(process.argv[4], 10) : 1500;
  const nPolls = process.argv[5] ? parseInt(process.argv[5], 10) : 20;
  const horizonArg = process.argv[6];
  const horizon = horizonArg !== undefined && horizonArg !== '' &&
    Number.isFinite(Number(horizonArg)) ? Number(horizonArg) : null;
  const withEffects = process.argv[7] === 'effects';
  await globalThis.__600_loadAll(cc);
  for (const id of Object.keys(COUNTRIES)) {
    try {
      const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', id, 'geo.json'), 'utf8'));
      if (g.map) COUNTRIES[id].map = g.map;
      if (g.map2) COUNTRIES[id].map2 = g.map2;
    } catch (e) { /* inline map */ }
  }
  const avg = globalThis.__600_avg(cc, polls, false);
  const effects = withEffects ? globalThis.__600_pollster_effects(cc, polls) : null;
  const summary = await globalThis.__600_forecast(
    cc, avg, nSims, nPolls, horizon, effects);
  summary.effectsCount = effects ? effects.length : 0;
  console.log(JSON.stringify(summary));
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
