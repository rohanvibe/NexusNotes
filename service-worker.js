const CACHE_NAME = 'nexusnotes-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './src/app.js',
  './src/styles/main.css',
  './src/core/router.js',
  './src/core/events.js',
  './src/core/knowledge.js',
  './src/core/security.js',
  './src/db/indexeddb.js',
  './src/db/fs-access.js',
  './src/components/dashboard.js',
  './src/components/editor.js',
  './src/components/graph.js',
  './src/components/vault-manager.js',
  './src/components/vault-unlock.js',
  './src/components/command-palette.js',
  './src/components/settings.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Nexus SW] Caching core system...');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Nexus SW] Purging obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') return networkResponse;
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return networkResponse;
      }).catch(() => { });
    })
  );
});
