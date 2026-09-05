// ===== AltıCiftSıfır — App =====
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=s=>document.getElementById(s);
const fmt=(v,d=1)=>v.toFixed(d);
const pct=(v,d=1)=>fmt(v,d)+'%';
const valDisp=(v,d=1)=>SEAT_BASED?String(Math.ceil(v)):fmt(v,d)+'%';
const partyCode=pid=>(PARTY_META[pid]&&PARTY_META[pid].code)?PARTY_META[pid].code:pid;

/* ---------- tab switching ---------- */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.tab-trigger');
  if(!btn) return;
  document.querySelectorAll('.tab-trigger').forEach(b=>b.dataset.active='false');
  btn.dataset.active='true';
  const tabId=btn.dataset.tab;
  document.querySelectorAll('.tab-pane').forEach(p=>{p.style.display='none';p.classList.remove('active')});
  const pane=$('pane-'+tabId);
  if(pane){pane.style.display='block';pane.classList.add('active');if(tabId==='forecast'&&!pane.dataset.loaded){renderForecast(pane);pane.dataset.loaded='1'}if(tabId==='methodology'&&!pane.dataset.loaded){renderMethodology(pane);pane.dataset.loaded='1'}}
});

/* ---------- load constituency data ---------- */
let CONSTITUENCIES=null;

async function loadConstituencies(){
  CONSTITUENCIES=null;
  if(!HAS_CONSTITUENCIES) return;
  try{
    const isSubdir=window.location.pathname.includes('/site/');
    const base=isSubdir?'../':'';
    const resp=await fetch(base+'data/'+COUNTRY+'/constituencies.json');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    CONSTITUENCIES=await resp.json();
  }catch(e){
    console.error('Failed to load constituencies:',e);
    CONSTITUENCIES=[];
  }
}

/* ---------- constituency seat allocator ---------- */
function allocateConstituencySeats(votes, constituency){
  const seats=constituency.seats;
  const results=constituency.results_2022;
  // Shift 2022 results by (poll_avg - 2022_national) per party
  const shifted={};
  for(const pid of PARTY_ORDER){
    const pollVal=votes[pid]||0;
    const lastVal=results[pid]||0;
    shifted[pid]=Math.max(0,lastVal+(pollVal-(LAST_ELECTION.results[pid]||0)));
  }
  const total=Object.values(shifted).reduce((a,b)=>a+b,0);
  if(total===0) return {};
  const pctShifted={};
  for(const pid of PARTY_ORDER) pctShifted[pid]=(shifted[pid]/total)*100;
  // Swedish rule: >=4% nationally OR >=12% in the constituency
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD||pctShifted[p]>=12);
  const totalValid=valid.reduce((s,p)=>s+pctShifted[p],0);
  if(totalValid===0) return {};
  const divisors=[1.2];
  for(let i=1;i<=seats;i++) divisors.push(2*i+1);
  const q=[];
  valid.forEach(p=>{for(let d=0;d<divisors.length;d++)q.push({party:p,q:pctShifted[p]/divisors[d]})});
  q.sort((a,b)=>b.q-a.q);
  const seatAlloc={};valid.forEach(p=>{seatAlloc[p]=0});
  for(let i=0;i<seats&&i<q.length;i++)seatAlloc[q[i].party]++;
  return seatAlloc;
}

function allocateConstituencySeats2022(c){
  const r=c.results_2022||{};
  const votes={};
  for(const p of PARTY_ORDER) votes[p]=r[p]||0;
  return allocateConstituencySeats(votes,c);
}

