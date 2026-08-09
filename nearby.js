
const NEARBY_STATE={lat:null,lon:null,kind:"hospital",results:{}};

function haversineKm(lat1,lon1,lat2,lon2){
  const R=6371,toRad=x=>x*Math.PI/180;
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function overpassQuery(kind,lat,lon,radius){
  if(kind==="police"){
    return `[out:json][timeout:20];(node["amenity"="police"](around:${radius},${lat},${lon});way["amenity"="police"](around:${radius},${lat},${lon});relation["amenity"="police"](around:${radius},${lat},${lon}););out center tags;`;
  }
  if(kind==="pharmacy"){
    return `[out:json][timeout:20];(node["amenity"="pharmacy"](around:${radius},${lat},${lon});way["amenity"="pharmacy"](around:${radius},${lat},${lon}););out center tags;`;
  }
  return `[out:json][timeout:20];(
    node["amenity"="hospital"](around:${radius},${lat},${lon});
    way["amenity"="hospital"](around:${radius},${lat},${lon});
    relation["amenity"="hospital"](around:${radius},${lat},${lon});
    node["emergency"="yes"](around:${radius},${lat},${lon});
    way["emergency"="yes"](around:${radius},${lat},${lon});
  );out center tags;`;
}

function elementPoint(e){
  const lat=e.lat ?? e.center?.lat;
  const lon=e.lon ?? e.center?.lon;
  return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
}

function facilityName(e,kind){
  const tags=e.tags||{};
  return tags["name:zh"]||tags["name:zh-Hant"]||tags.name||
    ({hospital:"醫療院所",police:"警察機關",pharmacy:"藥局"}[kind]);
}

function exactDirections(lat,lon,name){
  return "https://www.google.com/maps/dir/?api=1&destination="+
    encodeURIComponent(`${lat},${lon}`)+
    "&destination_place_name="+encodeURIComponent(name||"目的地")+
    "&travelmode=driving";
}

async function overpassFetch(query){
  const endpoints=[
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
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

async function searchNearby(kind,lat,lon){
  const status=document.getElementById("nearbySearchStatus");
  const results=document.getElementById("nearbyResults");
  if(status)status.textContent="正在搜尋 8 公里內最近設施…";
  if(results)results.innerHTML="";

  let data=await overpassFetch(overpassQuery(kind,lat,lon,8000));
  let elements=data.elements||[];
  if(elements.length<3){
    if(status)status.textContent="附近結果較少，擴大到 25 公里搜尋…";
    data=await overpassFetch(overpassQuery(kind,lat,lon,25000));
    elements=data.elements||[];
  }

  const seen=new Set();
  const list=elements.map(e=>{
    const p=elementPoint(e);if(!p)return null;
    const name=facilityName(e,kind);
    const key=`${name}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}`;
    if(seen.has(key))return null;seen.add(key);
    return {
      name,lat:p.lat,lon:p.lon,
      distance:haversineKm(lat,lon,p.lat,p.lon),
      phone:e.tags?.phone||e.tags?.["contact:phone"]||"",
      emergency:e.tags?.emergency||""
    };
  }).filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,5);

  NEARBY_STATE.results[kind]=list;
  renderNearby(kind);
}

function renderNearby(kind){
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
  if(status)status.textContent=`已依距離排序，顯示最近 ${list.length} 個結果。`;
  box.innerHTML=list.map((x,i)=>`
    <div class="facility-row">
      <div class="facility-rank">${i+1}</div>
      <div class="facility-main">
        <b>${esc(x.name)}</b>
        <span>${x.distance<1?(x.distance*1000).toFixed(0)+" 公尺":x.distance.toFixed(1)+" 公里"}${x.phone?"｜"+esc(x.phone):""}</span>
      </div>
      <a target="_blank" href="${exactDirections(x.lat,x.lon,x.name)}">導航</a>
    </div>`).join("");
}

async function refreshNearby(kind=NEARBY_STATE.kind){
  if(NEARBY_STATE.lat==null||NEARBY_STATE.lon==null){
    document.getElementById("nearbySearchStatus").textContent="尚未取得 GPS 位置，請先按「取得目前位置」。";
    return;
  }
  NEARBY_STATE.kind=kind;
  try{
    await searchNearby(kind,NEARBY_STATE.lat,NEARBY_STATE.lon);
  }catch{
    document.getElementById("nearbySearchStatus").textContent="附近設施服務暫時沒有回應，請稍後重試或使用 Google Maps。";
    renderNearby(kind);
  }
}

window.updateNearbyPosition=(lat,lon)=>{
  NEARBY_STATE.lat=Number(lat);NEARBY_STATE.lon=Number(lon);
  NEARBY_STATE.results={};
  refreshNearby(NEARBY_STATE.kind);
};

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nearby-tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".nearby-tab").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      NEARBY_STATE.kind=btn.dataset.kind;
      if(NEARBY_STATE.results[NEARBY_STATE.kind])renderNearby(NEARBY_STATE.kind);
      else refreshNearby(NEARBY_STATE.kind);
    });
  });
  document.getElementById("refreshNearby")?.addEventListener("click",()=>refreshNearby());
});
