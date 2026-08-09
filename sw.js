
const CACHE="RT-V7.5.4-FONT-RISK-ROADMAP";
const STATIC=[
 "./index.html?v=754","./sos.html?v=754","./risk.html?v=754","./contacts.html?v=754",
 "./style.css?v=754","./shared.js?v=754","./translate.js?v=754","./sos.js?v=754","./contacts.js?v=754",
 "./manifest.webmanifest?v=754","./risk-data.js?v=754","./risk.js?v=754"
];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  event.respondWith(
    fetch(event.request,{cache:"no-store"})
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html?v=754")))
  );
});