/* ---------- constituency results table ---------- */
function constituencyTableHtml(votes, opts){
  opts=opts||{};
  const cList=CONSTITUENCIES.constituencies;
  const title=opts.title||'CONSTITUENCY SEATS';
  const note=opts.note||'';
  const showDelta=opts.showDelta!==false;

  let totalSeatsAll={};PARTY_ORDER.forEach(p=>{totalSeatsAll[p]=0});
  let rows='';
  const sorted=cList.slice().sort((a,b)=>b.seats-a.seats);
  let lastTotals=null;
  if(showDelta){
    lastTotals={};PARTY_ORDER.forEach(p=>{lastTotals[p]=0});
    cList.forEach(c=>{
      const sa22=allocateConstituencySeats2022(c);
      PARTY_ORDER.forEach(p=>{lastTotals[p]+=sa22[p]||0});
    });
  }
  for(const c of sorted){
    const sa=allocateConstituencySeats(votes,c);
    PARTY_ORDER.forEach(p=>{totalSeatsAll[p]+=sa[p]||0});
    let seatCells='';
    for(const p of PARTY_ORDER){
      const s=sa[p]||0;
      const color=PARTY_META[p]?PARTY_META[p].color:'#888';
      seatCells+=`<td class="num c" style="color:${s>0?color:'var(--c-rule)'};font-weight:${s>0?'700':'400'}">${s||'—'}</td>`;
    }
    rows+=`<tr>
      <td style="font-weight:700">${c.name}</td>
      <td class="num c">${c.seats}</td>
      ${seatCells}
    </tr>`;
  }
  let totalCells='';
  for(const p of PARTY_ORDER){
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    totalCells+=`<td class="num c" style="font-weight:900;color:${color}">${totalSeatsAll[p]}</td>`;
  }
  const constSeats=cList.reduce((s,c)=>s+c.seats,0);
  rows+=`<tr style="border-top:3px solid var(--c-edge);font-weight:900">
    <td>TOTAL</td><td class="num c">${constSeats}</td>${totalCells}</tr>`;
  if(lastTotals){
    let deltaCells='';
    for(const p of PARTY_ORDER){
      const d=totalSeatsAll[p]-(lastTotals[p]||0);
      const color=d>0?'#0B9E17':d<0?'var(--c-accent)':'var(--c-text-muted)';
      deltaCells+=`<td class="num c" style="color:${color};font-weight:900">${d>0?'+'+d:d}</td>`;
    }
    rows+=`<tr class="delta-row">
      <td>Δ vs 2022</td><td></td>${deltaCells}</tr>`;
  }

  let head='';
  PARTY_ORDER.forEach(p=>{head+=`<th class="c">${p}</th>`});
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${title}</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>Constituency</th><th class="c">Seats</th>${head}
    </tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      Per-constituency Sainte-Laguë (4% / 12% rule)${note?' · '+note:''}
    </div></div>`;
}

function renderConstituencyTable(avg){
  if(!CONSTITUENCIES||CONSTITUENCIES.length===0) return '';
  const votes=PARL_MODE==='proj'?avg:LAST_ELECTION.results;
  const by2022=PARL_MODE==='2022';
  return constituencyTableHtml(votes,{
    title:`CONSTITUENCY SEATS (${by2022?'2022 RESULT':'PROJECTION'})`,
    showDelta:!by2022,
    note:by2022?'2022 actual vote shares':'2022 results shifted by (poll avg − 2022 national)'
  });
}

/* ---------- load data ---------- */
let POLLS=[], META={};

async function loadData(){
  try{
    // Detect base: local dev (site/ subdir) vs Pages (root)
    const isSubdir=window.location.pathname.includes('/site/');
    const base=isSubdir?'../':'';
    const [pollsResp, metaResp]=await Promise.all([
      fetch(base+'data/'+COUNTRY+'/polls.json'),
      fetch(base+'data/'+COUNTRY+'/meta.json')
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

// Exponential time decay: polls halve in weight every 14 days
function recencyWeight(dateStr){
  const ageDays=(Date.now()-new Date(dateStr).getTime())/(1000*60*60*24);
  if(ageDays<=0) return 1;
  return Math.pow(0.5, ageDays/14);
}

function weightedAverage(polls, party){
  let wSum=0, wTotal=0;
  for(const p of polls){
    if(p.votes[party]===undefined) continue;
    const n=p.n||1000;
    const pw=pollsterWeight(p.pollster);
    const rw=recencyWeight(p.date);
    const w=n*pw*rw;
    // seat-based polls report seats only for above-threshold parties;
    // renormalize each poll to sum to SEATS_TOTAL so the average is on a
    // common scale (missing below-threshold seats are treated as 'Others')
    let v=p.votes[party];
    if(SEAT_BASED){
      const raw=Object.values(p.votes).reduce((a,b)=>a+b,0);
      if(raw>0) v*=SEATS_TOTAL/raw;
    }
    wSum+=v*w;
    wTotal+=w;
  }
  return wTotal>0?wSum/wTotal:null;
}

function computeAverages(polls){
  const avg={};
  for(const pid of PARTY_ORDER){
    avg[pid]=weightedAverage(polls, pid);
  }
  if(SEAT_BASED){
    const total=Object.values(avg).reduce((a,b)=>a+(b||0),0);
    if(total>0){
      for(const pid of PARTY_ORDER) if(avg[pid]!==null) avg[pid]=avg[pid]*SEATS_TOTAL/total;
    }
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
    <select class="sb-select" id="country-select" onchange="window._600.setCountry(this.value)">
      ${Object.keys(COUNTRIES).map(id=>`<option value="${id}"${id===COUNTRY?' selected':''}>${COUNTRIES[id].name}</option>`).join('')}
    </select>
    <div class="sb-hint">${SEATS_TOTAL} seats · ${SEAT_METHOD==='dhondt'?'D\'Hondt':'modified Sainte-Laguë'} · ${THRESHOLD}% threshold</div></div>`;

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
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${LAST_ELECTION.date.slice(0,4)} RESULT</div></div>
    <div class="sb-last-election" id="sb-election"></div></div>`;

  // Info
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">INFO</div></div>
    <div class="sb-hint">Data: Wikipedia${COUNTRY==='sweden'?' + SwedishPolls (CC0)':''}<br>${SEATS_TOTAL} seats · ${SEAT_METHOD==='dhondt'?'D\'Hondt':'Sainte-Laguë'} · ${THRESHOLD}% threshold<br>Next election: ${META.election_date||LAST_ELECTION.date}</div></div>`;

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
      <div class="sb-le-name">${partyCode(pid)}</div>
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
    <div class="hero-date">${filteredPolls.length} polls · latest: ${latestStr} (${days}d ago) · sample-size + pollster accuracy + recency weighted</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <div style="width:36px;height:36px;border:2px solid var(--c-edge);box-shadow:var(--shadow-md);background:${color};display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${logoSrc?`<img src="${logoSrc}" alt="${topParty}" style="width:28px;height:28px;object-fit:contain">`:`<span style="color:#fff;font-weight:900;font-size:12px">${topParty}</span>`}
      </div>
      <div>
        <span style="font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;font-family:var(--font-mono)">${valDisp(topPct)}</span>
        <span style="font-size:13px;font-weight:700;color:var(--c-text-muted);margin-left:4px">leading</span>
      </div>
    </div>
  </div>`;
}

/* ---------- render party bars ---------- */
function renderPartyBars(avg){
  const maxPct=Math.max(...Object.values(avg).filter(v=>v!==null),1);
  const seats=allocateSeatsN(avg, SEATS_TOTAL);
  const order=PARTY_ORDER.slice().sort((a,b)=>(avg[b]||0)-(avg[a]||0));
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">NATIONAL POLL AVERAGE</div></div>
    <div class="bar-header"><span class="bh-logo"></span><span class="bh-party">PARTY</span><span class="bh-bar"></span><span class="bh-pct">${SEAT_BASED?'SEATS':'%'}</span><span class="bh-delta">Δ</span>${SEAT_BASED?'':'<span class="bh-seats">SEATS</span>'}</div>`;

  for(const pid of order){
    const val=avg[pid];
    if(val===null||val===undefined) continue;
    const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
    const barWidth=Math.max(1,(val/maxPct)*100);
    const last2022=SEAT_BASED?(LAST_ELECTION.seats[pid]||0):(LAST_ELECTION.results[pid]||0);
    const delta=(SEAT_BASED?Math.ceil(val):val)-last2022;
    const deltaStr=delta>0?`+${SEAT_BASED?Math.round(delta):fmt(delta)}`:SEAT_BASED?String(Math.round(delta)):fmt(delta);
    const deltaColor=delta>0?'#0B9E17':delta<0?'var(--c-accent)':'var(--c-text-muted)';
    const mpSeats=SEAT_BASED?Math.ceil(val):(seats[pid]||0);

    html+=`<div class="party-row">
      <div class="party-logo" style="background:${color}">
        ${PARTY_LOGOS[pid]?`<img src="${PARTY_LOGOS[pid]}" alt="${pid}" style="width:24px;height:24px;object-fit:contain">`:`<span>${partyCode(pid)}</span>`}
      </div>
      <div class="party-name">${partyCode(pid)}</div>
      <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:${color}"></div></div>
      <div class="party-pct">${valDisp(val)}</div>
      <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
      ${SEAT_BASED?'':`<div class="party-seats" style="color:${color}">${mpSeats}</div>`}
    </div>`;
  }
  html+=`</div>`;
  return html;
}

