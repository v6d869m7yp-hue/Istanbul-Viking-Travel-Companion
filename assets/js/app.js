const ROOT=document.documentElement.dataset.root||'.';const path=(p)=>ROOT+p;async function getJSON(name){const r=await fetch(path('/data/'+name));if(!r.ok)throw new Error(name);return r.json()}function abs(h){return path(h)}async function shell(){const [trip,nav]=await Promise.all([getJSON('trip.json'),getJSON('navigation.json')]);const page=document.body.dataset.page||'';const currentTitle=document.querySelector('h1')?.textContent.trim()||document.title;document.querySelector('#app-header').innerHTML=`<header class="app-header"><div class="header-inner"><a class="brand" href="${abs('/index.html')}">${trip.title}<small>Traveler application · 2026</small></a><button class="menu-btn" aria-label="Open menu">☰</button><nav class="primary-nav">${nav.primary.map(x=>`<a class="${x.key===page?'active':''}" href="${abs(x.href)}">${x.label}</a>`).join('')}</nav><div class="header-tools"><a class="account-indicator" href="${abs('/my-trips.html')}" data-account-indicator aria-label="Firebase account"><span class="account-dot"></span><span data-account-label>Account</span></a><a class="icon-link" href="${abs('/search.html')}" aria-label="Search">⌕</a><button class="save-page" type="button" aria-label="Save this page" data-save-page>☆</button></div></div></header>`;document.querySelector('.menu-btn').onclick=()=>document.querySelector('.primary-nav').classList.toggle('open');document.querySelector('#app-footer').innerHTML=`<footer class="footer"><div class="footer-inner"><div><strong>${trip.title}</strong><div class="version">v${APP_RELEASE.version} · Premium Port Editions</div></div><div><a href="${abs('/trip-at-a-glance.html')}" style="text-decoration:underline">Trip at a Glance</a> · <a href="${abs('/favorites.html')}" style="text-decoration:underline">Favorites</a> · <a href="${abs('/reservations.html')}" style="text-decoration:underline">Reservations</a> · <a href="${abs('/vault.html')}" style="text-decoration:underline">Travel Vault</a> · <a href="${abs('/my-trips.html')}" style="text-decoration:underline">My Trips</a> · <a href="${abs('/cloud-vault.html')}" style="text-decoration:underline">Cloud Sign In</a> · <a href="${abs('/photo-credits.html')}" style="text-decoration:underline">Photo credits</a> · <a href="${abs('/diagnostics.html')}" style="text-decoration:underline">Diagnostics</a><br><small>Excursion times remain subject to Viking Daily updates.</small></div></div></footer>`;document.querySelectorAll('[data-version]').forEach(x=>x.textContent='v'+trip.version);if(document.querySelector('[data-chapter-nav]')){const section=document.body.dataset.section||'istanbul';const items=nav[section]||nav.istanbul||[];document.querySelector('[data-chapter-nav]').innerHTML=items.map(x=>`<a href="${abs(x.href)}">${x.label}</a>`).join('');}setupSavePage(currentTitle);setupAccountIndicator();return trip}function loadLocalScript(src){return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(x=>x.src&&x.src.includes(src.split('?')[0]));if(existing){if(window.IVTC?.firebase||src.includes('firebase-config'))resolve();else existing.addEventListener('load',resolve,{once:true});return;}const el=document.createElement('script');el.src=abs(src);el.onload=resolve;el.onerror=reject;document.head.appendChild(el);});}
async function setupAccountIndicator(){
 const indicator=document.querySelector('[data-account-indicator]');
 if(!indicator)return;
 const label=indicator.querySelector('[data-account-label]');
 const render=s=>{const on=!!s?.user;indicator.classList.toggle('signed-in',on);label.textContent=on?(s.user.displayName||s.user.email?.split('@')[0]||'Signed in'):'Sign in';indicator.title=on?`Signed in as ${s.user.email||'Firebase user'}`:'Sign in to Firebase';};
 window.addEventListener('ivtc:backend-state',e=>render(e.detail));
 try{
  if(!window.IVTC_FIREBASE_CONFIG)await loadLocalScript('/assets/js/backend/firebase-config.js?v='+APP_RELEASE.version);
  if(!window.IVTC?.firebase)await loadLocalScript('/assets/js/backend/firebase-client.js?v='+APP_RELEASE.version);
  render(await window.IVTC.firebase.initialize());
 }catch(e){render({user:null});}
}
function dateOnly(s){return new Date(s+'T12:00:00')}async function dashboard(trip){const now=new Date();const start=dateOnly(trip.start);const days=Math.ceil((start-now)/86400000);const stage=trip.stages.find(s=>s.date===now.toISOString().slice(0,10))|| (now<start?trip.stages[0]:trip.stages[trip.stages.length-1]);document.querySelector('[data-count]').textContent=days>0?days:0;document.querySelector('[data-count-label]').textContent=days>0?'days to departure':'trip underway';document.querySelector('[data-stage-title]').textContent=stage.title;document.querySelector('[data-stage-location]').textContent=stage.location;document.querySelector('[data-stage-summary]').textContent=stage.summary;document.querySelector('[data-stage-time]').textContent=stage.time;document.querySelector('[data-upcoming]').innerHTML=trip.stages.slice(0,4).map(s=>`<div class="timeline-item"><div class="date">${new Date(s.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div><div><strong>${s.title}</strong><div class="notice">${s.location} · ${s.summary}</div></div><span class="tag">${s.time}</span></div>`).join('')}async function timeline(trip){document.querySelector('[data-timeline]').innerHTML=trip.stages.map(s=>`<div class="timeline-item"><div class="date">${new Date(s.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div><div><strong>${s.title}</strong><div class="notice">${s.location} · ${s.summary}</div></div><span class="tag">${s.time}</span></div>`).join('')}async function istanbulCards(){const d=await getJSON('istanbul.json');document.querySelector('[data-istanbul-days]').innerHTML=d.days.map(x=>`<a class="card image-card" href="${x.href}"><img src="${x.image}" alt=""><div class="card-body"><div class="meta">${x.number} · ${x.date}</div><h3>${x.title}</h3><p>${x.summary}</p></div></a>`).join('')}async function excursionTable(){const d=await getJSON('excursions.json');document.querySelector('[data-excursions]').innerHTML=d.map(r=>`<tr>${r.map((x,i)=>`<td>${i===5?`<span class="tag">${x}</span>`:x}</td>`).join('')}</tr>`).join('')}async function intelligence(){const key=document.body.dataset.intel;if(!key)return;const d=await getJSON('attractions.json');const target=document.querySelector('[data-intelligence]');if(!target||!d[key])return;target.innerHTML=d[key].map(x=>`<section class="intel-card"><div class="meta">Travel intelligence</div><h3>${x.name}</h3><div class="intel-stats"><div><strong>Allow</strong>${x.time}</div><div><strong>Best time</strong>${x.best}</div><div><strong>Effort</strong>${x.effort}</div><div><strong>Dress</strong>${x.dress}</div></div><p>${x.note}</p></section>`).join('')}
function ensureLightbox(){let box=document.querySelector('#media-lightbox');if(box)return box;box=document.createElement('div');box.id='media-lightbox';box.className='media-lightbox';box.setAttribute('aria-hidden','true');box.innerHTML=`<button class="lightbox-close" aria-label="Close">×</button><div class="lightbox-stage"><img alt="Expanded view"></div><div class="lightbox-help">Drag to pan · wheel or pinch to zoom · double-click to reset</div>`;document.body.appendChild(box);const img=box.querySelector('img');let scale=1,x=0,y=0,drag=false,sx=0,sy=0;const draw=()=>img.style.transform=`translate(${x}px,${y}px) scale(${scale})`;const reset=()=>{scale=1;x=0;y=0;draw()};box.open=(src,alt='Expanded view')=>{img.src=src;img.alt=alt;reset();box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')};const close=()=>{box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')};box.querySelector('.lightbox-close').onclick=close;box.addEventListener('click',e=>{if(e.target===box)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});box.querySelector('.lightbox-stage').addEventListener('wheel',e=>{e.preventDefault();scale=Math.min(5,Math.max(.6,scale*(e.deltaY<0?1.12:.89)));draw()},{passive:false});img.addEventListener('pointerdown',e=>{drag=true;sx=e.clientX-x;sy=e.clientY-y;img.setPointerCapture(e.pointerId)});img.addEventListener('pointermove',e=>{if(!drag)return;x=e.clientX-sx;y=e.clientY-sy;draw()});img.addEventListener('pointerup',()=>drag=false);img.addEventListener('dblclick',reset);return box}
function interactiveMedia(){const box=ensureLightbox();document.querySelectorAll('.zoomable-map').forEach(el=>{if(/\.svg(?:$|\?)/i.test(el.getAttribute('src')||''))return;const card=el.closest('.map-card,.route-map-panel');const live=card?.querySelector('a[href*="google.com/maps"],a[href*="maps.apple.com"]');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',(el.alt||'Map')+(live?' — open live interactive map':' — open full screen'));const open=()=>box.open(el.currentSrc||el.src,el.alt);el.addEventListener('click',()=>{if(live){window.open(live.href,live.target||'_blank','noopener')}else open()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});const b=el.parentElement&&el.parentElement.querySelector('.map-expand');if(b)b.onclick=e=>{e.stopPropagation();open()}});document.querySelectorAll('[data-lightbox-src]').forEach(b=>b.onclick=()=>box.open(b.dataset.lightboxSrc,b.querySelector('img')?.alt||'Photograph'));document.querySelectorAll('.hotspot-map').forEach(el=>{const read=el.closest('.interactive-plan')?.querySelector('.hotspot-readout');if(!read)return;const names=(el.getAttribute('src').match(/hagia/) ? ['Narthex','Nave','Central dome','Apse','Gallery'] : el.getAttribute('src').match(/blue/) ? ['Courtyard','Prayer hall','Central dome','Visitor entry','Quiet side edge'] : el.getAttribute('src').match(/cistern/) ? ['Entry','Column forest','Reflection viewpoint','Medusa bases','Exit'] : ['First Court','Second Court','Harem','Third Court','Fourth Court','View terrace']);el.addEventListener('click',e=>{if(e.offsetX==null)return;const n=Math.max(0,Math.min(names.length-1,Math.floor((e.offsetX/el.clientWidth)*names.length)));read.innerHTML=`<strong>${n+1} · ${names[n]}</strong> — use this as the next orientation point in the visitor sequence.`})})}


function interactiveCruiseRoute(){const wrap=document.querySelector('[data-interactive-route]');if(!wrap)return;const button=wrap.querySelector('.route-expand');if(!button)return;let modal=document.querySelector('#interactive-route-modal');if(!modal){modal=document.createElement('div');modal.id='interactive-route-modal';modal.className='interactive-route-modal';modal.setAttribute('aria-hidden','true');modal.innerHTML='<button class="route-modal-close" aria-label="Close">×</button><div class="route-modal-stage"></div><div class="route-modal-help">Tap a numbered port to open its guide · swipe to pan</div>';document.body.appendChild(modal);const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')};modal.querySelector('.route-modal-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()})}button.onclick=e=>{e.stopPropagation();const clone=wrap.querySelector('svg').cloneNode(true);modal.querySelector('.route-modal-stage').replaceChildren(clone);modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}}

function favoriteStore(){try{return JSON.parse(localStorage.getItem('ivtc-favorites')||'[]')}catch(e){return[]}}
function setFavoriteStore(items){localStorage.setItem('ivtc-favorites',JSON.stringify(items))}
function canonicalPage(){return location.pathname.split('/').pop()===''?location.pathname+'index.html':location.pathname}
function setupSavePage(title){const button=document.querySelector('[data-save-page]');if(!button)return;const url=canonicalPage();const update=()=>{const saved=favoriteStore().some(x=>x.url===url);button.textContent=saved?'★':'☆';button.classList.toggle('saved',saved);button.setAttribute('aria-label',saved?'Remove page from favorites':'Save page to favorites')};button.onclick=()=>{let items=favoriteStore();const found=items.findIndex(x=>x.url===url);if(found>=0)items.splice(found,1);else items.unshift({url,title,added:new Date().toISOString()});setFavoriteStore(items);update()};update()}
async function searchPage(){const input=document.querySelector('#global-search');if(!input)return;const index=await getJSON('search-index.json');const results=document.querySelector('[data-search-results]');const summary=document.querySelector('[data-search-summary]');const render=(q)=>{const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);if(!terms.length){summary.textContent=`${index.length} pages are indexed and available offline.`;results.innerHTML=index.slice(0,12).map(searchCard).join('');return}const ranked=index.map(x=>{let score=0;const title=x.title.toLowerCase();for(const t of terms){if(title.includes(t))score+=10;if(x.section.toLowerCase().includes(t))score+=5;score+=(x.searchText.split(t).length-1)}return{x,score}}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,40).map(r=>r.x);summary.textContent=ranked.length?`${ranked.length} result${ranked.length===1?'':'s'} for “${q}”`:`No results for “${q}”`;results.innerHTML=ranked.length?ranked.map(searchCard).join(''):`<div class="card"><h3>No match found</h3><p>Try a shorter term, destination name, attraction, “maps,” “photography,” or “museum.”</p></div>`};const searchCard=x=>`<a class="search-result-card" href="${abs(x.url)}"><span class="meta">${x.section}</span><h2>${x.title}</h2><p>${x.excerpt}</p><span class="text-link">Open page →</span></a>`;input.addEventListener('input',()=>render(input.value));document.querySelector('[data-search-clear]').onclick=()=>{input.value='';input.focus();render('')};document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{input.value=b.dataset.query;render(input.value)});const params=new URLSearchParams(location.search);if(params.get('q'))input.value=params.get('q');render(input.value)}
function favoritesPage(){const target=document.querySelector('[data-favorite-results]');if(!target)return;const render=()=>{const items=favoriteStore();target.innerHTML=items.length?`<div class="grid grid-2">${items.map(x=>`<article class="card favorite-card"><div class="meta">Saved page</div><h3>${x.title}</h3><div class="button-row"><a class="btn" href="${x.url}">Open</a><button class="btn outline" type="button" data-remove-favorite="${x.url}">Remove</button></div></article>`).join('')}</div>`:`<div class="card empty-state"><h2>No favorites yet</h2><p>Open any guide and tap the ☆ button in the header.</p><a class="btn" href="${abs('/ports/index.html')}">Browse Ports of Call</a></div>`;target.querySelectorAll('[data-remove-favorite]').forEach(b=>b.onclick=()=>{setFavoriteStore(favoriteStore().filter(x=>x.url!==b.dataset.removeFavorite));render()})};render()}
function guideLink(stage){const l=(stage.location||'').toLowerCase();const t=(stage.title||'').toLowerCase();if(t.includes('depart')||l.includes('travel'))return '/trip-at-a-glance.html';if(l.includes('istanbul')&&t.includes('embark'))return '/istanbul/to-viking.html';if(l.includes('istanbul'))return '/istanbul/index.html';if(l.includes('çanakkale'))return '/ports/troy/index.html';if(l.includes('kuşadası'))return '/ports/ephesus/index.html';if(l.includes('rhodes'))return '/ports/rhodes/index.html';if(l.includes('heraklion'))return '/ports/heraklion/index.html';if(l.includes('athens'))return '/ports/athens/index.html';if(l.includes('katakolon'))return '/ports/olympia/index.html';if(l.includes('corfu'))return '/ports/corfu/index.html';if(l.includes('kotor'))return '/ports/kotor/index.html';if(l.includes('dubrovnik'))return '/ports/dubrovnik/index.html';if(l.includes('split'))return '/ports/split/index.html';if(l.includes('venice'))return '/ports/venice/index.html';return '/index.html'}
function glanceStatus(trip){const wrap=document.querySelector('[data-glance-status]');if(!wrap)return;const today=new Date().toISOString().slice(0,10);let idx=trip.stages.findIndex(s=>s.date>=today);if(idx<0)idx=trip.stages.length-1;const cur=trip.stages[idx],next=trip.stages[Math.min(idx+1,trip.stages.length-1)];wrap.querySelector('[data-glance-title]').textContent=cur.title;wrap.querySelector('[data-glance-summary]').textContent=`${cur.location} · ${cur.summary}`;wrap.querySelector('[data-glance-link]').href=abs(guideLink(cur));wrap.querySelector('[data-next-title]').textContent=next.title;wrap.querySelector('[data-next-summary]').textContent=`${next.location} · ${next.summary}`;wrap.querySelector('[data-next-time]').textContent=next.time}


