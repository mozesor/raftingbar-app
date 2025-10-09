
// RB SW – no caching for Apps Script, pass-through for rest
const VERSION='rb-20251009-2';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(fetch(event.request)); // network only, no cache
    return;
  }
  event.respondWith(fetch(event.request)); // passthrough
});

console.log('SW ready:', VERSION);
