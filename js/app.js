// ===== AltıCiftSıfır — App =====
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=s=>document.getElementById(s);
// Base path for data/ assets:
//   /600/               -> ''          (Pages root)
//   /600/site/          -> '../'       (local dev under site/)
//   /600/<country>/     -> '../'       (country sub-page wrapper)
//   /600/archive/<slug>/-> '../../'    (frozen archive snapshot)
const dataBase=()=>{
  // Archive snapshots carry their own js/css/img/data locally
  if(typeof window!=='undefined'&&window.__600_LOCAL_ASSETS__) return '';
  // Derive base from where app.js was loaded: <base>js/app.js
  // Works for /600/, /600/sweden/, /sweden/, /site/... and archives.
  const s=document.querySelector('script[src*="app.js"]');
  if(s){
    let src=s.getAttribute('src')||'';
    if(src.startsWith('./')) src=src.slice(2);
    const i=src.lastIndexOf('js/app.js');
    if(i>0) return src.slice(0,i);
  }
  // Fallback: pathname depth
  const p=window.location.pathname;
  if(p.includes('/site/')) return '../';
  const segs=p.split('/').filter(s=>s);
  const last=segs[segs.length-1]||'';
  if(last==='index.html') segs.pop();
  const depth=segs.length;
  if(depth<=1) return '';
  return '../'.repeat(depth-1);
};
const isPinnedCountry=()=>!!(typeof window!=='undefined'&&window.__600_COUNTRY__);

/* ---------- language ---------- */
let LANG='en';
try{ LANG=localStorage.getItem('600_lang')||'en'; }catch(e){}
const t=(en,tr)=>(LANG==='tr'&&tr!=null?tr:en);
let T={};
function setLang(){
  T={
    tabs:{polls:t('POLLS','ANKETLER'),forecast:t('FORECAST','TAHMİN'),history:t('HISTORY','GEÇMİŞ'),live:t('LIVE','CANLI'),methodology:t('METHODOLOGY','YÖNTEM')},
    main:t('MAIN','ANA'),
    country:t('COUNTRY','ÜLKE'), filters:t('FILTERS','FİLTRELER'), timeRange:t('TIME RANGE','ZAMAN ARALIĞI'),
    pollster:t('POLLSTER','ANKET'), allPollsters:t('All pollsters','Tüm anketler'),
    last7:t('Last 7 days','Son 7 gün'),last14:t('Last 14 days','Son 14 gün'),last30:t('Last 30 days','Son 30 gün'),
    last60:t('Last 60 days','Son 60 gün'),last90:t('Last 90 days','Son 90 gün'),allPolls:t('All polls','Tüm anketler'),
    info:t('INFO','BİLGİ'), seats:t('seats','sandalye'), threshold:t('threshold','eşik'),
    pollAvg:t('NATIONAL POLL AVERAGE','ULUSAL ANKET ORTALAMASI'), trend:t('POLL TREND','ANKET TRENDİ'),
    seatProjection:t('SEAT PROJECTION','SANDALYE TAHMİNİ'), individualPolls:t('INDIVIDUAL POLLS','BİREYSEL ANKETLER'),
    constituencySeats:t('CONSTITUENCY SEATS','BÖLGE SANDALYELERİ'), districtMap:t('DISTRICT MAP','BÖLGE HARİTASI'),
    history:t('HISTORY','GEÇMİŞ'),
    projection:t('PROJECTION','TAHMİN'), result:t('RESULT','SONUÇ'), map:t('MAP','HARİTA'), blocs:t('BLOCS','BLOKLAR'),
    liveVs:t('LIVE vs VALU vs FORECAST','CANLI vs ÇIKIŞ ANKETİ vs TAHMİN'),
    seatsLive:t('SEATS (LIVE)','SANDALYELER (CANLI)'),
    liveMap:t('VALKRETS LIVE MAP','CANLI BÖLGE HARİTASI'),
    counted:t('districts counted','bölge sayıldı'), turnout:t('turnout','katılım'), updated:t('updated','güncellendi'),
    swing:t('vs 2022','2022 farkı'),
    ifHeldToday:t('IF THE ELECTION WERE HELD TODAY','SEÇİM BUGÜN OLSAYDI'),
    probabilities:t('PROBABILITIES','OLASILIKLAR'), majority:t('MAJORITY','ÇOĞUNLUK'),
    largestParty:t('LARGEST PARTY','EN BÜYÜK PARTİ'), voteShare:t('VOTE SHARE','OY ORANI'),
    seatDistribution:t('SEAT DISTRIBUTION','SANDALYE DAĞILIMI'),
  };
}
setLang();
function applyLang(){
  document.querySelectorAll('.tab-trigger').forEach(b=>{
    const tab=b.dataset.tab;
    if(T.tabs[tab]!=null&&b.textContent!==T.tabs[tab]) b.textContent=T.tabs[tab];
  });
  document.querySelectorAll('.tab-social').forEach(a=>{
    const txt=a.textContent.trim();
    if(txt==='MAIN'||txt==='ANA') a.textContent=T.main;
    else if(txt==='ARCHIVE'||txt==='ARŞİV') a.textContent=t('ARCHIVE','ARŞİV');
  });
}
function toggleLang(){
  LANG=(LANG==='tr')?'en':'tr';
  try{localStorage.setItem('600_lang',LANG)}catch(e){}
  setLang();
  applyLang();
  const btn=$('lang-toggle');
  if(btn){btn.textContent=(LANG==='tr')?'EN':'TR';btn.title=(LANG==='tr')?'Switch to English':'Türkçeye geç';}
  // re-render current tab
  const active=document.querySelector('.tab-trigger[data-active="true"]');
  const tabId=active?active.dataset.tab:'polls';
  const pane=$('pane-'+tabId);
  if(!pane) return;
  if(tabId==='polls') renderPollsTab();
  else if(tabId==='forecast') renderForecast(pane);
  else if(tabId==='live') renderLive(pane);
  else if(tabId==='history') renderHistory(pane);
  else if(tabId==='methodology') renderMethodology(pane);
}
function injectLangToggle(){
  const nav=$('segnav');
  if(!nav) return;
  const btn=document.createElement('button');
  btn.className='tab-social lang-toggle';
  btn.id='lang-toggle';
  btn.textContent=(LANG==='tr')?'EN':'TR';
  btn.title=(LANG==='tr')?'Switch to English':'Türkçeye geç';
  btn.addEventListener('click',toggleLang);
  const group=nav.querySelector('.segnav-right');
  if(group) group.appendChild(btn);
  else nav.appendChild(btn);
  applyLang();
}
document.addEventListener('DOMContentLoaded',()=>{injectLangToggle();});
const fmt=(v,d=1)=>v.toFixed(d);
const pct=(v,d=1)=>fmt(v,d)+'%';
const valDisp=(v,d=1)=>SEAT_BASED?String(Math.ceil(v)):fmt(v,d)+'%';
const partyCode=pid=>(PARTY_META[pid]&&PARTY_META[pid].code)?PARTY_META[pid].code:pid;
const methodName=()=>{
  if(SEAT_METHOD==='dhondt') return "D'Hondt";
  if(SEAT_METHOD==='hare_niemeyer') return 'Hare/Niemeyer';
  return 'modified Sainte-Laguë';
};
const methodNameShort=()=>{
  if(SEAT_METHOD==='dhondt') return "D'Hondt";
  if(SEAT_METHOD==='hare_niemeyer') return 'Hare/Niemeyer';
  return 'Sainte-Laguë';
};
function methodSentence(){
  if(SEAT_METHOD==='dhondt') return "the <strong>D'Hondt</strong> method in a single national district";
  if(SEAT_METHOD==='hare_niemeyer') return "the <strong>Hare/Niemeyer</strong> method (largest remainder, Hare quota = votes ÷ seats) in a single national district";
  return "<strong>modified Sainte-Laguë</strong> (divisor 1.2)";
}

/* ---------- tab switching ---------- */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.tab-trigger');
  if(!btn) return;
  document.querySelectorAll('.tab-trigger').forEach(b=>b.dataset.active='false');
  btn.dataset.active='true';
  const tabId=btn.dataset.tab;
  document.querySelectorAll('.tab-pane').forEach(p=>{p.style.display='none';p.classList.remove('active')});
  const pane=$('pane-'+tabId);
  if(pane){pane.style.display='block';pane.classList.add('active');if(tabId==='forecast'){renderForecast(pane);pane.dataset.loaded='1'}if(tabId==='live'&&!pane.dataset.loaded){renderLive(pane);pane.dataset.loaded='1'}if(tabId==='history'&&!pane.dataset.loaded){renderHistory(pane);pane.dataset.loaded='1'}if(tabId==='methodology'&&!pane.dataset.loaded){renderMethodology(pane);pane.dataset.loaded='1'}}
});

/* ---------- load constituency data ---------- */
let CONSTITUENCIES=null;

async function loadConstituencies(){
  CONSTITUENCIES=null;
  if(!HAS_CONSTITUENCIES) return;
  try{
    const base=dataBase();
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
    title:`${T.constituencySeats} (${by2022?'2022 '+T.result:T.projection})`,
    showDelta:!by2022,
    note:by2022?'2022 actual vote shares':'2022 results shifted by (poll avg − 2022 national)'
  });
}

/* ---------- load data ---------- */
let POLLS=[], META={};

async function loadData(){
  try{
    // Detect base: local dev (site/ subdir) vs Pages (root)
    const base=dataBase();
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
  if(!mae) return 1;
  const v=mae[MAE_KEY]||mae.overall;
  return v?1/v:1;
}

// Exponential time decay: polls halve in weight every RECENCY_HALF_LIFE days
function recencyWeight(dateStr){
  const ageDays=(Date.now()-new Date(dateStr).getTime())/(1000*60*60*24);
  if(ageDays<=0) return 1;
  return Math.pow(0.5, ageDays/RECENCY_HALF_LIFE);
}

function weightedAverage(polls, party, noBias){
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
    // signed-bias correction: bias = poll − actual (from per-election backtest);
    // subtract it so pollster's systematic error is removed
    if(!noBias && BIAS_KEY && POLLSTER_BIAS[p.pollster] && POLLSTER_BIAS[p.pollster][party]!==undefined){
      v-=POLLSTER_BIAS[p.pollster][party];
    }
    if(SEAT_BASED){
      const raw=Object.values(p.votes).reduce((a,b)=>a+b,0);
      if(raw>0) v*=SEATS_TOTAL/raw;
    }
    wSum+=v*w;
    wTotal+=w;
  }
  return wTotal>0?wSum/wTotal:null;
}

// Linear-trend extrapolation: fit each party's recent polls (recency-weighted
// least squares on time), project the slope forward to the election date, capped
// at maxDaily points/day so the model cannot run away in the final stretch.
function trendExtrapolation(polls, party){
  if(!TREND_CONF) return null;
  const election=new Date(TREND_CONF.electionDate).getTime();
  const now=Date.now();
  const horizon=(election-now)/(1000*60*60*24);  // days until election
  if(!(horizon>0)||horizon>TREND_CONF.windowDays) return null;
  const cutoff=now-TREND_CONF.windowDays*1000*60*60*24;
  const recent=polls.filter(p=>p.votes[party]!==undefined&&new Date(p.date).getTime()>=cutoff);
  if(recent.length<TREND_CONF.minPolls) return null;
  let sw=0,swt=0,swtt=0,swv=0,swtv=0;
  for(const p of recent){
    const t=(now-new Date(p.date).getTime())/(1000*60*60*24); // days ago
    const w=Math.pow(0.5,t/RECENCY_HALF_LIFE);
    sw+=w; swt+=w*t; swtt+=w*t*t; swv+=w*(p.votes[party]||0); swtv+=w*t*(p.votes[party]||0);
  }
  const den=sw*swtt-swt*swt;
  if(Math.abs(den)<1e-9) return null;
  const slope=(sw*swtv-swt*swv)/den;      // % per day as time moves backward
  const inter=(swv*swtt-swtv*swt)/den;    // value at t=0 (today)
  let proj=inter-slope*horizon;           // extrapolate forward
  const cap=TREND_CONF.maxDaily*horizon;
  proj=Math.max(inter-cap,Math.min(inter+cap,proj));
  return Math.max(0,proj);
}

