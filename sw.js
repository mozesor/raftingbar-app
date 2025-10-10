self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if ((/script\.google(?:usercontent)?\.com$/i).test(url.hostname) && url.pathname.includes('/macros/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  event.respondWith(fetch(event.request));
});
