// Rafting Bar – Service Worker (safe)
const VERSION = 'rb-20250929-3';
const STATIC = `rb-static-${VERSION}`;
const DYNAMIC = `rb-dyn-${VERSION}`;
const STATIC_FILES = ['./','./manifest.json','./icon-192x192.png','./icon-512x512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(STATIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('rb-') && k !== STATIC && k !== DYNAMIC).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
function putSafe(cacheName, req, res){
  try{ if(!res) return; const t=res.type; const ok=res.ok && (t==='basic'||t==='default'); if(ok) caches.open(cacheName).then(c=>c.put(req,res.clone())); }catch(_){}
}
self.addEventListener('fetch', (e) => {
  const req=e.request, url=new URL(req.url);
  if (req.method==='GET' && (url.pathname.endsWith('.csv') || req.headers.get('content-disposition'))) return;
  if (req.mode==='navigate'){
    e.respondWith((async()=>{ try{ const net=await fetch(req,{cache:'no-store'}); putSafe(DYNAMIC,req,net); return net; } catch { const cached=await caches.match(req); return cached || caches.match('./'); } })());
    return;
  }
  if (req.method==='GET' && (url.origin===location.origin || url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|css|js|woff2?)$/i))){
    e.respondWith((async()=>{ const cached=await caches.match(req); if(cached){ fetch(req).then(net=>putSafe(DYNAMIC,req,net)).catch(()=>{}); return cached; } const net=await fetch(req); putSafe(DYNAMIC,req,net); return net; })());
    return;
  }
  if (req.method==='GET' && (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com'))){
    e.respondWith((async()=>{ try{ const net=await fetch(req); putSafe(DYNAMIC,req,net); return net; } catch { return caches.match(req); } })());
    return;
  }
  e.respondWith(fetch(req));
});
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type==='SKIP_WAITING') self.skipWaiting();
  if (type==='CLEAR_CACHE'){ Promise.all([caches.delete(DYNAMIC), caches.open(DYNAMIC)]).then(()=>{ event.ports[0]?.postMessage?.({success:true}); }); }
});
console.log('🏄 SW ready:', VERSION);
