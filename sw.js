const CACHE="RT-V9.4-RISK-EVENT-CENTER";
const ASSETS=["./index.html?v=94", "./risk.html?v=94", "./sos.html?v=94", "./contacts.html?v=94", "./style.css?v=94", "./shared.js?v=94", "./translate.js?v=94", "./travel-context.js?v=94", "./data-center.js?v=94", "./travel-data-store.js?v=94", "./data-center-view.js?v=94", "./data-status.js?v=94", "./smart-update.js?v=94", "./auto-update.js?v=94", "./data-health.js?v=94", "./manual-refresh.js?v=94", "./app-shell.js?v=94", "./location-core.js?v=94", "./nearby.js?v=94", "./taiwan-link.js?v=94", "./assistant-unified.js?v=94", "./safety-hub.js?v=94", "./risk-event-center.js?v=94", "./manifest.webmanifest?v=94", "./data-center.json?v=94"];
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
      catch{return (await caches.match("./index.html?v=94"))||Response.error()}
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