function unifiedJourneySwitcher(){
  if(document.querySelector('.journey-switcher')) return;
  const northernItalyVenice='https://v6d869m7yp-hue.github.io/NorthernItalyTravelerCompanion-v023/venice.html';
  const nav=document.createElement('nav');
  nav.className='journey-switcher';
  nav.setAttribute('aria-label','Switch journey companion');
  nav.setAttribute('data-draggable-navigation','');
  nav.innerHTML=`<span class="journey-drag-handle" aria-hidden="true">⋮⋮</span><a href="${abs('/istanbul/index.html')}">Istanbul</a><a href="${northernItalyVenice}" class="primary">Continue: Venice & Northern Italy →</a>`;
  document.body.appendChild(nav);

  const storageKey='ivtc-journey-switcher-position-v1';
  let dragging=false,moved=false,pointerId=null,startX=0,startY=0,startLeft=0,startTop=0,suppressClick=false;
  const safe=12;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const viewport=()=>({w:window.innerWidth,h:window.innerHeight});
  const place=(left,top,save=false)=>{
    const {w,h}=viewport(),r=nav.getBoundingClientRect();
    const maxLeft=Math.max(safe,w-r.width-safe),maxTop=Math.max(safe,h-r.height-safe);
    left=clamp(left,safe,maxLeft);top=clamp(top,safe,maxTop);
    nav.style.left=left+'px';nav.style.top=top+'px';nav.style.right='auto';nav.style.bottom='auto';
    if(save)localStorage.setItem(storageKey,JSON.stringify({side:left+r.width/2<w/2?'left':'right',topRatio:top/Math.max(1,h-r.height)}));
  };
  const restore=()=>{
    let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null')}catch(e){}
    const {w,h}=viewport(),r=nav.getBoundingClientRect();
    if(saved){
      const top=clamp((Number(saved.topRatio)||0)*(h-r.height),safe,Math.max(safe,h-r.height-safe));
      place(saved.side==='left'?safe:w-r.width-safe,top,false);
    }else place(w-r.width-safe,h-r.height-86,false);
  };
  requestAnimationFrame(restore);

  nav.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    dragging=true;moved=false;pointerId=e.pointerId;
    const r=nav.getBoundingClientRect();startX=e.clientX;startY=e.clientY;startLeft=r.left;startTop=r.top;
    nav.classList.add('dragging');nav.setPointerCapture?.(e.pointerId);
  });
  nav.addEventListener('pointermove',e=>{
    if(!dragging||e.pointerId!==pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(Math.hypot(dx,dy)>6)moved=true;
    if(moved){e.preventDefault();place(startLeft+dx,startTop+dy,false)}
  },{passive:false});
  const finish=e=>{
    if(!dragging||e.pointerId!==pointerId)return;
    dragging=false;nav.classList.remove('dragging');
    if(moved){
      const {w}=viewport(),r=nav.getBoundingClientRect();
      const left=r.left+r.width/2<w/2?safe:w-r.width-safe;
      place(left,r.top,true);suppressClick=true;setTimeout(()=>suppressClick=false,80);
    }
  };
  nav.addEventListener('pointerup',finish);nav.addEventListener('pointercancel',finish);
  nav.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation()}},true);
  window.addEventListener('resize',restore,{passive:true});

  const footer=document.querySelector('.footer');
  if(footer&&'IntersectionObserver' in window){
    new IntersectionObserver(entries=>nav.classList.toggle('footer-visible',entries.some(x=>x.isIntersecting)),{threshold:.02}).observe(footer);
  }
  window.resetJourneySwitcherPosition=()=>{localStorage.removeItem(storageKey);restore();nav.classList.add('position-reset');setTimeout(()=>nav.classList.remove('position-reset'),500)};
}

