
const CACHE="RT-V8.5-GLOBAL-EMERGENCY-CLEAN";
const STATIC=[
 "./index.html?v=85","./sos.html?v=85","./risk.html?v=85","./contacts.html?v=85",
 "./style.css?v=85","./shared.js?v=85","./translate.js?v=85","./sos.js?v=85","./contacts.js?v=85",
 "./manifest.webmanifest?v=85","./live-risk.js?v=85","./risk-feed.json","./taiwan-regions.json","./city-coordinates.json","./locations.json","./location-districts.json","./manual-location.js?v=85","./assistant-unified.js?v=85","./taiwan-link.js?v=85","./nearby.js?v=85","./location-weather.js?v=85"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=85")))
  );
});
