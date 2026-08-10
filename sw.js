const CACHE="RT-V10.0-APP-CORE";
const ASSETS=["./index.html?v=100", "./risk.html?v=100", "./sos.html?v=100", "./contacts.html?v=100", "./style.css?v=100", "./shared.js?v=100", "./translate.js?v=100", "./contacts.js?v=100", "./app/app-state.js?v=100", "./app/app-core.js?v=100", "./services/location-service.js?v=100", "./services/emergency-service.js?v=100", "./services/nearby-service.js?v=100", "./services/risk-service.js?v=100", "./services/notification-service.js?v=100", "./services/update-service.js?v=100", "./ui/app-ui.js?v=100", "./ui/emergency-ui.js?v=100", "./ui/risk-ui.js?v=100", "./data/app-data.json?v=100", "./manifest.webmanifest?v=100"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(x=>new Request(x,{cache:"reload"})))).catch(()=>{}));});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener("fetch",e=>{
 const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 if(r.mode==="navigate"||r.destination==="document"){e.respondWith((async()=>{try{return await fetch(r,{cache:"no-store"})}catch{return (await caches.match("./index.html?v=100"))||Response.error()}})());return;}
 if(u.origin!==location.origin)return;
 e.respondWith((async()=>{try{const n=await fetch(r,{cache:"no-store"});const c=await caches.open(CACHE);c.put(r,n.clone());return n;}catch{return (await caches.match(r))||Response.error()}})());
});
