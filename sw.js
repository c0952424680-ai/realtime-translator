
const CACHE="RT-V7.8.1-CLEAN-DEPLOY";
const STATIC=[
 "./index.html?v=781","./sos.html?v=781","./risk.html?v=781","./contacts.html?v=781",
 "./style.css?v=781","./shared.js?v=781","./translate.js?v=781","./sos.js?v=781","./contacts.js?v=781",
 "./manifest.webmanifest?v=781","./live-risk.js?v=781","./risk-feed.json","./taiwan-regions.json","./taiwan-link.js?v=781","./nearby.js?v=781","./location-weather.js?v=781","./risk-data.js?v=781","./risk.js?v=781"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=781")))
  );
});
