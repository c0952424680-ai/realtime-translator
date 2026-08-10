
const FAST_NEARBY_CACHE_PREFIX="rt_v941_nearby_";
const NEARBY_STATE={lat:null,lon:null,kind:"hospital",results:{},requestId:0};
const SEARCH_RADII_KM=[15,50];

function haversineKm(lat1,lon1,lat2,lon2){
  const R=6371,toRad=x=>x*Math.PI/180;
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function cacheKey(kind,lat,lon){
  return FAST_NEARBY_CACHE_PREFIX+kind+"_"+Number(lat).toFixed(3)+"_"+Number(lon).toFixed(3);
}

function overpassQuery(kind,lat,lon,radius){
  if(kind==="police"){
    return `[out:json][timeout:25];(
      nwr["amenity"="police"](around:${radius},${lat},${lon});
      nwr["office"="government"]["government"="police"](around:${radius},${lat},${lon});
    );out center tags;`;
  }
  if(kind==="pharmacy"){
    return `[out:json][timeout:25];(
      nwr["amenity"="pharmacy"](around:${radius},${lat},${lon});
      nwr["healthcare"="pharmacy"](around:${radius},${lat},${lon});
    );out center tags;`;
  }
  return `[out:json][timeout:25];(
    nwr["amenity"="hospital"](around:${radius},${lat},${lon});
    nwr["healthcare"="hospital"](around:${radius},${lat},${lon});
    nwr["healthcare"="clinic"]["emergency"="yes"](around:${radius},${lat},${lon});
    nwr["amenity"="clinic"]["emergency"="yes"](around:${radius},${lat},${lon});
    nwr["emergency"="emergency_ward_entrance"](around:${radius},${lat},${lon});
  );out center tags;`;
}

function elementPoint(e){
  const lat=e.lat ?? e.center?.lat;
  const lon=e.lon ?? e.center?.lon;
  return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
}

function validForKind(e,kind){
  const t=e.tags||{};
  if(kind==="hospital"){
    return t.amenity==="hospital" || t.healthcare==="hospital" ||
      ((t.amenity==="clinic"||t.healthcare==="clinic") && t.emergency==="yes") ||
      t.emergency==="emergency_ward_entrance";
  }
  if(kind==="police"){
    return t.amenity==="police" || (t.office==="government" && t.government==="police");
  }
  if(kind==="pharmacy"){
    return t.amenity==="pharmacy" || t.healthcare==="pharmacy";
  }
  return false;
}

function facilityName(e,kind){
  const tags=e.tags||{};
  const n=tags["name:zh-Hant"]||tags["name:zh"]||tags["name:en"]||tags.name||"";
  if(n.trim()) return n.trim();
  return {hospital:"未命名醫院／急診",police:"未命名警察機關",pharmacy:"未命名藥局"}[kind];
}

function typeLabel(kind,e){
  if(kind==="hospital"){
    if(e.tags?.emergency==="emergency_ward_entrance") return "急診入口";
    if(e.tags?.amenity==="clinic"||e.tags?.healthcare==="clinic") return "急診診所";
    return "醫院／急診";
  }
  if(kind==="police")return "警察局";
  return "藥局";
}

function addressFromTags(tags={}){
  const parts=[
    tags["addr:housenumber"],tags["addr:street"],tags["addr:district"],
    tags["addr:city"],tags["addr:postcode"]
  ].filter(Boolean);
  return parts.join(" ");
}

function openingText(raw){
  if(!raw)return "未提供";
  if(raw==="24/7")return "24 小時";
  return raw;
}

function exactDirections(lat,lon){
  return "https://www.google.com/maps/dir/?api=1&destination="+
    encodeURIComponent(`${lat},${lon}`)+"&travelmode=driving";
}

function googleFallback(kind,lat,lon){
  const labels={hospital:"hospital emergency room",police:"police station",pharmacy:"pharmacy"};
  return "https://www.google.com/maps/search/?api=1&query="+
    encodeURIComponent(`${labels[kind]} near ${lat},${lon}`);
}

async function overpassFetch(query){
  const endpoints=[
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
  ];
  let lastError=null;
  for(const ep of endpoints){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try{
      const r=await fetch(ep,{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:"data="+encodeURIComponent(query),
        signal:controller.signal
      });
      clearTimeout(timer);
      if(!r.ok)throw new Error("HTTP "+r.status);
      return await r.json();
    }catch(e){
      clearTimeout(timer);
      lastError=e;
    }
  }
  throw lastError||new Error("nearby service failed");
}

function normalizeElements(elements,kind,lat,lon){
  const seen=new Set();
  return (elements||[])
    .filter(e=>validForKind(e,kind))
    .map(e=>{
      const p=elementPoint(e); if(!p)return null;
      const tags=e.tags||{};
      const name=facilityName(e,kind);
      const key=`${kind}|${name}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`;
      if(seen.has(key))return null;
      seen.add(key);
      return {
        name,kind,type:typeLabel(kind,e),
        lat:p.lat,lon:p.lon,
        straightDistanceKm:haversineKm(lat,lon,p.lat,p.lon),
        roadDistanceKm:null,
        driveMinutes:null,
        phone:tags.phone||tags["contact:phone"]||"",
        openingHours:tags.opening_hours||"",
        website:tags.website||tags["contact:website"]||"",
        address:addressFromTags(tags),
        operator:tags.operator||"",
        emergency:tags.emergency||""
      };
    })
    .filter(Boolean)
    .sort((a,b)=>a.straightDistanceKm-b.straightDistanceKm)
    .slice(0,5);
}

async function enrichRoadDistance(list,originLat,originLon){
  if(!list?.length)return list;
  const coords=[
    `${originLon},${originLat}`,
    ...list.map(x=>`${x.lon},${x.lat}`)
  ].join(";");
  const destinations=list.map((_,i)=>i+1).join(";");
  const url=`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${destinations}&annotations=distance,duration`;

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const r=await fetch(url,{cache:"no-store",signal:controller.signal});
    if(!r.ok)throw new Error("route");
    const d=await r.json();
    const distances=d.distances?.[0]||[];
    const durations=d.durations?.[0]||[];
    list.forEach((x,i)=>{
      if(Number.isFinite(distances[i]))x.roadDistanceKm=distances[i]/1000;
      if(Number.isFinite(durations[i]))x.driveMinutes=Math.max(1,Math.round(durations[i]/60));
    });
    list.sort((a,b)=>
      (a.roadDistanceKm??a.straightDistanceKm)-
      (b.roadDistanceKm??b.straightDistanceKm)
    );
  }catch{
    // Route service is optional. Straight-line distance remains as fallback.
  }finally{
    clearTimeout(timer);
  }
  return list;
}

