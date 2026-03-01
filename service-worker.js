const CACHE_NAME = 'nexusnotes-v2';
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
  './src/core/sync.js',
  './src/components/dashboard.js',
  './src/components/editor.js',
  './src/components/graph.js',
  './src/components/vault-manager.js',
  './src/components/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-192-maskable.png'
];

// Install Event: Cache app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell...');
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

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET and cross-origin (except CDN)
  if (request.method !== 'GET') return;

  const isCdn = url.hostname.includes('cdn') || url.hostname.includes('cdnjs') || url.hostname.includes('unpkg');
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin && !isCdn) return;

  // SPA navigation logic
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Stale-while-revalidate for assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((response) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });
        return response || fetchPromise;
      });
    })
  );
});

// Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-notes') {
    console.log('[Service Worker] Periodic sync triggered');
    event.waitUntil(syncNotes());
  }
});

async function syncNotes() {
  // Logic to sync notes in the background
  // This would typically call a backend or check for updates
  console.log('[Service Worker] Executing background sync logic...');
  // In a real app: await fetch('/api/sync');
}

// Background Sync (One-off)
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-sync-queue') {
    console.log('[Service Worker] Flush sync queue triggered');
    // Logic to flush the indexedDB sync queue
  }
});

