/* 600 — Poll Image Generator
 * Config-driven: any country in js/config.js (COUNTRIES) works automatically:
 * party order, colors, English names, logos, and last-election baseline.
 * Renders a EuropeElects-style double-bar chart (poll vs last election) with
 * each party's logo in a box + name, plus the 600logo.svg header.
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
    default: { bg: '#F9F7F0', surface: '#FFFFFF', ink: '#161616', muted: '#5F584E', grid: '#D8D1C0', edge: '#1A1A1A' },
    white:   { bg: '#FFFFFF', surface: '#FFFFFF', ink: '#161616', muted: '#6B665C', grid: '#E4E0D6', edge: '#1A1A1A' },
    dark:    { bg: '#161616', surface: '#242424', ink: '#FDFBF4', muted: '#A8A39B', grid: '#3A3A3A', edge: '#FDFBF4' },
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
      const nTxt = latest.n ? ' (n = ' + Number(latest.n).toLocaleString('en-US') + ')' : '';
      dateInput.value = (latest.fieldwork_start && latest.date) ? latest.fieldwork_start + ' – ' + latest.date + nTxt : (latest.date || '') + nTxt;
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
  function drawGridRow(th, x0, x1, y) {
    cctx.globalAlpha = 0.5;
    cctx.strokeStyle = th.grid;
    cctx.lineWidth = 1;
    cctx.beginPath(); cctx.moveTo(x0, y); cctx.lineTo(x1, y); cctx.stroke();
    cctx.globalAlpha = 1;
  }

  function wrapText(ctx, text, maxW, maxLines) {
    const words = String(text).split(' ');
    if (words.length === 1) return [text];
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length && lines.length < maxLines; i++) {
      const t = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width <= maxW || !line) line = t;
      else { lines.push(line); line = words[i]; }
    }
    if (line) lines.push(line);
    return lines;
  }

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
    const logoH = Math.round(clamp(H * 0.05, 30, 52));
    const logoW = Math.round(logoH * (257.17 / 96.31)); // 600logo aspect
    const logoImg = await loadImg(BASE + 'img/600logo.svg');
    if (logoImg) cctx.drawImage(logoImg, (W - logoW) / 2, padTop, logoW, logoH);

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

    // legend
    const legendY = subY + 14;
    const legendFont = Math.round(clamp(W * 0.013, 12, 15));
    const sw = 12, gap = 26;
    cctx.font = '800 ' + legendFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    // measure legend text to center it
    const lbl = 'Poll';
    cctx.fillStyle = th.ink;
    const tw = cctx.measureText(lbl).width;
    const legendW = sw + 6 + tw + gap + sw + 6 + cctx.measureText('Last election').width;
    let lx = (W - legendW) / 2;
    cctx.strokeStyle = th.edge; cctx.lineWidth = 1.5;
    cctx.fillStyle = th.ink; cctx.fillRect(lx, legendY - sw, sw, sw);
    cctx.fillText('Poll', lx + sw + 6, legendY + legendFont * 0.34);
    lx += sw + 6 + tw + gap;
    cctx.fillStyle = th.ink; cctx.globalAlpha = 0.28; cctx.fillRect(lx, legendY - sw, sw, sw);
    cctx.globalAlpha = 1;
    cctx.strokeRect(lx, legendY - sw, sw, sw);
    cctx.fillText('Last election', lx + sw + 6, legendY + legendFont * 0.34);
    const legendBottom = legendY + 20;

    // plot geometry
    const n = order.length || 1;
    const padRx = Math.round(W * 0.05);
    const axisW = Math.round(W * 0.075);
    const x0 = padRx + axisW;
    const x1 = W - padRx;
    const colW = (x1 - x0) / n;

    // logo/name row height under axis
    const boxSz = Math.round(clamp(colW * 0.55, 34, 62));
    const nameFont = clamp(Math.round(colW * 0.1), 10, 14);
    const catRowH = boxSz + 8 + nameFont * 2.4;

    const padBottom = Math.round(H * 0.03);
    // baseline sits above the category row; chart grows to fill the space
    const baseY = H - padBottom - catRowH;
    const chartTop = legendBottom + Math.round(H * 0.025);
    const chartH = Math.max(40, baseY - chartTop);

    // scale
    let maxV = 0;
    order.forEach((pid) => { maxV = Math.max(maxV, poll[pid] || 0, last[pid] || 0); });
    const niceMax = Math.max(10, Math.ceil(maxV / 10) * 10);
    const step = niceMax / 5;

    // gridlines + y labels
    cctx.font = '600 ' + clamp(Math.round(W * 0.012), 10, 13) + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    for (let i = 0; i <= 5; i++) {
      const v = step * i;
      const y = Math.round(baseY - (v / niceMax) * chartH);
      drawGridRow(th, x0, x1, y);
      cctx.textAlign = 'right';
      cctx.fillStyle = th.muted;
      cctx.fillText(fmt(v), x0 - 8, y + 4);
      cctx.textAlign = 'center';
    }

    // axis baseline
    cctx.strokeStyle = th.edge; cctx.lineWidth = 2;
    cctx.beginPath(); cctx.moveTo(x0, baseY); cctx.lineTo(x1, baseY); cctx.stroke();

    // bars
    const barW = colW * 0.30;
    const gapB = colW * 0.08;
    cctx.lineWidth = 1.5;
    const labelFont = Math.round(clamp(colW * 0.1, 11, 15));

    for (let i = 0; i < order.length; i++) {
      const pid = order[i];
      const cx = x0 + colW * (i + 0.5);
      const color = (c.parties[pid] || {}).color || '#888';
      const pv = poll[pid] || 0;
      const lv = last[pid] || 0;

      const drawBar = (x, v, isLast) => {
        const bh = Math.max(0, (v / niceMax) * chartH);
        const yTop = Math.round(baseY - bh);
        const bx = Math.round(x - barW / 2);
        const bw = Math.round(barW);
        if (isLast) { cctx.globalAlpha = 0.3; cctx.fillStyle = color; cctx.fillRect(bx, yTop, bw, bh); cctx.globalAlpha = 1; cctx.strokeStyle = color; cctx.strokeRect(bx, yTop, bw, bh); }
        else { cctx.fillStyle = color; cctx.fillRect(bx, yTop, bw, bh); }
        // value label
        const vf = fmt(v);
        cctx.fillStyle = isLast ? th.muted : th.ink;
        cctx.font = '800 ' + labelFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
        cctx.fillText(vf, x, yTop - 6);
      };

      drawBar(cx - barW / 2 - gapB / 2, pv, false);
      drawBar(cx + barW / 2 + gapB / 2, lv, true);
    }

    // category row: logo box + name
    cctx.font = '700 ' + nameFont + 'px "Atlas Grotesk","Inter",Helvetica,Arial,sans-serif';
    for (let i = 0; i < order.length; i++) {
      const pid = order[i];
      const meta = c.parties[pid] || {};
      const nameLbl = meta.name_en || meta.name || pid;
      const cx = x0 + colW * (i + 0.5);

      const bx = Math.round(cx - boxSz / 2);
      const by = baseY + 14;
      // box
      cctx.fillStyle = th.surface;
      cctx.strokeStyle = th.edge;
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.roundRect(bx, by, boxSz, boxSz, 6);
      cctx.fill(); cctx.stroke();

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
          cctx.fillStyle = th.muted; cctx.font = '800 ' + Math.round(boxSz * 0.3) + 'px monospace';
          cctx.fillText(pid, cx, by + boxSz / 2 + Math.round(boxSz * 0.1));
        }
      } else {
        cctx.fillStyle = th.muted; cctx.font = '800 ' + Math.round(boxSz * 0.3) + 'px monospace';
        cctx.fillText(pid, cx, by + boxSz / 2 + Math.round(boxSz * 0.1));
      }

      // name
      cctx.fillStyle = th.ink;
      const maxWt = colW - 6;
      const lines = wrapText(cctx, nameLbl, maxWt, 2);
      lines.forEach((ln, li) => {
        cctx.fillText(ln, cx, by + boxSz + nameFont * (0.8 + li * 1.2));
      });
    }
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