const CACHE_NAME = 'stitch-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './src/app.js',
  './src/styles/main.css',
  './src/core/router.js',
  './src/core/events.js',
  './src/db/indexeddb.js',
  './src/db/fs-access.js',
  './src/components/dashboard.js',
  './src/components/editor.js',
  './src/components/graph.js',
  './src/components/vault-manager.js',
  './src/components/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

// Install Event: Cache app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell...');
      // We use addAll but wrap in try-catch/individual adds to prevent one failing asset from breaking the whole cache
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err)))
      );
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first Strategy for HTML, Cache-first for Assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests and cross-origin requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      // Always try to serve index.html for navigation due to SPA routing
      caches.match('./index.html').then(response => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Handle other Asset requests (CSS, JS, Images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache it dynamically
      return fetch(request).then((networkResponse) => {
        // Don't cache bad responses
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        console.error('[Service Worker] Fetch failed, returning offline fallback for:', request.url);
      });
    })
  );
});