const APP_RELEASE={version:'7.2.3',buildId:'v7.2.3-cloud-trip-bootstrap'};
let updateRegistration=null;
let appUpdatesPromise=null;
function showUpdateBanner(reg){
  updateRegistration=reg||updateRegistration;
  let banner=document.querySelector('.app-update-banner');
  if(!banner){
    banner=document.createElement('aside');
    banner.className='app-update-banner';
    banner.setAttribute('role','status');
    banner.innerHTML=`<div><strong>Travel companion update ready</strong><span>A newer release has been downloaded.</span></div><button type="button" data-install-app-update>Update now</button>`;
    document.body.appendChild(banner);
    banner.querySelector('[data-install-app-update]').onclick=()=>activateWaitingWorker();
  }
  banner.classList.add('show');
  document.querySelectorAll('[data-activate-update]').forEach(b=>b.hidden=false);
  document.querySelectorAll('[data-update-status]').forEach(x=>x.textContent='A newer version is downloaded and ready to install.');
}
function activateWaitingWorker(){
  const worker=updateRegistration?.waiting;
  if(worker) worker.postMessage({type:'SKIP_WAITING'});
  else location.reload();
}
async function setupAppUpdates(){
  if(appUpdatesPromise)return appUpdatesPromise;
  appUpdatesPromise=(async()=>{
  if(!('serviceWorker' in navigator)) return null;
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing)return;
    refreshing=true;
    location.reload();
  });
  try{
    const swUrl=abs('/service-worker.js?v='+encodeURIComponent(APP_RELEASE.version));
    const reg=await navigator.serviceWorker.register(swUrl,{updateViaCache:'none'});
    updateRegistration=reg;
    const inspect=()=>{
      if(reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);
    };
    inspect();
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed' && navigator.serviceWorker.controller) showUpdateBanner(reg);
      });
    });
    await reg.update().catch(()=>{});
    await navigator.serviceWorker.ready.catch(()=>reg);
    setInterval(()=>reg.update().catch(()=>{}),5*60*1000);
    return reg;
  }catch(err){
    console.warn('Service worker registration failed',err);
    return null;
  }
  })();
  return appUpdatesPromise;
}
async function diagnosticsPage(){
  const target=document.querySelector('[data-diagnostics]');
  if(!target)return;
  const status=document.querySelector('[data-update-status]');
  const checks=document.querySelector('[data-release-checks]');
  const timeout=(promise,ms,fallback)=>Promise.race([
    Promise.resolve(promise).catch(()=>fallback),
    new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))
  ]);
  let currentRegistration=null;

  // Wire controls first so a slow Safari API cannot leave the page buttons inert.
  const checkButton=document.querySelector('[data-check-update]');
  if(checkButton)checkButton.onclick=async()=>{
    checkButton.disabled=true;
    if(status)status.textContent='Registering the offline app and checking GitHub Pages…';
    try{
      // A retry must actively register the worker. Merely calling getRegistration()
      // cannot recover when Safari has no registration yet.
      appUpdatesPromise=null;
      let reg=await timeout(setupAppUpdates(),15000,null);
      if(!reg)reg=await timeout(navigator.serviceWorker?.getRegistration?.(),4000,null);
      if(reg)await timeout(reg.update(),7000,null);
      const worker=reg?.active||reg?.waiting||reg?.installing;
      if(reg?.waiting){
        if(status)status.textContent='Update ready. Tap Install downloaded update.';
        showUpdateBanner(reg);
      }else if(reg?.active){
        if(status)status.textContent='Offline app registered and active. Reload once if this tab is not yet controlled.';
      }else if(reg?.installing){
        if(status)status.textContent='Offline app is installing. Wait a few seconds, then reload this page.';
      }else if(status){
        status.textContent='Registration still did not complete. Open Safari Web Inspector Console for the exact error.';
      }
    }catch(e){
      console.error('Manual service-worker retry failed',e);
      if(status)status.textContent='Registration retry failed. Open Safari Web Inspector Console for the exact error.';
    }
    checkButton.disabled=false;
  };
  const clearButton=document.querySelector('[data-clear-app-cache]');
  if(clearButton)clearButton.onclick=async()=>{
    clearButton.disabled=true;
    if(status)status.textContent='Clearing this app cache…';
    try{
      if('caches' in window){
        const names=await timeout(caches.keys(),4000,[]);
        await timeout(Promise.all(names.map(k=>caches.delete(k))),5000,[]);
      }
      const reg=await timeout(navigator.serviceWorker?.getRegistration?.(),3000,null);
      if(reg)await timeout(reg.unregister(),3000,false);
    }catch(e){}
    location.replace(abs('/index.html')+'?refresh='+Date.now());
  };
  const resetButton=document.querySelector('[data-reset-navigation-position]');
  if(resetButton)resetButton.onclick=()=>{
    window.resetJourneySwitcherPosition?.();
    const note=document.querySelector('[data-navigation-position-status]');
    if(note)note.textContent='Navigation button returned to its default position.';
  };
  const install=document.querySelector('[data-activate-update]');
  if(install)install.onclick=activateWaitingWorker;

  let info={version:APP_RELEASE.version,buildId:APP_RELEASE.buildId,buildDate:'Unavailable',cacheName:'Unavailable'};
  try{
    const r=await timeout(fetch(abs('/data/build-info.json')+'?t='+Date.now(),{cache:'no-store'}),5000,null);
    if(r?.ok)info=await timeout(r.json(),2500,info);
  }catch(e){}

  let reg=null,controller='Service-worker status unavailable',waiting='Unknown';
  if('serviceWorker' in navigator){
    // Diagnostics is the recovery page, so actively start registration instead of
    // merely observing whether another startup path happened to finish first.
    reg=await timeout(setupAppUpdates(),15000,null);
    if(!reg)reg=await timeout(navigator.serviceWorker.getRegistration(),4000,null);
    currentRegistration=reg;
    const controlled=navigator.serviceWorker.controller?.scriptURL;
    const active=reg?.active?.scriptURL;
    controller=controlled ? 'Controlling this page: '+controlled+' · Scope: '+(reg?.scope||'unknown') : (active ? 'Registered and active: '+active+' · Scope: '+(reg?.scope||'unknown')+' (reload once if this tab is not yet controlled)' : (reg?.installing ? 'Registration is installing: '+(reg.installing.scriptURL||'service-worker.js')+' · Reload shortly.' : 'Registration did not complete. Use Check for update to retry registration.'));
    waiting=reg?.waiting?'Yes':(reg?'No':'Unknown');
  }else{
    controller='Service workers are not supported by this browser.';
    waiting='Not supported';
  }
  const cacheNames=('caches' in window)?await timeout(caches.keys(),4000,[]):[];
  target.innerHTML=`
    <article class="card diagnostic-primary"><div class="meta">Running release</div><strong>v${info.version}</strong><p>${info.buildId}</p></article>
    <article class="card"><h2>Build</h2><dl><dt>Build date</dt><dd>${info.buildDate}</dd><dt>Expected cache</dt><dd>${info.cacheName}</dd></dl></article>
    <article class="card"><h2>This device</h2><dl><dt>Online</dt><dd>${navigator.onLine?'Yes':'No'}</dd><dt>Display mode</dt><dd>${matchMedia('(display-mode: standalone)').matches?'Installed app':'Browser tab'}</dd><dt>Waiting update</dt><dd>${waiting}</dd></dl></article>
    <article class="card"><h2>Service worker</h2><p class="diagnostic-code">${controller}</p><h3>Stored caches</h3><p class="diagnostic-code">${cacheNames.join('\n')||'None reported'}</p></article>`;
  if(status)status.textContent=reg?.waiting?'An update is downloaded and ready to install.':'This device reports v'+info.version+'. Use Check for update to ask GitHub Pages again.';
  if(install){install.hidden=!reg?.waiting;install.onclick=activateWaitingWorker}

  const assetVersion=String(info.version||APP_RELEASE.version||'').trim();
  const urls=['/index.html',`/assets/js/app.js?v=${encodeURIComponent(assetVersion)}`,`/assets/js/map-explorer.js?v=${encodeURIComponent(assetVersion)}`,'/data/trip.json','/data/build-info.json','/diagnostics.html'];
  const results=await Promise.all(urls.map(async u=>{
    try{const r=await timeout(fetch(abs(u),{cache:'no-store'}),5000,null);return [u,Boolean(r?.ok)]}catch(e){return[u,false]}
  }));
  if(checks)checks.innerHTML=results.map(([u,ok])=>`<p class="diagnostic-check ${ok?'ok':'bad'}"><strong>${ok?'✓':'✕'}</strong> ${u}</p>`).join('');

  const healthTarget=document.querySelector('[data-project-health]');
  if(healthTarget){
    try{
      const r=await timeout(fetch(abs('/data/project-health.json')+'?t='+Date.now(),{cache:'no-store'}),5000,null);
      if(!r?.ok)throw new Error('Project health unavailable');
      const health=await r.json();
      const stateLabel={working:'Working',planned:'Planned','not-supported':'Not available as automatic web sync'};
      healthTarget.innerHTML=`<p><strong>Baseline:</strong> v${health.baseline} · <strong>Current:</strong> v${health.release}</p>`+
        `<div class="diagnostic-checks">${health.components.map(item=>`<p class="diagnostic-check ${item.state==='working'?'ok':item.state==='planned'?'':'bad'}"><strong>${item.state==='working'?'✓':item.state==='planned'?'○':'—'}</strong> ${item.name}: ${stateLabel[item.state]||item.state}<br><small>${item.verification}</small></p>`).join('')}</div>`+
        `<h3>Release gates</h3><div class="diagnostic-checks">${health.releaseGates.map(x=>`<p class="diagnostic-check"><strong>□</strong> ${x}</p>`).join('')}</div>`;
    }catch(e){healthTarget.innerHTML='<p>Project-health manifest could not be loaded.</p>';}
  }
}