function computeAverages(polls, raw){
  const avg={};
  for(const pid of PARTY_ORDER){
    avg[pid]=weightedAverage(polls, pid, raw);
  }
  // last-election Dirichlet prior: pull the average toward the most recent
  // election outcome so a thin poll set cannot drift arbitrarily far
  if(!raw && PRIOR_ALPHA>0&&LAST_ELECTION.results){
    for(const pid of PARTY_ORDER){
      if(avg[pid]===null) continue;
      const prior=LAST_ELECTION.results[pid]!==undefined?LAST_ELECTION.results[pid]:0;
      avg[pid]=(1-PRIOR_ALPHA)*avg[pid]+PRIOR_ALPHA*prior;
    }
  }
  // linear-trend extrapolation toward the election date
  if(!raw && TREND_CONF){
    for(const pid of PARTY_ORDER){
      const ext=trendExtrapolation(polls, pid);
      if(ext!==null&&avg[pid]!==null){
        avg[pid]=(1-TREND_CONF.blend)*avg[pid]+TREND_CONF.blend*ext;
      }
    }
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

/* ---------- render sidebar (single card, top-left) ---------- */
function renderSidebar(prevDays, prevPollster){
  const c=$('sidebar-content');
  if(!c) return;
  prevDays=prevDays||'30';
  prevPollster=prevPollster||'';
  let html='';

  // Country selector (hidden on pinned sub-pages / archives)
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.country}</div></div>
    ${isPinnedCountry()
      ?`<div class="sb-hint" style="font-weight:900;letter-spacing:0.8px">${COUNTRY_NAME}</div>`
      :`<select class="sb-select" id="country-select" onchange="window._600.setCountry(this.value)">
      ${Object.keys(COUNTRIES).map(id=>`<option value="${id}"${id===COUNTRY?' selected':''}>${COUNTRIES[id].name}</option>`).join('')}
    </select>`}
    <div class="sb-hint">${seatsDesc()} ${T.seats} · ${methodName()} · ${THRESHOLD}% ${T.threshold}</div></div>`;

  // Filters
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.filters}</div></div>
    <label class="sb-hint" style="margin-bottom:4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${T.timeRange}</label>
    <select class="sb-select" id="filter-days" onchange="window._600.applyFilters()">
      <option value="7"${prevDays==='7'?' selected':''}>${T.last7}</option>
      <option value="14"${prevDays==='14'?' selected':''}>${T.last14}</option>
      <option value="30"${prevDays==='30'?' selected':''}>${T.last30}</option>
      <option value="60"${prevDays==='60'?' selected':''}>${T.last60}</option>
      <option value="90"${prevDays==='90'?' selected':''}>${T.last90}</option>
      <option value="9999"${prevDays==='9999'?' selected':''}>${T.allPolls}</option>
    </select>
    <label class="sb-hint" style="margin:10px 0 4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${T.pollster}</label>
    <select class="sb-select" id="filter-pollster" onchange="window._600.applyFilters()">
      <option value="">${T.allPollsters}</option>
    </select></div>`;

  // Last election
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${LAST_ELECTION.date.slice(0,4)} ${T.result}</div></div>
    <div class="sb-last-election" id="sb-election"></div></div>`;

  // Info
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.info}</div></div>
    <div class="sb-hint">${t('Data','Veri')}: Wikipedia${COUNTRY==='sweden'?' + SwedishPolls (CC0)':''}<br>${seatsDesc()} ${T.seats} · ${methodNameShort()} · ${THRESHOLD}% ${T.threshold}<br>${t('Next election','Sonraki seçim')}: ${META.election_date||LAST_ELECTION.date}</div></div>`;

  c.innerHTML=html;

  // Populate pollster filter
  const pollsters=[...new Set(POLLS.map(p=>p.pollster))].sort();
  const sel=$('filter-pollster');
  pollsters.forEach(ps=>{
    const opt=document.createElement('option');
    opt.value=ps; opt.textContent=ps;
    if(ps===prevPollster) opt.selected=true;
    sel.appendChild(opt);
  });

  // Last election
  renderLastElection();
}

function renderLastElection(){
  const c=$('sb-election');
  if(!c) return;
  let html='';
  const list=PARTY_ORDER.slice();
  for(const pid in PARTY_META){
    if(PARTY_META[pid].pastOnly&&LAST_ELECTION.results[pid]!==undefined&&list.indexOf(pid)<0) list.push(pid);
  }
  const sorted=list.slice().sort((a,b)=>(LAST_ELECTION.results[b]||0)-(LAST_ELECTION.results[a]||0));
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
  const b=dataBase();
  return `<div class="hero">
    <div class="hero-title">${COUNTRY_NAME} — ${t('Poll Average','Anket Ortalaması')}</div>
    <div class="hero-date">${filteredPolls.length} ${t('polls','anket')} · ${t('latest','son')}: ${latestStr} (${days}d ${t('ago','önce')}) · ${t('sample-size + pollster accuracy + recency weighted','örneklem + anketçi doğruluğu + güncellik ağırlıklı')}</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <div style="width:36px;height:36px;border:2px solid var(--c-edge);box-shadow:var(--shadow-md);background:${color};display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${logoSrc?`<img src="${b}${logoSrc}?v=${LOGO_CACHE}" alt="${topParty}" style="width:28px;height:28px;object-fit:contain">`:`<span style="color:#fff;font-weight:900;font-size:12px">${topParty}</span>`}
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
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.pollAvg}</div></div>
    <div class="bar-header"><span class="bh-logo"></span><span class="bh-party">${t('PARTY','PARTİ')}</span><span class="bh-bar"></span><span class="bh-pct">${SEAT_BASED?'SEATS':'%'}</span><span class="bh-delta">Δ</span>${SEAT_BASED?'':'<span class="bh-seats">SEATS</span>'}</div>`;

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
        ${PARTY_LOGOS[pid]?`<img src="${dataBase()}${PARTY_LOGOS[pid]}?v=${LOGO_CACHE}" alt="${pid}" style="width:24px;height:24px;object-fit:contain">`:`<span>${partyCode(pid)}</span>`}
      </div>
      <div class="party-name">${partyCode(pid)}</div>
      <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:${color}"></div></div>
      <div class="party-pct">${valDisp(val)}</div>
      <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
      ${SEAT_BASED?'':`<div class="party-seats" style="color:${color}">${mpSeats}</div>`}
    </div>`;
  }
  // Others: the vote share not covered by the modelled parties (minority lists etc.)
  if(!SEAT_BASED){
    const othersNow=Math.max(0,100-PARTY_ORDER.reduce((a,p)=>a+(avg[p]||0),0));
    if(othersNow>0.05){
      const othersLast=Math.max(0,100-PARTY_ORDER.reduce((a,p)=>a+(LAST_ELECTION.results[p]||0),0));
      const barWidth=Math.max(1,(othersNow/maxPct)*100);
      const delta=othersNow-othersLast;
      const deltaStr=delta>0?`+${fmt(delta)}`:fmt(delta);
      const deltaColor=delta>0?'#0B9E17':delta<0?'var(--c-accent)':'var(--c-text-muted)';
      html+=`<div class="party-row">
        <div class="party-logo" style="background:#9CA3AF"><span style="color:#1F2937">OTH</span></div>
        <div class="party-name">Other</div>
        <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:#9CA3AF"></div></div>
        <div class="party-pct">${fmt(othersNow)}%</div>
        <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
        <div class="party-seats" style="color:#9CA3AF">0</div>
      </div>`;
    }
  }
  if(BLOCS.bloc1&&BLOCS.bloc2) html+=`<div class="pollavg-blocs">${renderBlocs(avg)}</div>`;
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

  // Build series (placeholder parties like SPN never appear)
  const series=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly)).map(pid=>{
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
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.individualPolls}</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>${t('Date','Tarih')}</th><th>${t('Pollster','Anket')}</th><th class="c">${t('Lead','Fark')}</th>`;
  const active=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  active.forEach(p=>{html+=`<th class="c">${partyCode(p)}</th>`});
  html+=`</tr></thead><tbody>`;

  polls.slice(0,60).forEach(p=>{
    // Leader + margin
    const sorted=active.slice().sort((a,b)=>(p.votes[b]||0)-(p.votes[a]||0));
    const leadP=sorted[0], leadV=p.votes[leadP]||0;
    const secondV=p.votes[sorted[1]]||0;
    const margin=leadV-secondV;
    const leadColor=PARTY_META[leadP]?PARTY_META[leadP].color:'#888';

    html+=`<tr><td>${p.date.slice(5)}</td><td>${p.pollster}</td>
      <td class="num c" style="color:${leadColor};font-weight:700">${partyCode(leadP)} +${SEAT_BASED?String(Math.round(margin)):fmt(margin)}</td>`;
    active.forEach(pid=>{
      const v=p.votes[pid];
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      const isTop=pid===leadP;
      html+=`<td class="num c" style="color:${v!==undefined?color:'var(--c-rule)'};font-weight:${isTop?'900':'400'};background:${isTop?color+'22':''}">${v!==undefined?(SEAT_BASED?Math.round(v):pct(v)):'—'}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      Lead = margin between the two largest parties in the poll
    </div></div>`;
  return html;
}

/* ---------- render parliament ---------- */
let PARL_MODE='proj';    // 'proj' or '2022'
let PARL_VIEW='seats';   // 'seats' or 'map'
let FC_MODE='proj';      // forecast district map: 'proj' or 'res'
let MAP_COLOR='party';   // district map coloring: 'party' or 'bloc' (Sweden)

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
  // Seat-based countries: round the seat averages (largest remainder).
  // Every party that appears in the average (avg>0) is given seats so that
  // small/listed parties stay visible on the parliament diagram.
  const fl={},frs=[];
  let sum=0;
  PARTY_ORDER.forEach(p=>{
    const m=avg[p]||0;
    if(!(m>0)){fl[p]=0;return}
    const f=Math.floor(m);
    fl[p]=f;frs.push([m-f,p]);sum+=f;
  });
  let left=total-sum;
  frs.sort((a,b)=>b[0]-a[0]);
  for(let i=0;i<left&&i<frs.length;i++)fl[frs[i][1]]++;
  return fl;
}

function seatsDesc(){
  return OVERHANG?(SEATS_TOTAL+'\u2013'+OVERHANG.cap):String(SEATS_TOTAL);
}

/* ---------- overhang / leveling seats (partial PR, e.g. Saxony-Anhalt) ---------- */
function directFromProjection(votes){
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  const conf=MAP_CONF();
  if(!conf||!conf.districts) return out;
  Object.keys(conf.districts).forEach(nr=>{
    const w=districtWinnerProjection(parseInt(nr,10),votes);
    if(w) out[w]++;
  });
  return out;
}

function overhangSeats(votes, totalBase, direct, cap){
  // Leveling seats: grow the house (re-running Hare/Niemeyer each step) until
  // every party that won direct mandates holds at least its direct share; the
  // total is capped at `cap` seats per the electoral law.
  cap=cap||totalBase;
  const hare=(total)=>{
    const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
    const totalVotes=valid.reduce((a,p)=>a+(votes[p]||0),0);
    const quota=totalVotes/total;
    const out={}; const rems=[]; let given=0;
    valid.forEach(p=>{
      const q=(votes[p]||0)/quota, fl=Math.floor(q);
      out[p]=fl; given+=fl; rems.push([q-fl,p]);
    });
    let left=total-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) out[rems[i][1]]++;
    return out;
  };
  let total=totalBase;
  for(let it=0;it<200;it++){
    const seats=hare(total);
    let deficit=0;
    PARTY_ORDER.forEach(p=>{const d=direct[p]||0; if(seats[p]<d) deficit+=d-seats[p]});
    if(deficit<=0) return seats;
    if(total===cap) break;
    total=Math.min(total+deficit,cap);
  }
  const s=hare(total);
  PARTY_ORDER.forEach(p=>{if(s[p]<(direct[p]||0)) s[p]=direct[p]||0});
  return s;
}

function renderParliament(avg){
  let seats;
  if(OVERHANG){
    seats=PARL_MODE==='proj'
      ?overhangSeats(avg,SEATS_TOTAL,directFromProjection(avg),OVERHANG.cap)
      :(()=>{const s={};PARTY_ORDER.forEach(p=>{s[p]=LAST_ELECTION.seats?LAST_ELECTION.seats[p]||0:0});return s})();
  }else{
    seats=SEAT_BASED
      ?(PARL_MODE==='proj'?seatParliament(avg,SEATS_TOTAL):normalizeTo(LAST_ELECTION.seats,SEATS_TOTAL))
      :(PARL_MODE==='proj'?allocateSeatsN(avg,SEATS_TOTAL)
        :(LAST_ELECTION.seats?(()=>{const s={};PARTY_ORDER.forEach(p=>{s[p]=LAST_ELECTION.seats[p]||0});return s})()
          :allocateSeatsN(LAST_ELECTION.results,SEATS_TOTAL)));
  }
  // Unmodelled parties (e.g. Serbia's minority lists): in the last-election view,
  // fill the chamber up to the statutory size with an "Other" wedge.
  if(PARL_MODE!=='proj'&&!OVERHANG){
    const sum=PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0);
    const other=SEATS_TOTAL-sum;
    if(other>0) seats.other=other;
  }
  const seatsTotal=Object.values(seats).reduce((a,b)=>a+(b||0),0);
  const mapConf=MAP_CONF();
  const showMap=PARL_VIEW==='map'&&mapConf;
  const btnRow=`<div class="map-toggle-row" style="justify-content:flex-end">
      <button class="map-toggle-btn parl-btn${PARL_MODE==='proj'?' active':''}" data-parlmode="proj">${T.projection}</button>
      <button class="map-toggle-btn parl-btn${PARL_MODE==='2022'?' active':''}" data-parlmode="2022">${LAST_ELECTION.date.slice(0,4)} ${T.result}</button>
      ${mapConf?`<button class="map-toggle-btn parl-btn${showMap?' active':''}" data-parlview="map">${T.map}</button>`:''}
      ${mapConf&&mapConf.useConstituencies&&BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn map-color-btn${MAP_COLOR==='bloc'?' active':''}" data-mapcolor="bloc">${T.blocs}</button>`:''}
      ${mapConf?`<button class="shot-btn" id="map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>`:''}
    </div>`;
  const box=showMap
    ?'<div class="parliament-box" id="map-box"></div>'
    :`<div class="parliament-box">${buildParliamentSVG(seats)}</div>`;
  const cap=showMap
    ?`${seatsTotal} ${T.seats} · ${methodName()} · ${THRESHOLD}% ${T.threshold} · ${t('map','harita')} = ${mapConf?Object.keys(mapConf.districts).length:''} ${t('constituencies','bölge')}, ${t('colored by','renklendirilen')} ${(MAP_COLOR==='bloc'&&mapConf.useConstituencies)?t('leading bloc','önde giden blok'):t('district winner','bölge kazananı')}`
    :`${seatsTotal} ${T.seats} · ${methodName()} · ${THRESHOLD}% ${T.threshold}`;
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatProjection}</div></div>
    ${btnRow}
    ${box}
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
      ${cap}
    </div></div>`;
}

/* ---------- district map (Germany / Sweden) ---------- */
function MAP_CONF(){ return (COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].map)||null; }

