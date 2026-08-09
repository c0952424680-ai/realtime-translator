
const CACHE="RT-V8.0-COUNTRY-CITY-DISTRICT";
const STATIC=[
 "./index.html?v=80","./sos.html?v=80","./risk.html?v=80","./contacts.html?v=80",
 "./style.css?v=80","./shared.js?v=80","./translate.js?v=80","./sos.js?v=80","./contacts.js?v=80",
 "./manifest.webmanifest?v=80","./live-risk.js?v=80","./risk-feed.json","./taiwan-regions.json","./city-coordinates.json","./locations.json","./location-districts.json","./manual-location.js?v=80","./taiwan-link.js?v=80","./nearby.js?v=80","./location-weather.js?v=80","./risk-data.js?v=80","./risk.js?v=80"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=80")))
  );
});
