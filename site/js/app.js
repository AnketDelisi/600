// ===== AltıCiftSıfır — App =====
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=s=>document.getElementById(s);
const fmt=(v,d=1)=>v.toFixed(d);
const pct=(v,d=1)=>fmt(v,d)+'%';

/* ---------- tab switching ---------- */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.tab-trigger');
  if(!btn) return;
  document.querySelectorAll('.tab-trigger').forEach(b=>b.dataset.active='false');
  btn.dataset.active='true';
  const tabId=btn.dataset.tab;
  document.querySelectorAll('.tab-pane').forEach(p=>{p.style.display='none';p.classList.remove('active')});
  const pane=$('pane-'+tabId);
  if(pane){pane.style.display='block';pane.classList.add('active');if(tabId==='forecast'&&!pane.dataset.loaded){renderForecast(pane);pane.dataset.loaded='1'}if(tabId==='constituency'&&!pane.dataset.loaded){renderConstituency(pane);pane.dataset.loaded='1'}if(tabId==='methodology'&&!pane.dataset.loaded){renderMethodology(pane);pane.dataset.loaded='1'}}
});

/* ---------- load data ---------- */
let POLLS=[], META={};

async function loadData(){
  try{
    // Detect base: local dev (site/ subdir) vs Pages (root)
    const isSubdir=window.location.pathname.includes('/site/');
    const base=isSubdir?'../':'';
    const [pollsResp, metaResp]=await Promise.all([
      fetch(base+'data/sweden/polls.json'),
      fetch(base+'data/sweden/meta.json')
    ]);
    const pollsJson=await pollsResp.json();
    const metaJson=await metaResp.json();
    POLLS=pollsJson.polls||[];
    META=metaJson;
  }catch(e){
    console.error('Failed to load data:',e);
  }
}

/* ---------- average calculator ---------- */
function pollsterWeight(pollster){
  const mae=POLLSTER_MAE[pollster];
  if(!mae||!mae.overall) return 1;
  return 1/mae.overall;
}

function weightedAverage(polls, party){
  let wSum=0, wTotal=0;
  for(const p of polls){
    if(p.votes[party]===undefined) continue;
    const n=p.n||1000;
    const pw=pollsterWeight(p.pollster);
    const w=n*pw;
    wSum+=p.votes[party]*w;
    wTotal+=w;
  }
  return wTotal>0?wSum/wTotal:null;
}

function computeAverages(polls){
  const avg={};
  for(const pid of PARTY_ORDER){
    avg[pid]=weightedAverage(polls, pid);
  }
  return avg;
}

/* ---------- date helpers ---------- */
function daysAgo(dateStr){
  const d=new Date(dateStr);
  const now=new Date();
  return Math.floor((now-d)/(1000*60*60*24));
}

function recentPolls(polls, days){
  const cutoff=new Date();
  cutoff.setDate(cutoff.getDate()-days);
  return polls.filter(p=>new Date(p.date)>=cutoff);
}

/* ---------- render sidebar ---------- */
function renderSidebar(){
  const c=$('sidebar-content');
  let html='';

  // Country selector
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">COUNTRY</div></div>
    <select class="sb-select" disabled><option>${COUNTRY_NAME}</option></select>
    <div class="sb-hint">More countries coming soon</div></div>`;

  // Filters
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">FILTERS</div></div>
    <label class="sb-hint" style="margin-bottom:4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">TIME RANGE</label>
    <select class="sb-select" id="filter-days" onchange="window._600.applyFilters()">
      <option value="7">Last 7 days</option>
      <option value="14">Last 14 days</option>
      <option value="30" selected>Last 30 days</option>
      <option value="60">Last 60 days</option>
      <option value="90">Last 90 days</option>
      <option value="9999">All polls</option>
    </select>
    <label class="sb-hint" style="margin:10px 0 4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">POLLSTER</label>
    <select class="sb-select" id="filter-pollster" onchange="window._600.applyFilters()">
      <option value="">All pollsters</option>
    </select></div>`;

  // Last election
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">2022 RESULT</div></div>
    <div class="sb-last-election" id="sb-election"></div></div>`;

  // Info
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">INFO</div></div>
    <div class="sb-hint">Data: Wikipedia + SwedishPolls (CC0)<br>349 seats · Sainte-Laguë · 4% threshold<br>Next election: Sep 13, 2026</div></div>`;

  c.innerHTML=html;

  // Populate pollster filter
  const pollsters=[...new Set(POLLS.map(p=>p.pollster))].sort();
  const sel=$('filter-pollster');
  pollsters.forEach(ps=>{
    const opt=document.createElement('option');
    opt.value=ps; opt.textContent=ps;
    sel.appendChild(opt);
  });

  // Last election
  renderLastElection();
}

