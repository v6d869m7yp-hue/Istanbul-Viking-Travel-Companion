const VERSION='6.5.3';
const BUILD_ID='v6.5.4-20260728-reservation-dialog-close-fix';
const CACHE='ivtc-v6.5.4-reservation-dialog-close-fix';
const ESSENTIAL = ["./index.html", "./diagnostics.html", "./assets/css/app.css", "./assets/js/app.js", "./assets/js/core/runtime.js", "./manifest.webmanifest", "./data/build-info.json", "./data/trip.json", "./data/navigation.json"];
const OPTIONAL = [
  "./assets/js/backend/reservation-model.js",
  "./RELEASE-v6.5.4.txt",
  "./RELEASE-v6.4.4.txt",
  "./my-trips.html",
  "./assets/js/backend/trip-model.js",
  "./cloud-vault.html",
  "./RELEASE-v6.1.0.txt",
  "./assets/js/backend/firebase-config.js",
  "./assets/js/backend/firebase-client.js",
  "./assets/js/sync/firebase-adapter.js",
  "./backend-setup.html",
  "./assets/js/sync/adapter.js",
  "./RELEASE-v5.2.0.txt",
  "./RELEASE-v5.1.0.txt",
  "./BOSPHORUS-MAP-FIX.txt",
  "./DUBROVNIK-PHOTO-FIX.txt",
  "./INTERACTIVE-CRUISE-MAP.txt",
  "./MAP-EXPLORER-V4.txt",
  "./MAP-GUIDE-LINK-FIX-v4.0.1.txt",
  "./NORTHERN-ITALY-LINK-FIX.txt",
  "./RELEASE-MANIFEST.txt",
  "./TROY-MAP-FIX.txt",
  "./TROY-PORT-PHOTO-FIX.txt",
  "./UNIFIED-JOURNEY-NAVIGATION.txt",
  "./VERSION.txt",
  "./assets/icons/icon.svg",
  "./assets/img/hero.svg",
  "./assets/img/visuals/basilica-cistern.svg",
  "./assets/img/visuals/blue-mosque.svg",
  "./assets/img/visuals/bosphorus.svg",
  "./assets/img/visuals/embarkation.svg",
  "./assets/img/visuals/istanbul-panorama.svg",
  "./assets/img/visuals/markets.svg",
  "./assets/img/visuals/old-city.svg",
  "./assets/img/visuals/topkapi.svg",
  "./assets/img/visuals/troy-hero.svg",
  "./assets/img/visuals/turkish-breakfast.svg",
  "./assets/js/map-explorer.js",
  "./assets/js/vault.js",
  "./assets/maps/acropolis-walk.svg",
  "./assets/maps/athens-two-day.svg",
  "./assets/maps/blue-mosque-plan.svg",
  "./assets/maps/bosphorus-ferry.png",
  "./assets/maps/bosphorus-ferry.svg",
  "./assets/maps/cistern-plan.svg",
  "./assets/maps/corfu-day-map.svg",
  "./assets/maps/cruise-route.svg",
  "./assets/maps/dubrovnik-walk-map.svg",
  "./assets/maps/embarkation-transfer.svg",
  "./assets/maps/ephesus-site-route.svg",
  "./assets/maps/hagia-floorplan.svg",
  "./assets/maps/heraklion-route.svg",
  "./assets/maps/istanbul-transit.svg",
  "./assets/maps/kotor-day-map.svg",
  "./assets/maps/markets-walk.svg",
  "./assets/maps/master-trip.svg",
  "./assets/maps/olympia-route.svg",
  "./assets/maps/rhodes-day-map.svg",
  "./assets/maps/split-day-map.svg",
  "./assets/maps/sultanahmet-route.svg",
  "./assets/maps/topkapi-plan.svg",
  "./assets/maps/troy-layers.svg",
  "./assets/maps/troy-site-route.png",
  "./assets/maps/troy-site-route.svg",
  "./assets/maps/venice-day-map.svg",
  "./assets/maps/venice-transfer-map.svg",
  "./cruise/daily-life.html",
  "./cruise/disembarkation.html",
  "./cruise/embarkation.html",
  "./cruise/index.html",
  "./cruise/ship-guide.html",
  "./cruise/tomorrow.html",
  "./data/attractions.json",
  "./data/excursions.json",
  "./data/istanbul.json",
  "./data/search-index.json",
  "./favorites.html",
  "./istanbul/days/arrival.html",
  "./istanbul/days/bosphorus.html",
  "./istanbul/days/markets.html",
  "./istanbul/days/old-city.html",
  "./istanbul/embarkation.html",
  "./istanbul/explorer.html",
  "./istanbul/index.html",
  "./istanbul/itinerary.html",
  "./istanbul/maps.html",
  "./istanbul/practical.html",
  "./istanbul/restaurants.html",
  "./istanbul/sultanahmet/basilica-cistern.html",
  "./istanbul/sultanahmet/blue-mosque.html",
  "./istanbul/sultanahmet/hagia-sophia.html",
  "./istanbul/sultanahmet/index.html",
  "./istanbul/sultanahmet/topkapi-palace.html",
  "./istanbul/to-viking.html",
  "./istanbul/visuals.html",
  "./photo-credits.html",
  "./ports/athens/acropolis.html",
  "./ports/athens/day-one.html",
  "./ports/athens/day-two.html",
  "./ports/athens/index.html",
  "./ports/athens/maps.html",
  "./ports/athens/museum.html",
  "./ports/athens/plaka.html",
  "./ports/corfu/fortress.html",
  "./ports/corfu/index.html",
  "./ports/corfu/maps.html",
  "./ports/corfu/old-town.html",
  "./ports/corfu/panoramic.html",
  "./ports/corfu/photography.html",
  "./ports/dubrovnik/index.html",
  "./ports/dubrovnik/maps.html",
  "./ports/dubrovnik/photography.html",
  "./ports/dubrovnik/walk.html",
  "./ports/dubrovnik/walls.html",
  "./ports/ephesus/before-you-go.html",
  "./ports/ephesus/great-theatre.html",
  "./ports/ephesus/index.html",
  "./ports/ephesus/library-of-celsus.html",
  "./ports/ephesus/photography.html",
  "./ports/ephesus/route.html",
  "./ports/ephesus/terrace-houses.html",
  "./ports/heraklion/harbor.html",
  "./ports/heraklion/index.html",
  "./ports/heraklion/maps.html",
  "./ports/heraklion/minoan-highlights.html",
  "./ports/heraklion/museum.html",
  "./ports/index.html",
  "./ports/kotor/highlights.html",
  "./ports/kotor/index.html",
  "./ports/kotor/maps.html",
  "./ports/kotor/old-town.html",
  "./ports/kotor/photography.html",
  "./ports/olympia/before-you-go.html",
  "./ports/olympia/index.html",
  "./ports/olympia/maps.html",
  "./ports/olympia/museum.html",
  "./ports/olympia/sanctuary.html",
  "./ports/olympia/stadium.html",
  "./ports/rhodes/east-coast.html",
  "./ports/rhodes/index.html",
  "./ports/rhodes/lindos.html",
  "./ports/rhodes/maps.html",
  "./ports/rhodes/old-town.html",
  "./ports/rhodes/palace.html",
  "./ports/rhodes/photography.html",
  "./ports/rhodes/street-of-knights.html",
  "./ports/split/index.html",
  "./ports/split/maps.html",
  "./ports/split/palace.html",
  "./ports/split/photography.html",
  "./ports/split/riviera.html",
  "./ports/troy/ancient-world.html",
  "./ports/troy/before-you-go.html",
  "./ports/troy/index.html",
  "./ports/troy/layers.html",
  "./ports/troy/museum.html",
  "./ports/troy/myth-history.html",
  "./ports/troy/photography.html",
  "./ports/troy/route.html",
  "./ports/venice/disembarkation.html",
  "./ports/venice/doges-palace.html",
  "./ports/venice/handoff.html",
  "./ports/venice/index.html",
  "./ports/venice/maps.html",
  "./ports/venice/photography.html",
  "./ports/venice/st-marks.html",
  "./reservations.html",
  "./search.html",
  "./timeline.html",
  "./trip-at-a-glance.html",
  "./vault.html",
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Cache files one at a time. Safari can reject an entire cache.addAll()
    // batch because of one duplicate, redirect, or missing optional resource.
    const urls = [...new Set([...ESSENTIAL, ...OPTIONAL])];
    const failures = [];

    for (const url of urls) {
      try {
        const request = new Request(url, { cache: 'reload' });
        const response = await fetch(request);
        if (!response || !response.ok) {
          throw new Error(`HTTP ${response ? response.status : 'no response'}`);
        }
        await cache.put(request, response.clone());
      } catch (error) {
        failures.push({ url, message: String(error && error.message ? error.message : error) });
      }
    }

    if (failures.length) {
      console.warn('[IVTC service worker] Optional precache failures:', failures);
    }

    // Installation must not fail because one optional guide asset is unavailable.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('ivtc-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    clients.forEach(client=>client.postMessage({type:'APP_ACTIVATED',version:VERSION,buildId:BUILD_ID}));
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
  if(event.data?.type==='GET_VERSION') event.source?.postMessage({type:'APP_VERSION',version:VERSION,buildId:BUILD_ID,cache:CACHE});
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(error){
    return (await cache.match(request,{ignoreSearch:false})) || (await cache.match(request,{ignoreSearch:true})) || (request.mode==='navigate'?await cache.match('./index.html'):Response.error());
  }
}
async function cacheFirstRefresh(request){
  const cache=await caches.open(CACHE);
  const cached=(await cache.match(request,{ignoreSearch:false}))||(await cache.match(request,{ignoreSearch:true}));
  const refresh=fetch(request).then(response=>{if(response&&response.ok)cache.put(request,response.clone());return response;}).catch(()=>null);
  return cached || (await refresh) || Response.error();
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const isCritical=request.mode==='navigate'||/\.(?:html|json|js|css)$/.test(url.pathname)||url.pathname.endsWith('/');
  event.respondWith(isCritical?networkFirst(request):cacheFirstRefresh(request));
});
