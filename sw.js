
const CACHE="RT-V8.1-TRAVEL-SAFETY-CLEAN";
const STATIC=[
 "./index.html?v=81","./sos.html?v=81","./risk.html?v=81","./contacts.html?v=81",
 "./style.css?v=81","./shared.js?v=81","./translate.js?v=81","./sos.js?v=81","./contacts.js?v=81",
 "./manifest.webmanifest?v=81","./live-risk.js?v=81","./risk-feed.json","./taiwan-regions.json","./city-coordinates.json","./locations.json","./location-districts.json","./manual-location.js?v=81","./taiwan-link.js?v=81","./nearby.js?v=81","./location-weather.js?v=81","./risk-data.js?v=81","./risk.js?v=81"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=81")))
  );
});
