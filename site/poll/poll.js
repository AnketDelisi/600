/* 600 — Poll Image Generator
 * Config-driven: any country in js/config.js (COUNTRIES) works automatically:
 * party order, colors, English names, logos, and last-election baseline.
 * Renders a clean double-bar chart (70% poll vs 30% last election, side by
 * side) with each party's logo on a color square + abbreviation, plus the
 * 600logo.svg header.
 */
(function () {
  'use strict';

  function dataBase() {
    const s = document.querySelector('script[src*="poll.js"]');
    if (s) {
      let src = s.getAttribute('src') || '';
      const i = src.lastIndexOf('js/poll.js');
      if (i > 0) return src.slice(0, i);
    }
    return '../';
  }
  const BASE = dataBase();

  const THEMES = {
    white: { bg: '#FFFFFF', surface: '#FFFFFF', ink: '#161616', muted: '#6B665C', edge: '#1A1A1A' },
    dark:  { bg: '#161616', surface: '#242424', ink: '#FDFBF4', muted: '#A8A39B', edge: '#FDFBF4' },
  };

  const OUT_MONO = '"Source Code Pro","Source Code Pro",ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace';

  /* ---------- image cache ---------- */
  const imgCache = {};
  function loadImg(src) {
    return new Promise((resolve) => {
      if (src in imgCache) return resolve(imgCache[src]);
      const im = new Image();
      im.onload = () => { imgCache[src] = im; resolve(im); };
      im.onerror = () => { imgCache[src] = null; resolve(null); };
      im.src = src;
    });
  }

  /* ---------- dom ---------- */
  const $ = (id) => document.getElementById(id);
  const canvas = $('preview-canvas');
  const cctx = canvas.getContext('2d');
  const countrySel = $('country-select');
  const formatSel = $('format-sel');
  const titleInput = $('title-input');
  const dateInput = $('date-input');
  const partiesBody = $('parties-body');
  const prefillMsg = $('prefill-msg');
  const pollSel = $('poll-select');
  const renderBtn = $('render-btn');
  const downloadBtn = $('download-btn');
  const textPanel = $('text-panel');
  const textOut = $('text-out');
  const copyBtn = $('copy-btn');
  const txtDlBtn = $('txt-dl-btn');
  const imgActions = $('img-actions');
  const txtActions = $('txt-actions');
  const chartSeg = $('chart-seg');
  const headingInput = $('heading-input');
  const addPartyBtn = $('add-party-btn');
  const customHint = $('custom-hint');
  const partiesThead = document.querySelector('.parties-table thead');

  let COUNTRIES_DEF = {};
  try { COUNTRIES_DEF = (typeof COUNTRIES !== 'undefined') ? COUNTRIES : {}; } catch (e) { /* config not loaded */ }

  /* ---------- custom mode: own parties, own logos ---------- */
  const CUSTOM_KEY = '__custom';
  const CUSTOM_COLORS = ['#1A4C8B', '#D71920', '#6AB023', '#F58220', '#7C3AED', '#0F8753', '#6B7280', '#A81A32'];
  let CUSTOM = [];
  let customSeq = 0;
  function newCustomRow() {
    const i = customSeq++;
    return { id: 'c' + i, code: '', color: CUSTOM_COLORS[i % CUSTOM_COLORS.length], poll: '', last: '', logo: '' };
  }
  for (let i = 0; i < 5; i++) CUSTOM.push(newCustomRow());
  function isCustom() { return countrySel.value === CUSTOM_KEY; }
  function customConfig() {
    const order = [], parties = {}, logos = {};
    CUSTOM.forEach((r) => {
      order.push(r.id);
      parties[r.id] = { code: (r.code || '').trim() || r.id.toUpperCase(), color: r.color || '#888' };
      if (r.logo) logos[r.id] = r.logo;
    });
    return { name: (headingInput && headingInput.value.trim()) || 'Custom', order: order,
             parties: parties, logos: logos, lastElection: null, seatBased: false };
  }
  /* ---------- built-in presets: fixed party sets, editable numbers ---------- */
  const PRESETS = {
    __brleg: {
      name: 'Brazil — Legislative',
      order: ['pt', 'pl', 'pp', 'uniao', 'psd', 'mdb', 'prb', 'psdb', 'pdt', 'psb', 'psol', 'novo', 'pode', 'cidadania', 'pv', 'rede', 'solidariedade', 'avante', 'prd', 'missao', 'upb', 'pcdob', 'febrasil', 'psolrede', 'prdsolidariedade', 'psdbcdadania'],
      parties: {
        pt: { code: 'PT', color: '#E20E28' },
        pl: { code: 'PL', color: '#015AAA' },
        pp: { code: 'PP', color: '#203F71' },
        uniao: { code: 'UNIÃO', color: '#2FBEF2' },
        psd: { code: 'PSD', color: '#FFA500' },
        mdb: { code: 'MDB', color: '#30914D' },
        prb: { code: 'REP', color: '#0070C5' },
        psdb: { code: 'PSDB', color: '#0080FF' },
        pdt: { code: 'PDT', color: '#C21E56' },
        psb: { code: 'PSB', color: '#FFCC00' },
        psol: { code: 'PSOL', color: '#E2202A' },
        novo: { code: 'NOVO', color: '#F3701B' },
        pode: { code: 'PODE', color: '#2DA933' },
        cidadania: { code: 'CIDADANIA', color: '#EC008C' },
        pv: { code: 'PV', color: '#006600' },
        rede: { code: 'REDE', color: '#379E8D' },
        solidariedade: { code: 'SOLID', color: '#FF9C2B' },
        avante: { code: 'AVANTE', color: '#088F8F' },
        prd: { code: 'PRD', color: '#008000' },
        missao: { code: 'MISSÃO', color: '#FDBF35' },
        upb: { code: 'UP', color: '#000000' },
        pcdob: { code: 'PCdoB', color: '#820000' },
        febrasil: { code: 'FE BRASIL', color: '#FF0000' },
        psolrede: { code: 'PSOL/REDE', color: '#E2202A' },
        prdsolidariedade: { code: 'PRD/SOLID', color: '#008000' },
        psdbcdadania: { code: 'PSDB/CID', color: '#0080FF' },
      },
      logos: {
        pt: 'img/br/PT.svg', pl: 'img/br/PL.svg', pp: 'img/br/PP.svg',
        uniao: 'img/br/UNIAO.svg', psd: 'img/br/PSD.svg', mdb: 'img/br/MDB.svg',
        prb: 'img/br/PRB.svg', psdb: 'img/br/PSDB.svg', pdt: 'img/br/PDT.svg',
        psb: 'img/br/PSB.svg', psol: 'img/br/PSOL.svg', novo: 'img/br/NOVO.svg',
        pode: 'img/br/PODE.svg', cidadania: 'img/br/CIDADANIA.svg',
        pv: 'img/br/PV.svg', rede: 'img/br/REDE.svg',
        solidariedade: 'img/br/Solidariedade.svg', avante: 'img/br/AVANTE.svg',
        prd: 'img/br/PRD.svg', missao: 'img/br/MISSAO.svg',
        upb: 'img/br/UPB.svg', pcdob: 'img/br/PCDoB.svg',
        febrasil: 'img/br/FEBRASIL.svg', psolrede: 'img/br/PSOLREDE.svg',
        prdsolidariedade: 'img/br/PRDSolidariedade.svg',
        psdbcdadania: 'img/br/PSDBCIDADANIA.svg',
      },
      lastElection: null, seatBased: false, directNumbers: true,
    },
  };
  function isPreset() { return !!PRESETS[countrySel.value]; }
  function activeConfig() {
    if (isCustom()) return customConfig();
    if (isPreset()) return PRESETS[countrySel.value];
    return COUNTRIES_DEF[countrySel.value];
  }
  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  /* ---------- helpers ---------- */
  function num(v) {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function fmt(v) {
    const r = Math.round(v * 10) / 10;
    return (r % 1 !== 0) ? r.toFixed(1) : String(r);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- seat projection (port of site/js/app.js allocation logic) ---------- */
  function seatDistrictShares(c, nr, avg) {
    const conf = (c && c.map) || {};
    let base;
    if (conf.wkResults && conf.wkResults[String(nr)]) base = conf.wkResults[String(nr)];
    else {
      const gArr = conf.districts ? conf.districts[String(nr)] : null;
      if (!gArr) return null;
      base = conf.gebiete[gArr];
    }
    const nat = conf.national2021 || (c.lastElection ? c.lastElection.results : {});
    const out = {};
    (c.order || []).forEach((p) => {
      const past = base[p] || 0;
      const swing = (avg && avg[p] !== undefined) ? ((avg[p] || 0) - (nat[p] || 0)) : 0;
      out[p] = { past: past, now: Math.max(0, past + swing) };
    });
    return out;
  }

  function seatDistrictWinner(c, nr, avg) {
    const shares = seatDistrictShares(c, nr, avg);
    if (!shares) return null;
    let best = null, bestV = -1;
    (c.order || []).forEach((p) => { if (shares[p].now > bestV) { bestV = shares[p].now; best = p; } });
    return best;
  }

  function seatDirectMandates(c, avg) {
    const out = {};
    (c.order || []).forEach((p) => { out[p] = 0; });
    const conf = (c && c.map) || {};
    if (!conf || !conf.districts) return out;
    Object.keys(conf.districts).forEach((nr) => {
      const w = seatDistrictWinner(c, parseInt(nr, 10), avg);
      if (w) out[w]++;
    });
    return out;
  }

  function seatHareNiemeyer(c, votes, total) {
    const threshold = Number(c.threshold || 0);
    const valid = (c.order || []).filter((p) => (votes[p] || 0) >= threshold);
    const totalVotes = valid.reduce((a, p) => a + (votes[p] || 0), 0);
    const quota = (totalVotes / total) || 1;
    const out = {}; const rems = []; let given = 0;
    valid.forEach((p) => {
      const q = (votes[p] || 0) / quota, fl = Math.floor(q);
      out[p] = fl; given += fl; rems.push([q - fl, p]);
    });
    let left = Math.max(0, total - given);
    rems.sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < left && i < rems.length; i++) out[rems[i][1]]++;
    return out;
  }

  function seatOverhang(c, votes, totalBase, direct, cap) {
    cap = cap || totalBase;
    let total = totalBase;
    for (let it = 0; it < 200; it++) {
      const seats = seatHareNiemeyer(c, votes, total);
      let deficit = 0;
      (c.order || []).forEach((p) => { const d = direct[p] || 0; if (seats[p] < d) deficit += d - seats[p]; });
      if (deficit <= 0) return seats;
      if (total === cap) break;
      total = Math.min(total + deficit, cap);
    }
    const s = seatHareNiemeyer(c, votes, total);
    (c.order || []).forEach((p) => { if (s[p] < (direct[p] || 0)) s[p] = direct[p] || 0; });
    return s;
  }

  function seatDivisor(c, votes, total) {
    const threshold = Number(c.threshold || 0);
    const method = c.method || 'sainte_lague';
    const valid = (c.order || []).filter((p) => (votes[p] || 0) >= threshold);
    const totalVotes = valid.reduce((a, p) => a + (votes[p] || 0), 0);
    if (totalVotes === 0) return {};
    const seats = {};
    valid.forEach((p) => { seats[p] = 0; });
    const divisors = [];
    for (let i = 1; i <= total; i++) divisors.push(method === 'dhondt' ? i : (i === 1 ? 1.2 : 2 * i - 1));
    const quota = [];
    valid.forEach((p) => { for (let d = 0; d < divisors.length; d++) quota.push({ party: p, q: (votes[p] || 0) / divisors[d] }); });
    quota.sort((a, b) => b.q - a.q);
    for (let i = 0; i < total && i < quota.length; i++) seats[quota[i].party]++;
    return seats;
  }

  /* seat projection from the poll's numbers (vote % or seat counts) */
  function seatCalc(c, votes) {
    const total = Number(c.seats || 0);
    if (!total) return {};
    if (c.overhang) return seatOverhang(c, votes, total, seatDirectMandates(c, votes), Number(c.overhang.cap || c.seats));
    if (c.method === 'hare_niemeyer') return seatHareNiemeyer(c, votes, total);
    return seatDivisor(c, votes, total);
  }

  /* recolor a monochrome logo (black glyph on transparent) to any color */
  function tintedLogo(img, color, w, h) {
    const oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const o = oc.getContext('2d');
    o.drawImage(img, 0, 0, w, h);
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = color;
    o.fillRect(0, 0, w, h);
    return oc;
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function isoDate(iso) {
    const parts = String(iso).split('-').map(Number);
    if (parts.length !== 3 || parts.some((p) => !isFinite(p))) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return (isNaN(d)) ? null : d;
  }
  /* "2026-09-06 – 2026-09-09" -> "6–9 September" */
  function fmtDateRange(a, b) {
    const da = isoDate(a), db = isoDate(b);
    if (!da && !db) return '';
    if (!db) return formatSingle(da || isoDate(a));
    if (!da) return formatSingle(db);
    if (db - da < 0) return formatSingle(da);
    const ya = da.getFullYear(), yb = db.getFullYear();
    const cur = new Date().getFullYear();
    const day = (d) => d.getDate();
    if (da.getMonth() === db.getMonth() && ya === yb) {
      const s = (day(da) === day(db) ? String(day(da)) : day(da) + '–' + day(db)) + ' ' + MONTHS[da.getMonth()];
      return ya === cur ? s : s + ' ' + ya;
    }
    if (ya === yb) {
      const s = day(da) + ' ' + MONTHS[da.getMonth()] + ' – ' + day(db) + ' ' + MONTHS[db.getMonth()];
      return ya === cur ? s : s + ' ' + ya;
    }
    return day(da) + ' ' + MONTHS[da.getMonth()] + ' ' + ya + ' – ' + day(db) + ' ' + MONTHS[db.getMonth()] + ' ' + yb;
  }
  function formatSingle(d) {
    if (!d) return '';
    return fmtDateRange(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(), d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
  }

  /* ---------- build party rows ---------- */
  function buildRows() {
    if (isCustom()) {
      if (chartSeg) chartSeg.style.display = '';
      if (addPartyBtn) addPartyBtn.hidden = false;
      if (customHint) customHint.hidden = false;
      if (partiesThead) partiesThead.innerHTML = '<tr><th>Party</th><th>Color</th><th>Poll</th><th>Last election</th><th>Logo</th><th></th></tr>';
      partiesBody.innerHTML = CUSTOM.map((r, i) =>
        '<tr>' +
        '<td><input class="code-in" data-pid="' + r.id + '" type="text" value="' + escAttr(r.code) + '" placeholder="P' + (i + 1) + '" style="width:74px;font-weight:800;font-size:13px;font-family:var(--font);padding:6px 8px;border:2px solid var(--c-border);border-radius:var(--radius-sm);background:var(--c-surface);color:var(--c-text-main)"></td>' +
        '<td><input class="color-in" data-pid="' + r.id + '" type="color" value="' + escAttr(r.color) + '" style="width:34px;height:28px;padding:0;border:2px solid var(--c-border);border-radius:var(--radius-sm);background:var(--c-surface)"></td>' +
        '<td><input class="poll-in" data-pid="' + r.id + '" type="number" step="0.1" min="0" value="' + escAttr(r.poll) + '"></td>' +
        '<td><input class="last-in" data-pid="' + r.id + '" type="number" step="0.1" min="0" value="' + escAttr(r.last) + '"></td>' +
        '<td><input class="logo-in" data-pid="' + r.id + '" type="file" accept="image/*" style="width:116px;font-size:10px">' + (r.logo ? '<span style="font-size:10px;font-weight:800;color:#0B9E17"> &#10003;</span>' : '') + '</td>' +
        '<td><button class="rm-btn" data-rm="' + r.id + '" title="Remove" style="border:none;background:none;font-weight:900;font-size:14px;color:#B91C1C;cursor:pointer">&#10005;</button></td>' +
        '</tr>').join('');
      return;
    }
    if (addPartyBtn) addPartyBtn.hidden = true;
    if (customHint) customHint.hidden = true;
    if (partiesThead) partiesThead.innerHTML = '<tr><th>Party</th><th>Poll</th><th>Last election</th></tr>';
    const c = activeConfig();
    partiesBody.innerHTML = '';
    if (!c) return;
    if (chartSeg) chartSeg.style.display = c.seatBased ? 'none' : '';
    (c.order || []).forEach((pid) => {
      const meta = c.parties[pid] || {};
      if (meta.pastOnly) return; // dissolved alliances: baseline only, no input row
      const tr = document.createElement('tr');
      const nameLbl = meta.name_en || meta.name || pid;
      tr.innerHTML =
        '<td><span class="party-id">' + pid + '</span><span class="party-sw" style="background:' + (meta.color || '#888') + '"></span>' +
        '<span style="font-size:12px;color:#5F584E">' + nameLbl + '</span></td>' +
        '<td><input type="number" step="0.1" min="0" class="poll-in" data-pid="' + pid + '" value="0"></td>' +
        '<td><input type="number" step="0.1" min="0" class="last-in" data-pid="' + pid + '" value="0"></td>';
      partiesBody.appendChild(tr);
    });
    // pre-fill last election baseline (seats for seat-based systems, % otherwise)
    const le = c.lastElection ? (c.seatBased ? c.lastElection.seats : c.lastElection.results) || {} : {};
    (c.order || []).forEach((pid) => {
      const inp = partiesBody.querySelector('.last-in[data-pid="' + pid + '"]');
      if (inp && pid in le) inp.value = le[pid];
    });
  }

  function readResults() {
    if (isCustom()) {
      CUSTOM.forEach((r) => {
        const q = (cls) => partiesBody.querySelector('.' + cls + '[data-pid="' + r.id + '"]');
        const codeEl = q('code-in'), colEl = q('color-in');
        if (codeEl) r.code = codeEl.value;
        if (colEl) r.color = colEl.value;
        r.poll = num((q('poll-in') || {}).value);
        r.last = num((q('last-in') || {}).value);
      });
    }
    const c = activeConfig();
    const order = c ? (c.order || []) : [];
    const poll = {}, last = {};
    order.forEach((pid) => {
      poll[pid] = num((partiesBody.querySelector('.poll-in[data-pid="' + pid + '"]') || {}).value);
      last[pid] = num((partiesBody.querySelector('.last-in[data-pid="' + pid + '"]') || {}).value);
    });
    return { order, poll, last };
  }

  /* ---------- poll loader (from site data) ---------- */
  let POLL_LIST = [];

  function pollLabel(p) {
    let when = '';
    if (p.fieldwork_start && p.date) when = fmtDateRange(p.fieldwork_start, p.date);
    else if (p.date) when = formatSingle(isoDate(p.date));
    return (p.pollster || 'Poll') + (when ? ' · ' + when : '');
  }

  async function loadPolls() {
    const tid = countrySel.value;
    if (isCustom() || isPreset()) {
      POLL_LIST = [];
      pollSel.innerHTML = '<option value="">—</option>';
      pollSel.disabled = true;
      prefillMsg.textContent = isPreset()
        ? 'Preset — enter your own numbers (or pick a poll above).'
        : 'Custom mode — enter your own numbers and logos.';
      titleInput.value = '';
      dateInput.value = '';
      render();
      return;
    }
    pollSel.disabled = false;
    const c = COUNTRIES_DEF[tid];
    pollSel.innerHTML = '<option value="">Loading polls…</option>';
    try {
      const resp = await fetch(BASE + 'data/' + tid + '/polls.json?v=' + Date.now());
      if (!resp.ok) throw new Error('no data');
      const data = await resp.json();
      POLL_LIST = (data && data.polls) || [];
      if (!POLL_LIST.length) throw new Error('empty');
      pollSel.innerHTML = POLL_LIST.map((p, i) => '<option value="' + i + '">' + pollLabel(p) + '</option>').join('');
      pollSel.value = '0';
      loadPoll(POLL_LIST[0]);
    } catch (e) {
      POLL_LIST = [];
      pollSel.innerHTML = '<option value="">No poll data</option>';
      prefillMsg.textContent = 'No poll data found for this country — enter values manually.';
    }
  }

  function loadPoll(p) {
    if (!p) return;
    const c = COUNTRIES_DEF[countrySel.value];
    titleInput.value = p.pollster || '';
    const nTxt = p.n ? ' · n = ' + Number(p.n).toLocaleString('en-US') : '';
    let dateTxt = '';
    if (p.fieldwork_start && p.date) dateTxt = fmtDateRange(p.fieldwork_start, p.date);
    else if (p.date) dateTxt = formatSingle(isoDate(p.date));
    dateInput.value = (dateTxt || (p.date || '')) + nTxt;
    const votes = p.votes || p.result || null;
    if (c && votes) {
      (c.order || []).forEach((pid) => {
        const inp = partiesBody.querySelector('.poll-in[data-pid="' + pid + '"]');
        if (inp) inp.value = (pid in votes) ? votes[pid] : 0;
      });
    }
    prefillMsg.textContent = 'Loaded "' + (p.pollster || 'poll') + '" for ' + (c ? c.name : tid) + '.';
    render();
  }

  /* ---------- shared display state ---------- */
  function currentState() {
    const tid = countrySel.value;
    const custom = isCustom();
    // read the inputs first (custom rows sync into CUSTOM), then build
    // the config from the fresh state
    const { order, poll, last } = readResults();
    const c = activeConfig();
    const chartEl = document.querySelector('input[name="chart"]:checked');
    const seatsMode = (c && c.seatBased) ? true : (chartEl ? chartEl.value === 'seats' : false);
    let now, prev, total, display;
    // placeholder parties (dissolved alliances) never appear in polls/forecasts
    const activeOrder = (c.order || []).filter((p) => !((c.parties[p] || {}).pastOnly));
    const direct = (c && (c.seatBased || c.directNumbers)) || custom;   // entered numbers used as-is
    if (seatsMode) {
      now = direct ? poll : seatCalc(c, poll);
      prev = (custom || (c && c.directNumbers)) ? last : ((c && c.lastElection && c.lastElection.seats) ? c.lastElection.seats : {});
      total = direct ? ((c && c.seatBased) ? Number(c.seats || 0) : (c.order || []).reduce((a, p) => a + (now[p] || 0), 0))
                     : (c.order || []).reduce((a, p) => a + (now[p] || 0), 0);
      display = activeOrder.filter((p) => (now[p] || 0) > 0).sort((a, b) => (now[b] || 0) - (now[a] || 0));
      if (!display.length) display = activeOrder.slice();
    } else {
      now = poll; prev = last; total = 0;
      const directSort = custom || (c && c.directNumbers);
      display = activeOrder.filter((p) => (now[p] || 0) > 0)
        .sort(directSort ? (a, b) => (now[b] || 0) - (now[a] || 0) : (a, b) => (prev[b] || 0) - (prev[a] || 0));
      if (!display.length) display = activeOrder.slice();
    }
    return { tid: tid, c: c, state: { order: order, poll: poll, last: last }, seatsMode: seatsMode, now: now, prev: prev, total: total, display: display };
  }

  /* ---------- text share output (EuropeElects style) ---------- */
  function updateText() {
    const { tid, c, seatsMode, now, prev, display } = currentState();
    if (!c) { textOut.value = ''; return; }
    const abbr = (p) => (c.parties[p] || {}).code || p;
    const val = (p) => { const v = Math.round(now[p] || 0); return seatsMode ? String(v) : String(v) + '%'; };
    const delta = (p) => {
      const d = Math.round((now[p] || 0) - (prev[p] || 0));
      return d === 0 ? '' : ' (' + (d > 0 ? '+' : '') + d + ')';
    };
    const pollster = titleInput.value.trim();
    const lines = [];
    lines.push((c.name || tid) + ', ' + (pollster || 'poll') + (seatsMode ? ' seat projection:' : ' poll:'));
    lines.push(display.map((p) => abbr(p) + ': ' + val(p) + delta(p)).join(' '));
    const le = c.lastElection;
    if (le) {
      const yr = le.date ? le.date.slice(0, 4) : '';
      lines.push(yr ? '+/- vs. ' + yr + ' election' : '+/- vs. last election');
    }
    const m = dateInput.value.trim().match(/^(.*?)\s*·\s*n\s*=\s*([\d,]+)$/i);
    const fw = m ? m[1].trim() : dateInput.value.trim();
    const n = m ? m[2] : '';
    if (fw) lines.push('Fieldwork: ' + fw);
    if (n) lines.push('Sample size: ' + n);
    lines.push('➤ anketdelisi.github.io/600');
    textOut.value = lines.join('\n');
  }

  /* ---------- rendering ---------- */
  async function render() {
    const { tid, c, seatsMode, now, prev, total, display } = currentState();
    if (!c) return;

    const visualOrder = display;

    // theme
    const bgVal = document.querySelector('input[name="bg"]:checked');
    const th = THEMES[bgVal ? bgVal.value : 'white'];

    // size
    const fmtSel = formatSel.value.split('x').map(Number);
    const W = fmtSel[0], H = fmtSel[1];
    canvas.width = W; canvas.height = H;
    cctx.fillStyle = th.bg;
    cctx.fillRect(0, 0, W, H);
    cctx.textBaseline = 'alphabetic';
    cctx.textAlign = 'center';

    const useLogos = (c.logos || {});

    // header
    const padTop = Math.round(H * 0.045);
    const logoH = Math.round(clamp(H * 0.055, 30, 54));
    const logoImg = await loadImg(BASE + 'img/600logo.svg');
    if (logoImg) {
      const iw = logoImg.naturalWidth || 100, ih = logoImg.naturalHeight || 100;
      const logoW = Math.round(logoH * (iw / ih));
      cctx.drawImage(tintedLogo(logoImg, th.ink, logoW, logoH), (W - logoW) / 2, padTop, logoW, logoH);
    }

    const countryName = c.name || tid;
    const headOverride = headingInput ? headingInput.value.trim() : '';
    const headerTxt = headOverride || (countryName + (seatsMode ? ' — Seat Projection' : ' — Poll'));
    const titleFont = clamp(Math.round(W * 0.026), 22, 34);
    cctx.font = '900 ' + titleFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    cctx.fillStyle = th.ink;
    const headY = padTop + logoH + titleFont * 1.05;
    cctx.fillText(headerTxt, W / 2, headY);

    // seats total note (top-right)
    if (seatsMode) {
      cctx.textAlign = 'right';
      cctx.font = Math.round(titleFont * 0.5) + 'px ' + OUT_MONO;
      cctx.fillStyle = th.muted;
      cctx.fillText(String(total) + ' seats', W - Math.round(W * 0.045), headY);
      cctx.textAlign = 'center';
    }

    const subTxt = [titleInput.value.trim(), dateInput.value.trim()].filter(Boolean).join('  ·  ');
    let subY = padTop + logoH + titleFont * 2.1;
    if (subTxt) {
      cctx.font = '600 ' + clamp(Math.round(W * 0.015), 13, 17) + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
      cctx.fillStyle = th.muted;
      cctx.fillText(subTxt, W / 2, subY);
      subY += clamp(Math.round(W * 0.015), 13, 17) * 1.5;
    }

    // plot geometry
    const n = visualOrder.length || 1;
    const padRx = Math.round(W * 0.045);
    const x0 = padRx;
    const x1 = W - padRx;
    const colW = (x1 - x0) / n;

    // logo/name row height under axis
    const boxSz = Math.round(clamp(colW * 0.6, 34, 66));
    const nameFont = clamp(Math.round(colW * 0.13), 12, 18);
    const catRowH = boxSz + 10 + nameFont * 1.7;

    const padBottom = Math.round(H * 0.035);
    const baseY = H - padBottom - catRowH;
    const chartTop = subY + Math.round(H * 0.045);
    const chartH = Math.max(40, baseY - chartTop);

    // scale: nice max of the shown values (both modes)
    let maxV = 0;
    visualOrder.forEach((pid) => { maxV = Math.max(maxV, now[pid] || 0, prev[pid] || 0); });
    const niceMax = Math.max(10, Math.ceil(maxV / 10) * 10);

    // bars: now 70% / previous 30% of the pair width, side by side;
    // single full-width bars when there is no comparison column
    const single = visualOrder.every((p) => !(prev[p] > 0));
    const pairW = colW * 0.84;
    const pollW = single ? pairW : pairW * 0.7;
    const lastW = single ? 0 : pairW * 0.3;
    const labelFont = Math.round(clamp(colW * 0.1, 11, 15));

    for (let i = 0; i < visualOrder.length; i++) {
      const pid = visualOrder[i];
      const cx = x0 + colW * (i + 0.5);
      const color = (c.parties[pid] || {}).color || '#888';
      const pv = now[pid] || 0;
      const lv = prev[pid] || 0;

      const drawBar = (x, v, w, isLast) => {
        const bh = Math.max(0, (v / niceMax) * chartH);
        const yTop = Math.round(baseY - bh);
        const bx = Math.round(x);
        const bw = Math.round(w);
        if (isLast) { cctx.globalAlpha = 0.3; cctx.fillStyle = color; cctx.fillRect(bx, yTop, bw, bh); cctx.globalAlpha = 1; }
        else { cctx.fillStyle = color; cctx.fillRect(bx, yTop, bw, bh); }
        const vf = seatsMode ? String(Math.round(v)) : fmt(v);
        cctx.fillStyle = isLast ? th.muted : th.ink;
        cctx.font = '800 ' + labelFont + 'px ' + OUT_MONO;
        cctx.fillText(vf, x + w / 2, yTop - 6);
      };

      drawBar(cx - pairW / 2, pv, pollW, false);
      if (!single) drawBar(cx - pairW / 2 + pollW, lv, lastW, true);
    }

    // category row: party-color square + logo + abbreviation
    cctx.font = '700 ' + nameFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    for (let i = 0; i < visualOrder.length; i++) {
      const pid = visualOrder[i];
      const meta = c.parties[pid] || {};
      const abbr = meta.code || pid;
      const color = meta.color || '#888';
      const cx = x0 + colW * (i + 0.5);

      const bx = Math.round(cx - boxSz / 2);
      const by = baseY + 16;
      // colored square
      cctx.fillStyle = color;
      cctx.beginPath();
      cctx.roundRect(bx, by, boxSz, boxSz, 6);
      cctx.fill();

      // logo
      const logoPath = useLogos[pid];
      if (logoPath) {
        const src = /^(blob:|data:)/.test(logoPath) ? logoPath : BASE + logoPath + '?v=' + LOGO_CACHE;
        const img = await loadImg(src);
        if (img) {
          const iw = img.naturalWidth || 100, ih = img.naturalHeight || 100;
          const s = Math.min((boxSz - 8) / iw, (boxSz - 8) / ih);
          const dw = iw * s, dh = ih * s;
          cctx.drawImage(img, cx - dw / 2, by + (boxSz - dh) / 2, dw, dh);
        } else {
          cctx.fillStyle = (meta.pastOnly ? '#FFFFFF' : th.surface); cctx.font = '800 ' + Math.round(boxSz * 0.34) + 'px monospace';
          cctx.fillText(abbr, cx, by + boxSz / 2 + Math.round(boxSz * 0.1));
        }
      } else {
        cctx.fillStyle = (meta.pastOnly ? '#FFFFFF' : th.surface); cctx.font = '800 ' + Math.round(boxSz * 0.34) + 'px monospace';
        cctx.fillText(abbr, cx, by + boxSz / 2 + Math.round(boxSz * 0.1));
      }

      // abbreviation (shrunk so long codes never collide)
      let fs = nameFont;
      cctx.font = '700 ' + fs + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
      while (fs > 8 && cctx.measureText(abbr).width > colW * 0.92) {
        fs -= 1;
        cctx.font = '700 ' + fs + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
      }
      cctx.fillStyle = th.ink;
      cctx.fillText(abbr, cx, by + boxSz + nameFont * 1.35);
    }

    window.__geo = { W: W, H: H, x0: x0, colW: colW, pairW: pairW, pollW: pollW, lastW: lastW, boxSz: boxSz, baseY: baseY, cnt: visualOrder.length };
    window.__data = { seatsMode: seatsMode, display: visualOrder.slice(), now: now, prev: prev, total: total };
    updateText();
  }

  /* ---------- events ---------- */
  let debT;
  function schedule() { clearTimeout(debT); debT = setTimeout(render, 250); }

  countrySel.addEventListener('change', () => {
    buildRows();
    loadPolls();
  });
  formatSel.addEventListener('change', render);
  if (headingInput) headingInput.addEventListener('input', schedule);
  titleInput.addEventListener('input', schedule);
  dateInput.addEventListener('input', schedule);
  renderBtn.addEventListener('click', () => { renderBtn.disabled = true; render().finally(() => { renderBtn.disabled = false; }); });
  pollSel.addEventListener('change', () => {
    const p = POLL_LIST[Number(pollSel.value)];
    if (p) loadPoll(p);
  });
  partiesBody.addEventListener('input', schedule);
  partiesBody.addEventListener('change', (e) => {
    const el = e.target;
    if (el && el.classList && el.classList.contains('logo-in')) {
      const row = CUSTOM.find((r) => r.id === el.dataset.pid);
      const f = el.files && el.files[0];
      if (row && f) {
        row.logo = URL.createObjectURL(f);
        buildRows();
        render();
      }
    }
  });
  partiesBody.addEventListener('click', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('.rm-btn') : null;
    if (!b) return;
    CUSTOM = CUSTOM.filter((r) => r.id !== b.dataset.rm);
    if (!CUSTOM.length) CUSTOM.push(newCustomRow());
    buildRows();
    render();
  });
  if (addPartyBtn) addPartyBtn.addEventListener('click', () => {
    CUSTOM.push(newCustomRow());
    buildRows();
    render();
  });
  document.querySelectorAll('input[name="bg"]').forEach((r) => r.addEventListener('change', render));
  downloadBtn.addEventListener('click', () => {
    const tid = isCustom() ? 'custom' : countrySel.value;
    const fn = '600_' + tid + '_poll.png';
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fn;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }, 'image/png');
    } else {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = fn; a.click();
    }
  });

  document.querySelectorAll('input[name="chart"]').forEach((r) => r.addEventListener('change', schedule));
  document.querySelectorAll('input[name="share"]').forEach((r) => r.addEventListener('change', () => {
    const txt = document.querySelector('input[name="share"]:checked').value === 'text';
    textPanel.hidden = !txt;
    canvas.style.display = txt ? 'none' : '';
    imgActions.hidden = txt;
    txtActions.hidden = !txt;
    if (txt) updateText();
    else schedule();
  }));
  copyBtn.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(textOut.value); return; }
    textOut.select();
    document.execCommand('copy');
  });
  txtDlBtn.addEventListener('click', () => {
    const fn = '600_' + (isCustom() ? 'custom' : countrySel.value) + '_poll.txt';
    const blob = new Blob([textOut.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fn;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  /* ---------- init ---------- */
  function init() {
    const keys = Object.keys(COUNTRIES_DEF).filter((k) => !COUNTRIES_DEF[k].hidden);
    if (!keys.length) { prefillMsg.textContent = 'Config not loaded — check that js/config.js is reachable.'; return; }
    countrySel.innerHTML = keys.map((k) => {
      const c = COUNTRIES_DEF[k];
      const hint = c.seatBased ? ' (seats)' : '';
      return '<option value="' + k + '">' + (c.name || k) + hint + '</option>';
    }).join('') + '<option value="__brleg">Brazil — Legislative (Chamber)</option>'
      + '<option value="__custom">Custom — own parties</option>';
    buildRows();
    loadPolls();
    updateText();
  }
  init();
})();