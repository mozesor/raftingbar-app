// RB SW – אין קאש לקריאות ל-Apps Script; השאר Pass-through
const VERSION = 'rb-20251009-2';

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('script.googleusercontent.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(fetch(event.request));
});

console.log('SW ready:', VERSION);
