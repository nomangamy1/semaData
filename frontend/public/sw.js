const CACHE_NAME = 'semadata-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls → network only (never cache auth/data)
// - Static assets → cache first, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls
  if (url.pathname.startsWith('/api/') || url.hostname === 'localhost') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// Background sync for offline audio drafts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-audio-drafts') {
    console.log('[SW] Background sync triggered for audio drafts');
  }
});
