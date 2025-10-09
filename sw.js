// Rafting Bar – Service Worker (safe)
const VERSION = 'rb-20251009-1';
const STATIC = `rb-static-${VERSION}`;
const DYNAMIC = `rb-dyn-${VERSION}`;
const STATIC_FILES = ['./','./manifest.json','./icon-192x192.png','./icon-512x512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC)
      .then(c => c.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('rb-') && k !== STATIC && k !== DYNAMIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function putSafe(cacheName, req, res) {
  if (!res || !res.ok) return;
  const cloned = res.clone();
  caches.open(cacheName).then(c => c.put(req, cloned)).catch(() => {});
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // עמודי ניווט
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: 'no-store' });
        putSafe(DYNAMIC, req, net);
        return net;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match('./');
      }
    })());
    return;
  }

  // קבצי סטטיים מתוך האתר
  if (url.origin === location.origin && url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|css|js|woff2?|html)$/i)) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) {
        fetch(req).then(net => putSafe(DYNAMIC, req, net)).catch(() => {});
        return cached;
      }
      const net = await fetch(req);
      putSafe(DYNAMIC, req, net);
      return net;
    })());
    return;
  }

  // גישה ל־googleapis / spreadsheets
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com')) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        putSafe(DYNAMIC, req, net);
        return net;
      } catch {
        return caches.match(req);
      }
    })());
    return;
  }

  // ברירת מחדל
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
