
const CACHE="RT-V7.5.1-TRANSLATION-RISK-UPGRADE";
const STATIC=[
 "./index.html?v=751","./sos.html?v=751","./risk.html?v=751","./contacts.html?v=751",
 "./style.css?v=751","./shared.js?v=751","./translate.js?v=751","./sos.js?v=751","./contacts.js?v=751",
 "./manifest.webmanifest?v=751"
];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  event.respondWith(
    fetch(event.request,{cache:"no-store"})
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=751")))
  );
});
