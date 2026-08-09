
const CACHE="RT-V7.5.3-FEMALE-VOICE";
const STATIC=[
 "./index.html?v=753","./sos.html?v=753","./risk.html?v=753","./contacts.html?v=753",
 "./style.css?v=753","./shared.js?v=753","./translate.js?v=753","./sos.js?v=753","./contacts.js?v=753",
 "./manifest.webmanifest?v=753","./risk-data.js?v=753","./risk.js?v=753"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=753")))
  );
});
