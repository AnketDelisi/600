// ===== AltıCiftSıfır — Globe country navigation =====
// Injects a globe dropdown into the segmented nav on every page (root,
// country sub-pages, tools). Lists all countries from the shared COUNTRIES
// config with a small flag + next-election date, plus tool links.
(function(){
'use strict';
if(typeof window==='undefined'||typeof COUNTRIES==='undefined') return;

// Base path relative to this page (same derivation as app.js)
const dataBase=()=>{
  if(window.__600_LOCAL_ASSETS__) return '';
  const s=document.querySelector('script[src*="nav.js"]');
  if(s){
    let src=s.getAttribute('src')||'';
    if(src.startsWith('./')) src=src.slice(2);
    const i=src.lastIndexOf('js/nav.js');
    if(i>0) return src.slice(0,i);
  }
  const p=window.location.pathname;
  if(p.includes('/site/')) return '../';
  const segs=p.split('/').filter(s=>s);
  const last=segs[segs.length-1]||'';
  if(last==='index.html') segs.pop();
  const depth=segs.length;
  if(depth<=1) return '';
  return '../'.repeat(depth-1);
};

const BASE=dataBase();
const isPinned=!!window.__600_COUNTRY__;

const GLOBE_ICON=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>`;

// Tiny 3:2 flag SVGs (rendered as 22x15 in the menu)
const FLAGS={
  sweden:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="14" fill="#006AA7"/><rect x="6" width="3" height="14" fill="#FECC00"/><rect y="5.5" width="21" height="3" fill="#FECC00"/></svg>`,
  israel:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="14" fill="#fff"/><rect width="21" height="2.5" fill="#0038B8"/><rect y="11.5" width="21" height="2.5" fill="#0038B8"/><polygon points="10.5,3.5 13.7,9 7.3,9" fill="none" stroke="#0038B8" stroke-width="1"/><polygon points="10.5,10.5 13.7,5 7.3,5" fill="none" stroke="#0038B8" stroke-width="1"/></svg>`,
  mecklenburg_vorpommern:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="4.7" fill="#2B58A3"/><rect y="4.7" width="21" height="3.5" fill="#fff"/><rect y="8.2" width="21" height="1.4" fill="#F9F400"/><rect y="9.6" width="21" height="3.5" fill="#fff"/><rect y="13.1" width="21" height="0.9" fill="#DE0029"/></svg>`,
  berlin:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="2.8" fill="#E2382A"/><rect y="2.8" width="21" height="8.4" fill="#fff"/><rect y="11.2" width="21" height="2.8" fill="#E2382A"/></svg>`,
  serbia:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="4.7" fill="#C6363C"/><rect y="4.7" width="21" height="4.7" fill="#0C4076"/><rect y="9.4" width="21" height="4.6" fill="#fff"/></svg>`,
  latvia:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="5.6" fill="#9E3039"/><rect y="5.6" width="21" height="2.8" fill="#fff"/><rect y="8.4" width="21" height="5.6" fill="#9E3039"/></svg>`,
  brazil:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="21" height="14" fill="#009739"/><polygon points="10.5,2 18.5,7 10.5,12 2.5,7" fill="#FEDD00"/><circle cx="10.5" cy="7" r="3.2" fill="#002776"/></svg>`,
  france:`<svg viewBox="0 0 21 14" xmlns="http://www.w3.org/2000/svg"><rect width="7" height="14" fill="#0055A4"/><rect x="7" width="7" height="14" fill="#fff"/><rect x="14" width="7" height="14" fill="#EF4135"/></svg>`,
};

const currentCountry=()=>{
  if(isPinned&&COUNTRIES[window.__600_COUNTRY__]) return window.__600_COUNTRY__;
  if(typeof COUNTRY!=='undefined'&&COUNTRIES[COUNTRY]) return COUNTRY;
  return null;
};

const fmtDate=s=>{
  if(!s) return '';
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m?m[3]+'.'+m[2]+'.'+m[1]:s.slice(0,10);
};

let metaCache={};

function buildMenu(){
  const wrap=document.createElement('div');
  wrap.className='globe-wrap';
  wrap.id='globe-nav';

  const btn=document.createElement('button');
  btn.type='button';
  btn.className='globe-btn';
  btn.setAttribute('aria-haspopup','true');
  btn.setAttribute('aria-expanded','false');
  btn.title=(typeof T!=='undefined'&&T.country)?T.country:'Countries';
  btn.innerHTML=GLOBE_ICON+'<span class="globe-btn-label"></span>';
  wrap.appendChild(btn);

  const menu=document.createElement('div');
  menu.className='globe-menu';
  menu.setAttribute('role','menu');

  Object.keys(COUNTRIES).forEach(id=>{
    const c=COUNTRIES[id];
    const a=document.createElement('a');
    a.className='globe-item';
    a.href=BASE+'index.html?c='+id;
    a.dataset.c=id;
    a.setAttribute('role','menuitem');
    a.innerHTML=`<span class="globe-flag">${FLAGS[id]||''}</span><span class="globe-name">${c.name||id}</span><span class="globe-date"></span>`;
    menu.appendChild(a);
  });

  const sep=document.createElement('div');
  sep.className='globe-sep';
  menu.appendChild(sep);

  const tools=[];
  if(isPinned) tools.push({href:BASE+'index.html',label:(typeof T!=='undefined'&&T.main)?T.main:'MAIN'});
  tools.push({href:BASE+'us/index.html',label:(typeof T!=='undefined'&&T.tabs&&T.tabs.us)?T.tabs.us:'US MIDTERMS'});
  tools.push({href:BASE+'poll/index.html',label:'POLL IMAGE'});
  tools.forEach(t=>{
    const a=document.createElement('a');
    a.className='globe-foot';
    a.href=t.href;
    a.setAttribute('role','menuitem');
    a.textContent=t.label;
    menu.appendChild(a);
  });

  wrap.appendChild(menu);

  // place into the nav (prepend to segnav-right so it sits before social links)
  const nav=document.getElementById('segnav');
  const right=nav?nav.querySelector('.segnav-right'):null;
  if(right) right.insertBefore(wrap,right.firstChild);
  else if(nav) nav.appendChild(wrap);
  else return;

  const label=btn.querySelector('.globe-btn-label');
  const updateLabel=()=>{
    const cur=currentCountry();
    if(cur&&COUNTRIES[cur]){
      label.innerHTML=`${FLAGS[cur]||''}<span>${COUNTRIES[cur].name}</span>`;
    }else{
      label.innerHTML=`<span>${(typeof T!=='undefined'&&T.country)?T.country:'WORLD'}</span>`;
    }
  };
  updateLabel();

  const markActive=()=>{
    const cur=currentCountry();
    menu.querySelectorAll('.globe-item').forEach(it=>{
      it.classList.toggle('active',!!cur&&it.dataset.c===cur);
    });
  };
  markActive();

  const loadDates=()=>{
    Object.keys(COUNTRIES).forEach(id=>{
      if(metaCache[id]) return;
      fetch(BASE+'data/'+id+'/meta.json')
        .then(r=>r.ok?r.json():null)
        .then(j=>{
          metaCache[id]=j?j.election_date:null;
          const item=menu.querySelector('.globe-item[data-c="'+id+'"] .globe-date');
          if(item&&metaCache[id]) item.textContent=fmtDate(metaCache[id]);
        })
        .catch(()=>{metaCache[id]=null;});
    });
  };

  const open=()=>{
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    updateLabel();
    markActive();
    loadDates();
  };
  const close=()=>{
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  };

  btn.addEventListener('click',e=>{
    e.stopPropagation();
    wrap.classList.contains('open')?close():open();
  });
  document.addEventListener('click',e=>{
    if(!wrap.contains(e.target)) close();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') close();
  });

  menu.querySelectorAll('.globe-item').forEach(a=>{
    a.addEventListener('click',e=>{
      const id=a.dataset.c;
      // Root page: switch in place without navigation
      if(!isPinned&&id&&window._600&&typeof window._600.setCountry==='function'){
        e.preventDefault();
        window._600.setCountry(id);
        close();
        updateLabel();
        markActive();
      }else{
        close();
      }
    });
  });
}

// Run after DOM is ready (config.js loads before this script at end of body)
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',buildMenu);
}else{
  buildMenu();
}
})();