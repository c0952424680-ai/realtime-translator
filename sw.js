const CACHE="RT-V8.5.1-GITHUB-PAGES";
const ASSETS=["./index.html?v=851", "./risk.html?v=851", "./sos.html?v=851", "./contacts.html?v=851", "./style.css?v=851", "./shared.js?v=851", "./translate.js?v=851", "./location-weather.js?v=851", "./live-risk.js?v=851", "./nearby.js?v=851", "./taiwan-link.js?v=851", "./manual-location.js?v=851", "./assistant-unified.js?v=851", "./manifest.webmanifest?v=851", "./locations.json?v=851", "./location-districts.json?v=851", "./city-coordinates.json?v=851", "./taiwan-regions.json?v=851", "./risk-feed.json?v=851"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(x=>new Request(x,{cache:"reload"})))).catch(()=>{}));
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);

  if(req.mode==="navigate" || req.destination==="document"){
    event.respondWith((async()=>{
      try{
        return await fetch(req,{cache:"no-store"});
      }catch{
        return (await caches.match("./index.html?v=851")) || (await caches.match("./index.html"));
      }
    })());
    return;
  }

  if(url.origin!==location.origin)return;

  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req,{cache:"no-store"});
      const cache=await caches.open(CACHE);
      cache.put(req,fresh.clone());
      return fresh;
    }catch{
      return (await caches.match(req)) || Response.error();
    }
  })());
});
