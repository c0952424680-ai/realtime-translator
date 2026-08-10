const CACHE="RT-V9.4.1-INTEGRATION-FIX";
const ASSETS=["./index.html?v=941", "./risk.html?v=941", "./sos.html?v=941", "./contacts.html?v=941", "./style.css?v=941", "./shared.js?v=941", "./translate.js?v=941", "./travel-context.js?v=941", "./data-center.js?v=941", "./travel-data-store.js?v=941", "./data-center-view.js?v=941", "./data-status.js?v=941", "./smart-update.js?v=941", "./auto-update.js?v=941", "./data-health.js?v=941", "./manual-refresh.js?v=941", "./app-shell.js?v=941", "./location-core.js?v=941", "./nearby.js?v=941", "./taiwan-link.js?v=941", "./assistant-unified.js?v=941", "./safety-hub.js?v=941", "./risk-event-center.js?v=941", "./manifest.webmanifest?v=941", "./data-center.json?v=941"];
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
      catch{return (await caches.match("./index.html?v=941"))||Response.error()}
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
