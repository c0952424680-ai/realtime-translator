const CACHE="RT-V9.5.1-DEPLOY-FIX";
const ASSETS=["./index.html?v=951", "./risk.html?v=951", "./sos.html?v=951", "./contacts.html?v=951", "./style.css?v=951", "./shared.js?v=951", "./translate.js?v=951", "./travel-context.js?v=951", "./data-center.js?v=951", "./travel-data-store.js?v=951", "./data-center-view.js?v=951", "./data-status.js?v=951", "./smart-update.js?v=951", "./auto-update.js?v=951", "./data-health.js?v=951", "./manual-refresh.js?v=951", "./app-shell.js?v=951", "./location-core.js?v=951", "./nearby.js?v=951", "./taiwan-link.js?v=951", "./assistant-unified.js?v=951", "./safety-hub.js?v=951", "./risk-event-center.js?v=951", "./emergency-mode.js?v=951", "./manifest.webmanifest?v=951", "./data-center.json?v=951", "./deploy-check.html?v=951"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(x=>new Request(x,{cache:"reload"})))).catch(()=>{}));});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener("fetch",e=>{
 const req=e.request;if(req.method!=="GET")return;const url=new URL(req.url);
 if(req.mode==="navigate"||req.destination==="document"){e.respondWith((async()=>{try{return await fetch(req,{cache:"no-store"})}catch{return (await caches.match("./index.html?v=951"))||Response.error()}})());return;}
 if(url.origin!==location.origin)return;
 e.respondWith((async()=>{try{const fresh=await fetch(req,{cache:"no-store"});const c=await caches.open(CACHE);c.put(req,fresh.clone());return fresh;}catch{return (await caches.match(req))||Response.error()}})());
});
