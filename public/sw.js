// Retired service worker. It removes itself and any caches, and loads no third-party code.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
    try { const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach((c) => c.navigate(c.url)); } catch (e) {}
  })());
});