function constituencyById(id){
  if(!CONSTITUENCIES||!CONSTITUENCIES.constituencies) return null;
  return CONSTITUENCIES.constituencies.find(c=>c.id===String(id))||null;
}

// Actual direct-mandate winner of the previous election for a Wahlkreis /
// valkrets, with the state default as fallback
function districtWinner2021(nr){
  const conf=MAP_CONF();
  if(conf.useConstituencies){
    const c=constituencyById(nr);
    if(c&&c.results_2022){
      let best=null,bv=-1;
      for(const p of PARTY_ORDER){
        const v=c.results_2022[p]||0;
        if(v>bv){bv=v;best=p}
      }
      if(best) return best;
    }
    return 'S';
  }
  const exc=conf&&conf.winners2021?conf.winners2021[String(nr)]:null;
  if(exc) return exc;
  return (conf&&conf.winners2021_default)||'cdu';
}

// Shares of a district under a given national avg: uniform swing from the
// district's previous-election baseline; returns per-party {party: {past, now}}.
// When resultMode is true, returns the actual previous election per-district
// results (past === now) so the map shows that election's result.
function districtShares(nr, avg, resultMode){
  const conf=MAP_CONF();
  let base;
  if(conf.useConstituencies){
    const c=constituencyById(nr);
    if(!c) return null;
    base=c.results_2022||{};
  }else if(conf.wkResults&&conf.wkResults[String(nr)]){
    base=conf.wkResults[String(nr)];
  }else{
    const gArr=conf.districts?conf.districts[String(nr)]:null;
    if(!gArr) return null;
    base=conf.gebiete[gArr];
  }
  const nat=conf.national2021||LAST_ELECTION.results;
  const out={};
  let sum=0;
  for(const p of PARTY_ORDER){
    const past=base[p]||0;
    let now;
    if(PARTY_META[p]&&PARTY_META[p].pastOnly){
      // dissolved alliances: shown in the 2023 result view, never projected
      now=resultMode?past:0;
    }else{
      const swing=(!resultMode&&avg&&avg[p]!==undefined)?((avg[p]||0)-(nat[p]||0)):0;
      now=Math.max(0,past+swing);
    }
    out[p]={past, now};
    sum+=now;
  }
  // Okrug baselines cover only the modelled parties (unmodelled lists made up
  // the remainder), so renormalize projected shares to the polls' own total for
  // the modelled parties (e.g. ~97.6%) — the leftover stays visible as "Other".
  // (Result mode keeps the official 2023 numbers untouched.)
  let pastSum=0;
  for(const p of PARTY_ORDER) pastSum+=out[p].past||0;
  const rem=Math.max(0,100-pastSum);
  if(!resultMode){
    let target=0;
    for(const p of PARTY_ORDER){
      if(!(PARTY_META[p]&&PARTY_META[p].pastOnly)&&avg&&avg[p]!==undefined&&avg[p]!==null) target+=avg[p];
    }
    if(!(target>0)||target>100) target=100;
    if(sum>0&&Math.abs(sum-target)>0.01){
      const k=target/sum;
      for(const p of PARTY_ORDER) out[p].now*=k;
    }
    out.other={past:rem, now:Math.max(0,100-target)};
  }else{
    out.other={past:rem, now:rem};
  }
  return out;
}

// MP seats a party holds from a district (Sweden only):
// - result mode: official 2022 per-constituency seats (mp2022, fasta + utjämningsmandat)
// - projection mode: Sainte-Laguë allocation of the constituency's fasta seats
//   from the current poll avg, honoring the 4% national / 12% valkrets rule
function districtPartySeats(nr, party, avg, resultMode){
  const conf=MAP_CONF();
  if(!conf.useConstituencies) return null;
  if(resultMode){
    const lbl=Object.keys(conf.districts).find(k=>conf.districts[k]===String(nr));
    if(lbl&&conf.mp2022&&conf.mp2022[lbl]) return conf.mp2022[lbl][party]||0;
    return 0;
  }
  const c=constituencyById(nr);
  if(!c||!avg) return null;
  const alloc=allocateConstituencySeats(avg,c);
  return alloc[party]||0;
}

// MP seats of a district: Sweden = fixed valkretsmandat; Germany = 1 direct mandate
function districtSeats(nr){
  const conf=MAP_CONF();
  if(conf.useConstituencies){
    const c=constituencyById(nr);
    return c?c.seats:1;
  }
  return 1;
}

function districtWinnerProjection(nr, avg){
  const shares=districtShares(nr, avg, false);
  if(!shares) return null;
  let best=null,bestV=-1;
  for(const p of PARTY_ORDER){
    if(shares[p].now>bestV){bestV=shares[p].now;best=p}
  }
  return best;
}

// Winner of the previous election in a district: explicit winners map wins,
// else argmax of the official per-district results (wkResults / results_2022)
function districtResultWinner(nr){
  const conf=MAP_CONF();
  if(conf.winners2021&&conf.winners2021[String(nr)]) return conf.winners2021[String(nr)];
  const shares=districtShares(nr, null, true);
  if(!shares) return null;
  let best=null,bestV=-1;
  for(const p of PARTY_ORDER){
    if(shares[p].past>bestV){bestV=shares[p].past;best=p}
  }
  return best;
}

// Bloc totals of a district: sum each bloc's member parties' shares
// returns {bloc1:{past,now}, bloc2:{past,now}}
function districtBlocTotals(shares){
  const out={};
  for(const bk of ['bloc1','bloc2']){
    const b=BLOCS[bk];
    if(!b) continue;
    let past=0,now=0;
    for(const p of b.parties){
      if(shares[p]){past+=shares[p].past;now+=shares[p].now}
    }
    out[bk]={past,now};
  }
  return out;
}

// Leading bloc of a district under given totals
function leadingBloc(blocTotals, key){
  const a=blocTotals.bloc1?blocTotals.bloc1[key]:0;
  const b=blocTotals.bloc2?blocTotals.bloc2[key]:0;
  return a>=b?'bloc1':'bloc2';
}

let MAP_CACHE={};
async function renderMap(avg){
  const box=$('map-box');
  if(!box) return;
  await renderMapInto(box, avg, PARL_MODE!=='proj');
}

