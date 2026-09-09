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
    default: { bg: '#F9F7F0', surface: '#FFFFFF', ink: '#161616', muted: '#5F584E', edge: '#1A1A1A' },
    white:   { bg: '#FFFFFF', surface: '#FFFFFF', ink: '#161616', muted: '#6B665C', edge: '#1A1A1A' },
    dark:    { bg: '#161616', surface: '#242424', ink: '#FDFBF4', muted: '#A8A39B', edge: '#FDFBF4' },
  };

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
  const prefillBtn = $('prefill-btn');
  const prefillMsg = $('prefill-msg');
  const renderBtn = $('render-btn');
  const downloadBtn = $('download-btn');

  let COUNTRIES_DEF = {};
  try { COUNTRIES_DEF = (typeof COUNTRIES !== 'undefined') ? COUNTRIES : {}; } catch (e) { /* config not loaded */ }

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
    const c = COUNTRIES_DEF[countrySel.value];
    partiesBody.innerHTML = '';
    if (!c) return;
    (c.order || []).forEach((pid) => {
      const meta = c.parties[pid] || {};
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
    const c = COUNTRIES_DEF[countrySel.value];
    const order = c ? (c.order || []) : [];
    const poll = {}, last = {};
    order.forEach((pid) => {
      poll[pid] = num((partiesBody.querySelector('.poll-in[data-pid="' + pid + '"]') || {}).value);
      last[pid] = num((partiesBody.querySelector('.last-in[data-pid="' + pid + '"]') || {}).value);
    });
    return { order, poll, last };
  }

  /* ---------- prefill from site data ---------- */
  async function prefill() {
    const tid = countrySel.value;
    const c = COUNTRIES_DEF[tid];
    prefillBtn.disabled = true;
    prefillMsg.textContent = 'Loading latest poll…';
    try {
      const resp = await fetch(BASE + 'data/' + tid + '/polls.json?v=' + Date.now());
      if (!resp.ok) throw new Error('no data');
      const data = await resp.json();
      const polls = (data && data.polls) || [];
      if (!polls.length) throw new Error('empty');
      const latest = polls[0];
      titleInput.value = latest.pollster || '';
      const nTxt = latest.n ? ' · n = ' + Number(latest.n).toLocaleString('en-US') : '';
      let dateTxt = '';
      if (latest.fieldwork_start && latest.date) dateTxt = fmtDateRange(latest.fieldwork_start, latest.date);
      else if (latest.date) dateTxt = formatSingle(isoDate(latest.date));
      dateInput.value = (dateTxt || (latest.date || '')) + nTxt;
      const votes = latest.votes || latest.result || null;
      if (c && votes) {
        (c.order || []).forEach((pid) => {
          const inp = partiesBody.querySelector('.poll-in[data-pid="' + pid + '"]');
          if (inp && pid in votes) inp.value = votes[pid];
        });
      }
      prefillMsg.textContent = 'Loaded "' + (latest.pollster || 'latest poll') + '" for ' + (c ? c.name : tid) + '.';
    } catch (e) {
      // keep what the user typed; offer manual entry
      prefillMsg.textContent = 'No poll data found for this country — enter values manually.';
    } finally {
      prefillBtn.disabled = false;
    }
    render();
  }

  /* ---------- rendering ---------- */
  async function render() {
    const tid = countrySel.value;
    const c = COUNTRIES_DEF[tid];
    if (!c) return;

    // theme
    const bgVal = document.querySelector('input[name="bg"]:checked');
    const th = THEMES[bgVal ? bgVal.value : 'default'];

    // size
    const fmtSel = formatSel.value.split('x').map(Number);
    const W = fmtSel[0], H = fmtSel[1];
    canvas.width = W; canvas.height = H;
    cctx.fillStyle = th.bg;
    cctx.fillRect(0, 0, W, H);
    cctx.textBaseline = 'alphabetic';
    cctx.textAlign = 'center';

    const { order, poll, last } = readResults();
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
    const headerTxt = countryName + (c.seatBased ? ' — Seat Projection' : ' — Poll');
    const titleFont = clamp(Math.round(W * 0.026), 22, 34);
    cctx.font = '900 ' + titleFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    cctx.fillStyle = th.ink;
    cctx.fillText(headerTxt, W / 2, padTop + logoH + titleFont * 1.05);

    const subTxt = [titleInput.value.trim(), dateInput.value.trim()].filter(Boolean).join('  ·  ');
    let subY = padTop + logoH + titleFont * 2.1;
    if (subTxt) {
      cctx.font = '600 ' + clamp(Math.round(W * 0.015), 13, 17) + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
      cctx.fillStyle = th.muted;
      cctx.fillText(subTxt, W / 2, subY);
      subY += clamp(Math.round(W * 0.015), 13, 17) * 1.5;
    }

    // legend: mini bar icons echoing the chart, aligned on a shared baseline
    const legendY = subY + 14;
    const legendFont = Math.round(clamp(W * 0.014, 12, 16));
    const lw = Math.round(legendFont * 3.0);
    const lh = Math.round(legendFont * 0.9);
    cctx.font = '700 ' + legendFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    const labA = 'Poll', labB = 'Last election';
    const wA = cctx.measureText(labA).width;
    const wB = cctx.measureText(labB).width;
    const itemGap = Math.round(W * 0.05);
    const groupW = lw + 10 + wA + itemGap + lw + 10 + wB;
    let lx = (W - groupW) / 2;
    const iconTop = legendY - lh;
    const txtY = legendY + legendFont * 0.16;
    function legendBar(x, light) {
      cctx.fillStyle = th.ink;
      if (light) cctx.globalAlpha = 0.3;
      cctx.beginPath();
      cctx.roundRect(x, iconTop, lw, lh, 2);
      cctx.fill();
      cctx.globalAlpha = 1;
    }
    legendBar(lx, false);
    cctx.fillStyle = th.ink;
    cctx.fillText(labA, lx + lw + 10, txtY);
    lx += lw + 10 + wA + itemGap;
    legendBar(lx, true);
    cctx.fillStyle = th.muted;
    cctx.fillText(labB, lx + lw + 10, txtY);
    const legendBottom = legendY + 8;

    // plot geometry
    const n = order.length || 1;
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
    const chartTop = legendBottom + Math.round(H * 0.025);
    const chartH = Math.max(40, baseY - chartTop);

    // scale
    let maxV = 0;
    order.forEach((pid) => { maxV = Math.max(maxV, poll[pid] || 0, last[pid] || 0); });
    const niceMax = Math.max(10, Math.ceil(maxV / 10) * 10);

    // bars: poll 70% / last-election 30% of the pair width, side by side
    const pairW = colW * 0.84;
    const pollW = pairW * 0.7;
    const lastW = pairW * 0.3;
    const labelFont = Math.round(clamp(colW * 0.1, 11, 15));

    for (let i = 0; i < order.length; i++) {
      const pid = order[i];
      const cx = x0 + colW * (i + 0.5);
      const color = (c.parties[pid] || {}).color || '#888';
      const pv = poll[pid] || 0;
      const lv = last[pid] || 0;

      const drawBar = (x, v, w, isLast) => {
        const bh = Math.max(0, (v / niceMax) * chartH);
        const yTop = Math.round(baseY - bh);
        const bx = Math.round(x);
        const bw = Math.round(w);
        if (isLast) { cctx.globalAlpha = 0.3; cctx.fillStyle = color; cctx.fillRect(bx, yTop, bw, bh); cctx.globalAlpha = 1; }
        else { cctx.fillStyle = color; cctx.fillRect(bx, yTop, bw, bh); }
        const vf = fmt(v);
        cctx.fillStyle = isLast ? th.muted : th.ink;
        cctx.font = '800 ' + labelFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
        cctx.fillText(vf, x + w / 2, yTop - 6);
      };

      drawBar(cx - pairW / 2, pv, pollW, false);
      drawBar(cx - pairW / 2 + pollW, lv, lastW, true);
    }

    // category row: party-color square + logo + abbreviation
    cctx.font = '700 ' + nameFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    for (let i = 0; i < order.length; i++) {
      const pid = order[i];
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
        const img = await loadImg(BASE + logoPath);
        if (img) {
          const iw = img.naturalWidth || 100, ih = img.naturalHeight || 100;
          const s = Math.min((boxSz - 8) / iw, (boxSz - 8) / ih);
          const dw = iw * s, dh = ih * s;
          cctx.drawImage(img, cx - dw / 2, by + (boxSz - dh) / 2, dw, dh);
        } else {
          cctx.fillStyle = th.surface; cctx.font = '800 ' + Math.round(boxSz * 0.34) + 'px monospace';
          cctx.fillText(abbr, cx, by + boxSz / 2 + Math.round(boxSz * 0.1));
        }
      } else {
        cctx.fillStyle = th.surface; cctx.font = '800 ' + Math.round(boxSz * 0.34) + 'px monospace';
        cctx.fillText(abbr, cx, by + boxSz / 2 + Math.round(boxSz * 0.1));
      }

      // abbreviation
      cctx.fillStyle = th.ink;
      cctx.fillText(abbr, cx, by + boxSz + nameFont * 1.35);
    }

    window.__geo = { W: W, H: H, x0: x0, colW: colW, pairW: pairW, pollW: pollW, lastW: lastW, boxSz: boxSz, baseY: baseY };
  }

  /* ---------- events ---------- */
  let debT;
  function schedule() { clearTimeout(debT); debT = setTimeout(render, 250); }

  countrySel.addEventListener('change', () => {
    buildRows();
    prefill();
  });
  formatSel.addEventListener('change', render);
  titleInput.addEventListener('input', schedule);
  dateInput.addEventListener('input', schedule);
  renderBtn.addEventListener('click', () => { renderBtn.disabled = true; render().finally(() => { renderBtn.disabled = false; }); });
  prefillBtn.addEventListener('click', prefill);
  partiesBody.addEventListener('input', schedule);
  document.querySelectorAll('input[name="bg"]').forEach((r) => r.addEventListener('change', render));
  downloadBtn.addEventListener('click', () => {
    const tid = countrySel.value;
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

  /* ---------- init ---------- */
  function init() {
    const keys = Object.keys(COUNTRIES_DEF);
    if (!keys.length) { prefillMsg.textContent = 'Config not loaded — check that js/config.js is reachable.'; return; }
    countrySel.innerHTML = keys.map((k) => {
      const c = COUNTRIES_DEF[k];
      const hint = c.seatBased ? ' (seats)' : '';
      return '<option value="' + k + '">' + (c.name || k) + hint + '</option>';
    }).join('');
    buildRows();
    prefill(); // load the most recent poll for the default country
  }
  init();
})();