
const CACHE="rt-v74";
const STATIC=[
 "./","./index.html","./sos.html","./risk.html","./contacts.html",
 "./style.css","./shared.js","./translate.js","./sos.js","./contacts.js","./manifest.webmanifest"
];
self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  const isPage=e.request.mode==="navigate";
  if(isPage){
    e.respondWith(
      fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html")))
    );
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(net=>{const cp=net.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return net})));
  }
});
