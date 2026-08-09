
const CACHE="RT-V7.7-LINKED-AUTO-RISK";
const STATIC=[
 "./index.html?v=77","./sos.html?v=77","./risk.html?v=77","./contacts.html?v=77",
 "./style.css?v=77","./shared.js?v=77","./translate.js?v=77","./sos.js?v=77","./contacts.js?v=77",
 "./manifest.webmanifest?v=77","./live-risk.js?v=77","./risk-feed.json","./location-weather.js?v=77","./risk-data.js?v=77","./risk.js?v=77"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=77")))
  );
});