/* ---------- render bloc summary ---------- */
function blocSeats(rg,td){
  const others=Math.max(0,SEATS_TOTAL-rg-td);
  const parts=[rg,td,others];
  const base=parts.map(Math.floor);
  const rem=parts.map((p,i)=>p-base[i]);
  let left=SEATS_TOTAL-base.reduce((a,b)=>a+b,0);
  while(left>0){
    let bi=-1;
    for(let i=0;i<3;i++) if(bi<0||rem[i]>rem[bi]) bi=i;
    rem[bi]=-1; base[bi]++; left--;
  }
  return {gov:base[0],opp:base[1],other:base[2]};
}
function renderBlocs(avg){
  const rg=BLOCS.bloc1.parties.reduce((s,p)=>s+(avg[p]||0),0);
  const td=BLOCS.bloc2.parties.reduce((s,p)=>s+(avg[p]||0),0);
  const rgDisp=SEAT_BASED?blocSeats(rg,td).gov:valDisp(rg);
  const tdDisp=SEAT_BASED?blocSeats(rg,td).opp:valDisp(td);
  return `<div class="bloc-row">
    <div class="bloc-card" style="border-left:6px solid ${BLOCS.bloc1.color}">
      <div class="bloc-name">${BLOCS.bloc1.name}</div>
      <div class="bloc-pct" style="color:${BLOCS.bloc1.color}">${rgDisp}</div>
      <div class="bloc-parties">${BLOCS.bloc1.parties.map(partyCode).join(' + ')}</div>
    </div>
    <div class="bloc-card" style="border-left:6px solid ${BLOCS.bloc2.color}">
      <div class="bloc-name">${BLOCS.bloc2.name}</div>
      <div class="bloc-pct" style="color:${BLOCS.bloc2.color}">${tdDisp}</div>
      <div class="bloc-parties">${BLOCS.bloc2.parties.map(partyCode).join(' + ')}</div>
    </div>
  </div>`;
}

/* ---------- render trend chart (canvas) ---------- */
const CHART_STATE={};

function renderTrendChart(canvas, polls){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth;
  const H=wrap.clientHeight||320;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);

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
  const pad={top:20,right:60,bottom:40,left:50};
  const cw=W-pad.left-pad.right;
  const ch=H-pad.top-pad.bottom;

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

  // Find y range (data-driven, no clipping; cap at 55 for sanity)
  let yMin=Infinity,yMax=-Infinity;
  series.forEach(s=>s.points.forEach(v=>{if(v!==null){yMin=Math.min(yMin,v);yMax=Math.max(yMax,v)}}));
  if(!isFinite(yMin)){yMin=0;yMax=45}
  yMin=Math.floor(Math.max(0,yMin-3));
  yMax=Math.ceil(Math.min(55,yMax+3));

  CHART_STATE.ctx=ctx; CHART_STATE.W=W; CHART_STATE.H=H;
  CHART_STATE.pad=pad; CHART_STATE.dates=dates; CHART_STATE.series=series;
  CHART_STATE.yMin=yMin; CHART_STATE.yMax=yMax; CHART_STATE.byDate=byDate;
  CHART_STATE.cw=cw; CHART_STATE.ch=ch; CHART_STATE.wrap=wrap;

  drawChartBase();

  // Tooltip element
  let tip=wrap.querySelector('.chart-tooltip');
  if(!tip){
    tip=document.createElement('div');
    tip.className='chart-tooltip';
    wrap.appendChild(tip);
  }
  CHART_STATE.tip=tip;

  wrap.onmousemove=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left;
    const idx=Math.round((mx-pad.left)/cw*(dates.length-1));
    if(idx<0||idx>=dates.length){drawChartBase();tip.classList.remove('visible');return}
    drawChartBase(idx);
    const date=dates[idx];
    let rows='';
    for(const pid of PARTY_ORDER){
      const vals=byDate[date][pid];
      if(!vals||!vals.length) continue;
      const v=vals.reduce((a,b)=>a+b,0)/vals.length;
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      rows+=`<div class="ct-row"><span class="ct-dot" style="background:${color}"></span><span class="ct-label">${pid}</span><span class="ct-val">${SEAT_BASED?String(Math.round(v)):v.toFixed(1)+'%'}</span></div>`;
    }
    tip.innerHTML=`<div class="ct-date">${date}</div>${rows}`;
    tip.classList.add('visible');
    // position tooltip next to cursor, clamped inside the chart wrap
    const tw=tip.offsetWidth||150;
    const th=tip.offsetHeight||120;
    let tx=e.clientX-r.left+16;
    if(tx+tw>W-4) tx=e.clientX-r.left-tw-16;
    let ty=e.clientY-r.top+12;
    if(ty+th>H-4) ty=e.clientY-r.top-th-12;
    tip.style.left=Math.max(4,Math.min(W-tw-4,tx))+'px';
    tip.style.top=Math.max(4,Math.min(H-th-4,ty))+'px';
  };
  wrap.onmouseleave=()=>{
    drawChartBase();
    if(tip) tip.classList.remove('visible');
  };
}

