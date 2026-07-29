/* v4.0 Map Explorer — true inline SVG interaction */
(()=>{
'use strict';
const ROOT=document.documentElement.dataset.root||'.';
const local=(p)=>ROOT.replace(/\/$/,'')+'/'+String(p||'').replace(/^\/+/, '');
const norm=(s)=>(s||'').replace(/&/g,'and').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
const C={
'hagia-floorplan.svg':{title:'Hagia Sophia visitor sequence',items:[
['1','Narthex','Arrival and transition space before entering the main nave.','/istanbul/sultanahmet/hagia-sophia.html'],['2','Nave','The immense central interior and principal viewing area.','/istanbul/sultanahmet/hagia-sophia.html'],['3','Dome','Stand back and look upward to understand the building’s scale.','/istanbul/sultanahmet/hagia-sophia.html'],['4','Apse','The eastern end, layered with Byzantine and Ottoman history.','/istanbul/sultanahmet/hagia-sophia.html'],['5','Gallery','Upper-level perspective when visitor access permits.','/istanbul/sultanahmet/hagia-sophia.html']]},
'blue-mosque-plan.svg':{title:'Blue Mosque visitor sequence',items:[
['1','Courtyard','Begin in the monumental courtyard and orient yourself before entry.','/istanbul/sultanahmet/blue-mosque.html'],['2','Prayer Hall','Main worship space; follow current visitor and prayer arrangements.','/istanbul/sultanahmet/blue-mosque.html'],['3','Dome','Best viewed from the center while allowing worshippers space.','/istanbul/sultanahmet/blue-mosque.html'],['4','Visitor Entry','Use the posted visitor entrance and dress-cover station.','/istanbul/sultanahmet/blue-mosque.html'],['5','Quiet Edge','A less congested side area for details and a calm overview.','/istanbul/sultanahmet/blue-mosque.html']]},
'cistern-plan.svg':{title:'Basilica Cistern visitor sequence',items:[
['1','Entry','Descend, pause and allow your eyes to adjust.','/istanbul/sultanahmet/basilica-cistern.html'],['2','Column Forest','The central atmospheric view through the repeating columns.','/istanbul/sultanahmet/basilica-cistern.html'],['3','Reflection View','A strong photography and orientation point.','/istanbul/sultanahmet/basilica-cistern.html'],['4','Medusa Bases','The famous reused stone heads near the far end.','/istanbul/sultanahmet/basilica-cistern.html'],['5','Exit','Follow the one-way visitor flow back to street level.','/istanbul/sultanahmet/basilica-cistern.html']]},
'topkapi-plan.svg':{title:'Topkapı Palace visitor sequence',items:[
['1','1st Court','Public outer court and approach to the ticketed palace.','/istanbul/sultanahmet/topkapi-palace.html'],['2','2nd Court','Imperial Council, kitchens and the entrance to the Harem.','/istanbul/sultanahmet/topkapi-palace.html'],['3','Harem','Separate ticketed complex; allow substantial extra time.','/istanbul/sultanahmet/topkapi-palace.html'],['4','3rd Court','Private imperial precinct and treasury collections.','/istanbul/sultanahmet/topkapi-palace.html'],['5','4th Court','Pavilions, terraces and gardens.','/istanbul/sultanahmet/topkapi-palace.html'],['6','View Terrace','Bosphorus and Golden Horn outlook.','/istanbul/sultanahmet/topkapi-palace.html']]},
'sultanahmet-route.svg':{title:'Sultanahmet walking route',items:[
['H','Dersaadet Hotel','Your starting point in the Old City.','/istanbul/index.html','https://www.google.com/maps/search/?api=1&query=Dersaadet+Hotel+Istanbul'],['1','Blue Mosque','Begin with the mosque and Hippodrome area.','/istanbul/sultanahmet/blue-mosque.html','https://www.google.com/maps/search/?api=1&query=Blue+Mosque+Istanbul'],['2','Hippodrome','Open historic square between the major monuments.','/istanbul/days/old-city.html','https://www.google.com/maps/search/?api=1&query=Hippodrome+of+Constantinople'],['3','Hagia Sophia','Major Byzantine and Ottoman landmark.','/istanbul/sultanahmet/hagia-sophia.html','https://www.google.com/maps/search/?api=1&query=Hagia+Sophia'],['4','Basilica Cistern','Underground reservoir close to Hagia Sophia.','/istanbul/sultanahmet/basilica-cistern.html','https://www.google.com/maps/search/?api=1&query=Basilica+Cistern'],['5','Topkapı Palace','Large palace complex; allow several hours.','/istanbul/sultanahmet/topkapi-palace.html','https://www.google.com/maps/search/?api=1&query=Topkapi+Palace'],['6','Gülhane Park','Green downhill finish near the palace walls.','/istanbul/days/old-city.html','https://www.google.com/maps/search/?api=1&query=Gulhane+Park']]},
'cruise-route.svg':{title:'Ancient Adriatic Treasures ports',items:[
['1','Istanbul','Embarkation city and pre-cruise stay.','/istanbul/index.html'],['2','Çanakkale','Gateway for Troy.','/ports/troy/index.html'],['3','Kuşadası','Port for Ephesus.','/ports/ephesus/index.html'],['4','Rhodes','Medieval Old Town and Lindos.','/ports/rhodes/index.html'],['5','Heraklion','Crete, museum and harbor.','/ports/heraklion/index.html'],['6','Athens','Acropolis, Plaka and museums.','/ports/athens/index.html'],['7','Katakolon','Gateway for Ancient Olympia.','/ports/olympia/index.html'],['8','Corfu','Old Town and island panorama.','/ports/corfu/index.html'],['9','Kotor','Bay scenery and walled Old Town.','/ports/kotor/index.html'],['10','Dubrovnik','Walls, Stradun and Old Port.','/ports/dubrovnik/index.html'],['11','Split','Diocletian’s Palace and Riviera.','/ports/split/index.html'],['12','Venice','Disembarkation and onward journey.','/ports/venice/index.html']]},
'master-trip.svg':{title:'Full journey',items:[
['1','California','Departure and flight to Istanbul.','/trip-at-a-glance.html'],['2','Istanbul','Pre-cruise destination guide.','/istanbul/index.html'],['3','Viking voyage','Cruise center and all port guides.','/cruise/index.html'],['4','Venice','Disembarkation and Venice stay.','/ports/venice/index.html'],['5','Northern Italy','Continue to the Northern Italy companion.','/ports/venice/handoff.html']]},
'markets-walk.svg':{title:'Markets walking route',items:[
['1','Eminönü / New Mosque','Waterfront starting area and tram/ferry interchange.','/istanbul/days/markets.html'],['2','Spice Bazaar','Food, spices, sweets and dense crowds.','/istanbul/days/markets.html'],['3','Rüstem Paşa Mosque','Small tiled mosque above the market streets.','/istanbul/days/markets.html'],['4','Mahmutpaşa slope','Uphill commercial lane toward the Grand Bazaar.','/istanbul/days/markets.html'],['5','Grand Bazaar','Large covered market; agree on a meeting point.','/istanbul/days/markets.html'],['T','Tea / rest option','Pause before continuing or returning by tram.','/istanbul/days/markets.html']]},
'acropolis-walk.svg':{title:'Acropolis walking sequence',items:[['1','Lower slopes','Begin below the summit.','/ports/athens/acropolis.html'],['2','Propylaea','Monumental entrance to the Acropolis.','/ports/athens/acropolis.html'],['3','Parthenon','Principal temple and central stop.','/ports/athens/acropolis.html'],['4','Erechtheion','Temple complex with the Caryatids.','/ports/athens/acropolis.html'],['5','Plaka','Descend into the historic neighborhood.','/ports/athens/plaka.html']]},
'athens-two-day.svg':{title:'Athens two-day plan',items:[['1','Piraeus','Cruise port and transfer starting point.','/ports/athens/index.html'],['2','Acropolis','Primary archaeological visit.','/ports/athens/acropolis.html'],['3','Plaka','Historic lanes and dining.','/ports/athens/plaka.html'],['4','City landmarks','Modern Athens orientation.','/ports/athens/day-two.html'],['5','Archaeological Museum','Major collection for the second day.','/ports/athens/museum.html']]},
'corfu-day-map.svg':{title:'Corfu panoramic day',items:[['1','Corfu Town','Port and Old Town base.','/ports/corfu/index.html'],['2','Paleokastritsa','Scenic west-coast excursion area.','/ports/corfu/panoramic.html'],['3','Liston','Arcaded promenade in the Old Town.','/ports/corfu/old-town.html'],['4','Old Fortress','Historic fortress and viewpoint.','/ports/corfu/fortress.html']]},
'heraklion-route.svg':{title:'Heraklion route',items:[['1','Port / coach','Confirm the Viking meeting point.','/ports/heraklion/index.html'],['2','Museum','Heraklion Archaeological Museum.','/ports/heraklion/museum.html'],['3','Lion Square','Central city landmark.','/ports/heraklion/minoan-highlights.html'],['4','25 August Street','Pedestrian route toward the harbor.','/ports/heraklion/harbor.html'],['5','Koules fortress','Venetian harbor fortress.','/ports/heraklion/harbor.html']]},
'olympia-route.svg':{title:'Ancient Olympia route',items:[['1','Entrance','Start of the archaeological site.','/ports/olympia/before-you-go.html'],['2','Heraion','Temple of Hera and ancient sanctuary.','/ports/olympia/sanctuary.html'],['3','Temple of Zeus','Centerpiece of the sanctuary.','/ports/olympia/sanctuary.html'],['4','Stadium','Enter through the stone arch.','/ports/olympia/stadium.html'],['5','Museum','Finish with the major sculptures.','/ports/olympia/museum.html']]},
'kotor-day-map.svg':{title:'Kotor excursion sequence',items:[['1','Kotor pier','Ship arrival point.','/ports/kotor/index.html'],['2','Scenic bay drive','Mountain and water viewpoints.','/ports/kotor/highlights.html'],['3','Perast','Baroque waterfront stop.','/ports/kotor/highlights.html'],['4','Kotor Old Town','Gates, squares and lanes.','/ports/kotor/old-town.html'],['5','Return to ship','Leave a safe margin for port procedures.','/ports/kotor/index.html']]},
'dubrovnik-walk-map.svg':{title:'Dubrovnik walking sequence',items:[['1','Pile Gate','Main western entrance.','/ports/dubrovnik/walk.html'],['2','Stradun','Level central promenade.','/ports/dubrovnik/walk.html'],['3','Rector’s Palace','Civic heart of the old republic.','/ports/dubrovnik/walk.html'],['4','Cathedral','Baroque landmark.','/ports/dubrovnik/walk.html'],['5','Old Port','Harbor pause.','/ports/dubrovnik/walk.html'],['6','Return route','Back through the lanes.','/ports/dubrovnik/walk.html']]},
'split-day-map.svg':{title:'Split excursion sequence',items:[['1','Coach departure','Begin the Riviera portion.','/ports/split/riviera.html'],['2','Scenic stop','Coast or historic town stop.','/ports/split/riviera.html'],['3','Split arrival','Riva waterfront.','/ports/split/index.html'],['4','Peristyle','Palace ceremonial center.','/ports/split/palace.html'],['5','Substructures','Cool stone passages beneath the palace.','/ports/split/palace.html'],['6','Return point','Meet coach or walk to port.','/ports/split/index.html']]}
};
let modal, active={zoom:1};
function itemObj(a){return {marker:a[0],label:a[1],description:a[2],guide:a[3],maps:a[4]};}
function createModal(){if(modal)return modal;modal=document.createElement('div');modal.className='map-explorer';modal.setAttribute('aria-hidden','true');modal.innerHTML=`<div class="map-explorer-bar"><strong data-map-title>Map Explorer</strong><div class="map-zoom"><button type="button" data-zoom-out aria-label="Zoom out">−</button><button type="button" data-zoom-reset>100%</button><button type="button" data-zoom-in aria-label="Zoom in">+</button></div><button type="button" class="map-explorer-close" aria-label="Close map">×</button></div><div class="map-explorer-body"><div class="map-explorer-canvas"><div class="map-explorer-svg"></div></div><aside class="map-explorer-panel"><div class="map-point-detail" aria-live="polite"><span class="map-point-number">Tap a number or name</span><h2>Choose a map point</h2><p>The selected location’s information and guide link will appear here.</p></div><div class="map-point-list"></div></aside></div>`;document.body.appendChild(modal);
modal.querySelector('.map-explorer-close').onclick=closeModal;modal.querySelector('[data-zoom-in]').onclick=()=>setZoom(active.zoom+.25);modal.querySelector('[data-zoom-out]').onclick=()=>setZoom(active.zoom-.25);modal.querySelector('[data-zoom-reset]').onclick=()=>setZoom(1);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal()});return modal;}
function setZoom(z){active.zoom=Math.max(.75,Math.min(3,z));const svg=modal.querySelector('.map-explorer-svg svg');if(svg)svg.style.width=(active.zoom*100)+'%';modal.querySelector('[data-zoom-reset]').textContent=Math.round(active.zoom*100)+'%';}
function closeModal(){modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
function popupMarkup(item){return `<button type="button" class="map-info-popup-close" aria-label="Close location information">×</button><span class="map-point-number">${item.marker}</span><h2>${item.label}</h2><p>${item.description}</p><div class="map-detail-actions">${item.guide?`<a class="btn" href="${local(item.guide)}">More location information</a>`:''}${item.maps?`<a class="btn secondary" target="_blank" rel="noopener" href="${item.maps}">Open live map</a>`:''}</div>`;}
function ensureInlinePopup(ctx){
  const map=ctx.querySelector('.inline-interactive-map');
  if(!map)return null;
  let popup=map.querySelector('.map-info-popup');
  if(!popup){
    popup=document.createElement('div');
    popup.className='map-info-popup';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-live','polite');
    popup.setAttribute('aria-label','Map location information');
    map.appendChild(popup);
    popup.addEventListener('click',e=>e.stopPropagation());
  }
  return popup;
}
function selectItem(item,ctx){
  ctx.querySelectorAll('.map-hotspot,.map-hitbox,.map-point-button').forEach(x=>x.classList.remove('selected'));
  ctx.querySelectorAll(`[data-map-key="${CSS.escape(item.marker)}"]`).forEach(x=>x.classList.add('selected'));
  const d=ctx.querySelector('.map-point-detail');
  if(d)d.innerHTML=`<span class="map-point-number">${item.marker}</span><h2>${item.label}</h2><p>${item.description}</p><div class="map-detail-actions">${item.guide?`<a class="btn" href="${local(item.guide)}">More location information</a>`:''}${item.maps?`<a class="btn secondary" target="_blank" rel="noopener" href="${item.maps}">Open live map</a>`:''}</div>`;
  if(ctx!==modal){
    const popup=ensureInlinePopup(ctx);
    if(popup){
      popup.innerHTML=popupMarkup(item);
      popup.classList.add('open');
      popup.querySelector('.map-info-popup-close').onclick=e=>{e.preventDefault();e.stopPropagation();popup.classList.remove('open')};
    }
  }
  const r=document.querySelector('.hotspot-readout');
  if(r&&ctx!==modal)r.innerHTML=`<strong>${item.marker} · ${item.label}</strong> — ${item.description}`;
}
function wireSVG(svg,config,ctx){
  const texts=[...svg.querySelectorAll('text')];
  const items=config.items.map(itemObj);

  // Each marker receives its own top-level hit target. Do not use closest('g'):
  // many of these SVGs place several ports inside one shared group, causing a
  // click to be treated as dragging the whole map instead of activating a port.
  items.forEach(item=>{
    const marker=texts.find(t=>norm(t.textContent)===norm(item.marker));
    let label=texts.find(t=>norm(t.textContent)===norm(item.label));
    if(!label&&item.label.includes('/')) label=texts.find(t=>norm(t.textContent).includes(norm(item.label.split('/')[0])));
    if(!marker&&!label)return;

    [marker,label].filter(Boolean).forEach(node=>{
      node.classList.add('map-hotspot');
      node.dataset.mapKey=item.marker;
      node.style.pointerEvents='none';
    });

    try{
      const boxes=[marker,label].filter(Boolean).map(n=>n.getBBox());
      const x=Math.min(...boxes.map(b=>b.x));
      const y=Math.min(...boxes.map(b=>b.y));
      const right=Math.max(...boxes.map(b=>b.x+b.width));
      const bottom=Math.max(...boxes.map(b=>b.y+b.height));
      const pad=14;
      const hit=document.createElementNS('http://www.w3.org/2000/svg','rect');
      hit.setAttribute('x',x-pad);
      hit.setAttribute('y',y-pad);
      hit.setAttribute('width',Math.max(46,right-x+pad*2));
      hit.setAttribute('height',Math.max(46,bottom-y+pad*2));
      hit.setAttribute('rx','10');
      hit.setAttribute('fill','#ffffff');
      hit.setAttribute('fill-opacity','0.001');
      hit.setAttribute('pointer-events','all');
      hit.setAttribute('role','button');
      hit.setAttribute('tabindex','0');
      hit.setAttribute('aria-label',`${item.marker}. ${item.label}`);
      hit.dataset.mapKey=item.marker;
      hit.classList.add('map-hitbox');
      hit.style.cursor='pointer';
      hit.style.touchAction='manipulation';

      const openInfo=()=>selectItem(item,ctx);
      hit.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openInfo();});
      hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openInfo();}});
      svg.appendChild(hit); // topmost and independent from the artwork groups
    }catch(e){
      console.warn('Unable to create map link target',item.marker,e);
    }
  });
}
function pointList(config,ctx){const list=ctx.querySelector('.map-point-list');if(!list)return;list.innerHTML='';config.items.map(itemObj).forEach(item=>{const b=document.createElement('button');b.type='button';b.className='map-point-button';b.dataset.mapKey=item.marker;b.innerHTML=`<strong>${item.marker}</strong><span>${item.label}</span>`;b.onclick=()=>selectItem(item,ctx);list.appendChild(b)});}
async function fetchSVG(src){const r=await fetch(src,{cache:'no-store'});if(!r.ok)throw new Error('Unable to load map');const text=await r.text();return new DOMParser().parseFromString(text,'image/svg+xml').documentElement;}
async function openExplorer(src,config){createModal();modal.querySelector('[data-map-title]').textContent=config.title;const holder=modal.querySelector('.map-explorer-svg');holder.innerHTML='<div class="map-loading">Loading interactive map…</div>';pointList(config,modal);modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');try{const svg=await fetchSVG(src);svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','xMidYMid meet');holder.replaceChildren(svg);wireSVG(svg,config,modal);setZoom(1);}catch(e){holder.innerHTML='<div class="map-loading">This map could not be loaded. Reload the page and try again.</div>';}}
async function enhance(img){
  const file=decodeURIComponent(img.src.split('/').pop().split('?')[0]);
  const config=C[file];
  if(!config||img.dataset.mapEnhanced)return;
  img.dataset.mapEnhanced='true';
  const src=img.src;
  img.style.cursor='pointer';
  img.tabIndex=0;
  img.setAttribute('role','button');
  img.setAttribute('aria-label',`${config.title}. Open destination menu.`);
  const open=()=>openExplorer(src,config);
  // The map itself and its Expand control always open the destination menu.
  img.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open();},true);
  img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  const parent=img.parentElement;
  const expand=parent?.querySelector('.map-expand,.route-expand');
  if(expand)expand.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open();},true);
}
function setup(){
  // Support every map markup pattern used across the companion. Earlier builds
  // only enhanced .zoomable-map/.hotspot-map images, while many destination
  // pages use data-map-zoom or a plain SVG inside .map-panel/.plan-wrap.
  const selector=[
    'img.zoomable-map[src*=".svg"]',
    'img.hotspot-map[src*=".svg"]',
    'img[data-map-zoom][src*=".svg"]',
    '.map-panel img[src*=".svg"]',
    '.plan-wrap img[src*=".svg"]',
    '.route-map-panel img[src*=".svg"]'
  ].join(',');
  document.querySelectorAll(selector).forEach(enhance);
  document.querySelectorAll('.map-expand,.route-expand').forEach(btn=>{
    const host=btn.closest('.map-panel,.plan-wrap,.route-map-panel,figure,section,article')||btn.parentElement;
    const img=host?.querySelector('img[src*=".svg"]');
    if(!img)return;
    const file=decodeURIComponent(img.src.split('/').pop().split('?')[0]);
    if(C[file])btn.onclick=e=>{e.preventDefault();e.stopPropagation();openExplorer(img.src,C[file])};
  });
}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>setTimeout(setup,0));
else setTimeout(setup,0);
})();
