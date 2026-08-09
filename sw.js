const CACHE="RT-V8.6-TRAVEL-SAFETY-CLEAN";
const ASSETS=["./index.html?v=86", "./risk.html?v=86", "./sos.html?v=86", "./contacts.html?v=86", "./style.css?v=86", "./shared.js?v=86", "./translate.js?v=86", "./location-weather.js?v=86", "./live-risk.js?v=86", "./nearby.js?v=86", "./taiwan-link.js?v=86", "./manual-location.js?v=86", "./assistant-unified.js?v=86", "./manifest.webmanifest?v=86", "./locations.json?v=86", "./location-districts.json?v=86", "./city-coordinates.json?v=86", "./taiwan-regions.json?v=86", "./risk-feed.json?v=86"];
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
      catch{return (await caches.match("./index.html?v=86"))||Response.error()}
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
