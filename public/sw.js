self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .then(() => {
      self.registration.unregister();
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // Bypass all for now to clear out the dev server cache issues
  event.respondWith(fetch(event.request));
});