function renderLastElection(){
  const c=$('sb-election');
  if(!c) return;
  let html='';
  const sorted=PARTY_ORDER.slice().sort((a,b)=>(LAST_ELECTION.results[b]||0)-(LAST_ELECTION.results[a]||0));
  for(const pid of sorted){
    const pct_val=LAST_ELECTION.results[pid];
    if(pct_val===undefined) continue;
    const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
    html+=`<div class="sb-le-row">
      <div class="sb-le-dot" style="background:${color}"></div>
      <div class="sb-le-name">${pid}</div>
      <div class="sb-le-pct">${pct(pct_val)}</div>
    </div>`;
  }
  c.innerHTML=html;
}

/* ---------- render hero ---------- */
function renderHero(avg, filteredPolls){
  const latest=filteredPolls[0];
  const days=latest?daysAgo(latest.date):'—';
  const latestStr=latest?latest.date:'—';
  const topParty=PARTY_ORDER.slice().sort((a,b)=>(avg[b]||0)-(avg[a]||0))[0];
  const topPct=avg[topParty]||0;
  const color=PARTY_META[topParty]?PARTY_META[topParty].color:'#888';

  const logoSrc=PARTY_LOGOS[topParty]||'';
  return `<div class="hero">
    <div class="hero-title">${COUNTRY_NAME} — Poll Average</div>
    <div class="hero-date">${filteredPolls.length} polls · latest: ${latestStr} (${days}d ago) · sample-size + pollster accuracy weighted</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <div style="width:36px;height:36px;border:2px solid var(--c-edge);box-shadow:var(--shadow-md);background:${color};display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${logoSrc?`<img src="${logoSrc}" alt="${topParty}" style="width:28px;height:28px;object-fit:contain">`:`<span style="color:#fff;font-weight:900;font-size:12px">${topParty}</span>`}
      </div>
      <div>
        <span style="font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;font-family:var(--font-mono)">${pct(topPct)}</span>
        <span style="font-size:13px;font-weight:700;color:var(--c-text-muted);margin-left:4px">leading</span>
      </div>
    </div>
  </div>`;
}

/* ---------- render party bars ---------- */
function renderPartyBars(avg){
  const maxPct=Math.max(...Object.values(avg).filter(v=>v!==null),1);
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">NATIONAL POLL AVERAGE</div></div>`;

  for(const pid of PARTY_ORDER){
    const val=avg[pid];
    if(val===null||val===undefined) continue;
    const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
    const barWidth=Math.max(1,(val/maxPct)*100);
    const last2022=LAST_ELECTION.results[pid]||0;
    const delta=val-last2022;
    const deltaStr=delta>0?`+${fmt(delta)}`:fmt(delta);
    const deltaColor=delta>0?'#0B9E17':delta<0?'var(--c-accent)':'var(--c-text-muted)';

    html+=`<div class="party-row">
      <div class="party-logo" style="background:${color}">
        ${PARTY_LOGOS[pid]?`<img src="${PARTY_LOGOS[pid]}" alt="${pid}" style="width:24px;height:24px;object-fit:contain">`:`<span>${pid}</span>`}
      </div>
      <div class="party-name">${pid}</div>
      <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:${color}"></div></div>
      <div class="party-pct">${pct(val)}</div>
      <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
    </div>`;
  }
  html+=`</div>`;
  return html;
}

/* ---------- render bloc summary ---------- */
function renderBlocs(avg){
  const rg=BLOCS.red_green.parties.reduce((s,p)=>s+(avg[p]||0),0);
  const td=BLOCS.tidö.parties.reduce((s,p)=>s+(avg[p]||0),0);
  return `<div class="bloc-row">
    <div class="bloc-card" style="border-left:6px solid ${BLOCS.red_green.color}">
      <div class="bloc-name">${BLOCS.red_green.name}</div>
      <div class="bloc-pct" style="color:${BLOCS.red_green.color}">${pct(rg)}</div>
      <div class="bloc-parties">${BLOCS.red_green.parties.join(' + ')}</div>
    </div>
    <div class="bloc-card" style="border-left:6px solid ${BLOCS.tidö.color}">
      <div class="bloc-name">${BLOCS.tidö.name}</div>
      <div class="bloc-pct" style="color:${BLOCS.tidö.color}">${pct(td)}</div>
      <div class="bloc-parties">${BLOCS.tidö.parties.join(' + ')}</div>
    </div>
  </div>`;
}

