// Rafting Bar – Service Worker (safe, network-first for pages)
const VERSION = 'rb-20250929-2';
const STATIC = `rb-static-${VERSION}`;
const DYNAMIC = `rb-dyn-${VERSION}`;

const STATIC_FILES = [
  './',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(STATIC_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('rb-') && k !== STATIC && k !== DYNAMIC).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method === 'GET' && (url.pathname.endsWith('.csv') || req.headers.get('content-disposition'))) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: 'no-store' });
        caches.open(DYNAMIC).then(c => c.put(req, net.clone()));
        return net;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match('./');
      }
    })());
    return;
  }

  if (req.method === 'GET' && (url.origin === location.origin ||
      url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|css|js|woff2?)$/i))) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) {
        fetch(req).then(net => {
          if (net && net.ok && net.type !== 'opaque') caches.open(DYNAMIC).then(c => c.put(req, net.clone()));
        }).catch(()=>{});
        return cached;
      }
      const net = await fetch(req);
      if (net && net.ok && net.type !== 'opaque') caches.open(DYNAMIC).then(c => c.put(req, net.clone()));
      return net;
    })());
    return;
  }

  if (req.method === 'GET' &&
      (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com'))) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net && net.ok && net.type !== 'opaque') caches.open(DYNAMIC).then(c => c.put(req, net.clone()));
        return net;
      } catch {
        return caches.match(req);
      }
    })());
    return;
  }

  e.respondWith(fetch(req));
});

self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CLEAR_CACHE') {
    Promise.all([caches.delete(DYNAMIC), caches.open(DYNAMIC)]).then(() => {
      event.ports[0]?.postMessage?.({ success: true });
    });
  }
});

console.log('🏄 SW ready:', VERSION);
