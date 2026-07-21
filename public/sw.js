const CACHE_VERSION = 'farmland-pwa-v1.1.7';
const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
  './', './index.html', './농지관리앱.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  while (keys.length > maxEntries) await cache.delete(keys.shift());
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
      trimCache(RUNTIME_CACHE, 350);
    }
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const clone = response.clone();
      caches.open(APP_CACHE).then(cache => cache.put('./index.html', clone));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      const clone = response.clone();
      caches.open(APP_CACHE).then(cache => cache.put(request, clone));
      return response;
    })));
    return;
  }

  const isMapTile = /tile\.openstreetmap\.org|arcgisonline\.com/.test(url.hostname);
  const isRuntimeLibrary = /cdn\.jsdelivr\.net/.test(url.hostname);
  if (isMapTile || isRuntimeLibrary) event.respondWith(staleWhileRevalidate(request));
});
