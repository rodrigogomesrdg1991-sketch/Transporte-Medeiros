const CACHE_NAME = 'transporte-medeiros-v10';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './icons/watermark-medeiros.jpg'
];

const EXTERNAL_CACHEABLE = [
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(
        EXTERNAL_CACHEABLE.map((url) =>
          fetch(url, { mode: 'cors' }).then((res) => {
            if (res && res.ok) return cache.put(url, res);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (
    url.hostname.includes('project-osrm.org') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('viacep.com.br')
  ) {
    event.respondWith(fetch(req));
    return;
  }

  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (
          res &&
          res.status === 200 &&
          (url.origin === self.location.origin || url.hostname.includes('cdn.jsdelivr.net'))
        ) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