async function searchNearby(kind,lat,lon){
  const requestId=++NEARBY_STATE.requestId;
  const status=document.getElementById("nearbySearchStatus");
  const results=document.getElementById("nearbyResults");
  if(results)results.innerHTML="";

  let list=[],lastRadius=15;
  for(const km of SEARCH_RADII_KM){
    lastRadius=km;
    if(status)status.textContent=km===15?"⚡ 快速搜尋附近設施…":"🔎 附近結果不足，擴大搜尋中…";
    const data=await overpassFetch(overpassQuery(kind,lat,lon,km*1000));
    if(requestId!==NEARBY_STATE.requestId)return;
    list=normalizeElements(data.elements,kind,lat,lon);
    if(list.length>=3)break;
  }
  if(requestId!==NEARBY_STATE.requestId)return;

  if(status && list.length)status.textContent="🛣️ 正在計算實際道路距離…";
  list=await enrichRoadDistance(list,lat,lon);
  if(requestId!==NEARBY_STATE.requestId)return;

  NEARBY_STATE.results[kind]=list;
  try{
    localStorage.setItem(cacheKey(kind,lat,lon),JSON.stringify({
      time:Date.now(),lat,lon,kind,list,lastRadius
    }));
  }catch{}
  renderNearby(kind,lastRadius);
}

function distanceText(x){
  if(Number.isFinite(x.roadDistanceKm)){
    return `開車約 ${x.roadDistanceKm<1?(x.roadDistanceKm*1000).toFixed(0)+" 公尺":x.roadDistanceKm.toFixed(1)+" 公里"}`+
      (x.driveMinutes?`・約 ${x.driveMinutes} 分鐘`:"");
  }
  return `直線約 ${x.straightDistanceKm<1?(x.straightDistanceKm*1000).toFixed(0)+" 公尺":x.straightDistanceKm.toFixed(1)+" 公里"}`;
}

function facilityActions(x){
  const actions=[`<a target="_blank" rel="noopener" href="${exactDirections(x.lat,x.lon)}">🧭 導航</a>`];
  if(x.phone){
    const tel=String(x.phone).replace(/[^\d+]/g,"");
    actions.push(`<a href="tel:${tel}">📞 電話</a>`);
  }
  if(x.website)actions.push(`<a target="_blank" rel="noopener" href="${esc(x.website)}">🌐 網站</a>`);
  return actions.join("");
}

