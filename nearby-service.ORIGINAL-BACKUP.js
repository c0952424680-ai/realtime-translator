const NearbyService={
 endpoints:[
   "https://overpass.kumi.systems/api/interpreter",
   "https://overpass-api.de/api/interpreter",
   "https://overpass.nchc.org.tw/api/interpreter"
 ],
 currentKind:"",

 query(kind,km){
   const s=StateCore.get(),r=Math.round(km*1000);
   const filter=kind==="hospital"
     ?`nwr["amenity"="hospital"](around:${r},${s.lat},${s.lon});nwr["healthcare"="hospital"](around:${r},${s.lat},${s.lon});nwr["amenity"="clinic"]["emergency"="yes"](around:${r},${s.lat},${s.lon});`
     :kind==="police"
       ?`nwr["amenity"="police"](around:${r},${s.lat},${s.lon});`
       :`nwr["amenity"="pharmacy"](around:${r},${s.lat},${s.lon});nwr["healthcare"="pharmacy"](around:${r},${s.lat},${s.lon});`;
   return `[out:json][timeout:12];(${filter});out center tags;`;
 },

 async request(q){
   let last;
   for(const ep of this.endpoints){
     const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4200);
     try{
       const r=await fetch(ep,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(q),signal:ctl.signal});
       clearTimeout(timer);
       if(!r.ok)throw new Error("HTTP "+r.status);
       return await r.json();
     }catch(e){clearTimeout(timer);last=e}
   }
   throw last||new Error("nearby");
 },

 normalize(data,kind){
   const s=StateCore.get(),seen=new Set(),out=[];
   for(const e of data.elements||[]){
     const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon,t=e.tags||{};
     if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
     const name=t["name:zh-Hant"]||t["name:zh"]||t["name:en"]||t.name||({hospital:"未命名醫院",police:"未命名警察機關",pharmacy:"未命名藥局"}[kind]);
     const key=`${name}|${lat.toFixed(4)}|${lon.toFixed(4)}`;if(seen.has(key))continue;seen.add(key);
     out.push({
       name,lat,lon,
       distanceKm:App.distanceKm(s.lat,s.lon,lat,lon),
       phone:t.phone||t["contact:phone"]||"",
       opening:t.opening_hours||"",
       address:[t["addr:housenumber"],t["addr:street"],t["addr:district"],t["addr:city"]].filter(Boolean).join(" ")
     });
   }
   return out.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,5);
 },

 async search(kind){
   this.currentKind=kind;
   const box=document.getElementById("nearbyResults"),status=document.getElementById("nearbyStatus");
   if(box)box.innerHTML="";
   if(status)status.textContent="正在搜尋 10 公里內最近設施…";

   try{
     let list=[],used=10;
     for(const km of [10,15,20,25,30,40,50]){
       used=km;
       const data=await this.request(this.query(kind,km));
       list=this.normalize(data,kind);
       if(list.length>=3)break;
       if(status)status.textContent=`${km} 公里內資料不足，擴大搜尋範圍…`;
     }
     App.health("nearby","ok",`${used} 公里內找到 ${list.length} 筆`);
     this.render(list,kind,used);
   }catch{
     App.health("nearby","error","Overpass 暫時無回應");
     if(status)status.textContent="⚠️ 附近設施服務暫時無回應，可直接使用地圖備援搜尋。";
     if(box)box.innerHTML=this.fallbackButtons(kind);
   }
 },

 fallbackButtons(kind){
   const s=StateCore.get(),c=LOCATION_DATA[s.countryKey],label=`${s.country} ${s.city} ${s.district}`;
   const kw={hospital:"醫院 急診",police:"警察局",pharmacy:"藥局"}[kind]||"";
   const google=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kw+" "+label)}`;
   const apple=`https://maps.apple.com/?q=${encodeURIComponent(kw)}&ll=${encodeURIComponent(s.lat+","+s.lon)}`;
   return `<div class="grid2"><a class="btn primary" href="${google}" target="_blank" rel="noopener">Google Maps 搜尋</a><a class="btn" href="${apple}" target="_blank" rel="noopener">Apple 地圖搜尋</a></div>`;
 },

 render(list,kind,used){
   const box=document.getElementById("nearbyResults"),status=document.getElementById("nearbyStatus");
   if(status)status.textContent=list.length?`✅ 依直線距離排序，顯示最近 ${list.length} 筆；搜尋半徑 ${used} 公里。`:`${used} 公里內沒有可用資料。`;
   if(!box)return;
   if(!list.length){box.innerHTML=this.fallbackButtons(kind);return}
   box.innerHTML=list.map((x,i)=>`<article class="near-card">
     <div class="near-rank">${i+1}</div>
     <div class="near-main">
       <h3>${esc(x.name)}</h3>
       <div class="meta">${x.distanceKm<1?Math.round(x.distanceKm*1000)+" 公尺":x.distanceKm.toFixed(1)+" 公里"}${x.address?"｜"+esc(x.address):""}</div>
       <div class="near-info">${x.phone?`📞 ${esc(x.phone)}`:"📞 無公開電話"}｜${x.opening?`🕒 ${esc(x.opening)}`:"🕒 無公開營業資訊"}</div>
       <div class="near-actions">
         <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}&travelmode=driving" target="_blank" rel="noopener">Google 導航</a>
         <a class="btn" href="https://maps.apple.com/?daddr=${x.lat},${x.lon}" target="_blank" rel="noopener">Apple 導航</a>
         ${x.phone?`<a class="btn" href="tel:${x.phone.replace(/[^\d+]/g,"")}">致電</a>`:""}
       </div>
     </div>
   </article>`).join("");
 },

 openFallback(kind){
   const box=document.getElementById("nearbyResults");
   if(box)box.innerHTML=this.fallbackButtons(kind);
 }
};
window.NearbyService=NearbyService;
