
const LocationEngine={
 async locate(){
  const el=document.getElementById("locationStatus");
  StateCore.set({gpsStatus:"checking"},"gps-check");
  if(el)el.textContent="正在取得 GPS…";
  if(!navigator.geolocation){StateCore.set({gpsStatus:"unsupported"},"gps-error");if(el)el.textContent="⚠️ 此瀏覽器不支援 GPS，請手動選擇所在地。";return}
  try{
   const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000,maximumAge:10000}));
   const lat=p.coords.latitude,lon=p.coords.longitude;
   StateCore.set({lat,lon,gpsStatus:"ok",locationMode:"gps"},"gps-ok");
   const g=await this.reverse(lat,lon);
   if(g&&LOCATION_DATA[g.countryKey]){
    const city=this.closestCity(g.countryKey,lat,lon,g.city);
    const district=g.district||LOCATION_DATA[g.countryKey].cities[city]?.districts?.[0]||"全市";
    StateCore.set({countryKey:g.countryKey,country:LOCATION_DATA[g.countryKey].name,city,district,reverseStatus:"ok",locationMode:"gps"},"reverse-ok");
    this.syncSelectors();
    if(el)el.textContent=`✅ 已同步 GPS：${StateCore.label()}`;
   }else{
    StateCore.set({reverseStatus:"fallback"},"reverse-fallback");
    if(el)el.textContent="✅ GPS 已取得；行政區反查暫時不可用，仍以座標進行即時聯動。";
   }
  }catch(err){
   const msg=err?.code===1?"Safari 未允許位置權限":err?.code===2?"目前無法取得 GPS":err?.code===3?"GPS 定位逾時":"GPS 失敗";
   StateCore.set({gpsStatus:"error"},"gps-error");if(el)el.textContent=`⚠️ ${msg}，仍可手動選擇所在地。`;
  }
 },
 async reverse(lat,lon){
  StateCore.set({reverseStatus:"checking"},"reverse-check");
  try{
   const c=new AbortController(),t=setTimeout(()=>c.abort(),4500);
   const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-TW,en`,{headers:{"Accept":"application/json"},cache:"no-store",signal:c.signal});
   clearTimeout(t);if(!r.ok)throw new Error("reverse");
   const j=await r.json(),a=j.address||{};
   return {countryKey:(a.country_code||"").toUpperCase(),city:a.city||a.town||a.municipality||a.county||a.state||"",district:a.suburb||a.city_district||a.district||a.borough||""};
  }catch{return null}
 },
 closestCity(code,lat,lon,preferred=""){const cities=LOCATION_DATA[code]?.cities||{};if(preferred){const hit=Object.keys(cities).find(n=>preferred.includes(n)||n.includes(preferred));if(hit)return hit}let best=Object.keys(cities)[0]||"",bd=Infinity;for(const [n,c] of Object.entries(cities)){const d=App.distanceKm(lat,lon,c.lat,c.lon);if(d<bd){bd=d;best=n}}return best},
 syncSelectors(){const s=StateCore.get(),c=document.getElementById("countrySelect"),ct=document.getElementById("citySelect"),d=document.getElementById("districtSelect");if(!c)return;c.value=s.countryKey;c.dispatchEvent(new Event("change"));if([...ct.options].some(o=>o.value===s.city))ct.value=s.city;ct.dispatchEvent(new Event("change"));if([...d.options].some(o=>o.value===s.district))d.value=s.district}
};
window.LocationEngine=LocationEngine;
