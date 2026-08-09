
const FAST_NEARBY_CACHE_PREFIX="rt_v85_nearby_";
const NEARBY_STATE={lat:null,lon:null,kind:"hospital",results:{},requestId:0};
const SEARCH_RADII_KM=[10,15,20,25,30,35,40,45,50];

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
  let lastErr;
  for(const ep of endpoints){
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),18000);
      const r=await fetch(ep,{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:"data="+encodeURIComponent(query),
        signal:controller.signal
      });
      clearTimeout(timer);
      if(!r.ok)throw new Error("HTTP "+r.status);
      return await r.json();
    }catch(e){lastErr=e}
  }
  throw lastErr||new Error("nearby service failed");
}

function normalizeElements(elements,kind,lat,lon){
  const seen=new Set();
  return (elements||[])
    .filter(e=>validForKind(e,kind))
    .map(e=>{
      const p=elementPoint(e); if(!p)return null;
      const name=facilityName(e,kind);
      const key=`${kind}|${name}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`;
      if(seen.has(key))return null;
      seen.add(key);
      return {
        name,kind,type:typeLabel(kind,e),
        lat:p.lat,lon:p.lon,
        distance:haversineKm(lat,lon,p.lat,p.lon),
        phone:e.tags?.phone||e.tags?.["contact:phone"]||"",
        website:e.tags?.website||e.tags?.["contact:website"]||""
      };
    })
    .filter(Boolean)
    .sort((a,b)=>a.distance-b.distance)
    .slice(0,5);
}

async function searchNearby(kind,lat,lon){
  const requestId=++NEARBY_STATE.requestId;
  const status=document.getElementById("nearbySearchStatus");
  const results=document.getElementById("nearbyResults");
  if(results)results.innerHTML="";

  let list=[],lastRadius=10;
  for(const km of SEARCH_RADII_KM){
    lastRadius=km;
    if(status)status.textContent="正在搜尋附近設施…";
    const data=await overpassFetch(overpassQuery(kind,lat,lon,km*1000));
    if(requestId!==NEARBY_STATE.requestId)return;
    list=normalizeElements(data.elements,kind,lat,lon);
    if(list.length>=3)break;
  }

  if(requestId!==NEARBY_STATE.requestId)return;
  NEARBY_STATE.results[kind]=list;

  try{
    localStorage.setItem(cacheKey(kind,lat,lon),JSON.stringify({
      time:Date.now(),lat,lon,kind,list,lastRadius
    }));
  }catch{}
  renderNearby(kind,lastRadius);
}

function renderNearby(kind,lastRadius){
  if(kind!==NEARBY_STATE.kind)return;
  const status=document.getElementById("nearbySearchStatus");
  const box=document.getElementById("nearbyResults");
  const list=NEARBY_STATE.results[kind]||[];

  if(!list.length){
    if(status)status.textContent="附近沒有結果，請改用 Google Maps 搜尋。";
    if(box && NEARBY_STATE.lat!=null){
      box.innerHTML=`<a class="nearby-fallback" target="_blank" href="${googleFallback(kind,NEARBY_STATE.lat,NEARBY_STATE.lon)}">🗺️ 改用 Google Maps 搜尋附近${kind==="hospital"?"醫院／急診":kind==="police"?"警察局":"藥局"}</a>`;
    }
    return;
  }

  if(status)status.textContent="✅ 已找到，依距離由近到遠排列。";

  box.innerHTML=list.map((x,i)=>`
    <div class="facility-row">
      <div class="facility-rank">${i+1}</div>
      <div class="facility-main">
        <b>${esc(x.name)}</b>
        <span>${esc(x.type)}｜${x.distance<1?(x.distance*1000).toFixed(0)+" 公尺":x.distance.toFixed(1)+" 公里"}${x.phone?"｜"+esc(x.phone):""}</span>
      </div>
      <a target="_blank" href="${exactDirections(x.lat,x.lon)}">導航</a>
    </div>`).join("");
}

async function loadCached(kind,lat,lon){
  try{
    const c=JSON.parse(localStorage.getItem(cacheKey(kind,lat,lon))||"null");
    if(c && Date.now()-c.time<15*60*1000 && Array.isArray(c.list)){
      NEARBY_STATE.results[kind]=c.list;
      renderNearby(kind,c.lastRadius);
      const s=document.getElementById("nearbySearchStatus");
      if(s)s.textContent="⚡ 已先顯示此位置同分類快取，正在背景重新搜尋。";
      return true;
    }
  }catch{}
  return false;
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
      ?"⚠️ 背景更新失敗，暫時保留最近一次快取。"
      :"⚠️ 全球設施服務暫時沒有回應，可改用 Google Maps 同座標搜尋。";
    if(!hadCache){
      const box=document.getElementById("nearbyResults");
      if(box)box.innerHTML=`<a class="nearby-fallback" target="_blank" href="${googleFallback(kind,NEARBY_STATE.lat,NEARBY_STATE.lon)}">🗺️ Google Maps 備援搜尋</a>`;
    }
  }
}

window.refreshNearby=refreshNearby;

window.updateNearbyPosition=(lat,lon)=>{
  const changed=NEARBY_STATE.lat==null ||
    haversineKm(NEARBY_STATE.lat,NEARBY_STATE.lon,Number(lat),Number(lon))>0.3;
  NEARBY_STATE.lat=Number(lat);
  NEARBY_STATE.lon=Number(lon);
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
