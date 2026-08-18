
const NearbyService={
  overpassEndpoints:["https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.nchc.org.tw/api/interpreter"],
  osrmEndpoint:"https://router.project-osrm.org",
  state(){return StateCore.get()},
  typeLabel(kind){return ({hospital:"醫院／診所／急診",police:"警察局",pharmacy:"藥局",fire:"消防局"})[kind]||"緊急設施"},
  async fetchJson(url,options={},timeout=8000){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
    try{const r=await fetch(url,{...options,signal:ctl.signal,cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json()}
    finally{clearTimeout(timer)}
  },
  async freshCenter(){
    try{
      const p=await LocationEngine.getFreshPosition(5500);
      StateCore.set({lat:p.lat,lon:p.lon,accuracy:p.accuracy,gpsStatus:"ok",locationMode:"gps"},"nearby-gps");
      return p;
    }catch{
      const s=this.state();
      if(Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lon)))return {lat:Number(s.lat),lon:Number(s.lon),accuracy:s.accuracy};
      throw new Error("沒有可用位置")
    }
  },
  query(kind,radiusKm,lat,lon){
    const r=Math.round(radiusKm*1000);let filter="";
    if(kind==="hospital")filter=`nwr["amenity"="hospital"](around:${r},${lat},${lon});nwr["healthcare"="hospital"](around:${r},${lat},${lon});nwr["amenity"="clinic"](around:${r},${lat},${lon});nwr["healthcare"="clinic"](around:${r},${lat},${lon});nwr["amenity"="doctors"](around:${r},${lat},${lon});nwr["emergency"="yes"](around:${r},${lat},${lon});`;
    else if(kind==="police")filter=`nwr["amenity"="police"](around:${r},${lat},${lon});`;
    else if(kind==="fire")filter=`nwr["amenity"="fire_station"](around:${r},${lat},${lon});`;
    else filter=`nwr["amenity"="pharmacy"](around:${r},${lat},${lon});nwr["healthcare"="pharmacy"](around:${r},${lat},${lon});`;
    return `[out:json][timeout:16];(${filter});out center tags;`
  },
  async requestOverpass(kind,radiusKm,lat,lon){
    const q=this.query(kind,radiusKm,lat,lon);let last;
    for(const ep of this.overpassEndpoints){
      try{
        const data=await this.fetchJson(ep,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(q)},7500);
        if(Array.isArray(data?.elements))return data
      }catch(e){last=e}
    }
    throw last||new Error("地圖資料暫時無回應")
  },
  normalize(data,kind,center){
    const seen=new Map();
    for(const e of data?.elements||[]){
      const lat=Number(e.lat??e.center?.lat),lon=Number(e.lon??e.center?.lon),t=e.tags||{};
      if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      const name=t["name:zh-Hant"]||t["name:zh-TW"]||t["name:zh"]||t.name||t.official_name||"";
      if(!String(name).trim())continue;
      const item={name:String(name).trim(),lat,lon,straightKm:App.distanceKm(center.lat,center.lon,lat,lon),driveKm:null,driveMin:null,phone:t.phone||t["contact:phone"]||t["contact:mobile"]||"",opening:t.opening_hours||"",address:[t["addr:postcode"],t["addr:city"],t["addr:district"],t["addr:street"],t["addr:housenumber"]].filter(Boolean).join(" "),website:t.website||t["contact:website"]||"",source:"OpenStreetMap"};
      const key=`${lat.toFixed(5)}|${lon.toFixed(5)}`,old=seen.get(key),score=x=>(x.phone?2:0)+(x.address?2:0)+(x.opening?1:0)+(x.website?1:0);
      if(!old||score(item)>score(old))seen.set(key,item)
    }
    return [...seen.values()].sort((a,b)=>a.straightKm-b.straightKm)
  },
  async roadMatrix(items,center){
    const list=items.slice(0,25);if(!list.length)return list;
    const coords=[`${center.lon},${center.lat}`,...list.map(x=>`${x.lon},${x.lat}`)].join(";"),dest=list.map((_,i)=>i+1).join(";");
    try{
      const d=await this.fetchJson(`${this.osrmEndpoint}/table/v1/driving/${coords}?sources=0&destinations=${dest}&annotations=distance,duration`,{},6500),km=d?.distances?.[0]||[],sec=d?.durations?.[0]||[];
      return list.map((x,i)=>({...x,driveKm:Number.isFinite(km[i])?km[i]/1000:null,driveMin:Number.isFinite(sec[i])?sec[i]/60:null}))
    }catch{return list}
  },
  sort(items){return [...items].sort((a,b)=>(Number.isFinite(a.driveKm)?a.driveKm:a.straightKm)-(Number.isFinite(b.driveKm)?b.driveKm:b.straightKm)).slice(0,8)},
  async search(kind){
    const box=document.getElementById("nearbyResults"),status=document.getElementById("nearbyStatus");
    if(box)box.innerHTML="";if(status)status.textContent="📍 正在更新目前 GPS…";
    let center;try{center=await this.freshCenter()}catch{if(status)status.textContent="⚠️ 無法取得目前位置。";if(box)box.innerHTML=this.fallbackButtons(kind);return}
    const plans=[15,40];let list=[],used=15;
    for(const radius of plans){
      used=radius;if(status)status.textContent=`🔎 以目前位置為中心搜尋 ${radius} 公里內「${this.typeLabel(kind)}」；不受縣市邊界限制…`;
      try{const raw=await this.requestOverpass(kind,radius,center.lat,center.lon);list=this.normalize(raw,kind,center);if(list.length>=5)break}catch{}
    }
    if(!list.length){App.health("nearby","error","附近 POI 暫時無回應");if(status)status.textContent="⚠️ 地圖資料暫時無法取得，已提供地圖備援。";if(box)box.innerHTML=this.fallbackButtons(kind,center);return}
    if(status)status.textContent=`🚗 找到 ${list.length} 個候選地點，正在計算實際道路距離…`;
    const final=this.sort(await this.roadMatrix(list,center));
    App.health("nearby","ok",`${used}km 半徑跨縣市搜尋；${final.length} 筆`);
    this.render(final,kind,used,center)
  },
  fallbackButtons(kind,center=this.state()){
    const q=this.typeLabel(kind),gps=`${center.lat},${center.lon}`,google=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+gps)}`,apple=`https://maps.apple.com/?q=${encodeURIComponent(q)}&ll=${encodeURIComponent(gps)}`;
    return `<div class="grid2"><a class="btn primary" href="${google}" target="_blank" rel="noopener">Google Maps 搜尋</a><a class="btn" href="${apple}" target="_blank" rel="noopener">Apple 地圖搜尋</a></div>`
  },
  render(list,kind,used,center){
    const box=document.getElementById("nearbyResults"),status=document.getElementById("nearbyStatus"),road=list.some(x=>Number.isFinite(x.driveKm));
    if(status)status.textContent=`✅ ${road?"依實際道路距離":"依 GPS 直線距離"}由近到遠排序｜半徑 ${used} 公里｜可跨縣市／行政區`;
    box.innerHTML=list.map((x,i)=>{
      const straight=x.straightKm<1?`${Math.round(x.straightKm*1000)} 公尺`:`${x.straightKm.toFixed(1)} 公里`,drive=Number.isFinite(x.driveKm)?`${x.driveKm.toFixed(1)} 公里`:null,mins=Number.isFinite(x.driveMin)?`${Math.max(1,Math.round(x.driveMin))} 分鐘`:null,origin=`${center.lat},${center.lon}`,dest=`${x.lat},${x.lon}`,google=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`,apple=`https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(dest)}&dirflg=d`,info=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.name+" "+dest)}`,tel=x.phone?x.phone.replace(/[^\d+]/g,""):"";
      return `<article class="near-card"><div class="near-rank">${i+1}</div><div class="near-main"><h3>${esc(x.name)}</h3><div class="meta">${drive?`🚗 道路距離 ${drive}${mins?`・約 ${mins}`:""}`:`📍 GPS 距離 ${straight}`}</div>${drive?`<div class="muted">GPS 直線距離：${straight}</div>`:""}<div class="near-info">📍 ${x.address?esc(x.address):"地址未收錄，可點「完整資訊」查看地圖資料"}</div><div class="near-info">${x.phone?`📞 ${esc(x.phone)}`:"📞 電話未收錄"} ｜ ${x.opening?`🕒 ${esc(x.opening)}`:"🕒 營業資訊未收錄"}</div><div class="near-actions"><a class="btn primary" href="${google}" target="_blank" rel="noopener">Google 導航</a><a class="btn" href="${apple}" target="_blank" rel="noopener">Apple 導航</a><a class="btn" href="${info}" target="_blank" rel="noopener">完整資訊</a>${tel?`<a class="btn" href="tel:${tel}">📞 致電</a>`:""}</div></div></article>`
    }).join("")
  }
};
window.NearbyService=NearbyService;
