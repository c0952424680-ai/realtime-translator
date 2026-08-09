
const FAST_NEARBY_CACHE_PREFIX="rt_v82_nearby_";
const NEARBY_STATE={lat:null,lon:null,kind:"hospital",results:{},requestId:0};

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
    return `[out:json][timeout:18];(
      node["amenity"="police"](around:${radius},${lat},${lon});
      way["amenity"="police"](around:${radius},${lat},${lon});
      relation["amenity"="police"](around:${radius},${lat},${lon});
    );out center tags;`;
  }
  if(kind==="pharmacy"){
    return `[out:json][timeout:18];(
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      way["amenity"="pharmacy"](around:${radius},${lat},${lon});
      relation["amenity"="pharmacy"](around:${radius},${lat},${lon});
    );out center tags;`;
  }
  return `[out:json][timeout:18];(
    node["amenity"="hospital"](around:${radius},${lat},${lon});
    way["amenity"="hospital"](around:${radius},${lat},${lon});
    relation["amenity"="hospital"](around:${radius},${lat},${lon});
    node["amenity"="clinic"]["emergency"="yes"](around:${radius},${lat},${lon});
    way["amenity"="clinic"]["emergency"="yes"](around:${radius},${lat},${lon});
  );out center tags;`;
}

function elementPoint(e){
  const lat=e.lat ?? e.center?.lat;
  const lon=e.lon ?? e.center?.lon;
  return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
}

function validForKind(e,kind){
  const a=e.tags?.amenity;
  if(kind==="hospital") return a==="hospital" || (a==="clinic" && e.tags?.emergency==="yes");
  if(kind==="police") return a==="police";
  if(kind==="pharmacy") return a==="pharmacy";
  return false;
}

function facilityName(e,kind){
  const tags=e.tags||{};
  const n=tags["name:zh-Hant"]||tags["name:zh"]||tags.name||"";
  if(n.trim()) return n.trim();
  return {hospital:"未命名醫院／急診",police:"未命名警察機關",pharmacy:"未命名藥局"}[kind];
}

function typeLabel(kind,e){
  if(kind==="hospital") return e.tags?.amenity==="clinic"?"急診診所":"醫院／急診";
  if(kind==="police") return "警察局";
  return "藥局";
}

function exactDirections(lat,lon){
  return "https://www.google.com/maps/dir/?api=1&destination="+
    encodeURIComponent(`${lat},${lon}`)+"&travelmode=driving";
}

async function overpassFetch(query){
  const endpoints=[
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];
  let lastErr;
  for(const ep of endpoints){
    try{
      const r=await fetch(ep,{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:"data="+encodeURIComponent(query)
      });
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
      const p=elementPoint(e);
      if(!p)return null;
      const name=facilityName(e,kind);
      const key=`${kind}|${name}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`;
      if(seen.has(key))return null;
      seen.add(key);
      return {
        name,
        kind,
        type:typeLabel(kind,e),
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
  if(status)status.textContent="正在搜尋 3 公里內最近設施…";
  if(results)results.innerHTML="";

  let list=[];
  for(const radius of [3000,8000,15000]){
    const data=await overpassFetch(overpassQuery(kind,lat,lon,radius));
    if(requestId!==NEARBY_STATE.requestId) return; // 舊請求直接作廢
    list=normalizeElements(data.elements,kind,lat,lon);
    if(list.length>=3)break;
    if(status)status.textContent=`附近結果較少，擴大搜尋範圍至 ${radius===3000?8:15} 公里…`;
  }

  if(requestId!==NEARBY_STATE.requestId)return;

  NEARBY_STATE.results[kind]=list;
  try{
    localStorage.setItem(cacheKey(kind,lat,lon),JSON.stringify({
      time:Date.now(),lat,lon,kind,list
    }));
  }catch{}
  renderNearby(kind);
}

function renderNearby(kind){
  if(kind!==NEARBY_STATE.kind)return; // 不允許其他分類覆蓋目前畫面
  const status=document.getElementById("nearbySearchStatus");
  const box=document.getElementById("nearbyResults");
  const list=NEARBY_STATE.results[kind]||[];

  if(!list.length){
    if(status)status.textContent="目前找不到附近設施資料，可改用 Google Maps 手動搜尋。";
    if(box && NEARBY_STATE.lat!=null){
      const label={hospital:"醫院 急診",police:"警察局",pharmacy:"藥局"}[kind];
      box.innerHTML=`<a class="nearby-fallback" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label+" near "+NEARBY_STATE.lat+","+NEARBY_STATE.lon)}">改用 Google Maps 搜尋</a>`;
    }
    return;
  }

  if(status)status.textContent=`✅ 已依目前 GPS／選擇地區距離排序，顯示最近 ${list.length} 個「${list[0].type}」結果。`;

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
    if(c && Date.now()-c.time<20*60*1000 && Array.isArray(c.list)){
      NEARBY_STATE.results[kind]=c.list;
      renderNearby(kind);
      const s=document.getElementById("nearbySearchStatus");
      if(s)s.textContent="⚡ 已先顯示此地區同分類的最近結果快取，正在背景更新。";
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
    if(s && !hadCache)s.textContent="附近設施服務暫時沒有回應，請稍後重試或使用 Google Maps。";
  }
}

window.updateNearbyPosition=(lat,lon)=>{
  const changed=NEARBY_STATE.lat==null ||
    haversineKm(NEARBY_STATE.lat,NEARBY_STATE.lon,Number(lat),Number(lon))>0.3;
  NEARBY_STATE.lat=Number(lat);
  NEARBY_STATE.lon=Number(lon);
  if(changed){
    NEARBY_STATE.results={};
    NEARBY_STATE.requestId++; // 取消舊位置的進行中請求
  }
  refreshNearby(NEARBY_STATE.kind);
};

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nearby-tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".nearby-tab").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      NEARBY_STATE.kind=btn.dataset.kind;
      NEARBY_STATE.requestId++; // 取消上一分類請求，避免錯亂
      refreshNearby(NEARBY_STATE.kind);
    });
  });
  document.getElementById("refreshNearby")?.addEventListener("click",()=>{
    NEARBY_STATE.requestId++;
    refreshNearby(NEARBY_STATE.kind);
  });
});
