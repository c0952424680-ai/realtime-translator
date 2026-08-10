const CACHE="RT-V9.5-EMERGENCY-MODE";
const ASSETS=["./index.html?v=95", "./risk.html?v=95", "./sos.html?v=95", "./contacts.html?v=95", "./style.css?v=95", "./shared.js?v=95", "./translate.js?v=95", "./travel-context.js?v=95", "./data-center.js?v=95", "./travel-data-store.js?v=95", "./data-center-view.js?v=95", "./data-status.js?v=95", "./smart-update.js?v=95", "./auto-update.js?v=95", "./data-health.js?v=95", "./manual-refresh.js?v=95", "./app-shell.js?v=95", "./location-core.js?v=95", "./nearby.js?v=95", "./taiwan-link.js?v=95", "./assistant-unified.js?v=95", "./safety-hub.js?v=95", "./risk-event-center.js?v=95", "./emergency-mode.js?v=95", "./manifest.webmanifest?v=95", "./data-center.json?v=95"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(x=>new Request(x,{cache:"reload"})))).catch(()=>{}));});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;const url=new URL(req.url);
  if(req.mode==="navigate"||req.destination==="document"){
    e.respondWith((async()=>{try{return await fetch(req,{cache:"no-store"})}catch{return (await caches.match("./index.html?v=95"))||Response.error()}})());return;
  }
  if(url.origin!==location.origin)return;
  e.respondWith((async()=>{try{const fresh=await fetch(req,{cache:"no-store"});const cache=await caches.open(CACHE);cache.put(req,fresh.clone());return fresh;}catch{return (await caches.match(req))||Response.error()}})());
});
