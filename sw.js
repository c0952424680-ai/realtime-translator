const CACHE="RT-V8.8-TRAVEL-SAFETY-HUB";
const ASSETS=["./index.html?v=88", "./risk.html?v=88", "./sos.html?v=88", "./contacts.html?v=88", "./style.css?v=88", "./shared.js?v=88", "./translate.js?v=88", "./location-weather.js?v=88", "./live-risk.js?v=88", "./nearby.js?v=88", "./taiwan-link.js?v=88", "./manual-location.js?v=88", "./assistant-unified.js?v=88", "./safety-hub.js?v=88", "./manifest.webmanifest?v=88", "./locations.json?v=88", "./location-districts.json?v=88", "./city-coordinates.json?v=88", "./taiwan-regions.json?v=88", "./risk-feed.json?v=88", "./country-services.json?v=88"];
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
  if(req.mode==="navigate"||req.destination==="document"){
    event.respondWith((async()=>{
      try{return await fetch(req,{cache:"no-store"})}
      catch{return (await caches.match("./index.html?v=88"))||Response.error()}
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
    }catch{return (await caches.match(req))||Response.error()}
  })());
});
