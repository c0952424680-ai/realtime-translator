const CACHE="RT-V9.3-SMART-AUTO-UPDATE";
const ASSETS=["./index.html?v=93", "./risk.html?v=93", "./sos.html?v=93", "./contacts.html?v=93", "./style.css?v=93", "./shared.js?v=93", "./translate.js?v=93", "./travel-context.js?v=93", "./data-center.js?v=93", "./travel-data-store.js?v=93", "./data-center-view.js?v=93", "./data-status.js?v=93", "./smart-update.js?v=93", "./auto-update.js?v=93", "./data-health.js?v=93", "./manual-refresh.js?v=93", "./app-shell.js?v=93", "./location-weather.js?v=93", "./live-risk.js?v=93", "./nearby.js?v=93", "./taiwan-link.js?v=93", "./manual-location.js?v=93", "./assistant-unified.js?v=93", "./safety-hub.js?v=93", "./manifest.webmanifest?v=93", "./data-center.json?v=93"];
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
      catch{return (await caches.match("./index.html?v=93"))||Response.error()}
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