async function renderMapInto(box, avg, resultMode){
  const conf=MAP_CONF();
  if(!conf) return;
  if(!MAP_CACHE[conf.svg]){
    try{
      const resp=await fetch(dataBase()+conf.svg);
      if(!resp.ok) throw new Error('HTTP '+resp.status);
      MAP_CACHE[conf.svg]=await resp.text();
    }catch(e){
      box.innerHTML='<div style="text-align:center;color:var(--c-text-muted);padding:20px;font-size:12px">District map failed to load.</div>';
      return;
    }
  }
  const holder=document.createElement('div');
  // Sweden: paths carry inkscape:label (namespaced attr, lost in innerHTML parse) — normalize to data-label
  const raw=MAP_CACHE[conf.svg];
  holder.innerHTML=conf.selector==='label'?raw.replace(/inkscape:label=/g,'data-label='):raw;
  const svg=holder.querySelector('svg');
  if(!svg){box.innerHTML='';return}
  let selector;
  if(conf.selector==='class') selector='path[class^="wk"]';
  else if(conf.selector==='label') selector='path[data-label]';
  else if(conf.selector==='id') selector='path[id]';
  else selector='path[id^="_"]';
  const paths=svg.querySelectorAll(selector);
  const tooltip=document.createElement('div');
  tooltip.className='map-tip';
  box.style.position='relative';
  box.appendChild(tooltip);
  // District display name: explicit wkNames (MV), Bezirk + number (Berlin class),
  // map label (Sweden), else gebiet name
  const districtMeta=(nr,lbl)=>{
    if(conf.useConstituencies){
      return {gArr:nr, name:lbl||(constituencyById(nr)?constituencyById(nr).name:String(nr))};
    }
    const gArr=conf.districts[String(nr)];
    const baseName=conf.names&&conf.names[gArr]?conf.names[gArr]:gArr;
    let name=baseName;
    if(conf.wkNames&&conf.wkNames[String(nr)]) name=conf.wkNames[String(nr)];
    else if(conf.selector==='class'&&gArr) name=`${baseName} ${nr%100}`;
    return {gArr, name};
  };
  paths.forEach(ph=>{
    let nr=null;
    if(conf.selector==='class'){
      const m=/wk(\d+)/.exec(ph.getAttribute('class')||'');
      if(m) nr=parseInt(m[1],10);
    }else if(conf.selector==='label'){
      const lbl=ph.getAttribute('data-label');
      if(lbl&&conf.districts[lbl]) nr=conf.districts[lbl];
    }else if(conf.selector==='id'){
      const id=ph.getAttribute('id');
      if(id&&conf.districts[id]) nr=id;
    }else{
      nr=parseInt(ph.id.slice(1),10);
    }
    if(!nr) return;
    const shares=districtShares(nr, avg, resultMode);
    if(!shares) return;
    const blocMode=MAP_COLOR==='bloc'&&BLOCS.bloc1&&BLOCS.bloc2;
    const blocTotals=blocMode?districtBlocTotals(shares):null;
    // RESULT mode: official per-district winners (winners2021 map / wkResults
    // argmax / per-constituency 2022), else the uniform-swing projection.
    // Bloc mode colors by the leading bloc instead.
    let winner;
    if(blocMode){
      winner=leadingBloc(blocTotals,resultMode?'past':'now');
    }else{
      winner=resultMode
        ?(districtResultWinner(nr)||districtWinnerProjection(nr,LAST_ELECTION.results))
        :districtWinnerProjection(nr,avg);
    }
    if(!winner) return;
    const color=blocMode?(BLOCS[winner]?BLOCS[winner].color:'#888'):(PARTY_META[winner]?PARTY_META[winner].color:'#888');
    ph.style.fill=color;
    if(!ph.getAttribute('style')||ph.getAttribute('style').indexOf('stroke')<0){
      ph.style.stroke='#ffffff';
    }
    ph.style.cursor='pointer';
    ph.style.transition='opacity .15s ease';
    const meta=districtMeta(nr, conf.selector==='label'?ph.getAttribute('data-label'):null);
    ph.addEventListener('mouseenter',()=>{
      ph.style.opacity='0.65';
      if(blocMode){
        const pastBloc=leadingBloc(blocTotals,'past');
        const nowBloc=leadingBloc(blocTotals,'now');
        const blocRows=['bloc1','bloc2'].map(bk=>{
          const b=BLOCS[bk];
          const t=blocTotals[bk];
          const delta=t.now-t.past;
          const col=b?b.color:'#888';
          const barW=Math.max(2,Math.min(100,t.now));
          return `<div class="map-tip-row">
            <span class="map-tip-code" style="color:${col}">${b?b.name:'?'}</span>
            <div class="map-tip-track"><div class="map-tip-fill" style="width:${barW}%;background:${col}"></div></div>
            <span class="map-tip-now">${pct(t.now)}</span>
            <span class="map-tip-delta ${delta>0.05?'up':(delta<-0.05?'down':'flat')}">${delta>0.05?'▲':(delta<-0.05?'▼':'')}${Math.abs(delta)<0.05?'':pct(Math.abs(delta))}</span>
          </div>`;
        }).join('');
        const pbCol=BLOCS[pastBloc]?BLOCS[pastBloc].color:'#888';
        const nbCol=BLOCS[nowBloc]?BLOCS[nowBloc].color:'#888';
        tooltip.innerHTML=`<div class="map-tip-head">
          <div class="map-tip-title">${conf.useConstituencies?'':(conf.selector==='id'?'':'WK '+nr+' · ')}${meta.name}</div>
          <div class="map-tip-compare">
            <span class="map-tip-past"><i style="background:${pbCol}"></i>${LAST_ELECTION.date.slice(0,4)} ${BLOCS[pastBloc]?BLOCS[pastBloc].short||BLOCS[pastBloc].name:''}</span>
            <span class="map-tip-arrow">→</span>
            <span class="map-tip-nowlab"><i style="background:${nbCol}"></i>${resultMode?'RESULT':(BLOCS[nowBloc]?BLOCS[nowBloc].short||BLOCS[nowBloc].name:'')}</span>
          </div>
        </div>
        ${blocRows}`;
        tooltip.style.display='block';
        return;
      }
      const pastWinner=districtResultWinner(nr)||districtWinnerProjection(nr,LAST_ELECTION.results);
      const nowWinner=resultMode?pastWinner:districtWinnerProjection(nr,avg);
      // Result mode: order rows by the official seat outcome (so a dissolved-but-large
  // list like SPN sits above smaller parties); otherwise by projected share.
  // Dissolved alliances (pastOnly) appear in the 2023 result view only.
      const sortKey=(p)=> (resultMode&&LAST_ELECTION.seats)?(LAST_ELECTION.seats[p]||0):shares[p].now;
      let rows=PARTY_ORDER.slice().filter(p=>!((PARTY_META[p]||{}).pastOnly&&!resultMode)).sort((a,b)=> (sortKey(b)-sortKey(a)) || (shares[b].now-shares[a].now)).map(p=>{
        const s=shares[p];
        const delta=s.now-s.past;
        const col=PARTY_META[p]?PARTY_META[p].color:'#888';
        const barW=Math.max(2,Math.min(100,s.now));
        const pSeats=districtPartySeats(nr,p,avg,resultMode);
        const pill=pSeats!==null&&pSeats>0?`<span class="map-tip-pill">${pSeats}</span>`:'';
        return `<div class="map-tip-row">
          <span class="map-tip-code" style="color:${col}">${partyCode(p)}${pill}</span>
          <div class="map-tip-track"><div class="map-tip-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="map-tip-now">${pct(s.now)}</span>
          <span class="map-tip-delta ${delta>0.05?'up':(delta<-0.05?'down':'flat')}">${delta>0.05?'▲':(delta<-0.05?'▼':'')}${Math.abs(delta)<0.05?'':pct(Math.abs(delta))}</span>
        </div>`;
      }).join('');
      // unmodelled 2023 lists (remainder), past column only
      if(shares.other&&shares.other.past>0.05){
        const o=shares.other;
        const od=o.now-o.past;
        rows+=`<div class="map-tip-row">
          <span class="map-tip-code" style="color:#9CA3AF">Other</span>
          <div class="map-tip-track"><div class="map-tip-fill" style="width:${Math.max(2,Math.min(100,o.now))}%;background:#9CA3AF"></div></div>
          <span class="map-tip-now">${pct(o.now)}</span>
          <span class="map-tip-delta ${od>0.05?'up':(od<-0.05?'down':'flat')}">${od>0.05?'▲':(od<-0.05?'▼':'')}${Math.abs(od)<0.05?'':pct(Math.abs(od))}</span>
        </div>`;
      }
      const pwCol=PARTY_META[pastWinner]?PARTY_META[pastWinner].color:'#888';
      const nwCol=PARTY_META[nowWinner]?PARTY_META[nowWinner].color:'#888';
      tooltip.innerHTML=`<div class="map-tip-head">
          <div class="map-tip-title">${conf.useConstituencies?'':(conf.selector==='id'?'':'WK '+nr+' · ')}${meta.name}</div>
          <div class="map-tip-compare">
            <span class="map-tip-past"><i style="background:${pwCol}"></i>${LAST_ELECTION.date.slice(0,4)} ${partyCode(pastWinner)}</span>
            <span class="map-tip-arrow">→</span>
            <span class="map-tip-nowlab"><i style="background:${nwCol}"></i>${resultMode?'RESULT':partyCode(nowWinner)}</span>
          </div>
        </div>
        ${rows}`;
      tooltip.style.display='block';
    });
    ph.addEventListener('mouseleave',()=>{
      ph.style.opacity='';
      tooltip.style.display='none';
    });
  });
  svg.addEventListener('mousemove',e=>{
    const rect=box.getBoundingClientRect();
    const tipW=tooltip.offsetWidth||220;
    const tipH=tooltip.offsetHeight||140;
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    let left=Math.max(4,Math.min(x+14,rect.width-tipW-4));
    let top=Math.max(4,Math.min(y+14,rect.height-tipH-4));
    tooltip.style.left=left+'px';
    tooltip.style.top=top+'px';
  });
  svg.setAttribute('viewBox', svg.getAttribute('viewBox')||'0 0 894 1140');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width='100%';
  svg.style.height='auto';
  svg.style.display='block';
  box.innerHTML='';
  box.appendChild(svg);
  box.appendChild(tooltip);
}

/* ---------- screenshot capture ---------- */
const CAM_ICON=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

function downloadPng(dataUrl, name){
  const a=document.createElement('a');
  a.href=dataUrl;
  a.download=name;
  a.click();
}

// Map: render the SVG at its viewBox size (x2 for sharpness) onto a transparent
// canvas — content-sized, no padding, no background
async function captureMapPng(svg, filename){
  if(!svg) return;
  const vb=svg.viewBox?svg.viewBox.baseVal:null;
  const w=vb&&vb.width?Math.round(vb.width):800;
  const h=vb&&vb.height?Math.round(vb.height):900;
  const scale=2;
  const xml=new XMLSerializer().serializeToString(svg);
  const svgUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
  const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=svgUrl});
  const canvas=document.createElement('canvas');
  canvas.width=w*scale; canvas.height=h*scale;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  downloadPng(canvas.toDataURL('image/png'), filename);
}

// Chart: composite the (transparent) canvas over the card background so the
// exported PNG keeps the graph's background, sized to the canvas content
function captureChartPng(canvas, filename){
  if(!canvas) return;
  const card=canvas.closest('.card');
  const bg=card?getComputedStyle(card).backgroundColor:'#FFFFFF';
  const out=document.createElement('canvas');
  out.width=canvas.width; out.height=canvas.height;
  const ctx=out.getContext('2d');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,out.width,out.height);
  ctx.drawImage(canvas,0,0);
  downloadPng(out.toDataURL('image/png'), filename);
}

function captureBoxMap(boxId, filename){
  const box=$(boxId);
  if(!box) return;
  const svg=box.querySelector('svg');
  if(!svg) return;
  captureMapPng(svg, filename);
}

