// TEMP generic base-blend verifier: node scraper/blend_check.js <cc> <d1,d2,...>
// Prints the config's gebiete/prevGebiete/anchor/blend plus districtShares
// with an empty average (so projection `now` == the blended past exactly).
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
global.fetch = async () => ({ ok: false, status: 404, json: async () => { throw new Error('x'); }, text: async () => { throw new Error('x'); } });
process.on('unhandledRejection', () => {});

vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'), { filename: 'config.js' });
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8'), { filename: 'app.js' });

const cc = process.argv[2];
const districts = (process.argv[3] || '').split(',').filter(Boolean);
const cfg = JSON.parse(vm.runInThisContext(
  'JSON.stringify({g:COUNTRIES.' + cc + '.map.gebiete,' +
  'pv:COUNTRIES.' + cc + '.map.prevGebiete,' +
  'dist:COUNTRIES.' + cc + '.map.districts,' +
  'nat:COUNTRIES.' + cc + '.map.national2021,' +
  'pnat:COUNTRIES.' + cc + '.map.prevNational,' +
  'blend:COUNTRIES.' + cc + '.map.baseBlend,' +
  'po:Object.keys(COUNTRIES.' + cc + '.parties||{}).filter(function(p){' +
  'return COUNTRIES.' + cc + '.parties[p]&&COUNTRIES.' + cc + '.parties[p].pastOnly})})'));
const shares = {};
for (const d of districts) {
  shares[d] = {
    proj: globalThis.__600_districtshares(cc, d, {}, false),
    res: globalThis.__600_districtshares(cc, d, null, true),
  };
}
console.log(JSON.stringify({cfg, shares}));
