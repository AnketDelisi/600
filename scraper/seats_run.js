// Run the app's real seat allocation offline, from the command line.
//
//   node scraper/seats_run.js <country> '{"pas":50.2,"psrm":24.2,...}'
//
// Loads js/config.js and js/app.js in a Node VM with a minimal DOM stub (the
// app's boot chain never runs; its loadData() rejection is swallowed) and
// calls the guarded __600_alloc hook. Prints the seat map as JSON. Used by
// scraper/backtest.py for seat-level scoring - no Python re-implementation of
// the model, so the harness can never drift from the app.
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

// the app's boot chain fetches poll data / constituencies / backtest JSON;
// serve those from disk instead of the network so the real load path works
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
  const cc = process.argv[2];
  const votes = JSON.parse(process.argv[3]);
  const total = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;
  await globalThis.__600_loadAll();
  const seats = await globalThis.__600_alloc(cc, votes, total);
  console.log(JSON.stringify(seats));
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
