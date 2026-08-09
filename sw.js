
const CACHE="RT-V7.8-TAIWAN-NEAREST-EMERGENCY";
const STATIC=[
 "./index.html?v=78","./sos.html?v=78","./risk.html?v=78","./contacts.html?v=78",
 "./style.css?v=78","./shared.js?v=78","./translate.js?v=78","./sos.js?v=78","./contacts.js?v=78",
 "./manifest.webmanifest?v=78","./live-risk.js?v=78","./risk-feed.json","./taiwan-regions.json","./taiwan-link.js?v=78","./nearby.js?v=78","./location-weather.js?v=78","./risk-data.js?v=78","./risk.js?v=78"
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
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=78")))
  );
});