function allocateSeatsN(votes, totalSeats){
  const validParties=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
  const totalVotes=validParties.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalVotes===0) return {};
  const seats={};
  validParties.forEach(p=>{seats[p]=0});

  // Hare/Niemeyer (largest remainder): floor(votes/quota), then by fraction
  if(SEAT_METHOD==='hare_niemeyer'){
    const quota=totalVotes/totalSeats;
    const rems=[];
    let given=0;
    validParties.forEach(p=>{
      const q=(votes[p]||0)/quota;
      const fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    let left=totalSeats-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    return seats;
  }

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
  // Unmodelled remainder ("Other") wedge at the right edge.
  const otherN=seats.other||0;
  for(let i=0;i<otherN;i++) assigned.push('other');

  let layout=PARLIAMENT_SEATS[COUNTRY];
  if(OVERHANG){
    // Leveling-seat chambers (e.g. Saxony-Anhalt) have a variable size; draw
    // the canonical arch generated for the exact seat count, with enough rows
    // to match the real chamber's density.
    layout=null;
  } else if(layout && layout.seats && layout.seats.length<assigned.length){
    layout=PARLIAMENT_SEATS[COUNTRY+'_ovh']||layout;
  }
  if(!layout || !layout.seats || layout.seats.length<assigned.length){
    // No supplied blank chamber (or it is too small): generate the canonical
    // Wikimedia arch geometry at runtime so any seat count can be drawn.
    layout=generateArchLayout(assigned.length,{minNRows:(OVERHANG&&OVERHANG.rows)||0});
  }
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
      const col=party==='other'?'#9CA3AF':(PARTY_META[party]?PARTY_META[party].color:'#888');
      svg+=`<circle cx="${fmt(pts[i].x,2)}" cy="${fmt(pts[i].y,2)}" r="${fmt(pts[i].rr,2)}" fill="${col}"/>`;
    }
    svg+=`<text x="${layout.cx}" y="${fmt(totalY,1)}" text-anchor="middle" font-size="${totalFs}" font-weight="900" fill="#111827" font-family="Decima Mono Pro,monospace">${total}</text>`;
    svg+=`</svg>`;
    return svg;
}

function bindParlToggles(avg){
  const pane=$('pane-polls');
  if(!pane) return;
  pane.querySelectorAll('.parl-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.parlmode) PARL_MODE=btn.dataset.parlmode;
      if(btn.dataset.parlview) PARL_VIEW=(PARL_VIEW==='map')?'seats':'map';
      if(btn.dataset.mapcolor) MAP_COLOR=(MAP_COLOR==='bloc')?'party':'bloc';
      renderPollsTab();
    });
  });
  const mapShot=$('map-shot-btn');
  if(mapShot){
    mapShot.addEventListener('click',()=>{
      captureBoxMap('map-box', COUNTRY+'-map.png');
    });
  }
  const trendShot=$('trend-shot-btn');
  if(trendShot){
    trendShot.addEventListener('click',()=>{
      captureChartPng($('trend-canvas'), COUNTRY+'-poll-trend.png');
    });
  }
  if(PARL_VIEW==='map') renderMap(avg);
}

