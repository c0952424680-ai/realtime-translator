
const CACHE="RT-V8.3-TRAVEL-SAFETY-UNIFIED";
const STATIC=[
 "./index.html?v=83","./sos.html?v=83","./risk.html?v=83","./contacts.html?v=83",
 "./style.css?v=83","./shared.js?v=83","./translate.js?v=83","./sos.js?v=83","./contacts.js?v=83",
 "./manifest.webmanifest?v=83","./live-risk.js?v=83","./risk-feed.json","./taiwan-regions.json","./city-coordinates.json","./locations.json","./location-districts.json","./manual-location.js?v=83","./assistant-summary.js?v=83","./assistant-unified.js?v=83","./taiwan-link.js?v=83","./nearby.js?v=83","./location-weather.js?v=83","./risk-data.js?v=83","./risk.js?v=83"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=83")))
  );
});
