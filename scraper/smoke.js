// Boot every country through the app's real code paths and fail loudly.
//
//   node scraper/smoke.js            # all countries
//   node scraper/smoke.js turkey     # one country
//
// Loads js/config.js + js/app.js in a VM with DOM stubs (the same pattern
// seats_run.js uses), then per country: runs the Monte-Carlo forecast, the
// seat allocation, and a districtShares pass over every allocation
// district, and checks the map svg files exist. Exits 1 with a per-country
// report on any throw - a broken country page fails CI before it ships.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const noop = () => { };

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
process.on('unhandledRejection', () => { });

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'), { filename: 'config.js' });
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8'), { filename: 'app.js' });

// merge the split per-country map data (data/<cc>/geo.json) like the app
for (const cc of Object.keys(COUNTRIES)) {
  try {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', cc, 'geo.json'), 'utf8'));
    if (g.map) COUNTRIES[cc].map = g.map;
    if (g.map2) COUNTRIES[cc].map2 = g.map2;
  } catch (e) { /* inline map */ }
}


function ballotOf(conf) {
  const mc = conf.map || {};
  const nat = mc.national2021
    || (conf.lastElection && conf.lastElection.results)
    || {};
  const order = Array.isArray(conf.order) ? conf.order
    : (Array.isArray(conf.parlOrder) ? conf.parlOrder : Object.keys(nat));
  const votes = {};
  for (const p of order) {
    const v = nat[p];
    votes[p] = typeof v === 'number' ? v : 0;
  }
  return votes;
}

async function main() {
  const only = process.argv[2] || null;
  await globalThis.__600_loadAll();
  const rows = [];
  let bad = 0;
  const ccs = Object.keys(COUNTRIES).filter((c) => !only || c === only);
  for (const cc of ccs) {
    const conf = COUNTRIES[cc] || {};
    let err = '';
    try {
      const votes = ballotOf(conf);
      const fc = await globalThis.__600_forecast(cc, votes, 20, 10);
      if (!fc) throw new Error('forecast returned nothing');
      await globalThis.__600_alloc(cc, votes);
      const mc = conf.map || {};
      const pd = mc.prDistricts || {};
      for (const nr of Object.keys(pd)) {
        try {
          globalThis.__600_districtshares(cc, nr, votes, false);
        } catch (e) {
          throw new Error('districtShares ' + nr + ': ' + e.message);
        }
      }
      for (const f of [mc.svg, mc.map2 && mc.map2.svg]) {
        if (f && !fs.existsSync(path.join(ROOT, f))) {
          throw new Error('missing map file: ' + f);
        }
      }
    } catch (e) {
      err = e && e.message ? e.message : String(e);
      bad++;
    }
    rows.push([cc, err]);
  }
  for (const [cc, err] of rows) {
    console.log((err ? 'FAIL ' : 'ok   ') + cc.padEnd(22) + err);
  }
  console.log('---');
  console.log(rows.length + ' countries, ' + bad + ' failed');
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error('smoke crashed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
