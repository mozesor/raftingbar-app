// רפטינג בר - Service Worker
// גרסה 1.0.2 (network-first for navigations + safer caching)

const VERSION = 'v1.0.2';
const STATIC_CACHE_NAME = `raftingbar-static-${VERSION}`;
const DYNAMIC_CACHE_NAME = `raftingbar-dynamic-${VERSION}`;

// קבצים סטטיים למטמון (בלי index.html כדי למנוע "נעילה" על גרסאות ישנות)
const STATIC_FILES = [
  './',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter(n => (n !== STATIC_CACHE_NAME && n !== DYNAMIC_CACHE_NAME) && n.startsWith('raftingbar-'))
        .map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // הורדות קבצים - אל תתערב
  if (req.method === 'GET' &&
      (url.pathname.endsWith('.csv') || req.headers.get('content-disposition'))) {
    return;
  }

  // 1) עמודים (ניווטים) - אסטרטגיית Network First
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./')))
    );
    return;
  }

  // 2) קבצים סטטיים (css/js/png וכו') - Cache First
  if (req.method === 'GET' &&
      (url.origin === location.origin ||
       url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|css|js|woff2?)$/i))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // עדכון ברקע
          fetch(req).then((net) => {
            if (net && net.status === 200) {
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(req, net.clone()));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(req).then((net) => {
          if (net && net.status === 200) {
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(req, net.clone()));
          }
          return net;
        });
      })
    );
    return;
  }

  // 3) APIs של Google - Network First עם נפילה למטמון
  if (req.method === 'GET' &&
      (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com'))) {
    event.respondWith(
      fetch(req, { signal: AbortSignal.timeout(8000) })
        .then((net) => {
          if (net && net.status === 200) {
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(req, net.clone()));
          }
          return net;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // POST - רשת בלבד
  if (req.method === 'POST') {
    event.respondWith(fetch(req).catch(() => {
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        message: 'נתונים נשמרו מקומית ויסונכרנו כשהחיבור יחזור'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  // ברירת מחדל
  event.respondWith(fetch(req));
});

// הודעות מהאפליקציה
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CLEAR_CACHE') {
    Promise.all([
      caches.delete(DYNAMIC_CACHE_NAME),
      caches.open(DYNAMIC_CACHE_NAME)
    ]).then(() => event.ports[0]?.postMessage?.({ success: true }));
  }
});

console.log('🏄‍♂️ Service Worker של רפטינג בר מוכן! גרסה', VERSION);