function drawChartBase(hoverIdx){
  const s=CHART_STATE;
  const {ctx,W,H,pad,dates,series,yMin,yMax,cw,ch}=s;
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  // Grid
  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  const yTicks=5;
  for(let i=0;i<=yTicks;i++){
    const y=pad.top+ch*(i/yTicks);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const val=yMax-(yMax-yMin)*(i/yTicks);
    ctx.fillStyle='#64748B';ctx.font='10px Decima Mono Pro,monospace';ctx.textAlign='right';
    ctx.fillText(SEAT_BASED?String(Math.round(val)):pct(val),pad.left-6,y+3);
  }

  // X labels
  const xStep=Math.max(1,Math.floor(dates.length/8));
  ctx.fillStyle='#64748B';ctx.font='10px Decima Mono Pro,monospace';ctx.textAlign='center';
  for(let i=0;i<dates.length;i+=xStep){
    const x=pad.left+(i/(dates.length-1))*cw;
    ctx.fillText(dates[i].slice(5),x,H-pad.bottom+16);
  }

  // Lines
  series.forEach(ser=>{
    ctx.beginPath();
    ctx.strokeStyle=ser.color;
    ctx.lineWidth=2;
    let started=false;
    ser.points.forEach((v,i)=>{
      if(v===null) return;
      const x=pad.left+(i/(dates.length-1))*cw;
      const y=pad.top+ch*(1-(v-yMin)/(yMax-yMin));
      if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });

  // End labels
  series.forEach(ser=>{
    const lastIdx=ser.points.length-1;
    let lastVal=null;
    for(let i=lastIdx;i>=0;i--){if(ser.points[i]!==null){lastVal=ser.points[i];break}}
    if(lastVal===null) return;
    const x=W-pad.right+4;
    const y=pad.top+ch*(1-(lastVal-yMin)/(yMax-yMin));
    ctx.fillStyle=ser.color;ctx.font='bold 10px Decima Mono Pro,monospace';ctx.textAlign='left';
    ctx.fillText(partyCode(ser.pid),x,y+3);
  });

  // Hover overlay: guide line + dots
  if(hoverIdx!==undefined&&hoverIdx>=0&&hoverIdx<dates.length){
    const x=pad.left+(hoverIdx/(dates.length-1))*cw;
    ctx.strokeStyle='#111827';ctx.lineWidth=1;
    ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,H-pad.bottom);ctx.stroke();
    ctx.setLineDash([]);
    series.forEach(ser=>{
      const v=ser.points[hoverIdx];
      if(v===null) return;
      const y=pad.top+ch*(1-(v-yMin)/(yMax-yMin));
      ctx.beginPath();
      ctx.fillStyle=ser.color;
      ctx.strokeStyle='#111827';ctx.lineWidth=1;
      ctx.arc(x,y,3.5,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

/* ---------- render individual polls table ---------- */
function renderPollsTable(polls){
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">INDIVIDUAL POLLS</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>Date</th><th>Pollster</th><th class="c">N</th><th class="c">Lead</th>
      <th class="c" style="color:${BLOCS.bloc1.color}">${BLOCS.bloc1.short}</th><th class="c" style="color:${BLOCS.bloc2.color}">${BLOCS.bloc2.short}</th>`;
  PARTY_ORDER.forEach(p=>{html+=`<th class="c">${partyCode(p)}</th>`});
  html+=`</tr></thead><tbody>`;

  polls.slice(0,60).forEach(p=>{
    // Leader + margin
    const sorted=PARTY_ORDER.slice().sort((a,b)=>(p.votes[b]||0)-(p.votes[a]||0));
    const leadP=sorted[0], leadV=p.votes[leadP]||0;
    const secondV=p.votes[sorted[1]]||0;
    const margin=leadV-secondV;
    const leadColor=PARTY_META[leadP]?PARTY_META[leadP].color:'#888';
    // Blocs
    const rg=BLOCS.bloc1.parties.reduce((s,q)=>s+(p.votes[q]||0),0);
    const td=BLOCS.bloc2.parties.reduce((s,q)=>s+(p.votes[q]||0),0);
    const rgWin=rg>=td;

    html+=`<tr><td>${p.date.slice(5)}</td><td>${p.pollster}</td><td class="num c">${p.n?p.n.toLocaleString():'—'}</td>
      <td class="num c" style="color:${leadColor};font-weight:700">${partyCode(leadP)} +${SEAT_BASED?String(Math.round(margin)):fmt(margin)}</td>
      <td class="num c" style="color:${BLOCS.bloc1.color};font-weight:${rgWin?'900':'700'};background:${rgWin?'#EE202022':''}">${valDisp(rg)}</td>
      <td class="num c" style="color:${BLOCS.bloc2.color};font-weight:${rgWin?'700':'900'};background:${rgWin?'':'#006AB522'}">${valDisp(td)}</td>`;
    PARTY_ORDER.forEach(pid=>{
      const v=p.votes[pid];
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      const isTop=pid===leadP;
      html+=`<td class="num c" style="color:${v!==undefined?color:'var(--c-rule)'};font-weight:${isTop?'900':'400'};background:${isTop?color+'22':''}">${v!==undefined?(SEAT_BASED?Math.round(v):pct(v)):'—'}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      ${BLOCS.bloc1.name} = ${BLOCS.bloc1.parties.map(partyCode).join('+')} · ${BLOCS.bloc2.name} = ${BLOCS.bloc2.parties.map(partyCode).join('+')} · Lead = margin between the two largest parties in the poll
    </div></div>`;
  return html;
}

/* ---------- render parliament ---------- */
let PARL_MODE='proj';  // 'proj' or '2022'

function normalizeTo(src, total){
  // direct seat counts (2022 RESULT for seat-based countries), scaled to total
  const out={};
  let sum=0;
  PARTY_ORDER.forEach(p=>{out[p]=src[p]||0; sum+=out[p]});
  if(sum===0) return out;
  const k=total/sum;
  if(Math.abs(k-1)>0.001){
    PARTY_ORDER.forEach(p=>{out[p]=Math.round(out[p]*k)});
    let s=PARTY_ORDER.reduce((a,p)=>a+out[p],0);
    if(s!==total) out[PARTY_ORDER[0]]+=(total-s);
  }
  return out;
}

function seatParliament(avg, total){
  // Seat-based countries: round the seat averages (largest remainder),
  // excluding parties below the electoral threshold (in seats)
  const thSeats=THRESHOLD/100*total;
  const fl={},frs=[];
  let sum=0;
  PARTY_ORDER.forEach(p=>{
    const m=avg[p]||0;
    if(m<thSeats){fl[p]=0;return}
    const f=Math.floor(m);
    fl[p]=f;frs.push([m-f,p]);sum+=f;
  });
  let left=total-sum;
  frs.sort((a,b)=>b[0]-a[0]);
  for(let i=0;i<left&&i<frs.length;i++)fl[frs[i][1]]++;
  return fl;
}

function renderParliament(avg){
  const seats=SEAT_BASED
    ?(PARL_MODE==='proj'?seatParliament(avg,SEATS_TOTAL):normalizeTo(LAST_ELECTION.seats,SEATS_TOTAL))
    :(PARL_MODE==='proj'?allocateSeatsN(avg,SEATS_TOTAL):allocateSeatsN(LAST_ELECTION.results,SEATS_TOTAL));
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">SEAT PROJECTION</div></div>
    <div class="map-toggle-row" style="justify-content:flex-end">
      <button class="map-toggle-btn parl-btn${PARL_MODE==='proj'?' active':''}" data-parlmode="proj">PROJECTION</button>
      <button class="map-toggle-btn parl-btn${PARL_MODE==='2022'?' active':''}" data-parlmode="2022">2022 RESULT</button>
    </div>
    <div class="parliament-box">${buildParliamentSVG(seats)}</div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
      ${SEATS_TOTAL} seats · ${SEAT_METHOD==='dhondt'?"D'Hondt":'Sainte-Laguë (modified)'} · ${THRESHOLD}% threshold
    </div></div>`;
}

function allocateSeatsN(votes, totalSeats){
  const validParties=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
  const totalVotes=validParties.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalVotes===0) return {};
  const seats={};
  validParties.forEach(p=>{seats[p]=0});

  // Modified Sainte-Laguë (1.2, 3, 5, ...) or D'Hondt (1, 2, 3, ...)
  const divisors=[];
  for(let i=1;i<=totalSeats;i++){
    divisors.push(SEAT_METHOD==='dhondt'?i:(i===1?1.2:2*i-1));
  }

  const quota=[];
  validParties.forEach(p=>{
    for(let d=0;d<divisors.length;d++){
      quota.push({party:p, q:(votes[p]||0)/divisors[d]});
    }
  });
  quota.sort((a,b)=>b.q-a.q);
  for(let i=0;i<totalSeats&&i<quota.length;i++){
    seats[quota[i].party]++;
  }
  return seats;
}

function allocateSeats(avg){
  return allocateSeatsN(avg, 310);
}

function buildParliamentSVG(seats){
  const total=Object.values(seats).reduce((a,b)=>a+b,0);
  if(total===0) return '<svg viewBox="0 0 10 10"></svg>';

  // Parties as wedges filled from the left in spectrum order.
  const assigned=[];
  PARLIAMENT_ORDER.forEach(p=>{
    const n=seats[p]||0;
    for(let i=0;i<n;i++) assigned.push(p);
  });

  const layout=PARLIAMENT_SEATS[COUNTRY];
  if(layout && layout.seats && layout.seats.length>=assigned.length){
    // Real chamber geometry (parliamentarch SVG). Order the fixed seat
    // positions around the arch center from left to right so each party
    // fills a contiguous wedge; majority axis at the top, total at the base.
    const pts=layout.seats.map((s,i)=>({
      angle:Math.atan2(layout.cx-s[0], layout.cy-s[1]),
      r:Math.hypot(s[0]-layout.cx, s[1]-layout.cy),
      x:s[0], y:s[1], rr:s[2], i,
    }));
    pts.sort((a,b)=>(a.angle-b.angle)||(b.r-a.r)).reverse();

    let minY=Infinity, maxY=-Infinity;
    pts.forEach(p=>{ if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; });
    const topSeat=pts.find(p=>p.y===minY)||pts[0];
    const botSeat=pts.find(p=>p.y===maxY)||pts[0];
    const topR=topSeat?topSeat.rr:4, botR=botSeat?botSeat.rr:4;

    const majority=Math.floor(total/2)+1;
    const padTop=Math.max(8,Math.round(26-minY));
    const labelY=minY-topR-3;
    const lineTop=labelY+4;
    const lineBot=minY+(maxY-minY)*0.55;
    const totalFs=layout.h<=200?20:26;
    const capH=Math.ceil(totalFs*0.72), descH=Math.ceil(totalFs*0.2)+2;
    const padBottom=padTop+capH+descH+4;
    const totalY=layout.h+capH+2;

    let svg=`<svg viewBox="0 ${-padTop} ${layout.w} ${layout.h+padBottom}" xmlns="http://www.w3.org/2000/svg">`;
    svg+=`<text x="${layout.cx}" y="${fmt(labelY,1)}" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="1" fill="#111827" font-family="Decima Mono Pro,monospace">MAJORITY ${majority}</text>`;
    svg+=`<line x1="${layout.cx}" y1="${fmt(lineTop,1)}" x2="${layout.cx}" y2="${fmt(lineBot,1)}" stroke="#111827" stroke-width="1" stroke-dasharray="3,3" opacity="0.25"/>`;
    for(let i=0;i<assigned.length&&i<pts.length;i++){
      const party=assigned[i];
      const col=PARTY_META[party]?PARTY_META[party].color:'#888';
      svg+=`<circle cx="${fmt(pts[i].x,2)}" cy="${fmt(pts[i].y,2)}" r="${fmt(pts[i].rr,2)}" fill="${col}"/>`;
    }
    svg+=`<text x="${layout.cx}" y="${fmt(totalY,1)}" text-anchor="middle" font-size="${totalFs}" font-weight="900" fill="#111827" font-family="Decima Mono Pro,monospace">${total}</text>`;
    svg+=`</svg>`;
    return svg;
  }

  // Fallback: generated semicircle (topocentric), as before.
  const radii=[]; for(let r=130;r<265;r+=10) radii.push(r);
  const sumR=radii.reduce((a,b)=>a+b,0);
  const seatsPerRow=radii.map(r=>Math.round(total*(r/sumR)));
  let spSum=seatsPerRow.reduce((a,b)=>a+b,0);
  if(spSum!==total) seatsPerRow[seatsPerRow.length-1]+=(total-spSum);

  const points=[];
  for(let i=0;i<radii.length;i++){
    const r=radii[i], s=seatsPerRow[i];
    if(s<=0) continue;
    for(let j=0;j<s;j++){
      const angle=Math.PI-(Math.PI*j)/Math.max(1,(s-1));
      points.push({x:r*Math.cos(angle), y:r*Math.sin(angle), angle, r});
    }
  }
  points.sort((a,b)=>(a.angle-b.angle)||(b.r-a.r)).reverse();

  const majority=Math.floor(total/2)+1;
  let svg=`<svg viewBox="-10 -26 540 296" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">`;
  svg+=`<text x="250" y="-16" text-anchor="middle" font-size="13" font-weight="900" fill="#111827" font-family="Decima Mono Pro,monospace">MAJORITY ${majority}</text>`;
  svg+=`<line x1="250" y1="-12" x2="250" y2="130" stroke="#111827" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.4"/>`;
  for(let i=0;i<assigned.length;i++){
    if(i<points.length){
      const party=assigned[i];
      const col=PARTY_META[party]?PARTY_META[party].color:'#888';
      svg+=`<circle cx="${fmt(250+points[i].x,1)}" cy="${fmt(250-points[i].y,1)}" r="5" fill="${col}"/>`;
    }
  }
  svg+=`<text x="250" y="240" text-anchor="middle" font-size="46" font-weight="900" fill="#111827" font-family="Decima Mono Pro,monospace">${total}</text>`;
  svg+=`</svg>`;
  return svg;
}

function bindParlToggles(){
  const pane=$('pane-polls');
  if(!pane) return;
  pane.querySelectorAll('.parl-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.parlmode) PARL_MODE=btn.dataset.parlmode;
      renderPollsTab();
    });
  });
}

/* ---------- forecast: fast Sainte-Laguë ---------- */
function allocateSeatsFast(votes, total){
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
  if(!valid.length) return {};
  const seats={};valid.forEach(p=>{seats[p]=0});
  const quo={};
  valid.forEach(p=>{quo[p]=SEAT_METHOD==='dhondt'?(votes[p]||0):(votes[p]||0)/1.2});
  for(let i=0;i<total;i++){
    let best=valid[0];
    for(const p of valid){if(quo[p]>quo[best])best=p}
    seats[best]++;
    quo[best]=SEAT_METHOD==='dhondt'?(votes[best]||0)/(seats[best]+1):(votes[best]||0)/(2*seats[best]+1);
  }
  return seats;
}

/* ---------- forecast: Monte Carlo simulation ---------- */
// Dirichlet concentration: alpha_p = avg_p(%) * K. sd(share) = sqrt(s(1-s)/(K*sum(avg)+1)).
// K calibrated to the empirically measured pollster error: the MAE of final
// poll averages across 2014/2018/2022 was ~1.2-1.5pp. K=11 gives sigma ~1.4pp
// for a 30% party (with the election 9 days away, late swings are limited).
const FORECAST_K=11;

// Seeded PRNG (mulberry32) so the forecast is deterministic/static for a given dataset
function mulberry32(seed){
  let a=seed>>>0;
  return function(){
    a|=0;a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function hashStr(s){
  let h=5381;
  for(let i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))>>>0}
  return h;
}
let fcRand=Math.random;
const FC_CACHE={};

function forecastSigma(avg){
  const sumA=PARTY_ORDER.reduce((a,p)=>a+Math.max(0.5,(avg[p]||0)),0)*FORECAST_K;
  return Math.sqrt(0.3*0.7/(sumA+1))*100;
}

function gammaSample(alpha){
  // Marsaglia-Tsang (alpha > 1)
  const d=alpha-1/3, c=1/Math.sqrt(9*d);
  for(let i=0;i<20;i++){
    const z=Math.sqrt(-2*Math.log(fcRand()))*(fcRand()<0.5?-1:1);  // full standard normal
    const y=Math.pow(1+c*z,3);
    if(y>0){
      const u=fcRand();
      if(u<1-0.0331*Math.pow(z,4)||Math.log(u)<0.5*z*z+d*(1-y+Math.log(y))) return d*y;
    }
  }
  return d;
}

const FORECAST_K_SEATS=3.5;  // Dirichlet concentration for seat shares

function runSeatForecast(avg, nSims){
  const thSeats=THRESHOLD/100*SEATS_TOTAL;
  const maj={rg:0,td:0,hung:0};
  const largest={};
  const seatsBy={};
  const votesBy={};
  PARTY_ORDER.forEach(p=>{seatsBy[p]=[];votesBy[p]=[]});
  const alpha=PARTY_ORDER.map(p=>Math.max(0.2,(avg[p]||0)*FORECAST_K_SEATS));
  for(let s=0;s<nSims;s++){
    const draws=alpha.map(a=>gammaSample(a));
    const totalD=draws.reduce((a,b)=>a+b,0);
    const simVotes={};
    PARTY_ORDER.forEach((p,i)=>{simVotes[p]=100*draws[i]/totalD});
    // seats = share * 120, threshold applied, adjusted to sum 120
    let seats={};
    const valid=[];
    PARTY_ORDER.forEach(p=>{
      const raw=simVotes[p]/100*SEATS_TOTAL;
      if(raw>=thSeats){seats[p]=Math.floor(raw);valid.push(p)}
      else seats[p]=0;
    });
    let used=valid.reduce((a,p)=>a+seats[p],0);
    let left=SEATS_TOTAL-used;
    const rems=valid.map(p=>[simVotes[p]/100*SEATS_TOTAL-seats[p],p]).sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++)seats[rems[i][1]]++;
    const MAJ_TH=Math.floor(SEATS_TOTAL/2)+1;
    const rg=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const td=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
    if(rg>=MAJ_TH)maj.rg++;
    else if(td>=MAJ_TH)maj.td++;
    else maj.hung++;
    let top=PARTY_ORDER[0],topN=(seats[PARTY_ORDER[0]]||0);
    for(const p of PARTY_ORDER){if((seats[p]||0)>topN){topN=seats[p];top=p}}
    largest[top]=(largest[top]||0)+1;
    PARTY_ORDER.forEach(p=>{seatsBy[p].push(seats[p]||0);votesBy[p].push(simVotes[p])});
  }
  return summarize(seatsBy,votesBy,largest,maj,nSims);
}

function runForecast(avg, nSims){
  if(SEAT_BASED) return runSeatForecast(avg, nSims);
  const K=FORECAST_K;
  const maj={rg:0,td:0,hung:0};
  const largest={};
  const seatsBy={};
  const votesBy={};
  PARTY_ORDER.forEach(p=>{seatsBy[p]=[];votesBy[p]=[]});
  const comboCount={};
  const alpha=PARTY_ORDER.map(p=>Math.max(0.5,(avg[p]||0)*K));
  for(let s=0;s<nSims;s++){
    const draws=alpha.map(a=>gammaSample(a));
    const totalD=draws.reduce((a,b)=>a+b,0);
    const simVotes={};
    PARTY_ORDER.forEach((p,i)=>{simVotes[p]=100*draws[i]/totalD});
    const seats=allocateSeatsFast(simVotes,SEATS_TOTAL);
    const rg=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const td=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const MAJ_TH=Math.floor(SEATS_TOTAL/2)+1;
    if(rg>=MAJ_TH)maj.rg++;
    else if(td>=MAJ_TH)maj.td++;
    else maj.hung++;
    let top=PARTY_ORDER[0],topN=(seats[PARTY_ORDER[0]]||0);
    for(const p of PARTY_ORDER){if((seats[p]||0)>topN){topN=seats[p];top=p}}
    largest[top]=(largest[top]||0)+1;
    PARTY_ORDER.forEach(p=>{seatsBy[p].push(seats[p]||0);votesBy[p].push(simVotes[p])});
    comboCount[PARTY_ORDER.map(p=>seats[p]||0).join(',')]=(comboCount[PARTY_ORDER.map(p=>seats[p]||0).join(',')]||0)+1;
  }
  return summarize(seatsBy,votesBy,largest,maj,nSims,comboCount);
}

function summarize(seatsBy,votesBy,largest,maj,nSims,comboCount){
  const means={},medians={},modes={};
  PARTY_ORDER.forEach(p=>{
    const arr=seatsBy[p];
    means[p]=arr.reduce((a,b)=>a+b,0)/arr.length;
    const sorted=arr.slice().sort((a,b)=>a-b);
    medians[p]=sorted[Math.floor(arr.length/2)];
    const c={};let best=arr[0],bc=0;
    arr.forEach(v=>{c[v]=(c[v]||0)+1;if(c[v]>bc){bc=c[v];best=v}});
    modes[p]=best;
  });
  let modalKey=null,modalN=0;
  if(comboCount){
    for(const k in comboCount){if(comboCount[k]>modalN){modalN=comboCount[k];modalKey=k}}
  }
  const modal={};
  if(modalKey){
    PARTY_ORDER.forEach((p,i)=>{modal[p]=parseInt(modalKey.split(',')[i],10)});
  }
  return {maj,largest,seatsBy,votesBy,means,medians,modes,modal,modalN,nSims};
}

function deterministicSeats(medians, means, total){
  // Deterministic projection from MEDIAN seats: parties whose median is 0
  // (usually below the threshold) are left at 0. Sum is adjusted to the
  // total using only parties present in the median outcome.
  const s={};
  PARTY_ORDER.forEach(p=>{s[p]=medians[p]||0});
  let sum=PARTY_ORDER.reduce((a,p)=>a+s[p],0);
  const eligible=PARTY_ORDER.filter(p=>s[p]>0);
  if(sum<total&&eligible.length){
    const order=eligible.slice().sort((a,b)=>(means[b]-medians[b])-(means[a]-medians[a]));
    let i=0;
    while(sum<total){s[order[i%order.length]]++;sum++;i++}
  }else if(sum>total&&eligible.length){
    const order=eligible.slice().sort((a,b)=>(medians[b]-means[b])-(medians[a]-means[a]));
    let i=0;
    while(sum>total){if(s[order[i%order.length]]>0){s[order[i%order.length]]--;sum--}i++}
  }
  return s;
}

function pct100(x){return (x*100).toFixed(1)+'%'}

/* ---------- forecast tab ---------- */
function renderForecast(pane){
  const daysVal=parseInt($('filter-days').value)||30;
  const pollsterVal=$('filter-pollster')?$('filter-pollster').value:'';
  let filtered=recentPolls(POLLS,daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  const avg=computeAverages(filtered);
  if(!filtered.length||Object.values(avg).every(v=>v===null)){
    pane.innerHTML=`<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">FORECAST</div></div><div class="method-text" style="padding:16px"><p>No polls in the selected range.</p></div></div></div>`;
    return;
  }

  // Deterministic + static: seeded simulation, cached per filter state
  const seedKey=(POLLS[0]?POLLS[0].date:'')+'|'+daysVal+'|'+pollsterVal;
  let sim=FC_CACHE[seedKey];
  if(!sim){
    fcRand=mulberry32(hashStr(seedKey));
    sim=runForecast(avg,3000);
    FC_CACHE[seedKey]=sim;
  }
  const maj=sim.maj;
  const majTotal=sim.nSims;
  const rgP=maj.rg/majTotal, tdP=maj.td/majTotal, hungP=maj.hung/majTotal;
  const MAJ=Math.floor(SEATS_TOTAL/2)+1;

  // --- Deterministic: median-based parliament ---
  const detSeats=deterministicSeats(sim.medians,sim.means,SEATS_TOTAL);
  let cmpRows='';
  const cmpOrder=PARTY_ORDER.slice().sort((a,b)=>sim.means[b]-sim.means[a]);
  cmpOrder.forEach(p=>{
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    cmpRows+=`<tr>
      <td style="font-weight:700;color:${color}">${partyCode(p)}</td>
      <td class="num c" style="font-weight:900">${detSeats[p]}</td>
      <td class="num c">${sim.medians[p]}</td>
      <td class="num c">${sim.modes[p]}</td>
    </tr>`;
  });

  // --- Constituency results (median national vote shares) ---
  const medVotes={};
  PARTY_ORDER.forEach(p=>{
    const arr=sim.votesBy[p].slice().sort((a,b)=>a-b);
    medVotes[p]=arr[Math.floor(arr.length/2)];
  });
  const constHtml=CONSTITUENCIES&&CONSTITUENCIES.constituencies&&CONSTITUENCIES.constituencies.length?
    constituencyTableHtml(medVotes,{
      title:'CONSTITUENCIES',
      showDelta:true,
      note:'allocated from the forecast’s median national vote shares'
    }):'';

  // --- Probabilities ---
  const majorityBar=`<div class="fc-majbar">
    <div class="fc-majseg" style="width:${(rgP*100).toFixed(1)}%;background:${BLOCS.bloc1.color}"></div>
    <div class="fc-majseg" style="width:${(tdP*100).toFixed(1)}%;background:${BLOCS.bloc2.color}"></div>
    <div class="fc-majseg" style="width:${(hungP*100).toFixed(1)}%;background:#9CA3AF"></div>
  </div>`;

  let largestRows='';
  const largestSorted=PARTY_ORDER.slice().sort((a,b)=>(sim.largest[b]||0)-(sim.largest[a]||0));
  const maxL=Math.max(...Object.values(sim.largest),1);
  largestSorted.forEach(p=>{
    const n=sim.largest[p]||0;
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    largestRows+=`<div class="fc-row">
      <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
      <div class="fc-row-bar"><div class="fc-row-fill" style="width:${(n/maxL*100).toFixed(1)}%;background:${color}"></div></div>
      <span class="fc-row-val">${pct100(n/sim.nSims)}</span>
    </div>`;
  });

  let voteRows='';
  const voteOrder=PARTY_ORDER.slice().sort((a,b)=>mean(sim.votesBy[b])-mean(sim.votesBy[a]));
  const vsMax=SEAT_BASED?60:50;
  const vsThresh=SEAT_BASED?THRESHOLD/100*SEATS_TOTAL:THRESHOLD;
  voteOrder.forEach(p=>{
    const arr=sim.votesBy[p];
    const mu=SEAT_BASED?mean(arr)/100*SEATS_TOTAL:mean(arr);
    const lo=SEAT_BASED?percentile(arr,5)/100*SEATS_TOTAL:percentile(arr,5);
    const hi=SEAT_BASED?percentile(arr,95)/100*SEATS_TOTAL:percentile(arr,95);
    const thresh=arr.filter(v=>(SEAT_BASED?v/100*SEATS_TOTAL:v)>=vsThresh).length/arr.length;
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    const barW=Math.min(100,mu/vsMax*100);
    let note='';
    if(thresh>=0.5){
      if(thresh<0.995) note=`<div class="fc-note">${partyCode(p)} is below the threshold in ${pct100(1-thresh)} of sims</div>`;
    }else if(thresh>0.005){
      note=`<div class="fc-note">${partyCode(p)} crosses the threshold in ${pct100(thresh)} of sims</div>`;
    }
    voteRows+=`<div class="fc-voterow">
      <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
      <div class="fc-row-bar fc-votebar"><div class="fc-row-fill" style="width:${barW}%;background:${color}"></div><div class="fc-thresh" style="left:${(vsThresh/vsMax*100).toFixed(1)}%"></div></div>
      <span class="fc-vote-val">${fmt(mu,1)}${SEAT_BASED?'':'%'}</span>
      <span class="fc-vote-int">${fmt(lo,1)}–${fmt(hi,1)}</span>
      ${note}
    </div>`;
  });

  let seatRows='';
  const seatOrder=PARTY_ORDER.slice().sort((a,b)=>{
    const ma=mean(sim.seatsBy[a]), mb=mean(sim.seatsBy[b]);
    return mb-ma;
  });
  const MAX_BUCKETS=25;
  seatOrder.forEach(p=>{
    const arr=sim.seatsBy[p];
    const mu=mean(arr);
    const lo=percentile(arr,5), hi=percentile(arr,95);
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    const span=Math.max(1,hi-lo);
    const bW=Math.max(1,Math.ceil(span/MAX_BUCKETS));
    const buckets=new Array(Math.ceil(350/bW)).fill(0);
    arr.forEach(v=>{buckets[Math.floor(v/bW)]++});
    const maxB=Math.max(...buckets,1);
    let hist='';
    buckets.forEach((c,i)=>{
      const h=Math.round(c/maxB*36);
      hist+=`<div class="fc-hist-col" style="height:${Math.max(1,h)}px;background:${color};opacity:${0.35+0.65*(c/maxB)}"></div>`;
    });
    const inParliament=mu>0.5;
    seatRows+=`<div class="fc-seatrow">
      <div class="fc-seathead">
        <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
        <span class="fc-seat-mean">${fmt(mu,0)}</span>
        <span class="fc-seat-int">${lo}–${hi}</span>
      </div>
      <div class="fc-hist">${hist}</div>
      ${inParliament?'':'<div class="fc-note">likely below the '+THRESHOLD+'% threshold</div>'}
    </div>`;
  });

  const leadOutcome=rgP>=tdP?BLOCS.bloc1.name:BLOCS.bloc2.name;
  const leadColor=rgP>=tdP?BLOCS.bloc1.color:BLOCS.bloc2.color;
  const leadPct=Math.max(rgP,tdP)*100;

  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">FORECAST — ${COUNTRY_NAME} 2026</div>
      <div class="fc-headline">
        <span class="fc-headline-label" style="color:${leadColor}">${leadOutcome} majority</span>
        <span class="fc-headline-num">${leadPct.toFixed(1)}%</span>
      </div>
      <div class="hero-date">${sim.nSims.toLocaleString()} simulations · national polling error (σ≈${SEAT_BASED?fmt(2.2,1)+' seats':fmt(forecastSigma(avg),1)+'pp'}) · ${SEAT_METHOD==='dhondt'?"D'Hondt":'Sainte-Laguë'} · ${SEATS_TOTAL} seats · ${THRESHOLD}% threshold · seeded, reproducible</div>
    </div>

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">IF THE ELECTION WERE HELD TODAY</div></div>
      <div class="parliament-box">${buildParliamentSVG(detSeats)}</div>
      <div style="overflow-x:auto">
      <table class="polls-table compact-table"><thead><tr>
        <th>Party</th><th class="c">Seats</th><th class="c">Median</th><th class="c">Mode</th>
      </tr></thead><tbody>${cmpRows}</tbody></table></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
        Deterministic projection from the median of the simulations (parties whose median is 0 are left out)
      </div>
    </div>

    ${constHtml}

    <div class="fc-section"><div class="bar"></div>PROBABILITIES</div>

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">MAJORITY</div></div>
      ${majorityBar}
      <div class="fc-majlegend">
        <span><span class="fc-dot" style="background:${BLOCS.bloc1.color}"></span>${BLOCS.bloc1.name} ${pct100(rgP)}</span>
        <span><span class="fc-dot" style="background:${BLOCS.bloc2.color}"></span>${BLOCS.bloc2.name} ${pct100(tdP)}</span>
        <span><span class="fc-dot" style="background:#9CA3AF"></span>No majority ${pct100(hungP)}</span>
      </div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Chance of a ${MAJ}-seat majority</div>
    </div>

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">LARGEST PARTY</div></div>
      ${largestRows}
    </div>

    ${SEAT_BASED?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">VOTE SHARE</div></div>
      <div class="fc-votehd"><span></span><span></span><span>EXP</span><span>90% INT</span></div>
      ${voteRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected vote share from simulations · dashed line = ${THRESHOLD}% threshold</div>
    </div>`}

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">SEAT DISTRIBUTION</div></div>
      <div class="fc-seathead fc-seathead-hd"><span></span><span>EXP</span><span>90% INT</span></div>
      ${seatRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected seats = mean of simulations · 90% interval = 5th–95th percentile</div>
    </div>
  </div>`;
}

function mean(arr){
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function percentile(arr,p){
  const s=arr.slice().sort((a,b)=>a-b);
  const idx=Math.min(s.length-1,Math.floor(p/100*s.length));
  return s[idx];
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
        <p>The national poll average uses a <strong>triple-weighted mean</strong> combining sample size, pollster accuracy and recency:</p>
        <span class="formula">weight_i = n_i × (1 / MAE_pollster) × 0.5^(age_days / 14)</span>
        <span class="formula">avg(party) = Σ(vote_i × weight_i) / Σ(weight_i)</span>
        <p>where <em>n_i</em> is the sample size, <em>MAE_pollster</em> is the mean absolute error of the pollster across the last 3 elections (2014, 2018, 2022) and <em>age_days</em> is the age of the poll in days. Polls halve in weight every 14 days, so recent polls dominate. Pollsters with only 1-2 elections of data are assigned a default MAE of 1.30.</p>

        <h3>Pollster Accuracy (MAE)</h3>
        <p>Each pollster's accuracy is measured by averaging their error across the last 5 polls before each of the 3 most recent elections. The MAE is the mean absolute deviation across all 8 parties:</p>
        <table class="polls-table" style="margin:8px 0"><thead><tr><th>Pollster</th><th>Elections</th><th>MAE</th></tr></thead><tbody>
        ${Object.entries(POLLSTER_MAE).sort((a,b)=>a[1].overall-b[1].overall).map(([ps,d])=>{
          const eCount=Object.keys(d).filter(k=>k!=='overall').length;
          return `<tr><td>${ps}</td><td class="num">${eCount}</td><td class="num" style="font-weight:700">${d.overall.toFixed(2)}%</td></tr>`;
        }).join('')}
        </tbody></table>

        <h3>Seat Projection</h3>
        <p>${COUNTRY_NAME} elects <strong>${SEATS_TOTAL} seats</strong>${HAS_CONSTITUENCIES?' — 310 constituency seats across 29 constituencies plus 39 leveling seats':''} via ${SEAT_METHOD==='dhondt'?"the <strong>D'Hondt</strong> method in a single national district":"<strong>modified Sainte-Laguë</strong> (divisor 1.2)"}, with a <strong>${THRESHOLD}% electoral threshold</strong>.</p>
        <p>The parliament diagram shows the full ${SEATS_TOTAL} seats allocated nationally from the poll average. It follows the classic Wikimedia parliament-diagram layout: rows of the arch hold every party as a wedge, with the total seat count in the center.</p>

        <h3>Bloc Totals</h3>
        <p>The <strong>${BLOCS.bloc1.name}</strong> bloc includes ${BLOCS.bloc1.parties.join(', ')}. The <strong>${BLOCS.bloc2.name}</strong> bloc includes ${BLOCS.bloc2.parties.join(', ')}.</p>

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
  html+=renderConstituencyTable(avg);
  html+=renderPollsTable(filtered);
  html+=`</div>`;
  pane.innerHTML=html;

  // Draw chart after DOM update
  requestAnimationFrame(()=>{
    const canvas=$('trend-canvas');
    if(canvas) renderTrendChart(canvas, filtered);
  });
  bindParlToggles();
}

/* ---------- public API ---------- */
window._600={
  applyFilters(){
    const active=document.querySelector('.tab-trigger[data-active="true"]');
    const tabId=active?active.dataset.tab:'polls';
    if(tabId==='polls'){renderPollsTab();return}
    const pane=$('pane-'+tabId);
    if(!pane) return;
    if(tabId==='forecast'){renderForecast(pane)}
    else if(tabId==='methodology'){renderMethodology(pane)}
  },
  setCountry(id){
    if(!COUNTRIES[id]||id===COUNTRY) return;
    setCountry(id);
    for(const k in FC_CACHE) delete FC_CACHE[k];
    PARL_MODE='proj';
    document.querySelectorAll('.tab-trigger').forEach(b=>{b.dataset.active='false';delete b.dataset.loaded});
    document.querySelectorAll('.tab-pane').forEach(p=>{delete p.dataset.loaded});
    const pollsBtn=document.querySelector('[data-tab="polls"]');
    if(pollsBtn) pollsBtn.dataset.active='true';
    loadData().then(()=>loadConstituencies()).then(()=>{
      renderSidebar();
      renderPollsTab();
    });
  }
};

/* ---------- boot ---------- */
loadData().then(()=>loadConstituencies()).then(()=>{
  renderSidebar();
  renderPollsTab();
});

})();
