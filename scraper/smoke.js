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

function checkGamma() {
  const g = globalThis.__600_gammaSample;
  if (!g) throw new Error('gammaSample hook missing');
  for (const alpha of [0.2, 0.5, 1, 5]) {
    let sum = 0;
    for (let i = 0; i < 5000; i++) {
      const x = g(alpha);
      if (!Number.isFinite(x) || x < 0) {
        throw new Error('gammaSample(' + alpha + ') returned ' + x);
      }
      sum += x;
    }
    const mean = sum / 5000;
    if (Math.abs(mean - alpha) > 0.15 * Math.max(1, alpha)) {
      throw new Error('gammaSample(' + alpha + ') mean ' + mean.toFixed(3) +
        ', expected ~' + alpha);
    }
  }
}

async function main() {
  const only = process.argv[2] || null;
  await globalThis.__600_loadAll();
  checkGamma();
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
      // Proxy parties carry synthetic map geography, not a last-election
      // result. When they are absent from the poll set they must stay out of
      // the forecast instead of being pinned to that proxy baseline.
      const proxies = mc.proxyParties || [];
      if (proxies.length) {
        const noPollVotes = Object.assign({}, votes);
        proxies.forEach((p) => { noPollVotes[p] = null; });
        const noPollFc = await globalThis.__600_forecast(cc, noPollVotes, 20, 10);
        for (const p of proxies) {
          if ((noPollFc.voteMeans[p] || 0) > 0.01) {
            throw new Error('unpolled proxy ' + p + ' leaked into the forecast');
          }
        }
      }
      const pd = mc.prDistricts || {};
      for (const nr of Object.keys(pd)) {
        try {
          globalThis.__600_districtshares(cc, nr, votes, false);
        } catch (e) {
          throw new Error('districtShares ' + nr + ': ' + e.message);
        }
      }
      // upper-chamber seat dots: every block-vote district must split, the
      // total must equal the chamber size, and where a pooled alliance
      // leads the district its members must win seats - the block vote
      // silently dropping pooled keys ('al:psoe+sumar') was exactly the
      // Spain Senate bug
      const sc = conf.senate;
      if (sc && sc.blockVote && sc.seatDistricts) {
        let tot = 0;
        for (const nr of Object.keys(sc.seatDistricts)) {
          const s = globalThis.__600_seatsplit(cc, nr, votes, false, 'senate');
          if (!s || s.length !== sc.seatDistricts[nr]) {
            throw new Error('senate split ' + nr + ': ' + (s ? s.length : 'null'));
          }
          tot += s.length;
          const sh = globalThis.__600_districtshares(cc, nr, votes, false, 'senate');
          if (sh && sc.alliances) {
            for (const a of sc.alliances) {
              if (a.provinces.indexOf(nr) < 0) continue;
              const pooled = a.parties.reduce((x, p) => x + ((sh[p] && sh[p].now) || 0), 0);
              let top = 0;
              for (const p of Object.keys(sh)) top = Math.max(top, sh[p].now || 0);
              if (pooled > top + 0.01 && pooled > 30) {
                const got = s.filter((p) => a.parties.indexOf(p) >= 0).length;
                if (got < 1) {
                  throw new Error('senate pool ' + a.parties.join('+') + ' leads ' + nr + ' but won no seats');
                }
              }
            }
          }
        }
        if (conf.upper && conf.upper.seats && tot !== conf.upper.seats) {
          throw new Error('senate split total ' + tot + ' != ' + conf.upper.seats);
        }
      }
      for (const f of [mc.svg, mc.map2 && mc.map2.svg]) {
        if (f && !fs.existsSync(path.join(ROOT, f))) {
          throw new Error('missing map file: ' + f);
        }
      }
      // a split country must still carry real map data after the geo merge
      if (fs.existsSync(path.join(ROOT, 'data', cc, 'geo.json'))) {
        const dataKeys = ['gebiete', 'districts', 'wkResults',
          'constituencies', 'results2022'];
        const mc2 = conf.map || {};
        const has = (mc2.svg && dataKeys.some((k) => mc2[k]
          && Object.keys(mc2[k]).length > 0));
        if (!has) throw new Error('geo.json present but the base map is empty');
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
