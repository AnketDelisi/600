(function(){
'use strict';
const t=window.__600T||((en,tr)=>en);
// ---------- poster: light landscape shareable projection ----------
// 1600x900 white card: party rows with direct colour-masked logos + shares +
// seats, first-place / coalition / runoff probability tiles, the parliament
// arc and the coloured district map - both rasterized from the SVGs already
// on screen, so the poster matches the page.
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
// Recolour a logo's opaque pixels with the party colour, keeping its
// transparent background and its square footprint (no coloured tile behind it).
function logoMask(lg,color,size){
  if(!lg) return null;
  const out=document.createElement('canvas');
  out.width=Math.round(size*2); out.height=Math.round(size*2);
  const g=out.getContext('2d');
  g.scale(2,2);
  g.beginPath();
  g.rect(0,0,size,size);
  g.clip();
  const sc=Math.max(size/lg.width,size/lg.height);
  const w=lg.width*sc, h=lg.height*sc;
  g.drawImage(lg,(size-w)/2,(size-h)/2,w,h);
  g.globalCompositeOperation='source-in';
  g.fillStyle=color;
  g.fillRect(0,0,size,size);
  return out;
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
  const DISPLAY='"Advent Pro","Public Sans",system-ui,sans-serif';
  const FONT='"Public Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const MONO='"Source Code Pro",monospace';
  // make sure every poster weight is actually loaded before drawing text
  if(document.fonts&&document.fonts.load){
    const loads=[];
    ['600','700'].forEach(w=>loads.push(document.fonts.load(w+' 16px "Advent Pro"')));
    ['600','700','800'].forEach(w=>loads.push(document.fonts.load(w+' 16px "Public Sans"')));
    ['700','800'].forEach(w=>loads.push(document.fonts.load(w+' 16px "Source Code Pro"')));
    await Promise.all(loads.map(p=>p.catch(()=>{})));
  }
  ctx.fillStyle='#FFFFFF';
  ctx.fillRect(0,0,W,H);

  // title (top right), shrunk to fit the right half
  ctx.fillStyle='#161616';
  ctx.textAlign='right';
  ctx.textBaseline='alphabetic';
  let titleSize=56;
  const titleTxt=String(opts.title||'');
  ctx.font='700 '+titleSize+'px '+DISPLAY;
  while(titleSize>28&&ctx.measureText(titleTxt).width>W-40-700){
    titleSize-=2;
    ctx.font='700 '+titleSize+'px '+DISPLAY;
  }
  ctx.fillText(titleTxt,W-40,84);
  ctx.font='600 24px '+FONT;
  ctx.fillStyle='#5A5A5A';
  ctx.fillText(opts.subtitle||'',W-40,124);

  const rows=opts.rows||[];
  const grid=opts.grid||[];
  const logos=await Promise.all(rows.map(r=>loadImg(r.logo)));
  const arcImg=await svgElementToImg(opts.arcSvg,false);
  const mapImg=await svgElementToImg(opts.mapSvg,false);

  const X=40, barW=420;
  // consistent spacing across every country: the box always leaves a 10px
  // gap inside its row slot; rows give height back when the stacked minor
  // parties must also fit
  const tilesH=(opts.tiles&&opts.tiles.length)?72:0;
  const RH=grid.length?(rows.length>=6?80:90):96;
  const TH=RH-10;
  const totalW=TH+6+barW+8+92;
  const drawTile=(r,lg,yy,th)=>{
    if(lg){
      const mask=logoMask(lg,r.color,th);
      if(mask) ctx.drawImage(mask,X,yy,th,th);
    }else{
      ctx.fillStyle=r.color;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='800 '+Math.round(th*0.32)+'px '+FONT;
      ctx.fillText(r.code||'',X+th/2,yy+th/2);
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    }
  };
  // one delta column for every row: measure the widest vote/seat delta so
  // the shares and seats right-align in a single column and the deltas
  // left-align in their own
  ctx.font='600 13px '+MONO;
  let colW=0;
  rows.forEach(r=>{
    if(r.dvText) colW=Math.max(colW,ctx.measureText(r.dvText).width);
  });
  ctx.font='600 11px '+MONO;
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
    const deltaInk=tc==='#FFFFFF'?'rgba(255,255,255,0.62)':'rgba(22,22,22,0.55)';
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
      ctx.fillStyle=deltaInk;
      if(r.dvText){
        ctx.font='600 13px '+MONO;
        ctx.fillText(r.dvText,bx+barW-14-colW,b1);
      }
      if(r.dsText){
        ctx.font='600 11px '+MONO;
        ctx.fillText(r.dsText,bx+barW-14-colW,b2);
      }
      ctx.fillStyle=tc;
    }
    ctx.textAlign='left';
    const nameTxt=String(r.name||'').toUpperCase();
    const nameAvail=numX-(bx+14)-14;
    let nsize=Math.min(40,Math.round(th*0.47));
    ctx.font='800 '+nsize+'px '+FONT;
    while(nsize>22&&ctx.measureText(nameTxt).width>nameAvail){
      nsize-=2;
      ctx.font='800 '+nsize+'px '+FONT;
    }
    ctx.fillText(nameTxt,bx+14,b1);
    // ideology: the best-fitting item at a fixed size, word-boundary
    // ellipsised when long; baseline shared with the seats
    if(r.ideology){
      ctx.font='600 13px '+FONT;
      ctx.fillText(ellipsizeText(pickIdeology(r.ideology),nameAvail,ctx),
        bx+14,b2);
    }
    if(r.firstText){
      const fx=bx+barW+8, fw=92;
      ctx.fillStyle=r.color;
      ctx.fillRect(fx,y,fw,th);
      ctx.fillStyle=tc;
      ctx.textAlign='center';
      ctx.font='700 10px '+FONT;
      ctx.fillText(t('Chance of first','Birincilik şansı'),fx+fw/2,
        y+Math.round(th*0.33));
      ctx.font='800 26px '+MONO;
      ctx.fillText(r.firstText,fx+fw/2,y+Math.round(th*0.74));
      ctx.textAlign='left';
    }
    y+=RH;
  });
  // minor parties: the old two-column stack, but text-only (no logo column)
  if(grid.length){
    y+=6;
    const boxW=TH+6+barW+(rows.some(r=>r.firstText)?100:0);
    const rowsN=Math.ceil(grid.length/2);
    const avail=H-30-y-tilesH-10;
    const gh=Math.max(18,Math.min(52,Math.floor(avail/rowsN)-10));
    const gap=10;
    const gw=Math.floor((boxW-gap)/2);
    const nameS=Math.max(10,Math.round(gh*0.42));
    const shareS=Math.max(9,Math.round(gh*0.4));
    const seatS=Math.max(8,Math.round(gh*0.32));
    grid.forEach((r,i)=>{
      const gx=X+(i%2)*(gw+gap), gy=y+Math.floor(i/2)*(gh+gap);
      ctx.fillStyle=r.color;
      ctx.fillRect(gx,gy,gw,gh);
      const tc=posterTextColor(r.color);
      const deltaInk=tc==='#FFFFFF'?'rgba(255,255,255,0.62)':'rgba(22,22,22,0.55)';
      ctx.fillStyle=tc;
      const b1=gy+Math.round(gh*0.42);
      const b2=gy+Math.round(gh*0.8);
      const gR=gx+gw-8;
      let dvW=0, dsW=0;
      if(r.dvText){
        const dvS=Math.max(7,Math.round(shareS*0.40));
        ctx.font='600 '+dvS+'px '+MONO;
        dvW=ctx.measureText(r.dvText).width+5;
      }
      if(r.dsText){
        const dsS=Math.max(6,Math.round(seatS*0.58));
        ctx.font='600 '+dsS+'px '+MONO;
        dsW=ctx.measureText(r.dsText).width+5;
      }
      const nameAvail=gR-dvW-(gx+8)-6;
      ctx.font='800 '+nameS+'px '+FONT;
      ctx.fillText(ellipsizeText(String(r.name||'').toUpperCase(),nameAvail,ctx),
        gx+8,b1);
      if(r.ideology){
        ctx.font='600 '+Math.max(9,Math.round(gh*0.20))+'px '+FONT;
        ctx.fillText(ellipsizeText(pickIdeology(r.ideology),nameAvail,ctx),
          gx+8,b2);
      }
      ctx.textAlign='right';
      ctx.font='700 '+shareS+'px '+MONO;
      ctx.fillText(r.shareText||'',gR-dvW,b1);
      if(r.seatsText){
        ctx.font='700 '+seatS+'px '+MONO;
        ctx.fillText(r.seatsText,gR-dsW,b2);
      }
      if(r.dvText||r.dsText){
        ctx.textAlign='left';
        ctx.fillStyle=deltaInk;
        if(r.dvText){
          const dvS=Math.max(7,Math.round(shareS*0.40));
          ctx.font='600 '+dvS+'px '+MONO;
          ctx.fillText(r.dvText,gR-dvW+5,b1);
        }
        if(r.dsText){
          const dsS=Math.max(6,Math.round(seatS*0.58));
          ctx.font='600 '+dsS+'px '+MONO;
          ctx.fillText(r.dsText,gR-dsW+5,b2);
        }
        ctx.fillStyle=tc;
      }
      ctx.textAlign='left';
    });
    y+=rowsN*(gh+gap)+10;
  }
  // probability metrics: no frame, colour only in a rule under each number
  if(opts.tiles&&opts.tiles.length){
    const rowW=TH+6+barW+(rows.some(r=>r.firstText)?100:0);
    const cols=opts.tiles.length===1?1:2;
    const colW=rowW/cols;
    const py=y+10;
    opts.tiles.slice(0,2).forEach((tl,idx)=>{
      const tx=X+idx*colW+(idx?16:0);
      const availW=colW-(idx?16:0)-12;
      ctx.fillStyle='#5A5A5A';
      let lsize=11;
      const labelTxt=String(tl.label||'');
      ctx.font='700 '+lsize+'px '+FONT;
      while(lsize>9&&ctx.measureText(labelTxt).width>availW){
        lsize--;
        ctx.font='700 '+lsize+'px '+FONT;
      }
      ctx.fillText(labelTxt,tx,py+16);
      ctx.fillStyle='#161616';
      ctx.font='800 34px '+MONO;
      ctx.fillText(tl.value,tx,py+50);
      ctx.fillStyle=tl.color||'#9CA3AF';
      ctx.fillRect(tx,py+58,availW,2);
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

window.__600Poster={renderPoster};
})();
