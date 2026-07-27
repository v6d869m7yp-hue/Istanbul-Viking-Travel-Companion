const CACHE='ivtc-v2.2.2';
const ASSETS=[
  "./assets/css/app.css",
  "./assets/icons/icon.svg",
  "./assets/img/hero.svg",
  "./assets/img/visuals/bosphorus.svg",
  "./assets/img/visuals/embarkation.svg",
  "./assets/img/visuals/istanbul-panorama.svg",
  "./assets/img/visuals/markets.svg",
  "./assets/img/visuals/old-city.svg",
  "./assets/img/visuals/blue-mosque.svg",
  "./assets/img/visuals/basilica-cistern.svg",
  "./assets/img/visuals/topkapi.svg",
  "./assets/img/visuals/turkish-breakfast.svg",
  "./assets/js/app.js",
  "./cruise/index.html",
  "./data/excursions.json",
  "./data/istanbul.json",
  "./data/navigation.json",
  "./data/trip.json",
  "./index.html",
  "./istanbul/days/arrival.html",
  "./istanbul/days/bosphorus.html",
  "./istanbul/days/markets.html",
  "./istanbul/days/old-city.html",
  "./istanbul/embarkation.html",
  "./istanbul/index.html",
  "./istanbul/itinerary.html",
  "./istanbul/maps.html",
  "./istanbul/practical.html",
  "./istanbul/restaurants.html",
  "./manifest.webmanifest",
  "./ports/index.html",
  "./reservations.html",
  "./timeline.html",
  './data/attractions.json',
  './istanbul/explorer.html',
  './istanbul/visuals.html',
  './photo-credits.html'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const isPhoto=e.request.destination==='image' && new URL(e.request.url).origin!==self.location.origin;
  if(isPhoto){
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request,{mode:'no-cors'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./assets/img/hero.svg'))));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
