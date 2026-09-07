// AltıCiftSıfır — election night proxy (Cloudflare Worker)
// Mirrors Valmyndigheten's static result feeds (resultat.val.se) into a compact
// normalized JSON with CORS + short cache for the LIVE tab.
//   GET /sweden                 -> normalized live data for the Riksdag election
//   GET /sweden?year=2022       -> same shape from the 2022 final feed (testing)
//   GET /sweden?raw=1           -> passthrough of the Valmyndigheten JSON
const BASE='https://resultat.val.se/data/resultat';
const VALKRETS=['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29'];

async function fetchJson(url){
  const resp=await fetch(url,{headers:{'User-Agent':'600-election-night/1.0','Accept':'application/json'}});
  if(!resp.ok) throw new Error('HTTP '+resp.status);
  return resp.json();
}

function pctNum(v){
  if(typeof v==='number') return v;
  const s=String(v||'').replace(/[%\s]/g,'').replace(',','.');
  const n=parseFloat(s);
  return isFinite(n)?n:null;
}

function num(v){
  const s=String(v||'').replace(/[^\d]/g,'');
  const n=parseInt(s,10);
  return isFinite(n)?n:0;
}

// Normalize one area's feed (national or valkrets) to our LIVE shape
function normalizeArea(feed){
  const parties=(feed.rosterPaverkaMandat&&feed.rosterPaverkaMandat.partiroster||[]).map(p=>({
    code:p.partiforkortning, votes:p.antalRoster, pct:pctNum(p.andelRoster),
  }));
  const seats=(feed.partiMandat||[]).map(p=>({code:p.partiforkortning, seats:p.antalMandat}));
  return {
    name:feed.namn,
    counted:feed.antalValdistriktRaknade,
    totalDistricts:feed.antalValdistriktSomSkaRaknas,
    turnout:pctNum(feed.valdeltagande),
    votes:num(feed.totaltAntalRoster),
    eligible:num(feed.antalRostberattigade),
    updatedAt:feed.senasteRapporteringstid||feed.senasteUppdateringstid||null,
    parties, seats,
  };
}

async function buildSweden(year){
  const suffix=year==='2022'?'S':'P';   // 2022 final for testing; 2026 preliminary live
  const elec=year==='2022'?'val2022':'val2026';
  const nat=await fetchJson(`${BASE}/${elec}/RD_${suffix}.json`);
  const out={
    source:'valmyndigheten',
    election:elec,
    updated:Date.now(),
    national:normalizeArea(nat),
  };
  // per-valkrets (fetch in parallel, tolerate missing)
  out.valkretsar=await Promise.all(VALKRETS.map(async k=>{
    try{
      const f=await fetchJson(`${BASE}/${elec}/RD_${k}_${suffix}.json`);
      return normalizeArea(f);
    }catch(e){
      return null;
    }
  }));
  return out;
}

export default {
  async fetch(request){
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'');
    if(path!=='/sweden') return new Response('not found',{status:404});

    const year=url.searchParams.get('year')||'2026';
    const raw=url.searchParams.get('raw');

    const cacheKey=new Request(url.toString(),request);
    const cache=caches.default;
    let cached=await cache.match(cacheKey);
    if(cached) return cached;

    try{
      let data;
      if(raw==='1'){
        const elec=year==='2022'?'val2022':'val2026';
        data=await fetchJson(`${BASE}/${elec}/RD_P.json`);
      }else{
        data=await buildSweden(year);
      }
      const resp=new Response(JSON.stringify(data),{
        headers:{
          'Content-Type':'application/json',
          'Access-Control-Allow-Origin':'*',
          'Cache-Control':'public, max-age=15',
          'Access-Control-Max-Age':'86400',
        },
      });
      await cache.put(cacheKey,resp.clone());
      return resp;
    }catch(e){
      return new Response(JSON.stringify({error:String(e.message||e)}),{
        status:502,
        headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
      });
    }
  },
};