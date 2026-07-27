const CACHE = 'ivtc-v1.5.1';

const FILES = [
  './',
  './index.html',
  './timeline.html',
  './reservations.html',
  './cruise.html',
  './ports/index.html',
  './istanbul/index.html',
  './istanbul/itinerary.html',
  './istanbul/arrival.html',
  './istanbul/old-city.html',
  './istanbul/bosphorus.html',
  './istanbul/markets.html',
  './istanbul/restaurants.html',
  './istanbul/transportation.html',
  './istanbul/practical.html',
  './istanbul/embarkation.html',
  './istanbul/history.html',
  './istanbul/maps.html',
  './assets/css/styles.css',
  './assets/js/app.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/img/hero.svg',
  './assets/img/visuals/istanbul-panorama.svg',
  './assets/img/visuals/old-city.svg',
  './assets/img/visuals/bosphorus.svg',
  './assets/img/visuals/markets.svg',
  './assets/img/visuals/embarkation.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