/* ---------- render trend chart (canvas) ---------- */
function renderTrendChart(canvas, polls){
  const ctx=canvas.getContext('2d');
  const W=canvas.parentElement.clientWidth;
  const H=canvas.parentElement.clientHeight||320;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.scale(2,2);

  // Collect data points: group by date, average
  const byDate={};
  polls.forEach(p=>{
    if(!byDate[p.date]) byDate[p.date]={};
    for(const pid of PARTY_ORDER){
      if(p.votes[pid]!==undefined){
        if(!byDate[p.date][pid]) byDate[p.date][pid]=[];
        byDate[p.date][pid].push(p.votes[pid]);
      }
    }
  });

  const dates=Object.keys(byDate).sort();
  if(dates.length<2){
    ctx.fillStyle='#64748B';ctx.font='12px Atlas Grotesk,sans-serif';ctx.textAlign='center';
    ctx.fillText('Need at least 2 dates for a chart',W/2,H/2);
    return;
  }

  // Build series
  const series=PARTY_ORDER.map(pid=>{
    const points=dates.map(d=>{
      const vals=byDate[d][pid];
      if(!vals||!vals.length) return null;
      return vals.reduce((a,b)=>a+b,0)/vals.length;
    });
    return {pid, points, color:PARTY_META[pid]?PARTY_META[pid].color:'#888'};
  });

  // Find y range
  let yMin=Infinity,yMax=-Infinity;
  series.forEach(s=>s.points.forEach(v=>{if(v!==null){yMin=Math.min(yMin,v);yMax=Math.max(yMax,v)}}));
  yMin=Math.floor(Math.max(0,yMin-3));
  yMax=Math.ceil(Math.min(45,yMax+3));

  const pad={top:20,right:60,bottom:40,left:50};
  const cw=W-pad.left-pad.right;
  const ch=H-pad.top-pad.bottom;

  // Grid
  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  const yTicks=5;
  for(let i=0;i<=yTicks;i++){
    const y=pad.top+ch*(i/yTicks);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const val=yMax-(yMax-yMin)*(i/yTicks);
    ctx.fillStyle='#64748B';ctx.font='10px Decima Mono Pro,monospace';ctx.textAlign='right';
    ctx.fillText(pct(val),pad.left-6,y+3);
  }

  // X labels
  const xStep=Math.max(1,Math.floor(dates.length/8));
  ctx.fillStyle='#64748B';ctx.font='10px Atlas Grotesk,sans-serif';ctx.textAlign='center';
  for(let i=0;i<dates.length;i+=xStep){
    const x=pad.left+(i/(dates.length-1))*cw;
    ctx.fillText(dates[i].slice(5),x,H-pad.bottom+16);
  }

  // Lines
  series.forEach(s=>{
    ctx.beginPath();
    ctx.strokeStyle=s.color;
    ctx.lineWidth=2;
    let started=false;
    s.points.forEach((v,i)=>{
      if(v===null) return;
      const x=pad.left+(i/(dates.length-1))*cw;
      const y=pad.top+ch*(1-(v-yMin)/(yMax-yMin));
      if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });

  // End labels
  series.forEach(s=>{
    const lastIdx=s.points.length-1;
    let lastVal=null;
    for(let i=lastIdx;i>=0;i--){if(s.points[i]!==null){lastVal=s.points[i];break}}
    if(lastVal===null) return;
    const x=W-pad.right+4;
    const y=pad.top+ch*(1-(lastVal-yMin)/(yMax-yMin));
    ctx.fillStyle=s.color;ctx.font='bold 10px Decima Mono Pro,monospace';ctx.textAlign='left';
    ctx.fillText(s.pid,x,y+3);
  });
}

/* ---------- render individual polls table ---------- */
function renderPollsTable(polls){
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">INDIVIDUAL POLLS</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table"><thead><tr>
      <th>Date</th><th>Pollster</th><th>N</th>`;
  PARTY_ORDER.forEach(p=>{html+=`<th style="text-align:right">${p}</th>`});
  html+=`</tr></thead><tbody>`;

  polls.slice(0,50).forEach(p=>{
    html+=`<tr><td>${p.date}</td><td>${p.pollster}</td><td class="num">${p.n?p.n.toLocaleString():'—'}</td>`;
    PARTY_ORDER.forEach(pid=>{
      const v=p.votes[pid];
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      html+=`<td class="num" style="color:${v!==undefined?color:'var(--c-rule)'}">${v!==undefined?pct(v):'—'}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table></div></div>`;
  return html;
}

/* ---------- render parliament ---------- */
function renderParliament(avg){
  // Simple Sainte-Laguë estimate for 310 constituency seats
  const seats=allocateSeats(avg);
  const svg=buildParliamentSVG(seats);
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">SEAT PROJECTION (EST.)</div></div>
    <div class="parliament-box">${svg}</div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
      Estimated 310 constituency seats via Sainte-Laguë (modified). Leveling seats not modeled.
    </div></div>`;
}

function allocateSeats(avg){
  const totalSeats=310;
  const validParties=PARTY_ORDER.filter(p=>(avg[p]||0)>=THRESHOLD);
  const totalVotes=validParties.reduce((s,p)=>s+(avg[p]||0),0);
  if(totalVotes===0) return {};
  const seats={};
  validParties.forEach(p=>{seats[p]=0});

  // Modified Sainte-Laguë: divisors 1.2, 3, 5, 7, 9, ...
  const divisors=[1.2];
  for(let i=1;i<50;i++) divisors.push(2*i+1);

  const quota=[];
  validParties.forEach(p=>{
    for(let d=0;d<divisors.length;d++){
      quota.push({party:p, q:(avg[p]||0)/divisors[d]});
    }
  });
  quota.sort((a,b)=>b.q-a.q);
  for(let i=0;i<totalSeats&&i<quota.length;i++){
    seats[quota[i].party]++;
  }
  return seats;
}

function buildParliamentSVG(seats){
  const total=Object.values(seats).reduce((a,b)=>a+b,0);
  const rows=13, cols=Math.ceil(total/rows);
  const dotR=5, gap=2;
  const svgW=cols*(dotR*2+gap)+gap;
  const svgH=rows*(dotR*2+gap)+gap;

  // Build colored dot list
  const dots=[];
  const sorted=PARTY_ORDER.slice().sort((a,b)=>(seats[b]||0)-(seats[a]||0));
  for(const p of sorted){
    const n=seats[p]||0;
    const color=PARTY_META[p]?PARTY_META[p].color:'#ccc';
    for(let i=0;i<n;i++) dots.push(color);
  }
  // Fill remaining with gray if needed
  while(dots.length<total) dots.push('#ccc');

  let svg=`<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">`;
  let idx=0;
  // Arc layout
  const cx=svgW/2, cy=svgH+20;
  const R=Math.min(svgW/2, svgH*1.2);
  for(let row=0;row<rows;row++){
    const y=svgH-((row+0.5)*svgH/rows);
    const spanY=Math.abs(cy-y);
    const spanX=Math.sqrt(Math.max(0,R*R-spanY*spanY));
    const rowCols=Math.max(1,Math.floor(2*spanX/(dotR*2+gap)));
    const rowStartX=cx-spanX;
    for(let col=0;col<rowCols&&idx<dots.length;col++){
      const x=rowStartX+col*(2*spanX/rowCols)+dotR;
      svg+=`<circle cx="${fmt(x,1)}" cy="${fmt(y,1)}" r="${dotR}" fill="${dots[idx]}" stroke="#111827" stroke-width="0.5"/>`;
      idx++;
    }
  }
  svg+=`</svg>`;
  return svg;
}

/* ---------- load constituency data ---------- */
let CONSTITUENCIES=null;

async function loadConstituencies(){
  try{
    const isSubdir=window.location.pathname.includes('/site/');
    const base=isSubdir?'../':'';
    const resp=await fetch(base+'data/sweden/constituencies.json');
    CONSTITUENCIES=await resp.json();
  }catch(e){
    console.error('Failed to load constituencies:',e);
  }
}

/* ---------- constituency seat allocator ---------- */
function allocateConstituencySeats(avg, constituency){
  const seats=constituency.seats;
  const results=constituency.results_2022;
  // Shift 2022 results by (poll_avg - 2022_result) for each party
  const shifted={};
  for(const pid of PARTY_ORDER){
    const pollVal=avg[pid]||0;
    const lastVal=results[pid]||0;
    shifted[pid]=Math.max(0,lastVal+(pollVal-(LAST_ELECTION.results[pid]||0)));
  }
  const total=Object.values(shifted).reduce((a,b)=>a+b,0);
  if(total===0) return {};
  // Normalize to percentages
  const pctShifted={};
  for(const pid of PARTY_ORDER) pctShifted[pid]=(shifted[pid]/total)*100;
  // Sainte-Laguë
  const valid=PARTY_ORDER.filter(p=>pctShifted[p]>=THRESHOLD);
  const totalValid=valid.reduce((s,p)=>s+pctShifted[p],0);
  if(totalValid===0) return {};
  const divisors=[1.2];for(let i=1;i<50;i++)divisors.push(2*i+1);
  const q=[];
  valid.forEach(p=>{for(let d=0;d<divisors.length;d++)q.push({party:p,q:pctShifted[p]/divisors[d]})});
  q.sort((a,b)=>b.q-a.q);
  const seatAlloc={};valid.forEach(p=>{seatAlloc[p]=0});
  for(let i=0;i<seats&&i<q.length;i++)seatAlloc[q[i].party]++;
  return seatAlloc;
}

/* ---------- render constituency tab ---------- */
function renderConstituency(pane){
  if(!CONSTITUENCIES){
    pane.innerHTML='<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">LOADING...</div></div></div></div>';
    return;
  }
  const daysVal=parseInt($('filter-days').value)||30;
  const pollsterVal=$('filter-pollster')?$('filter-pollster').value:'';
  let filtered=recentPolls(POLLS,daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  const avg=computeAverages(filtered);

  let totalSeatsAll={};PARTY_ORDER.forEach(p=>{totalSeatsAll[p]=0});
  let rows='';
  const sorted=CONSTITUENCIES.constituencies.slice().sort((a,b)=>b.seats-a.seats);
  for(const c of sorted){
    const sa=allocateConstituencySeats(avg,c);
    const total=Object.values(sa).reduce((a,b)=>a+b,0);
    PARTY_ORDER.forEach(p=>{totalSeatsAll[p]+=sa[p]||0});
    // Winner
    let winner=PARTY_ORDER[0],wMax=0;
    for(const p of PARTY_ORDER){if((sa[p]||0)>wMax){wMax=sa[p];winner=p}}
    const wColor=PARTY_META[winner]?PARTY_META[winner].color:'#888';
    // Seat cells
    let seatCells='';
    for(const p of PARTY_ORDER){
      const s=sa[p]||0;
      const color=PARTY_META[p]?PARTY_META[p].color:'#888';
      seatCells+=`<td class="num" style="color:${s>0?color:'var(--c-rule)'};font-weight:${s>0?'700':'400'}">${s||'—'}</td>`;
    }
    rows+=`<tr>
      <td style="font-weight:700">${c.name}</td>
      <td class="num">${c.seats}</td>
      <td style="color:${wColor};font-weight:700">${winner}</td>
      ${seatCells}
    </tr>`;
  }
  // Totals row
  let totalCells='';
  for(const p of PARTY_ORDER){
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    totalCells+=`<td class="num" style="font-weight:900;color:${color}">${totalSeatsAll[p]}</td>`;
  }
  rows+=`<tr style="border-top:3px solid var(--c-edge);font-weight:900">
    <td>TOTAL</td><td class="num">349</td><td></td>${totalCells}</tr>`;

  let html=`<div class="tab-pane-inner">
    <div class="hero">
      <div class="hero-title">CONSTITUENCY SEAT PROJECTION</div>
      <div class="hero-date">Modified Sainte-Laguë (divisor 1.2) · 29 constituencies · 310 constituency + 39 leveling seats</div>
    </div>
    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">SEATS BY CONSTITUENCY</div></div>
      <div style="overflow-x:auto">
      <table class="polls-table"><thead><tr>
        <th>Constituency</th><th>Seats</th><th>Leader</th>`;
  PARTY_ORDER.forEach(p=>{html+=`<th style="text-align:right">${p}</th>`});
  html+=`</tr></thead><tbody>${rows}</tbody></table></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px">
        Shifts applied: each party's 2022 constituency result adjusted by (poll_avg − 2022_national). Leveling seats distributed nationally.
      </div>
    </div></div>`;
  pane.innerHTML=html;
}

/* ---------- forecast tab ---------- */
function renderForecast(pane){
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero">
      <div class="hero-title">FORECAST</div>
      <div class="hero-subtitle">Coming soon — Monte Carlo seat projection with constituency-level polling</div>
    </div></div>`;
}

/* ---------- methodology tab ---------- */
function renderMethodology(pane){
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="card">
      <div class="card-head"><div class="bar"></div><div class="t">METHODOLOGY</div></div>
      <div class="method-text">
        <h3>Data Sources</h3>
        <p>Polls are collected from two sources:</p>
        <ul>
          <li><strong>Wikipedia</strong> — aggregated from publicly available polling tables. Primary source.</li>
          <li><strong>SwedishPolls</strong> (CC0) — GitHub repository maintained by Magnus&nbsp;M瑞典Polls with standardized Swedish polling data since 1944.</li>
        </ul>
        <p>Duplicate polls (same pollster + same date) are deduplicated, with Wikipedia data taking priority.</p>

        <h3>Poll Average</h3>
        <p>The national poll average uses a <strong>dual-weighted mean</strong> combining sample size and pollster accuracy:</p>
        <span class="formula">weight_i = n_i × (1 / MAE_pollster)</span>
        <span class="formula">avg(party) = Σ(vote_i × weight_i) / Σ(weight_i)</span>
        <p>where <em>n_i</em> is the sample size and <em>MAE_pollster</em> is the mean absolute error of the pollster across the last 3 elections (2014, 2018, 2022). Lower MAE = higher weight. Pollsters with only 1-2 elections of data are assigned a default MAE of 1.30.</p>

        <h3>Pollster Accuracy (MAE)</h3>
        <p>Each pollster's accuracy is measured by averaging their error across the last 5 polls before each of the 3 most recent elections. The MAE is the mean absolute deviation across all 8 parties:</p>
        <table class="polls-table" style="margin:8px 0"><thead><tr><th>Pollster</th><th>Elections</th><th>MAE</th></tr></thead><tbody>
        ${Object.entries(POLLSTER_MAE).sort((a,b)=>a[1].overall-b[1].overall).map(([ps,d])=>{
          const eCount=Object.keys(d).filter(k=>k!=='overall').length;
          return `<tr><td>${ps}</td><td class="num">${eCount}</td><td class="num" style="font-weight:700">${d.overall.toFixed(2)}%</td></tr>`;
        }).join('')}
        </tbody></table>

        <h3>Seat Projection</h3>
        <p>Sweden uses a <strong>mixed-member proportional</strong> system with 349 seats:</p>
        <ul>
          <li><strong>310 constituency seats</strong> — 29 constituencies, allocated via modified Sainte-Laguë (divisor 1.2)</li>
          <li><strong>39 leveling seats</strong> — used to align national vote share with seat share</li>
          <li><strong>4% threshold</strong> — parties must exceed this to qualify for seats</li>
        </ul>
        <p>The constituency projection shifts each party's 2022 constituency result by the difference between the current poll average and the 2022 national result. Seats are then allocated via Sainte-Laguë. Leveling seats are not yet modeled.</p>

        <h3>Bloc Totals</h3>
        <p>The <strong>Red-Green</strong> bloc includes S, V, MP, and C. The <strong>Tidö</strong> bloc includes M, SD, KD, and L. Note: C (Centre Party) is sometimes classified as centrist rather than left-leaning.</p>

        <h3>Last Updated</h3>
        <p>Data is scraped automatically from Wikipedia and SwedishPolls. The site is updated daily via GitHub Actions.</p>
      </div>
    </div></div>`;
}

/* ---------- main render ---------- */
function renderPollsTab(){
  const pane=$('pane-polls');
  const daysVal=parseInt($('filter-days').value)||30;
  const pollsterVal=$('filter-pollster')?$('filter-pollster').value:'';

  let filtered=recentPolls(POLLS, daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));

  const avg=computeAverages(filtered);

  let html=`<div class="tab-pane-inner">`;
  html+=renderHero(avg, filtered);
  html+=renderBlocs(avg);
  html+=renderPartyBars(avg);

  // Trend chart
  html+=`<div class="card" style="margin-top:16px"><div class="card-head"><div class="bar"></div><div class="t">POLL TREND</div></div>
    <div class="chart-wrap"><canvas id="trend-canvas"></canvas></div></div>`;

  html+=renderParliament(avg);
  html+=renderPollsTable(filtered);
  html+=`</div>`;
  pane.innerHTML=html;

  // Draw chart after DOM update
  requestAnimationFrame(()=>{
    const canvas=$('trend-canvas');
    if(canvas) renderTrendChart(canvas, filtered);
  });
}

/* ---------- public API ---------- */
window._600={
  applyFilters(){renderPollsTab()}
};

/* ---------- boot ---------- */
loadData().then(()=>loadConstituencies()).then(()=>{
  renderSidebar();
  renderPollsTab();
});

})();