/* ---------- forecast: fast Sainte-Laguë ---------- */
function allocateSeatsFast(votes, total){
  if(OVERHANG){
    return overhangSeats(votes,total,directFromProjection(votes),OVERHANG.cap);
  }
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
  if(!valid.length) return {};
  const seats={};valid.forEach(p=>{seats[p]=0});

  // Hare/Niemeyer (largest remainder) for the Monte Carlo draws
  if(SEAT_METHOD==='hare_niemeyer'){
    const totalVotes=valid.reduce((a,p)=>a+(votes[p]||0),0);
    if(totalVotes===0) return seats;
    const quota=totalVotes/total;
    const rems=[];
    let given=0;
    valid.forEach(p=>{
      const q=(votes[p]||0)/quota;
      const fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    let left=total-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    return seats;
  }

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

// Dirichlet concentration K is calibrated for a rich poll sample; with few
// polls the estimate is less certain, so K shrinks (never below 30%).
function effectiveK(nPolls, base){
  if(!nPolls||nPolls<=0) return base;
  return base*Math.max(0.3, Math.min(1, nPolls/12));
}

function forecastSigma(avg, nPolls){
  const sumA=PARTY_ORDER.reduce((a,p)=>a+Math.max(0.5,(avg[p]||0)),0)*effectiveK(nPolls,FORECAST_K);
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

function runSeatForecast(avg, nSims, nPolls){
  const thSeats=THRESHOLD/100*SEATS_TOTAL;
  const maj={rg:0,td:0,hung:0,km:0};
  const largest={};
  const seatsBy={};
  const votesBy={};
  PARTY_ORDER.forEach(p=>{seatsBy[p]=[];votesBy[p]=[]});
  const alpha=PARTY_ORDER.map(p=>Math.max(0.2,(avg[p]||0)*effectiveK(nPolls,FORECAST_K_SEATS)));
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
    const KM=BLOCS.kingmaker;
    const kmActive=!!(KM&&!BLOCS.bloc1.parties.includes(KM)&&!BLOCS.bloc2.parties.includes(KM));
    const kmS=kmActive?(seats[KM]||0):0;
    const rg=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const td=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
    if(rg>=MAJ_TH)maj.rg++;
    else if(td>=MAJ_TH)maj.td++;
    else if(kmActive&&(rg+kmS>=MAJ_TH||td+kmS>=MAJ_TH))maj.km++;
    else maj.hung++;
    let top=PARTY_ORDER[0],topN=(seats[PARTY_ORDER[0]]||0);
    for(const p of PARTY_ORDER){if((seats[p]||0)>topN){topN=seats[p];top=p}}
    largest[top]=(largest[top]||0)+1;
    PARTY_ORDER.forEach(p=>{seatsBy[p].push(seats[p]||0);votesBy[p].push(simVotes[p])});
  }
  return summarize(seatsBy,votesBy,largest,maj,nSims);
}

function runForecast(avg, nSims, nPolls){
  if(SEAT_BASED) return runSeatForecast(avg, nSims, nPolls);
  const K=effectiveK(nPolls,FORECAST_K);
  const maj={rg:0,td:0,hung:0,km:0};
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
    const simTotal=PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0);
    const MAJ_TH=Math.floor(simTotal/2)+1;
    const KM=BLOCS.kingmaker;
    const kmActive=!!(KM&&!BLOCS.bloc1.parties.includes(KM)&&!BLOCS.bloc2.parties.includes(KM));
    const kmS=kmActive?(seats[KM]||0):0;
    if(rg>=MAJ_TH)maj.rg++;
    else if(td>=MAJ_TH)maj.td++;
    else if(kmActive&&(rg+kmS>=MAJ_TH||td+kmS>=MAJ_TH))maj.km++;
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
  const seedKey=(POLLS[0]?POLLS[0].date:'')+'|'+daysVal+'|'+pollsterVal+'|'+filtered.length;
  let sim=FC_CACHE[seedKey];
  if(!sim){
    fcRand=mulberry32(hashStr(seedKey));
    sim=runForecast(avg,3000,filtered.length);
    FC_CACHE[seedKey]=sim;
  }
  const fOrder=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  const maj=sim.maj;
  const majTotal=sim.nSims;
  const kmDefined=!!BLOCS.kingmaker;
  const KM_COLOR=BLOCS.kingmakerColor||'#F59E0B';
  const rgP=maj.rg/majTotal, tdP=maj.td/majTotal, hungP=maj.hung/majTotal, kmP=kmDefined?((maj.km||0)/majTotal):0;
  const expectedSeats=Math.round(fOrder.reduce((a,p)=>a+mean(sim.seatsBy[p]),0));
  const MAJ=Math.floor(expectedSeats/2)+1;

  // --- Deterministic: median-based parliament ---
  const detSeats=deterministicSeats(sim.medians,sim.means,OVERHANG?expectedSeats:SEATS_TOTAL);
  let cmpRows='';
  const cmpOrder=fOrder.slice().sort((a,b)=>sim.means[b]-sim.means[a]);
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
  fOrder.forEach(p=>{
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
    ${kmDefined?`<div class="fc-majseg" style="width:${(kmP*100).toFixed(1)}%;background:${KM_COLOR}"></div>`:''}
    <div class="fc-majseg" style="width:${(hungP*100).toFixed(1)}%;background:#9CA3AF"></div>
  </div>`;

  let largestRows='';
  const largestSorted=fOrder.slice().sort((a,b)=>(sim.largest[b]||0)-(sim.largest[a]||0));
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
  const voteOrder=fOrder.slice().sort((a,b)=>mean(sim.votesBy[b])-mean(sim.votesBy[a]));
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
  const seatOrder=fOrder.slice().sort((a,b)=>{
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

  const leadCands=[{n:BLOCS.bloc1.name,c:BLOCS.bloc1.color,p:rgP},{n:BLOCS.bloc2.name,c:BLOCS.bloc2.color,p:tdP}];
  if(kmDefined)leadCands.push({n:BLOCS.kingmakerLabel||'Kingmaker',c:KM_COLOR,p:kmP});
  leadCands.sort((a,b)=>b.p-a.p);
  const leadOutcome=leadCands[0].n, leadColor=leadCands[0].c, leadPct=leadCands[0].p*100;

  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${t('FORECAST','TAHMİN')} — ${COUNTRY_NAME} 2026</div>
      <div class="fc-headline">
        <span class="fc-headline-label" style="color:${leadColor}">${leadOutcome} ${t('majority','çoğunluk')}</span>
        <span class="fc-headline-num">${leadPct.toFixed(1)}%</span>
      </div>
      <div class="hero-date">${sim.nSims.toLocaleString()} ${t('simulations','simülasyon')} · ${t('national polling error','ulusal anket hatası')} (σ≈${SEAT_BASED?fmt(2.2,1)+' seats':fmt(forecastSigma(avg,filtered.length),1)+'pp'}) · ${methodNameShort()} · ${seatsDesc()} ${T.seats} · ${THRESHOLD}% ${T.threshold} · seeded, reproducible</div>
    </div>

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.ifHeldToday}</div></div>
      <div class="parliament-box">${buildParliamentSVG(detSeats)}</div>
      <div style="overflow-x:auto">
      <table class="polls-table compact-table"><thead><tr>
        <th>${t('Party','Parti')}</th><th class="c">${T.seats}</th><th class="c">Median</th><th class="c">Mode</th>
      </tr></thead><tbody>${cmpRows}</tbody></table></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
        ${t('Deterministic projection from the median of the simulations (parties whose median is 0 are left out)','Simülasyonların medyanından deterministik tahmin (medyanı 0 olan partiler hariç)')}
      </div>
    </div>

    ${MAP_CONF()?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.districtMap}</div></div>
      <div class="map-toggle-row" style="justify-content:flex-end">
        <button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='proj'?' active':''}" data-fcmode="proj">${T.projection}</button>
        <button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='res'?' active':''}" data-fcmode="res">${LAST_ELECTION.date.slice(0,4)} ${T.result}</button>
        ${MAP_CONF().useConstituencies&&BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn fc-map-color-btn${MAP_COLOR==='bloc'?' active':''}" data-mapcolor="bloc">${T.blocs}</button>`:''}
        <button class="shot-btn" id="fc-map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>
      </div>
      <div class="parliament-box" id="fc-map-box"></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
        District winners from the forecast's median national vote shares · hover a district for the past/forecast comparison
      </div>
    </div>`:''}

    ${constHtml}

    <div class="fc-section"><div class="bar"></div>${T.probabilities}</div>

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.majority}</div></div>
      ${majorityBar}
      <div class="fc-majlegend">
        <span><span class="fc-dot" style="background:${BLOCS.bloc1.color}"></span>${BLOCS.bloc1.name} ${pct100(rgP)}</span>
        <span><span class="fc-dot" style="background:${BLOCS.bloc2.color}"></span>${BLOCS.bloc2.name} ${pct100(tdP)}</span>
        ${kmDefined?`<span><span class="fc-dot" style="background:${KM_COLOR}"></span>${BLOCS.kingmakerLabel||'Kingmaker'} ${pct100(kmP)}</span>`:''}
        <span><span class="fc-dot" style="background:#9CA3AF"></span>No majority ${pct100(hungP)}</span>
      </div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Chance of a ${MAJ}-seat majority</div>
    </div>

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.largestParty}</div></div>
      ${largestRows}
    </div>

    ${SEAT_BASED?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.voteShare}</div></div>
      <div class="fc-votehd"><span></span><span></span><span>EXP</span><span>90% INT</span></div>
      ${voteRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected vote share from simulations · dashed line = ${THRESHOLD}% threshold</div>
    </div>`}

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatDistribution}</div></div>
      <div class="fc-seathead fc-seathead-hd"><span></span><span>EXP</span><span>90% INT</span></div>
      ${seatRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected seats = mean of simulations · 90% interval = 5th–95th percentile</div>
    </div>
  </div>`;
  if(MAP_CONF()){
    const fcBox=$('fc-map-box');
    if(fcBox){
      const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:medVotes;
      renderMapInto(fcBox, fcAvg, FC_MODE==='res');
    }
    pane.querySelectorAll('.fc-map-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        FC_MODE=btn.dataset.fcmode;
        pane.querySelectorAll('.fc-map-btn').forEach(b=>b.classList.toggle('active',b===btn));
        const fcBox=$('fc-map-box');
        if(fcBox){
          const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:medVotes;
          renderMapInto(fcBox, fcAvg, FC_MODE==='res');
        }
      });
    });
    pane.querySelectorAll('.fc-map-color-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        MAP_COLOR=(MAP_COLOR==='bloc')?'party':'bloc';
        pane.querySelectorAll('.fc-map-color-btn').forEach(b=>b.classList.toggle('active',b===btn));
        const fcBox=$('fc-map-box');
        if(fcBox){
          const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:medVotes;
          renderMapInto(fcBox, fcAvg, FC_MODE==='res');
        }
      });
    });
    const fcShot=$('fc-map-shot-btn');
    if(fcShot){
      fcShot.addEventListener('click',()=>{
        captureBoxMap('fc-map-box', COUNTRY+'-forecast-map.png');
      });
    }
  }
}

/* ---------- live tab (election night) ---------- */
let LIVE_DATA=null;
let LIVE_LOADING=false;
let LIVE_INTERVAL=null;

async function loadValu(){
  try{
    const resp=await fetch(dataBase()+'data/'+COUNTRY+'/valu.json');
    if(!resp.ok) return null;
    const j=await resp.json();
    return j&&j.parties?j.parties:null;
  }catch(e){return null}
}

async function loadLive(){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  if(!conf) return null;
  if(LIVE_LOADING) return LIVE_DATA;
  LIVE_LOADING=true;
  const urls=[conf.workerUrl, dataBase()+conf.localUrl].filter(Boolean);
  for(const u of urls){
    try{
      const resp=await fetch(u);
      if(!resp.ok) continue;
      const j=await resp.json();
      LIVE_DATA=j;
      LIVE_LOADING=false;
      return j;
    }catch(e){}
  }
  LIVE_LOADING=false;
  return null;
}

function livePartyMap(){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  const map={};
  const mk=conf&&conf.mapCode?conf.mapCode:(p=>p);
  for(const p of PARTY_ORDER) map[mk(p)]=p;
  return map;
}

// three-way comparison rows: live % vs valu exit poll vs forecast avg
function liveCompareRows(live, valu, avg){
  const map=livePartyMap();
  const liveParties=live&&live.national&&live.national.parties||[];
  const liveBy={};
  liveParties.forEach(p=>{const k=map[p.code];if(k)liveBy[k]={pct:p.pct,votes:p.votes}});
  const rows=PARTY_ORDER.slice().sort((a,b)=>{
    const la=liveBy[a]?liveBy[a].pct:0;
    const lb=liveBy[b]?liveBy[b].pct:0;
    return lb-la;
  }).map(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const lv=liveBy[p];
    const va=valu?valu[p]:null;
    const fc=avg&&avg[p]!=null?avg[p]:null;
    const lvPct=lv?lv.pct:null;
    const maxV=Math.max(lvPct||0,va||0,fc||0,35);
    const cells=[['LIVE',lvPct],['VALU',va],['FCST',fc]].map(([lab,v])=>{
      const w=v!=null?Math.max(2,Math.min(100,v/maxV*100)):0;
      return `<div class="lv-cell">
        <div class="lv-track"><div class="lv-fill" style="width:${w}%;background:${col}"></div></div>
        <span class="lv-val">${v!=null?pct(v):'—'}</span>
        <span class="lv-lab">${lab}</span>
      </div>`;
    }).join('');
    const swing=lvPct!=null&&LAST_ELECTION.results[p]!=null?lvPct-LAST_ELECTION.results[p]:null;
    return `<div class="lv-row">
      <span class="lv-code" style="color:${col}">${partyCode(p)}</span>
      ${cells}
      <span class="lv-swing ${swing>0.05?'up':(swing<-0.05?'down':'flat')}">${swing==null?'—':((swing>0?'+':'')+pct(swing))}</span>
    </div>`;
  }).join('');
  return rows;
}

function renderLive(pane){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${t('LIVE','CANLI')} — ${COUNTRY_NAME}</div>
      <div class="hero-date">Election night · loading official count…</div>
    </div>
  </div>`;
loadLive().then(live=>{
    return loadValu().then(valu=>{
    const avg=computeAverages(recentPolls(POLLS,60));
    const nat=live&&live.national;
    const counted=nat?nat.counted:0;
    const totalD=nat?nat.totalDistricts:0;
    const countedPct=totalD?Math.round(counted/totalD*100):0;
    const turnout=nat&&nat.turnout!=null?nat.turnout:null;
    const updated=nat&&nat.updatedAt||(live&&live.updated)||'';
    const rows=liveCompareRows(live, valu, avg);

    // seat projection: prefer live official seats, else allocate from national pct
    let seats=null;
    const map=livePartyMap();
    if(live&&live.valkretsar&&live.valkretsar.some(v=>v&&v.seats&&v.seats.length)){
      seats={};
      live.valkretsar.filter(Boolean).forEach(v=>{
        v.seats.forEach(s=>{const k=map[s.code];if(k)seats[k]=(seats[k]||0)+s.seats});
      });
    }else if(live&&live.national&&live.national.parties){
      const votes={};
      live.national.parties.forEach(p=>{const k=map[p.code];if(k)votes[k]=p.pct!=null?p.pct:0});
      seats=allocateSeatsFast(votes,SEATS_TOTAL);
    }
    const seatsTotal=seats?PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0):0;
    const parlSvg=seats&&seatsTotal?buildParliamentSVG(seats):'';

    const heroLine=`${countedPct}% ${t('of','')} ${totalD} ${T.counted} · ${T.turnout} ${turnout!=null?pct(turnout):'—'} · ${T.updated} ${updated||'—'}`;
    pane.innerHTML=`<div class="tab-pane-inner">
      <div class="hero fc-hero">
        <div class="hero-title">${t('LIVE','CANLI')} — ${COUNTRY_NAME}</div>
        <div class="hero-date">${heroLine}</div>
      </div>

      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.liveVs}</div></div>
        <div style="display:flex;gap:8px;align-items:center;padding:0 2px 4px;font-size:9px;font-weight:900;letter-spacing:1px;color:var(--c-text-muted)">
          <span style="width:44px"></span><span style="flex:1">${t('Official count','Resmi sayım')}</span><span style="flex:1">${t('Exit poll (Valu)','Çıkış anketi (Valu)')}</span><span style="flex:1">${t('Final forecast','Son tahmin')}</span><span style="width:60px;text-align:right">${T.swing}</span>
        </div>
        ${rows}
      </div>

      ${parlSvg?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatsLive}</div></div>
        <div class="parliament-box">${parlSvg}</div>
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px;text-align:center">${seatsTotal} seats · live allocation</div>
      </div>`:''}

      ${live&&live.valkretsar?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.liveMap}</div></div>
        <div class="map-toggle-row" style="justify-content:flex-end">
          <button class="map-toggle-btn parl-btn lv-map-btn active" data-lvmode="live">${t('LIVE','CANLI')}</button>
          <button class="map-toggle-btn parl-btn lv-map-btn" data-lvmode="res">2022 ${T.result}</button>
          ${BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn lv-map-color-btn" data-lvcolor="bloc">${T.blocs}</button>`:''}
          <button class="shot-btn" id="lv-map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>
        </div>
        <div class="parliament-box" id="live-map-box"></div>
      </div>`:''}
    </div>`;
    bindLiveMap(live);
    const shot=$('lv-map-shot-btn');
    if(shot) shot.addEventListener('click',()=>captureBoxMap('live-map-box', COUNTRY+'-live-map.png'));
    // auto-refresh every 30s while the LIVE tab is visible
    if(LIVE_INTERVAL) clearInterval(LIVE_INTERVAL);
    LIVE_INTERVAL=setInterval(()=>{
      const p=$('pane-live');
      if(!p||p.style.display==='none') return;
      LIVE_DATA=null;
      loadLive().then(nl=>{
        if(nl) renderLive(p);
      });
    },30000);
    });
  });
}

function bindLiveMap(live){
  const box=$('live-map-box');
  if(!box) return;
  // build per-valkrets avg-shaped shares from live data and render
  const render=()=>{
    const mode=document.querySelector('.lv-map-btn.active')?document.querySelector('.lv-map-btn.active').dataset.lvmode:'live';
    renderLiveMapInto(box, live, mode);
  };
  document.querySelectorAll('.lv-map-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.lv-map-btn').forEach(x=>x.classList.toggle('active',x===b));
      render();
    });
  });
  const colorBtn=document.querySelector('.lv-map-color-btn');
  if(colorBtn){
    colorBtn.classList.toggle('active',MAP_COLOR==='bloc');
    colorBtn.addEventListener('click',()=>{
      const on=colorBtn.classList.toggle('active');
      MAP_COLOR=on?'bloc':'party';
      render();
    });
  }
  render();
}

// map for live valkrets data: reuses districtShares machinery but replaces base
// with live per-valkrets parties. We build a pseudo-avg so districtWinnerProjection works.
function renderLiveMapInto(box, live, mode){
  const conf=MAP_CONF();
  if(!conf) return;
  if(!conf.useConstituencies) return; // live map only for Sweden-style constituency maps
  if(mode!=='live'){
    // 2022 RESULT: use the normal machinery (constituencies.json results_2022)
    return renderMapInto(box, LAST_ELECTION.results, true);
  }
  const map=livePartyMap();
  // live valkretsar are ordered RD_01..RD_29; map index -> constituency id via
  // CONSTITUENCIES order (which matches Valmyndigheten's valkrets numbering)
  const cList=(CONSTITUENCIES&&CONSTITUENCIES.constituencies)||[];
  const vkShares={};
  (live&&live.valkretsar||[]).forEach((v,i)=>{
    if(!v||!v.parties) return;
    const cid=cList[i]?cList[i].id:String(i+1).padStart(2,'0');
    const s={};
    v.parties.forEach(p=>{
      const k=map[p.code];
      if(k){
        const past=LAST_ELECTION.results[k]!=null?LAST_ELECTION.results[k]:0;
        s[k]={past,now:p.pct!=null?p.pct:0};
      }
    });
    vkShares[cid]=s;
  });
  renderMapIntoWithShares(box, LAST_ELECTION.results, false, vkShares);
}