document.addEventListener('DOMContentLoaded',async()=>{
  // Diagnostics must initialize before shell, trip-data, or service-worker startup.
  // This keeps its controls usable even when another startup task stalls on Safari.
  if(document.body.dataset.view==='diagnostics'){
    diagnosticsPage().catch(err=>{
      console.error('Diagnostics initialization failed',err);
      const target=document.querySelector('[data-diagnostics]');
      if(target)target.innerHTML='<article class="card"><h2>Diagnostics could not finish loading</h2><p>Reload this page or use the cache-reset control below.</p></article>';
    });
  }

  let trip=null;
  try{trip=await shell();}catch(err){console.error('App shell failed',err);}
  try{unifiedJourneySwitcher();}catch(err){console.warn('Journey switcher failed',err);}
  try{await Promise.race([setupAppUpdates(),new Promise(resolve=>setTimeout(resolve,6000))]);}catch(err){console.warn('App update setup failed',err);}

  if(!trip)return;
  if(document.body.dataset.view==='dashboard')dashboard(trip);
  if(document.body.dataset.view==='timeline')timeline(trip);
  if(document.body.dataset.view==='istanbul')istanbulCards();
  if(document.body.dataset.view==='excursions')excursionTable();
  if(document.body.dataset.view==='search')searchPage();
  if(document.body.dataset.view==='favorites')favoritesPage();
  glanceStatus(trip);intelligence();interactiveMedia();interactiveCruiseRoute();
});