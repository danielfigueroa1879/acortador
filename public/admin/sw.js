// Service worker mínimo para que la app sea instalable.
// Alcance /admin/: nunca intercepta los enlaces cortos de la raíz.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