function renderMapIntoWithShares(box, avg, resultMode, vkShares){
  // Reuse renderMapInto but inject per-district shares for Sweden live data.
  // Implemented by temporarily swapping districtShares, calling renderMapInto, restoring.
  const orig=districtShares;
  districtShares=(nr,a,rm)=>{
    const id=String(nr);
    if(vkShares&&vkShares[id]) return vkShares[id];
    return orig(nr,a,rm);
  };
  return renderMapInto(box, avg, resultMode).finally(()=>{districtShares=orig});
}

/* ---------- history tab ---------- */
let HISTORY_DATA=null;
let HISTORY_LOADING=false;

async function loadHistory(){
  if(HISTORY_LOADING) return HISTORY_DATA;
  HISTORY_LOADING=true;
  try{
    const resp=await fetch(dataBase()+'data/'+COUNTRY+'/history.json');
    if(!resp.ok){HISTORY_LOADING=false;return null}
    HISTORY_DATA=await resp.json();
    HISTORY_LOADING=false;
    return HISTORY_DATA;
  }catch(e){HISTORY_LOADING=false;return null}
}

function renderHistory(pane){
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${t('HISTORY','GEÇMİŞ')} — ${COUNTRY_NAME}</div>
      <div class="hero-date">${t('Party vote shares, seats and turnout over time · hover a point for details','Oy oranları, sandalyeler ve katılım yıllara göre · ayrıntılar için üzerine gelin')} · ${LAST_ELECTION.date.slice(0,4)}</div>
    </div>
  </div>`;
  loadHistory().then(hist=>{
    if(!hist||!hist.elections||!hist.elections.length){
      pane.innerHTML=`<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.history}</div></div><div class="method-text" style="padding:16px"><p>${t('No historical data available for','Bu ülke için geçmiş veri yok')} ${COUNTRY_NAME}.</p></div></div></div>`;
      return;
    }
    pane.innerHTML=`<div class="tab-pane-inner">
      <div class="hero fc-hero">
        <div class="hero-title">${t('HISTORY','GEÇMİŞ')} — ${COUNTRY_NAME}</div>
        <div class="hero-date">${t('Party vote shares, seats and turnout over time · hover a point for details','Oy oranları, sandalyeler ve katılım yıllara göre · ayrıntılar için üzerine gelin')} · ${LAST_ELECTION.date.slice(0,4)}</div>
      </div>
      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('PARTY VOTE SHARE OVER TIME','PARTİ OY ORANLARI (YILLARA GÖRE)')}</div>
        <button class="shot-btn" id="hist-votes-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap" style="position:relative"><canvas id="hist-votes-canvas"></canvas></div></div>
      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('PARTY SEATS OVER TIME','PARTİ SANDALYELERİ (YILLARA GÖRE)')}</div>
        <button class="shot-btn" id="hist-seats-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap" style="position:relative"><canvas id="hist-seats-canvas"></canvas></div></div>
      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('TURNOUT OVER TIME','KATILIM (YILLARA GÖRE)')}</div>
        <button class="shot-btn" id="hist-turnout-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap" style="position:relative"><canvas id="hist-turnout-canvas"></canvas></div></div>
    </div>`;
    requestAnimationFrame(()=>{
      const vc=$('hist-votes-canvas');
      if(vc) drawHistoryLine(vc, hist, 'votes');
      const sc=$('hist-seats-canvas');
      if(sc) drawHistoryLine(sc, hist, 'seats');
      const tc=$('hist-turnout-canvas');
      if(tc) drawHistoryTurnout(tc, hist);
      const vs=$('hist-votes-shot-btn');
      if(vs) vs.addEventListener('click',()=>captureChartPng($('hist-votes-canvas'),COUNTRY+'-history-votes.png'));
      const ss=$('hist-seats-shot-btn');
      if(ss) ss.addEventListener('click',()=>captureChartPng($('hist-seats-canvas'),COUNTRY+'-history-seats.png'));
      const ts=$('hist-turnout-shot-btn');
      if(ts) ts.addEventListener('click',()=>captureChartPng($('hist-turnout-canvas'),COUNTRY+'-history-turnout.png'));
    });
  });

}

/* ---------- history line charts ---------- */
// draws multi-party line chart (votes % or seats) across election years
function drawHistoryLine(canvas, hist, mode){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth||600;
  const H=wrap.clientHeight||260;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  const elec=hist.elections||[];
  // elections with data for this mode
  const valid=elec.filter(e=>mode==='votes'?(e.results&&Object.keys(e.results).length):(e.seats&&Object.keys(e.seats).length));
  if(valid.length<2) return;
  const years=valid.map(e=>e.year);

  // parties to stack: present in >=2 elections, in PARTY_ORDER
  const count={};
  valid.forEach(e=>{
    const src=mode==='votes'?e.results:(e.seats||{});
    Object.keys(src).forEach(p=>{count[p]=(count[p]||0)+1});
  });
  const parties=Object.keys(count).filter(p=>count[p]>=2).sort((a,b)=>PARLIAMENT_ORDER.indexOf(a)-PARLIAMENT_ORDER.indexOf(b));
  // NYD (historical right-populist party, 1991/1994) sits between SD and KD in
  // the stack, matching SD's far-right position in the parliament diagram.
  const NYD='NYD';
  if(parties.includes('SD')&&parties.includes('KD')&&parties.includes(NYD)){
    parties.splice(parties.indexOf(NYD),1);
    parties.splice(parties.indexOf('SD'),0,NYD);
  }

  // per-year values (0 when missing) and the total cap (100 for %, seat total for seats)
  const valOf=(e,p)=>{const src=mode==='votes'?e.results:(e.seats||{});const v=src[p];return (v==null||isNaN(v))?0:v};
  const caps=valid.map(e=>{
    if(mode==='votes') return 100;
    const tot=Object.values(e.seats||{}).reduce((a,b)=>a+b,0);
    return tot||0;
  });
  const mat=parties.map(p=>valid.map((e,i)=>valOf(e,p)));

  const pad={top:16,right:50,bottom:30,left:44};
  const cw=W-pad.left-pad.right, ch=H-pad.top-pad.bottom;
  const yMax=Math.max(...caps, mode==='votes'?100:349);
  const yMin=0;
  const xFor=i=>pad.left+(i/(valid.length-1))*cw;
  const yFor=v=>pad.top+ch*(1-(v-yMin)/(yMax-yMin));

  // grid + y labels
  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  const yTicks=4;
  for(let i=0;i<=yTicks;i++){
    const y=pad.top+ch*(i/yTicks);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const v=yMax-(yMax-yMin)*(i/yTicks);
    ctx.fillStyle='#64748B';ctx.font='9px Decima Mono Pro,monospace';ctx.textAlign='right';
    ctx.fillText(String(Math.round(v)),pad.left-4,y+3);
  }
  ctx.fillStyle='#64748B';ctx.font='9px Decima Mono Pro,monospace';ctx.textAlign='center';
  const xStep=Math.max(1,Math.floor(years.length/8));
  for(let i=0;i<years.length;i+=xStep){
    ctx.fillText(String(years[i]),xFor(i),H-pad.bottom+12);
  }

  // stacked area: parties in order bottom-to-top, with an "others" remainder band on top
  // cumulative tops per band
  const bandVals=mat.map(col=>col.slice());
  const others=valid.map((e,i)=>Math.max(0,caps[i]-parties.reduce((a,p,k)=>a+mat[k][i],0)));
  bandVals.push(others);
  // cumulative top for each band (bands drawn bottom-up; last band is "others")
  const cumTop=bandVals.map((col,bi)=>{
    const out=col.slice();
    for(let j=0;j<bi;j++) out[j]+= (j===0?0:0); // placeholder; recompute below
    return out;
  });
  // recompute properly: cumTop[b][i] = sum of bandVals[0..b][i]
  for(let b=0;b<bandVals.length;b++){
    for(let i=0;i<valid.length;i++){
      cumTop[b][i]=(b===0?0:cumTop[b-1][i])+bandVals[b][i];
    }
  }

  // draw bands bottom-up (party 0 first ... others last on top)
  const colors=[...parties.map(p=>PARTY_META[p]?PARTY_META[p].color:'#888'), '#C9CDD4'];
  for(let b=0;b<bandVals.length;b++){
    if(bandVals[b].every(v=>v===0)) continue;
    ctx.beginPath();
    for(let i=0;i<valid.length;i++){
      const x=xFor(i), y=yFor(cumTop[b][i]);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    for(let i=valid.length-1;i>=0;i--){
      const x=xFor(i), yb=yFor(b===0?0:cumTop[b-1][i]);
      ctx.lineTo(x,yb);
    }
    ctx.closePath();
    ctx.fillStyle=colors[b];
    ctx.fill();
  }

  // separators between bands (crisp edges)
  ctx.lineWidth=1;
  for(let b=0;b<bandVals.length-1;b++){
    if(bandVals[b].every(v=>v===0)) continue;
    ctx.strokeStyle='rgba(255,255,255,0.5)';
    ctx.beginPath();
    for(let i=0;i<valid.length;i++){
      const x=xFor(i), y=yFor(cumTop[b][i]);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // right-edge labels per party band (NYD is deliberately unlabeled)
  const last=valid.length-1;
  parties.forEach((p,k)=>{
    if(p===NYD) return;
    const top=cumTop[k][last], bot=(k===0?0:cumTop[k-1][last]);
    const midY=yFor((top+bot)/2);
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    ctx.fillStyle=col;ctx.font='800 9px '+(getComputedStyle(document.body).fontFamily||'sans-serif');
    ctx.textAlign='left';
    ctx.fillText(partyCode(p),xFor(last)+5,midY+3);
  });

  // ---- hover tooltip ----
  let tip=wrap.querySelector('.hist-tip');
  if(!tip){
    tip=document.createElement('div');
    tip.className='map-tip hist-tip';
    wrap.appendChild(tip);
  }
  wrap.onmousemove=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left;
    const idx=Math.round((mx-pad.left)/cw*(valid.length-1));
    if(idx<0||idx>=valid.length){tip.style.display='none';return}
    const ev2=valid[idx];
    const src=mode==='votes'?ev2.results:(ev2.seats||{});
    const sortedP=parties.slice().sort((a,b)=>(src[b]||0)-(src[a]||0)).filter(p=>src[p]!=null&&!isNaN(src[p])&&(src[p]||0)>0);
    if(!sortedP.length){tip.style.display='none';return}
    const rows=sortedP.map(p=>{
      const col=PARTY_META[p]?PARTY_META[p].color:'#888';
      const val=mode==='seats'?String(Math.round(src[p])):pct(src[p]);
      return `<div class="map-tip-row"><span class="map-tip-code" style="color:${col}">${partyCode(p)}</span><span class="map-tip-now">${val}</span></div>`;
    }).join('');
    tip.innerHTML=`<div class="map-tip-head"><div class="map-tip-title">${ev2.year} ${t('ELECTION','SEÇİMİ')}</div></div>${rows}`;
    const tipW=tip.offsetWidth||170, tipH=tip.offsetHeight||120;
    let left=Math.max(4,Math.min(mx+14,r.width-tipW-4));
    let top=Math.max(4,Math.min(e.clientY-r.top+14,r.height-tipH-4));
    tip.style.left=left+'px';
    tip.style.top=top+'px';
    tip.style.display='block';
  };
  wrap.onmouseleave=()=>{tip.style.display='none'};
}

// turnout line chart
function drawHistoryTurnout(canvas, hist){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth||600;
  const H=wrap.clientHeight||200;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  const elec=(hist.elections||[]).filter(e=>e.turnout!=null);
  if(elec.length<2) return;
  const years=elec.map(e=>e.year);
  const pad={top:16,right:16,bottom:30,left:44};
  const cw=W-pad.left-pad.right, ch=H-pad.top-pad.bottom;
  const yMin=40,yMax=100;

  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  for(let i=0;i<=4;i++){
    const y=pad.top+ch*(i/4);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const v=yMax-(yMax-yMin)*(i/4);
    ctx.fillStyle='#64748B';ctx.font='9px Decima Mono Pro,monospace';ctx.textAlign='right';
    ctx.fillText(v+'%',pad.left-4,y+3);
  }
  ctx.fillStyle='#64748B';ctx.font='9px Decima Mono Pro,monospace';ctx.textAlign='center';
  const xStep=Math.max(1,Math.floor(years.length/8));
  for(let i=0;i<years.length;i+=xStep){
    const x=pad.left+(i/(years.length-1))*cw;
    ctx.fillText(String(years[i]),x,H-pad.bottom+12);
  }
  const xFor=i=>pad.left+(i/(years.length-1))*cw;
  const yFor=v=>pad.top+ch*(1-(v-yMin)/(yMax-yMin));

  ctx.beginPath();
  ctx.strokeStyle='#111827';ctx.lineWidth=2;
  elec.forEach((e,i)=>{
    const x=xFor(i),y=yFor(e.turnout);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();
  elec.forEach((e,i)=>{
    ctx.beginPath();ctx.arc(xFor(i),yFor(e.turnout),2,0,Math.PI*2);ctx.fillStyle='#111827';ctx.fill();
  });

  // ---- hover tooltip ----
  let tip=wrap.querySelector('.hist-tip');
  if(!tip){
    tip=document.createElement('div');
    tip.className='map-tip hist-tip';
    wrap.appendChild(tip);
  }
  wrap.onmousemove=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left;
    const idx=Math.round((mx-pad.left)/cw*(elec.length-1));
    if(idx<0||idx>=elec.length){tip.style.display='none';return}
    const ev2=elec[idx];
    tip.innerHTML=`<div class="map-tip-head"><div class="map-tip-title">${ev2.year} ${t('ELECTION','SEÇİMİ')}</div>
      <div class="map-tip-row"><span class="map-tip-code">${t('Turnout','Katılım')}</span><span class="map-tip-now">${pct(ev2.turnout)}</span></div></div>`;
    const tipW=tip.offsetWidth||170, tipH=tip.offsetHeight||70;
    let left=Math.max(4,Math.min(mx+14,r.width-tipW-4));
    let top=Math.max(4,Math.min(e.clientY-r.top+14,r.height-tipH-4));
    tip.style.left=left+'px';
    tip.style.top=top+'px';
    tip.style.display='block';
  };
  wrap.onmouseleave=()=>{tip.style.display='none'};
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
  const maeElections=[...new Set(Object.values(POLLSTER_MAE).flatMap(d=>Object.keys(d).filter(k=>k!=='overall')))].sort();
  const defaultMAE=SEAT_BASED?'1.25 seats':'1.30';
  const unit=SEAT_BASED?'seats':'%';
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="card">
      <div class="card-head"><div class="bar"></div><div class="t">${T.methodology}</div></div>
      <div class="method-text">
        <h3>${t('Data Sources','Veri Kaynakları')}</h3>
        <p>Polls are collected from the following sources:</p>
        <ul>
          <li><strong>Wikipedia</strong> — aggregated from publicly available polling tables. Primary source.</li>
          ${COUNTRY==='sweden'?'<li><strong>SwedishPolls</strong> (CC0) — GitHub repository maintained by Magnus&nbsp;M瑞典Polls with standardized Swedish polling data since 1944.</li>':''}
        </ul>
        <p>Duplicate polls (same pollster + same date) are deduplicated, with Wikipedia data taking priority.</p>

        <h3>${t('Poll Average','Anket Ortalaması')}</h3>
        <p>The national poll average uses a <strong>triple-weighted mean</strong> combining sample size, pollster accuracy and recency:</p>
        <span class="formula">weight_i = n_i × (1 / MAE_pollster) × 0.5^(age_days / ${RECENCY_HALF_LIFE})</span>
        <span class="formula">avg(party) = Σ(vote_i × weight_i) / Σ(weight_i)</span>
        <p>where <em>n_i</em> is the sample size, <em>MAE_pollster</em> is the mean absolute error of the pollster across the last ${maeElections.length} elections (${maeElections.join(', ')}) and <em>age_days</em> is the age of the poll in days. Polls halve in weight every ${RECENCY_HALF_LIFE} days, so recent polls dominate. Pollsters with only 1-2 elections of data are assigned a default MAE of ${defaultMAE}.</p>
        ${BIAS_KEY?`<p><strong>Bias correction.</strong> Each pollster's systematic error measured in the ${BIAS_KEY} backtest (their average signed deviation from the actual result) is subtracted from their polls before weighting, removing house effects.</p>`:''}
        ${PRIOR_ALPHA>0?`<p><strong>Prior anchor.</strong> The average is blended ${(PRIOR_ALPHA*100).toFixed(0)}% toward the ${LAST_ELECTION.date.slice(0,4)} result, so a thin or volatile poll set cannot drift arbitrarily far from the known electorate.</p>`:''}
        ${TREND_CONF?`<p><strong>Trend extrapolation.</strong> A recency-weighted linear fit over the last ${TREND_CONF.windowDays} days is projected forward to the election date (${TREND_CONF.electionDate}) and blended ${(TREND_CONF.blend*100).toFixed(0)}% into the average, capped at ${TREND_CONF.maxDaily} point/day of movement.</p>`:''}

        <h3>${t('Pollster Accuracy (MAE)','Anketçi Doğruluğu (MAE)')}</h3>
        <p>Each pollster's accuracy is measured by averaging their error across the last 5 polls before each of the most recent elections. The MAE is the mean absolute deviation across the main parties in ${unit}:</p>
        <table class="polls-table" style="margin:8px 0"><thead><tr><th>Pollster</th><th>Elections</th><th>MAE</th></tr></thead><tbody>
        ${Object.entries(POLLSTER_MAE).sort((a,b)=>a[1].overall-b[1].overall).map(([ps,d])=>{
          const eCount=Object.keys(d).filter(k=>k!=='overall').length;
          return `<tr><td>${ps}</td><td class="num">${eCount}</td><td class="num" style="font-weight:700">${d.overall.toFixed(2)} ${unit}</td></tr>`;
        }).join('')}
        </tbody></table>

        <h3>${t('Seat Projection','Sandalye Tahmini')}</h3>
        <p>${COUNTRY_NAME} elects a base parliament of <strong>${SEATS_TOTAL} seats</strong>${HAS_CONSTITUENCIES?' — 310 constituency seats across 29 constituencies plus 39 leveling seats':''} via ${methodSentence()}, with a <strong>${THRESHOLD}% electoral threshold</strong>.${OVERHANG?` When a party wins more direct mandates than its proportional share, leveling seats (Überhang-/Ausgleichsmandate) grow the parliament until proportions hold — capped at <strong>${OVERHANG.cap} seats</strong>: the most recent Landtag sat ${PARTY_ORDER.reduce((a,p)=>a+(LAST_ELECTION.seats?LAST_ELECTION.seats[p]||0:0),0)} seats.`:''}</p>
        <p>The parliament diagram shows all ${seatsDesc()} seats allocated nationally from the poll average. It follows the classic Wikimedia parliament-diagram layout: rows of the arch hold every party as a wedge, with the total seat count in the center. Chambers with a supplied floor plan use it; all others are laid out automatically with the canonical ParliamentArch geometry, so any seat count renders without a template.</p>

        <h3>${t('Bloc Totals','Blok Toplamları')}</h3>
        <p>The <strong>${BLOCS.bloc1.name}</strong> bloc includes ${BLOCS.bloc1.parties.join(', ')}. The <strong>${BLOCS.bloc2.name}</strong> bloc includes ${BLOCS.bloc2.parties.join(', ')}.</p>

        <h3>${t('Last Updated','Son Güncelleme')}</h3>
        <p>Data is scraped automatically from Wikipedia${COUNTRY==='sweden'?' and SwedishPolls':''}. The site is updated daily via GitHub Actions.</p>
      </div>
    </div></div>`;
}

/* ---------- main render ---------- */
function renderPollsTab(){
  const pane=$('pane-polls');
  const daysEl=$('filter-days');
  const daysVal=daysEl?(parseInt(daysEl.value)||30):30;
  const pollsterEl=$('filter-pollster');
  const pollsterVal=pollsterEl?pollsterEl.value:'';

  let filtered=recentPolls(POLLS, daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));

  const avg=computeAverages(filtered);
  const rawAvg=computeAverages(filtered, true);

  let html=`<div class="tab-pane-inner">`;
  // Top row: side card beside hero + poll trend
  html+=`<div class="page-top">
    <div class="card side-card"><div id="sidebar-content"></div></div>
    <div class="page-top-main">
      ${renderHero(avg, filtered)}
      <div class="card" style="height:100%"><div class="card-head"><div class="bar"></div><div class="t">${T.trend}</div>
        <button class="shot-btn" id="trend-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap"><canvas id="trend-canvas"></canvas></div></div>
    </div>
  </div>`;

  // Seat projection / district map (full width)
  html+=renderParliament(avg);

  // National poll average + blocs
  html+=renderPartyBars(rawAvg);

  html+=renderConstituencyTable(avg);
  html+=renderPollsTable(filtered);
  html+=`</div>`;
  pane.innerHTML=html;

  renderSidebar(String(daysVal), pollsterVal);

  // Draw chart after DOM update
  requestAnimationFrame(()=>{
    const canvas=$('trend-canvas');
    if(canvas) renderTrendChart(canvas, filtered);
    fitSideCard();
  });
  bindParlToggles(avg);
}

// Match the side card height to the hero+trend column so it spans the same
// vertical range (starts at the poll-average hero, ends at the poll trend).
function fitSideCard(){
  const main=document.querySelector('.page-top-main');
  const sc=document.querySelector('.side-card');
  if(main&&sc) sc.style.height=main.offsetHeight+'px';
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
    else if(tabId==='live'){renderLive(pane)}
    else if(tabId==='history'){renderHistory(pane)}
    else if(tabId==='methodology'){renderMethodology(pane)}
  },
  setCountry(id){
    if(!COUNTRIES[id]||id===COUNTRY) return;
    setCountry(id);
    for(const k in FC_CACHE) delete FC_CACHE[k];
PARL_MODE='proj';
    PARL_VIEW='seats';
    FC_MODE='proj';
    MAP_COLOR='party';
    if(LIVE_INTERVAL){clearInterval(LIVE_INTERVAL);LIVE_INTERVAL=null}
    document.querySelectorAll('.tab-trigger').forEach(b=>{b.dataset.active='false';delete b.dataset.loaded});
    document.querySelectorAll('.tab-pane').forEach(p=>{delete p.dataset.loaded});
    const pollsBtn=document.querySelector('[data-tab="polls"]');
    if(pollsBtn) pollsBtn.dataset.active='true';
    loadData().then(()=>loadConstituencies()).then(()=>{
      renderPollsTab();
    });
  }
};

/* ---------- boot ---------- */
loadData().then(()=>loadConstituencies()).then(()=>{
  renderPollsTab();
});
window.addEventListener('resize',()=>{fitSideCard();});

})();
