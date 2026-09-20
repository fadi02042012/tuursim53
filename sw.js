const CACHE_NAME='tuursim53-static-v8';
const STATIC_ASSETS=[];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin || url.pathname.includes('wikipedia.org')) return;
 if(event.request.method!=='GET') return;
 event.respondWith(caches.match(event.request).then(cached=>{
   const network=fetch(event.request).then(response=>{
     if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));}
     return response;
   }).catch(()=>cached);
   return cached||network;
 }));
});
