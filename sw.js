
const CACHE="RT-V7.4.1-V7.4.1-FORCE-UPDATE-20260809-01";
const STATIC=[
 "./index.html?v=741","./sos.html?v=741","./risk.html?v=741","./contacts.html?v=741",
 "./style.css?v=741","./shared.js?v=741","./translate.js?v=741","./sos.js?v=741","./contacts.js?v=741",
 "./manifest.webmanifest?v=741"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=741")))
  );
});
