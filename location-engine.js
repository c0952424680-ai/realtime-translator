const LocationEngine={
  async getFreshPosition(maxWait=6500){
    if(!navigator.geolocation)throw new Error("此瀏覽器不支援 GPS");
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:maxWait,maximumAge:15000}));
    const p={lat:Number(pos.coords.latitude),lon:Number(pos.coords.longitude),accuracy:Number(pos.coords.accuracy)};
    if(!StateCore.validPoint(p.lat,p.lon))throw new Error("INVALID_GPS_COORDINATES");
    return p;
  },
  async locate(){
    const el=document.getElementById("locationStatus");
    StateCore.set({gpsStatus:"checking"},"gps-check");
    if(el)el.textContent="正在取得目前 GPS…";
    try{
      const p=await this.getFreshPosition(10000);
      StateCore.set({
        gpsLat:p.lat,gpsLon:p.lon,gpsAccuracy:p.accuracy,
        gpsUpdatedAt:Date.now(),gpsStatus:"ok",locationMode:"gps"
      },"gps-ok");
      const g=await this.reverse(p.lat,p.lon);
      if(g&&LOCATION_DATA[g.countryKey]){
        const city=this.closestCity(g.countryKey,p.lat,p.lon,g.city);
        const district=g.district||LOCATION_DATA[g.countryKey].cities[city]?.districts?.[0]||"全市";
        StateCore.set({gpsCountryKey:g.countryKey,gpsCity:city,gpsDistrict:district,reverseStatus:"ok"},"reverse-ok");
      }else StateCore.set({reverseStatus:"fallback"},"reverse-fallback");
      const s=StateCore.get(),gpsLabel=s.gpsCountryKey?`${LOCATION_DATA[s.gpsCountryKey]?.name||s.gpsCountryKey}・${s.gpsCity||"目前位置"}`:"目前位置";
      if(el)el.textContent=`✅ GPS 已更新：${gpsLabel}｜精度約 ${Math.round(p.accuracy||0)} 公尺；旅遊國家選擇未被覆蓋。`;
      return p;
    }catch(err){
      const msg=err?.code===1?"Safari 未允許位置權限":err?.code===2?"目前無法取得 GPS":err?.code===3?"GPS 定位逾時":"GPS 失敗";
      StateCore.set({gpsStatus:"error"},"gps-error");
      if(el)el.textContent=`⚠️ ${msg}，可先用目前已保存位置。`;
      throw err;
    }
  },
  async reverse(lat,lon){
    StateCore.set({reverseStatus:"checking"},"reverse-check");
    try{
      const c=new AbortController(),t=setTimeout(()=>c.abort(),4500);
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-TW,zh,en`,{headers:{"Accept":"application/json"},cache:"no-store",signal:c.signal});
      clearTimeout(t);if(!r.ok)throw new Error("reverse");
      const j=await r.json(),a=j.address||{};
      return {countryKey:(a.country_code||"").toUpperCase(),city:a.city||a.town||a.municipality||a.county||a.state||"",district:a.suburb||a.city_district||a.district||a.borough||a.village||""};
    }catch{return null}
  },
  async geocodeSelection(countryKey,city,district,fallback){
    if(!district||/^(全市|全區)$/.test(district))return {...fallback,source:"city"};
    const key=`rt_geo_${countryKey}_${city}_${district}`;
    try{
      const cached=JSON.parse(localStorage.getItem(key)||"null");
      if(cached&&Date.now()-cached.time<2592000000&&StateCore.validPoint(cached.lat,cached.lon))return {...cached,source:"cache"};
    }catch{}
    const country=LOCATION_DATA[countryKey],q=[district,city,country?.en||country?.name].filter(Boolean).join(", ");
    const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);
    try{
      const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=${encodeURIComponent(countryKey.toLowerCase())}&q=${encodeURIComponent(q)}`;
      const r=await fetch(u,{headers:{"Accept":"application/json"},cache:"no-store",signal:c.signal});
      if(!r.ok)throw new Error("geocode");
      const j=await r.json(),lat=Number(j?.[0]?.lat),lon=Number(j?.[0]?.lon);
      if(!StateCore.validPoint(lat,lon))throw new Error("coordinates");
      if(App.distanceKm(fallback.lat,fallback.lon,lat,lon)>250)throw new Error("outside-city");
      const out={lat,lon,time:Date.now()};
      try{localStorage.setItem(key,JSON.stringify(out))}catch{}
      return {...out,source:"geocoded"};
    }catch{return {...fallback,source:"city-fallback"}}
    finally{clearTimeout(t)}
  },
  closestCity(code,lat,lon,preferred=""){
    const cities=LOCATION_DATA[code]?.cities||{};
    if(preferred){const hit=Object.keys(cities).find(n=>preferred.includes(n)||n.includes(preferred));if(hit)return hit}
    let best=Object.keys(cities)[0]||"",bd=Infinity;
    for(const [n,c] of Object.entries(cities)){const d=App.distanceKm(lat,lon,c.lat,c.lon);if(d<bd){bd=d;best=n}}
    return best
  },
  syncSelectors(){
    const s=StateCore.get(),c=document.getElementById("countrySelect"),ct=document.getElementById("citySelect"),d=document.getElementById("districtSelect");
    if(!c||!ct||!d)return;

    // 只同步畫面，不觸發 change 事件。
    // 否則 app.js 的 onchange -> applyNow() 會把 GPS 模式誤改成 manual。
    c.value=s.countryKey;

    const cities=Object.keys(LOCATION_DATA[s.countryKey]?.cities||{});
    ct.innerHTML=cities.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
    if(cities.includes(s.city))ct.value=s.city;

    const districts=LOCATION_DATA[s.countryKey]?.cities?.[ct.value]?.districts||["全市"];
    d.innerHTML=districts.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
    if(districts.includes(s.district))d.value=s.district;
  }
};
window.LocationEngine=LocationEngine;
