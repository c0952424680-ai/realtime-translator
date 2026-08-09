const CACHE="RT-V9.2-UNIFIED-DATA-CENTER";
const ASSETS=["./index.html?v=92", "./risk.html?v=92", "./sos.html?v=92", "./contacts.html?v=92", "./style.css?v=92", "./shared.js?v=92", "./translate.js?v=92", "./travel-context.js?v=92", "./data-center.js?v=92", "./travel-data-store.js?v=92", "./data-center-view.js?v=92", "./data-status.js?v=92", "./auto-update.js?v=92", "./app-shell.js?v=92", "./location-weather.js?v=92", "./live-risk.js?v=92", "./nearby.js?v=92", "./taiwan-link.js?v=92", "./manual-location.js?v=92", "./assistant-unified.js?v=92", "./safety-hub.js?v=92", "./manifest.webmanifest?v=92", "./data-center.json?v=92"];
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
      catch{return (await caches.match("./index.html?v=92"))||Response.error()}
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
