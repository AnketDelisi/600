// ===== AltıCiftSıfır — App =====
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=s=>document.getElementById(s);
// this file's own cache-busting token (?v= on the script tag), reused for
// map svg fetches so a rebuilt map is not served from the browser cache
const ASSET_V=(function(){
  try{
    const s=document.querySelector('script[src*="app.js"]');
    const m=s&&s.src.match(/[?&]v=([^&]+)/);
    return m?m[1]:'0';
  }catch(e){return '0'}
})();
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
  const cName=id=>{const c=COUNTRIES[id]||{};return (LANG==='tr'&&c.name_tr)?c.name_tr:(c.name||id);};
const IDEOLOGY_TR={
    'Right-wing populism': 'Sağ popülizm',
    'Turkish-Islamic Synthesis': 'Türk-İslam sentezi',
    'Erbakanism': 'Millî Görüş',
    'Social democracy': 'Sosyal demokrasi',
    'National conservatism': 'Millî muhafazakârlık',
    'Pro-Europeanism': 'Avrupa yanlılığı',
    'Christian democracy': 'Hristiyan demokrasi',
    'Liberalism': 'Liberalizm',
    'Social conservatism': 'Sosyal muhafazakârlık',
    'Conservatism': 'Muhafazakârlık',
    'Liberal conservatism': 'Liberal muhafazakârlık',
    'Social liberalism': 'Sosyal liberalizm',
    'Democratic socialism': 'Demokratik sosyalizm',
    'Green politics': 'Yeşil siyaset',
    'Left-wing populism': 'Sol popülizm',
    'Progressivism': 'İlerlemecilik',
    'Populism': 'Popülizm',
    'Euroscepticism': 'Avrupa şüpheciliği',
    'Socialism': 'Sosyalizm',
    'Economic liberalism': 'Ekonomik liberalizm',
    'Regionalism': 'Bölgeselcilik',
    'Conservative liberalism': 'Muhafazakâr liberalizm',
    'Ultranationalism': 'Aşırı milliyetçilik',
    'Centrism': 'Merkezcilik',
    'Communism': 'Komünizm',
    'Eco-socialism': 'Ekolojik sosyalizm',
    'Left-wing nationalism': 'Sol milliyetçilik',
    'Anti-corruption': 'Yolsuzluk karşıtlığı',
    'Agrarianism': 'Tarımcılık',
    'Russian minority politics': 'Rus azınlık siyaseti',
    'Libertarianism': 'Liberteryenizm',
    'Left-conservatism': 'Sol muhafazakârlık',
    'Neo-fascism': 'Neofaşizm',
    'Anti-capitalism': 'Kapitalizm karşıtlığı',
    'Ultraconservatism': 'Aşırı muhafazakârlık',
    'Right-libertarianism': 'Sağ liberteryenizm',
    'Classical liberalism': 'Klasik liberalizm',
    'Gaullism': 'Gaullizm',
    'Agrarianism (Nordic)': 'Tarımcılık (Nordik)',
    'Liberal Zionism': 'Liberal Siyonizm',
    'Green conservatism': 'Yeşil muhafazakârlık',
    'Christian right': 'Hristiyan sağ',
    'Trotskyism': 'Troçkizm',
    'Nationalism': 'Milliyetçilik',
    'Peronism': 'Peronizm',
    'British unionism': 'Britanya birlikçiliği',
    'National liberalism': 'Ulusal liberalizm',
    'Conservatism (German)': 'Muhafazakârlık (Alman)',
    'Hungarian minority interests': 'Macar azınlık hakları',
    'Marxism': 'Marksizm',
    'Pirate politics': 'Korsan Parti',
    'Pensioners\' interests': 'Emekli çıkarları',
    'Russophilia': 'Rusofili',
    'Catalan independence': 'Katalan bağımsızlığı',
    'Republicanism': 'Cumhuriyetçilik',
    'Sovereigntism': 'Egemenlikçilik',
    'Social justice': 'Sosyal adalet',
    'Croatian nationalism': 'Hırvat milliyetçiliği',
    'Quebec nationalism': 'Quebec milliyetçiliği',
    'Environmentalism': 'Çevrecilik',
    'Turkish minority interests': 'Türk azınlık hakları',
    'Ecofeminism': 'Ekofeminizm',
    'Religious conservatism': 'Dini muhafazakârlık',
    'Zionism': 'Siyonizm',
    'Bosniak minority interests': 'Boşnak azınlık hakları',
    'Big tent': 'Büyük çadır',
    'Christian nationalism': 'Hristiyan milliyetçiliği',
    'Soft Euroscepticism': 'Yumuşak Avrupa şüpheciliği',
    'Economic nationalism': 'Ekonomik milliyetçilik',
    'Ethnic nationalism': 'Etnik milliyetçilik',
    'Localism': 'Yerelcilik',
    'Hard Euroscepticism': 'Sert Avrupa şüpheciliği',
    'Animal rights': 'Hayvan hakları',
    'Pan-Europeanism': 'Pan-Avrupacılık',
    'Liberalism (Estonian)': 'Liberalizm (Eston)',
    'Estonian nationalism': 'Eston milliyetçiliği',
    'Anti-austerity': 'Kemer sıkma karşıtlığı',
    'Liberal socialism': 'Liberal sosyalizm',
    'Direct democracy': 'Doğrudan demokrasi',
    'Independent': 'Bağımsız',
    'Alberta separatism': 'Alberta ayrılıkçılığı',
    'Conservatism (Canadian)': 'Muhafazakârlık (Kanada)',
    'Canadian federalism': 'Kanada federalizmi',
    'Quebec sovereigntism': 'Quebec egemenlikçiliği',
    'Anti-establishment': 'Düzen karşıtlığı',
    'Kirchnerism': 'Kirchnerizm',
    'Federal Peronism': 'Federal Peronizm',
    'Bulgarian nationalism': 'Bulgar milliyetçiliği',
    'Liberalism (Bulgarian)': 'Liberalizm (Bulgar)',
    'Green liberalism': 'Yeşil liberalizm',
    'Feminism': 'Feminizm',
    'Liberalism (Swedish)': 'Liberalizm (İsveç)',
    'Conservatism (Swedish)': 'Muhafazakârlık (İsveç)',
    'Conservatism (Israeli)': 'Muhafazakârlık (İsrail)',
    'Religious Zionism': 'Dini Siyonizm',
    'Kahanism': 'Kahanizm',
    'Anti-Arab racism': 'Arap karşıtı ırkçılık',
    'Liberalism (Israeli)': 'Liberalizm (İsrail)',
    'Haredi Judaism': 'Haredi Yahudiliği',
    'Revisionist Zionism': 'Revizyonist Siyonizm',
    'Islamism': 'İslamcılık',
    'Arab minority interests': 'Arap azınlık hakları',
    'Arab nationalism': 'Arap milliyetçiliği',
    'Secularism': 'Laiklik',
    'Monarchism': 'Monarşizm',
    'Bosniak nationalism': 'Boşnak milliyetçiliği',
    'Serbian nationalism': 'Sırp milliyetçiliği',
    'Albanian minority interests': 'Arnavut azınlık hakları',
    'Liberalism (Latvian)': 'Liberalizm (Leton)',
    'Civic nationalism': 'Sivil milliyetçilik',
    'Antiglobalism': 'Küreselleşme karşıtlığı',
    'Anti-immigration': 'Göç karşıtlığı',
    'Protectionism': 'Korumacılık',
    'Russian nationalism': 'Rus milliyetçiliği',
    'Brazilian nationalism': 'Brezilya milliyetçiliği',
    'Anti-environmentalism': 'Çevre karşıtlığı',
    'Paternalistic conservatism': 'Paternalist muhafazakârlık',
    'Polish nationalism': 'Polonya milliyetçiliği',
    'Sanationism': 'Sanasyonizm',
    'Anti-communism': 'Komünizm karşıtlığı',
    'Fortuynism': 'Fortuynizm',
    'Minority interests': 'Azınlık hakları',
    'Theocracy': 'Teokrasi',
    'Animal welfare': 'Hayvan refahı',
    'European federalism': 'Avrupa federalizmi',
    'Hungarian nationalism': 'Macar milliyetçiliği',
    'Left-wing euroscepticism': 'Sol Avrupa şüpheciliği',
    'Ruralism': 'Kırsalcılık',
    'Liberalism (German)': 'Liberalizm (Alman)',
    'Danish minority interests': 'Danimarka azınlık hakları',
    'Basque independence': 'Bask bağımsızlığı',
    'Abertzale left': 'Abertzale solu',
    'Basque nationalism': 'Bask milliyetçiliği',
    'Factions:': 'Fraksiyonlar:',
    'Galician nationalism': 'Galiçya milliyetçiliği',
    'Canarian nationalism': 'Kanarya milliyetçiliği',
    'Navarrese regionalism': 'Navarra bölgeselciliği',
    'Anticapitalism': 'Kapitalizm karşıtlığı',
    'Spanish nationalism': 'İspanyol milliyetçiliği',
    'Anti-Spanish sentiment': 'İspanya karşıtlığı',
    'Marxism-Leninism': 'Marksizm-Leninizm',
    'Syndicalism': 'Sendikalizm',
    'Market socialism': 'Piyasa sosyalizmi',
    'Post-capitalism': 'Post-kapitalizm',
    'Post-fascism': 'Post-faşizm',
    'Federalism': 'Federalizm',
    'Radicalism': 'Radikalizm',
    'Liberalism (Italy)': 'Liberalizm (İtalya)',
    'Liberalism (Italian)': 'Liberalizm (İtalyan)',
    'Japanese nationalism': 'Japon milliyetçiliği',
    'Buddhist democracy': 'Budist demokrasi',
    'Centrist reformism': 'Merkez reformizm',
    'Universal basic income': 'Evrensel temel gelir',
    'Istrian regionalism': 'İstria bölgeselciliği',
    'Anti-lockdown': 'Kapanma karşıtlığı',
    'Fiscal conservatism': 'Mali muhafazakârlık',
    'Progressive conservatism': 'İlerici muhafazakârlık',
    'Red Toryism': 'Kırmızı Toryizm',
    'Independents and minor parties': 'Bağımsızlar ve küçük partiler',
    'Quebec federalism (Autonomism)': 'Quebec federalizmi (Otonomizm)',
    'Illiberalism': 'Liberalizm karşıtlığı',
    'Authoritarianism': 'Otoriterizm',
    'Hungarian irredentism': 'Macar irredantizmi',
    'Political satire': 'Siyasi hiciv',
    'Left-wing Peronism': 'Sol Peronizm',
    'Socialism of the left': 'Solun sosyalizmi',
    'Third Way': 'Üçüncü yol',
    'Polish minority interest': 'Polonya azınlık hakları',
    'Lithuanian nationalism': 'Litvanya milliyetçiliği',
    'Lithuanian diaspora interests': 'Litvanya diasporası çıkarları',
    'Liberalism (Moldovan)': 'Liberalizm (Moldovalı)',
    'Marxism–Leninism': 'Marksizm-Leninizm',
    'Moldovenism': 'Moldovenizm',
    'Moldovan–Romanian unionism': 'Moldova-Romanya birlikçiliği',
    'Liberalism (Romanian)': 'Liberalizm (Romen)',
    'Romanian ultranationalism': 'Romen aşırı milliyetçiliği',
    'Romanian nationalism': 'Romen milliyetçiliği',
    'National minority interests': 'Ulusal azınlık hakları',
    'Popular socialism': 'Halkçı sosyalizm',
    'Swedish minority interests': 'İsveç azınlık hakları',
    'Liberalism (Norwegian)': 'Liberalizm (Norveç)',
    'Liberalism (Portuguese)': 'Liberalizm (Portekiz)',
    'Libertarian socialism': 'Liberteryen sosyalizm',
    'Scottish nationalism': 'İskoç milliyetçiliği',
    'Scottish independence': 'İskoç bağımsızlığı',
    'Welsh nationalism': 'Galler milliyetçiliği',
    'Welsh independence': 'Galler bağımsızlığı',
    'Irish republicanism': 'İrlanda cumhuriyetçiliği',
    'British nationalism': 'Britanya milliyetçiliği',
    'Ulster loyalism': 'Ulster sadakati',
    'Irish reunification': 'İrlanda birleşmesi',
    'Irish nationalism': 'İrlanda milliyetçiliği',
    'Nonsectarianism': 'Mezhep karşıtlığı',
    'Conservatism (British)': 'Muhafazakârlık (Britanya)',
    'Māori rights': 'Māori hakları',
    'Tino rangatiratanga': 'Tino rangatiratanga',
    'Radical centrism': 'Radikal merkezcilik',
    'Reformism': 'Reformizm',
    'Kemalism': 'Kemalizm',
    'Turkish nationalism': 'Türk milliyetçiliği',
    'Kurdish nationalism': 'Kürt milliyetçiliği',
    'Conservative democracy': 'Muhafazakâr demokrasi',
    'Liberalism (Canadian)': 'Liberalizm (Kanada)',
};
function ideologyTr(str){
  if(LANG!=='tr'||!str) return str;
  return String(str).split(',').map(s=>{
    const k=s.trim();
    return IDEOLOGY_TR[k]||k;
  }).filter(Boolean).join(', ');
}

let T={};
function setLang(){
  T={
    tabs:{polls:t('POLLS','ANKETLER'),forecast:t('FORECAST','TAHMİN'),prediction:t('PREDICTION','TAHMİNİNİZ'),history:t('HISTORY','GEÇMİŞ'),live:t('LIVE','CANLI'),methodology:t('METHODOLOGY','YÖNTEM')},
    main:t('MAIN','ANA'),
    country:t('COUNTRY','ÜLKE'), filters:t('FILTERS','FİLTRELER'), timeRange:t('TIME RANGE','ZAMAN ARALIĞI'),
    pollster:t('POLLSTER','ANKETÇİ'), allPollsters:t('All pollsters','Tüm anketler'),
    last7:t('Last 7 days','Son 7 gün'),last14:t('Last 14 days','Son 14 gün'),last30:t('Last 30 days','Son 30 gün'),
    last60:t('Last 60 days','Son 60 gün'),last90:t('Last 90 days','Son 90 gün'),allPolls:t('All polls','Tüm anketler'),
    info:t('INFO','BİLGİ'), seats:t('seats','sandalye'), threshold:t('threshold','baraj'),
    pollAvg:t('NATIONAL POLL AVERAGE','ULUSAL ANKET ORTALAMASI'), trend:t('POLL TREND','ANKET TRENDİ'),
    seatProjection:t('SEAT PROJECTION','SANDALYE TAHMİNİ'), individualPolls:t('INDIVIDUAL POLLS','BİREYSEL ANKETLER'),
    constituencySeats:t('CONSTITUENCY SEATS','BÖLGE SANDALYELERİ'), districtMap:t('DISTRICT MAP','BÖLGE HARİTASI'),
    history:t('HISTORY','GEÇMİŞ'),
    projection:t('PROJECTION','TAHMİN'), result:t('RESULT','SONUÇ'), map:t('MAP','HARİTA'), blocs:t('BLOCS','BLOKLAR'),
    liveVs:t('LIVE vs VALU vs FORECAST','CANLI · ÇIKIŞ ANKETİ · TAHMİN'),
    seatsLive:t('SEATS (LIVE)','SANDALYELER (CANLI)'),
    liveMap:t('VALKRETS LIVE MAP','CANLI BÖLGE HARİTASI'),
    counted:t('districts counted','bölge sayıldı'), turnout:t('turnout','katılım'), updated:t('updated','güncellendi'),
    swing:t('vs 2022','2022 farkı'),
    ifHeldToday:t('IF THE ELECTION WERE HELD TODAY','SEÇİM BUGÜN OLSAYDI'),
    probabilities:t('PROBABILITIES','OLASILIKLAR'), majority:t('MAJORITY','ÇOĞUNLUK'),
    largestParty:t('LARGEST PARTY','EN BÜYÜK PARTİ'), voteShare:t('VOTE SHARE','OY ORANI'),
    seatDistribution:t('SEAT DISTRIBUTION','SANDALYE DAĞILIMI'),
    election:t('ELECTION','SEÇİMİ'),
    pollAverage:t('Poll Average','Anket Ortalaması'),
    twoRound:t('two-round presidential','iki turlu başkanlık seçimi'),
    coloredBy:t('colored by','renklendirme:'),
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
    else if(txt==='US MIDTERMS'||txt==='ABD ARA SEÇİMLERİ') a.textContent=t('US MIDTERMS','ABD ARA SEÇİMLERİ');
    else if(txt==='POLL IMAGE'||txt==='ANKET GÖRSELİ') a.textContent=t('POLL IMAGE','ANKET GÖRSELİ');
  });
}
function toggleLang(){
  LANG=(LANG==='tr')?'en':'tr';
  try{localStorage.setItem('600_lang',LANG)}catch(e){}
  setCountry(COUNTRY);
  COUNTRY_NAME=cName(COUNTRY);
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
  else if(tabId==='prediction') renderPrediction(pane);
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
const partyCode=pid=>pid==='other'?t('Other','Diğer'):((PARTY_META[pid]&&PARTY_META[pid].code)?PARTY_META[pid].code:pid);
// chamber-specific display names (Spain Senate: the PSOE-led list runs as SDP)
const partyLabel=(pid,conf)=>((conf&&conf.partyNames&&conf.partyNames[pid])||partyCode(pid));
// chamber-scoped color/logo overrides, same pattern as partyNames
// (Spain Senate: SDP displays as one orange-red list with its own logo)
const partyColor=(pid,conf)=>((conf&&conf.partyColors&&conf.partyColors[pid])||(PARTY_META[pid]?PARTY_META[pid].color:'#888'));
const partyLogo=(pid,conf)=>((conf&&conf.partyLogos&&conf.partyLogos[pid])||PARTY_LOGOS[pid]||null);

// Label for the sub-national units (MAP_ONLY countries can override; default "federative units")
const unitLabel=()=>{
  const c=COUNTRIES[COUNTRY];
  if(c&&c.unitLabel) return c.unitLabel[LANG]||c.unitLabel.en||c.unitLabel;
  return t('federative units','federal birim');
};
const methodName=()=>{
  if(SEAT_METHOD==='dhondt') return "D'Hondt";
  if(SEAT_METHOD==='hare_niemeyer') return 'Hare/Niemeyer';
  if(SEAT_METHOD==='imperiali_hb') return 'Imperiali + Hagenbach-Bischoff';
  if(SEAT_METHOD==='sainte_lague_standard') return 'Sainte-Laguë/Schepers';
  if(SEAT_METHOD==='fptp') return 'first-past-the-post';
  return 'modified Sainte-Laguë';
};
const methodNameShort=()=>{
  if(SEAT_METHOD==='dhondt') return "D'Hondt";
  if(SEAT_METHOD==='hare_niemeyer') return 'Hare/Niemeyer';
  if(SEAT_METHOD==='imperiali_hb') return 'Imperiali/H-B';
  if(SEAT_METHOD==='fptp') return 'FPTP';
  return 'Sainte-Laguë';
};
function methodSentence(){
  const conf=MAP_CONF()||{};
  const stab=(COUNTRIES[COUNTRY]||{}).stabilicum;
  if(stab){
    return `the <strong>Stabilicum</strong> proportional system (D'Hondt, ${THRESHOLD}% list / ${stab.coalitionThreshold}% coalition thresholds with best-loser recovery), plus a <strong>fixed ${stab.bonus}-seat majority bonus</strong> for the list or coalition that tops the poll with at least ${stab.minBonus}% of the valid vote (capped at ${stab.cap} seats; pure proportional below ${stab.minBonus}%)`;
  }
  if(conf.mixedFptp||((COUNTRIES[COUNTRY]||{}).mixedFptp)){
    const nf=Object.values(conf.fptpSeats||{}).reduce((a,b)=>a+b,0);
    return `the <strong>Rosatellum</strong> mixed system: ${nf} seats by <strong>first-past-the-post</strong> in single-member districts (each college goes to the coalition leading there) plus ${SEATS_TOTAL-nf} seats from a <strong>national proportional pool</strong> (D'Hondt, 3% threshold)`;
  }
  if(conf.winnerDistricts){
    const nW=Object.values(conf.winnerDistricts).reduce((a,b)=>a+b,0);
    const nD=Object.keys(conf.winnerDistricts).length;
    const twoRound=!!(COUNTRIES[COUNTRY]||{}).districtRunoff;
    if(conf.prDistricts){
      const nB=Object.keys(conf.prDistricts).length;
      const prS=Object.values(conf.prDistricts).reduce((a,b)=>a+b,0);
      return `${nW} seats by <strong>first-past-the-post</strong> in ${nD} single-member constituencies (projected by plurality from the ${(LAST_ELECTION.date||'').slice(0,4)} top-two baselines), plus ${prS} seats by <strong>D'Hondt</strong> in ${nB} regional proportional blocs`;
    }
    const prM=SEAT_METHOD==='hare_niemeyer'
      ?'Hare/Niemeyer (largest remainder)':methodName();
    return `${nW} seats by <strong>${twoRound?'two-round majority':'first-past-the-post'}</strong> in ${nD} single-member constituencies${twoRound?' (projected by first-round plurality)':''}, plus ${SEATS_TOTAL-nW} seats by national <strong>${prM}</strong>${THRESHOLD>0?` with a ${THRESHOLD}% threshold`:''}`;
  }
  const nD=conf.seatDistricts?Object.keys(conf.seatDistricts).length:0;
  let s;
  if(SEAT_METHOD==='fptp') s=`<strong>first-past-the-post</strong> in ${conf.districts?Object.keys(conf.districts).length:''} single-member ridings`;
  else if(SEAT_METHOD==='dhondt') s=nD?`the <strong>D'Hondt</strong> method in ${nD} multi-member constituencies`:"the <strong>D'Hondt</strong> method in a single national district";
  else if(SEAT_METHOD==='hare_niemeyer') s="the <strong>Hare/Niemeyer</strong> method (largest remainder, Hare quota = votes ÷ seats) in a single national district";
  else if(SEAT_METHOD==='imperiali_hb') s="the <strong>Imperiali quota</strong> (votes ÷ (seats+2)) in each of the 14 regions, then a <strong>national second scrutiny</strong> by Hagenbach-Bischoff (remainder votes ÷ (unfilled seats+1))";
  else if(SEAT_METHOD==='sainte_lague_standard') s="the <strong>Sainte-Laguë/Schepers</strong> method (divisors 1, 3, 5, …) in a single national district";
  else if((COUNTRIES[COUNTRY]||{}).levelingSeats) s=`<strong>modified Sainte-Laguë</strong> (first divisor 1.4, then 3, 5, …) in the ${nD} constituencies (no threshold: parties below ${THRESHOLD}% still win district seats), plus ${(COUNTRIES[COUNTRY]||{}).levelingSeats} <strong>leveling seats</strong> by quotient votes ÷ (seats+1) among the parties at or above ${THRESHOLD}%`;
  else s="<strong>modified Sainte-Laguë</strong> (divisor 1.2)";
  const b=(MAP_CONF()||{}).bonus||((COUNTRIES[COUNTRY]||{}).bonus);
  if(b) s+=`, plus a <strong>sliding majority bonus</strong> (${b.minSeats} seats at ${b.min}%, +1 per ${b.step}pp, up to ${b.maxSeats} seats)`;
  return s;
}

/* ---------- tab switching ---------- */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.tab-trigger');
  if(!btn) return;
  switchTab(btn);
});
// ARIA tabs: arrow keys move between tab triggers (left/right), Home/End.
function switchTab(btn){
  if(!btn) return;
  document.querySelectorAll('.tab-trigger').forEach(b=>b.dataset.active='false');
  btn.dataset.active='true';
  const tabId=btn.dataset.tab;
  document.querySelectorAll('.tab-pane').forEach(p=>{p.style.display='none';p.classList.remove('active');p.setAttribute('aria-hidden','true')});
  const pane=$('pane-'+tabId);
  if(pane){pane.style.display='block';pane.classList.add('active');pane.setAttribute('aria-hidden','false');if(tabId==='forecast'){renderForecast(pane);pane.dataset.loaded='1'}if(tabId==='prediction'){renderPrediction(pane);pane.dataset.loaded='1'}if(tabId==='live'&&!pane.dataset.loaded){renderLive(pane);pane.dataset.loaded='1'}if(tabId==='history'&&!pane.dataset.loaded){renderHistory(pane);pane.dataset.loaded='1'}if(tabId==='methodology'&&!pane.dataset.loaded){renderMethodology(pane);pane.dataset.loaded='1'}}
  if(typeof updateUrl==='function') updateUrl();
}
document.addEventListener('keydown',e=>{
  if(!e.target.closest||!e.target.closest('.tab-trigger')) return;
  const tabs=Array.from(document.querySelectorAll('.tab-trigger'));
  const idx=tabs.indexOf(e.target);
  if(idx<0) return;
  let next=null;
  if(e.key==='ArrowRight') next=tabs[(idx+1)%tabs.length];
  else if(e.key==='ArrowLeft') next=tabs[(idx-1+tabs.length)%tabs.length];
  else if(e.key==='Home') next=tabs[0];
  else if(e.key==='End') next=tabs[tabs.length-1];
  if(next){e.preventDefault();next.focus();switchTab(next);}
});

/* ---------- load constituency data ---------- */
let CONSTITUENCIES=null;
let CONSTITUENCIES_SENATE=null;

async function loadConstituencies(){
  CONSTITUENCIES=null;
  CONSTITUENCIES_SENATE=null;
  if(!HAS_CONSTITUENCIES) return;
  try{
    const base=dataBase();
    const resp=await fetch(base+'data/'+COUNTRY+'/constituencies.json');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    CONSTITUENCIES=await resp.json();
    if((COUNTRIES[COUNTRY]||{}).senate){
      try{
        const r2=await fetch(base+'data/'+COUNTRY+'/senate_constituencies.json');
        if(r2.ok) CONSTITUENCIES_SENATE=await r2.json();
      }catch(e){
        console.error('Failed to load senate constituencies:',e);
      }
    }
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
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD||(CONSTITUENCY_RULE!=='fptp'&&pctShifted[p]>=12));
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
  // pre-pass: a party holding no seat anywhere (and none last time either)
  // gets no column - a full column of dashes is noise
  const seatByC=new Map();
  for(const c of sorted){
    const sa=allocateConstituencySeats(votes,c);
    seatByC.set(c,sa);
    PARTY_ORDER.forEach(p=>{totalSeatsAll[p]+=sa[p]||0});
  }
  const cols=PARTY_ORDER.filter(p=>totalSeatsAll[p]>0||(lastTotals&&(lastTotals[p]||0)>0));
  for(const c of sorted){
    const sa=seatByC.get(c);
    let seatCells='';
    for(const p of cols){
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
  for(const p of cols){
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    totalCells+=`<td class="num c" style="font-weight:900;color:${color}">${totalSeatsAll[p]}</td>`;
  }
  const constSeats=cList.reduce((s,c)=>s+c.seats,0);
  rows+=`<tr style="border-top:3px solid var(--c-edge);font-weight:900">
    <td>TOTAL</td><td class="num c">${constSeats}</td>${totalCells}</tr>`;
  if(lastTotals){
    let deltaCells='';
    for(const p of cols){
      const d=totalSeatsAll[p]-(lastTotals[p]||0);
      const color=d>0?'#0B9E17':d<0?'var(--c-accent)':'var(--c-text-muted)';
      deltaCells+=`<td class="num c" style="color:${color};font-weight:900">${d>0?'+'+d:d}</td>`;
    }
    rows+=`<tr class="delta-row">
      <td>Δ vs ${LAST_ELECTION.date.slice(0,4)}</td><td></td>${deltaCells}</tr>`;
  }

  let head='';
  cols.forEach(p=>{head+=`<th class="c">${partyCode(p)}</th>`});
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${title}</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>Constituency</th><th class="c">Seats</th>${head}
    </tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      ${CONSTITUENCY_RULE==='fptp'?'First-past-the-post (Erststimme winner)':'Per-constituency Sainte-Laguë (4% / 12% rule)'}${note?' · '+note:''}
    </div></div>`;
}

function renderConstituencyTable(avg){
  if(!CONSTITUENCIES||CONSTITUENCIES.length===0) return '';
  const votes=PARL_MODE==='proj'?avg:LAST_ELECTION.results;
  const by2022=PARL_MODE==='2022';
  const baseY=LAST_ELECTION.date.slice(0,4);
  return constituencyTableHtml(votes,{
    title:`${T.constituencySeats} (${by2022?baseY+' '+T.result:T.projection})`,
    showDelta:!by2022,
    note:by2022?`${baseY} actual vote shares`:`${baseY} results shifted by (poll avg − ${baseY} national)`
  });
}

/* ---------- load data ---------- */
let POLLS=[], FILTERED_POLLS=[], META={};
let SCRAPED_AT=null;   // ISO timestamp of the last poll scrape (data health)
let ARCHIVE_MODE=false; // replicate the frozen archive snapshot's weighting math
let REGIONAL_AVG={};    // sub-national polling averages (region -> party -> %)

let EVENTS=[];
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
    POLLS=(pollsJson.polls||[]).filter(p=>!EXCLUDE_POLLSTERS.includes(p.pollster));
    SCRAPED_AT=pollsJson.scraped_at||null;
    REGIONAL_AVG=pollsJson.regional||{};
    META=metaJson;
    // annotation layer (elections, party splits) for the trend charts
    try{
      const er=await fetch(base+'data/events.json');
      EVENTS=er.ok?((await er.json())[COUNTRY]||[]):[];
    }catch(e){ EVENTS=[]; }
    // big country maps live in their own JSON (config.js stays small);
    // countries with small maps keep the data inline and skip this fetch
    try{
      const cc=COUNTRIES[COUNTRY];
      if(cc&&(!cc.map||!Object.keys(cc.map).length)){
        const r=await fetch(base+'data/'+COUNTRY+'/geo.json');
        if(r.ok){
          const gj=await r.json();
          if(gj.map) cc.map=gj.map;
          if(gj.map2) cc.map2=gj.map2;
        }
      }
    }catch(e){}
    // end of loadData body marker
  }catch(e){
    console.error('Failed to load data:',e);
  }
}

// Data-health label: how long ago the poll data was scraped, with a freshness
// color (green <12h, amber <48h, red older).
function dataHealthLabel(){
  if(!SCRAPED_AT) return {txt:t('scrape time unknown','güncelleme zamanı bilinmiyor'),col:'var(--c-text-muted)'};
  const ageH=(Date.now()-new Date(SCRAPED_AT).getTime())/3.6e6;
  const fmt=ageH<1?Math.round(ageH*60)+t('m','dk'):Math.round(ageH)+t('h','sa');
  const col=ageH<12?'#0B9E17':(ageH<48?'#E0A800':'var(--c-accent)');
  return {txt:t('polls scraped','anketler güncellendi')+' '+fmt+' '+t('ago','önce'),col};
}

/* ---------- average calculator ---------- */
function pollsterWeight(pollster){
  const mae=POLLSTER_MAE[pollster];
  if(!mae) return 1;
  // Archive-mode uses the snapshot's MAE key (overall) exactly as frozen
  const key=ARCHIVE_MODE?'overall':MAE_KEY;
  const v=mae[key]||mae.overall;
  if(!v) return 1;
  // Smooth 1/(1+MAE) weight: dampens over-concentration on the single best
  // pollster of one past election (Sweden 2026: Sifo was best in 2022 but
  // only mediocre in 2026, and the sharp inverse weight magnified its miss).
  return MAE_SMOOTH?1/(1+v):1/v;
}

// Exponential time decay: polls halve in weight every RECENCY_HALF_LIFE days
function recencyWeight(dateStr){
  const ageDays=(Date.now()-new Date(dateStr).getTime())/(1000*60*60*24);
  if(ageDays<=0) return 1;
  return Math.pow(0.5, ageDays/RECENCY_HALF_LIFE);
}

// Automatic house effects: a pollster that sits consistently off the panel
// consensus (house style, herding, partisan sponsorship) is pulled toward it.
// The deviation is the pollster's n-weighted mean distance from the panel mean
// per party, shrunk (HOUSE_SHRINK) and capped (HOUSE_CAP); pollsters with
// fewer than HOUSE_MIN_POLLS polls are ignored, and a backtested config
// pollsterBias takes precedence when present. Computed once per country load
// from the full poll set (not the filtered window) so it is stable.
const HOUSE_SHRINK=0.5;
const HOUSE_CAP=2.5;
const HOUSE_MIN_POLLS=2;
let HOUSE_CACHE=null, HOUSE_CACHE_KEY=null;
function houseEffects(){
  if(ARCHIVE_MODE) return null;
  const polls=POLLS;
  if(!polls||!polls.length) return null;
  if(HOUSE_CACHE_KEY===polls) return HOUSE_CACHE;
  HOUSE_CACHE_KEY=polls;
  const cons={};
  for(const p of PARTY_ORDER){
    let ws=0,wt=0;
    for(const poll of polls){
      const v=poll.votes[p];
      if(v===undefined) continue;
      const w=Math.min(1500,poll.n||1000)*recencyWeight(poll.date);
      ws+=w*v; wt+=w;
    }
    cons[p]=wt>0?ws/wt:null;
  }
  const acc={};
  for(const poll of polls){
    const a=acc[poll.pollster]||(acc[poll.pollster]={polls:0,ws:{},wt:{}});
    a.polls++;
    for(const p of PARTY_ORDER){
      const v=poll.votes[p];
      if(v===undefined||cons[p]===null) continue;
      const w=Math.min(1500,poll.n||1000);
      a.ws[p]=(a.ws[p]||0)+w*(v-cons[p]);
      a.wt[p]=(a.wt[p]||0)+w;
    }
  }
  const out={};
  for(const name in acc){
    const a=acc[name];
    if(a.polls<HOUSE_MIN_POLLS) continue;
    const dev={};
    for(const p of PARTY_ORDER){
      if(!a.wt[p]) continue;
      const d=Math.max(-HOUSE_CAP,Math.min(HOUSE_CAP,a.ws[p]/a.wt[p]))*HOUSE_SHRINK;
      if(Math.abs(d)>0.05) dev[p]=d;
    }
    if(Object.keys(dev).length) out[name]=dev;
  }
  HOUSE_CACHE=out;
  return out;
}

function weightedAverage(polls, party, noBias){
  let wSum=0, wTotal=0;
  for(const p of polls){
    if(p.votes[party]===undefined) continue;
    // Archive-mode replicates the frozen snapshot's math (no n-cap, no bias)
    // so the live FCST column matches the archive page exactly.
    const n=ARCHIVE_MODE?(p.n||1000):Math.min(1500, p.n||1000);
    const pw=pollsterWeight(p.pollster);
    const rw=recencyWeight(p.date);
    const w=n*pw*rw;
    // seat-based polls report seats only for above-threshold parties;
    // renormalize each poll to sum to SEATS_TOTAL so the average is on a
    // common scale (missing below-threshold seats are treated as 'Others')
    let v=p.votes[party];
    // signed-bias correction: bias = poll − actual (from per-election backtest);
    // subtract it so pollster's systematic error is removed. BIAS_SHRINK (0..1)
    // damps this: a single-election bias can flip sign across elections (Sweden
    // 2022 said pollsters understated S, 2026 every pollster overstated it), so
    // full-strength correction can actively hurt — shrink toward 0.
    if(!noBias && !ARCHIVE_MODE && BIAS_KEY && POLLSTER_BIAS[p.pollster] && POLLSTER_BIAS[p.pollster][party]!==undefined){
      v-=BIAS_SHRINK*POLLSTER_BIAS[p.pollster][party];
    }
    // automatic house effect (consensus deviation), unless this pollster has a
    // backtested config bias (that one is better and would double-correct)
    if(!noBias && !ARCHIVE_MODE &&
       !(BIAS_KEY && POLLSTER_BIAS[p.pollster] && POLLSTER_BIAS[p.pollster][party]!==undefined)){
      const he=houseEffects();
      const hd=he&&he[p.pollster];
      if(hd&&hd[party]!==undefined) v-=hd[party];
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
// The slope is damped as the election approaches (return-to-mean): a full
// linear projection overestimates late momentum, so the projected move is
// multiplied by horizon/(horizon + DAMP_DAYS) — near the election the
// projection converges back toward today's value.
// A trend must pass a quality gate before it is used at all: at least
// gatePolls recent polls from gateHouses different pollsters, and the slope
// must point the same way in the short (fitDays) and long (gateDays) windows.
// A slope that flips sign between windows is publication noise, not momentum
// (BC 2026: +1.3pp/day on the 14-day fit, negative on the 30-day fit), so the
// gate returns null and the projection falls back to the poll average.
function trendSlopeFit(polls, party, days, now){
  const cutoff=now-days*1000*60*60*24;
  const recent=polls.filter(p=>p.votes[party]!==undefined&&new Date(p.date).getTime()>=cutoff);
  if(!recent.length) return null;
  let sw=0,swt=0,swtt=0,swv=0,swtv=0;
  for(const p of recent){
    const t=(now-new Date(p.date).getTime())/(1000*60*60*24); // days ago
    let w=Math.pow(0.5,t/RECENCY_HALF_LIFE);
    // Weight by the same pollster accuracy + sample cap as the average, so a
    // low-quality outlier (e.g. a partisan internal poll down-weighted to a
    // high MAE) cannot hijack the slope. Berlin 2026: the BSW-internal poll
    // (CDU 13.5 vs ~20 elsewhere) entered the trend at full strength and its
    // single point flipped the CDU projection upward.
    w*=pollsterWeight(p.pollster);
    w*=Math.min(1500, p.n||1000);
    sw+=w; swt+=w*t; swtt+=w*t*t; swv+=w*(p.votes[party]||0); swtv+=w*t*(p.votes[party]||0);
  }
  const den=sw*swtt-swt*swt;
  if(Math.abs(den)<1e-9) return null;
  return {slope:(sw*swtv-swt*swv)/den, anchor:swv/sw, n:recent.length,
          houses:new Set(recent.map(p=>p.pollster)).size};
}

function trendExtrapolation(polls, party){
  if(!TREND_CONF) return null;
  const election=new Date(TREND_CONF.electionDate).getTime();
  const now=Date.now();
  const horizon=(election-now)/(1000*60*60*24);  // days until election
  if(!(horizon>0)||horizon>TREND_CONF.windowDays) return null;
  // fitDays = how many days of polls the slope regression uses. A short window
  // (≈14d) catches sudden late trends; a long one (e.g. 120d) dilutes them with
  // months of stale data (Sweden 2026: L surged ~2→5pp in the final week but the
  // 4-month-fit model kept it near the 4% threshold). Defaults to windowDays.
  const fitDays=TREND_CONF.fitDays||TREND_CONF.windowDays;
  const short=trendSlopeFit(polls, party, fitDays, now);
  if(!short||short.n<(TREND_CONF.minPolls||3)) return null;
  // quality gate (see header comment)
  const gatePolls=TREND_CONF.gatePolls||4;
  const gateHouses=TREND_CONF.gateHouses||3;
  const gateDays=Math.max(TREND_CONF.gateDays||30, fitDays);
  const eps=TREND_CONF.gateEps||0.02;   // pp/day treated as flat
  if(short.n<gatePolls||short.houses<gateHouses) return null;
  const long=trendSlopeFit(polls, party, gateDays, now);
  if(!long||long.n<gatePolls||long.houses<gateHouses) return null;
  const sgn=s=>Math.abs(s)<eps?0:(s>0?1:-1);
  if(sgn(short.slope)===0||sgn(short.slope)!==sgn(long.slope)) return null;
  // Anchor the projection at the recency-weighted mean of the fit-window
  // polls, not the regression intercept at t=0. With few polls clustered
  // near today the fitted line overshoots the newest data (BC 2026: polls
  // 7-11 days old, NDP 35-41, intercept 49) and the trend then extrapolated
  // the overshoot on top of the slope - a +10pp artifact. The mean is the
  // honest "today" value; only the slope is projected forward, and the
  // total move is capped at maxDaily per day of horizon.
  const dampDays=TREND_CONF.dampDays||7;  // slope-halving horizon
  const damp=horizon/(horizon+dampDays);  // 1 far out, -> 0 at election day
  const cap=TREND_CONF.maxDaily*horizon;
  const move=Math.max(-cap,Math.min(cap,-short.slope*horizon*damp));
  return {ext:Math.max(0,short.anchor+move), anchor:short.anchor};
}

// Projected trend values for every party, with the moves constrained to sum
// to ~zero: shares must sum to the modelled total, so independent per-party
// slopes could otherwise make every party rise at once. The gate runs per
// party on the raw slopes; afterwards the mean move of the surviving parties
// is subtracted, so only momentum relative to the field survives (a single
// surviving trend is centered to zero - relative momentum without
// counterparts is meaningless).
function trendProjections(polls){
  if(!TREND_CONF) return null;
  const parts={}, moves=[];
  for(const pid of PARTY_ORDER){
    const t=trendExtrapolation(polls, pid);
    if(!t) continue;
    parts[pid]={ext:t.ext, anchor:t.anchor, move:t.ext-t.anchor};
    moves.push(t.ext-t.anchor);
  }
  if(!moves.length) return null;
  const mean=moves.reduce((a,b)=>a+b,0)/moves.length;
  const res={};
  for(const pid in parts){
    res[pid]=Math.max(0,parts[pid].anchor+parts[pid].move-mean);
  }
  return res;
}

function computeAverages(polls, raw){
  const avg={};
  for(const pid of PARTY_ORDER){
    avg[pid]=weightedAverage(polls, pid, raw);
  }
  // "Other": the vote share not covered by the modelled parties. Publish
  // reports party values that rarely sum to 100 (e.g. ~91% for Berlin), so
  // the remainder must be kept as a real bucket — otherwise it leaks into
  // the modelled parties and inflates every share.
  const modelled=PARTY_ORDER.reduce((a,p)=>a+((avg[p]!=null&&!isNaN(avg[p]))?avg[p]:0),0);
  avg.other=Math.max(0,100-modelled);
  // last-election Dirichlet prior: pull the average toward the most recent
  // election outcome so a thin poll set cannot drift arbitrarily far
  if(!raw && PRIOR_ALPHA>0&&LAST_ELECTION.results){
    for(const pid of PARTY_ORDER){
      if(avg[pid]===null) continue;
      const prior=LAST_ELECTION.results[pid]!==undefined?LAST_ELECTION.results[pid]:0;
      avg[pid]=(1-PRIOR_ALPHA)*avg[pid]+PRIOR_ALPHA*prior;
    }
  }
  // linear-trend extrapolation toward the election date (moves constrained to
  // sum to ~zero across the parties, see trendProjections)
  if(!raw && TREND_CONF){
    const tp=trendProjections(polls);
    if(tp){
      for(const pid of PARTY_ORDER){
        const ext=tp[pid];
        if(ext!==undefined&&avg[pid]!==null){
          avg[pid]=(1-TREND_CONF.blend)*avg[pid]+TREND_CONF.blend*ext;
        }
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
  // a 4-digit year ("2026" filter) is a calendar-year window, not days
  if(days>=1900&&days<=2100)
    return polls.filter(p=>(p.date||'').slice(0,4)===String(days));
  const cutoff=new Date();
  cutoff.setDate(cutoff.getDate()-days);
  return polls.filter(p=>new Date(p.date)>=cutoff);
}

// Momentum = recent-average minus baseline-average (in pp or seats), so a party
// that is suddenly surging (like L in Sweden 2026) shows it. Uses raw poll
// values so the arrow reflects the polls themselves, not the smoothed model.
function partyMomentum(polls, party, recentDays, baseDays){
  recentDays=recentDays||14; baseDays=baseDays||30;
  const now=Date.now();
  const recent=polls.filter(p=>p.votes[party]!==undefined&&now-new Date(p.date).getTime()<=recentDays*864e5);
  const base=polls.filter(p=>p.votes[party]!==undefined&&now-new Date(p.date).getTime()<=baseDays*864e5);
  const avg=a=>a.length?mean(a):null;
  const r=avg(recent.map(p=>p.votes[party]));
  const b=avg(base.map(p=>p.votes[party]));
  if(r===null||b===null) return null;
  return r-b;
}

// Same idea for the runoff pair: 14-day vs 30-day mean of the head-to-head
// shares (runoff polls carry the pair in p.runoff, not p.votes).
function runoffMomentum(roPolls, cand, recentDays, baseDays){
  recentDays=recentDays||14; baseDays=baseDays||30;
  const now=Date.now();
  const val=p=>p.runoff&&p.runoff[cand]!==undefined?p.runoff[cand]:null;
  const recent=roPolls.filter(p=>val(p)!==null&&now-new Date(p.date).getTime()<=recentDays*864e5).map(val);
  const base=roPolls.filter(p=>val(p)!==null&&now-new Date(p.date).getTime()<=baseDays*864e5).map(val);
  if(!recent.length||!base.length) return null;
  return mean(recent)-mean(base);
}


/* ---------- render country nav (Europe Elects-style flag card) ---------- */
/* ---------- calendar home + grouped country nav ---------- */
const NAV_REGIONS=[
  [t('Europe','Avrupa'),['austria','bg','bgpres','czechia','dk','estonia','fi','france','germany','greece','hr','hu','is','italy','latvia','lt','md','netherlands','no','poland','pt','ro','serbia','si','slovakia','spain','sweden','turkey','uk']],
  [t('Americas','Amerika'),['alberta','argentina','bc','brazil','canada','ontario','qc']],
  [t('Middle East & Asia-Pacific','Orta Doğu ve Asya-Pasifik'),['israel','jp','kr','nz']],
];
const METHOD_SHORT={fptp:'FPTP',dhondt:"D'Hondt",sainte_lague_standard:'Sainte-Lagu\u00eb',sainte_lague:'Sainte-Lagu\u00eb (mod.)',hare_niemeyer:'Hare/Niemeyer',imperiali_hb:'Imperiali'};
let SUMMARY=null;
function loadSummary(){
  if(SUMMARY) return Promise.resolve(SUMMARY);
  return fetch(dataBase()+'data/summary.json').then(r=>r.ok?r.json():null)
    .then(d=>{SUMMARY=d;return d}).catch(()=>null);
}
function todayStr(){ return new Date().toISOString().slice(0,10); }
function nextElection(id){
  const s=SUMMARY&&SUMMARY.countries&&SUMMARY.countries[id];
  if(!s) return null;
  const t=todayStr();
  if(s.election_date_runoff&&s.election_date_runoff>=t) return {date:s.election_date_runoff,runoff:true};
  if(s.election_date) return {date:s.election_date,runoff:false};
  return null;
}
function fmtCalDate(d){
  if(!d) return '';
  const parts=d.split('-');
  if(parts.length<3) return d;
  const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return parts[2]+' '+M[parseInt(parts[1],10)-1]+' '+parts[0];
}
function fmtShortDate(d){
  const full=fmtCalDate(d);
  return full.split(' ').slice(0,2).join(' ');
}
function plural(n,singular,pluralWord){ return n===1?singular:pluralWord; }
function applyNavFilter(){
  const nav=$('country-nav');
  if(!nav) return;
  const box=nav.querySelector('.cnav-search');
  const q=box?box.value.trim().toLowerCase():'';
  let visibleNav=0;
  nav.querySelectorAll('.cnav-item').forEach(b=>{
    const c=COUNTRIES[b.dataset.cnav]||{name:''};
    const hit=!q||c.name.toLowerCase().includes(q)||b.dataset.cnav.includes(q);
    b.style.display=hit?'':'none';
    if(hit) visibleNav++;
  });
  nav.querySelectorAll('.cnav-group').forEach(g=>{
    const any=Array.from(g.querySelectorAll('.cnav-item')).some(b=>b.style.display!=='none');
    g.style.display=any?'':'none';
  });
  let visibleCards=0;
  document.querySelectorAll('.cal-card').forEach(card=>{
    const c=COUNTRIES[card.dataset.cnav]||{name:''};
    const hit=!q||c.name.toLowerCase().includes(q)||card.dataset.cnav.includes(q);
    card.hidden=!hit;
    if(hit) visibleCards++;
  });
  document.querySelectorAll('.home-section').forEach(sec=>{
    sec.hidden=!sec.querySelector('.cal-card:not([hidden])');
  });
  const empty=$('home-no-results');
  if(empty){
    empty.hidden=!(q&&visibleCards===0);
    if(q) empty.textContent=`No elections match “${box.value.trim()}”.`;
  }
  const status=$('home-search-status');
  if(status) status.textContent=q?`${visibleCards} ${plural(visibleCards,'election','elections')} shown`:'';
  const nstatus=nav.querySelector('.cnav-status');
  if(nstatus) nstatus.textContent=q?`${visibleNav} ${plural(visibleNav,'country','countries')} shown`:'';
}
function renderCountryNav(){
  const nav=$('country-nav');
  if(!nav) return;
  if(!nav.querySelector('.cnav-search')){
    nav.innerHTML=`<button class="cnav-toggle" type="button" aria-expanded="false" aria-controls="cnav-groups">${t('Browse countries','Ülkeleri gözat')}<span></span></button>
      <input class="cnav-search" type="search" placeholder="${t('Search countries\u2026','Ülke ara\u2026')}" aria-label="${t('Search countries','Ülke ara')}">
      <div class="cnav-status" aria-live="polite"></div>
      <div class="cnav-groups" id="cnav-groups"></div>`;
    const toggle=nav.querySelector('.cnav-toggle');
    toggle.addEventListener('click',()=>{
      const open=!nav.classList.contains('open');
      nav.classList.toggle('open',open);
      toggle.setAttribute('aria-expanded',String(open));
      if(open) nav.querySelector('.cnav-search').focus();
    });
    const search=nav.querySelector('.cnav-search');
    search.addEventListener('input',applyNavFilter);
    search.addEventListener('keydown',e=>{
      if(e.key==='Escape'){ search.value=''; applyNavFilter(); search.focus(); }
    });
  }
  nav.setAttribute('role','navigation');
  nav.setAttribute('aria-label',t('Countries','Ülkeler'));
  const groups=nav.querySelector('.cnav-groups');
  const t0=todayStr();
  const sortKey=id=>{
    const ne=nextElection(id);
    if(!ne) return '3';
    if(ne.date>=t0) return '1'+ne.date;
    return '2'+String(99999999-parseInt(ne.date.replace(/-/g,''),10));
  };
  groups.innerHTML=NAV_REGIONS.map(([label,ids])=>{
    const vis=ids.filter(id=>COUNTRIES[id]&&!COUNTRIES[id].hidden)
      .sort((a,b)=>{const ka=sortKey(a),kb=sortKey(b);
        return ka!==kb?ka.localeCompare(kb):cName(a).localeCompare(cName(b));});
    if(!vis.length) return '';
    return `<div class="cnav-group"><div class="cnav-group-label">${label}</div><div class="cnav-row">`+
      vis.map(id=>{
        const c=COUNTRIES[id]; const active=id===COUNTRY;
        return `<button class="cnav-item${active?' active':''}" data-cnav="${id}" title="${cName(id)}" aria-pressed="${active}">
          <img src="${dataBase()}img/flags/${id}.svg" alt="" loading="lazy" width="22" height="16">
          <span class="cnav-name">${cName(id)}</span>
        </button>`;}).join('')+`</div></div>`;
  }).join('');
  const visibleCount=groups.querySelectorAll('.cnav-item').length;
  const countEl=nav.querySelector('.cnav-toggle span');
  if(countEl) countEl.textContent=visibleCount;
  groups.querySelectorAll('.cnav-item').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=btn.dataset.cnav;
      if(id!==COUNTRY&&window._600) window._600.setCountry(id);
    });
  });
  applyNavFilter();
}
function renderHome(){
  document.body.classList.add('home');
  const pane=$('pane-polls');
  if(!pane) return;
  pane.innerHTML=`<div class="home-hero">
    <div class="home-kicker">${t('GLOBAL ELECTION CALENDAR','K\u00dcRESEL SE\u00c7\u0130M TAKV\u0130M\u0130')}</div>
    <h1 class="home-title">${t('Every election 600 tracks','600\u2019\u00fcn takip etti\u011fi t\u00fcm se\u00e7imler')}</h1>
    <div class="home-sub" id="home-sub">${t('Loading the calendar\u2026','Takvim y\u00fckleniyor\u2026')}</div>
    <div class="home-search-status" id="home-search-status" aria-live="polite"></div>
  </div>
  <div id="home-body"></div>
  <div id="home-no-results" class="home-empty" hidden></div>
  <footer class="home-footer">
    <p>Polls from Wikipedia. Averages, seat models and simulations by <b>600</b>.</p>
    <button class="home-method" type="button">${t('How 600 works','600 nas\u0131l \u00e7al\u0131\u015f\u0131r')}</button>
  </footer>`;
  const method=pane.querySelector('.home-method');
  if(method) method.addEventListener('click',()=>{
    const btn=document.querySelector('.tab-trigger[data-tab="methodology"]');
    if(btn) switchTab(btn);
  });
  loadSummary().then(()=>renderHomeBody());
}
function renderHomeBody(){
  const body=$('home-body');
  if(!body) return;
  if(!SUMMARY||!SUMMARY.countries){ body.innerHTML='<div class="home-empty">The calendar could not load. Refresh to try again.</div>'; return; }
  const t0=todayStr();
  const entries=Object.entries(SUMMARY.countries)
    .filter(([id])=>COUNTRIES[id]&&!COUNTRIES[id].hidden);
  const upcoming=[],past=[],tbc=[];
  for(const [id,s] of entries){
    const ne=nextElection(id);
    if(!ne) tbc.push([id,s,ne]);
    else if(ne.date>=t0) upcoming.push([id,s,ne]);
    else past.push([id,s,ne]);
  }
  upcoming.sort((a,b)=>a[2].date.localeCompare(b[2].date));
  past.sort((a,b)=>b[2].date.localeCompare(a[2].date));
  tbc.sort((a,b)=>cName(a[0]).localeCompare(cName(b[0])));
  const weekEnd=new Date(t0+'T00:00:00Z');
  weekEnd.setUTCDate(weekEnd.getUTCDate()+7);
  const weekEndStr=weekEnd.toISOString().slice(0,10);
  const thisWeek=upcoming.filter(x=>x[2].date<=weekEndStr);
  const later=upcoming.filter(x=>x[2].date>weekEndStr);
  const sub=$('home-sub');
  if(sub) sub.innerHTML=`${upcoming.length} ${plural(upcoming.length,t('upcoming election','yakla\u015fan se\u00e7im'),t('upcoming elections','yakla\u015fan se\u00e7im'))} \u00b7 ${t('updated','g\u00fcncellendi')} ${fmtCalDate((SUMMARY.generated||'').slice(0,10))}`;
  const sec=(title,items,fn)=>items.length?`<div class="home-section">
      <div class="home-section-head">${title}<span>${items.length}</span></div>
      <div class="cal-grid">${items.map(fn).join('')}</div></div>`:'';
  body.innerHTML=
    sec(t('THIS WEEK','BU HAFTA'),thisWeek,x=>calCard(...x,'next'))+
    sec(t('LATER','DAHA SONRA'),later,x=>calCard(...x,'next'))+
    sec(t('RECENTLY HELD','SON YAPILANLAR'),past,x=>calCard(...x,'past'))+
    sec(t('DATE TO BE CONFIRMED','TAR\u0130H BELL\u0130 DE\u011e\u0130L'),tbc,x=>calCard(x[0],x[1],null,'tbc'));
  body.querySelectorAll('.cal-card').forEach(b=>{
    b.addEventListener('click',()=>{ if(window._600) window._600.setCountry(b.dataset.cnav); });
  });
  applyNavFilter();
}
function calCard(id,s,ne,mode){
  const c=COUNTRIES[id];
  const precise=ne&&ne.date&&ne.date.length>4;
  const days=precise?Math.round((new Date(ne.date+'T00:00:00')-new Date(todayStr()+'T00:00:00'))/86400000):null;
  const soon=mode==='next'&&days!==null&&days<=45;
  const dayWord=plural(Math.abs(days||0),t('day','g\u00fcn'),t('days','g\u00fcn'));
  const chip=precise?`<span class="cal-days${soon?' soon':''}">${mode==='past'
    ? t('held','yap\u0131ld\u0131')+' '+Math.abs(days)+' '+dayWord
    : (days===0?t('TODAY','BUG\u00dcN'):days+' '+dayWord)}</span>`:'';
  const dateTxt=ne?(fmtCalDate(ne.date)+(ne.runoff?` \u00b7 ${t('runoff','2. tur')}`:''))
    :(s.election_date||t('unscheduled','belirsiz'));
  const leader=s.leader?`<span class="cal-leader">
      <span class="cal-dot" style="background:${s.leader_color||'#888'}"></span>
      ${s.leader_logo?`<img src="${dataBase()}${s.leader_logo}" alt="" loading="lazy">`:''}
      <b>${s.leader_code||s.leader}</b> ${s.leader_pct!=null?(s.seat_based?s.leader_pct+' '+t('seats','sandalye'):s.leader_pct+'%'):''}
    </span>`:'';
  const won=mode==='past'&&s.last_winner_code?`<span class="cal-leader">
      <span class="cal-dot" style="background:${s.last_winner_color||'#888'}"></span>
      <b>${s.last_winner_code}</b> ${t('won','kazand\u0131')}</span>`:'';
  const seats=s.seats||c.seats;
  const unit=seats===1?t('seat','sandalye'):(c.mapOnly?t('regions','b\u00f6lge'):t('seats','sandalye'));
  const method=c.runoffOnly?t('runoff','2. tur'):(seats===1?t('Presidential','Ba\u015fkanl\u0131k'):(METHOD_SHORT[c.method]||''));
  const polls=s.poll_count?`${s.poll_count} ${plural(s.poll_count,t('poll','anket'),t('polls','anket'))}`:'';
  const fresh=s.latest_poll?`${polls} \u00b7 ${t('latest','en yeni')} ${fmtShortDate(s.latest_poll)}`:'';
  return `<button class="cal-card" data-cnav="${id}">
    <div class="cal-top">
      <img class="cal-flag" src="${dataBase()}img/flags/${id}.svg" alt="" loading="lazy">
      <span class="cal-name">${cName(id)}</span>${chip}
    </div>
    <div class="cal-meta">${dateTxt} \u00b7 ${seats} ${unit}${method?' \u00b7 '+method:''}</div>
    <div class="cal-foot">${mode==='past'?won:leader}</div>
    <div class="cal-fresh">${fresh}</div>
  </button>`;
}

/* ---------- render sidebar (single card, top-left) ---------- */
// Sparse-polling countries (Estonia's newest poll is ~36 days old, France's
// ~31): with the default 30-day window the poll average and the forecast tab
// render empty on load. Fall back to the smallest range that has polls,
// unless the range was set explicitly via ?d=. Works without the sidebar
// select (first paint), and syncs it when it exists.
function effectiveDays(){
  const sel=$('filter-days');
  let v=sel?(parseInt(sel.value)||30):30;
  let explicit=false;
  try{ explicit=!!new URLSearchParams(location.search).get('d'); }catch(e){}
  // Per-country default window for sparse sources (Moldova's post-election
  // polling is a handful of quarterly surveys): honored until the visitor
  // picks a window themselves.
  const def=(COUNTRIES[COUNTRY]||{}).defaultDays;
  if(v===30&&!explicit&&!window._600UserDays&&def&&def!==30){
    v=def; if(sel) sel.value=String(def);
  }
  if(v===30&&!explicit&&POLLS&&POLLS.length&&!recentPolls(POLLS,30).length){
    for(const w of [60,90,2026,9999]){
      if(recentPolls(POLLS,w).length){ v=w; if(sel) sel.value=String(w); break; }
    }
  }
  return v;
}

function renderSidebar(prevDays, prevPollster, prevMethod){
  const c=$('sidebar-content');
  if(!c) return;
  prevDays=prevDays||'30';
  prevPollster=prevPollster||'';
  prevMethod=prevMethod||'';
  let html='';

  // Country selector (hidden on pinned sub-pages / archives)
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.country}</div></div>
    ${isPinnedCountry()
      ?`<div class="sb-hint" style="font-weight:900;letter-spacing:0.8px">${COUNTRY_NAME}</div>`
      :`<div class="sb-hint" style="font-weight:900;letter-spacing:0.8px">${COUNTRY_NAME}</div>`}
    <div class="sb-hint">${MAP_ONLY?`${SEATS_TOTAL} ${unitLabel()} · ${T.twoRound} · ${TREND_CONF?TREND_CONF.electionDate:''}`:`${seatsDesc()} ${T.seats} · ${methodName()}${THRESHOLD>0?` · ${THRESHOLD}% ${T.threshold}`:''}`}</div></div>`;

  // Filters
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.filters}</div></div>
    <label class="sb-hint" style="margin-bottom:4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${T.timeRange}</label>
    <select class="sb-select" id="filter-days" onchange="window._600UserDays=true;window._600.applyFilters()">
      <option value="7"${prevDays==='7'?' selected':''}>${T.last7}</option>
      <option value="14"${prevDays==='14'?' selected':''}>${T.last14}</option>
      <option value="30"${prevDays==='30'?' selected':''}>${T.last30}</option>
      <option value="60"${prevDays==='60'?' selected':''}>${T.last60}</option>
      <option value="90"${prevDays==='90'?' selected':''}>${T.last90}</option>
      <option value="2026"${prevDays==='2026'?' selected':''}>2026</option>
      <option value="9999"${prevDays==='9999'?' selected':''}>${T.allPolls}</option>
    </select>
    <label class="sb-hint" style="margin:10px 0 4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${T.pollster}</label>
    <select class="sb-select" id="filter-pollster" onchange="window._600.applyFilters()">
      <option value="">${T.allPollsters}</option>
    </select>
    <label class="sb-hint" style="margin:10px 0 4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${t('Method','Yöntem')}</label>
    <select class="sb-select" id="filter-method" onchange="window._600.applyFilters()">
      <option value="">${t('All methods','Tüm yöntemler')}</option>
      <option value="online"${prevMethod==='online'?' selected':''}>${t('Online panel','Çevrimiçi panel')}</option>
      <option value="phone"${prevMethod==='phone'?' selected':''}>${t('Telephone','Telefon')}</option>
      <option value="face"${prevMethod==='face'?' selected':''}>${t('Face-to-face','Yüz yüze')}</option>
      <option value="mixed"${prevMethod==='mixed'?' selected':''}>${t('Mixed','Karma')}</option>
    </select></div>`;

  // Last election
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${LAST_ELECTION.date.slice(0,4)} ${T.result}</div></div>
    <div class="sb-last-election" id="sb-election"></div></div>`;

  // Info
  const health=dataHealthLabel();
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.info}</div></div>
    <div class="sb-hint">${t('Data','Veri')}: Wikipedia${COUNTRY==='sweden'?' + SwedishPolls (CC0)':''}<br>${MAP_ONLY?`${SEATS_TOTAL} ${unitLabel()} · ${T.twoRound}`:`${seatsDesc()} ${T.seats} · ${methodNameShort()}${THRESHOLD>0?` · ${THRESHOLD}% ${T.threshold}`:''}`}<br>${t('Next election','Sonraki seçim')}: ${META.election_date||LAST_ELECTION.date}<br><span style="font-weight:900;color:${health.col}">◆ ${health.txt}</span></div></div>`;

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
    if(!(pct_val>=0.05)) continue;   // parties at 0.0% are noise
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
// Brazil: runoff-forward hero — head-to-head poll average plus the two-round
// election path (first round -> runoff), built from the weighted runoff polls.
function brazilRunoffHero(avg, filteredPolls){
  const ro=runoffForecast(avg, filteredPolls, null);
  if(!ro) return renderHeroGeneric(avg, filteredPolls);
  const cA=PARTY_META[ro.a]?PARTY_META[ro.a].color:'#888';
  const cB=PARTY_META[ro.b]?PARTY_META[ro.b].color:'#888';
  const h2a=ro.winA/3000, h2b=1-h2a;
  const barA=(v)=>Math.max(2,v*100);
  const d1=META.election_date||'2026-10-04';
  const d2=META.election_date_runoff||'2026-10-25';
  const fr=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].firstRoundResult;
  const frTop=fr?Object.entries(fr).sort((x,y)=>y[1]-x[1]).slice(0,2)
    .map(([pp,vv])=>`${partyCode(pp)} ${fmt(vv,1)}`).join(' \u2013 '):'';
  return `<div class="hero hero-brazil">
    <div class="hero-title">${COUNTRY_NAME} — ${t('PRESIDENTIAL · TWO ROUNDS','BAŞKANLIK · İKİ TUR')}</div>
    <div class="hero-date">${d1} ${t('first round','ilk tur')}${frTop?` (${frTop})`:''} → ${d2} ${t('runoff','ikinci tur')} · ${ro.roN} ${t('head-to-head polls','başa baş anket')}</div>
    <div class="bz-runoff">
      <div class="bz-cand" style="--bz-c:${cA}">
        <span class="bz-code">${partyCode(ro.a)}</span>
        <span class="bz-pct">${fmt(ro.aN,1)}%</span>
        <div class="bz-bar"><div class="bz-fill" style="width:${barA(ro.aN/100)}%;background:${cA}"></div></div>
        <span class="bz-sub">${t('WINS RUNOFF','İKİNCİ TURU KAZANIR')} <b>${pct100(h2a)}</b></span>
      </div>
      <div class="bz-vs">vs</div>
      <div class="bz-cand" style="--bz-c:${cB}">
        <span class="bz-code">${partyCode(ro.b)}</span>
        <span class="bz-pct">${fmt(ro.bN,1)}%</span>
        <div class="bz-bar"><div class="bz-fill" style="width:${barA(ro.bN/100)}%;background:${cB}"></div></div>
        <span class="bz-sub">${t('WINS RUNOFF','İKİNCİ TURU KAZANIR')} <b>${pct100(h2b)}</b></span>
      </div>
    </div>
    <div class="bz-path">
      ${todayStr()<(META.election_date||'')
        ?`<span>${t('RUNOFF WIN PROBABILITY','İKİNCİ TUR KAZANMA OLASILIĞI')}: ${partyCode(ro.a)} <b>${pct100(ro.winA/3000)}</b> \u00b7 ${partyCode(ro.b)} <b>${pct100(1-ro.winA/3000)}</b></span>`
        :`<span>${t('ELECTION PATH','SEÇİM YOLU')}: ${partyCode(ro.a)} ${pct100((ro.winA/3000))} ${t('first-round win','ilk turda kazanır')}</span>
      <span>\u00b7</span>
      <span>${partyCode(ro.b)} ${pct100(1-ro.winA/3000)} ${t('would go to runoff','ikinci tura gider')}</span>`}
    </div>
  </div>`;
}

function renderHero(avg, filteredPolls){
  // two-round presidential countries (Brazil, France): the head-to-head hero
  // whenever the poll window carries runoff pairs; it falls back to the
  // generic hero itself when there are fewer than two runoff polls
  if(filteredPolls.some(p=>p.runoff&&Object.keys(p.runoff).length))
    return brazilRunoffHero(avg, filteredPolls);
  return renderHeroGeneric(avg, filteredPolls);
}
function renderHeroGeneric(avg, filteredPolls){
  const latest=filteredPolls[0];
  const days=latest?daysAgo(latest.date):'—';
  const latestStr=latest?latest.date:'—';
  const topParty=PARTY_ORDER.slice().sort((a,b)=>(avg[b]||0)-(avg[a]||0))[0];
  const topPct=avg[topParty]||0;
  const color=PARTY_META[topParty]?PARTY_META[topParty].color:'#888';

  const logoSrc=PARTY_LOGOS[topParty]||'';
  const b=dataBase();
  return `<div class="hero">
    <div class="hero-title">${COUNTRY_NAME} — ${T.pollAverage}</div>
    <div class="hero-date">${filteredPolls.length} ${t('polls','anket')} · ${t('latest','en yeni')}: ${latestStr} (${days}${t('d','g')} ${t('ago','önce')}) · ${t('sample-size + pollster accuracy + recency weighted','örneklem + anketçi doğruluğu + güncellik ağırlıklı')}</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <div style="width:36px;height:36px;border:2px solid var(--c-edge);box-shadow:var(--shadow-md);background:${color};display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${logoSrc?`<img src="${b}${logoSrc}?v=${LOGO_CACHE}" alt="${topParty}" style="width:28px;height:28px;object-fit:contain">`:`<span style="color:${textOn(color)};font-weight:900;font-size:12px">${topParty}</span>`}
      </div>
      <div>
        <span style="font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;font-family:var(--font-mono)">${valDisp(topPct)}</span>
        <span style="font-size:13px;font-weight:700;color:var(--c-text-muted);margin-left:4px">${t('leading','önde')}</span>
      </div>
    </div>
  </div>`;
}

/* ---------- render party bars ---------- */
function renderPartyBars(avg){
  const maxPct=Math.max(...Object.values(avg).filter(v=>v!==null),1);
  const seats=allocateSeatsTotal(avg, SEATS_TOTAL);
  // unallocated entries (Bulgaria's NOTA) sit last, just before the Other row
  const order=PARTY_ORDER.slice().sort((a,b)=>
    ((PARTY_META[a]&&PARTY_META[a].unallocated)?1:0)-((PARTY_META[b]&&PARTY_META[b].unallocated)?1:0)
    ||(avg[b]||0)-(avg[a]||0));
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.pollAvg}</div></div>
    <div class="bar-header"><span class="bh-logo"></span><span class="bh-party">${t('PARTY','PARTİ')}</span><span class="bh-bar"></span><span class="bh-pct">${SEAT_BASED?'SEATS':'%'}</span><span class="bh-delta">Δ</span>${SEAT_BASED||MAP_ONLY?'':'<span class="bh-seats">SEATS</span>'}</div>`;

  for(const pid of order){
    const val=avg[pid];
    if(val===null||val===undefined) continue;
    if(!(val>=0.05)) continue;   // 0 seats / 0.0% rows are noise
    const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
    const barWidth=Math.max(1,(val/maxPct)*100);
    const last2022=SEAT_BASED?(LAST_ELECTION.seats[pid]||0):(LAST_ELECTION.results[pid]||0);
    const delta=(SEAT_BASED?Math.ceil(val):val)-last2022;
    const deltaStr=delta>0?`+${SEAT_BASED?Math.round(delta):fmt(delta)}`:SEAT_BASED?String(Math.round(delta)):fmt(delta);
    const deltaColor=delta>0?'#0B9E17':delta<0?'var(--c-accent)':'var(--c-text-muted)';
    const mpSeats=SEAT_BASED?Math.ceil(val):(seats[pid]||0);

    html+=`<div class="party-row">
      <div class="party-logo" style="background:${color}">
        ${PARTY_LOGOS[pid]?`<img src="${dataBase()}${PARTY_LOGOS[pid]}?v=${LOGO_CACHE}" alt="${pid}" style="width:24px;height:24px;object-fit:contain">`:`<span style="color:${textOn(color)}">${HIDE_BLOCS?partyCode(pid).replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase():partyCode(pid)}</span>`}
      </div>
      <div class="party-name">${partyCode(pid)}</div>
      <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:${color}"></div></div>
      <div class="party-pct">${valDisp(val)}</div>
      <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
      ${SEAT_BASED||MAP_ONLY?'':`<div class="party-seats" style="color:${color}">${mpSeats}</div>`}
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
        <div class="party-logo" style="background:#9CA3AF"><span style="color:#1F2937">${t('OTH','DİĞ')}</span></div>
        <div class="party-name">${t('Other','Diğer')}</div>
        <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:#9CA3AF"></div></div>
        <div class="party-pct">${fmt(othersNow)}%</div>
        <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
        ${SEAT_BASED||MAP_ONLY?'':'<div class="party-seats" style="color:#9CA3AF">0</div>'}
      </div>`;
    }
  }
  // Unsettled-field countries (France 2027): the polls test alternative
  // candidate fields, so the per-candidate averages sum past 100 - say so
  // instead of pretending the field is fixed.
  const avgSum=PARTY_ORDER.reduce((a,p)=>a+(avg[p]||0),0);
  if(avgSum>103){
    html+=`<div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
      \u03a3 ${fmt(avgSum,0)}% \u00b7 ${t('the field is unsettled: the polls test alternative candidate combinations, each candidate is averaged over the polls that tested them','alan belirsiz: anketler farklı aday kombinasyonlarını test ediyor; her aday, sorulduğu anketlerin ortalamasıyla hesaplanıyor')}
    </div>`;
  }
  if(BLOCS.bloc1&&BLOCS.bloc2&&!HIDE_BLOCS) html+=`<div class="pollavg-blocs">${renderBlocs(avg)}</div>`;
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
  const bs=SEAT_BASED?blocSeats(rg,td):null;
  const disp=v=>SEAT_BASED?String(Math.round(v)):valDisp(v);
  // seat counts next to the vote shares - the reader counts seats; for
  // seat-based countries the big number already is the seat count
  let seats=null;
  if(!SEAT_BASED){
    if(PARL_MODE==='proj'){
      try{seats=projectedSeats(avg)}catch(e){seats=null}
    }else if(LAST_ELECTION.seats){
      seats={};PARTY_ORDER.forEach(p=>{seats[p]=LAST_ELECTION.seats[p]||0});
    }
  }
  const seatLine=b=>{
    if(!seats||!b) return '';
    const n=b.parties.reduce((s,p)=>s+(seats[p]||0),0);
    return `<div class="bloc-seats">${n} ${T.seats}</div>`;
  };
  const card=(b,val)=>`<div class="bloc-card" style="border-left:6px solid ${b.color}">
      <div class="bloc-name">${b.name}</div>
      <div class="bloc-pct" style="color:${b.color}">${val}</div>
      ${seatLine(b)}
      <div class="bloc-parties">${b.parties.map(partyCode).join(' + ')}</div>
    </div>`;
  let cards=card(BLOCS.bloc1,disp(bs?bs.gov:rg))+card(BLOCS.bloc2,disp(bs?bs.opp:td));
  // optional third bloc (e.g. Israel's Arab parties): shown on its own
  if(BLOCS.bloc3){
    const b3=BLOCS.bloc3.parties.reduce((s,p)=>s+(avg[p]||0),0);
    cards+=card(BLOCS.bloc3,disp(b3));
  }
  return `<div class="bloc-row">${cards}</div>`;
}

/* ---------- render trend chart (canvas) ---------- */
const CHART_STATE={};

// LOESS (locally estimated scatterplot smoothing): tricube-weighted local
// regression in the x-domain (day timestamps). Unlike a fixed-half-life moving
// average it adapts to the local data density, so it follows sudden trends
// (Sweden 2026: L surged ~2->5pp in the final week) without lagging.
// bandwidthDays is the tricube kernel half-width in days.
function loessSmooth(xs, ys, xsEval, bandwidthDays){
  const n=xs.length;
  if(!n) return ys.slice();
  const bw=(bandwidthDays||14)*864e5;
  const out=ys.map((y,i)=>{
    const x0=xsEval[i];
    let num=0,den=0;
    for(let j=0;j<n;j++){
      if(ys[j]===null) continue;
      const d=Math.abs(xs[j]-x0);
      if(d>=bw) continue;
      const w=Math.pow(1-Math.pow(d/bw,3),3);
      num+=w*ys[j]; den+=w;
    }
    return den>0?num/den:null;
  });
  return out;
}

function renderTrendChart(canvas, polls){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth;
  const H=wrap.clientHeight||320;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);

  // Collect data points: group by date, average. In runoff mode the series
  // come from the head-to-head pairs (p.runoff) instead of first-round votes.
  const roMode=TREND_MODE==='ro';
  const byDate={};
  polls.forEach(p=>{
    if(roMode&&!p.runoff) return;
    const src=roMode?p.runoff:p.votes;
    if(!byDate[p.date]) byDate[p.date]={};
    for(const pid of PARTY_ORDER){
      if(src[pid]!==undefined){
        if(!byDate[p.date][pid]) byDate[p.date][pid]=[];
        byDate[p.date][pid].push(src[pid]);
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

  // Build series (placeholder parties like SPN never appear). Each series
  // carries the raw date-averaged points plus a LOESS smooth; the LOESS curve
  // is what gets drawn so the trend follows real movement instead of a lagging
  // fixed-window average.
  const datesT=dates.map(d=>new Date(d).getTime());
  const ts0=datesT[0], ts1=datesT[datesT.length-1];
  const series=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly)).map(pid=>{
    const points=dates.map(d=>{
      const vals=byDate[d][pid];
      if(!vals||!vals.length) return null;
      return vals.reduce((a,b)=>a+b,0)/vals.length;
    });
    // LOESS over the day axis: tricube local regression with a ~14-day kernel.
    const smooth=loessSmooth(datesT, points, datesT, 14);
    return {pid, points, smooth, color:PARTY_META[pid]?PARTY_META[pid].color:'#888'};
  });

  // Find y range (data-driven, no clipping; high sanity cap so a 60%+
  // leader like Hungary's Tisza stays on the chart)
  let yMin=Infinity,yMax=-Infinity;
  series.forEach(s=>s.points.forEach(v=>{if(v!==null){yMin=Math.min(yMin,v);yMax=Math.max(yMax,v)}}));
  if(!isFinite(yMin)){yMin=0;yMax=45}
  const dataMin=yMin;
  yMin=Math.floor(Math.max(0,yMin-3));
  yMax=Math.ceil(Math.min(95,yMax+3));
  // zoom the lower bound: when every party polls above ~2% the 0-based axis
  // flattens the small parties into one line at the bottom; the axis note
  // tells the reader where it starts
  if(dataMin>2){
    const zoom=Math.floor(dataMin*0.75);
    if(zoom>yMin) yMin=zoom;
  }

  CHART_STATE.ctx=ctx; CHART_STATE.W=W; CHART_STATE.H=H;
  CHART_STATE.pad=pad; CHART_STATE.dates=dates; CHART_STATE.series=series;
  CHART_STATE.yMin=yMin; CHART_STATE.yMax=yMax; CHART_STATE.byDate=byDate;
  CHART_STATE.cw=cw; CHART_STATE.ch=ch; CHART_STATE.wrap=wrap;
  CHART_STATE.polls=polls;
  CHART_STATE.ts0=ts0; CHART_STATE.ts1=ts1; CHART_STATE.datesT=datesT;

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
    const frac=Math.max(0,Math.min(1,(mx-pad.left)/cw));
    const tq=ts0+frac*(ts1-ts0);
    let idx=0,best=Infinity;
    datesT.forEach((t2,i)=>{const dd=Math.abs(t2-tq);if(dd<best){best=dd;idx=i}});
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
  // x is time-proportional: irregular poll dates keep their spacing
  const xOf=i=>{
    const a=(s.datesT&&s.datesT.length===dates.length)?s.datesT[0]:0;
    const b=(s.datesT&&s.datesT.length===dates.length)?s.datesT[dates.length-1]:(dates.length-1);
    const v=(s.datesT&&s.datesT.length===dates.length)?s.datesT[i]:i;
    return pad.left+((v-a)/Math.max(1,(b-a)))*cw;
  };
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  // Grid
  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  const yTicks=5;
  for(let i=0;i<=yTicks;i++){
    const y=pad.top+ch*(i/yTicks);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const val=yMax-(yMax-yMin)*(i/yTicks);
    ctx.fillStyle='#64748B';ctx.font='10px Source Code Pro,monospace';ctx.textAlign='right';
    ctx.fillText(SEAT_BASED?String(Math.round(val)):pct(val),pad.left-6,y+3);
  }

  // X labels
  const xStep=Math.max(1,Math.floor(dates.length/8));
  ctx.fillStyle='#64748B';ctx.font='10px Source Code Pro,monospace';ctx.textAlign='center';
  for(let i=0;i<dates.length;i+=xStep){
    ctx.fillText(dates[i].slice(5),xOf(i),H-pad.bottom+16);
  }
  // axis note: the lower bound is zoomed, say so
  if(yMin>0){
    ctx.fillStyle='#94A3B8';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='left';
    ctx.fillText('axis starts at '+(SEAT_BASED?String(Math.round(yMin)):pct(yMin)),pad.left,pad.top-4);
  }

  // Lines
  series.forEach(ser=>{
    ctx.beginPath();
    ctx.strokeStyle=ser.color;
    ctx.lineWidth=2;
    let started=false;
    ser.smooth.forEach((v,i)=>{
      if(v===null) return;
      const x=xOf(i);
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
    ctx.fillStyle=ser.color;ctx.font='bold 10px Source Code Pro,monospace';ctx.textAlign='left';
    ctx.fillText(partyCode(ser.pid),x,y+3);
  });

  // Trend projection markers: dashed from the last point to the value the
  // recency-weighted linear fit extrapolates at election day (top parties only)
  if(s.polls&&TREND_CONF){
    const election=new Date(TREND_CONF.electionDate).getTime();
    const horizon=(election-Date.now())/(1000*60*60*24);
    if(horizon>0&&horizon<=TREND_CONF.windowDays){
      const cands=[];
      series.forEach(ser=>{
        let lastVal=null,lastIdx=-1;
        for(let i=ser.points.length-1;i>=0;i--){if(ser.points[i]!==null){lastVal=ser.points[i];lastIdx=i;break}}
        if(lastVal===null) return;
        cands.push({ser,lastVal,lastIdx});
      });
      cands.sort((a,b)=>b.lastVal-a.lastVal);
      const tp=trendProjections(s.polls);
      cands.slice(0,4).forEach(c=>{
        const ext=tp?tp[c.ser.pid]:null;
        if(ext===null||ext===undefined) return;
        const x0=xOf(c.lastIdx);
        const y0=pad.top+ch*(1-(c.lastVal-yMin)/(yMax-yMin));
        const xe=W-pad.right+2;
        const ye=Math.max(pad.top+2,pad.top+ch*(1-(Math.min(ext,yMax)-yMin)/(yMax-yMin)));
        ctx.strokeStyle=c.ser.color;ctx.lineWidth=1;
        ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(xe,ye);ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.fillStyle='#fff';ctx.strokeStyle=c.ser.color;
        ctx.moveTo(xe-3.5,ye);ctx.lineTo(xe,ye-3.5);ctx.lineTo(xe+3.5,ye);ctx.lineTo(xe,ye+3.5);ctx.closePath();
        ctx.fill();ctx.stroke();
      });
    }
  }

  // Event annotations: dashed marks for elections / party splits in-window
  const _aT=(s.datesT&&s.datesT.length===dates.length)?s.datesT[0]:null;
  const _bT=(s.datesT&&s.datesT.length===dates.length)?s.datesT[dates.length-1]:null;
  if(_aT!==null&&_bT!==null&&EVENTS.length){
    _eFrac: {
      EVENTS.forEach(ev=>{
        const et=Date.parse(ev.date);
        if(!et||et<_aT||et>_bT) return;
        const x=pad.left+((et-_aT)/Math.max(1,(_bT-_aT)))*cw;
        ctx.strokeStyle='#94A3B8';ctx.lineWidth=1;
        ctx.setLineDash([2,4]);
        ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,H-pad.bottom);ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.fillStyle='#475569';
        ctx.moveTo(x-4,pad.top);ctx.lineTo(x+4,pad.top);ctx.lineTo(x,pad.top+7);
        ctx.closePath();ctx.fill();
        const lbl=(LANG==='tr'&&ev.tr)?ev.tr:(ev.en||'');
        if(lbl){
          ctx.font='600 9px "Source Code Pro",monospace';
          ctx.fillStyle='#475569';
          ctx.textAlign='center';
          ctx.fillText(lbl,x,pad.top-4,150);
          ctx.textAlign='left';
        }
      });
    }
  }

  // Hover overlay: guide line + dots
  if(hoverIdx!==undefined&&hoverIdx>=0&&hoverIdx<dates.length){
    const x=xOf(hoverIdx);
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
// Relative pollster accuracy per country: weight = 1/MAE, normalized so the
// country's best pollster scores 1.0 (5 stars). Returns {pollster: 0..1}.
function relativePollsterRatings(){
  const mae=POLLSTER_MAE||{};
  const keys=Object.keys(mae);
  if(!keys.length) return {};
  let maxW=0;
  const w={};
  keys.forEach(k=>{
    const v=mae[k][MAE_KEY]||mae[k].overall;
    w[k]=v?1/v:0;
    if(w[k]>maxW) maxW=w[k];
  });
  const out={};
  keys.forEach(k=>{out[k]=maxW>0?w[k]/maxW:0});
  return out;
}

function renderPollsTable(polls){
  const ratings=relativePollsterRatings();
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.individualPolls}</div></div>
    <div class="polls-scroll">
    <table class="polls-table compact-table"><thead><tr>
      <th>${t('Date','Tarih')}</th><th>${t('Pollster','Anketçi')}</th>
      <th class="c" title="${t('Pollster accuracy vs the best in this country (weight = 1/MAE)','Anketçi doğruluğu, ülkedeki en iyiye göre (ağırlık = 1/MAE)')}">${t('RATE','PUAN')}</th>
      <th class="c">${t('Lead','Fark')}</th>`;
  const shown=polls.slice(0,60);
  // drop columns for parties no poll in the table reports (all dashes = noise)
  const active=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly)
    &&shown.some(pl=>pl.votes[p]!==undefined));
  active.forEach(p=>{html+=`<th class="c">${partyCode(p)}</th>`});
  html+=`</tr></thead><tbody>`;

  polls.slice(0,60).forEach(p=>{
    // Leader + margin
    const sorted=active.slice().sort((a,b)=>(p.votes[b]||0)-(p.votes[a]||0));
    const leadP=sorted[0], leadV=p.votes[leadP]||0;
    const secondV=p.votes[sorted[1]]||0;
    const margin=leadV-secondV;
    const leadColor=PARTY_META[leadP]?PARTY_META[leadP].color:'#888';

    // relative rating of this poll's pollster (tolerate flat or incomplete
    // MAE entries: a missing number must never kill the render)
    const rr=ratings[p.pollster];
    const maeV=POLLSTER_MAE[p.pollster];
    const maeVal=maeV?(typeof maeV==='object'?(maeV[MAE_KEY]??maeV.overall):maeV):undefined;
    const rateTxt=rr===undefined
      ?'—'
      :'★★★★★'.slice(0,Math.max(1,Math.round(rr*5)));
    const rateTitle=maeVal!=null&&rr!==undefined?`${t('accuracy vs best','en iyiye göre doğruluk')}: ${(rr*100).toFixed(0)}% · MAE ${fmt(maeVal,2)}`:'';
    const rateColor=rr===undefined?'var(--c-rule)':(rr>=0.85?'#0B9E17':(rr>=0.6?'#E0A800':'var(--c-text-muted)'));

    html+=`<tr><td>${p.date.slice(5)}</td><td>${p.pollster}${p.method?`<span class="poll-method" title="${t('Fieldwork method','Saha yöntemi')}: ${p.method}">${p.method}</span>`:''}</td>
      <td class="num c ps-rate" title="${rateTitle}" style="color:${rateColor}">${rateTxt}</td>
      <td class="num c" style="color:${leadColor};font-weight:700">${partyCode(leadP)} +${SEAT_BASED?String(Math.round(margin)):fmt(margin)}</td>`;
    active.forEach(pid=>{
      const v=p.votes[pid];
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      const isTop=pid===leadP;
      const zero=v!==undefined&&(SEAT_BASED?v<0.5:v<0.05);
      html+=`<td class="num c" style="color:${v!==undefined&&!zero?color:'var(--c-rule)'};font-weight:${isTop?'900':'400'};background:${isTop?color+'22':''}">${v!==undefined&&!zero?(SEAT_BASED?Math.round(v):pct(v)):'—'}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      ${t('Lead = margin between the two largest parties · RATE = pollster accuracy relative to the best in this country','Fark = en büyük iki parti arasındaki marj · PUAN = anketçinin ülkedeki en iyiye göre doğruluğu')}${POLLS.some(p=>p.method)?` · ${t('method tag = fieldwork type, from a curated pollster map (untagged = unknown)','yöntem etiketi = saha tipi, elle derlenen anketçi listesinden (etiketsiz = bilinmiyor)')}`:''}
    </div></div>`;
  return html;
}

/* ---------- runoff (head-to-head) polls table ---------- */
// Separate from the first-round table: only polls carrying a p.runoff pair,
// with each pollster's measured error from the first round next to the
// head-to-head numbers it feeds into the runoff average.
function renderRunoffTable(polls){
  const ro=polls.filter(p=>p.runoff&&
    (p.runoff.lula!==undefined||p.runoff.flavio!==undefined));
  if(!ro.length) return '';
  const frM=firstRoundMAE();
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('Runoff polls (head-to-head)','\u0130kinci tur anketleri (ba\u015fa ba\u015f)')}</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>${t('Date','Tarih')}</th><th>${t('Pollster','Anketçi')}</th>
      <th class="c" title="${t('Pollster error in the 4 Oct first round (their final poll vs the actual result); runoff weight = 1/MAE','Anketçinin 4 Ekim\'deki ilk tur hatası (son anketiyle gerçek sonuç arasındaki fark); ikinci tur ağırlığı = 1/MAE')}">${t('R1 MAE','1T HATA')}</th>
      <th class="c">${partyCode('lula')}</th><th class="c">${partyCode('flavio')}</th>
      <th class="c">${t('Lead','Fark')}</th>
      </tr></thead><tbody>`;
  ro.slice(0,60).forEach(p=>{
    const l=p.runoff.lula, f=p.runoff.flavio;
    const lc=(PARTY_META.lula||{}).color||'#888';
    const fc=(PARTY_META.flavio||{}).color||'#888';
    const mae=frM[p.pollster];
    const lead=(l!==undefined&&f!==undefined)
      ?(l>f?['lula',l-f]:['flavio',f-l]):null;
    html+=`<tr><td>${p.date.slice(5)}</td><td>${p.pollster}</td>
      <td class="num c" style="font-weight:700">${mae?fmt(mae,2):'\u2014'}</td>
      <td class="num c" style="color:${lc};font-weight:${lead&&lead[0]==='lula'?'900':'400'};background:${lead&&lead[0]==='lula'?lc+'22':''}">${l!==undefined?pct(l):'\u2014'}</td>
      <td class="num c" style="color:${fc};font-weight:${lead&&lead[0]==='flavio'?'900':'400'};background:${lead&&lead[0]==='flavio'?fc+'22':''}">${f!==undefined?pct(f):'\u2014'}</td>
      <td class="num c" style="color:${lead?(PARTY_META[lead[0]]||{}).color:'#888'};font-weight:700">${lead?partyCode(lead[0])+' +'+fmt(lead[1],1):'\u2014'}</td>
      </tr>`;
  });
  html+=`</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">${t('Head-to-head shares are of decided voters; the runoff average weights each poll by 1/MAE measured in the first round','Ba\u015fa ba\u015f oranlar\u0131, karar\u0131n\u0131 vermi\u015f se\u00e7menler aras\u0131ndad\u0131r; ikinci tur ortalamas\u0131 her anketi ilk turda \u00f6l\u00e7\u00fclen 1/MAE ile a\u011f\u0131rl\u0131kland\u0131r\u0131r')}</div></div>`;
  return html;
}

/* ---------- render state depth (Brazil) ---------- */
// 27 UFs -> region, for the regional breakdown card. Keys match conf.gebiete (lowercase).
const BRAZIL_REGIONS={
  ac:'Norte',am:'Norte',ap:'Norte',pa:'Norte',ro:'Norte',rr:'Norte',to:'Norte',
  al:'Nordeste',ba:'Nordeste',ce:'Nordeste',ma:'Nordeste',pb:'Nordeste',pe:'Nordeste',pi:'Nordeste',rn:'Nordeste',se:'Nordeste',
  df:'Centro-Oeste',go:'Centro-Oeste',mt:'Centro-Oeste',ms:'Centro-Oeste',
  es:'Sudeste',mg:'Sudeste',rj:'Sudeste',sp:'Sudeste',
  pr:'Sul',rs:'Sul',sc:'Sul',
};
function renderStateDepth(avg){
  if(COUNTRY!=='brazil') return '';
  const conf=MAP_CONF();
  if(!conf||!conf.gebiete) return '';
  const nat=conf.national2021||LAST_ELECTION.results;
  // projected per-state winner via uniform swing on the 2022 baseline
  const stateWinners={};
  Object.keys(conf.gebiete).forEach(uf=>{
    const base=conf.gebiete[uf];
    let best=null,bv=-1;
    for(const p of PARTY_ORDER){
      const past=base[p]||0;
      const swing=(avg[p]!==undefined)?((avg[p]||0)-(nat[p]||0)):0;
      const now=Math.max(0,past+swing);
      if(now>bv){bv=now;best=p}
    }
    stateWinners[uf]=best;
  });
  const leadCount={};
  Object.values(stateWinners).forEach(p=>{leadCount[p]=(leadCount[p]||0)+1});
  const regionRows=[];
  const regions=['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'];
  regions.forEach(reg=>{
    const ufs=Object.keys(conf.gebiete).filter(uf=>BRAZIL_REGIONS[uf]===reg);
    if(!ufs.length) return;
    const win=ufs.map(uf=>stateWinners[uf]);
    const counts={};
    win.forEach(p=>{counts[p]=(counts[p]||0)+1});
    const lead=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    const leadCol=PARTY_META[lead]?PARTY_META[lead].color:'#888';
    regionRows.push(`<div class="bz-reg-row">
      <span class="bz-reg-name">${reg}</span>
      <div class="bz-reg-bars">${Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).map(p=>{
        const col=PARTY_META[p]?PARTY_META[p].color:'#888';
        return `<span class="bz-reg-dot" style="background:${col}" title="${partyCode(p)} ${counts[p]}">${counts[p]}</span>`;
      }).join('')||'—'}</div>
      <span class="bz-reg-lead" style="color:${leadCol}">${partyCode(lead)}</span>
    </div>`);
  });
  const topCands=Object.keys(leadCount).sort((a,b)=>leadCount[b]-leadCount[a]).slice(0,4);
  const cards=topCands.map(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const n=leadCount[p];
    return `<div class="bz-state-card">
      <span class="bz-state-code" style="background:${col}">${partyCode(p)}</span>
      <span class="bz-state-num">${n}</span>
      <span class="bz-state-lbl">${t('states','eyalet')}</span>
    </div>`;
  }).join('');
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('STATES — PROJECTED WINNERS','EYALETLER — TAHMİNİ KAZANANLAR')}</div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${cards}</div>
    <div class="bz-regions">
      <div class="bz-reg-hd"><span>${t('REGION','BÖLGE')}</span><span>${t('WINNERS','KAZANANLAR')}</span><span>${t('LEAD','ÖNDEKİ')}</span></div>
      ${regionRows.join('')}
    </div>
    <div style="font-size:10px;color:var(--c-text-muted);margin-top:6px">${t('Per-state winner = 2022 baseline shifted by the national poll swing (uniform swing).','Eyalet kazananı = 2022 tabanının ulusal anket farkıyla eşit oranda kaydırılması.')}</div>
  </div>`;
}

/* ---------- render parliament ---------- */
let PARL_MODE='proj';    // 'proj' or '2022'
let PARL_VIEW='seats';   // 'seats' or 'map'
let MAP_LAYER=0;         // 0 = main map, 1 = map2 (lower/higher layer)
let FC_MODE='proj';      // forecast district map: 'proj' or 'res'
let TREND_MODE='fr';     // poll trend chart: 'fr' (first round) or 'ro' (runoff)
let MAP_COLOR='party';   // district map coloring: 'party' or 'bloc' (Sweden)
let FIELD_SIG=null;      // selected poll-field scenario (France 2027); null = all polls

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
    const w=districtWinnerProjection(nr,votes);
    if(w) out[w]++;
  });
  return out;
}

function overhangSeats(votes, totalBase, direct, cap){
  // Leveling seats: grow the house until every party that won direct mandates
  // holds at least its direct share; the total is capped at `cap` seats per
  // the electoral law. The base allocation follows the country's method:
  // divisor methods (Sainte-Laguë/Schepers for New Zealand, D'Hondt) award
  // seats by successive quotients, the German states keep Hare/Niemeyer. A
  // party below the threshold still qualifies with at least one direct
  // mandate (New Zealand's one-electorate rule).
  cap=cap||totalBase;
  const baseAlloc=(total)=>{
    const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD||(direct[p]||0)>0);
    if(SEAT_METHOD==='dhondt'||SEAT_METHOD==='sainte_lague_standard'||SEAT_METHOD==='sainte_lague'){
      const out={}; valid.forEach(p=>{out[p]=0});
      const quo=[];
      valid.forEach(p=>{
        for(let i=1;i<=total;i++){
          const div=SEAT_METHOD==='dhondt'?i
            :(SEAT_METHOD==='sainte_lague_standard'?(2*i-1):(i===1?1.2:2*i-1));
          quo.push([(votes[p]||0)/div,p]);
        }
      });
      quo.sort((a,b)=>b[0]-a[0]);
      for(let i=0;i<total&&i<quo.length;i++) out[quo[i][1]]++;
      return out;
    }
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
  if(OVERHANG&&OVERHANG.fixed){
    // Fixed overhang (New Zealand): allocate the base house, then a party that
    // won more electorates than its entitlement keeps all of them; the house
    // grows by the overhang and the other parties keep their base seats. The
    // iterative leveling loop below cannot converge for a party far below the
    // threshold holding many electorates (Te Pati Maori at 1.8% with 6).
    const seats=baseAlloc(totalBase);
    PARTY_ORDER.forEach(p=>{if(seats[p]<(direct[p]||0)) seats[p]=direct[p]||0});
    return seats;
  }
  let total=totalBase;
  for(let it=0;it<200;it++){
    const seats=baseAlloc(total);
    let deficit=0;
    PARTY_ORDER.forEach(p=>{const d=direct[p]||0; if(seats[p]<d) deficit+=d-seats[p]});
    if(deficit<=0) return seats;
    if(total===cap) break;
    total=Math.min(total+deficit,cap);
  }
  const s=baseAlloc(total);
  PARTY_ORDER.forEach(p=>{if(s[p]<(direct[p]||0)) s[p]=direct[p]||0});
  return s;
}

// German 2025 system (Bundeswahlgesetz 2023): the 630 seats are allocated
// proportionally (Sainte-Laguë/Schepers, 5% threshold); the 299 constituency
// winners (Erststimme) are seated *within* their party's proportional
// entitlement and surplus direct mandates are voided. Returns the per-party
// split (direct seated / list / surplus) for the projection.
function directMandateSplit(avg){
  const c=COUNTRIES[COUNTRY];
  // German 2025 rule only: Italy's Rosatellum keeps its FPTP seats separate
  // (mixedFptp) and pure-FPTP countries (BC/Quebec) have no proportional pool
  // to seat the direct mandates within. Countries with leveling seats (New
  // Zealand's overhang) use the overhang parliament instead.
  if(!c||CONSTITUENCY_RULE!=='fptp'||c.mixedFptp||OVERHANG||
     SEAT_METHOD!=='sainte_lague_standard') return null;
  const conf=(c.map2&&c.map2.useConstituencies)
    ?{...c,...c.map,...c.map2}:MAP_CONF();
  if(!conf||!conf.districts) return null;
  const direct={};
  PARTY_ORDER.forEach(p=>{direct[p]=0});
  for(const nr of Object.keys(conf.districts)){
    const w=districtWinnerProjection(nr,avg,conf);
    if(w) direct[w]=(direct[w]||0)+1;
  }
  const seats=allocateSeatsTotal(avg,SEATS_TOTAL);
  const rows=[];
  let surplusTotal=0;
  PARTY_ORDER.forEach(p=>{
    const d=direct[p]||0, s=seats[p]||0;
    if(!d&&!s) return;
    const seated=Math.min(d,s);
    const surplus=Math.max(0,d-s);
    surplusTotal+=surplus;
    rows.push({p,d,s,seated,surplus,list:Math.max(0,s-seated)});
  });
  rows.sort((a,b)=>b.s-a.s);
  return {rows,surplusTotal,directTotal:rows.reduce((a,r)=>a+r.d,0)};
}

// Upper chambers (the second legislative layer). Two systems exist in the
// app's coverage; both are documented approximations and the card caption
// says so:
//  - Italy Senate: same ballot as the Chamber (Rosatellum). 74 single-member
//    seats scaled from the Chamber's per-collegio bloc win-rate (the Senate's
//    own boundaries differ), 126 seats allocated proportionally from the same
//    average under the national 3% threshold (the real lists are regional).
//  - Spain Senate: block voting, 4 senators per peninsular province (5 for
//    the Balearics and Las Palmas, 6 for Tenerife, 2 for Ceuta and Melilla =
//    208). The projected province winner takes n-1 and the runner-up 1, or an
//    even split when the top two are within 2pp.
function allocateUpper(avg){
  const c=COUNTRIES[COUNTRY]||{};
  const up=c.upper;
  if(!up||!avg) return null;
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  if(up.block){
    // Spain: 59 block-voting districts (provinces + the Canary/Balearic
    // islands, NUTS3) when the senate map block exists, else the province map
    const mc=(c.senate&&c.senate.districts)?c.senate:MAP_CONF();
    if(!mc||!mc.districts) return null;
    const sbd=up.seatsByDistrict||{};
    for(const nr of Object.keys(mc.districts)){
      const n=(mc.seatDistricts&&mc.seatDistricts[nr])||sbd[nr]||4;
      const sh=districtShares(nr,avg,false,mc);
      if(!sh) continue;
      const parts=PARTY_ORDER.map(p=>[p,sh[p]?sh[p].now:0]).filter(x=>x[1]>0);
      if(!parts.length) continue;
      const votes={};
      PARTY_ORDER.forEach(p=>{votes[p]=sh[p]?sh[p].now:0});
      // Senate coalitions (config senate.alliances): members pool their
      // district votes, the block vote allocates to the pooled list, and the
      // won senators split among the members by their district shares.
      let groups=PARTY_ORDER.map(p=>({key:p,parties:[p],votes:votes[p]||0}));
      for(const a of (mc.alliances||[])){
        if(a.provinces.indexOf(nr)<0) continue;
        const members=a.parties.filter(p=>groups.some(g=>g.key===p));
        if(members.length<2) continue;
        const pooled=members.reduce((s,p)=>s+(votes[p]||0),0);
        groups=groups.filter(g=>members.indexOf(g.key)<0);
        groups.push({key:'al:'+members.join('+'),parties:members,votes:pooled});
      }
      const gvotes={};
      groups.forEach(g=>{gvotes[g.key]=g.votes});
      const split=blockVoteSeats(n, gvotes);
      if(split) for(const k of Object.keys(split)){
        const g=groups.find(x=>x.key===k);
        const cnt=split[k];
        if(!g||!cnt) continue;
        if(g.parties.length===1){out[g.parties[0]]+=cnt;continue;}
        const tot=g.parties.reduce((s,p)=>s+(votes[p]||0),0)||1;
        const q=g.parties.map(p=>({p,exact:cnt*(votes[p]||0)/tot}));
        q.forEach(x=>{x.fl=Math.floor(x.exact)});
        let given=q.reduce((a2,x)=>a2+x.fl,0);
        q.sort((a2,b2)=>(b2.exact-Math.floor(b2.exact))-(a2.exact-Math.floor(a2.exact)));
        for(let i2=0;given<cnt&&i2<q.length*2;i2++,given++) q[i2%q.length].fl++;
        q.forEach(x=>{out[x.p]+=x.fl});
      }
    }
    return out;
  }
  if(up.fptp){
    // Stabilicum countries (Italy): the Senate uses the same proportional +
    // fixed-bonus allocator as the Chamber (35-seat bonus, 113 cap)
    const stab=c.stabilicum;
    if(stab) return stabilicumSeats(avg, up.seats||SEATS_TOTAL,
      stab.senateBonus, stab.senateCap);
    // the Senate's own 74 single-member districts (config `senate`, built by
    // scraper/build_italy_senate.py) - real 2022 college baselines, swung by
    // the national average; the 126 PR seats are then allocated nationally
    // (the real lists are regional, which is the remaining approximation)
    const sc=c.senate;
    if(sc&&sc.districts){
      const sconf=Object.assign({},sc,{useConstituencies:true});
      const blocOf={};
      for(const bk of ['bloc1','bloc2']){
        const b=BLOCS[bk]; if(!b) continue;
        (b.parties||[]).forEach(p=>{blocOf[p]=bk});
      }
      const wonBy={};
      for(const id of Object.keys(sc.districts)){
        const shares=districtShares(id,avg,false,sconf);
        if(!shares) continue;
        const ent={};
        for(const p of PARTY_ORDER){
          const k=blocOf[p]||p;
          ent[k]=(ent[k]||0)+(shares[p]?shares[p].now:0);
        }
        let best=null,bestV=-1;
        for(const k of Object.keys(ent)){if(ent[k]>bestV){bestV=ent[k];best=k}}
        if(!best||ent[best]<=0) continue;
        (wonBy[best]=wonBy[best]||[]).push(shares);
      }
      for(const key of Object.keys(wonBy)){
        const won=wonBy[key];
        if(!BLOCS[key]){ out[key]+=won.length; continue; }
        const agg={}; let tot=0;
        for(const sh of won){
          for(const p of BLOCS[key].parties){
            const v=sh[p]?sh[p].now:0;
            agg[p]=(agg[p]||0)+v; tot+=v;
          }
        }
        if(tot<=0){ out[key]+=won.length; continue; }
        const q=BLOCS[key].parties.map(p=>({p:p,
          exact:won.length*(agg[p]||0)/tot}));
        q.forEach(x=>{x.seat=Math.floor(x.exact)});
        let g2=q.reduce((a,x)=>a+x.seat,0);
        q.sort((a,b)=>(b.exact-Math.floor(b.exact))
          -(a.exact-Math.floor(a.exact)));
        for(let i=0;g2<won.length;i++,g2++) q[i%q.length].seat++;
        q.forEach(x=>{out[x.p]+=x.seat});
      }
      const fptpTotal=PARTY_ORDER.reduce((a,p)=>a+out[p],0);
      const pr=allocateSeatsN(avg,Math.max(0,up.seats-fptpTotal));
      for(const p of PARTY_ORDER) out[p]+=(pr[p]||0);
      return out;
    }
    const conf=c.map, m2=c.map2;
    if(!conf||!m2||!m2.districts) return null;
    const blocOf={};
    for(const bk of ['bloc1','bloc2']){
      const b=BLOCS[bk]; if(!b) continue;
      (b.parties||[]).forEach(p=>{blocOf[p]=bk});
    }
    const cconf=Object.assign({},conf,{useConstituencies:true});
    const wonBy={};
    for(const id of Object.keys(m2.districts)){
      const shares=districtShares(id,avg,false,cconf);
      if(!shares) continue;
      const ent={};
      for(const p of PARTY_ORDER){
        const k=blocOf[p]||p;
        ent[k]=(ent[k]||0)+(shares[p]?shares[p].now:0);
      }
      let best=null,bestV=-1;
      for(const k of Object.keys(ent)){if(ent[k]>bestV){bestV=ent[k];best=k}}
      if(!best||ent[best]<=0) continue;
      (wonBy[best]=wonBy[best]||[]).push(shares);
    }
    const totalWon=Object.keys(wonBy).reduce((a,k)=>a+wonBy[k].length,0)||1;
    const blocs=Object.keys(wonBy).map(k=>({k:k,
      exact:up.fptp*wonBy[k].length/totalWon}));
    blocs.forEach(x=>{x.n=Math.floor(x.exact)});
    let given=blocs.reduce((a,x)=>a+x.n,0);
    blocs.sort((a,b)=>(b.exact-Math.floor(b.exact))
      -(a.exact-Math.floor(a.exact)));
    for(let i=0;given<up.fptp;i++,given++) blocs[i%blocs.length].n++;
    for(const bx of blocs){
      const won=wonBy[bx.k];
      if(!BLOCS[bx.k]){ out[bx.k]+=bx.n; continue; }
      const agg={}; let tot=0;
      for(const sh of won){
        for(const p of BLOCS[bx.k].parties){
          const v=sh[p]?sh[p].now:0;
          agg[p]=(agg[p]||0)+v; tot+=v;
        }
      }
      if(tot<=0){ out[bx.k]+=bx.n; continue; }
      const q=BLOCS[bx.k].parties.map(p=>({p:p,
        exact:bx.n*(agg[p]||0)/tot}));
      q.forEach(x=>{x.seat=Math.floor(x.exact)});
      let g2=q.reduce((a,x)=>a+x.seat,0);
      q.sort((a,b)=>(b.exact-Math.floor(b.exact))
        -(a.exact-Math.floor(a.exact)));
      for(let i=0;g2<bx.n;i++,g2++) q[i%q.length].seat++;
      q.forEach(x=>{out[x.p]+=x.seat});
    }
    const pr=allocateSeatsN(avg,Math.max(0,up.seats-up.fptp));
    for(const p of PARTY_ORDER) out[p]+=(pr[p]||0);
    return out;
  }
  return null;
}

// The projected seat map (projection mode) - the same allocator the arch
// uses, exposed so the bloc cards, the map section and the calibration hook
// all read one number.
function projectedSeats(avg){
  if(OVERHANG) return overhangSeats(avg,SEATS_TOTAL,directFromProjection(avg),OVERHANG.cap);
  return SEAT_BASED?seatParliament(avg,SEATS_TOTAL):allocateSeatsTotal(avg,SEATS_TOTAL);
}

// Map-as-the-story countries: when the map carries hundreds of districts
// (KR 254, JP 289, UK 650, QC 125, DE 299) it gets its own always-visible
// section below the arch instead of hiding behind a toggle.
function isBigMap(){
  // retired: every map presents inline like the rest - the separate
  // big-map card duplicated the map for 100+ district countries
  return false;
}

// The filter provenance line under the arch: which window, which pollsters,
// how many polls feed the number on screen.
function filtersNote(){
  const d=effectiveDays();
  const daysTxt=(d>=9999)?T.allPolls:((d>=365)?String(d):(T['last'+d]||('Last '+d+' days')));
  const ps=$('filter-pollster');
  const pv=(ps&&ps.value)?ps.value:T.allPollsters;
  const ms=$('filter-method');
  const mv=(ms&&ms.value&&ms.selectedOptions[0])?ms.selectedOptions[0].textContent:'';
  const n=(typeof FILTERED_POLLS!=='undefined'&&FILTERED_POLLS)?FILTERED_POLLS.length:0;
  return `${t('based on','Esas alınan')}: ${daysTxt} · ${pv}${mv?' · '+mv:''} · ${n} ${t('polls','anket')}`;
}

// Readable text on a party color: dark ink on light colors (yellow SDS,
// Iceland F), white on the rest.
function textOn(hex){
  const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||''));
  if(!m) return '#fff';
  const v=parseInt(m[1],16);
  const r=(v>>16)&255,g=(v>>8)&255,b=v&255;
  const lum=(0.299*r+0.587*g+0.114*b)/255;
  return lum>0.62?'#111827':'#fff';
}

function renderParliament(avg){
  let seats;
  const UP=(COUNTRIES[COUNTRY]||{}).upper||null;
  if(PARL_MODE==='upper'&&!UP) PARL_MODE='proj';
  if(PARL_MODE==='upper'){
    seats=allocateUpper(avg)||{};
  }else if(OVERHANG){
    seats=PARL_MODE==='proj'
      ?projectedSeats(avg)
      :(()=>{const s={};PARTY_ORDER.forEach(p=>{s[p]=LAST_ELECTION.seats?LAST_ELECTION.seats[p]||0:0});return s})();
  }else{
    seats=SEAT_BASED
      ?(PARL_MODE==='proj'?projectedSeats(avg):normalizeTo(LAST_ELECTION.seats,SEATS_TOTAL))
      :(PARL_MODE==='proj'?projectedSeats(avg)
        :(LAST_ELECTION.seats?(()=>{const s={};PARTY_ORDER.forEach(p=>{s[p]=LAST_ELECTION.seats[p]||0});return s})()
          :allocateSeatsN(LAST_ELECTION.results,SEATS_TOTAL)));
  }
  // Unmodelled parties (e.g. Serbia's minority lists): in the last-election view,
  // fill the chamber up to the statutory size with an "Other" wedge.
  if(PARL_MODE!=='proj'&&!OVERHANG){
    const sum=PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0);
    const target=(PARL_MODE==='upper'&&UP)?UP.seats:SEATS_TOTAL;
    const other=target-sum;
    if(other>0) seats.other=other;
  }
  const seatsTotal=Object.values(seats).reduce((a,b)=>a+(b||0),0);
  const mapConf=MAP_CONF();
  const bigMap=isBigMap();
  const showMap=MAP_ONLY||(PARL_VIEW==='map'&&mapConf);
  const btnRow=`<div class="map-toggle-row" style="justify-content:flex-end">
      <button class="map-toggle-btn parl-btn${PARL_MODE==='proj'?' active':''}" data-parlmode="proj">${T.projection}</button>
      <button class="map-toggle-btn parl-btn${PARL_MODE==='2022'?' active':''}" data-parlmode="2022">${LAST_ELECTION.date.slice(0,4)} ${T.result}</button>
      ${UP?`<button class="map-toggle-btn parl-btn${PARL_MODE==='upper'?' active':''}" data-parlmode="upper">${UP.label||t('Upper chamber','\u00dcst meclis')}</button>`:''}
      ${MAP_ONLY&&mapConf&&(mapConf.runoff2022||mapConf.runoff2026)?`<button class="map-toggle-btn parl-btn${PARL_MODE==='runoff'?' active':''}" data-parlmode="runoff">${t('RUNOFF','İKİNCİ TUR')}</button>`:''}
      ${mapConf&&!MAP_ONLY&&!bigMap?`<button class="map-toggle-btn parl-btn${showMap?' active':''}" data-parlview="map">${T.map}</button>`:''}
      ${mapConf&&COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].map2&&PARL_MODE!=='upper'?`<button class="map-toggle-btn parl-btn${MAP_LAYER===1?' active':''}" data-maplayer="1">${MAP_LAYER===1?(LANG==='tr'?(mapConf.label_tr||mapConf.label):(mapConf.label_en||mapConf.label))||T.map||'layer 1':((COUNTRIES[COUNTRY].map2&&(LANG==='tr'?(COUNTRIES[COUNTRY].map2.label_tr||COUNTRIES[COUNTRY].map2.label):(COUNTRIES[COUNTRY].map2.label_en||COUNTRIES[COUNTRY].map2.label)))||'layer 2')}</button>`:''}
      ${mapConf&&mapConf.useConstituencies&&!mapConf.hideBlocToggle&&BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn map-color-btn${MAP_COLOR==='bloc'?' active':''}" data-mapcolor="bloc">${T.blocs}</button>`:''}
      ${mapConf&&showMap?`<button class="shot-btn" id="map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>`:''}
      ${!showMap&&!MAP_ONLY?`<button class="shot-btn" id="parl-shot-btn" title="Download parliament diagram as PNG">${CAM_ICON}</button>`:''}
    </div>`;
  const box=showMap
    ?'<div class="parliament-box" id="map-box"></div>'
    :`<div class="parliament-box" id="parl-box">${buildParliamentSVG(seats, PARL_MODE==='upper'?(COUNTRIES[COUNTRY]||{}).senate:null)}</div>`;
  const mapCap=(MAP_ONLY
      ?`${SEATS_TOTAL} ${unitLabel()} · ${T.coloredBy} ${PARL_MODE==='runoff'?t('projected runoff winner','tahmini ikinci tur kazananı'):(PARL_MODE==='2022'?LAST_ELECTION.date.slice(0,4)+' '+T.result:t('projected winner','tahmini kazanan'))}`
      :(PARL_MODE==='upper'&&(COUNTRIES[COUNTRY]||{}).senate
        ?`${seatsTotal} ${T.seats} · ${UP?UP.label:''} · ${t('map = the upper chamber\u2019s own districts','harita = \u00fcst meclisin kendi b\u00f6lgeleri')}`
        :`${seatsTotal} ${T.seats} · ${methodName()}${THRESHOLD>0?` · ${THRESHOLD}% ${T.threshold}`:''} · ${t('map','harita')} = ${mapConf?(mapConf.layerCount||(mapConf.ilceDistrict?Object.keys(mapConf.ilceDistrict).length:Object.keys(mapConf.districts).length)):''} ${mapConf&&mapConf.ilceDistrict?t('il\u00e7eler','il\u00e7e'):t('constituencies','b\u00f6lge')}, ${T.coloredBy} ${(MAP_COLOR==='bloc'&&mapConf.useConstituencies&&!mapConf.hideBlocToggle)?t('leading bloc','önde olan blok'):(mapConf&&mapConf.ilceDistrict?t('il\u00e7e winner','il\u00e7e kazanan\u0131'):t('district winner','b\u00f6lge kazanan\u0131'))}`));
  const archCap=(PARL_MODE==='upper'
      ?`${seatsTotal} ${T.seats} · ${UP?UP.label:''} · ${(COUNTRIES[COUNTRY]||{}).senate?((COUNTRIES[COUNTRY]||{}).stabilicum?t('Stabilicum: proportional + a fixed '+((COUNTRIES[COUNTRY]||{}).stabilicum.senateBonus)+'-seat bonus for a coalition at or above '+((COUNTRIES[COUNTRY]||{}).stabilicum.minBonus)+'% (capped at '+((COUNTRIES[COUNTRY]||{}).stabilicum.senateCap)+')','Stabilicum: oransal + %'+((COUNTRIES[COUNTRY]||{}).stabilicum.minBonus)+' \u00fczeri koalisyona sabit '+((COUNTRIES[COUNTRY]||{}).stabilicum.senateBonus)+' koltuk bonusu (\u00fcst s\u0131n\u0131r '+((COUNTRIES[COUNTRY]||{}).stabilicum.senateCap)+')'):(UP.block?t('block voting · districts = provinces + islands (NUTS3)','blok oylama \u00b7 b\u00f6lgeler = iller + adalar (NUTS3)'):t('74 single-member districts + 126 PR (PR allocated nationally)','74 tek \u00fcyeli b\u00f6lge + 126 oransal (oransal koltuklar ulusal da\u011f\u0131t\u0131l\u0131r)'))):t('approximate model - the upper chamber\u2019s own boundaries/lists differ','yaklaşık model — üst meclisin kendi sınırları/listeleri farklıdır')}`
      :`${seatsTotal} ${T.seats} · ${methodName()}${THRESHOLD>0?` · ${THRESHOLD}% ${T.threshold}`:''}`);
  const cap=showMap?mapCap:archCap;
  // filter provenance under the projection (never for the result view - the
  // result is not "based on" the current poll window)
  const prov=(PARL_MODE==='proj'&&!showMap)?` · ${filtersNote()}`:'';
  // map-as-the-story: the map always visible below the arch (bigMap)
  const mapSection=bigMap?`<div class="card" style="margin-top:14px"><div class="card-head"><div class="bar"></div><div class="t">${T.districtMap}</div>
      <button class="shot-btn" id="map-sec-shot-btn" style="margin-left:auto" title="Download map as PNG">${CAM_ICON}</button></div>
      <div class="parliament-box" id="map-box-sec"></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
        ${mapCap}
      </div></div>`:'';
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${MAP_ONLY?T.map:T.seatProjection}</div></div>
    ${btnRow}
    ${box}
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
      ${cap}${prov}
    </div></div>
  ${mapSection}`;
}

/* ---------- district map (Germany / Sweden) ---------- */
function MAP_CONF(){
  const c=COUNTRIES[COUNTRY];
  if(!c||!c.map) return null;
  if(MAP_LAYER===1&&c.map2) return {...c,...c.map,...c.map2};
  return c.map;
}

function constituencyById(id, conf){
  const store=(conf&&conf.senateStore)?CONSTITUENCIES_SENATE:CONSTITUENCIES;
  if(!store||!store.constituencies) return null;
  return store.constituencies.find(c=>c.id===String(id))||null;
}

// Actual direct-mandate winner of the previous election for a Wahlkreis /
// valkrets, with the state default as fallback
// Shares of a district under a given national avg: uniform swing from the
// district's previous-election baseline; returns per-party {party: {past, now}}.
// When resultMode is true, returns the actual previous election per-district
// results (past === now) so the map shows that election's result.
function districtShares(nr, avg, resultMode, confOverride, regionNoise, districtNoise){
  const conf=confOverride||MAP_CONF();
  let base;
  if(conf.useConstituencies){
    const c=constituencyById(nr, conf);
    if(!c) return null;
    base=c.results_2022||{};
  }else if(conf.wkResults&&conf.wkResults[String(nr)]){
    base=conf.wkResults[String(nr)];
  }else{
    const gArr=conf.districts?conf.districts[String(nr)]:null;
    if(!gArr) return null;
    base=conf.gebiete[gArr];
    // recency-weighted base blend (Portugal 2025+2024, baseBlend): the
    // projection reads the last two elections' per-district geography,
    // while the result views keep the pure last election. A party absent
    // from the previous election holds its last-election baseline (the
    // same hold the noCandidate/pastOnly machinery uses).
    if(!resultMode&&conf.prevGebiete&&conf.baseBlend!==undefined){
      const pv=conf.prevGebiete[gArr];
      if(pv){
        const w=conf.baseBlend, nb={};
        for(const p in base) nb[p]=(pv[p]!==undefined)
          ?base[p]*w+pv[p]*(1-w):base[p];
        base=nb;
      }
    }
    // 2024 European Parliament blend (epBlend): the EP's per-district
    // geography at low weight sharpens the projection's regional pattern
    // (backtest: BG 2023 national -> EP 2024 -> 2024 national triple,
    // vote-weighted regional MAE 2.21 -> 2.06 at w=0.15, every party
    // improved). The result views keep the pure base-election numbers.
    if(!resultMode&&conf.epGebiete&&conf.epBlend!==undefined){
      const pv=conf.epGebiete[gArr];
      if(pv){
        const w=conf.epBlend, nb={...base};
        for(const p in base){
          if(pv[p]!==undefined) nb[p]=base[p]*(1-w)+pv[p]*w;
        }
        base=nb;
      }
    }
  }
  // parties absent from the last election must not appear in the result
  // views (Turkey: YENİ/A/SAADET hold proxy geography for the swing)
  if(resultMode&&conf.proxyParties&&base){
    base={...base};
    conf.proxyParties.forEach(p=>{delete base[p]});
  }
  let nat=conf.national2021||LAST_ELECTION.results;
  // the swing anchor is blended the same way, so past and anchor stay the
  // same election's shares (a mixed pair would distort the swing ratio)
  if(!resultMode&&conf.prevNational&&conf.baseBlend!==undefined){
    const w=conf.baseBlend, nn={};
    for(const p in nat) nn[p]=(conf.prevNational[p]!==undefined)
      ?nat[p]*w+conf.prevNational[p]*(1-w):nat[p];
    nat=nn;
  }
  // the EP blend shifts the swing anchor the same way, so the swing ratio
  // stays coherent with the EP-blended geography above
  if(!resultMode&&conf.epNational&&conf.epBlend!==undefined){
    const w=conf.epBlend, nn={...nat};
    for(const p in nat){
      if(conf.epNational[p]!==undefined)
        nn[p]=nat[p]*(1-w)+conf.epNational[p]*w;
    }
    nat=nn;
  }
  // District swing method (backtested on the 2026 MV/Berlin state elections,
  // 114 Wahlkreise, actual per-district results):
  //   proportional  now = past * (nat_now/nat_past)   MAE 2.29pp, 88% winners
  //   uniform       now = past + (nat_now-nat_past)   MAE 3.18pp, 75% winners
  //   shrunk        now = nat_now + L*(past-nat_past) (config swingShrink)
  // Proportional is the default; a party whose national baseline is tiny
  // (<0.5%) falls back to uniform swing to avoid ratio explosions.
  const method=conf.swingMethod||'proportional';
  const shrink=(conf.swingShrink!==undefined)?conf.swingShrink:0.6;
  // Sub-national polling: a regional adjustment blended into the
  // 2023-based projection (never the base point itself).
  const region=conf.regionOf?conf.regionOf[String(nr)]:null;
  const reg=region&&REGIONAL_AVG[region]?REGIONAL_AVG[region]:null;
  const rbase=region?((conf.regionBase||conf.region2023||conf.region2022||{})[region]||null):null;
  const rw=(conf.regionalBlend!==undefined)?conf.regionalBlend:0.5;
  const out={};
  let sum=0;
  for(const p of PARTY_ORDER){
    const past=base[p]||0;
    let now;
    if(PARTY_META[p]&&PARTY_META[p].pastOnly){
      // dissolved alliances: shown in the 2023 result view, never projected
      now=resultMode?past:0;
    }else if(resultMode||!avg||(avg[p]==null&&!(reg&&reg[p]!==undefined))){
      now=past;
    }else{
      const natP=nat[p]||0, avgP=avg[p]||0;
      // New parties with no past of their own (BC's OneBC, a right-wing split
      // from the Conservatives) inherit a proxy's geographic shape for the
      // swing, so their projected vote concentrates where the parent is
      // strong instead of being flat across every district. A proxy is a
      // single party name or a weighted mix ([['fdi',0.5],['lega',0.5]]).
      const proxSpec=(conf.swingProxy&&conf.swingProxy[p])||null;
      const prox=proxSpec?(Array.isArray(proxSpec)?proxSpec:[[proxSpec,1]]):null;
      const natS=prox?prox.reduce((s,x)=>s+x[1]*(nat[x[0]]||0),0):natP;
      let pastS=prox?prox.reduce((s,x)=>s+x[1]*(base[x[0]]||0),0):past;
      // Confidence-weighted proxy baseline: a borrowed shape is less
      // trustworthy than a real result, so pull it toward the proxy's national
      // share (Poliwave reconstruction: R~ = c*R + (1-c)*A, with A the
      // party's average). c defaults to 0.5 and is configurable per party via
      // swingProxyConfidence.
      if(prox){
        const c=(conf.swingProxyConfidence&&
                 conf.swingProxyConfidence[p]!==undefined)
          ?conf.swingProxyConfidence[p]:0.5;
        pastS=c*pastS+(1-c)*natS;
      }
      let natNow;
      if(method==='geometric'&&pastS>0&&natS>0.5){
        // Geometric mean of log-odds proportional and uniform swing (Poliwave
        // methodology): parameter-free, and it cannot push a stronghold past
        // 100% or a vanished party below zero. Proportional swings explode on
        // small-baseline parties (Reform's 42.6% Great Yarmouth seat scaled by
        // 1.62 would project 68.9%); the log-odds arm approaches the 100% wall
        // instead, and the uniform arm floors at zero.
        const lg=x=>{
          const c=Math.min(99.9,Math.max(0.1,x));
          return Math.log(c/(100-c));
        };
        const prop=100/(1+Math.exp(-(lg(pastS)+lg(avgP)-lg(natS))));
        if(prox){
          // proxy parties measure their baseline in the parent's scale, so
          // the uniform arm (pastS - natS) would go negative and zero them in
          // weak-parent seats; only the bounded proportional arm applies
          natNow=prop;
        }else{
          const uni=Math.max(0,pastS+(avgP-natS));
          natNow=Math.min(100,Math.sqrt(Math.max(0,prop)*uni));
        }
      }else if(method==='proportional'&&natS>0.5){
        natNow=Math.max(0,pastS*(avgP/natS));
      }else if(method==='shrunk'){
        natNow=Math.max(0,avgP+shrink*(pastS-natS));
      }else{
        natNow=Math.max(0,pastS+(avgP-natS));
      }
      now=natNow;
      if(reg&&reg[p]!==undefined&&rw>0&&rbase&&rbase[p]!==undefined){
        const rp=rbase[p]||0;
        const regNow=(rp>0.5)
          ?Math.max(0,past*(reg[p]/rp))
          :Math.max(0,past+(reg[p]-rp));
        now=(1-rw)*natNow+rw*regNow;
      }
    }
    out[p]={past, now};
    sum+=now;
  }
  // Ridings where a party fields no candidate (partial slates: BC's Greens
  // run 73/93, CentreBC 35, OneBC 33): pin its projected share to zero - the
  // historical past stays for the result view, and the renormalization lets
  // the actual candidates absorb the share.
  if(conf.noCandidate&&conf.noCandidate[nr]){
    for(const p of conf.noCandidate[nr]){
      if(out[p]) out[p].now=0;
    }
  }
  // A sitting MLA running as an independent (BC 2026: Peace River North's
  // Jordan Kealy, the 2024 Conservative winner now running alone). The
  // personal vote is projected out of the field; the estimate follows BC's
  // 2024 precedent, where five BC United incumbents running as independents
  // kept 16.3-30.4% of the vote (mean ~22; the previous Peace River North
  // MLA kept 20.2 in this very riding). Set before the renormalization so
  // the ballot parties absorb the shift, and the incumbent boost must not
  // follow a party whose sitting member is off its ticket.
  const indInc=conf.indIncumbents&&conf.indIncumbents[nr];
  if(indInc) out.ind={past:indInc.past||0,
                      now:resultMode?(indInc.past||0):(indInc.now||0),
                      name:indInc.name||''};
  // Result-only list merges (Bulgaria's PP-DB ran as one coalition in 2026,
  // then split into two parliamentary groups): in the result views the
  // component pasts fold into the coalition key
  if(resultMode&&conf.resultMerge){
    for(const src in conf.resultMerge){
      const dst=conf.resultMerge[src];
      if(!out[src]) continue;
      out[dst]=out[dst]||{past:0,now:0};
      out[dst].past+=out[src].past;
      out[dst].now+=out[src].now;
      delete out[src];
    }
  }
  // Incumbent boost (Poliwave): the party that won the seat last time gets a
  // small multiplicative lift for the sitting member's personal vote, or a
  // symmetric deboost when the sitting member is not on the ballot (retired
  // or not renominated - conf.retiringSeats lists those seats, built from the
  // target election's official candidate lists). Applied before the holdSeats
  // override and the renormalization, so the shift stays within the district.
  if(!resultMode&&conf.incumbentBoost){
    const w=districtResultWinner(nr, conf);
    if(w&&out[w]){
      const ret=(conf.retiringSeats&&conf.retiringSeats[nr]===w)||!!indInc;
      out[w].now*=ret?1-conf.incumbentBoost/100:1+conf.incumbentBoost/100;
    }
  }
  // Notional seat holds: the named party keeps its baseline in that seat
  // instead of swinging with the national average (UK: Great Yarmouth stays
  // Restore Britain's after Rupert Lowe's defection).
  const hold=conf.holdSeats&&conf.holdSeats[String(nr)];
  if(hold&&out[hold]) out[hold].now=out[hold].past;
  // Recompute the projected total after the pin/boost/holds: the scaling
  // below divides by it, and the earlier sum predates those adjustments
  // (stale sums left ridings short of 100% - e.g. the no-candidate pin
  // removed a party's share from the numerator but not the denominator).
  sum=0;
  for(const p of PARTY_ORDER){ if(p!=='ind'&&out[p]) sum+=out[p].now||0; }
  // Okrug baselines cover only the modelled parties (unmodelled lists made up
  // the remainder), so renormalize projected shares to the polls' own total for
  // the modelled parties (e.g. ~97.6%) — the leftover stays visible as "Other".
  // (Result mode keeps the official 2023 numbers untouched.)
  let pastSum=0;
  for(const p of PARTY_ORDER) pastSum+=out[p]?out[p].past||0:0;
  const rem=Math.max(0,100-pastSum);
  if(!resultMode){
    let target=0;
    for(const p of PARTY_ORDER){
      if(!(PARTY_META[p]&&PARTY_META[p].pastOnly)&&avg&&avg[p]!==undefined&&avg[p]!==null) target+=avg[p];
    }
    if(!(target>0)||target>100) target=100;
    // an independent incumbent's projected vote comes out of the parties'
    // pool (polls never ask about them): scale the ballot parties to the
    // reduced target while the independent keeps its estimate
    const pollsTarget=target;
    if(out.ind) target=Math.max(0,target-out.ind.now);
    if(sum>0&&Math.abs(sum-target)>0.01){
      const k=target/sum;
      for(const p of PARTY_ORDER){ if(p!=='ind'&&out[p]) out[p].now*=k; }
    }
    out.other={past:rem, now:Math.max(0,100-pollsTarget)};
  }else{
    out.other={past:rem, now:rem};
  }
  // Simulation-only swing errors: shift the two blocs in opposite directions
  // by the region's or the district's drawn deviation (same mechanism as the
  // national bloc swing).
  const shiftBlocs=(d)=>{
    const b1=BLOCS&&BLOCS.bloc1, b2=BLOCS&&BLOCS.bloc2;
    if(!d||!b1||!b2||!b1.parties||!b2.parties) return;
    const t1=b1.parties.reduce((a,p)=>a+(out[p]?out[p].now:0),0);
    const t2=b2.parties.reduce((a,p)=>a+(out[p]?out[p].now:0),0);
    if(t1>0&&t2>0){
      const f1=Math.max(0.05,1+d/t1), f2=Math.max(0.05,1-d/t2);
      for(const p of PARTY_ORDER){
        if(!out[p]) continue;
        if(b1.parties.includes(p)) out[p].now=Math.max(0,out[p].now*f1);
        else if(b2.parties.includes(p)) out[p].now=Math.max(0,out[p].now*f2);
      }
    }
  };
  if(!resultMode){
    if(regionNoise&&conf.regionOf){
      shiftBlocs(regionNoise[conf.regionOf[String(nr)]]||0);
    }
    if(districtNoise){
      shiftBlocs(districtNoise[String(nr)]||0);
    }
  }
  // Japan: the party-support polls carry a large no-party share, so the
  // projected modelled sum would leave a ~50% "other" in every district.
  // With districtNormalize both the past and projected shares are scaled by
  // the same factor so the modelled sum matches the district's historical
  // sum (the no-party/undecided are assumed to break proportionally; the
  // projected winner and the displayed deltas are unchanged in direction).
  // Result mode keeps the exact historical shares.
  if(conf.districtNormalize&&!resultMode){
    let sp=0,sn=0;
    for(const p of PARTY_ORDER){if(out[p]){sp+=out[p].past;sn+=out[p].now;}}
    if(sp>0&&sn>0){
      const k=sp/sn;
      for(const p of PARTY_ORDER){if(out[p]){out[p].past*=k;out[p].now*=k;}}
    }
  }
  // joint lists: projections fold the members into the list party so the map
  // winner, the seat split and the allocators all treat the alliance as one
  // list (history keeps the recorded separate results)
  if(!resultMode&&conf.alliances){
    for(const al of conf.alliances){
      if(al.provinces.indexOf(String(nr))<0) continue;
      const sen=al.parties[0];
      if(!out[sen]) continue;
      for(let i=1;i<al.parties.length;i++){
        const jr=al.parties[i];
        if(out[jr]){
          out[sen].past+=out[jr].past;
          out[sen].now+=out[jr].now;
          delete out[jr];
        }
      }
    }
  }
  return out;
}

// MP seats a party holds from a district (Sweden only):
// - result mode: official 2022 per-constituency seats (mp2022, fasta + utjämningsmandat)
// - projection mode: Sainte-Laguë allocation of the constituency's fasta seats
//   from the current poll avg, honoring the 4% national / 12% valkrets rule
function districtPartySeats(nr, party, avg, resultMode){
  const conf=MAP_CONF();
  if(conf.prDistricts&&conf.prDistricts[nr]){
    if(resultMode){
      const mv=conf.mv2023&&conf.mv2023[nr];
      return mv?(mv[party]||0):0;
    }
    const list=districtSeatSplit(nr, avg, false, conf);
    if(!list) return 0;
    return list.filter(x=>x===party).length;
  }
  if(!conf.useConstituencies) return null;
  // winner-takes-all constituencies (fptp): no per-party MP pills
  if(CONSTITUENCY_RULE==='fptp') return null;
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

function districtWinnerProjection(nr, avg, confOverride, regionNoise, districtNoise){
  const shares=districtShares(nr, avg, false, confOverride, regionNoise, districtNoise);
  if(!shares) return null;
  let best=null,bestV=-1;
  for(const p of PARTY_ORDER){
    if(PARTY_META[p]&&PARTY_META[p].unallocated) continue;
    if(shares[p]&&shares[p].now>bestV){bestV=shares[p].now;best=p}
  }
  return best;
}

// Winner of the previous election in a district: explicit winners map wins,
// else argmax of the official per-district results (wkResults / results_2022)
function districtResultWinner(nr, confOverride){
  const conf=confOverride||MAP_CONF();
  if(conf.winners2021&&conf.winners2021[String(nr)]) return conf.winners2021[String(nr)];
  const shares=districtShares(nr, null, true, conf);
  if(!shares) return null;
  let best=null,bestV=-1;
  // iterate the shares' own keys, not PARTY_ORDER: resultMerge folds the
  // component parties into a coalition key that is not in the order array
  // (France's attal+philippe -> macron, Bulgaria's PP+DB), and the merged
  // key must be able to win its district
  for(const p in shares){
    if(p==='other') continue;
    if(shares[p]&&shares[p].past>bestV){bestV=shares[p].past;best=p}
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
// Seat-based countries (NL/IL): poll averages are in seats, but the election
// map works on vote shares. Approximate the vote share that would yield a
// party's seat count under D'Hondt as the seat-midpoint s+0.5 against the
// scaled house size (SEATS_TOTAL + 0.5*n_seated), so seated parties sum to 100.
function seatAvgToVotes(avg){
  const seated=PARTY_ORDER.filter(p=>avg[p]>0);
  const den=SEATS_TOTAL+0.5*seated.length;
  const out={};
  for(const p of PARTY_ORDER) out[p]=avg[p]>0?(avg[p]+0.5)/den*100:0;
  return out;
}
async function renderMap(avg){
  const box=$('map-box');
  if(!box) return;
  if(SEAT_BASED && PARL_MODE==='proj' && avg) avg=seatAvgToVotes(avg);
  if(MAP_ONLY&&PARL_MODE==='runoff'){
    const ra=runoffMapAvg(avg, FILTERED_POLLS.length?FILTERED_POLLS:POLLS, null);
    const rc=runoffConf(ra);
    if(ra&&rc) return renderMapInto(box, ra, false, rc);
    // no head-to-head polls in the window: never silently fall through to
    // the 2022 result map under a runoff caption
    box.innerHTML='<div style="text-align:center;color:var(--c-text-muted);padding:20px;font-size:12px">'+
      t('No head-to-head polls in this window — widen the time range for a runoff projection.','Bu aralıkta ikinci tur anketi yok — ikinci tur tahmini için zaman aralığını genişletin.')+'</div>';
    return;
  }
  // the upper chamber's own map layer (Italy's 74 Senate districts, Spain's
  // 59 NUTS3 districts) when the Senate mode is active; the conf carries its
  // own structure (useConstituencies for Italy, gebiete for Spain)
  const sen=(COUNTRIES[COUNTRY]||{}).senate;
  if(PARL_MODE==='upper'&&sen){
    return renderMapInto(box, avg, false, sen);
  }
  await renderMapInto(box, avg, PARL_MODE!=='proj');
}

// Two-round presidential runoff map: the per-state 2022 runoff baselines
// (conf.runoff2022) shifted by the national head-to-head average, so the map
// shows the projected runoff winner per state instead of the first round.
function runoffConf(roAvg){
  const c=MAP_CONF();
  const st=(c&&(c.runoff2026||c.runoff2023||c.runoff2022))||null;
  if(st&&c.nationalRunoff){
    const keys=roAvg?Object.keys(roAvg):null;
    let geb=st;
    if(keys&&!keys.every(k=>k in st[Object.keys(st)[0]])){
      const nonLepen=keys.find(k=>k!=='lepen');
      if(nonLepen==='attal'||nonLepen==='philippe'){
        // France: the 2022 baselines are keyed {camp, lepen}; 'camp'
        // (Macron) is remapped onto the pairing's camp member - in the
        // per-department baselines AND the national anchor, because the
        // swing reads the anchor per party: a missing key reads 0, kills
        // the proportional arm and the uniform fallback adds the whole
        // runoff average (+40pp) to every department
        geb={};
        for(const nr in st){
          const src=st[nr];
          const row={};
          keys.forEach(k=>{
            row[k]=src[k]!==undefined?src[k]:
                   (src.camp!==undefined?src.camp:0);
          });
          geb[nr]=row;
        }
        const nat={};
        keys.forEach(k=>{
          nat[k]=c.nationalRunoff[k]!==undefined?c.nationalRunoff[k]:
                 (c.nationalRunoff.camp!==undefined?c.nationalRunoff.camp:0);
        });
        // 2024 EP geography (runoff2024): blend the camp-vs-RN two-way
        // shares into both the per-department baselines and the anchor
        // (runoffBlend, default 0.5) - the 2022 runoff is the last real
        // runoff, the 2024 EP the most recent measurement of the same blocs
        if(c.runoff2024&&c.nationalRunoff2024){
          const w=(c.runoffBlend!==undefined)?c.runoffBlend:0.5;
          const map24=(src,k)=>src[k]!==undefined?src[k]:
                              (src.camp!==undefined?src.camp:0);
          for(const nr in geb){
            const s=c.runoff2024[nr];
            if(!s) continue;
            const row=geb[nr];
            for(const k in row) row[k]=(1-w)*row[k]+w*map24(s,k);
          }
          for(const k in nat) nat[k]=(1-w)*nat[k]+w*map24(c.nationalRunoff2024,k);
        }
        return {...c, gebiete:geb, national2021:nat};
      }
      // a left candidate does not inherit the president's runoff
      // geography: fall back to the first-round map
      return {...c};
    }
    return {...c, gebiete:geb, national2021:c.nationalRunoff};
  }
  if(roAvg) return {...c};   // first-round geography, moved by the runoff
  return null;
}

function runoffMapAvg(avg, filtered, sim){
  const ro=runoffForecast(avg, filtered, sim);
  return ro?{[ro.a]:ro.aN, [ro.b]:ro.bN} : null;
}

// Per-district seat split for the seat-circle overlay. Countries whose map
// districts elect several seats get one dot per seat: Spain/Poland from
// conf.seatDistricts (per-district D'Hondt), Latvia/Estonia/Austria from a
// conf.seatDots block, Czechia's map2 regions from conf.regions (first
// scrutiny, LR-Imperiali). Returned grouped by party, largest first.
// Super-proportional seat split used by the Spain Senate block-vote model
// (and its map dots): n seats from party shares with exponent ~2, largest
// remainder - reproduces 3-1, 2-2, 4-0 and island 3-1-1 patterns.
function blockVoteSeats(n, votes){
  const seats={};
  // keys come from the caller's vote map, not PARTY_ORDER: senate
  // coalitions pass pooled keys ('al:psoe+sumar') that must take part in
  // the block vote
  const ex=Object.keys(votes).map(p=>[p,Math.pow((votes[p]||0)/100,2)])
    .filter(x=>x[1]>0);
  if(!ex.length) return null;
  const tot=ex.reduce((a,x)=>a+x[1],0)||1;
  const q=ex.map(x=>({p:x[0],exact:n*x[1]/tot}));
  q.forEach(x=>{x.seat=Math.floor(x.exact)});
  let g=q.reduce((a,x)=>a+x.seat,0);
  q.sort((a,b)=>(b.exact-Math.floor(b.exact))
    -(a.exact-Math.floor(a.exact)));
  for(let i=0;g<n;i++,g++) q[i%q.length].seat++;
  q.forEach(x=>{seats[x.p]=x.seat});
  return seats;
}

function districtSeatSplit(nr, avg, resultMode, conf){
  const dots=conf.seatDots;
  let seatsN=null, votes={}, method='dhondt', valid=null;
  // the real last-election seat counts per district (Turkey's mv2023):
  // exact, and immune to the proxy geography the projection uses
  if(resultMode&&conf.mv2023&&conf.mv2023[nr]){
    const mv=conf.mv2023[nr];
    const arr=[];
    PARTY_ORDER.forEach(p=>{for(let i=0;i<(mv[p]||0);i++) arr.push(p)});
    return arr.length?arr:null;
  }
  const natBase=resultMode?(conf.national2021||LAST_ELECTION.results):avg;
  if(conf.blockVote&&conf.seatDistricts&&conf.seatDistricts[nr]){
    // Spain Senate: block voting, no threshold - the dot split must match
    // the diagram's super-proportional rule, not D'Hondt
    seatsN=conf.seatDistricts[nr];
    const shares=districtShares(nr, avg, resultMode, conf);
    if(!shares) return null;
    PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?(resultMode?shares[p].past:shares[p].now):0});
    // senate coalitions (conf.alliances) pool exactly like the diagram's
    // allocateUpper: members' district votes join, the block vote allocates
    // to the pooled list, and the won seats split among members by their
    // district shares - so the dots always agree with the arch
    let groups=PARTY_ORDER.map(p=>({key:p,parties:[p],votes:votes[p]||0}));
    for(const a of (conf.alliances||[])){
      if(a.provinces.indexOf(nr)<0) continue;
      const members=a.parties.filter(p=>groups.some(g=>g.key===p));
      if(members.length<2) continue;
      const pooled=members.reduce((s,p)=>s+(votes[p]||0),0);
      groups=groups.filter(g=>members.indexOf(g.key)<0);
      groups.push({key:'al:'+members.join('+'),parties:members,votes:pooled});
    }
    const gvotes={};
    groups.forEach(g=>{gvotes[g.key]=g.votes});
    const split=blockVoteSeats(seatsN, gvotes);
    if(!split) return null;
    const arr=[];
    for(const k of Object.keys(split)){
      const g=groups.find(x=>x.key===k);
      const cnt=split[k];
      if(!g||!cnt) continue;
      if(g.parties.length===1){
        for(let i=0;i<cnt;i++) arr.push(g.parties[0]);
        continue;
      }
      const tot=g.parties.reduce((s,p)=>s+(votes[p]||0),0)||1;
      const q=g.parties.map(p=>({p,exact:cnt*(votes[p]||0)/tot}));
      q.forEach(x=>{x.fl=Math.floor(x.exact)});
      let given=q.reduce((a2,x)=>a2+x.fl,0);
      q.sort((a2,b2)=>(b2.exact-Math.floor(b2.exact))-(a2.exact-Math.floor(a2.exact)));
      for(let i2=0;given<cnt&&i2<q.length*2;i2++,given++) q[i2%q.length].fl++;
      q.forEach(x=>{for(let i=0;i<x.fl;i++) arr.push(x.p)});
    }
    return arr;
  }
  if(conf.levelingSeats&&conf.seatDistricts&&conf.seatDistricts[nr]){
    // Norway: district tier of the two-tier Storting model - modified
    // Sainte-Lague (1.4 first divisor), no threshold: parties below the
    // national 4% still win district seats (V 2025)
    const split=districtTierSplit(nr, avg, resultMode, conf,
                                  conf.seatDistricts[nr]);
    if(!split) return null;
    const arr=[];
    PARTY_ORDER.forEach(p=>{
      for(let i=0;i<(split[p]||0);i++) arr.push(p);
    });
    return arr;
  }
  if(conf.seatDistricts&&conf.seatDistricts[nr]){
    seatsN=conf.seatDistricts[nr];
    method=SEAT_METHOD;
    const shares=districtShares(nr, avg, resultMode, conf);
    if(!shares) return null;
    PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?(resultMode?shares[p].past:shares[p].now):0});
    const dth=(conf.districtThreshold!==undefined)?conf.districtThreshold
      :!!((COUNTRIES[COUNTRY]||{}).districtThreshold);
    valid=PARTY_ORDER.filter(p=>(votes[p]||0)>0
      &&!(PARTY_META[p]&&PARTY_META[p].unallocated)
      &&((dth?votes[p]:(natBase&&natBase[p]||0))>=THRESHOLD));
  }else if(conf.regions&&conf.regions[nr]){
    // Czechia: the map2 regions carry their own shares and seats
    const r=conf.regions[nr];
    seatsN=r.seats;
    const nat=conf.national2021||LAST_ELECTION.results;
    PARTY_ORDER.forEach(p=>{
      votes[p]=Math.max(0,(r.results[p]||0)+(resultMode?0:((avg&&avg[p]||0)-(nat[p]||0))));
    });
    method='imperiali';
    valid=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].unallocated)
      &&((resultMode?(natBase&&natBase[p]||0):(avg&&avg[p]||0))||0)>=THRESHOLD);
  }else if(conf.prDistricts&&conf.prDistricts[nr]){
    // Turkey: plain per-district D'Hondt; an alliance clearing the 7%
    // threshold exempts its members (MHP/BBP via Cumhur, TIP via Emek)
    seatsN=conf.prDistricts[nr];
    method='dhondt';
    const shares=districtShares(nr, avg, resultMode, conf);
    if(!shares) return null;
    PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?(resultMode?shares[p].past:shares[p].now):0});
    const c=COUNTRIES[COUNTRY]||{};
    const alliances=c.alliances||{};
    const exempt={};
    Object.keys(alliances).forEach(a=>{
      const nat=alliances[a].reduce((s,p)=>s+((avg&&avg[p])||0),0);
      if(nat>=THRESHOLD) alliances[a].forEach(p=>{exempt[p]=true});
    });
    valid=PARTY_ORDER.filter(p=>(votes[p]||0)>0
      &&!(PARTY_META[p]&&PARTY_META[p].unallocated)
      &&(exempt[p]||((natBase&&natBase[p]||0)>=THRESHOLD)));
  }else if(dots&&dots.seats){
    // nr is the raw path id; the seats are keyed by the district's gebiet key
    const gKey=(conf.districts&&conf.districts[String(nr)])||String(nr);
    if(!dots.seats[gKey]) return null;
    seatsN=dots.seats[gKey];
    method=dots.method||'dhondt';
    const shares=districtShares(nr, avg, resultMode, conf);
    if(!shares) return null;
    PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?(resultMode?shares[p].past:shares[p].now):0});
    valid=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].unallocated)
      &&((resultMode?(natBase&&natBase[p]||0):(avg&&avg[p]||0))||0)>=THRESHOLD);
  }else{
    return null;
  }
  if(!seatsN||!valid||!valid.length) return null;
  const seats={};
  if(method==='hare'||method==='hare_niemeyer'||method==='imperiali'){
    const total=valid.reduce((a,p)=>a+(votes[p]||0),0);
    if(!(total>0)) return null;
    const quota=total/(method==='imperiali'?seatsN+2:seatsN);
    const rems=[];
    let given=0;
    valid.forEach(p=>{
      const q=(votes[p]||0)/quota, fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    if(given>seatsN){
      // Imperiali can over-allocate: trim the smallest remainders
      rems.sort((a,b)=>a[0]-b[0]);
      let over=given-seatsN, i=0;
      while(over>0&&i<rems.length){
        const p=rems[i][1];
        if(seats[p]>0){seats[p]--;over--}
        i++;
      }
    }else{
      rems.sort((a,b)=>b[0]-a[0]);
      const left=seatsN-given;
      for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    }
  }else{
    const quo=[];
    valid.forEach(p=>{
      for(let d=1;d<=seatsN;d++){
        const div=method==='dhondt'?d
          :(method==='sainte_lague_standard'?(2*d-1):(d===1?1.2:2*d-1));
        quo.push({p,q:(votes[p]||0)/div});
      }
    });
    quo.sort((a,b)=>b.q-a.q);
    for(let i=0;i<seatsN&&i<quo.length;i++) seats[quo[i].p]=(seats[quo[i].p]||0)+1;
  }
  const list=[];
  Object.entries(seats).sort((a,b)=>b[1]-a[1]).forEach(([p,n])=>{
    for(let i=0;i<n;i++) list.push(p);
  });
  return list;
}

// Dot anchor for a district path: the interior point farthest from the
// polygon edges ("pole of inaccessibility", found on a coarse grid) plus its
// clearance. The area centroid lands outside annular regions (Central
// Bohemia wraps around Prague) or in the sea (island groups), and the
// clearance lets the cluster shrink to stay inside small districts (Warsaw,
// Tallinn's districts). All rings of the path are used, so holes count as
// outside.
function dotAnchor(ph){
  const d=ph.getAttribute('d')||'';
  const rings=[];
  d.split(/[Mm]/).forEach(seg=>{
    const pts=[];
    const re=/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
    let m;
    while((m=re.exec(seg))) pts.push([parseFloat(m[1]),parseFloat(m[2])]);
    if(pts.length>=3) rings.push(pts);
  });
  if(!rings.length) return null;
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  rings.forEach(ring=>ring.forEach(([x,y])=>{
    if(x<minX)minX=x; if(x>maxX)maxX=x;
    if(y<minY)minY=y; if(y>maxY)maxY=y;
  }));
  const w=maxX-minX, h=maxY-minY;
  // subsample long rings: placement does not need full resolution
  const simple=rings.map(ring=>{
    if(ring.length<=160) return ring;
    const step=Math.ceil(ring.length/160), out=[];
    for(let i=0;i<ring.length;i+=step) out.push(ring[i]);
    return out;
  });
  const inside=(x,y)=>{
    let hit=false;
    simple.forEach(ring=>{
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const [xi,yi]=ring[i], [xj,yj]=ring[j];
        if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) hit=!hit;
      }
    });
    return hit;
  };
  const clearance=(x,y)=>{
    let dmin=1e18;
    simple.forEach(ring=>{
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const [x1,y1]=ring[i], [x2,y2]=ring[j];
        const dx=x2-x1, dy=y2-y1;
        const t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy||1)));
        const ex=x1+t*dx-x, ey=y1+t*dy-y;
        const dd=ex*ex+ey*ey;
        if(dd<dmin)dmin=dd;
      }
    });
    return Math.sqrt(dmin);
  };
  const N=12;
  let px=(minX+maxX)/2, py=(minY+maxY)/2, pd=0;
  for(let i=1;i<N;i++){
    for(let j=1;j<N;j++){
      const x=minX+w*i/N, y=minY+h*j/N;
      if(!inside(x,y)) continue;
      const dd=clearance(x,y);
      if(dd>pd){pd=dd;px=x;py=y}
    }
  }
  return {px,py,pd,w,h};
}

// Seat circles: one dot per seat inside each multi-member district, coloured
// by the party that won it and grouped in a compact grid at the district's
// anchor point.
function zoomProvince(svg, box, ph){
  const id=ph.getAttribute('id')||'';
  const prov=id.split('-')[0];
  if(!prov) return;
  const all=svg.querySelectorAll('path[id^="'+prov+'-"]');
  let x0=1e9, y0=1e9, x1=-1e9, y1=-1e9, any=false;
  all.forEach(p2=>{
    const b2=p2.getBBox();
    if(b2.width||b2.height){
      any=true;
      if(b2.x<x0)x0=b2.x; if(b2.y<y0)y0=b2.y;
      if(b2.x+b2.width>x1)x1=b2.x+b2.width;
      if(b2.y+b2.height>y1)y1=b2.y+b2.height;
    }
  });
  if(!any) return;
  if(!svg.dataset.ovb) svg.dataset.ovb=svg.getAttribute('viewBox')||'';
  const pad=Math.max(3,(x1-x0)*0.04);
  svg.setAttribute('viewBox', (x0-pad).toFixed(1)+' '+(y0-pad).toFixed(1)
    +' '+((x1-x0)+2*pad).toFixed(1)+' '+((y1-y0)+2*pad).toFixed(1));
  let back=box.querySelector('.map-zoom-back');
  if(!back){
    back=document.createElement('button');
    back.type='button';
    back.className='map-zoom-back';
    back.style.cssText='position:absolute;top:6px;left:6px;z-index:6;'
      +'padding:4px 10px;font:700 11px inherit;border:1.5px solid '
      +'currentColor;background:#fff;color:#000;cursor:pointer';
    back.textContent='\u25C0 T\u00FCrkiye';
    back.addEventListener('click',()=>{
      svg.setAttribute('viewBox', svg.dataset.ovb||'');
      back.style.display='none';
    });
    box.appendChild(back);
  }
  back.style.display='';
}

function drawSeatDots(svg, mapped, avg, resultMode, conf){
  const NS='http://www.w3.org/2000/svg';
  const g=document.createElementNS(NS,'g');
  g.setAttribute('class','seat-dots');
  // inset groups (e.g. Athens on Greece) carry a transform: dots appended
  // to the root are mapped through each path's cumulative transform
  let rootM=null;
  try{ const sm=svg.getScreenCTM(); if(sm) rootM=sm.inverse(); }catch(e){}
  const pathM=(ph)=>{
    try{
      const pm=ph.getScreenCTM();
      if(rootM&&pm) return rootM.multiply(pm);
    }catch(e){}
    return null;
  };
  const toRoot=(mt,x,y)=>{
    if(!mt) return [x,y];
    const p=svg.createSVGPoint(); p.x=x; p.y=y;
    const q=p.matrixTransform(mt);
    return [q.x,q.y];
  };
  mapped.forEach(({nr,ph})=>{
    const list=districtSeatSplit(nr, avg, resultMode, conf);
    if(!list||!list.length) return;
    const anc=dotAnchor(ph);
    if(!anc) return;
    const n=list.length;
    const cols=Math.min(7,Math.max(1,Math.ceil(Math.sqrt(n))));
    const rows=Math.ceil(n/cols);
    // fit the cluster inside the anchor's clearance when the district is
    // small; cap the dot size in large districts
    const fit=anc.pd>0?(anc.pd*0.9)/(1.075*Math.max(cols,rows)):3.4;
    const r=Math.max(1.1,Math.min(4.2,fit));
    const sp=2.15*r;
    // the grid is built at the map's own scale (identical for inset and
    // main paths); only the ANCHOR is transformed into root space, so the
    // inset copies get the same dot size as everywhere else
    const _mt=pathM(ph);
    const _a2=toRoot(_mt, anc.px, anc.py);
    const x0=_a2[0]-(cols-1)*sp/2, y0=_a2[1]-(rows-1)*sp/2;
    list.forEach((p,i)=>{
      const c=document.createElementNS(NS,'circle');
      c.setAttribute('cx',(x0+(i%cols)*sp).toFixed(2));
      c.setAttribute('cy',(y0+Math.floor(i/cols)*sp).toFixed(2));
      c.setAttribute('r',r.toFixed(2));
      c.setAttribute('fill',partyColor(p,conf));
      c.setAttribute('stroke','#ffffff');
      c.setAttribute('stroke-width','0.7');
      c.setAttribute('pointer-events','none');
      g.appendChild(c);
    });
  });
  if(g.childNodes.length) svg.appendChild(g);
}

async function renderMapInto(box, avg, resultMode, confOverride){
  const conf=confOverride||MAP_CONF();
  if(!conf) return;
  if(!MAP_CACHE[conf.svg]){
    try{
      // bust the browser/CDN cache with the app's own build token, so a
      // rebuilt map svg reaches browsers on the next release
      const resp=await fetch(dataBase()+conf.svg+'?v='+ASSET_V);
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
  // very tall maps (Israel's 1:3 aspect) render enormous at full width:
  // a per-map max-height keeps them small and centered
  if(conf.maxHeight) svg.style.maxHeight=conf.maxHeight+'px';
  let selector;
  if(conf.selector==='class') selector='path[class^="wk"]';
  else if(conf.selector==='label') selector='path[data-label]';
  else if(conf.selector==='id') selector='path[id]';
  else selector='path[id^="_"]';
  const paths=svg.querySelectorAll(selector);
  const mapped=[];
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
    // invisible district outlines under an ilçe base map: only pushed as
    // seat-circle anchors (dotAnchor parses their d)
    if((ph.getAttribute('class')||'')==='seat-area') return;
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
    if(conf.seatDistricts||conf.seatDots||conf.prDistricts) mapped.push({nr,ph});
    const shares=districtShares(nr, avg, resultMode, conf);
    if(!shares) return;
    const blocMode=MAP_COLOR==='bloc'&&!conf.hideBlocToggle&&BLOCS.bloc1&&BLOCS.bloc2;
    const blocTotals=blocMode?districtBlocTotals(shares):null;
    // RESULT mode: official per-district winners (winners2021 map / wkResults
    // argmax / per-constituency 2022), else the uniform-swing projection.
    // Bloc mode colors by the leading bloc instead.
    let winner;
    if(blocMode){
      winner=leadingBloc(blocTotals,resultMode?'past':'now');
    }else{
      winner=resultMode
        ?(districtResultWinner(nr,conf)||districtWinnerProjection(nr,LAST_ELECTION.results,conf))
        :districtWinnerProjection(nr,avg,conf);
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
      const pastWinner=districtResultWinner(nr,conf)||districtWinnerProjection(nr,LAST_ELECTION.results,conf);
      const nowWinner=resultMode?pastWinner:districtWinnerProjection(nr,avg,conf);
      // Result mode: order rows by the official seat outcome (so a dissolved-but-large
  // list like SPN sits above smaller parties); otherwise by projected share.
  // Dissolved alliances (pastOnly) appear in the 2023 result view only.
      const sortKey=(p)=> (resultMode&&LAST_ELECTION.seats)?(LAST_ELECTION.seats[p]||0):(shares[p]?shares[p].now:0);
      // joint lists: in allied provinces the members render as ONE row under
      // the list's own name (pooled share), never as separate party rows
      const alHere=(conf.alliances||[]).filter(a=>a.provinces.indexOf(String(nr))>=0&&a.parties.length>1);
      const alMember={};
      alHere.forEach(a=>a.parties.forEach(p=>{alMember[p]=a}));
      const rowArr=PARTY_ORDER.slice().filter(p=>!alMember[p]&&!((PARTY_META[p]||{}).pastOnly&&!resultMode)).sort((a,b)=> (sortKey(b)-sortKey(a)) || ((shares[b]?shares[b].now:0)-(shares[a]?shares[a].now:0))).map(p=>{
        const s=shares[p];
        if(!s) return '';
        const seatNr=(conf.ilceDistrict&&conf.ilceDistrict[nr])||nr;
        const pSeats=districtPartySeats(seatNr,p,avg,resultMode);
        // hide parties at 0.0% (unless they still hold a seat pill)
        if(!((resultMode?s.past:s.now)>=0.05||pSeats>0)) return '';
        const delta=s.now-s.past;
        const col=partyColor(p,conf);
        const barW=Math.max(2,Math.min(100,s.now));
        const pill=pSeats!==null&&pSeats>0?`<span class="map-tip-pill">${pSeats}</span>`:'';
        // no delta for parties that did not contest the last election
        const noDelta=(conf.proxyParties||[]).indexOf(p)>=0;
        const dTxt=noDelta?'':(delta>0.05?'▲':(delta<-0.05?'▼':''))+(Math.abs(delta)<0.05?'':pct(Math.abs(delta)));
        const dCls=noDelta?'flat':(delta>0.05?'up':(delta<-0.05?'down':'flat'));
        return {v:(resultMode?s.past:s.now), html:`<div class="map-tip-row">
          <span class="map-tip-code" style="color:${col}"${s.name?` title="${s.name}"`:''}>${partyLabel(p,conf)}${pill}</span>
          <div class="map-tip-track"><div class="map-tip-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="map-tip-now">${pct(s.now)}</span>
          <span class="map-tip-delta ${dCls}">${dTxt}</span>
        </div>`};
      }).filter(x=>x);
      // joint lists: one row per coalition, named by its members, carrying
      // the pooled share (the list competes as a whole in the calculation)
      for(const al of alHere){
        const mem=al.parties.filter(p=>shares[p]);
        if(!mem.length) continue;
        const sv=shares[al.parties[0]];
        const pv=sv?(resultMode?(sv.past||0):(sv.now||0))
          :mem.reduce((a2,p)=>a2+(resultMode?(shares[p].past||0):(shares[p].now||0)),0);
        if(pv<0.05) continue;
        const col=al.color||partyColor(al.parties[0],conf);
        const dls=(sv&&!resultMode)?((sv.now||0)-(sv.past||0))
          :mem.reduce((a2,p)=>a2+(resultMode?0:((shares[p].now||0)-(shares[p].past||0))),0);
        rowArr.push({v:pv, html:`<div class="map-tip-row">
          <span class="map-tip-code" style="color:${col}" title="${mem.map(p=>PARTY_META[p]?PARTY_META[p].name:p).join(' + ')}">${al.name||partyLabel(al.parties[0],conf)}</span>
          <div class="map-tip-track"><div class="map-tip-fill" style="width:${Math.max(2,Math.min(100,pv))}%;background:${col}"></div></div>
          <span class="map-tip-now">${pct(pv)}</span>
          <span class="map-tip-delta ${dls>0.05?'up':(dls<-0.05?'down':'flat')}">${resultMode?'':(dls>0.05?'▲':(dls<-0.05?'▼':''))+(Math.abs(dls)<0.05?'':pct(Math.abs(dls)))}</span>
        </div>`});
      }
      rowArr.sort((a2,b2)=>b2.v-a2.v);
      let rows=rowArr.map(x=>x.html).join('');
      // unmodelled 2023 lists (remainder), past column only; shown whenever
      // either side is nonzero so the district always adds to 100%
      if(shares.other&&(shares.other.past>0.05||shares.other.now>0.05)){
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
    if(conf.ilceDistrict) ph.addEventListener('click',()=>zoomProvince(svg, box, ph));
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
  // seat circles for multi-member district maps (Spain/Poland); drawn after
  // the SVG is in the DOM so getBBox() has layout
  if((conf.seatDistricts||conf.seatDots||conf.prDistricts)&&mapped.length) drawSeatDots(svg, mapped, avg, resultMode, conf);
}

/* ---------- screenshot capture ---------- */
const CAM_ICON=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
const COPY_ICON=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;

function downloadPng(dataUrl, name){
  const a=document.createElement('a');
  a.href=dataUrl;
  a.download=name;
  a.click();
}// Map: render the SVG at its viewBox size (x2 for sharpness) onto a transparent
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

// ---------- poster: dark landscape shareable projection ----------
// 1600x900 dark card in the "Seçim Projeksiyonu" style: party rows with logo
// tiles + shares + seats, first-place / coalition / runoff probability tiles,
// the parliament arc and the coloured district map - both rasterized from
// the SVGs already on screen, so the poster matches the page.
function posterTextColor(hex){
  const h=(hex||'#888888').replace('#','');
  const r=parseInt(h.slice(0,2),16)||0, g=parseInt(h.slice(2,4),16)||0,
        b=parseInt(h.slice(4,6),16)||0;
  // white on everything saturated; dark only on genuinely pale fills
  // (the reference keeps white on salmon/orange bars)
  return (0.299*r+0.587*g+0.114*b)>185?'#111111':'#FFFFFF';
}
function loadImg(src){
  return new Promise(res=>{
    if(!src){res(null);return}
    const i=new Image();
    i.onload=()=>res(i); i.onerror=()=>res(null);
    i.src=src;
  });
}
function svgElementToImg(svg, brightText){
  return new Promise(res=>{
    if(!svg){res(null);return}
    const clone=svg.cloneNode(true);
    const vb=svg.viewBox&&svg.viewBox.baseVal;
    if(vb&&vb.width){
      if(!clone.getAttribute('width')) clone.setAttribute('width',vb.width);
      if(!clone.getAttribute('height')) clone.setAttribute('height',vb.height);
    }
    if(brightText){
      // the parliament arc's labels and the zoom-inset frames are dark on the
      // light site; on the dark poster they need to be white
      clone.querySelectorAll('text').forEach(t=>{
        t.setAttribute('fill','#FFFFFF');
        if(t.getAttribute('style')) t.removeAttribute('style');
      });
      clone.querySelectorAll('rect[stroke="#111827"]').forEach(r=>{
        r.setAttribute('stroke','#FFFFFF');
        r.setAttribute('opacity','1');
      });
    }
    const xml=new XMLSerializer().serializeToString(clone);
    const i=new Image();
    i.onload=()=>res(i); i.onerror=()=>res(null);
    i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
  });
}
// Word-boundary ellipsis: drop whole words before characters so labels never
// cut mid-word ("Conservatism (Canadian)" -> "Conservatism…", not "(Canad…").
function ellipsizeText(txt, maxW, ctx){
  if(ctx.measureText(txt).width<=maxW) return txt;
  let t=txt;
  while(t.length>2){
    const sp=t.lastIndexOf(' ');
    t=sp>2?t.slice(0,sp).replace(/\s+$/,'') :t.slice(0,-1);
    if(ctx.measureText(t+'\u2026').width<=maxW) return t+'\u2026';
  }
  return '\u2026';
}

// Pick the ideology item that best describes the party: prefer the
// recognisable ideological families over niche descriptors (Kahanism,
// Ashkenazi) or interest labels, exact matches first, then substrings, then
// whatever the infobox listed first.
const IDEO_PRIORITY=[
  'social democracy','democratic socialism','socialism','communism',
  'social liberalism','liberalism','libertarianism','conservatism',
  'christian democracy','christian right','national conservatism',
  'social conservatism','liberal conservatism','fiscal conservatism',
  'right-wing populism','left-wing populism','populism','nationalism',
  'independence','regionalism','sovereigntism','federalism',
  'green politics','environmentalism','agrarianism','centrism',
  'progressivism','social market economy','civic nationalism',
  'economic liberalism','secularism','zionism','islamism',
  'religious conservatism','religious zionism'
];
function pickIdeology(str){
  const items=String(str||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!items.length) return '';
  // drop trailing disambiguation parentheticals: "Liberalism (German)" reads
  // as "Liberalism" on a poster
  const clean=items.map(s=>{
    const t=s.replace(/\s*\([^)]*\)\s*$/,'').trim();
    return t||s;
  });
  const low=clean.map(s=>s.toLowerCase());
  // infoboxes list the party's primary ideology first, so scan the party's
  // own items in order and only use the priority list to skip niche
  // descriptors (Kahanism, Ashkenazi, Factions:) - scanning the priority
  // first wrongly gave ACT "Conservatism" over "Classical liberalism"
  for(let i=0;i<low.length;i++){
    for(const term of IDEO_PRIORITY){
      if(low[i]===term||low[i].includes(term)) return clean[i];
    }
  }
  return clean[0];
}

async function renderPoster(opts){
  const W=1600,H=900,S=2;
  const canvas=document.createElement('canvas');
  canvas.width=W*S; canvas.height=H*S;
  const ctx=canvas.getContext('2d');
  ctx.scale(S,S);
  const FONT='"Source Code Pro","Archivo Narrow",monospace';
  const MONO=FONT;
  // make sure the mono weights are actually loaded before drawing text
  if(document.fonts&&document.fonts.load){
    await Promise.all(['400','500','600','700','800','900'].map(w=>
      document.fonts.load(w+' 16px "Source Code Pro"').catch(()=>{})));
  }
  ctx.fillStyle='#111111';
  ctx.fillRect(0,0,W,H);

  // title (top right), shrunk to fit the right half
  ctx.fillStyle='#FFFFFF';
  ctx.textAlign='right';
  ctx.textBaseline='alphabetic';
  let titleSize=56;
  const titleTxt=String(opts.title||'');
  ctx.font='700 '+titleSize+'px '+FONT;
  while(titleSize>28&&ctx.measureText(titleTxt).width>W-40-700){
    titleSize-=2;
    ctx.font='700 '+titleSize+'px '+FONT;
  }
  ctx.fillText(titleTxt,W-40,84);
  ctx.font='italic 700 25px '+FONT;
  ctx.fillStyle='#DDDDDD';
  ctx.fillText(opts.subtitle||'',W-40,124);

  const rows=opts.rows||[];
  const grid=opts.grid||[];
  const logos=await Promise.all(rows.concat(grid).map(r=>loadImg(r.logo)));
  const arcImg=await svgElementToImg(opts.arcSvg,true);
  const mapImg=await svgElementToImg(opts.mapSvg,true);

  const X=40, barW=420;
  // consistent spacing across every country: the box always leaves a 10px
  // gap inside its row slot; rows give height back when a grid must also fit
  // so the small boxes can be as tall as possible
  const RH=grid.length?(rows.length>=6?80:90):96;
  const TH=RH-10;
  const totalW=TH+6+barW+8+92;
  const drawTile=(r,lg,yy,th)=>{
    ctx.fillStyle=r.color;
    ctx.fillRect(X,yy,th,th);
    if(lg){
      ctx.save();
      ctx.beginPath();
      ctx.rect(X,yy,th,th);
      ctx.clip();
      try{ctx.filter='brightness(0) invert(1)'}catch(e){}
      // the logos are already square-adjusted: fill the tile, never shrink
      const sc=Math.max(th/lg.width, th/lg.height);
      ctx.drawImage(lg,X+(th-lg.width*sc)/2,yy+(th-lg.height*sc)/2,
        lg.width*sc,lg.height*sc);
      ctx.restore();
    }else{
      ctx.fillStyle=posterTextColor(r.color);
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='700 '+Math.round(th*0.32)+'px '+FONT;
      ctx.fillText(r.code||'',X+th/2,yy+th/2);
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    }
  };
  // one delta column for every row: measure the widest vote/seat delta so
  // the shares and seats right-align in a single column and the deltas
  // left-align in their own
  ctx.font='700 16px '+MONO;
  let colW=0;
  rows.forEach(r=>{
    if(r.dvText) colW=Math.max(colW,ctx.measureText(r.dvText).width);
  });
  ctx.font='700 14px '+MONO;
  rows.forEach(r=>{
    if(r.dsText) colW=Math.max(colW,ctx.measureText(r.dsText).width);
  });
  colW=colW>0?Math.ceil(colW)+6:0;

  let y=40;
  rows.forEach((r,i)=>{
    const th=TH;
    drawTile(r,logos[i],y,th);
    const bx=X+th+6;
    ctx.fillStyle=r.color;
    ctx.fillRect(bx,y,barW,th);
    const tc=posterTextColor(r.color);
    ctx.fillStyle=tc;
    // numbers right-align in one column, deltas left-align in the next, both
    // lines sharing baselines (share+vote delta at 46, seats+seat delta at 74)
    const numX=bx+barW-14-(colW?colW+10:0);
    // baselines scale with the box height so short boxes (six+ rows) never
    // push the text against their bottom edge
    const b1=y+Math.round(th*0.53), b2=y+Math.round(th*0.86);
    ctx.textAlign='right';
    ctx.font='700 36px '+MONO;
    const shareW=ctx.measureText(r.shareText||'').width;
    ctx.fillText(r.shareText||'',numX,b1);
    if(r.seatsText){
      ctx.font='700 22px '+MONO;
      ctx.fillText(r.seatsText,numX,b2);
    }
    if(r.dvText||r.dsText){
      ctx.textAlign='left';
      if(r.dvText){
        ctx.font='700 16px '+MONO;
        ctx.fillText(r.dvText,bx+barW-14-colW,b1);
      }
      if(r.dsText){
        ctx.font='700 14px '+MONO;
        ctx.fillText(r.dsText,bx+barW-14-colW,b2);
      }
    }
    ctx.textAlign='left';
    const nameTxt=String(r.name||'').toUpperCase();
    const nameAvail=numX-(bx+14)-14;
    let nsize=Math.min(40,Math.round(th*0.47));
    ctx.font='700 '+nsize+'px '+FONT;
    while(nsize>22&&ctx.measureText(nameTxt).width>nameAvail){
      nsize-=2;
      ctx.font='700 '+nsize+'px '+FONT;
    }
    ctx.fillText(nameTxt,bx+14,b1);
    // ideology: the best-fitting item at a fixed size, word-boundary
    // ellipsised when long; baseline shared with the seats
    if(r.ideology){
      ctx.font='700 13px '+FONT;
      ctx.fillText(ellipsizeText(pickIdeology(r.ideology),nameAvail,ctx),
        bx+14,b2);
    }
    if(r.firstText){
      const fx=bx+barW+8, fw=92;
      ctx.fillStyle=r.color;
      ctx.fillRect(fx,y,fw,th);
      ctx.fillStyle=tc;
      ctx.textAlign='center';
      ctx.font='700 9px '+FONT;
      ctx.fillText(t('Chance of first','Birincilik şansı'),fx+fw/2,
        y+Math.round(th*0.33));
      ctx.font='900 26px '+MONO;
      ctx.fillText(r.firstText,fx+fw/2,y+Math.round(th*0.74));
      ctx.textAlign='left';
    }
    y+=RH;
  });
  // compact grid (2 columns) for the parties below the big rows: each box is
  // individually shorter than half the big box, the wider middle gap keeps
  // the pair totalling the big box width, and the freed height makes the
  // boxes taller with bigger logos
  if(grid.length){
    y+=6;
    const boxW=TH+6+barW+(rows.some(r=>r.firstText)?100:0);
    const rowsN=Math.ceil(grid.length/2);
    const tilesH=(opts.tiles&&opts.tiles.length)
      ?(opts.tiles.length===1?106:90):0;
    const avail=H-30-y-tilesH-10;
    const gh=Math.max(18,Math.min(52,Math.floor(avail/rowsN)-10));
    const gap=10;
    const gw=Math.floor((boxW-gap)/2);
    const nameS=Math.max(10,Math.round(gh*0.42));
    const shareS=Math.max(9,Math.round(gh*0.4));
    const seatS=Math.max(8,Math.round(gh*0.32));
    grid.forEach((r,i)=>{
      const gx=X+(i%2)*(gw+gap), gy=y+Math.floor(i/2)*(gh+gap);
      const th2=gh, lg=logos[rows.length+i];
      ctx.fillStyle=r.color;
      ctx.fillRect(gx,gy,th2,th2);
      if(lg){
        ctx.save();
        ctx.beginPath();
        ctx.rect(gx,gy,th2,th2);
        ctx.clip();
        try{ctx.filter='brightness(0) invert(1)'}catch(e){}
        const sc=Math.max(th2/lg.width, th2/lg.height);
        ctx.drawImage(lg,gx+(th2-lg.width*sc)/2,gy+(th2-lg.height*sc)/2,
          lg.width*sc,lg.height*sc);
        ctx.restore();
      }
      const bx=gx+th2+4, bw=gw-th2-4;
      ctx.fillStyle=r.color;
      ctx.fillRect(bx,gy,bw,th2);
      const tc=posterTextColor(r.color);
      ctx.fillStyle=tc;
      // name and share share a baseline; ideology and seats share the next
      ctx.font='700 '+nameS+'px '+FONT;
      ctx.fillText(String(r.name||'').toUpperCase(),bx+7,
        gy+Math.round(gh*0.42));
      if(r.ideology){
        ctx.font='700 10px '+FONT;
        ctx.fillText(ellipsizeText(pickIdeology(r.ideology),bw-14,ctx),
          bx+7,gy+Math.round(gh*0.8));
      }
      ctx.textAlign='right';
      // share + vote delta in separate columns (the delta at the big rows'
      // smaller ratio), so small boxes never overlap
      const gR=bx+bw-7;
      let dvW=0;
      if(r.dvText){
        const dvS=Math.max(8,Math.round(shareS*0.44));
        ctx.font='700 '+dvS+'px '+MONO;
        dvW=ctx.measureText(r.dvText).width+5;
        ctx.fillText(r.dvText,gR,gy+Math.round(gh*0.42));
      }
      ctx.font='700 '+shareS+'px '+MONO;
      ctx.fillText(r.shareText||'',gR-dvW,gy+Math.round(gh*0.42));
      if(r.seatsText||r.dsText){
        let dsW=0;
        if(r.dsText){
          const dsS=Math.max(7,Math.round(seatS*0.64));
          ctx.font='700 '+dsS+'px '+MONO;
          dsW=ctx.measureText(r.dsText).width+5;
          ctx.fillText(r.dsText,gR,gy+Math.round(gh*0.8));
        }
        ctx.font='700 '+seatS+'px '+MONO;
        ctx.fillText(r.seatsText||'',gR-dsW,gy+Math.round(gh*0.8));
      }
      ctx.textAlign='left';
    });
    y+=rowsN*(gh+gap)+10;
  }
  // probability tiles: one (government/coalition majority) or two (runoff
  // win probabilities); kept compact so the small-party grid gets the space
  if(opts.tiles&&opts.tiles.length){
    const single=opts.tiles.length===1;
    const tw=single?470:300, th3=single?100:84;
    let tx=X;
    opts.tiles.slice(0,2).forEach(tl=>{
      ctx.fillStyle=tl.color;
      ctx.fillRect(tx,y+6,tw,th3);
      const tc=posterTextColor(tl.color);
      ctx.fillStyle=tc;
      let lsize=single?18:13;
      const labelTxt=String(tl.label||'');
      ctx.font='700 '+lsize+'px '+FONT;
      while(lsize>10&&ctx.measureText(labelTxt).width>tw-28){
        lsize--;
        ctx.font='700 '+lsize+'px '+FONT;
      }
      ctx.fillText(labelTxt,tx+14,y+(single?38:30));
      ctx.font='900 '+(single?60:38)+'px '+MONO;
      ctx.fillText(tl.value,tx+14,y+(single?88:72));
      tx+=tw+12;
    });
  }
  if(mapImg){
    // the arc always keeps its own band at the bottom-right (no overlap with
    // any map shape); the map takes everything above it, centered
    const arcW=460, arcH=170, arcBand=arcH+12;
    const mx=620, my=140, mw=W-mx-40;
    const mh=H-my-30-arcBand;
    const sc=Math.min(mw/mapImg.width, mh/mapImg.height);
    const dw=mapImg.width*sc, dh=mapImg.height*sc;
    ctx.drawImage(mapImg,mx+(mw-dw)/2,my+(mh-dh)/2,dw,dh);
    if(arcImg){
      const ax=W-40-arcW, ay=H-30-arcH;
      const s2=Math.min(arcW/arcImg.width, arcH/arcImg.height);
      ctx.drawImage(arcImg,ax+(arcW-arcImg.width*s2)/2,
        ay+(arcH-arcImg.height*s2)/2,arcImg.width*s2,arcImg.height*s2);
    }
  }else if(arcImg){
    // no map for this country: the arc takes the whole right side, larger
    const ax=620, ay=140, aw=W-620-40, ah=H-140-40;
    const sc=Math.min(aw/arcImg.width, ah/arcImg.height);
    const dw=arcImg.width*sc, dh=arcImg.height*sc;
    ctx.drawImage(arcImg,ax+(aw-dw)/2,ay+(ah-dh)/2,dw,dh);
  }

  return canvas;
}

function captureBoxMap(boxId, filename){
  const box=$(boxId);
  if(!box) return;
  const svg=box.querySelector('svg');
  if(!svg) return;
  captureMapPng(svg, filename);
}

// Sliding majority bonus (Greece's 2020 law): the first party gets
// minSeats at `min`%, +1 seat per `step` pp above it, capped at maxSeats.
function bonusSeatCount(votes){
  const b=(MAP_CONF()||{}).bonus||((COUNTRIES[COUNTRY]||{}).bonus);
  if(!b) return 0;
  let tv=-1;
  for(const p of PARTY_ORDER){const v=votes[p]||0; if(v>tv)tv=v}
  if(tv<b.min) return 0;
  return Math.min(b.maxSeats, b.minSeats+Math.floor((tv-b.min)/b.step));
}

function allocateSeatsN(votes, totalSeats){
  // national-minority lists are exempt from the threshold (Serbia's VMSZ,
  // SPP, SDA, RS under art. 81) and parties without polling hold their
  // last-election national share instead of dropping to zero
  const natBase=(MAP_CONF()&&MAP_CONF().national2021)||LAST_ELECTION.results||{};
  votes=Object.assign({},votes);
  PARTY_ORDER.forEach(p=>{
    if((votes[p]===undefined||votes[p]===null)&&
       !(PARTY_META[p]&&PARTY_META[p].pastOnly)) votes[p]=natBase[p]||0;
  });
  const minority=(COUNTRIES[COUNTRY]||{}).minorityParties||[];
  const validParties=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD||
    (minority.indexOf(p)>=0&&(votes[p]||0)>0))
    .filter(p=>!(PARTY_META[p]&&PARTY_META[p].unallocated));
  const totalVotes=validParties.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalVotes===0) return {};
  const seats={};
  validParties.forEach(p=>{seats[p]=0});
  const bonus=bonusSeatCount(votes);
  const propSeats=Math.max(1,totalSeats-bonus);
  const topParty=validParties.reduce((a,p)=>
    ((votes[p]||0)>(votes[a]||0)?p:a),validParties[0]);
  const finish=()=>{if(bonus)seats[topParty]=(seats[topParty]||0)+bonus;return seats};

  // Hare/Niemeyer (largest remainder): floor(votes/quota), then by fraction
  if(SEAT_METHOD==='hare_niemeyer'){
    const quota=totalVotes/propSeats;
    const rems=[];
    let given=0;
    validParties.forEach(p=>{
      const q=(votes[p]||0)/quota;
      const fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    let left=propSeats-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    return finish();
  }

  // Modified Sainte-Laguë (1.2, 3, 5, ...) or D'Hondt (1, 2, 3, ...)
  // Israeli Bader-Ofer: surplus-vote agreement cartels pool their votes for
  // the remainder allocation, then split seats within the pair by D'Hondt.
  if(SEAT_METHOD==='dhondt'&&SURPLUS_AGREEMENTS.length){
    return allocateSeatsBaderOfer(votes, totalSeats);
  }
  const divisors=[];
  for(let i=1;i<=propSeats;i++){
    divisors.push(SEAT_METHOD==='dhondt'?i:(SEAT_METHOD==='sainte_lague_standard'?(2*i-1):(i===1?1.2:2*i-1)));
  }

  const quota=[];
  validParties.forEach(p=>{
    for(let d=0;d<divisors.length;d++){
      quota.push({party:p, q:(votes[p]||0)/divisors[d]});
    }
  });
  quota.sort((a,b)=>b.q-a.q);
  for(let i=0;i<propSeats&&i<quota.length;i++){
    seats[quota[i].party]++;
  }
  return finish();
}

// Bader-Ofer (Israeli D'Hondt + surplus-vote agreements): qualifying lists get
// their Hare-quota seats first; the leftover seats are then allocated among
// cartels (each surplus-agreement pair pools its votes, lists without an
// agreement are their own cartel) by D'Hondt on the cartel's next quotient;
// finally each multi-party cartel's won seats are split back between its
// members by D'Hondt on each member's next quotient.
function allocateSeatsBaderOfer(votes, totalSeats, threshold){
  if(threshold===undefined) threshold=THRESHOLD;
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=threshold);
  const seats={};
  valid.forEach(p=>{seats[p]=0});
  const totalVotes=valid.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalVotes===0) return seats;
  const quota=totalVotes/totalSeats;

  // Stage 1: Hare-quota seats per qualifying list.
  const qSeats={}; let given=0;
  valid.forEach(p=>{
    qSeats[p]=Math.floor((votes[p]||0)/quota);
    seats[p]=qSeats[p]; given+=qSeats[p];
  });
  let left=totalSeats-given;
  if(left<=0) return seats;

  // Build cartels: agreement pairs that BOTH passed the threshold pool their
  // votes; a pair where one list failed the threshold is treated as unsigned.
  const cartels=[];
  const inCartel=new Set();
  for(const pair of SURPLUS_AGREEMENTS){
    const [a,b]=pair;
    if(!valid.includes(a)||!valid.includes(b)) continue;
    cartels.push({members:[a,b], votes:(votes[a]||0)+(votes[b]||0), q:qSeats[a]+qSeats[b], split:[0,0]});
    inCartel.add(a); inCartel.add(b);
  }
  valid.forEach(p=>{if(!inCartel.has(p)) cartels.push({members:[p], votes:(votes[p]||0), q:qSeats[p], split:[0]})});

  // Stage 2: allocate the remaining seats among cartels by D'Hondt (divisor =
  // cartel's current seats+1, starting from its Hare quota seats).
  for(let i=0;i<left;i++){
    let best=-1,bestQ=-1;
    for(let ci=0;ci<cartels.length;ci++){
      const c=cartels[ci];
      const q=c.votes/(c.q+c.split.reduce((a,b)=>a+b,0)+1);
      if(q>bestQ){bestQ=q;best=ci}
    }
    cartels[best].split[0]++;  // award the seat to the cartel
  }

  // Stage 3: split each multi-party cartel's won seats back among its members
  // by D'Hondt on each member's next quotient (divisor = member seats+1, from
  // its Hare quota seats).
  const out={}; valid.forEach(p=>{out[p]=0});
  for(const c of cartels){
    if(c.members.length===1){out[c.members[0]]=c.q+c.split[0];continue}
    const mw=[0,0];
    for(let i=0;i<c.split[0];i++){
      let best=-1,bestQ=-1;
      for(let mi=0;mi<c.members.length;mi++){
        const p=c.members[mi];
        const q=(votes[p]||0)/(qSeats[p]+mw[mi]+1);
        if(q>bestQ){bestQ=q;best=mi}
      }
      mw[best]++;
    }
    c.members.forEach((p,mi)=>{out[p]=qSeats[p]+mw[mi]});
  }
  return out;
}

// Per-okręg D'Hondt (Poland): each of the 41 okręgi allocates its own seat
// count among nationally-qualifying parties (≥5% national threshold) from the
// district's projected shares — the real Sejm system, not one national district.
// Slovenian National Assembly (ZVDZ): per constituency a Droop quota
// (floor(votes/(11+1))+1) fills the 11 seats; the votes not converted to
// seats (the remainders) are pooled nationally and the unfilled seats go
// to parties at/above the 4% threshold by D'Hondt over those remainders.
// Reproduces the 2026 result exactly (GS 29 / SDS 28 / NSi+SLS+FOKUS 9 /
// SD 6 / Democrats 6 / Levica+Vesna 5 / Resni.ca 5 + 2 minority).
function allocateSeatsSlovenia(avg, regionNoise, districtNoise){
  const conf=MAP_CONF();
  if(!conf||!conf.nationalRemainders||!conf.seatDistricts) return null;
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  const valid=PARTY_ORDER.filter(p=>(avg[p]||0)>=THRESHOLD
    &&!(PARTY_META[p]&&PARTY_META[p].unallocated));
  if(!valid.length) return out;
  const remainders={}; valid.forEach(p=>{remainders[p]=0});
  // districtShares renormalizes the modelled parties to the polls' total;
  // the law's quota works on the raw (real) scale, so undo the uniform
  // per-district rescale (k = polls total / baseline total) before applying
  // the quota
  let unfilled=0;
  let target=0; PARTY_ORDER.forEach(p=>{
    if(avg&&avg[p]!==undefined&&avg[p]!==null) target+=avg[p];
  });
  const geb=conf.gebiete||{};
  for(const nr of Object.keys(conf.seatDistricts)){
    const seatsN=conf.seatDistricts[nr];
    const shares=districtShares(nr, avg, false, null, regionNoise, districtNoise);
    if(!shares) continue;
    let pastSum=0;
    PARTY_ORDER.forEach(p=>{pastSum+=(geb[nr]||{})[p]||0});
    const k=(pastSum>0&&target>0)?target/pastSum:1;
    // Droop quota over the qualified parties' raw votes; only parties at
    // or above the 4% national threshold can win seats
    const votes={}; let sum=0;
    valid.forEach(p=>{votes[p]=(shares[p]?shares[p].now:0)/k; sum+=votes[p]});
    if(!(sum>0)){ unfilled+=seatsN; continue; }
    const quota=Math.floor(sum/(seatsN+1))+1;
    let given=0;
    valid.forEach(p=>{
      const q=Math.floor((votes[p]||0)/quota);
      out[p]+=q; given+=q;
      remainders[p]+=(votes[p]||0)-quota*q;
    });
    unfilled+=seatsN-given;
  }
  if(unfilled>0){
    // national tier: Hagenbach-Bischoff quota over the pooled remainders
    // (quota = total remainders/(unfilled+1)+1), leftover seats by largest
    // remainder - reproduces the official 2026 allocation exactly
    const totalRem=valid.reduce((s,p)=>s+remainders[p],0);
    if(totalRem>0){
      const quota=Math.floor(totalRem/(unfilled+1))+1;
      const rems=[];
      let given=0;
      valid.forEach(p=>{
        const q=Math.floor(remainders[p]/quota);
        out[p]+=q; given+=q;
        rems.push([remainders[p]-quota*q,p]);
      });
      rems.sort((a,b)=>b[0]-a[0]);
      for(let i=0;i<unfilled-given&&i<rems.length;i++) out[rems[i][1]]++;
    }
  }
  return out;
}

function allocateSeatsByDistrict(avg, regionNoise, districtNoise){
  const conf=MAP_CONF();
  if(!conf||!conf.seatDistricts||(conf.bonus&&!conf.greekDistrictBonus)) return null;
  // Greek hybrid (v. 2020 law): the first party takes the sliding bonus;
  // the pool (300 - bonus) is allocated per constituency by Hare/Niemeyer
  if(conf.bonus&&conf.greekDistrictBonus){
    const bonus=bonusSeatCount(avg||{});
    const total=(typeof conf.totalSeats==='number'?conf.totalSeats:300);
    const pool=Math.max(1,total-bonus);
    const keys=Object.keys(conf.seatDistricts);
    const sum=keys.reduce((s,k)=>s+(conf.seatDistricts[k]||0),0)||1;
    // scale the constituency seat counts to the pool (largest remainder)
    const scaled=keys.map(k=>({k,v:(conf.seatDistricts[k]||0)*pool/sum}));
    let assigned=0;
    scaled.forEach(o=>{o.fl=Math.floor(o.v);assigned+=o.fl});
    scaled.sort((x,y)=>(y.v-y.fl)-(x.v-x.fl));
    for(let t2=0;t2<pool-assigned&&t2<scaled.length;t2++) scaled[t2].fl++;
    const out={};
    PARTY_ORDER.forEach(p=>{out[p]=0});
    const ranked=PARTY_ORDER.slice().sort(
      (p,q)=>((avg||{})[q]||0)-((avg||{})[p]||0));
    const top=ranked[0];
    for(const o of scaled){
      const seatsN=o.fl;
      if(seatsN<=0) continue;
      const shares=districtShares(o.k, avg, false, null,
                                  regionNoise, districtNoise);
      if(!shares) continue;
      const votes={};
      PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?shares[p].now:0});
      const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>0
        &&!(PARTY_META[p]&&PARTY_META[p].unallocated)
        &&((avg[p]||0)>=THRESHOLD));
      if(!valid.length) continue;
      const totalVotes=valid.reduce((s,p)=>s+(votes[p]||0),0);
      if(totalVotes<=0) continue;
      const quota=totalVotes/seatsN;
      const rems=[];
      let given=0;
      valid.forEach(p=>{
        const q=(votes[p]||0)/quota;
        const fl=Math.floor(q);
        out[p]+=fl; given+=fl;
        rems.push([q-fl,p]);
      });
      rems.sort((x,y)=>y[0]-x[0]);
      for(let t2=0;t2<seatsN-given&&t2<rems.length;t2++) out[rems[t2][1]]++;
    }
    if(bonus&&top) out[top]=(out[top]||0)+bonus;
    return out;
  }
  const out={};
  PARTY_ORDER.forEach(p=>{out[p]=0});
  for(const nr of Object.keys(conf.seatDistricts)){
    const seatsN=conf.seatDistricts[nr];
    const shares=districtShares(nr, avg, false, null, regionNoise, districtNoise);
    if(!shares) continue;
    const votes={};
    PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?shares[p].now:0});
    // the flag may live on the map block or on the country block (MAP_CONF
  // returns the map block for layer 0)
  const dth=(conf.districtThreshold!==undefined)?conf.districtThreshold
    :!!((COUNTRIES[COUNTRY]||{}).districtThreshold);
    // 29-N joint lists (config `alliances`): the members' district votes
    // pool for the threshold and the D'Hondt; the pooled seats are split
    // among the members in proportion to their district shares.
    let groups=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].unallocated))
      .map(p=>({key:p,parties:[p],votes:votes[p]||0}));
    for(const a of (conf.alliances||[])){
      if(a.provinces.indexOf(nr)<0) continue;
      const members=a.parties.filter(p=>groups.some(g=>g.key===p));
      if(members.length<2) continue;
      const pooled=members.reduce((s,p)=>s+(votes[p]||0),0);
      groups=groups.filter(g=>members.indexOf(g.key)<0);
      groups.push({key:'al:'+members.join('+'),parties:members,votes:pooled});
    }
    const valid=groups.filter(g=>g.votes>0
      &&((dth?g.votes:(avg[g.parties[0]]||0))>=THRESHOLD));
    if(!valid.length) continue;
    const won={};
    const flush=(g,n)=>{
      if(g.parties.length===1){out[g.parties[0]]+=n;return;}
      const tot=g.parties.reduce((s,p)=>s+(votes[p]||0),0)||1;
      const q=g.parties.map(p=>({p,exact:n*(votes[p]||0)/tot}));
      q.forEach(x=>{x.fl=Math.floor(x.exact)});
      let given=q.reduce((a2,x)=>a2+x.fl,0);
      q.sort((a2,b2)=>(b2.exact-Math.floor(b2.exact))-(a2.exact-Math.floor(a2.exact)));
      for(let i=0;given<n&&i<q.length*2;i++,given++) q[i%q.length].fl++;
      q.forEach(x=>{out[x.p]+=x.fl});
    };
    // Hare/Niemeyer (largest remainder) per district, e.g. Bulgaria
    if(SEAT_METHOD==='hare_niemeyer'){
      const totalVotes=valid.reduce((s,g)=>s+g.votes,0);
      if(totalVotes<=0) continue;
      const quota=totalVotes/seatsN;
      const rems=[];
      let given=0;
      valid.forEach(g=>{
        const q=g.votes/quota;
        const fl=Math.floor(q);
        won[g.key]=fl; given+=fl;
        rems.push([q-fl,g]);
      });
      rems.sort((a2,b2)=>b2[0]-a2[0]);
      for(let i=0;i<seatsN-given&&i<rems.length;i++) won[rems[i][1].key]++;
      valid.forEach(g=>flush(g,won[g.key]||0));
      continue;
    }
    const quo=[];
    valid.forEach(g=>{for(let d=1;d<=seatsN;d++) quo.push({g,q:g.votes/d})});
    quo.sort((a2,b2)=>b2.q-a2.q);
    for(let i=0;i<seatsN&&i<quo.length;i++) won[quo[i].g.key]=(won[quo[i].g.key]||0)+1;
    valid.forEach(g=>flush(g,won[g.key]||0));
  }
  return out;
}

// Norwegian two-tier model (Storting): the 150 district seats are allocated
// in the 19 constituencies by modified Sainte-Lague (first divisor 1.4, no
// threshold - parties below the national 4% still win district seats), then
// the 19 leveling seats go to the parties at or above the threshold by
// quotient continuation votes/(seats+1). Reproduces the official 2025
// result exactly (Ap 53 / FrP 47 / H 24 / SV 9 / Sp 9 / R 9 / MDG 8 /
// KrF 7 / V 3). Shared by the point projection, the Monte Carlo and the
// map's seat dots.
function districtTierSplit(nr, avg, resultMode, conf, seatsN, regionNoise, districtNoise){
  const shares=districtShares(nr, avg, resultMode, conf, regionNoise, districtNoise);
  if(!shares) return null;
  const votes={};
  PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?(resultMode?shares[p].past:shares[p].now):0});
  // Iceland: plain D'Hondt in the district tier (method 'dhondt'); Norway:
  // modified Sainte-Lague (first divisor 1.4, then odd divisors).
  const dhondt=SEAT_METHOD==='dhondt';
  const quo=[];
  PARTY_ORDER.forEach(p=>{
    if(!((votes[p]||0)>0)||(PARTY_META[p]&&PARTY_META[p].unallocated)) return;
    for(let d=1;d<=seatsN;d++) quo.push({p,q:dhondt?((votes[p]||0)/d):((votes[p]||0)/(d===1?1.4:2*d-1))});
  });
  quo.sort((a,b)=>b.q-a.q);
  const seats={};
  for(let i=0;i<seatsN&&i<quo.length;i++) seats[quo[i].p]=(seats[quo[i].p]||0)+1;
  return seats;
}

function allocateSeatsLeveling(avg, regionNoise, districtNoise){
  const c=COUNTRIES[COUNTRY]||{};
  if(!c.levelingSeats) return null;
  const conf=MAP_CONF();
  if(!conf||!conf.seatDistricts) return null;
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  for(const nr of Object.keys(conf.seatDistricts)){
    const split=districtTierSplit(nr, avg, false, conf, conf.seatDistricts[nr], regionNoise, districtNoise);
    if(!split) continue;
    for(const p in split) out[p]=(out[p]||0)+split[p];
  }
  let left=c.levelingSeats;
  while(left>0){
    let best=null,bq=-1;
    for(const p of PARTY_ORDER){
      if((avg[p]||0)<THRESHOLD) continue;
      if(PARTY_META[p]&&PARTY_META[p].pastOnly) continue;
      const q=(avg[p]||0)/(out[p]+1);
      if(q>bq){best=p;bq=q}
    }
    if(!best) break;
    out[best]++; left--;
  }
  return out;
}

// Czech Chamber of Deputies (Act 189/2021): two scrutinies.
// First: LR-Imperiali per region (quota = region votes/(seats+2); integer quota,
// over-allocation trimmed from the smallest remainders per §48(4)).
// Second: national LR-Hagenbach-Bischoff over the remainder votes
// (quota = sum remainders/(unfilled seats+1); leftover seats by largest remainder).
function allocateSeatsCzechia(avg){
  const conf=MAP_CONF();
  if(!conf||!conf.regions) return null;
  const nat=conf.national2021||LAST_ELECTION.results;
  const valid=PARTY_ORDER.filter(p=>(avg[p]||0)>=THRESHOLD);
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  if(!valid.length) return out;

  // Region votes: 2025 regional shares shifted by the national swing, scaled to
  // the region's absolute valid-vote count (so the national second scrutiny weights
  // regions by size, as the law does), then LR-Imperiali per region.
  const remainders={}; valid.forEach(p=>{remainders[p]=0});
  let unfilled=0;
  for(const rid of Object.keys(conf.regions)){
    const r=conf.regions[rid];
    const votes={}; let sum=0;
    for(const p of valid){
      votes[p]=Math.max(0,(r.results[p]||0)+((avg[p]||0)-(nat[p]||0)))*(r.votes||100)/100;
      sum+=votes[p];
    }
    if(!(sum>0)){ unfilled+=r.seats; continue; }

    // First scrutiny: Imperiali quota (integer)
    const quota=Math.floor(sum/(r.seats+2))||1;
    const alloc={}; const rems=[];
    let given=0;
    valid.forEach(p=>{
      const q=Math.floor(votes[p]/quota);
      alloc[p]=q; given+=q;
      rems.push([votes[p]-q*quota, p]);
    });
    if(given>r.seats){
      rems.sort((a,b)=>a[0]-b[0]);   // smallest remainders lose seats first
      for(let i=0;i<rems.length&&given>r.seats;i++){
        const p=rems[i][1];
        if(alloc[p]>0){ alloc[p]--; given--; }
      }
    }
    if(given<r.seats) unfilled+=r.seats-given;
    valid.forEach(p=>{
      // Remainder votes transfer to the second scrutiny (all votes if no seat won)
      remainders[p]+=votes[p]-quota*alloc[p];
      out[p]+=alloc[p];
    });
  }

  // Second scrutiny: Hagenbach-Bischoff quota nationally
  if(unfilled>0){
    const totalRem=valid.reduce((s,p)=>s+remainders[p],0);
    if(totalRem>0){
      const quota=Math.floor(totalRem/(unfilled+1))||1;
      const alloc={}; const rems=[];
      let given=0;
      valid.forEach(p=>{
        const q=Math.floor(remainders[p]/quota);
        alloc[p]=q; given+=q;
        rems.push([remainders[p]-q*quota, p]);
      });
      rems.sort((a,b)=>b[0]-a[0]);   // leftover by largest remainder
      for(let i=0;i<rems.length&&given<unfilled;i++){
        alloc[rems[i][1]]++; given++;
      }
      valid.forEach(p=>{out[p]+=alloc[p]});
    }
  }
  return out;
}

// Stabilicum (legge 180/2026, in force 24 Oct 2026): pure proportional with
// the Rosatellum thresholds (3% lists, 10% coalitions, best-loser recovery
// inside a qualifying coalition) plus a FIXED governability bonus - 70
// deputies / 35 senators - for the list or coalition that tops the poll with
// at least 42% of the valid vote in both chambers, capped at 220/113 seats;
// below 42% the system stays pure proportional. All coalition members'
// votes count toward the 42% (no threshold on the contribution). Replaces
// the Rosatellum mixed allocator (the 147 FPTP colleges are gone).
function stabilicumSeats(avg, total, bonusSeats, cap){
  const c=COUNTRIES[COUNTRY]||{};
  const st=c.stabilicum||{};
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  const nat=(MAP_CONF()&&MAP_CONF().national2021)||LAST_ELECTION.results||{};
  const votes={};
  PARTY_ORDER.forEach(p=>{
    votes[p]=(avg&&avg[p]!==undefined&&avg[p]!==null)?avg[p]:(nat[p]||0);
  });
  const totalValid=PARTY_ORDER.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalValid<=0) return out;
  // coalitions from the config blocs (2+ parties) and their totals - every
  // member's votes count toward the 42%, qualified or not
  const coals={}, inCoal={};
  for(const bk of ['bloc1','bloc2']){
    const b=BLOCS[bk];
    if(!b||!b.parties||b.parties.length<2) continue;
    coals[bk]={parties:b.parties.slice(),
               votes:b.parties.reduce((s,p)=>s+(votes[p]||0),0)};
    b.parties.forEach(p=>{inCoal[p]=bk});
  }
  // qualifying lists: coalition >= 10% -> members >= 3%, plus the best
  // sub-3% member recovered (ripescaggio); unaligned lists >= 3%
  const coalMin=(st.coalitionThreshold!==undefined)?st.coalitionThreshold:10;
  const qualify={};
  Object.keys(coals).forEach(bk=>{
    const co=coals[bk];
    if(co.votes<coalMin) return;
    co.parties.forEach(p=>{ if((votes[p]||0)>=THRESHOLD) qualify[p]=true; });
    let best=null,bv=-1;
    co.parties.forEach(p=>{ if(!qualify[p]&&(votes[p]||0)>bv){bv=votes[p]||0;best=p} });
    if(best) qualify[best]=true;
  });
  PARTY_ORDER.forEach(p=>{ if(!inCoal[p]&&(votes[p]||0)>=THRESHOLD) qualify[p]=true; });
  const list=PARTY_ORDER.filter(p=>qualify[p]);
  if(!list.length) return out;
  // the bonus: the top list/coalition at or above the threshold share
  let winKey=null, winV=-1;
  Object.keys(coals).forEach(bk=>{
    if(coals[bk].votes>winV){winV=coals[bk].votes;winKey=bk}
  });
  list.forEach(p=>{
    if(!inCoal[p]&&(votes[p]||0)>winV){winV=votes[p]||0;winKey=p}
  });
  const minShare=(st.minBonus!==undefined)?st.minBonus:42;
  const hasBonus=bonusSeats>0&&(winV/totalValid)*100>=minShare;
  const propN=hasBonus?Math.max(1,total-bonusSeats):total;
  // D'Hondt over the qualifying lists
  const quota=[];
  list.forEach(p=>{for(let d=1;d<=propN;d++)quota.push([(votes[p]||0)/d,p])});
  quota.sort((a,b)=>b[0]-a[0]);
  for(let i=0;i<propN&&i<quota.length;i++) out[quota[i][1]]++;
  if(hasBonus){
    // the bonus is a coalition list: split the fixed seats among the winning
    // coalition's qualifying members by D'Hondt on their own votes
    const members=(coals[winKey]?coals[winKey].parties:[winKey])
      .filter(p=>qualify[p]);
    const bq=[];
    members.forEach(p=>{for(let d=1;d<=bonusSeats;d++)bq.push([(votes[p]||0)/d,p])});
    bq.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<bonusSeats&&i<bq.length;i++) out[bq[i][1]]++;
    // constitutional cap (220 deputies / 113 senators): the excess returns
    // to the other qualifying lists
    const winTotal=members.reduce((s,p)=>s+(out[p]||0),0);
    const excess=winTotal-cap;
    if(excess>0){
      let left=excess;
      const trim=members.slice().sort((a,b)=>(out[b]||0)-(out[a]||0));
      let i=0;
      while(left>0&&i<trim.length*100){
        const p=trim[i%trim.length];
        if((out[p]||0)>0){out[p]--;left--}
        i++;
      }
      const others=list.filter(p=>members.indexOf(p)<0);
      if(others.length){
        const oq=[];
        others.forEach(p=>{for(let d=1;d<=excess;d++)oq.push([(votes[p]||0)/d,p])});
        oq.sort((a,b)=>b[0]-a[0]);
        for(let k=0;k<excess&&k<oq.length;k++) out[oq[k][1]]++;
      }
    }
  }
  return out;
}

// Stabilicum countries (Italy): the whole chamber from the proportional +
// fixed-bonus allocator - the map keeps its 2022 collegio layer as the
// historical geography, but no seat is decided by a college any more.
function allocateSeatsItaly(avg){
  const c=COUNTRIES[COUNTRY]||{};
  if(!c.stabilicum) return null;
  return stabilicumSeats(avg, SEATS_TOTAL, c.stabilicum.bonus, c.stabilicum.cap);
}

// First-past-the-post: every seat is a single-member riding; the projected
// winner (plurality of the swung shares) takes it. Used by BC/Quebec-style
// pure-FPTP countries whose map is the riding layer itself.
function allocateSeatsFptp(avg, regionNoise, districtNoise){
  const conf=MAP_CONF();
  if(!conf||!conf.useConstituencies||!conf.districts) return null;
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  for(const nr of Object.keys(conf.districts)){
    const w=districtWinnerProjection(nr,avg,conf,regionNoise,districtNoise);
    if(w) out[w]=(out[w]||0)+1;
  }
  return out;
}

// Seat allocation for a projection: per-okręg D'Hondt when the country defines
// seatDistricts (Poland), else the national-district allocation.
// Reserved seats (Romania's 19 national-minority deputies, Denmark's four
// North Atlantic mandates): not in the polls and not tied to a constituency -
// they always hold their seats, so they sit on top of the allocation.
function applyReserved(seats){
  const reserved=(COUNTRIES[COUNTRY]||{}).reservedSeats;
  if(seats&&reserved){
    for(const k in reserved) seats[k]=(seats[k]||0)+reserved[k];
  }
  return seats;
}
function reservedTotal(){
  const reserved=(COUNTRIES[COUNTRY]||{}).reservedSeats||{};
  return Object.values(reserved).reduce((a,b)=>a+b,0);
}

function allocateSeatsTotal(avg, total){
  // leveling-seat parliaments (NZ's overhang, the German states) route
  // through the growing-house allocator; the direct mandates are counted from
  // the map's districts
  if(OVERHANG) return overhangSeats(avg, total, directFromProjection(avg), OVERHANG.cap);
  if(MAP_CONF()&&MAP_CONF().prDistricts&&!MAP_CONF().winnerDistricts)
    return allocateSeatsPrDistricts(avg, total);
  if(MAP_CONF()&&MAP_CONF().winnerDistricts) return allocateSeatsWinnerDistricts(avg, total);
  return applyReserved(allocateSeatsCzechia(avg)||allocateSeatsLeveling(avg)||allocateSeatsSlovenia(avg)||allocateSeatsByDistrict(avg)||allocateSeatsItaly(avg)||allocateSeatsFptp(avg)||allocateSeatsN(avg,Math.max(0,total-reservedTotal())));
}

// All-PR systems allocated per district (Turkey): each district's seats by
// D'Hondt from its 2023 shares swung to the current average, party by party
// (the ittifak does NOT pool votes for the seat allocation - verified
// against the official 2023 per-district MV: the party-level allocation
// reproduces 272/170/50/43/61 vs the official 268/169/50/43/61). An
// alliance's total only counts for the 7% threshold, which is how MHP and
// TIP take seats while polling below it themselves.
function allocateSeatsPrDistricts(avg, total){
  const conf=MAP_CONF();
  if(!conf||!conf.prDistricts||conf.winnerDistricts) return null;
  const c=COUNTRIES[COUNTRY]||{};
  const alliances=c.alliances||{};
  const partyAlliance={};
  Object.keys(alliances).forEach(a=>{
    const nat=alliances[a].reduce((s,p)=>s+(avg[p]||0),0);
    if(nat>=THRESHOLD) alliances[a].forEach(p=>{partyAlliance[p]=a});
  });
  const valid=PARTY_ORDER.filter(p=>(avg[p]||0)>=THRESHOLD||
    partyAlliance[p]||(PARTY_META[p]&&PARTY_META[p].unallocated));
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  if(!valid.length) return out;
  for(const nr of Object.keys(conf.prDistricts)){
    const seatsN=conf.prDistricts[nr];
    const sh=districtShares(nr,avg,false,conf);
    if(!sh) continue;
    // the D'Hondt divisors must count the seats won IN THIS DISTRICT, not
    // the running national totals (the national count would suppress every
    // party that already won seats elsewhere)
    const won={};
    const q={};
    valid.forEach(p=>{q[p]=sh[p]?sh[p].now:0});
    for(let i2=0;i2<seatsN;i2++){
      let best=valid[0];
      for(const p of valid){if((q[p]||0)>(q[best]||0))best=p}
      won[best]=(won[best]||0)+1;
      q[best]=(sh[best]?sh[best].now:0)/((won[best]||0)+1);
    }
    valid.forEach(p=>{out[p]=(out[p]||0)+(won[p]||0)});
  }
  return out;
}


// Mixed systems where the strongest party in a district takes all of its
// single-member seats (Hungary): when the country carries real single-member
// constituencies (map2), each one is a winner-takes-one race and the rest is
// a national PR with the threshold; otherwise the county magnitudes
// approximate the SMD blocks.
function allocateSeatsWinnerDistricts(avg, total, regionNoise, districtNoise){
  const conf=MAP_CONF();
  if(!conf||!conf.winnerDistricts) return null;
  const c=COUNTRIES[COUNTRY]||{};
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  let direct=0;
  if(c.map2&&c.map2.districts&&c.map2.gebiete){
    const conf2=Object.assign({},c,c.map,c.map2);
    for(const nr of Object.keys(c.map2.districts)){
      const w=districtWinnerProjection(nr,avg,conf2,regionNoise,districtNoise);
      if(w){ out[w]=(out[w]||0)+1; direct++; }
    }
  }else{
    for(const nr of Object.keys(conf.winnerDistricts)){
      const n=conf.winnerDistricts[nr];
      const w=districtWinnerProjection(nr,avg,conf,regionNoise,districtNoise);
      if(w){ out[w]=(out[w]||0)+n; direct+=n; }
    }
  }
  const totalSeats=total||SEATS_TOTAL;
  if(conf.prDistricts){
    // Japan: the 176 PR seats are allocated per bloc (D'Hondt) from the
    // bloc's 2026 shares with a uniform swing from the national PR baseline
    const prG=conf.prGebiete||{}, prN=conf.prNational2021||{};
    for(const bk of Object.keys(conf.prDistricts)){
      const base=prG[bk];
      if(!base) continue;
      const seatsN=conf.prDistricts[bk];
      const votes={};
      PARTY_ORDER.forEach(p=>{
        votes[p]=Math.max(0,(base[p]||0)+((avg[p]||0)-(prN[p]||0)));
      });
      const valid=PARTY_ORDER.filter(p=>votes[p]>0&&
        !(PARTY_META[p]&&PARTY_META[p].unallocated));
      const quo=[];
      valid.forEach(p=>{for(let d=1;d<=seatsN;d++) quo.push([votes[p]/d,p])});
      quo.sort((a,b)=>b[0]-a[0]);
      for(let i=0;i<seatsN&&i<quo.length;i++) out[quo[i][1]]++;
    }
    return out;
  }
  const pr=allocateSeatsN(avg, Math.max(0,totalSeats-direct));
  for(const p of PARTY_ORDER) out[p]+=(pr[p]||0);
  return out;
}

function buildParliamentSVG(seats, conf){
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
    svg+=`<text x="${layout.cx}" y="${fmt(labelY,1)}" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="1" fill="#111827" font-family="Source Code Pro,monospace">${t('MAJORITY','ÇOĞUNLUK')} ${majority}</text>`;
    svg+=`<line x1="${layout.cx}" y1="${fmt(lineTop,1)}" x2="${layout.cx}" y2="${fmt(lineBot,1)}" stroke="#111827" stroke-width="1" stroke-dasharray="3,3" opacity="0.25"/>`;
    for(let i=0;i<assigned.length&&i<pts.length;i++){
      const party=assigned[i];
      const col=party==='other'?'#9CA3AF':partyColor(party,conf);
      svg+=`<circle cx="${fmt(pts[i].x,2)}" cy="${fmt(pts[i].y,2)}" r="${fmt(pts[i].rr,2)}" fill="${col}"/>`;
    }
    svg+=`<text x="${layout.cx}" y="${fmt(totalY,1)}" text-anchor="middle" font-size="${totalFs}" font-weight="900" fill="#111827" font-family="Source Code Pro,monospace">${total}</text>`;
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
      if(btn.dataset.maplayer){ MAP_LAYER=(MAP_LAYER===1)?0:1; PARL_VIEW='map'; updateUrl(); }
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
  const parlShot=$('parl-shot-btn');
  if(parlShot){
    parlShot.addEventListener('click',()=>{
      captureBoxMap('parl-box', COUNTRY+'-parliament.png');
    });
  }
  const trendShot=$('trend-shot-btn');
  if(trendShot){
    trendShot.addEventListener('click',()=>{
      captureChartPng($('trend-canvas'), COUNTRY+'-poll-trend.png');
    });
  }
  if(MAP_ONLY||PARL_VIEW==='map') renderMap(avg);
  // map-as-the-story section (KR/JP/UK/QC/DE): drawn below the arch
  if(isBigMap()){
    const sec=$('map-box-sec');
    if(sec){
      const sen=(COUNTRIES[COUNTRY]||{}).senate;
      renderMapInto(sec, avg, PARL_MODE!=='proj',
                    (PARL_MODE==='upper'&&sen)?sen:undefined);
    }
    const secShot=$('map-sec-shot-btn');
    if(secShot){
      secShot.addEventListener('click',()=>{
        captureBoxMap('map-box-sec', COUNTRY+'-map.png');
      });
    }
  }
}

/* ---------- forecast: fast Sainte-Laguë ---------- */
function allocateSeatsFastRaw(votes, total, regionNoise, districtNoise){
  if(OVERHANG){
    return overhangSeats(votes,total,directFromProjection(votes),OVERHANG.cap);
  }
  // per-province systems (Turkey): the Monte Carlo draws use the same
  // province-level D'Hondt as the deterministic projection (the seat count
  // is fixed, so the cost matches the national loop)
  if(MAP_CONF()&&MAP_CONF().prDistricts&&!MAP_CONF().winnerDistricts){
    return allocateSeatsPrDistricts(votes, total);
  }
  const czechia=allocateSeatsCzechia(votes);
  if(czechia) return czechia;
  const leveling=allocateSeatsLeveling(votes, regionNoise, districtNoise);
  if(leveling) return leveling;
  const slovenia=allocateSeatsSlovenia(votes, regionNoise, districtNoise);
  if(slovenia) return slovenia;
  const byDistrict=allocateSeatsByDistrict(votes, regionNoise, districtNoise);
  if(byDistrict) return byDistrict;
  // national-minority exemption + no-poll fallback (see allocateSeatsN)
  const natBase=(MAP_CONF()&&MAP_CONF().national2021)||LAST_ELECTION.results||{};
  votes=Object.assign({},votes);
  PARTY_ORDER.forEach(p=>{
    if((votes[p]===undefined||votes[p]===null)&&
       !(PARTY_META[p]&&PARTY_META[p].pastOnly)) votes[p]=natBase[p]||0;
  });
  const minority=(COUNTRIES[COUNTRY]||{}).minorityParties||[];
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD||
    (minority.indexOf(p)>=0&&(votes[p]||0)>0));
  if(!valid.length) return {};
  const seats={};valid.forEach(p=>{seats[p]=0});
  const bonus=bonusSeatCount(votes);
  const propSeats=Math.max(1,total-bonus);
  const topParty=valid.reduce((a,p)=>
    ((votes[p]||0)>(votes[a]||0)?p:a),valid[0]);
  const finish=()=>{if(bonus)seats[topParty]=(seats[topParty]||0)+bonus;return seats};

  // Hare/Niemeyer (largest remainder) for the Monte Carlo draws
  if(SEAT_METHOD==='hare_niemeyer'){
    const totalVotes=valid.reduce((a,p)=>a+(votes[p]||0),0);
    if(totalVotes===0) return seats;
    const quota=totalVotes/propSeats;
    const rems=[];
    let given=0;
    valid.forEach(p=>{
      const q=(votes[p]||0)/quota;
      const fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    let left=propSeats-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    return finish();
  }

  const quo={};
  valid.forEach(p=>{quo[p]=SEAT_METHOD==='dhondt'?(votes[p]||0):(SEAT_METHOD==='sainte_lague_standard'?(votes[p]||0):(votes[p]||0)/1.2)});
  // Israeli Bader-Ofer: surplus-vote agreement cartels pool votes for remainder seats
  if(SEAT_METHOD==='dhondt'&&SURPLUS_AGREEMENTS.length){
    return allocateSeatsBaderOfer(votes, total);
  }
  for(let i=0;i<propSeats;i++){
    let best=valid[0];
    for(const p of valid){if(quo[p]>quo[best])best=p}
    seats[best]++;
    quo[best]=SEAT_METHOD==='dhondt'?(votes[best]||0)/(seats[best]+1):(votes[best]||0)/(2*seats[best]+1);
  }
  return finish();
}

function allocateSeatsFast(votes, total, regionNoise, districtNoise){
  return applyReserved(allocateSeatsFastRaw(votes, Math.max(0, total - reservedTotal()), regionNoise, districtNoise));
}

/* ---------- forecast: Monte Carlo simulation ---------- */
// Dirichlet concentration: alpha_p = avg_p(%) * K. sd(share) = sqrt(s(1-s)/(K*sum(avg)+1)).
// K calibrated to the empirically measured pollster error: the MAE of final
// poll averages across 2014/2018/2022 was ~1.2-1.5pp. K=11 gives sigma ~1.4pp
// for a 30% party (with the election 9 days away, late swings are limited).
const FORECAST_K=11;

// Horizon drift: between now and election day the poll average itself can move
// (late swings, differential turnout). Model it as a random walk with daily
// step FORECAST_DRIFT pp: sigma_drift = FORECAST_DRIFT*sqrt(days). ~0.9pp at
// 3 weeks out (BC), ~0.3pp at 2 days (QC), ~2.2pp at 4 months.
const FORECAST_DRIFT=0.2;

function daysToElection(){
  const d=(META&&META.election_date)||(TREND_CONF&&TREND_CONF.electionDate);
  if(!d) return 0;
  const h=(new Date(d).getTime()-Date.now())/(1000*60*60*24);
  return h>0?h:0;
}

// The random-walk drift saturates at 120 days: beyond ~4 months today's
// average will be replaced by campaign data the model cannot see, so a
// 3-year horizon (UK 2029) must not claim a 6pp random walk.
function driftDays(){ return Math.min(120, daysToElection()); }

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
const RUNOFF_CACHE={};

// Dirichlet concentration K is calibrated for a rich poll sample; with few
// polls the estimate is less certain, so K shrinks (never below 30%).
function effectiveK(nPolls, base){
  if(!nPolls||nPolls<=0) return base;
  return base*Math.max(0.3, Math.min(1, nPolls/12));
}

// Measured horizon curve (scraper/backtest.py -> data/backtest.json): the
// MAE of the poll average vs the result by days-to-election, per country
// where measured (uk/spain/germany/qc/nz/bc/serbia) and aggregated over the
// 14 cycles otherwise. Converted to a normal sigma (MAE = sigma*sqrt(2/pi))
// and used to scale the correlated swing, so a forecast two months out is
// visibly less certain than one the day before: sigma ~2.0pp at T-0, ~2.7
// at T-14, ~4.7 at T-60 and beyond (the curve clamps at its ends - a 3-year
// horizon must not claim more than the measured 2-month uncertainty).
let BACKTEST=null;
const MAE_FALLBACK={"60":3.79,"30":2.53,"14":2.14,"7":1.96,"0":1.62};
function loadBacktest(){
  if(BACKTEST) return Promise.resolve(BACKTEST);
  return fetch(dataBase()+'data/backtest.json').then(r=>r.ok?r.json():null)
    .then(d=>{BACKTEST=d;return d}).catch(()=>null);
}
function maeAt(days){
  const agg=(BACKTEST&&BACKTEST.aggregate)||MAE_FALLBACK;
  const ctry=BACKTEST&&BACKTEST.countries&&BACKTEST.countries[COUNTRY];
  // per-country curves with one or two cycles are noisy, so they are shrunk
  // toward the 14-cycle aggregate: weight n/(n+2)
  let curve=agg;
  if(ctry){
    const counts=(BACKTEST.counts&&BACKTEST.counts[COUNTRY])||{};
    curve={};
    for(const h in agg){
      const c=ctry[h];
      if(c==null){ curve[h]=agg[h]; continue; }
      const n=counts[h]||1;
      const w=n/(n+2);
      curve[h]=w*c+(1-w)*agg[h];
    }
  }
  const pts=Object.keys(curve).map(Number).filter(n=>!isNaN(n))
    .sort((a,b)=>a-b);
  if(!pts.length) return 1.62;
  const d=Math.max(pts[0],Math.min(pts[pts.length-1],days||0));
  for(let i=0;i<pts.length-1;i++){
    if(d<=pts[i+1]){
      const a=pts[i],b=pts[i+1];
      const t=(d-a)/Math.max(1e-9,b-a);
      return curve[a]*(1-t)+curve[b]*t;
    }
  }
  return curve[pts[pts.length-1]];
}
// The correlated swing sigma that makes the total forecast sigma match the
// measured curve: total^2 = dirichlet^2 + (swing/2)^2, floored so the swing
// never contributes less than 1.0pp (the old fixed contribution) - a thin
// poll set keeps its own (larger) Dirichlet uncertainty on top.
function horizonSwing(avg, nPolls){
  const sumA=PARTY_ORDER.reduce((a,p)=>a+Math.max(0.5,(avg[p]||0)),0)
    *effectiveK(nPolls,FORECAST_K);
  const dirichlet=Math.sqrt(0.3*0.7/(sumA+1))*100;
  const target=1.253*maeAt(daysToElection());
  return 2*Math.sqrt(Math.max(0.25,target*target-dirichlet*dirichlet));
}
let FORECAST_SWING_ACTIVE=null;
function turnoutSwing(){
  const t=META&&META.turnout;
  return t&&Number(t.swing_sigma)||0;
}
function forecastSwingNow(){
  const base=FORECAST_SWING_ACTIVE!=null?FORECAST_SWING_ACTIVE:FORECAST_SWING;
  return Math.sqrt(base*base+turnoutSwing()*turnoutSwing());
}

function forecastSigma(avg, nPolls){
  const sumA=PARTY_ORDER.reduce((a,p)=>a+Math.max(0.5,(avg[p]||0)),0)*effectiveK(nPolls,FORECAST_K);
  const dirichlet=Math.sqrt(0.3*0.7/(sumA+1))*100;
  // Correlated bloc swing adds roughly FORECAST_SWING/2 to a party's sd (the
  // swing moves each bloc by ±σ; a party inside a bloc of share s sees about
  // s·σ/mean(bloc)). Approximate the total: sqrt(dirichlet^2 + (swing·0.5)^2),
  // with the swing scaled to the measured days-to-election uncertainty.
  return Math.sqrt(dirichlet*dirichlet+Math.pow(horizonSwing(avg,nPolls)*0.5,2)+turnoutSwing()*turnoutSwing());
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
// Correlated (bloc) swing: the dominant polling-error mode is a systematic
// shift between the two blocs (late swings, differential turnout). Each
// simulation draws one bloc-level swing (σ≈2pp) and moves both blocs in
// opposite directions, preserving within-bloc proportions. The Dirichlet
// per-party noise alone misses this correlation and understates uncertainty.
const FORECAST_SWING=2.0;
// Regional swing error: a region's swing can deviate from the national one
// (Montreal vs the rest, Metro Vancouver vs the interior). Each simulation
// draws one correlated bloc deviation per region (sigma FORECAST_REGION_SIGMA)
// and applies it to every district of that region via conf.regionOf; countries
// without a region map keep the pure national draw.
// Baseline-pattern uncertainty is part of this same draw: the projection's
// district pattern error was measured on the 2026 MV/Berlin state elections
// (114 Wahlkreise, actual per-district results) at 2.29pp MAE for proportional
// swing - a number that already includes the baseline pattern's own error -
// and region 1.5 + district 1.5 combine to ~2.1pp, so the noise is calibrated
// to the measured total. Reconstructed baselines (Romania's scaled 2020
// pattern, proxy-inherited parties) carry extra pattern risk that is handled
// at the source instead: proxy baselines are confidence-shrunk toward the
// proxy's national share in districtShares. No per-country uplift until a
// cycle with per-district actuals measures one.
const FORECAST_REGION_SIGMA=1.5;
// Per-district swing error: local factors (candidate quality, local issues)
// make a single district's swing noisier than its region's, and a small
// electorate gives more leverage to single events (Poliwave): the error scales
// as sqrt(median electorate / district electorate), using the 2022 valid-vote
// count as the electorate proxy (stored per constituency as votes2022).
const FORECAST_DISTRICT_SIGMA=1.5;

let DISTRICT_VOTES_MEDIAN=null, DISTRICT_VOTES_KEY=null;
function districtVotesMedian(){
  if(!CONSTITUENCIES||!CONSTITUENCIES.constituencies) return 0;
  if(DISTRICT_VOTES_KEY===CONSTITUENCIES) return DISTRICT_VOTES_MEDIAN;
  const votes=CONSTITUENCIES.constituencies
    .map(c=>c.votes2022||0).filter(v=>v>0).sort((a,b)=>a-b);
  DISTRICT_VOTES_KEY=CONSTITUENCIES;
  DISTRICT_VOTES_MEDIAN=votes.length?votes[Math.floor(votes.length/2)]:0;
  return DISTRICT_VOTES_MEDIAN;
}
// Apply a common bloc swing to a shares vector. Returns a new object.
function applyNationalSwing(simVotes){
  if(ARCHIVE_MODE) return simVotes;   // frozen snapshot predates the swing
  const b1=BLOCS&&BLOCS.bloc1, b2=BLOCS&&BLOCS.bloc2;
  if(!b1||!b2||!b1.parties||!b2.parties) return simVotes;
  const t1=b1.parties.reduce((a,p)=>a+(simVotes[p]||0),0);
  const t2=b2.parties.reduce((a,p)=>a+(simVotes[p]||0),0);
  if(!(t1>0)||!(t2>0)) return simVotes;
    const delta=gaussianSample(fcRand)*forecastSwingNow();
  const f1=Math.max(0.05,1+delta/t1);   // bloc1 gains delta
  const f2=Math.max(0.05,1-delta/t2);   // bloc2 loses delta
  const out={};
  let sum=0;
  for(const p in simVotes){
    const v=simVotes[p]||0;
    let w=v;
    if(b1.parties.includes(p)) w=v*f1;
    else if(b2.parties.includes(p)) w=v*f2;
    out[p]=Math.max(0,w);
    sum+=out[p];
  }
  if(sum>0){for(const p in out) out[p]=100*out[p]/sum}
  return out;
}

// The published calibration of the majority probability: hit rates per
// predicted-probability bucket from the backtest's scenario distribution
// (data/backtest.json, written by scraper/backtest.py).
function calibNote(){
  const cal=BACKTEST&&BACKTEST.calibration;
  if(!cal||!cal.buckets||!cal.buckets.length||!cal.n) return '';
  const parts=cal.buckets.map(b=>
    `${Math.round(b.lo*100)}\u2013${Math.round(b.hi*100)}%: ${b.hits}/${b.n}`).join(' \u00b7 ');
  const scope=cal.n_cycles?`${cal.n_cycles} ${t('cycles','d\u00f6ng\u00fc')} \u00d7 5 ${t('horizons','ufuk')}`:`${cal.n} ${t('cycle-horizons','d\u00f6ng\u00fc-ufuk')}`;
  return `<div style="font-size:11px;color:var(--c-text-muted);margin-top:4px">${t('calibrated on','kalibrasyon:')} ${scope} (${t('bloc of the projected leader','tahmini liderin bloğu')}): ${parts}</div>`;
}

function runSeatForecast(avg, nSims, nPolls){
  // seat-based races keep the fixed swing (the measured MAE curve is in
  // vote-share points); clear any horizon swing set by a vote-based country
  FORECAST_SWING_ACTIVE=null;
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
    let simVotes={};
    PARTY_ORDER.forEach((p,i)=>{simVotes[p]=100*draws[i]/totalD});
    simVotes=applyNationalSwing(simVotes);
    // seats = share * 120, threshold applied, adjusted to sum 120
    let seats={};
    if(SEAT_METHOD==='dhondt'&&SURPLUS_AGREEMENTS.length){
      // Bader-Ofer with surplus-vote agreement cartels (votes in seat units)
      const raw={};
      PARTY_ORDER.forEach(p=>{raw[p]=simVotes[p]/100*SEATS_TOTAL});
      seats=allocateSeatsBaderOfer(raw, SEATS_TOTAL, thSeats);
      PARTY_ORDER.forEach(p=>{if(seats[p]===undefined)seats[p]=0});
    }else{
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
    }
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
  // the correlated swing is scaled to the measured days-to-election error
  // curve for this country before any simulation draws from it
  FORECAST_SWING_ACTIVE=horizonSwing(avg,nPolls);
  let K=effectiveK(nPolls,FORECAST_K);
  const maj={rg:0,td:0,hung:0,km:0};
  const largest={};
  const top2={};
  const win50={};
  const seatsBy={};
  const votesBy={};
  PARTY_ORDER.forEach(p=>{seatsBy[p]=[];votesBy[p]=[]});
  seatsBy.other=[];votesBy.other=[];
  const comboCount={};
  // dissolved alliances (pastOnly) never contest the projection: keep their
  // sim draw negligible so they cannot soak up seats or votes (Serbia's SPN
  // is still in PARTY_ORDER for the 2023 result view)
  const alpha=PARTY_ORDER.map(p=>(PARTY_META[p]&&(PARTY_META[p].pastOnly||PARTY_META[p].unallocated))?0.01:
    Math.max(0.5,(avg[p]||0)*K));
  // "Other" is a real bucket in the Dirichlet: its draw competes with the
  // modelled parties, so their simulated shares shrink to honest levels.
  alpha.push(Math.max(0.5,(avg.other||0)*K));
  const ORDER_ALL=PARTY_ORDER.concat(['other']);
  // Parties with no polling (UK's NI parties): their Dirichlet placeholder
  // draw would otherwise act as a "poll" and swing their seats on noise.
  // Pin them to their last-election national share, so districtShares gives
  // them zero swing and their seats hold the baseline.
  const natBase=(MAP_CONF()&&MAP_CONF().national2021)||LAST_ELECTION.results||{};
  const noPoll={};
  PARTY_ORDER.forEach(p=>{
    if(avg[p]==null&&!(PARTY_META[p]&&PARTY_META[p].pastOnly))
      noPoll[p]=natBase[p]||0;
  });
  for(let s=0;s<nSims;s++){
    const draws=alpha.map(a=>gammaSample(a));
    const totalD=draws.reduce((a,b)=>a+b,0);
    let simVotes={};
    PARTY_ORDER.forEach((p,i)=>{simVotes[p]=100*draws[i]/totalD});
    simVotes.other=100*draws[PARTY_ORDER.length]/totalD;
    for(const p in noPoll) simVotes[p]=noPoll[p];
    simVotes=applyNationalSwing(simVotes);
    // one correlated regional swing deviation per region (see
    // FORECAST_REGION_SIGMA), applied to that region's districts below
    let regionNoise=null;
    const mconf=MAP_CONF();
    if(mconf&&mconf.regionOf&&FORECAST_REGION_SIGMA>0){
      regionNoise={};
      for(const nr in mconf.regionOf){
        const r=mconf.regionOf[nr];
        if(!(r in regionNoise)) regionNoise[r]=gaussianSample(fcRand)*FORECAST_REGION_SIGMA;
      }
    }
    // per-district swing error (the baseline pattern's own error, measured
    // at 2.29pp MAE for proportional swing on 114 Wahlkreise): drawn for
    // every mapped country, scaled by electorate size where the vote counts
    // are known. Without this the seat simulation inherits only the national
    // vote noise and the majority probabilities come out overconfident.
    let districtNoise=null;
    if(mconf&&mconf.districts&&FORECAST_DISTRICT_SIGMA>0){
      const ref=(mconf.useConstituencies)?districtVotesMedian():0;
      districtNoise={};
      for(const nr of Object.keys(mconf.districts)){
        let scale=1;
        if(ref>0){
          const c=constituencyById(nr);
          const v=(c&&c.votes2022)||ref;
          scale=Math.sqrt(ref/Math.max(1,v));
        }
        districtNoise[nr]=gaussianSample(fcRand)*FORECAST_DISTRICT_SIGMA*
          scale;
      }
    }
    const seats=(mconf&&mconf.winnerDistricts)?allocateSeatsWinnerDistricts(simVotes,SEATS_TOTAL,regionNoise,districtNoise):(mconf&&mconf.fptpSeats)?allocateSeatsItaly(simVotes):((SEAT_METHOD==='fptp')?allocateSeatsFptp(simVotes,regionNoise,districtNoise):allocateSeatsFast(simVotes,SEATS_TOTAL,regionNoise,districtNoise));
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
    let top=PARTY_ORDER[0],topN=HIDE_BLOCS?(simVotes[PARTY_ORDER[0]]||0):(seats[PARTY_ORDER[0]]||0);
    for(const p of PARTY_ORDER){
      const v=HIDE_BLOCS?(simVotes[p]||0):(seats[p]||0);
      if(v>topN){topN=v;top=p}
    }
    largest[top]=(largest[top]||0)+1;
    const srt=PARTY_ORDER.slice().sort((a,b)=>(simVotes[b]||0)-(simVotes[a]||0));
    for(let i=0;i<2&&i<srt.length;i++) top2[srt[i]]=(top2[srt[i]]||0)+1;
    if((simVotes[srt[0]]||0)>=50){
      win50[srt[0]]=(win50[srt[0]]||0)+1;
    }
    PARTY_ORDER.forEach(p=>{seatsBy[p].push(seats[p]||0);votesBy[p].push(simVotes[p])});
    seatsBy.other.push(seats.other||0);
    votesBy.other.push(simVotes.other||0);
    comboCount[PARTY_ORDER.map(p=>seats[p]||0).join(',')]=(comboCount[PARTY_ORDER.map(p=>seats[p]||0).join(',')]||0)+1;
  }
  return summarize(seatsBy,votesBy,largest,maj,nSims,comboCount,top2,win50);
}

function summarize(seatsBy,votesBy,largest,maj,nSims,comboCount,top2,win50){
const means={},medians={},modes={};
const allKeys=PARTY_ORDER.concat(seatsBy.other?['other']:[]);
allKeys.forEach(p=>{
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
  return {maj,largest,seatsBy,votesBy,means,medians,modes,modal,modalN,nSims,top2:top2||{},win50:win50||{}};
}

function deterministicSeats(medians, means, total){
  // Deterministic projection from MEDIAN seats: parties whose median is 0
  // (usually below the threshold) are left at 0. Sum is adjusted to the
  // total using only parties present in the median outcome; the "Other"
  // bucket (unmodelled remainder) takes whatever is left over.
  const s={};
  PARTY_ORDER.forEach(p=>{s[p]=medians[p]||0});
  let sum=PARTY_ORDER.reduce((a,p)=>a+s[p],0);
  const eligible=PARTY_ORDER.filter(p=>s[p]>0);
  // Reconcile the non-additive medians to the house total by largest
  // remainder toward the means: each leftover seat goes to the party whose
  // expected (mean) seats most exceed its current count. The old round-robin
  // handed every eligible party a share of the leftover, which inflated
  // stable small parties (UK: the NI parties' medians of 7/5/2/1/1/1 all
  // gained +2).
  if(sum<total&&eligible.length){
    while(sum<total){
      let best=null,bestGap=-Infinity;
      for(const p of eligible){
        const gap=(means[p]||0)-s[p];
        if(gap>bestGap){bestGap=gap;best=p}
      }
      if(!best) break;
      s[best]++;sum++;
    }
  }else if(sum>total&&eligible.length){
    while(sum>total){
      let best=null,bestGap=-Infinity;
      for(const p of eligible){
        if(s[p]<=0) continue;
        const gap=s[p]-(means[p]||0);
        if(gap>bestGap){bestGap=gap;best=p}
      }
      if(!best) break;
      s[best]--;sum--;
    }
  }
  // unmodelled remainder as "Other" seats (empty wedge otherwise)
  const otherSeats=total-sum;
  if(otherSeats>0) s.other=otherSeats;
  return s;
}

function pct100(x){return (x*100).toFixed(1)+'%'}

/* ---------- second-round runoff forecast (two-round presidential) ---------- */
function gaussianSample(rng){
  let u1=0;do{u1=rng()}while(u1<=1e-9);
  const u2=rng()||1e-9;
  return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
}

function frRunoffPairs(p){
  return (p.runoffs&&p.runoffs.length)?p.runoffs:[p.runoff];
}
function weightedAvgRunoff(polls, cand){
  const frM=firstRoundMAE();
  let wSum=0,wTotal=0;
  for(const p of polls){
    let v;
    for(const pr of frRunoffPairs(p)){
      if(pr&&pr[cand]!==undefined){ v=pr[cand]; break; }
    }
    if(v===undefined) continue;
    // Runoff weighting: the pollster's measured error in the first round
    // (their final pre-4-Oct poll vs the actual result) when available - the
    // freshest possible accuracy signal, from this very election - falling
    // back to the historical table. Floored so one lucky pollster cannot
    // dominate.
    const mae=frM[p.pollster];
    const pw=mae?1/Math.max(mae,0.5):pollsterWeight(p.pollster);
    const w=(p.n||1000)*pw*recencyWeight(p.date);
    wSum+=v*w; wTotal+=w;
  }
  return wTotal>0?wSum/wTotal:null;
}

// Per-pollster MAE from the 2026 first round: each pollster's final poll
// before election day scored against the actual result across the six
// tracked candidates. Recomputed once per country load; empty when the
// country has no firstRoundResult (i.e. before round 1).
let FR_MAE=null;
function firstRoundMAE(){
  if(FR_MAE!==null) return FR_MAE;
  FR_MAE={};
  const conf=COUNTRIES[COUNTRY]||{};
  const fr=conf.firstRoundResult;
  if(!fr) return FR_MAE;
  const frDate=conf.firstRoundDate||'2026-10-04';
  const best={};
  POLLS.forEach(p=>{
    if(!p.votes||!p.date||p.date>frDate) return;
    const ks=Object.keys(p.votes).filter(k=>fr[k]!=null);
    if(ks.length<3) return;
    const err=ks.reduce((a,k)=>a+Math.abs(p.votes[k]-fr[k]),0)/ks.length;
    const cur=best[p.pollster];
    if(!cur||p.date>=cur.date) best[p.pollster]={date:p.date,err:err};
  });
  Object.keys(best).forEach(ps=>{FR_MAE[ps]=best[ps].err});
  return FR_MAE;
}

// Head-to-head runoff forecast from polls that carry a "runoff" pair.
// Averages are recency-weighted, renormalized to the two candidates, then
// simulated head-to-head with the same national polling error scale.
function runoffForecast(avg, filtered, sim){
  const roPolls=filtered.filter(p=>p.runoff&&typeof p.runoff==='object'&&Object.keys(p.runoff).length);
  if(roPolls.length<2) return null;
  // memoize: the runoff sim is deterministic (seeded) and only depends on the
  // runoff poll set, so cache by date+count+headline values
  const freq={};
  roPolls.forEach(p=>frRunoffPairs(p).forEach(pr=>Object.keys(pr).forEach(c=>{freq[c]=(freq[c]||0)+1})));
  const freqPair=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,2);
  if(freqPair.length<2) return null;
  // the pairing follows the first round: the projected top two of the
  // current view (the selected poll field included). Their head-to-head
  // polls are used when they exist; otherwise the most-polled pairing
  // stands in (flagged pairFallback for the caption).
  let pair=freqPair, pairFallback=true;
  if(avg){
    const top=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly))
      .slice().sort((a,b)=>(avg[b]||0)-(avg[a]||0));
    if(top.length>=2&&(avg[top[0]]||0)>0&&(avg[top[1]]||0)>0&&
       roPolls.some(p=>frRunoffPairs(p).some(pr=>
                       pr[top[0]]!==undefined&&pr[top[1]]!==undefined))){
      pair=[top[0],top[1]];
      pairFallback=false;
    }
  }
  const a=pair[0], b=pair[1];
  const cacheKey=roPolls.map(p=>p.date+':'+p.pollster).join('|')+'|'+a+','+b;
  if(RUNOFF_CACHE[cacheKey]) return RUNOFF_CACHE[cacheKey];
  const wa=weightedAvgRunoff(roPolls,a), wb=weightedAvgRunoff(roPolls,b);
  if(wa===null||wb===null) return null;
  const tot=wa+wb;
  let aN=100*wa/tot, bN=100*wb/tot;
  // round 1 is over: the actual two-way vote anchors the projection
  // (65% head-to-head polls, 35% the round-1 result - the same
  // poll-weight philosophy as the main model)
  const fr=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].firstRoundResult;
  if(fr&&fr[a]!=null&&fr[b]!=null&&fr[a]+fr[b]>0){
    const ft=fr[a]+fr[b];
    aN=0.65*aN+0.35*(100*fr[a]/ft);
    bN=0.65*bN+0.35*(100*fr[b]/ft);
  }
  const rng=mulberry32(hashStr((POLLS[0]?POLLS[0].date:'')+'|runoff|'+roPolls.length));
  const sigma=forecastSigma({[a]:aN,[b]:bN}, roPolls.length);
  // horizon drift for the runoff date (the first-round date is past, so
  // daysToElection() is 0 during the runoff campaign)
  const dRo=META.election_date_runoff;
  const hRo=dRo?Math.max(0,(new Date(dRo).getTime()-Date.now())/86400000):0;
  const sigmaT=Math.sqrt(sigma*sigma+Math.pow(FORECAST_DRIFT*Math.sqrt(Math.min(120,hRo)),2));
  // Head-to-head shares are complementary (a + b = 100): the polling error
  // shifts both by the same amount in opposite directions, so the margin's
  // error is 2x the share error. Drawing independent errors per candidate
  // (the old model) overstates the margin and made this card disagree with
  // the elected-president probability.
  let winA=0;
  const valsA=[];
  for(let s=0;s<3000;s++){
    const x=gaussianSample(rng)*sigmaT;
    const va=aN+x;
    valsA.push(va);
    if(va > bN-x) winA++;
  }
  valsA.sort((p,q)=>p-q);
  const aExp=mean(valsA), aLo=percentile(valsA,5), aHi=percentile(valsA,95);
  const res={a,b,aN,bN,winA,roN:roPolls.length,sigma,roPolls,pairFallback,
             aExp,aLo,aHi,bExp:100-aExp,bLo:100-aHi,bHi:100-aLo};
  RUNOFF_CACHE[cacheKey]=res;
  return res;
}

// First-round threshold card (two-round presidential): each candidate's chance
// of winning outright in round 1 (>=50% of valid votes, sim.win50) vs being
// forced to a runoff (reaches top-2 but no majority).
function firstRoundCard(sim){
  if(!sim||!sim.win50) return '';
  const fOrder=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  const rows=fOrder.map(p=>{
    const w1=(sim.win50[p]||0)/sim.nSims;
    const top2=(sim.top2[p]||0)/sim.nSims;
    const runoff=Math.max(0,top2-w1);
    return {p, w1, runoff, top2, color:PARTY_META[p]?PARTY_META[p].color:'#888'};
  }).sort((a,b)=>(b.w1+b.runoff)-(a.w1+a.runoff)).slice(0,4);
  const barRow=(label,color,v)=>`<div class="fc-row">
    <span class="fc-row-label" style="color:${color}">${label}</span>
    <div class="fc-row-bar"><div class="fc-row-fill" style="width:${(v*100).toFixed(1)}%;background:${color}"></div></div>
    <span class="fc-row-val">${pct100(v)}</span>
  </div>`;
  return `<div class="card">
    <div class="card-head"><div class="bar"></div><div class="t">${t('FIRST ROUND — MAJORITY','İLK TUR — ÇOĞUNLUK')}</div></div>
    <div class="fc-seathead fc-seathead-hd"><span>${t('WINS ROUND 1','İLK TURU KAZANIR')}</span><span></span><span>P</span></div>
    ${rows.map(r=>barRow(partyCode(r.p),r.color,r.w1)).join('')}
    <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('REACHES A RUNOFF','İKİNCİ TURA KALIR')}</span><span></span><span>P</span></div>
    ${rows.map(r=>barRow(partyCode(r.p),r.color,r.runoff)).join('')}
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px">
      ${t('A candidate is elected in round 1 with a majority of valid votes (≥50%); otherwise the top two face a runoff.','Bir aday ilk turda geçerli oyların çoğunluğunu (≥%50) alırsa seçilir; aksi halde en çok oy alan iki aday ikinci turda karşılaşır.')}
    </div>
  </div>`;
}

/* ---------- your prediction ---------- */
// Seats from user-entered vote shares: the same dispatcher the projection
// uses (overhang/leveling houses, district allocations, FPTP ridings,
// thresholds, minority exemptions). A party entered at zero is pinned out of
// every district first - otherwise the swing model would still hand it its
// baseline (a party at 0 is not on the ballot).
function predictionSeats(votes){
  if(SEAT_BASED) return seatParliament(votes, SEATS_TOTAL);
  const zeroed=PARTY_ORDER.filter(p=>!(votes[p]>0.01));
  const conf=MAP_CONF();
  let saved=null, mutated=false;
  if(conf&&conf.districts&&zeroed.length){
    saved=conf.noCandidate;
    const nc=Object.assign({},saved);
    for(const nr of Object.keys(conf.districts)){
      nc[nr]=(nc[nr]||[]).concat(zeroed);
    }
    conf.noCandidate=nc;
    mutated=true;
  }
  try{
    return allocateSeatsTotal(votes, SEATS_TOTAL);
  }finally{
    if(mutated) conf.noCandidate=saved;
  }
}
let YP_MAP_TIMER=null, YP_MAP_LAYER=0;
// render the active map layer for the entered shares, with zeroed parties
// pinned out (the maps must agree with the seats)
function ypRenderMap(votes){
  const cc=COUNTRIES[COUNTRY]||{};
  const box=document.getElementById('yp-map-box');
  if(!box) return;
  const layer=(YP_MAP_LAYER===1&&cc.map2&&cc.map2.svg)?1:0;
  const base=layer===1?Object.assign({},cc,cc.map,cc.map2):cc.map;
  if(!base||!base.svg) return;
  const zeroed=PARTY_ORDER.filter(p=>!(votes[p]>0.01));
  let conf=base;
  if(base.districts&&zeroed.length){
    const nc=Object.assign({},base.noCandidate);
    for(const nr of Object.keys(base.districts)){
      nc[nr]=(nc[nr]||[]).concat(zeroed);
    }
    conf=Object.assign({},base,{noCandidate:nc});
  }
  renderMapInto(box, votes, false, conf).then(()=>{
    if(window.__ypFit) window.__ypFit();
  });
}
function ypUpdate(){
  const box=document.getElementById('yp-result');
  if(!box) return;
  const votes={}; let sum=0;
  document.querySelectorAll('.yp-in').forEach(el=>{
    const v=Math.max(0,Math.min(100,parseFloat(el.value)||0));
    votes[el.dataset.p]=v; sum+=v;
  });
  const sumEl=document.getElementById('yp-sum');
  if(sumEl) sumEl.textContent=fmt(sum,1)+'%';
  const seats=predictionSeats(votes);
  if(!seats||!Object.keys(seats).length){ box.innerHTML=''; return; }
  const order=PARTY_ORDER.filter(p=>votes[p]!==undefined&&!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  let total=0; order.forEach(p=>{total+=seats[p]||0});
  const MAJ=Math.floor(total/2)+1;
  const majEl=document.getElementById('yp-maj');
  if(majEl) majEl.textContent=total+' '+T.seats+' · '+t('majority','çoğunluk')+' '+MAJ;
  let rows='';
  order.slice().sort((a,b)=>(seats[b]||0)-(seats[a]||0)).forEach(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const n=seats[p]||0;
    const logo=PARTY_LOGOS[p]
      ?`<img src="${dataBase()}${PARTY_LOGOS[p]}?v=${LOGO_CACHE}" alt="${p}" style="width:13px;height:13px;object-fit:contain">`
      :`<span style="font-weight:900;font-size:9px;color:${textOn(col)}">${partyCode(p).replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()}</span>`;
    rows+=`<div class="yp-res">
      <span class="yp-logo" style="background:${col}">${logo}</span>
      <span class="lbl" style="color:${col}">${partyCode(p)}</span>
      <div class="track"><div class="fill" style="width:${total?(n/total*100):0}%;background:${col}"></div></div>
      <span class="n">${n}</span>
      <span class="v">${fmt(votes[p]||0,1)}%</span>
    </div>`;
  });
  let note=`<div class="yp-note" style="color:var(--c-text-muted)">${t('Majority','Çoğunluk')}: ${MAJ}</div>`;
  if(BLOCS&&BLOCS.bloc1&&BLOCS.bloc2){
    const b1=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const b2=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const win=b1>=MAJ?BLOCS.bloc1.name:(b2>=MAJ?BLOCS.bloc2.name:null);
    const label=win?`<b style="color:var(--c-accent)">${win} — ${t('majority','çoğunluk')}</b>`:t('No majority','Çoğunluk yok');
    note=`<div class="yp-note">${label} · ${BLOCS.bloc1.name} ${b1} · ${BLOCS.bloc2.name} ${b2} · ${t('majority at','çoğunluk sınırı')} ${MAJ}</div>`;
  }
  box.innerHTML=`${rows}${note}`;
  const pb=document.getElementById('yp-parl-box');
  if(pb) pb.innerHTML=buildParliamentSVG(seats);
  // the map recolors every district path - the expensive part, so debounce it
  if(document.getElementById('yp-map-box')){
    clearTimeout(YP_MAP_TIMER);
    YP_MAP_TIMER=setTimeout(()=>ypRenderMap(votes), 300);
  }
}

// app.js runs inside an IIFE, so expose the prediction updater for the
// inline oninput handlers in the prediction tab
window.ypUpdate=ypUpdate;

/* ---------- prediction tab ---------- */
function renderPrediction(pane){
  const daysVal=effectiveDays();
  const pollsterVal=$('filter-pollster')?$('filter-pollster').value:'';
  const methodVal=$('filter-method')?$('filter-method').value:'';
  let filtered=recentPolls(POLLS,daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  if(methodVal) filtered=filtered.filter(p=>p.method===methodVal);
  const avg=computeAverages(filtered);
  if(MAP_ONLY||!filtered.length||Object.values(avg).every(v=>v===null)){
    pane.innerHTML=`<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('YOUR PREDICTION','TAHMİNİNİZ')}</div></div><div class="method-text" style="padding:16px"><p>${MAP_ONLY?t('Not available for presidential two-round pages.','İki turlu başkanlık sayfalarında kullanılamaz.'):t('No polls in the selected range.','Seçili aralıkta anket yok.')}</p></div></div></div>`;
    return;
  }
  const c=COUNTRIES[COUNTRY]||{};
  const fOrder=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  // unallocated options (Bulgaria's NOTA) read like the Other bucket:
  // they are polled and displayed, but never an editable prediction input
  const ypOrder=fOrder.filter(p=>p!=='ind'&&!(PARTY_META[p]&&PARTY_META[p].unallocated));
  // default: the poll average, else the last national share (the same
  // convention the model uses for unpolled parties - so an unpolled party
  // starts at its baseline and only reads 0 when the user really means it)
  const ypDef=(p)=>avg[p]!=null?avg[p]:((LAST_ELECTION.results&&LAST_ELECTION.results[p])||0);
  let ypInputs='';
  ypOrder.forEach(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const logo=PARTY_LOGOS[p]
      ?`<img src="${dataBase()}${PARTY_LOGOS[p]}?v=${LOGO_CACHE}" alt="${p}" style="width:16px;height:16px;object-fit:contain">`
      :`<span style="font-weight:900;font-size:10px;color:${textOn(col)}">${partyCode(p).replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()}</span>`;
    ypInputs+=`<div class="yp-row">
      <span class="yp-logo" style="background:${col}">${logo}</span>
      <span class="yp-code" style="color:${col}">${partyCode(p)}</span>
      <span class="yp-val"><input class="yp-in" data-p="${p}" type="number" min="0" max="100" step="0.1" value="${ypDef(p).toFixed(1)}" oninput="ypUpdate()"><span class="yp-suf">%</span></span>
    </div>`;
  });
  const hasMap=!!(c.map&&c.map.svg);
  const hasMap2=!!(c.map2&&c.map2.svg);
  if(!hasMap2) YP_MAP_LAYER=0;
  const layerLabel=(o,fb)=>o?((LANG==='tr'?(o.label_tr||o.label):(o.label_en||o.label))||o.name||fb):fb;
  const map2Label=layerLabel(c.map2,t('LAYER 2','KATMAN 2'));
  const map1Label=layerLabel(c.map,t('LAYER 1','KATMAN 1'));
  pane.innerHTML=`<style>
    #pane-prediction .yp-row{display:flex;align-items:center;gap:8px;height:34px;padding:0 8px;border-radius:6px}
    #pane-prediction .yp-row:hover{background:rgba(0,0,0,.035)}
    #pane-prediction .yp-logo{width:22px;height:22px;border-radius:6px;flex:0 0 22px;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
    #pane-prediction .yp-logo img{width:16px;height:16px;object-fit:contain}
    #pane-prediction .yp-code{font-weight:800;font-size:11px;letter-spacing:.4px;min-width:58px}
    #pane-prediction .yp-val{flex:1;display:flex;align-items:center;gap:4px;min-width:0}
    #pane-prediction .yp-in{flex:1;min-width:0;height:26px;padding:0 8px;font-family:var(--font);font-weight:800;font-size:13px;text-align:right;border:2px solid var(--c-edge);border-radius:var(--radius-sm);background:var(--c-surface);color:var(--c-text-main);appearance:textfield;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
    #pane-prediction .yp-in::-webkit-outer-spin-button,#pane-prediction .yp-in::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
    #pane-prediction .yp-in:focus{outline:none;border-color:var(--c-accent);box-shadow:0 0 0 3px rgba(0,0,0,.06)}
    #pane-prediction .yp-suf{font-size:11px;color:var(--c-text-muted);font-weight:700;width:12px;text-align:right}
    #pane-prediction .yp-reset{font-family:var(--font);font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:8px 14px;background:var(--c-surface);border:2px solid var(--c-edge);border-radius:var(--radius-sm);box-shadow:var(--shadow-hard);color:var(--c-text-main);cursor:pointer}
    #pane-prediction .yp-reset:hover{background:#F6F2E7;color:var(--c-accent);transform:translateY(-1px)}
    #pane-prediction .yp-sum{font-size:12px;font-weight:900;color:var(--c-text-muted);font-variant-numeric:tabular-nums}
    #pane-prediction .yp-res{display:flex;align-items:center;gap:8px;height:26px;padding:0 8px;border-radius:6px}
    #pane-prediction .yp-res:hover{background:rgba(0,0,0,.035)}
    #pane-prediction .yp-res .lbl{font-weight:800;font-size:11px;letter-spacing:.4px;min-width:56px}
    #pane-prediction .yp-res .track{flex:1;height:12px;background:var(--c-rule);border-radius:3px;overflow:hidden}
    #pane-prediction .yp-res .fill{height:100%;border-radius:3px}
    #pane-prediction .yp-res .n{font-weight:900;font-size:13px;min-width:38px;text-align:right;font-variant-numeric:tabular-nums}
    #pane-prediction .yp-res .v{font-size:11px;color:var(--c-text-muted);min-width:46px;text-align:right;font-variant-numeric:tabular-nums}
    #pane-prediction .yp-res .yp-logo{width:18px;height:18px;flex:0 0 18px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
    #pane-prediction .yp-res .yp-logo img{width:13px;height:13px}
    #pane-prediction .yp-note{font-size:12px;margin-top:10px}
    #pane-prediction #yp-map-box svg{max-height:62vh;width:auto;max-width:100%}
    #pane-prediction .yp-cards{align-items:stretch}
    #pane-prediction .yp-cards>.card{display:flex;flex-direction:column}
    #pane-prediction .yp-cards>.card .parliament-box{flex:1;min-height:0}
  </style>
  <div class="tab-pane-inner">
    <div class="page-top">
      <div class="card side-card">
        <div class="card-head"><div class="bar"></div><div class="t">${t('YOUR VOTE SHARES','OY ORANLARINIZ')}</div></div>
        ${ypInputs}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding-top:12px;border-top:2px solid var(--c-rule);flex-wrap:wrap">
          <button id="yp-reset" class="yp-reset">${t('RESET TO AVERAGE','ORTALAMAYA DÖN')}</button>
          <span id="yp-sum" class="yp-sum"></span>
        </div>
      </div>
      <div class="page-top-main">
        <div class="yp-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px">
          <div class="card">
            <div class="card-head"><div class="bar"></div><div class="t">${T.seats}</div><span id="yp-maj" style="margin-left:auto;font-size:11px;font-weight:900;color:var(--c-text-muted);font-variant-numeric:tabular-nums"></span></div>
            <div id="yp-result"></div>
          </div>
          <div class="card">
            <div class="card-head"><div class="bar"></div><div class="t">${t('PARLIAMENT','PARLAMENTO')}</div>
              <input id="yp-poster-sub" type="text" placeholder="${t('Poster subtitle (optional)','Poster alt başlığı (isteğe bağlı)')}" style="margin-left:auto;width:190px;height:26px;padding:0 8px;font-family:var(--font);font-size:11px;font-weight:700;border:2px solid var(--c-edge);border-radius:var(--radius-sm);background:var(--c-surface);color:var(--c-text-main)">
              <button class="shot-btn" id="yp-poster-btn" title="${t('Download the prediction poster as PNG','Tahmin posterini PNG olarak indir')}">${CAM_ICON}</button>
            </div>
            <div class="parliament-box" id="yp-parl-box"></div>
          </div>
        </div>
        ${hasMap?`<div class="card">
          <div class="card-head"><div class="bar"></div><div class="t">${t('MAP','HARİTA')}</div>
            ${hasMap2?`<div class="map-toggle-row" style="margin:0 0 0 auto">
              <button class="map-toggle-btn yp-layer-btn${YP_MAP_LAYER===0?' active':''}" data-layer="0">${map1Label}</button>
              <button class="map-toggle-btn yp-layer-btn${YP_MAP_LAYER===1?' active':''}" data-layer="1">${map2Label}</button>
            </div>`:''}
          </div>
          <div class="parliament-box" id="yp-map-box"></div>
        </div>`:''}
      </div>
    </div>
  </div>`;
  ypUpdate();
  // match the sidebar height to the main column (same as the polls tab), so
  // long party lists scroll internally instead of stretching the page
  const fitYpSide=()=>{
    if(!pane.clientHeight) return;
    const main=pane.querySelector('.page-top-main');
    const sc=pane.querySelector('.side-card');
    if(main&&sc) sc.style.height=main.offsetHeight+'px';
  };
  window.__ypFit=fitYpSide;
  requestAnimationFrame(fitYpSide);
  const ypReset=$('yp-reset');
  if(ypReset){
    ypReset.addEventListener('click',()=>{
      document.querySelectorAll('.yp-in').forEach(el=>{
        el.value=ypDef(el.dataset.p).toFixed(1);
      });
      ypUpdate();
    });
  }
  // prediction poster: the entered shares + the seats they yield, with an
  // optional custom subtitle (falls back to "My prediction")
  const ypPosterBtn=$('yp-poster-btn');
  if(ypPosterBtn){
    ypPosterBtn.addEventListener('click',async()=>{
      const votes={};
      document.querySelectorAll('.yp-in').forEach(el=>{
        votes[el.dataset.p]=Math.max(0,Math.min(100,parseFloat(el.value)||0));
      });
      const seats=predictionSeats(votes)||{};
      const order=PARTY_ORDER.filter(p=>votes[p]!==undefined&&votes[p]>0
          &&!(PARTY_META[p]&&PARTY_META[p].pastOnly))
        .slice().sort((a,b)=>(seats[b]||0)-(seats[a]||0));
      const leR=LAST_ELECTION.results||{}, leS=LAST_ELECTION.seats||{};
      const mkRow=(p)=>{
        const dv=votes[p]-(leR[p]||0);
        const ds=(seats[p]||0)-(leS[p]||0);
        return {p:p,name:(PARTY_META[p]||{}).short||partyCode(p),
          shareText:SEAT_BASED?'':'%'+fmt(votes[p]||0,1),
          seatsText:String(seats[p]||0),
          dvText:(!SEAT_BASED&&Math.abs(dv)>=0.05)
            ?(dv>0?'\u25b2'+fmt(dv,1):'\u25bc'+fmt(Math.abs(dv),1)):'',
          dsText:(ds!==0)
            ?(ds>0?'\u25b2'+ds:'\u25bc'+Math.abs(ds)):'',
          ideology:ideologyTr((PARTY_META[p]||{}).ideology||''),
          color:(PARTY_META[p]||{}).color||'#888',
          logo:PARTY_LOGOS[p]||null,
          firstText:''};
      };
      const rows=[], grid=[];
      const bigN=Math.max(5,Math.min(7,
        order.filter(p=>(seats[p]||0)>=8).length,order.length));
      order.slice(0,bigN).forEach(p=>rows.push(mkRow(p)));
      order.slice(bigN,bigN+12).forEach(p=>grid.push(mkRow(p)));
      const tmp=document.createElement('div');
      tmp.innerHTML=buildParliamentSVG(seats);
      const mapBox=document.getElementById('yp-map-box');
      const sub=$('yp-poster-sub');
      const canvas=await renderPoster({
        title:COUNTRY_NAME+' '+t('Election Projection','Seçim Projeksiyonu'),
        subtitle:(sub&&sub.value.trim())||t('My prediction','Tahminim'),
        rows:rows, grid:grid, tiles:null,
        arcSvg:tmp.querySelector('svg'),
        mapSvg:mapBox?mapBox.querySelector('svg'):null,
      });
      downloadPng(canvas.toDataURL('image/png'), COUNTRY+'-prediction.png');
    });
  }
  pane.querySelectorAll('.yp-layer-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      YP_MAP_LAYER=parseInt(btn.dataset.layer,10)||0;
      pane.querySelectorAll('.yp-layer-btn').forEach(b=>b.classList.toggle('active',b===btn));
      const votes={};
      document.querySelectorAll('.yp-in').forEach(el=>{
        votes[el.dataset.p]=Math.max(0,Math.min(100,parseFloat(el.value)||0));
      });
      clearTimeout(YP_MAP_TIMER);
      ypRenderMap(votes);
    });
  });
}

/* ---------- forecast tab ---------- */
function renderForecast(pane){
  const fd=$('filter-days');
  const daysVal=effectiveDays();
  // runoff-only countries (round 1 done, e.g. Brazil after 4 Oct 2026): the
  // forecast tab drops every round-1 card and defaults the map to the runoff
  // layer, so the page is dedicated to the head-to-head race
  const RO_ONLY=!!(COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].runoffOnly);
  if(RO_ONLY){ if(FC_MODE!=='res'&&FC_MODE!=='runoff') FC_MODE='runoff'; }
  else if(FC_MODE==='runoff'||(FC_MODE==='upper'&&!((COUNTRIES[COUNTRY]||{}).senate))) FC_MODE='proj';
  const pollsterVal=$('filter-pollster')?$('filter-pollster').value:'';
  const methodVal=$('filter-method')?$('filter-method').value:'';
  let filtered=recentPolls(POLLS,daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  if(methodVal) filtered=filtered.filter(p=>p.method===methodVal);
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
  // optional third bloc (e.g. Israel's Arab parties): unaligned, so it has no
  // majority probability - shown as its expected seat count instead
  const b3Seats=BLOCS.bloc3?BLOCS.bloc3.parties.reduce((a,p)=>a+mean(sim.seatsBy[p]),0):0;
  const expectedSeats=Math.round(fOrder.reduce((a,p)=>a+mean(sim.seatsBy[p]),0));
  const MAJ=Math.floor(expectedSeats/2)+1;

  // --- Coalition scenarios: P(configured combination reaches a majority),
  // straight from the stored per-run seat samples. Only for countries with
  // `coalitions` in config (uk/spain/germany/dk/netherlands/bc/nz/pt) - the
  // generic majority card already covers the bloc structure elsewhere.
  let coalHtml='';
  const COALITIONS=(COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].coalitions)||null;
  if(COALITIONS&&COALITIONS.length&&sim.seatsBy){
    const nS=sim.nSims;
    const rows=COALITIONS.map(c=>{
      const parts=c.parties.filter(p=>sim.seatsBy[p]);
      if(!parts.length) return null;
      let win=0;
      for(let i=0;i<nS;i++){
        let s=0;
        for(const p of parts) s+=sim.seatsBy[p][i]||0;
        if(s>=MAJ) win++;
      }
      return {c:c, p:win/nS,
              exp:Math.round(parts.reduce((a,p)=>a+mean(sim.seatsBy[p]),0)),
              color:(PARTY_META[parts[0]]||{}).color||'#1A1A1A'};
    }).filter(Boolean).sort((a,b)=>b.p-a.p);
    if(rows.length){
      coalHtml=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('Coalition scenarios','Koalisyon senaryoları')}</div></div>
        ${rows.map(r=>`<div class="coal-row" title="${r.c.parties.join(' + ')} \u2014 ${r.exp} ${T.seats}, ${pct100(r.p)}">
          <div class="coal-id">
            <span class="coal-chips">${r.c.parties.filter(p=>sim.seatsBy[p]).map(p=>`<span class="coal-chip" style="background:${(PARTY_META[p]||{}).color||'#888'}"></span>`).join('')}</span>
            <span class="coal-name">${r.c.name}</span>
            <span class="coal-seats">${r.exp}</span>
          </div>
          <div class="coal-bar"><div class="coal-fill" style="width:${Math.min(100,r.exp/(MAJ*1.3)*100).toFixed(1)}%;background:${r.color}"></div><div class="fc-thresh" style="left:${(100/1.3).toFixed(1)}%"></div></div>
          <span class="coal-p ${r.p>=0.5?'strong':(r.p>=0.1?'mid':'weak')}">${pct100(r.p)}</span>
        </div>`).join('')}
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px">${t('Expected seats vs the '+MAJ+'-seat majority line','Beklenen sandalye ve '+MAJ+' sandalyelik \u00e7o\u011funluk \u00e7izgisi')}</div>
      </div>`;
    }
  }

  // --- Deterministic: median-based parliament ---
  const detSeats=deterministicSeats(sim.medians,sim.means,OVERHANG?expectedSeats:SEATS_TOTAL);
  let cmpRows='';
  const cmpOrder=fOrder.slice().sort((a,b)=>sim.means[b]-sim.means[a]);
  cmpOrder.forEach(p=>{
    // a party that never wins a seat (deterministic, median and mode all 0)
    // is a row of zeros: keep it out of the seats table
    if(!(detSeats[p]||sim.medians[p]||sim.modes[p])) return;
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    cmpRows+=`<tr>
      <td style="font-weight:700;color:${color}">${partyCode(p)}</td>
      <td class="num c" style="font-weight:900">${detSeats[p]}</td>
      <td class="num c">${sim.medians[p]}</td>
      <td class="num c">${sim.modes[p]}</td>
    </tr>`;
  });
  // "Other" row: the unmodelled remainder (minority lists etc.) — must be
  // visible for honest accuracy; below-threshold parties live here.
  cmpRows+=`<tr>
      <td style="font-weight:700;color:#9CA3AF">${t('Other','Diğer')}</td>
      <td class="num c" style="font-weight:900">${detSeats.other||0}</td>
      <td class="num c">${sim.medians.other!=null?sim.medians.other:0}</td>
      <td class="num c">${sim.modes.other!=null?sim.modes.other:0}</td>
    </tr>`;

  // --- Constituency results (median national vote shares) ---
  const medVotes={};
  fOrder.forEach(p=>{
    const arr=sim.votesBy[p].slice().sort((a,b)=>a-b);
    medVotes[p]=arr[Math.floor(arr.length/2)];
  });
  if(sim.votesBy.other){
    const arr=sim.votesBy.other.slice().sort((a,b)=>a-b);
    medVotes.other=arr[Math.floor(arr.length/2)];
  }

  // --- Senate (upper chamber) forecast data: the deterministic block-vote
  // projection from the median national vote shares - shared by the card,
  // the map toggle and the poster ---
  const SEN_UP=(COUNTRIES[COUNTRY]||{}).upper||null;
  const SEN_CONF=(COUNTRIES[COUNTRY]||{}).senate||null;
  const senDet=(!MAP_ONLY&&SEN_UP&&SEN_CONF)?(allocateUpper(medVotes)||{}):null;
  // the forecast map's caption follows its mode, live
  const fcMapCap=()=>FC_MODE==='runoff'
    ?t('Projected runoff winners (Lula vs Flávio) from the head-to-head average · hover a district for the past/forecast comparison','Başa baş ortalamasından tahmini ikinci tur kazananları · geçmiş/tahmin karşılaştırması için bölgenin üzerine gelin')
    :FC_MODE==='upper'
    ?t('Upper-chamber map from the forecast\'s median national vote shares · hover a district for the past/forecast comparison','Üst meclis haritası tahmin medyanından · geçmiş/tahmin karşılaştırması için bölgenin üzerine gelin')
    :t('District winners from the forecast\'s median national vote shares · hover a district for the past/forecast comparison','Tahmin medyanından bölge kazananları · geçmiş/tahmin karşılaştırması için bölgenin üzerine gelin');

  // Second-round runoff card (two-round presidential only)
  let runoffHtml='';
  let roLead=null, roCache=null;
  const rDateNote=META.election_date_runoff?' ('+META.election_date_runoff+')':'';
  if(MAP_ONLY){
    const ro=runoffForecast(avg, filtered, sim);
    if(ro){
      roCache=ro;
      const cA=PARTY_META[ro.a]?PARTY_META[ro.a].color:'#888';
      const cB=PARTY_META[ro.b]?PARTY_META[ro.b].color:'#888';
      const h2a=ro.winA/3000, h2b=1-h2a;
      const reachA=(sim.top2[ro.a]||0)/sim.nSims, reachB=(sim.top2[ro.b]||0)/sim.nSims;
      const w1A=(sim.win50[ro.a]||0)/sim.nSims, w1B=(sim.win50[ro.b]||0)/sim.nSims;
      // Elected = round-1 majority + reach-the-runoff × head-to-head win.
      // Both rows below therefore agree whenever both finalists always reach
      // the runoff (the usual case), instead of reporting a second,
      // independent runoff simulation with a different number.
      const eleA=w1A+Math.max(0,reachA-w1A)*h2a;
      const eleB=w1B+Math.max(0,reachB-w1B)*h2b;
      const row=(label,color,p)=>`<div class="fc-row">
        <span class="fc-row-label" style="color:${color}">${label}</span>
        <div class="fc-row-bar"><div class="fc-row-fill" style="width:${(p*100).toFixed(1)}%;background:${color}"></div></div>
        <span class="fc-row-val">${pct100(p)}</span>
      </div>`;
      const shareRow=(label,color,mu,lo,hi,mom)=>{
        const momHtml=(mom===null||mom===undefined)?'':(mom>0
          ?`<span class="fc-mom up" title="14-day trend vs 30-day">▲ +${fmt(mom,1)}</span>`
          :`<span class="fc-mom down" title="14-day trend vs 30-day">▼ ${fmt(mom,1)}</span>`);
        return `<div class="fc-voterow">
        <span class="fc-row-label" style="color:${color}">${label}</span>
        ${momHtml}
        <div class="fc-row-bar fc-votebar"><div class="fc-row-fill" style="width:${Math.min(100,mu/50*100).toFixed(1)}%;background:${color}"></div></div>
        <span class="fc-vote-val">${fmt(mu,1)}%</span>
        <span class="fc-vote-int">${fmt(lo,1)}–${fmt(hi,1)}</span>
      </div>`;
      };
      runoffHtml=`<div class="card">
        <div class="card-head"><div class="bar"></div><div class="t">${t('SECOND ROUND — RUNOFF','İKİNCİ TUR')}</div></div>
        <div style="font-size:11px;color:var(--c-text-muted);margin-bottom:8px">
          ${t('Head-to-head from','Başa baş:')} ${ro.roN} ${t('runoff polls','ikinci tur anketi')} · \u03c3\u2248${fmt(ro.sigma,1)}pp · ${partyCode(ro.a)} ${fmt(ro.aN,1)}% / ${partyCode(ro.b)} ${fmt(ro.bN,1)}%${ro.pairFallback?` · ${t('nearest polled pairing - no head-to-head for the first-round top two yet','en yakın anket eşleşmesi — ilk turun ilk iki adayı için henüz başa baş anket yok')}`:''}
        </div>
        <div class="fc-seathead fc-seathead-hd"><span>${t('WINS THE RUNOFF','İKİNCİ TURU KAZANIR')}</span><span></span><span>P</span></div>
        ${row(partyCode(ro.a),cA,h2a)}
        ${row(partyCode(ro.b),cB,h2b)}
        <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('REACHES THE RUNOFF','İKİNCİ TURA KALIR')}</span><span></span><span>P</span></div>
        ${row(partyCode(ro.a),cA,reachA)}
        ${row(partyCode(ro.b),cB,reachB)}
        <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('ELECTED PRESIDENT','CUMHURBAŞKANI SEÇİLİR')}</span><span></span><span>P</span></div>
        ${row(partyCode(ro.a),cA,eleA)}
        ${row(partyCode(ro.b),cB,eleB)}
        <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('PROJECTED VOTE SHARE','TAHMİNİ OY ORANI')}</span><span>EXP</span><span>90% INT</span></div>
        ${shareRow(partyCode(ro.a),cA,ro.aExp,ro.aLo,ro.aHi,runoffMomentum(ro.roPolls,ro.a))}
        ${shareRow(partyCode(ro.b),cB,ro.bExp,ro.bLo,ro.bHi,runoffMomentum(ro.roPolls,ro.b))}
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px">
          ${t('Two-round system: a candidate is elected with a majority of valid votes in the first round; otherwise the top two face a runoff two weeks later'+(META.election_date_runoff?rDateNote:'')+'. P(elected) = round-1 majority + reach-the-runoff × head-to-head win.','İki turlu sistem: aday birinci turda geçerli oyların çoğunluğunu alırsa seçilir; aksi halde ilk iki aday iki hafta sonra ikinci turda karşılaşır'+(META.election_date_runoff?rDateNote:'')+'. Seçilme olasılığı = birinci turda çoğunluk + ikinci tura kalma × ikinci tur kazanma.')}
        </div>
      </div>`;
      const winA=eleA>=eleB;
      roLead={n:partyCode(winA?ro.a:ro.b), c:winA?cA:cB, p:winA?eleA:eleB};
    }
  }

  // German 2025 system: direct mandates are seated within the party's
  // proportional entitlement, surplus direct mandates are voided.
  let directHtml='';
  const dm=directMandateSplit(medVotes);
  if(dm&&dm.rows.length){
    const dmRows=dm.rows.map(r=>{
      const color=PARTY_META[r.p]?PARTY_META[r.p].color:'#888';
      const sur=r.surplus?`<td class="num c" style="color:var(--c-accent);font-weight:900">−${r.surplus}</td>`
        :`<td class="num c" style="color:var(--c-rule)">—</td>`;
      return `<tr>
        <td style="font-weight:700;color:${color}">${partyCode(r.p)}</td>
        <td class="num c">${r.d}</td>
        <td class="num c">${r.s}</td>
        <td class="num c">${r.list}</td>
        ${sur}
      </tr>`;
    }).join('');
    directHtml=`<div class="card">
      <div class="card-head"><div class="bar"></div><div class="t">${t('DIRECT MANDATES (ERSTSTIMME)','DOĞRUDAN MANDALAR (ERSTSTIMME)')}</div></div>
      <table class="polls-table compact-table"><thead><tr>
        <th>${t('Party','Parti')}</th><th class="c">${t('Direct','Doğrudan')}</th><th class="c">${t('Seats','Sandalye')}</th><th class="c">${t('List','Liste')}</th><th class="c">${t('Voided','İptal')}</th>
      </tr></thead><tbody>${dmRows}</tbody></table>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
        ${t('2023 electoral law: the 299 constituency winners sit within their party\u2019s proportional seats (Sainte-Laguë/Schepers, 630 seats, 5% threshold); surplus direct mandates are voided.','2023 seçim yasası: 299 seçim bölgesi kazananı partisinin orantısal sandalye sayısı içinde oturur (Sainte-Laguë/Schepers, 630 sandalye, %5 baraj); fazla doğrudan mandalar iptal edilir.')}
        ${dm.surplusTotal?' · '+t('Surplus voided','İptal edilen fazla manda')+': '+dm.surplusTotal:''}
      </div>
    </div>`;
  }

  const constHtml=CONSTITUENCIES&&CONSTITUENCIES.constituencies&&CONSTITUENCIES.constituencies.length&&!(COUNTRIES[COUNTRY]||{}).hideConstituencyTable?
    constituencyTableHtml(medVotes,{
      title:'CONSTITUENCIES',
      showDelta:true,      note:'allocated from the forecast’s median national vote shares'
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
    if(n<=0) return;
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
    // parties at 0.0% are noise; presidential races also drop the
    // simulation-floor artifacts (~0.1%) of candidates no pollster tracks
    if(!(mu>=0.05)) return;
    if(MAP_ONLY&&mu<0.5) return;
    const lo=SEAT_BASED?percentile(arr,5)/100*SEATS_TOTAL:percentile(arr,5);
    const hi=SEAT_BASED?percentile(arr,95)/100*SEATS_TOTAL:percentile(arr,95);
    const thresh=arr.filter(v=>(SEAT_BASED?v/100*SEATS_TOTAL:v)>=vsThresh).length/arr.length;
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    const barW=Math.min(100,mu/vsMax*100);
    // Momentum: recent-14d vs last-30d raw average, shown as ▲/▼ with the delta.
    const mom=partyMomentum(POLLS,p,14,30);
    const momHtml=mom===null?'':(mom>0
      ?`<span class="fc-mom up" title="14-day trend vs 30-day">▲ +${fmt(mom,1)}</span>`
      :`<span class="fc-mom down" title="14-day trend vs 30-day">▼ ${fmt(mom,1)}</span>`);
    let note='';
    if(!MAP_ONLY){
      if(thresh>=0.5){
        if(thresh<0.995) note=`<div class="fc-note">${partyCode(p)} is below the threshold in ${pct100(1-thresh)} of sims</div>`;
      }else if(thresh>0.005){
        note=`<div class="fc-note">${partyCode(p)} crosses the threshold in ${pct100(thresh)} of sims</div>`;
      }
    }
    voteRows+=`<div class="fc-voterow">
      <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
      ${momHtml}
      <div class="fc-row-bar fc-votebar"><div class="fc-row-fill" style="width:${barW}%;background:${color}"></div>${MAP_ONLY||THRESHOLD<=0?'':`<div class="fc-thresh" style="left:${(vsThresh/vsMax*100).toFixed(1)}%"></div>`}</div>
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
    if(!(mu>=0.05)) return;   // never in parliament: a row of zeros is noise
    const lo=percentile(arr,5), hi=percentile(arr,95);
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    const span=Math.max(1,hi-lo);
    const bW=Math.max(1,Math.ceil(span/MAX_BUCKETS));
    // size the histogram from the party's own max seats, not a fixed 350:
    // in 650-seat parliaments (UK) winners can exceed 350 and buckets[350+]
    // was undefined++ -> NaN bars
    const maxSeats=Math.max(...arr,1);
    const buckets=new Array(Math.ceil((maxSeats+1)/bW)).fill(0);
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
      ${inParliament||THRESHOLD<=0?'':'<div class="fc-note">likely below the '+THRESHOLD+'% threshold</div>'}
    </div>`;
  });

  let leadCands;
  if(MAP_ONLY&&roLead){
    // Two-round presidential: the headline is the elected-president
    // probability, not who leads round 1.
    leadCands=[roLead];
  }else if(HIDE_BLOCS){
    leadCands=fOrder.slice().sort((a,b)=>(sim.largest[b]||0)-(sim.largest[a]||0))
      .map(p=>({n:partyCode(p),c:PARTY_META[p]?PARTY_META[p].color:'#888',p:(sim.largest[p]||0)/sim.nSims}));
  }else{
    leadCands=[{n:BLOCS.bloc1.name,c:BLOCS.bloc1.color,p:rgP},{n:BLOCS.bloc2.name,c:BLOCS.bloc2.color,p:tdP}];
    if(kmDefined)leadCands.push({n:BLOCS.kingmakerLabel||'Kingmaker',c:KM_COLOR,p:kmP});
    leadCands.sort((a,b)=>b.p-a.p);
  }
  const leadOutcome=leadCands[0].n, leadColor=leadCands[0].c, leadPct=leadCands[0].p*100;

  // --- Regional drill-down: aggregate the per-district projections into the
  // map's regionOf groups (UK's 12 regions, Spain's 19 communities; BC/QC
  // have only 2 groups so they are skipped). District shares come from the
  // same districtShares() the map uses, weighted by district size.
  let regionHtml='';
  {
    const mc=MAP_CONF();
    const regionIds=(mc&&mc.regionOf)?Object.keys(mc.regionOf):[];
    const nRegions=(mc&&mc.regionOf)?new Set(Object.values(mc.regionOf)).size:0;
    if(mc&&mc.regionOf&&nRegions>=3&&nRegions<=30){
      const groups={};
      regionIds.forEach(nr=>{
        const r=mc.regionOf[nr];
        const sh=districtShares(nr,medVotes,false,mc);
        if(!sh) return;
        const cobj=(typeof constituencyById==='function')?constituencyById(nr):null;
        const w=(cobj&&cobj.votes2022)||(mc.seatDistricts&&mc.seatDistricts[nr])||1;
        const g=groups[r]||(groups[r]={w:0,v:{}});
        g.w+=w;
        PARTY_ORDER.forEach(p=>{g.v[p]=(g.v[p]||0)+(sh[p]?sh[p].now:0)*w});
      });
      const rows=Object.keys(groups).map(r=>{
        const g=groups[r];
        const parts=PARTY_ORDER.map(p=>[p,g.v[p]/g.w]).filter(x=>x[1]>0)
          .sort((a,b)=>b[1]-a[1]);
        return {r:r,parts:parts};
      }).filter(x=>x.parts.length).sort((a,b)=>b.parts[0][1]-a.parts[0][1]);
      if(rows.length>=3){
        const REGION_LABELS={
          eastmidlands:'East Midlands',eastofengland:'East of England',london:'London',
          northeast:'North East',northernireland:'Northern Ireland',northwest:'North West',
          scotland:'Scotland',southeast:'South East',southwest:'South West',wales:'Wales',
          westmidlands:'West Midlands',yorkshireandthehumber:'Yorkshire and the Humber',
          andalucia:'Andaluc\u00eda',aragon:'Arag\u00f3n',asturias:'Asturias',
          balears:'Balearic Islands',canarias:'Canary Islands',cantabria:'Cantabria',
          castilla_la_mancha:'Castilla\u2013La Mancha',castilla_y_leon:'Castilla y Le\u00f3n',
          cataluna:'Catalu\u00f1a',ceuta:'Ceuta',extremadura:'Extremadura',galicia:'Galicia',
          madrid:'Madrid',melilla:'Melilla',murcia:'Murcia',navarra:'Navarra',
          pais_vasco:'Pa\u00eds Vasco',rioja:'La Rioja',valenciana:'Valencian Community'};
        const cell=(x,i)=>{
          const pr=x.parts[i];
          if(!pr) return '<td class="num c">\u2014</td>';
          const col=(PARTY_META[pr[0]]||{}).color||'#888';
          return `<td class="num c" style="color:${col};font-weight:${i===0?'900':'700'}">${partyCode(pr[0])} ${fmt(pr[1],1)}</td>`;
        };
        regionHtml=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('Regional breakdown','B\u00f6lgesel da\u011f\u0131l\u0131m')}</div></div>
          <div style="overflow-x:auto"><table class="polls-table compact-table"><thead><tr>
            <th>${t('Region','B\u00f6lge')}</th><th class="c">1</th><th class="c">2</th><th class="c">3</th>
          </tr></thead><tbody>
          ${rows.map(x=>`<tr><td style="font-weight:900">${REGION_LABELS[x.r]||x.r}</td>${cell(x,0)}${cell(x,1)}${cell(x,2)}</tr>`).join('')}
          </tbody></table></div>
          <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">${t('Projected from the median vote shares, weighted by district size','Medyan oy oranlarından, bölge büyüklüğüne göre ağırlıklandırılmış')}</div>
        </div>`;
      }
    }
  }

  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${T.tabs.forecast} — ${COUNTRY_NAME} ${(((META&&META.election_date)||(TREND_CONF&&TREND_CONF.electionDate))||'').slice(0,4)||new Date().getFullYear()}</div>
      <button class="shot-btn" id="fc-poster-btn" title="${t('Download the projection poster as PNG','Projeksiyon posterini PNG olarak indir')}" style="margin-left:auto;align-self:center">${CAM_ICON}</button>
      <button class="shot-btn" id="fc-copy-btn" title="${t('Copy the projection poster to the clipboard','Projeksiyon posterini panoya kopyala')}" style="align-self:center">${COPY_ICON}</button>
      <div class="fc-headline">
        <span class="fc-headline-label" style="color:${leadColor}">${leadOutcome} ${HIDE_BLOCS?t('to win','kazanacak'):t('majority','çoğunluk')}</span>
        <span class="fc-headline-num">${leadPct.toFixed(1)}%</span>
      </div>
      <div class="hero-date">${sim.nSims.toLocaleString()} ${t('simulations','simülasyon')} · ${t('national polling error','ulusal anket hatası')} (σ≈${SEAT_BASED?fmt(2.2,1)+' seats':fmt(forecastSigma(avg,filtered.length),1)+'pp'}) · ${MAP_ONLY?`${SEATS_TOTAL} ${unitLabel()} · ${RO_ONLY?`${t('runoff','ikinci tur')} ${META.election_date_runoff||''}`:`${t('first round','ilk tur')} ${TREND_CONF?TREND_CONF.electionDate:''}`}`:`${methodNameShort()} · ${seatsDesc()} ${T.seats}${THRESHOLD>0?` · ${THRESHOLD}% ${T.threshold}`:''}`} · seeded, reproducible</div>
    </div>

    ${MAP_ONLY?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.ifHeldToday}</div>
      <button class="shot-btn" id="fc-parl-shot-btn" style="margin-left:auto" title="Download parliament diagram as PNG">${CAM_ICON}</button>
      </div>
      ${MAP_ONLY?'':`<div class="parliament-box" id="fc-parl-box">${buildParliamentSVG(detSeats)}</div>`}
      <div style="overflow-x:auto">
      <table class="polls-table compact-table"><thead><tr>
        <th>${t('Party','Parti')}</th><th class="c">${T.seats}</th><th class="c">Median</th><th class="c">Mode</th>
      </tr></thead><tbody>${cmpRows}</tbody></table></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
        ${t('Deterministic projection from the median of the simulations (parties whose median is 0 are left out)','Simülasyonların medyanından deterministik tahmin (medyanı 0 olan partiler hariç)')}
      </div>
    </div>`}

    ${senDet?(()=>{
      // Senate forecast card: the deterministic upper-chamber projection from
      // the simulation's median national vote shares - the same allocator the
      // polls-tab Senate toggle uses (block voting in Spain, the Stabilicum
      // Senate in Italy)
      const uRows=PARTY_ORDER.filter(p=>(senDet[p]||0)>0)
        .sort((a,b)=>(senDet[b]||0)-(senDet[a]||0))
        .map(p=>`<tr><td style="font-weight:700;color:${partyColor(p,SEN_CONF)}">${partyLabel(p,SEN_CONF)}</td>
          <td class="num c" style="font-weight:900">${senDet[p]}</td></tr>`).join('');
      const uTot=Object.values(senDet).reduce((a,b)=>a+(b||0),0);
      return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.ifHeldToday} — ${SEN_UP.label||t('Upper chamber','\u00dcst meclis')}</div>
        <button class="shot-btn" id="fc-upper-poster-btn" style="margin-left:auto" title="${t('Download the projection poster as PNG','Projeksiyon posterini PNG olarak indir')}">${CAM_ICON}</button>
        <button class="shot-btn" id="fc-upper-copy-btn" title="${t('Copy the projection poster to the clipboard','Projeksiyon posterini panoya kopyala')}">${COPY_ICON}</button></div>
        <div class="parliament-box" id="fc-upper-box">${buildParliamentSVG(senDet,SEN_CONF)}</div>
        <div style="overflow-x:auto"><table class="polls-table compact-table"><thead><tr>
          <th>${t('Party','Parti')}</th><th class="c">${T.seats}</th>
        </tr></thead><tbody>${uRows}</tbody></table></div>
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
          ${SEN_UP.block?t('Upper-chamber projection from the median of the simulations: each province allocates its senators by block voting','\u00dcst meclis projeksiyonu sim\u00fclasyonlar\u0131n medyan\u0131ndan: her il senat\u00f6rlerini blok oylamayla da\u011f\u0131t\u0131r'):t('Upper-chamber projection from the median of the simulations','\u00dcst meclis projeksiyonu sim\u00fclasyonlar\u0131n medyan\u0131ndan')} · ${uTot} ${T.seats}
        </div>
      </div>`;
    })():''}

    ${MAP_CONF()?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.districtMap}</div></div>
      <div class="map-toggle-row" style="justify-content:flex-end">
        ${RO_ONLY?'':`<button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='proj'?' active':''}" data-fcmode="proj">${T.projection}</button>`}
        <button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='res'?' active':''}" data-fcmode="res">${LAST_ELECTION.date.slice(0,4)} ${T.result}</button>
        ${SEN_CONF?`<button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='upper'?' active':''}" data-fcmode="upper">${(SEN_UP&&SEN_UP.label)||t('Upper chamber','\u00dcst meclis')}</button>`:''}
        ${MAP_ONLY&&MAP_CONF()&&(MAP_CONF().runoff2022||MAP_CONF().runoff2026)?`<button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='runoff'?' active':''}" data-fcmode="runoff">${t('RUNOFF','İKİNCİ TUR')}</button>`:''}
        ${COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].map2&&FC_MODE!=='upper'?`<button class="map-toggle-btn parl-btn fc-layer-btn${MAP_LAYER===1?' active':''}" data-maplayer="1">${COUNTRIES[COUNTRY].map2.label||'layer 2'}</button>`:''}
        ${MAP_CONF().useConstituencies&&!MAP_CONF().hideBlocToggle&&BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn fc-map-color-btn${MAP_COLOR==='bloc'?' active':''}" data-mapcolor="bloc">${T.blocs}</button>`:''}
        <button class="shot-btn" id="fc-map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>
      </div>
      <div class="parliament-box" id="fc-map-box"></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center" id="fc-map-cap">
        ${fcMapCap()}
      </div>
    </div>`:''}

    ${regionHtml}

    ${MAP_ONLY&&!RO_ONLY?firstRoundCard(sim):''}
    ${runoffHtml}

    ${directHtml}

    ${constHtml}

    ${RO_ONLY?'':`<div class="fc-section"><div class="bar"></div>${T.probabilities}</div>`}

    ${HIDE_BLOCS?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.majority}</div></div>
      ${majorityBar}
      <div class="fc-majlegend">
        <span><span class="fc-dot" style="background:${BLOCS.bloc1.color}"></span>${BLOCS.bloc1.name} ${pct100(rgP)}</span>
        <span><span class="fc-dot" style="background:${BLOCS.bloc2.color}"></span>${BLOCS.bloc2.name} ${pct100(tdP)}</span>
        ${kmDefined?`<span><span class="fc-dot" style="background:${KM_COLOR}"></span>${BLOCS.kingmakerLabel||'Kingmaker'} ${pct100(kmP)}</span>`:''}
        ${BLOCS.bloc3?`<span><span class="fc-dot" style="background:${BLOCS.bloc3.color}"></span>${BLOCS.bloc3.name} ${Math.round(b3Seats)} ${T.seats} ${t('(unaligned)','(bağımsız)')}</span>`:''}
        <span><span class="fc-dot" style="background:#9CA3AF"></span>No majority ${pct100(hungP)}</span>
      </div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Chance of a ${MAJ}-seat majority</div>
      ${calibNote()}
    </div>`}

    ${coalHtml}

    ${RO_ONLY?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${MAP_ONLY?t('FIRST-ROUND LEADER','İLK TUR LİDERİ'):T.largestParty}</div></div>
      ${largestRows}
    </div>`}

    ${SEAT_BASED||RO_ONLY?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.voteShare}</div></div>
      <div class="fc-votehd"><span></span><span></span><span>EXP</span><span>90% INT</span></div>
      ${voteRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected vote share from simulations${MAP_ONLY||THRESHOLD<=0?'':` · dashed line = ${THRESHOLD}% threshold`}</div>
    </div>`}

    ${MAP_ONLY?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatDistribution}</div></div>
      <div class="fc-seathead fc-seathead-hd"><span></span><span>EXP</span><span>90% INT</span></div>
      ${seatRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected seats = mean of simulations · 90% interval = 5th–95th percentile</div>
    </div>`}
  </div>`;
  const fcParlShot=$('fc-parl-shot-btn');
  if(fcParlShot){
    fcParlShot.addEventListener('click',()=>{
      captureBoxMap('fc-parl-box', COUNTRY+'-forecast-parliament.png');
    });
  }
  const fcUpperPoster=$('fc-upper-poster-btn');
  if(fcUpperPoster){
    fcUpperPoster.addEventListener('click',async()=>{
      const opts=await posterOpts('senate');
      const canvas=await renderPoster(opts);
      downloadPng(canvas.toDataURL('image/png'), opts.file);
    });
  }
  const fcUpperCopy=$('fc-upper-copy-btn');
  if(fcUpperCopy){
    fcUpperCopy.addEventListener('click',async()=>{
      const opts=await posterOpts('senate');
      const canvas=await renderPoster(opts);
      canvas.toBlob(async(blob)=>{
        try{
          await navigator.clipboard.write(
            [new ClipboardItem({'image/png':blob})]);
          fcUpperCopy.innerHTML=CHECK_ICON;
          setTimeout(()=>{fcUpperCopy.innerHTML=COPY_ICON;},1500);
        }catch(e){
          console.error('clipboard copy failed:',e);
        }
      },'image/png');
    });
  }
  const posterOpts=async(scope)=>{
    const nS=sim.nSims;
    const rows=[];
    const grid=[];
    let tiles=null;
    if(scope==='senate'&&senDet&&SEN_CONF){
      // Senate poster: the deterministic upper-chamber projection from the
      // simulation's median vote shares, its own arch and its own map
      const order=PARTY_ORDER.filter(p=>(senDet[p]||0)>0)
        .sort((a,b)=>(senDet[b]||0)-(senDet[a]||0));
      const sRow=p=>({p:p,name:partyLabel(p,SEN_CONF),
        shareText:(medVotes[p]!==undefined&&!SEAT_BASED)?'%'+fmt(medVotes[p],1):'',
        seatsText:fmt(senDet[p]||0,0),
        dvText:'',dsText:'',firstText:'',
        ideology:ideologyTr((PARTY_META[p]||{}).ideology||''),
        color:partyColor(p,SEN_CONF),
        logo:partyLogo(p,SEN_CONF)});
      const lead=order[0];
      const MAJu=Math.floor((SEN_UP.seats||208)/2)+1;
      const tmp=document.createElement('div');
      tmp.innerHTML=buildParliamentSVG(senDet,SEN_CONF);
      let mapSvg=null;
      const mapBox=$('fc-map-box');
      if(mapBox&&FC_MODE==='upper') mapSvg=mapBox.querySelector('svg');
      if(!mapSvg){
        const tmpMap=document.createElement('div');
        try{
          await renderMapInto(tmpMap,medVotes,false,SEN_CONF);
          mapSvg=tmpMap.querySelector('svg');
        }catch(e){}
      }
      return {title:COUNTRY_NAME+' — '+((SEN_UP&&SEN_UP.label)||t('Upper chamber','\u00dcst meclis')),
        subtitle:t('If the election were held today','Se\u00e7im Bug\u00fcn Olsayd\u0131'),
        rows:order.slice(0,7).map(sRow),grid:order.slice(7,19).map(sRow),
        tiles:[{label:partyLabel(lead,SEN_CONF)+' '+t('seats','sandalye'),
                value:fmt(senDet[lead]||0,0),
                color:partyColor(lead,SEN_CONF)},
               {label:t('for a majority','\u00e7o\u011funluk i\u00e7in'),
                value:String(MAJu),color:'#9CA3AF'}],
        arcSvg:tmp.querySelector('svg'),mapSvg:mapSvg,
        file:COUNTRY+'-senate-poster.png'};
    }
      if(MAP_ONLY&&roCache){
        // two-candidate runoff: rows = the pair by win probability, two tiles
        const items=[[roCache.a,roCache.aN,roCache.winA/3000],
                     [roCache.b,roCache.bN,1-roCache.winA/3000]]
          .sort((x,y)=>y[2]-x[2]);
        items.forEach(([p,sh,wp])=>{
          rows.push({p:p,name:(PARTY_META[p]||{}).short||partyCode(p),
            shareText:'%'+fmt(sh,1),seatsText:'',
            color:(PARTY_META[p]||{}).color||'#888',logo:PARTY_LOGOS[p]||null});
        });
        tiles=items.map(([p,sh,wp])=>({
          label:((PARTY_META[p]||{}).short||partyCode(p))+' '+
            t('win probability','kazanma ihtimali'),
          value:'%'+fmt(100*wp,1),
          color:(PARTY_META[p]||{}).color||'#888'}));
      }else{
        const order=fOrder.slice().sort((a,b)=>(sim.means[b]||0)-(sim.means[a]||0));
        // every modelled party that polls above zero (a 0.01 floor only skips
        // float noise), matching the reference posters' 0.0% rows
        const eligible=order.filter(p=>(mean(sim.votesBy[p])||0)>0.01
          ||(sim.means[p]||0)>0.01);
        const coal=(COUNTRIES[COUNTRY]||{}).coalitions||null;
        let topCoal=null;
        if(coal&&!MAP_ONLY){
          const MAJp=Math.floor(expectedSeats/2)+1;
          const blocOfP={};
          ['bloc1','bloc2'].forEach(bk=>{
            ((BLOCS[bk]||{}).parties||[]).forEach(p=>{blocOfP[p]=bk});
          });
          const cross=c=>c.parties.some(p=>blocOfP[p]==='bloc1')
            &&c.parties.some(p=>blocOfP[p]==='bloc2');
          const scored=coal.map(c=>{
            const parts=c.parties.filter(p=>sim.seatsBy[p]);
            let win=0;
            for(let i=0;i<nS;i++){
              let s=0;
              for(const p of parts) s+=sim.seatsBy[p][i]||0;
              if(s>=MAJp) win++;
            }
            return {c:c,p:win/nS,cross:cross(c)};
          }).sort((a,b)=>b.p-a.p);
          // a cross-bloc grand coalition always clears the bar and tells the
          // reader nothing - prefer the strongest realistic alternative
          topCoal=scored.find(x=>!x.cross)||scored[0];
        }
        // per-row first-place tiles only where no majority/coalition card
        // applies (Quebec-style: hideBlocs pages)
        const showFirst=!topCoal&&!MAP_ONLY&&HIDE_BLOCS;
        // big rows: parties at >= 8 mean seats, at least 5 and at most 7;
        // the rest go to the compact grid
        let bigN=eligible.filter(p=>(sim.means[p]||0)>=8).length;
        bigN=Math.max(5,Math.min(7,bigN,eligible.length));
        const leR=LAST_ELECTION.results||{};
        const leS=LAST_ELECTION.seats||{};
        const deltaTexts=(p)=>{
          const dv=mean(sim.votesBy[p])-(leR[p]||0);
          const ds=(detSeats[p]||0)-(leS[p]||0);
          return {
            dvText:(!SEAT_BASED&&Math.abs(dv)>=0.05)
              ?(dv>0?'\u25b2'+fmt(dv,1):'\u25bc'+fmt(Math.abs(dv),1)):'',
            dsText:(!MAP_ONLY&&ds!==0)
              ?(ds>0?'\u25b2'+ds:'\u25bc'+Math.abs(ds)):''
          };
        };
        eligible.slice(0,bigN).forEach(p=>{
          const d=deltaTexts(p);
          rows.push({p:p,name:(PARTY_META[p]||{}).short||partyCode(p),
            shareText:SEAT_BASED?'':'%'+fmt(mean(sim.votesBy[p]),1),
            seatsText:MAP_ONLY?'':fmt(detSeats[p]||0,0),
            dvText:d.dvText, dsText:d.dsText,
            ideology:ideologyTr((PARTY_META[p]||{}).ideology||''),
            color:(PARTY_META[p]||{}).color||'#888',
            logo:PARTY_LOGOS[p]||null,
            firstText:showFirst?'%'+fmt(100*(sim.largest[p]||0)/nS,1):''});
        });
        eligible.slice(bigN,bigN+12).forEach(p=>{
          const d=deltaTexts(p);
          grid.push({p:p,name:(PARTY_META[p]||{}).short||partyCode(p),
            shareText:SEAT_BASED?'':'%'+fmt(mean(sim.votesBy[p]),1),
            seatsText:MAP_ONLY?'':fmt(detSeats[p]||0,0),
            dvText:d.dvText, dsText:d.dsText,
            ideology:ideologyTr((PARTY_META[p]||{}).ideology||''),
            color:(PARTY_META[p]||{}).color||'#888',
            logo:PARTY_LOGOS[p]||null});
        });
        if(topCoal){
          tiles=[{label:topCoal.c.name+' '+t('majority probability','çoğunluk ihtimali'),
            value:'%'+fmt(100*topCoal.p,1),
            color:(PARTY_META[topCoal.c.parties[0]]||{}).color||'#888'}];
        }else if(!MAP_ONLY&&!HIDE_BLOCS){
          tiles=[{label:t('Government majority probability','Hükümetin çoğunluk kazanma olasılığı'),
            value:'%'+fmt(100*rgP,1),
            color:(BLOCS.bloc1||{}).color||'#888'}];
        }else if(MAP_ONLY){
          // presidential multi-candidate: first-round win + runoff win
          const lead=order[0];
          const reach=(sim.top2[lead]||0)/nS;
          const w1=(sim.win50[lead]||0)/nS;
          const h2=roCache?roCache.winA/3000:0;
          const elected=w1+Math.max(0,reach-w1)*h2;
          const lc=(PARTY_META[lead]||{}).color||'#888';
          tiles=[{label:partyCode(lead)+' '+t('wins the first round','ilk turu kazanma'),
                  value:'%'+fmt(100*w1,1),color:lc},
                 {label:partyCode(lead)+' '+t('wins the runoff','ikinci turda kazanma'),
                  value:'%'+fmt(100*elected,1),color:lc}];
        }
      }
      const tmp=document.createElement('div');
      if(!MAP_ONLY) tmp.innerHTML=buildParliamentSVG(detSeats);
      const mapBox=$('fc-map-box');
      return {
        title:COUNTRY_NAME+' '+t('Election Projection','Seçim Projeksiyonu'),
        subtitle:MAP_ONLY&&(COUNTRIES[COUNTRY]||{}).firstRoundResult
          ?(RO_ONLY?t('Runoff','İkinci Tur'):t('1st round','İlk Tur'))
          :t('If the election were held today','Seçim Bugün Olsaydı'),
        rows:rows, grid:grid, tiles:tiles,
        arcSvg:MAP_ONLY?null:tmp.querySelector('svg'),
        mapSvg:mapBox?mapBox.querySelector('svg'):null,
        file:COUNTRY+'-poster.png'
      };
  };
  const fcPoster=$('fc-poster-btn');
  if(fcPoster){
    fcPoster.addEventListener('click',async()=>{
      const opts=await posterOpts(FC_MODE==='upper'?'senate':'congress');
      const canvas=await renderPoster(opts);
      downloadPng(canvas.toDataURL('image/png'), opts.file||COUNTRY+'-poster.png');
    });
  }
  const fcCopy=$('fc-copy-btn');
  if(fcCopy){
    fcCopy.addEventListener('click',async()=>{
      const opts=await posterOpts(FC_MODE==='upper'?'senate':'congress');
      const canvas=await renderPoster(opts);
      canvas.toBlob(async(blob)=>{
        try{
          await navigator.clipboard.write(
            [new ClipboardItem({'image/png':blob})]);
          fcCopy.innerHTML=CHECK_ICON;
          setTimeout(()=>{fcCopy.innerHTML=COPY_ICON;},1500);
        }catch(e){
          console.error('clipboard copy failed:',e);
        }
      },'image/png');
    });
  }
  if(MAP_CONF()){
    const fcRo=runoffMapAvg(avg,filtered,sim);
    const fcRunConf=runoffConf();
    // one render path for every forecast-map mode: proj (median shares),
    // res (last election), runoff and the Senate layer (its own districts)
    const fcRender=()=>{
      const fcBox=$('fc-map-box');
      if(!fcBox) return;
      const upper=(FC_MODE==='upper'&&SEN_CONF)?SEN_CONF:null;
      const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:(FC_MODE==='runoff'&&fcRo?fcRo:medVotes);
      renderMapInto(fcBox, fcAvg, FC_MODE==='res', upper||(FC_MODE==='runoff'?fcRunConf:undefined));
      const capEl=$('fc-map-cap');
      if(capEl) capEl.textContent=fcMapCap();
    };
    fcRender();
    pane.querySelectorAll('.fc-map-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        FC_MODE=btn.dataset.fcmode;
        pane.querySelectorAll('.fc-map-btn').forEach(b=>b.classList.toggle('active',b===btn));
        fcRender();
      });
    });
    pane.querySelectorAll('.fc-map-color-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        MAP_COLOR=(MAP_COLOR==='bloc')?'party':'bloc';
        pane.querySelectorAll('.fc-map-color-btn').forEach(b=>b.classList.toggle('active',b===btn));
        fcRender();
      });
    });
    pane.querySelectorAll('.fc-layer-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        MAP_LAYER=(MAP_LAYER===1)?0:1;
        updateUrl();
        pane.querySelectorAll('.fc-layer-btn').forEach(b=>b.classList.toggle('active',b===btn));
        fcRender();
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

async function loadNovus(){
  try{
    const resp=await fetch(dataBase()+'data/'+COUNTRY+'/novus.json');
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

// Frozen pre-election forecast: the archive snapshot's poll set (e.g.
// archive/sweden-2026/), used as the election-night "final forecast" reference.
let ARCHIVE_FORECAST_CACHE={};
async function loadArchivedForecast(){
  if(ARCHIVE_FORECAST_CACHE[COUNTRY]!==undefined) return ARCHIVE_FORECAST_CACHE[COUNTRY];
  const slug=COUNTRY+'-2026';
  try{
    const resp=await fetch(dataBase()+'archive/'+slug+'/data/'+COUNTRY+'/polls.json');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const j=await resp.json();
    ARCHIVE_FORECAST_CACHE[COUNTRY]=j.polls||null;
    return ARCHIVE_FORECAST_CACHE[COUNTRY];
  }catch(e){
    ARCHIVE_FORECAST_CACHE[COUNTRY]=null;
    return null;
  }
}

function livePartyMap(){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  const map={};
  const mk=conf&&conf.mapCode?conf.mapCode:(p=>p);
  for(const p of PARTY_ORDER) map[mk(p)]=p;
  return map;
}

// comparison rows: live % vs exit poll(s) vs forecast avg.
// Sweden shows both SVT Valu + TV4/Novus; German states show their two
// configured exit polls (FGW + Infratest dimap) in the same two slots.
function liveCompareRows(live, valu, novus, avg){
  const map=livePartyMap();
  const conf=(COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live)||{};
  const eps=conf.exitPoll;
  const exitCols=Array.isArray(eps)&&eps.length
    ? [{lab:eps[0].short, src: valu}, {lab:eps[1].short, src: novus}]
    : eps
      ? [{lab:eps.short, src: valu}]
      : [{lab:'VALU', src: valu}, {lab:'NOVU', src: novus}];
  exitCols.push({lab:'FCST', src: avg});
  const liveParties=live&&live.national&&live.national.parties||[];
  const liveBy={};
  liveParties.forEach(p=>{const k=map[p.code];if(k)liveBy[k]={pct:p.pct,votes:p.votes}});
  const rows=PARTY_ORDER.slice().filter(p=>{
    // a party with no live, exit or forecast value at all (or only 0.0%) is
    // a row of dashes: keep it out of the live comparison
    return [liveBy[p]&&liveBy[p].pct, valu&&valu[p], novus&&novus[p],
            avg&&avg[p]].some(v=>v!=null&&v>=0.05);
  }).sort((a,b)=>{
    const la=liveBy[a]?liveBy[a].pct:0;
    const lb=liveBy[b]?liveBy[b].pct:0;
    return lb-la;
  }).map(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const lv=liveBy[p];
    const lvPct=lv?lv.pct:null;
    const maxV=Math.max(lvPct||0,(valu&&valu[p])||0,(novus&&novus[p])||0,(avg&&avg[p])||0,35);
    const cells=exitCols.map(({lab,src})=>{
      const v=src&&src[p]!=null?src[p]:null;
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
      <div class="hero-title">${T.tabs.live} — ${COUNTRY_NAME}</div>
      <div class="hero-date">Election night · loading official count…</div>
    </div>
  </div>`;
loadLive().then(live=>{
    return Promise.all([loadValu(), loadNovus()]).then(([valu, novus])=>{
    // Placeholder guard: the local live.json is a 2022 snapshot used only as an
    // offline fallback. If that's what we got, don't present 2022 numbers as
    // tonight's result — render the exit polls/forecast with LIVE shown as "—"
    // and a waiting banner instead of the official count.
    const isPlaceholder=live&&live.election==='val2022'&&live.source==='valmyndigheten'&&!live.updated;
    if(isPlaceholder&&COUNTRY==='sweden') live=null;
    const waitingLive=isPlaceholder&&COUNTRY==='sweden';
    return loadArchivedForecast().then(archPollSet=>{
    // Forecast reference: the frozen pre-election archive snapshot when
    // available (Sweden), else the live poll set — so the "final forecast"
    // column shows what the model predicted before election night. Uses the
    // SIMULATION expected vote share (like the forecast tab's EXP column),
    // not the raw poll average.
    let avg=computeAverages(recentPolls(archPollSet||POLLS,60));
    const archPolls=archPollSet||POLLS;
    const archFiltered=recentPolls(archPolls,30);   // match the archive page's default window
    ARCHIVE_MODE=!!archPollSet;   // match the archive's frozen weighting math
    const archAvg=computeAverages(archFiltered);
    ARCHIVE_MODE=false;
    if(archFiltered.length){
      try{
        fcRand=mulberry32(hashStr((archPolls[0]?archPolls[0].date:'')+'|live-fcst|30|'));
        const archSim=runForecast(archAvg,3000,archFiltered.length);
        // expected VOTE SHARE from the simulation (normalized to 100%), exactly
        // like the forecast tab's EXP column
        const simAvg={};
        PARTY_ORDER.forEach(p=>{simAvg[p]=mean(archSim.votesBy[p])});
        avg=simAvg;
      }catch(e){}
    }
    const nat=live&&live.national;
    const counted=nat?nat.counted:0;
    const totalD=nat?nat.totalDistricts:0;
    const countedPct=totalD?Math.round(counted/totalD*100):0;
    const turnout=nat&&nat.turnout!=null?nat.turnout:null;
    const updated=nat&&nat.updatedAt||(live&&live.updated)||'';
    // the worker stamps updated as a raw epoch number; format it for display
    const updatedDisp=(typeof updated==='number')
      ?new Date(updated).toLocaleString(LANG==='tr'?'tr-TR':'sv-SE',{hour:'2-digit',minute:'2-digit'})
      :updated;
    const rows=liveCompareRows(live, valu, novus, avg);

    // seat projection: prefer live official seats (only if they cover most of the
// chamber — at partial counts Valmyndigheten may not publish per-valkrets
// seats yet), else allocate from national pct
let seats=null;
    const map=livePartyMap();
    let vkSeats=null;
    if(live&&live.valkretsar){
      vkSeats={};
      live.valkretsar.filter(Boolean).forEach(v=>{
        (v.seats||[]).forEach(s=>{const k=map[s.code];if(k)vkSeats[k]=(vkSeats[k]||0)+s.seats});
      });
      const vkTotal=PARTY_ORDER.reduce((a,p)=>a+(vkSeats[p]||0),0);
      if(vkTotal<SEATS_TOTAL*0.9) vkSeats=null;   // incomplete -> fall back
    }
    if(vkSeats){
      seats=vkSeats;
    }else if(live&&live.national&&live.national.parties){
      const votes={};
      live.national.parties.forEach(p=>{const k=map[p.code];if(k)votes[k]=p.pct!=null?p.pct:0});
      seats=allocateSeatsFast(votes,SEATS_TOTAL);
    }
    const seatsTotal=seats?PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0):0;
    const parlSvg=seats&&seatsTotal?buildParliamentSVG(seats):'';

    const eps=(COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live&&COUNTRIES[COUNTRY].live.exitPoll)||null;
    const epNote=eps?(Array.isArray(eps)?' · '+t('Exit polls','Çıkış anketleri')+': '+eps.map(e=>`${e.short} (${e.name})`).join(' + '):' · '+t('Exit poll','Çıkış anketi')+': '+eps.short+' ('+eps.name+')'):'';
    const heroLine=waitingLive
      ?`${t('Election night · waiting for the official count…','Seçim gecesi · resmi sayım bekleniyor…')}${epNote}`
      :`${countedPct}% ${t('of','')} ${totalD} ${T.counted} · ${T.turnout} ${turnout!=null?pct(turnout):'—'} · ${T.updated} ${updatedDisp||'—'}${epNote}`;

    // --- majority banner: single full-width bar (RG left / Tidö right) ---
    let majBanner='';
    if(seats&&seatsTotal&&BLOCS.bloc1&&BLOCS.bloc2){
      const b1Seats=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
      const b2Seats=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
      const majNeed=Math.floor(SEATS_TOTAL/2)+1;
      const b1Lead=b1Seats>=majNeed, b2Lead=b2Seats>=majNeed;
      const w1=Math.max(0.5,b1Seats/SEATS_TOTAL*100);   // RG share of the bar
      const w2=Math.max(0.5,b2Seats/SEATS_TOTAL*100);   // Tidö share (right-anchored)
      const thPos=majNeed/SEATS_TOTAL*100;              // majority threshold position
      const c1=BLOCS.bloc1.color||'#C83737';
      const c2=BLOCS.bloc2.color||'#2E6EA8';
      majBanner=`<div class="lv-majbanner">
        <div class="lv-maj-hd">
          <span style="color:${c1}">${BLOCS.bloc1.name} <b>${b1Seats}</b>${b1Lead?' · '+t('MAJ','ÇOĞ'):''}</span>
          <span class="lv-maj-th">${t('MAJORITY','ÇOĞUNLUK')} ${majNeed} / ${SEATS_TOTAL}</span>
          <span style="color:${c2}">${BLOCS.bloc2.name} <b>${b2Seats}</b>${b2Lead?' · '+t('MAJ','ÇOĞ'):''}</span>
        </div>
        <div class="lv-single-bar">
          <div class="lv-single-fill" style="width:${w1}%;background:${c1}"></div>
          <div class="lv-single-gap"></div>
          <div class="lv-single-fill" style="width:${w2}%;background:${c2}"></div>
          <div class="lv-single-th" style="left:${thPos}%"></div>
        </div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--c-text-muted);text-transform:uppercase;margin-top:6px">${SEATS_TOTAL} ${t('seats','sandalye')} · ${majNeed} ${t('needed to govern','hükümet için gerekli')}</div>
      </div>`;
    }

    pane.innerHTML=`<div class="tab-pane-inner">
      <div class="hero fc-hero">
        <div class="hero-title">${T.tabs.live} — ${COUNTRY_NAME}</div>
        <div class="hero-date">${heroLine}</div>
      </div>

      ${majBanner}

      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.liveVs}</div></div>
        <div style="display:flex;gap:8px;align-items:center;padding:0 2px 4px;font-size:9px;font-weight:900;letter-spacing:1px;color:var(--c-text-muted)">
          <span style="width:44px"></span><span style="flex:1">${t('Official count','Resmi sayım')}</span>${(()=>{const ep=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live&&COUNTRIES[COUNTRY].live.exitPoll;if(Array.isArray(ep)&&ep.length)return ep.map(e=>`<span style="flex:1">${t('Exit poll','Çıkış anketi')} (${e.short})</span>`).join('');if(ep)return `<span style="flex:1">${t('Exit poll','Çıkış anketi')} (${ep.short})</span>`;return `<span style="flex:1">${t('Exit poll (Valu)','Çıkış anketi (Valu)')}</span><span style="flex:1">${t('Exit poll (Novus)','Çıkış anketi (Novus)')}</span>`})()}<span style="flex:1">${t('Final forecast','Son tahmin')}</span><span style="width:60px;text-align:right">${T.swing}</span>
        </div>
        ${rows}
      </div>

      ${parlSvg?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatsLive}</div>
        <button class="shot-btn" id="lv-parl-shot-btn" style="margin-left:auto" title="Download parliament diagram as PNG">${CAM_ICON}</button>
        </div>
        <div class="parliament-box" id="live-parl-box">${parlSvg}</div>
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px;text-align:center">${seatsTotal} seats · live allocation</div>
      </div>`:''}

      ${live&&live.valkretsar&&live.valkretsar.length?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.liveMap}</div></div>
        <div class="map-toggle-row" style="justify-content:flex-end">
          <button class="map-toggle-btn parl-btn lv-map-btn active" data-lvmode="live">${T.tabs.live}</button>
          <button class="map-toggle-btn parl-btn lv-map-btn" data-lvmode="res">2022 ${T.result}</button>
          ${BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn lv-map-color-btn" data-lvcolor="bloc">${T.blocs}</button>`:''}
          <button class="shot-btn" id="lv-map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>
        </div>
        <div class="parliament-box" id="live-map-box"></div>
      </div>`:''}

      ${(()=>{const calls=liveCalls(live);if(!calls||!calls.called.length)return '';const rows=calls.called.map(c=>`<div class="lv-call-row">
        <span class="lv-call-name">${c.name}</span>
        <span class="lv-call-dot" style="background:${c.color}"></span>
        <span class="lv-call-win" style="color:${c.color}">${partyCode(c.winner)}</span>
        <span class="lv-call-pct">${Math.round(c.countedPct)}%</span>
      </div>`).join('');return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('CALLED DISTRICTS','SONUÇLANAN BÖLGELER')}</div>
        <span style="margin-left:auto;font-size:11px;font-weight:900;color:var(--c-text-muted)">${calls.calledCount}/${calls.total}</span>
      </div>
      <div class="lv-calls">${rows}</div>
      <div style="font-size:10px;color:var(--c-text-muted);margin-top:6px">${t('A district is called once ≥95% of its precincts report.','Bir bölge, sandıklarının ≥%95\'i sayıldığında sonuçlanmış sayılır.')}</div>
      </div>`;})()}
    </div>`;
    bindLiveMap(live);
    const shot=$('lv-map-shot-btn');
    if(shot) shot.addEventListener('click',()=>captureBoxMap('live-map-box', COUNTRY+'-live-map.png'));
    const lvParlShot=$('lv-parl-shot-btn');
    if(lvParlShot) lvParlShot.addEventListener('click',()=>captureBoxMap('live-parl-box', COUNTRY+'-live-parliament.png'));
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

// Called districts: a valkrets is "called" once >=95% of its districts report.
// Returns {called:[{name,winner,color,countedPct}], total, calledCount}.
function liveCalls(live){
  const conf=MAP_CONF();
  if(!live||!live.valkretsar||!conf) return null;
  const map=livePartyMap();
  const cList=(CONSTITUENCIES&&CONSTITUENCIES.constituencies)||[];
  const calls=[];
  live.valkretsar.forEach((v,i)=>{
    if(!v||!v.parties||!v.totalDistricts) return;
    const countedPct=v.counted/v.totalDistricts*100;
    if(countedPct<95) return;
    let best=null,bv=-1;
    v.parties.forEach(p=>{const k=map[p.code];if(k&&(p.pct||0)>bv){bv=p.pct;best=k}});
    if(!best) return;
    const name=cList[i]?cList[i].name:('Valkrets '+String(i+1).padStart(2,'0'));
    calls.push({name,winner:best,color:PARTY_META[best]?PARTY_META[best].color:'#888',countedPct});
  });
  calls.sort((a,b)=>a.name.localeCompare(b.name));
  return {called:calls,total:live.valkretsar.length,calledCount:calls.length};
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
      <div class="hero-title">${T.tabs.history} — ${COUNTRY_NAME}</div>
      <div class="hero-date">${t('Party vote shares, seats and turnout over time · hover a point for details','Oy oranları, sandalyeler ve katılım yıllara göre · ayrıntılar için üzerine gelin')} · ${LAST_ELECTION.date.slice(0,4)}</div>
    </div>
  </div>`;
  loadHistory().then(hist=>{
    if(!hist||!hist.elections||!hist.elections.length){
      pane.innerHTML=`<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.history}</div></div><div class="method-text" style="padding:16px"><p>${t('No historical data available for','Geçmiş veri yok:')} ${COUNTRY_NAME}.</p></div></div></div>`;
      return;
    }
    pane.innerHTML=`<div class="tab-pane-inner">
      <div class="hero fc-hero">
        <div class="hero-title">${T.tabs.history} — ${COUNTRY_NAME}</div>
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
  // seats ceiling: the chamber's legal cap (SEATS_TOTAL + overhang room) so
  // the graph has stable, country-appropriate headroom instead of a fixed 349
  const seatsCeil=OVERHANG&&OVERHANG.cap?OVERHANG.cap:SEATS_TOTAL;
  const yMax=Math.max(...caps, mode==='votes'?100:seatsCeil);
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
    ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='right';
    ctx.fillText(String(Math.round(v)),pad.left-4,y+3);
  }
  ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='center';
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
    tip.innerHTML=`<div class="map-tip-head"><div class="map-tip-title">${ev2.year} ${T.election}</div></div>${rows}`;
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
    ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='right';
    ctx.fillText(v+'%',pad.left-4,y+3);
  }
  ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='center';
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
    tip.innerHTML=`<div class="map-tip-head"><div class="map-tip-title">${ev2.year} ${T.election}</div>
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
      <div class="card-head"><div class="bar"></div><div class="t">${T.tabs.methodology}</div></div>
      <div class="method-text">
        <h3>${t('Data Sources','Veri Kaynakları')}</h3>
        <p>Polls are collected from the following sources:</p>
        <ul>
          <li><strong>Wikipedia</strong> — aggregated from publicly available polling tables. Primary source.</li>
          ${COUNTRY==='sweden'?'<li><strong>SwedishPolls</strong> (CC0) — GitHub repository maintained by Magnus&nbsp;M瑞典Polls with standardized Swedish polling data since 1944.</li>':''}
        </ul>
        <p>Duplicate polls (same pollster + same date) are deduplicated, with Wikipedia data taking priority.</p>

        <h3>${T.pollAverage}</h3>
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
        ${Object.entries(POLLSTER_MAE).sort((a,b)=>((a[1].overall??a[1]??0)-(b[1].overall??b[1]??0))).map(([ps,d])=>{
          const eCount=Object.keys(d).filter(k=>k!=='overall').length;
          const ov=typeof d==='number'?d:(d.overall??0);
          return `<tr><td>${ps}</td><td class="num">${eCount}</td><td class="num" style="font-weight:700">${(typeof ov==='number'?ov:0).toFixed(2)} ${unit}</td></tr>`;
        }).join('')}
        </tbody></table>

        <h3>${t('Forecast Simulations','Tahmin Sim\u00fclasyonlar\u0131')}</h3>
        <p>${t('The forecast tab runs 3,000 seeded simulations of the national vote. Each draw combines per-party Dirichlet noise (shrinking as the number of polls in the window grows) with a correlated swing between the two blocs, plus regional and district swing noise where the map supports it. The swing\'s size follows the measured polling error of the backtest (14 past elections) by days-to-election: about 2.0pp on election day, 2.7pp two weeks out and 4.7pp two months out or beyond - each country uses its own measured curve where the backtest covers it, shrunk toward the pooled curve. A forecast made months ahead is therefore visibly less certain than one made the day before.',
          'Tahmin sekmesi ulusal oyu 3.000 tohumlanm\u0131\u015f sim\u00fclasyonla modeller. Her \u00e7ekili\u015f, parti bazl\u0131 Dirichlet g\u00fcr\u00fclt\u00fcs\u00fc (penceredeki anket say\u0131s\u0131 artt\u0131k\u00e7a k\u00fc\u00e7\u00fcl\u00fcr) ile iki blok aras\u0131nda korelasyonlu bir sal\u0131n\u0131m\u0131 birle\u015ftirir; harita destekliyorsa b\u00f6lge ve b\u00f6lge-i\u00e7i sal\u0131n\u0131m g\u00fcr\u00fclt\u00fcs\u00fc eklenir. Sal\u0131n\u0131m\u0131n b\u00fcy\u00fckl\u00fc\u011f\u00fc, geri-testin (14 ge\u00e7mi\u015f se\u00e7im) se\u00e7ime kalan g\u00fcne g\u00f6re \u00f6l\u00e7\u00fclen anket hatas\u0131n\u0131 izler: se\u00e7im g\u00fcn\u00fc ~2,0pp, iki hafta \u00f6nce 2,7pp, iki ay ve \u00f6tesinde 4,7pp. Geri-testin kapsad\u0131\u011f\u0131 \u00fclkeler kendi \u00f6l\u00e7\u00fclen e\u011frisini kullan\u0131r (havuz e\u011frisine do\u011fru daralt\u0131lm\u0131\u015f). Bu y\u00fczden aylar \u00f6nceden yap\u0131lan bir tahmin, bir g\u00fcn \u00f6nce yap\u0131landan g\u00f6r\u00fcn\u00fcr bi\u00e7imde daha belirsizdir.')}</p>

        ${MAP_ONLY?`<h3>${t('Two-round system','İki turlu seçim')}</h3>
        <p>${COUNTRY_NAME} elects its president in a two-round system: a candidate wins outright with a <strong>majority of valid votes</strong> on ${TREND_CONF?TREND_CONF.electionDate:'election day'}; otherwise the top two candidates face a runoff two weeks later. The map shows the <strong>${SEATS_TOTAL} ${unitLabel()}</strong> colored by projected winner from the poll average.</p>`:`
        <h3>${t('Seat Projection','Sandalye Tahmini')}</h3>
        <p>${COUNTRY_NAME} elects a base parliament of <strong>${SEATS_TOTAL} seats</strong>${HAS_CONSTITUENCIES&&CONSTITUENCIES&&CONSTITUENCIES.constituencies?` — ${CONSTITUENCIES.constituency_seats} ${CONSTITUENCY_RULE==='fptp'?'direct mandates (first-past-the-post)':`constituency seats across ${CONSTITUENCIES.constituencies.length} constituencies`}${CONSTITUENCIES.leveling_seats?` plus ${CONSTITUENCIES.leveling_seats} leveling seats`:''}`:''} via ${methodSentence()}${THRESHOLD>0?`, with a <strong>${THRESHOLD}% electoral threshold</strong>`:''}.${OVERHANG?` When a party wins more direct mandates than its proportional share, leveling seats (Überhang-/Ausgleichsmandate) grow the parliament until proportions hold — capped at <strong>${OVERHANG.cap} seats</strong>: the most recent Landtag sat ${PARTY_ORDER.reduce((a,p)=>a+(LAST_ELECTION.seats?LAST_ELECTION.seats[p]||0:0),0)} seats.`:''}</p>
        <p>${(MAP_CONF()&&MAP_CONF().fptpSeats)?`The projection runs in two parts: the <strong>${Object.values(MAP_CONF().fptpSeats).reduce((a,b)=>a+b,0)} single-member colleges</strong> are projected one by one (each college's 2022 result swung to the current poll average) and go to the coalition leading there - a coalition's colleges are then split among its parties by their contribution in the colleges it won - and the remaining <strong>${SEATS_TOTAL-Object.values(MAP_CONF().fptpSeats).reduce((a,b)=>a+b,0)} seats</strong> come from a national proportional pool allocated by D'Hondt among parties above the threshold. The map colors each region by its leading party.`:`The parliament diagram shows all ${seatsDesc()} seats allocated nationally from the poll average. It follows the classic Wikimedia parliament-diagram layout: rows of the arch hold every party as a wedge, with the total seat count in the center. Chambers with a supplied floor plan use it; all others are laid out automatically with the canonical ParliamentArch geometry, so any seat count renders without a template.`}</p>`}

        ${HIDE_BLOCS?'':`        ${(COUNTRIES[COUNTRY]||{}).upper?`<h3>${t('Upper Chamber','\u00dcst Meclis')} — ${COUNTRIES[COUNTRY].upper.label||''}</h3>
        <p>The upper chamber projection is an <strong>approximate model</strong>, shown as a separate toggle on the seat projection card.${COUNTRIES[COUNTRY].upper.block?` Spain's Senate uses block voting: each province elects 4 senators (5 for the Balearics and Las Palmas, 6 for Tenerife, 2 for Ceuta and Melilla); seats are allocated super-proportionally from the projected province shares (exponent ~2, largest remainder), which reproduces the observed patterns - 3-1 in a clear race, 2-2 when the top two are close, 4-0 in a landslide, 3-1-1 on the islands.`:` Italy's Senate has its own 74 single-member districts (real 2022 college baselines, swung like the Chamber) plus 126 proportional seats allocated nationally under the ${THRESHOLD}% threshold - the real lists are regional, which is the remaining approximation.`} Treat it as an informed estimate rather than a precise projection.</p>`:''}

        <h3>${t('Bloc Totals','Blok Toplamları')}</h3>
        <p>The <strong>${BLOCS.bloc1.name}</strong> bloc includes ${BLOCS.bloc1.parties.join(', ')}. The <strong>${BLOCS.bloc2.name}</strong> bloc includes ${BLOCS.bloc2.parties.join(', ')}.</p>`}

        <h3>${t('Last Updated','Son Güncelleme')}</h3>
        <p>Data is scraped automatically from Wikipedia${COUNTRY==='sweden'?' and SwedishPolls':''}. The site is updated daily via GitHub Actions.</p>
      </div>
    </div></div>`;
}

/* ---------- main render ---------- */
/* ---------- poll-field scenarios (unsettled candidate fields) ---------- */
// Every poll tests its own hypothetical candidate field. Mixing them makes
// the per-candidate averages sum past 100 (France 2027: ~125%). A scenario
// groups the polls by the subset of the KEY candidates (those tested in at
// least 40% of the window) they tested, so averaging inside a scenario
// yields a coherent single race; polls with extra fringe candidates stay in
// the same scenario. Shown as chips only when at least two scenarios exist.
let FIELD_KEYS=null;
function pollField(p){
  if(!FIELD_KEYS||!FIELD_KEYS.length||!p.votes) return '';
  return FIELD_KEYS.filter(k=>p.votes[k]!==undefined).join(',');
}
function fieldScenarios(polls){
  const withVotes=polls.filter(p=>p.votes&&Object.keys(p.votes).length);
  FIELD_KEYS=null;
  if(withVotes.length<4) return [];
  const cnt={};
  withVotes.forEach(p=>{Object.keys(p.votes).forEach(k=>{
    if(PARTY_META[k]&&PARTY_META[k].pastOnly) return;
    cnt[k]=(cnt[k]||0)+1;
  })});
  const min=Math.max(2,Math.ceil(withVotes.length*0.4));
  FIELD_KEYS=PARTY_ORDER.filter(k=>cnt[k]>=min).slice(0,10);
  if(FIELD_KEYS.length<3){ FIELD_KEYS=null; return []; }
  const groups={};
  withVotes.forEach(p=>{
    const sig=pollField(p);
    if(!sig) return;
    (groups[sig]||(groups[sig]=[])).push(p);
  });
  const list=Object.keys(groups).filter(s=>groups[s].length>=2)
    .sort((a,b)=>groups[b].length-groups[a].length).slice(0,3);
  if(list.length<2) return [];
  const topSet=new Set(list[0].split(','));
  return list.map((sig, idx)=>{
    const sub=groups[sig];
    const a=computeAverages(sub, true);
    const top=sig.split(',').sort((x,y)=>(a[y]||0)-(a[x]||0)).slice(0,2);
    let diff='';
    if(idx>0){
      const set=new Set(sig.split(','));
      const missing=[...topSet].filter(k=>!set.has(k));
      const extra=[...set].filter(k=>!topSet.has(k));
      const parts=[];
      if(missing.length)
        parts.push('\u2212'+missing.map(k=>partyCode(k)).join(', '));
      if(extra.length)
        parts.push('+'+extra.map(k=>partyCode(k)).join(', '));
      diff=parts.join(' ');
    }
    return {sig, n: sub.length,
            label: idx===0?t('MAIN FIELD','ANA KADRO')
                           :t('FIELD','KADRO')+(diff?' '+diff:''),
            detail: top.map(k=>partyCode(k)).join(' \u00b7 ')+
                    (diff?' \u00b7 '+diff:'')};
  });
}
function fieldChips(scenarios){
  if(!scenarios||scenarios.length<2) return '';
  return `<div class="map-toggle-row" style="justify-content:flex-start;margin-top:10px;align-items:center">
    <span style="font-size:11px;color:var(--c-text-muted);margin-right:4px">${t('POLL FIELD','ADAY KADROSU')}:</span>
    <button class="map-toggle-btn fr-field-btn${FIELD_SIG?'':' active'}" data-field="">${t('ALL POLLS','T\u00dcM ANKETLER')}</button>
    ${scenarios.map(s=>`<button class="map-toggle-btn fr-field-btn${FIELD_SIG===s.sig?' active':''}" data-field="${s.sig}" title="${s.detail} \u00b7 ${s.n} ${t('polls','anket')}">${s.label} (${s.n})</button>`).join('')}
  </div>`;
}

function renderPollsTab(){
  const pane=$('pane-polls');
  const daysEl=$('filter-days');
  const daysVal=effectiveDays();
  const pollsterEl=$('filter-pollster');
  const pollsterVal=pollsterEl?pollsterEl.value:'';
  const methodEl=$('filter-method');
  const methodVal=methodEl?methodEl.value:'';

  let filtered=recentPolls(POLLS, daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  if(methodVal) filtered=filtered.filter(p=>p.method===methodVal);
  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
  FILTERED_POLLS=filtered;

  // poll-field scenarios: average inside the selected field so the shares
  // form one coherent race (the runoff machinery keeps the full window -
  // head-to-head polls are field-independent). Config-gated (France only):
  // other models poll a settled field, where subset clusters are noise
  const scenarios=((COUNTRIES[COUNTRY]||{}).fieldSelector)
    ?fieldScenarios(filtered):[];
  if(FIELD_SIG&&filtered.filter(p=>pollField(p)===FIELD_SIG).length<2)
    FIELD_SIG=null;
  const fieldPolls=FIELD_SIG
    ?filtered.filter(p=>pollField(p)===FIELD_SIG)
    :filtered;

  const avg=computeAverages(fieldPolls);
  const rawAvg=computeAverages(fieldPolls, true);

  let html=`<div class="tab-pane-inner">`;
  // Top row: side card beside hero + poll trend
  html+=`<div class="page-top">
    <div class="card side-card"><div id="sidebar-content"></div></div>
    <div class="page-top-main">
      ${renderHero(avg, filtered)}
      ${fieldChips(scenarios)}
      <div class="card" style="height:100%"><div class="card-head"><div class="bar"></div><div class="t">${T.trend}</div>
        ${filtered.some(p=>p.runoff)?`<div class="map-toggle-row" style="margin-left:auto">
          <button class="map-toggle-btn parl-btn trend-mode-btn${TREND_MODE==='fr'?' active':''}" data-trendmode="fr">${t('FIRST ROUND','\u0130LK TUR')}</button>
          <button class="map-toggle-btn parl-btn trend-mode-btn${TREND_MODE==='ro'?' active':''}" data-trendmode="ro">${t('RUNOFF','\u0130K\u0130NC\u0130 TUR')}</button>
        </div>`:''}
        <button class="shot-btn" id="trend-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap"><canvas id="trend-canvas"></canvas></div>
        ${TREND_CONF?`<div style="font-size:10px;color:var(--c-text-muted);padding:6px 12px 8px">◆ ${t('dashed diamond = value extrapolated to election day','kesikli elmas = seçim gününe uzatılan değer')} (${TREND_CONF.electionDate})</div>`:''}
    </div>
    </div>
  </div>`;

  // Seat projection / district map (full width)
  html+=renderParliament(avg);

  // National poll average + blocs
  html+=renderPartyBars(rawAvg);

  // Brazil: state-depth cards under the map (state winners + regions)
  html+=renderStateDepth(avg);

        if(!(COUNTRIES[COUNTRY]||{}).hideConstituencyTable) html+=renderConstituencyTable(avg);
  html+=renderPollsTable(fieldPolls);
  html+=renderRunoffTable(filtered);
  html+=`</div>`;
  pane.innerHTML=html;

  renderSidebar(String(daysVal), pollsterVal, methodVal);

  // Draw chart after DOM update
  requestAnimationFrame(()=>{
    const canvas=$('trend-canvas');
    if(canvas) renderTrendChart(canvas, fieldPolls);
    pane.querySelectorAll('.fr-field-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        FIELD_SIG=btn.dataset.field||null;
        renderPollsTab();
      });
    });
    pane.querySelectorAll('.trend-mode-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        TREND_MODE=btn.dataset.trendmode||'fr';
        const cc=$('trend-canvas');
        if(cc) renderTrendChart(cc, fieldPolls);
        // the generic .parl-btn handler re-renders this tab on any click
        // (bindParlToggles), so match the live buttons by mode, not identity
        pane.querySelectorAll('.trend-mode-btn').forEach(b=>
          b.classList.toggle('active',
            (b.dataset.trendmode||'fr')===TREND_MODE));
      });
    });
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
    else if(tabId==='prediction'){renderPrediction(pane)}
    else if(tabId==='live'){renderLive(pane)}
    else if(tabId==='history'){renderHistory(pane)}
    else if(tabId==='methodology'){renderMethodology(pane)}
  },
  setCountry(id){
    if(!COUNTRIES[id]||id===COUNTRY) return;
    document.body.classList.remove('home');
    setCountry(id);
    for(const k in FC_CACHE) delete FC_CACHE[k];
    for(const k in RUNOFF_CACHE) delete RUNOFF_CACHE[k];
PARL_MODE='proj';
    PARL_VIEW='seats';
    MAP_LAYER=0;
    FC_MODE='proj';
    MAP_COLOR='party';
    FIELD_SIG=null;
    if(LIVE_INTERVAL){clearInterval(LIVE_INTERVAL);LIVE_INTERVAL=null}
    document.querySelectorAll('.tab-trigger').forEach(b=>{b.dataset.active='false';delete b.dataset.loaded});
    document.querySelectorAll('.tab-pane').forEach(p=>{delete p.dataset.loaded});
    // switching country always lands on polls: switchTab syncs the pane
    // display too (previously only the triggers were reset, so the old
    // country's forecast pane stayed visible under a "polls" trigger)
    const pollsBtn=document.querySelector('.tab-trigger[data-tab="polls"]');
    if(pollsBtn) switchTab(pollsBtn);
    applyTheme(); updateSocialMeta();
    renderCountryNav();
    updateUrl();
loadData().then(()=>loadConstituencies()).then(()=>loadBacktest()).then(()=>{
      renderPollsTab();
    });
  }
};

/* ---------- URL routing (?c=country&t=tab&l=2) ---------- */
function updateUrl(){
  if(typeof history==='undefined'||!history.replaceState) return;
  try{
    const p=new URLSearchParams();
    p.set('c',COUNTRY);
    const active=document.querySelector('.tab-trigger[data-active="true"]');
    const tabId=active?active.dataset.tab:'polls';
    if(tabId&&tabId!=='polls') p.set('t',tabId);
    if(MAP_LAYER===1) p.set('l','2');
    history.replaceState(null,'',location.pathname+'?'+p.toString());
  }catch(e){}
}
function applyUrlParams(){
  if(typeof location==='undefined') return;
  const p=new URLSearchParams(location.search);
  if(p.get('l')==='2') MAP_LAYER=1;
  // optional time-range deep link (?d=30/60/90/2026/9999)
  const d=p.get('d');
  if(d){
    const sel=document.getElementById('filter-days');
    if(sel&&[...sel.options].some(o=>o.value===d)) sel.value=d;
  }
  const t=p.get('t');
  if(t&&t!=='polls'){
    const btn=document.querySelector('.tab-trigger[data-tab="'+t+'"]');
    if(btn) switchTab(btn);
  }
}

/* ---------- boot ---------- */
// ARIA wiring: tablist/tab/tabpanel roles + aria-selected/aria-controls.
function wireAria(){
  const nav=document.getElementById('segnav');
  if(!nav) return;
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Sections');
  document.querySelectorAll('.tab-trigger').forEach(b=>{
    const tabId=b.dataset.tab;
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', b.dataset.active==='true'?'true':'false');
    b.setAttribute('aria-controls','pane-'+tabId);
    b.setAttribute('id','tab-'+tabId);
    const pane=document.getElementById('pane-'+tabId);
    if(pane){pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','tab-'+tabId);pane.setAttribute('aria-hidden',pane.classList.contains('active')?'false':'true');}
  });
  // dynamic panes (map boxes etc.) re-render — keep aria-state consistent
  const obs=new MutationObserver(()=>{
    document.querySelectorAll('.tab-trigger').forEach(b=>{
      b.setAttribute('aria-selected', b.dataset.active==='true'?'true':'false');
    });
  });
  obs.observe(nav,{subtree:true,attributes:true,attributeFilter:['data-active']});
}

// Per-country theme: Brazil gets a green/yellow identity (flag accent).
// Social share meta: og:/twitter: cards reflect the current country + election.
function updateSocialMeta(){
  // remove any previously-created social metas (idempotent re-runs)
  document.querySelectorAll('meta[data-social]').forEach(m=>m.remove());
  const title=HOME_MODE
    ? t('Global Election Calendar','K\u00fcresel Se\u00e7im Takvimi')+' | Alt\u0131CiftS\u0131f\u0131r'
    : COUNTRY_NAME+' — '+t('Election Polls & Forecast','Se\u00e7im Anketleri ve Tahmini')+' | Alt\u0131CiftS\u0131f\u0131r';
  const desc=HOME_MODE
    ? t('Upcoming elections, live poll averages and seat projections across','Yakla\u015fan se\u00e7imler, canl\u0131 anket ortalamalar\u0131 ve sandalye tahminleri')+' \u2014 600'
    : t('Live seat projection, poll averages, forecast simulations and district maps for','Canl\u0131 sandalye tahmini, anket ortalamalar\u0131, tahmin sim\u00fclasyonlar\u0131 ve b\u00f6lge haritalar\u0131:')+' '+COUNTRY_NAME+(META.election_date?(' \u00b7 '+t('next election','sonraki se\u00e7im')+' '+META.election_date):'');
  const url=location.origin+location.pathname;
  const set=(sel,attr,val)=>{
    const prop=sel.match(/\[([a-z]+)="([^"]+)"\]/);
    let el=document.querySelector(sel);
    if(!el){
      el=document.createElement('meta');
      if(prop) el.setAttribute(prop[1],prop[2]);
      el.setAttribute('data-social','1');
      document.head.appendChild(el);
    }
    el.setAttribute(attr,val);
  };
  set('meta[property="og:title"]','content',title);
  set('meta[property="og:description"]','content',desc);
  set('meta[property="og:url"]','content',url);
  set('meta[property="og:type"]','content','website');
  set('meta[property="og:site_name"]','content','AltıCiftSıfır — 600');
  set('meta[name="twitter:card"]','content','summary');
  set('meta[name="twitter:title"]','content',title);
  set('meta[name="twitter:description"]','content',desc);
}
function applyTheme(){
  const isBrazil=COUNTRY==='brazil';
  document.body.classList.toggle('theme-brazil', isBrazil);
  const nav=document.getElementById('segnav');
  if(nav) nav.style.borderTopColor=isBrazil?'var(--br-accent)':'';
  const pane=document.getElementById('pane-polls');
  if(pane&&isBrazil){
    // restyle live accent-driven bits via a class on the app shell
  }
}
// Calendar home: no ?c= and no pinned country (sub-pages pin themselves).
const HOME_MODE=!((typeof URLSearchParams!=='undefined')&&new URLSearchParams(location.search).get('c'))
  &&!(typeof window!=='undefined'&&window.__600_COUNTRY__);
loadData().then(()=>loadConstituencies()).then(()=>loadBacktest()).then(()=>{
  setCountry(COUNTRY);
  COUNTRY_NAME=cName(COUNTRY);
  wireAria();
  applyTheme(); updateSocialMeta();
  renderCountryNav();
  loadSummary().then(()=>{ renderCountryNav(); if(HOME_MODE&&SUMMARY) renderHomeBody(); });
  if(HOME_MODE){ renderHome(); }
  else { renderPollsTab(); applyUrlParams(); }
});
window.addEventListener('resize',()=>{fitSideCard(); if(window.__ypFit) window.__ypFit();});

// Offline seat-model API for scraper/seats_run.js (the backtest harness runs
// the real allocation on arbitrary vote maps without a browser). Node sets
// window.__600_SEATAPI__ before loading this file; inert in the browser.
if(typeof window!=='undefined'&&window.__600_SEATAPI__){
  window.__600_loadAll=function(){
    return loadData().then(()=>loadConstituencies()).then(()=>loadBacktest());
  };
  window.__600_alloc=function(cc,votes,total,swing){
    setCountry(cc);
    if(swing){
      const mc=(typeof MAP_CONF==='function')?MAP_CONF():null;
      if(mc) mc.swingMethod=swing;
    }
    return Promise.resolve(HAS_CONSTITUENCIES?loadConstituencies():null).then(()=>
      allocateSeatsTotal(votes,total===undefined?SEATS_TOTAL:total));
  };
  // per-district shares for one district (the base-blend and map checks:
  // projection mode reads the blended base, result mode the pure last
  // election)
  window.__600_districtshares=function(cc,nr,avg,resultMode,confKey){
    setCountry(cc);
    const c=COUNTRIES[cc]||{};
    const conf=confKey?(c[confKey]||null):null;
    return districtShares(String(nr),avg,!!resultMode,conf);
  };
  // the seat-dot split for one district of a named conf ('senate' etc.),
  // so the upper-chamber maps can be checked without a browser
  window.__600_seatsplit=function(cc,nr,avg,resultMode,confKey,debug){
    setCountry(cc);
    const c=COUNTRIES[cc]||{};
    const conf=confKey?(c[confKey]||null):MAP_CONF();
    if(!conf) return null;
    const r=districtSeatSplit(String(nr),avg||{},!!resultMode,conf);
    if(debug){
      const shares=districtShares(String(nr),avg||{},!!resultMode,conf);
      const votes={};
      if(shares) PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?(resultMode?shares[p].past:shares[p].now):0});
      const pool=(conf.alliances||[]).filter(a=>a.provinces.indexOf(String(nr))>=0)
        .map(a=>a.parties.join('+'));
      return {arr:r,order:PARTY_ORDER.slice(0,20),votes,hasShares:!!shares,pool};
    }
    return r;
  };
  // Headless Monte Carlo for the backtest's calibration: the same
  // runForecast the forecast tab uses, slimmed to the summary the harness
  // needs (no per-sim arrays).
  window.__600_forecast=function(cc,votes,nSims,nPolls){
    setCountry(cc);
    return Promise.resolve(HAS_CONSTITUENCIES?loadConstituencies():null).then(()=>{
      const r=runForecast(votes,nSims||1500,nPolls||20);
      return {maj:r.maj,largest:r.largest,means:r.means,medians:r.medians,
              modal:r.modal,nSims:r.nSims};
    });
  };
}

})();
