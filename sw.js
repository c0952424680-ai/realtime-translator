
const CACHE="RT-V8.4-TRAVEL-SAFETY-HARD-REFRESH";
const STATIC=[
 "./index.html?v=84","./sos.html?v=84","./risk.html?v=84","./contacts.html?v=84",
 "./style.css?v=84","./shared.js?v=84","./translate.js?v=84","./sos.js?v=84","./contacts.js?v=84",
 "./manifest.webmanifest?v=84","./live-risk.js?v=84","./risk-feed.json","./taiwan-regions.json","./city-coordinates.json","./locations.json","./location-districts.json","./manual-location.js?v=84","./assistant-unified.js?v=84","./taiwan-link.js?v=84","./nearby.js?v=84","./location-weather.js?v=84","./risk-data.js?v=84","./risk.js?v=84"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=84")))
  );
});