function renderNearby(kind,lastRadius){
  if(kind!==NEARBY_STATE.kind)return;
  const status=document.getElementById("nearbySearchStatus");
  const box=document.getElementById("nearbyResults");
  const list=NEARBY_STATE.results[kind]||[];

  if(!list.length){
    if(status)status.textContent="附近沒有結果，請改用 Google Maps 搜尋。";
    if(box && NEARBY_STATE.lat!=null){
      box.innerHTML=`<a class="nearby-fallback" target="_blank" rel="noopener" href="${googleFallback(kind,NEARBY_STATE.lat,NEARBY_STATE.lon)}">🗺️ 改用 Google Maps 搜尋附近${kind==="hospital"?"醫院／急診":kind==="police"?"警察局":"藥局"}</a>`;
    }
    return;
  }

  if(status)status.textContent="✅ 已找到。優先依道路距離排序；無道路資料時使用直線距離。";

  box.innerHTML=list.map((x,i)=>`
    <div class="facility-row facility-detail-row">
      <div class="facility-rank">${i+1}</div>
      <div class="facility-main">
        <b>${esc(x.name)}</b>
        <span class="facility-distance">${esc(x.type)}｜${distanceText(x)}</span>
        <div class="facility-meta">
          <span>🕒 營業：${esc(openingText(x.openingHours))}</span>
          <span>📞 ${x.phone?esc(x.phone):"未提供電話"}</span>
          ${x.address?`<span>📍 ${esc(x.address)}</span>`:""}
        </div>
        <div class="facility-actions">${facilityActions(x)}</div>
      </div>
    </div>`).join("");
}

async function loadCached(kind,lat,lon){
  try{
    const c=JSON.parse(localStorage.getItem(cacheKey(kind,lat,lon))||"null");
    if(c && Date.now()-c.time<30*60*1000 && Array.isArray(c.list)){
      NEARBY_STATE.results[kind]=c.list;
      renderNearby(kind,c.lastRadius);
      const s=document.getElementById("nearbySearchStatus");
      if(s)s.textContent="⚡ 已先顯示最近一次結果，正在背景重新確認。";
      return true;
    }
  }catch{}
  return false;
}

function updateInstantMapFallbacks(lat,lon){
  const items=[
    ["mapFallbackHospital","hospital emergency room"],
    ["mapFallbackPolice","police station"],
    ["mapFallbackPharmacy","pharmacy"]
  ];
  items.forEach(([id,label])=>{
    const a=document.getElementById(id);
    if(a)a.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${label} near ${lat},${lon}`);
  });
}

async function refreshNearby(kind=NEARBY_STATE.kind){
  if(NEARBY_STATE.lat==null||NEARBY_STATE.lon==null){
    const s=document.getElementById("nearbySearchStatus");
    if(s)s.textContent="尚未取得位置，請先使用 GPS 或套用國家／城市／地區。";
    return;
  }
  NEARBY_STATE.kind=kind;
  const hadCache=await loadCached(kind,NEARBY_STATE.lat,NEARBY_STATE.lon);
  try{
    await searchNearby(kind,NEARBY_STATE.lat,NEARBY_STATE.lon);
  }catch{
    const s=document.getElementById("nearbySearchStatus");
    if(s)s.textContent=hadCache
      ?"⚠️ 背景更新失敗，暫時保留最近一次結果。"
      :"⚠️ 附近設施服務暫時沒有回應，可直接使用 Google Maps。";
    if(!hadCache){
      const box=document.getElementById("nearbyResults");
      if(box)box.innerHTML=`<a class="nearby-fallback" target="_blank" rel="noopener" href="${googleFallback(kind,NEARBY_STATE.lat,NEARBY_STATE.lon)}">🗺️ Google Maps 備援搜尋</a>`;
    }
  }
}

window.refreshNearby=refreshNearby;

window.updateNearbyPosition=(lat,lon)=>{
  const changed=NEARBY_STATE.lat==null ||
    haversineKm(NEARBY_STATE.lat,NEARBY_STATE.lon,Number(lat),Number(lon))>0.3;
  NEARBY_STATE.lat=Number(lat);
  NEARBY_STATE.lon=Number(lon);
  updateInstantMapFallbacks(NEARBY_STATE.lat,NEARBY_STATE.lon);
  if(changed){
    NEARBY_STATE.results={};
    NEARBY_STATE.requestId++;
  }
  refreshNearby(NEARBY_STATE.kind);
};

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nearby-tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".nearby-tab").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      NEARBY_STATE.kind=btn.dataset.kind;
      NEARBY_STATE.requestId++;
      refreshNearby(NEARBY_STATE.kind);
    });
  });
  document.getElementById("refreshNearby")?.addEventListener("click",()=>{
    NEARBY_STATE.requestId++;
    refreshNearby(NEARBY_STATE.kind);
  });
});
