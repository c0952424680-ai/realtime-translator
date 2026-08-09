
const LIVE_CACHE_KEY="rt_v76_location_weather";

function liveSet(id,text){
  const el=document.getElementById(id);
  if(el)el.textContent=text;
}

function saveLiveCache(data){
  try{localStorage.setItem(LIVE_CACHE_KEY,JSON.stringify({time:Date.now(),data}))}catch{}
}
function loadLiveCache(){
  try{
    const x=JSON.parse(localStorage.getItem(LIVE_CACHE_KEY)||"null");
    return x && x.data ? x : null;
  }catch{return null}
}

function weatherCodeText(code){
  const map={
    0:"晴朗",1:"大致晴朗",2:"局部多雲",3:"陰天",
    45:"有霧",48:"霧凇",
    51:"毛毛雨",53:"毛毛雨",55:"較強毛毛雨",
    61:"小雨",63:"中雨",65:"大雨",
    71:"小雪",73:"中雪",75:"大雪",
    80:"陣雨",81:"較強陣雨",82:"強陣雨",
    95:"雷雨",96:"雷雨伴冰雹",99:"強雷雨伴冰雹"
  };
  return map[code]||"天氣狀況";
}

function weatherRisk(temp,apparent,precip,wind,code){
  let level="green",title="🟢 一般天氣注意",notes=[];
  if(apparent>=38 || wind>=50 || precip>=8 || [95,96,99,82].includes(code)){
    level="orange";
    title="🟠 天氣風險提高";
  }
  if(apparent>=44 || wind>=75 || precip>=20){
    level="red";
    title="🔴 極端天氣風險";
  }

  if(apparent>=38)notes.push("體感高溫，注意熱傷害與補水");
  if(apparent<=5)notes.push("低溫，注意保暖與失溫");
  if(precip>=8)notes.push("降水較強，注意淹水、路滑與能見度");
  if(wind>=50)notes.push("強風，避免招牌、樹木與海邊危險區");
  if([95,96,99].includes(code))notes.push("雷雨，避免空曠地與高處");
  if(!notes.length)notes.push("目前未偵測到明顯極端天氣指標，仍請留意當地官方警報");

  return {level,title,notes};
}

function mapsNear(kind,lat,lon){
  const q=`${kind} near ${lat},${lon}`;
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
}

async function reverseGeocode(lat,lon){
  const url="https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=zh-TW&lat="+
    encodeURIComponent(lat)+"&lon="+encodeURIComponent(lon);
  const r=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!r.ok)throw new Error("reverse geocoding failed");
  return await r.json();
}

async function currentWeather(lat,lon){
  const url="https://api.open-meteo.com/v1/forecast?latitude="+encodeURIComponent(lat)+
    "&longitude="+encodeURIComponent(lon)+
    "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"+
    "&timezone=auto";
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok)throw new Error("weather failed");
  return await r.json();
}

function renderLive(data){
  const {lat,lon,geo,weather}=data;
  if(typeof window.updateNearbyPosition==="function")window.updateNearbyPosition(lat,lon);
  const a=geo?.address||{};
  const country=a.country||"未知";
  const city=a.city||a.town||a.village||a.municipality||a.county||"未知";
  const district=a.city_district||a.suburb||a.borough||a.quarter||a.county||"未提供";

  liveSet("liveCountry",country);
  liveSet("liveCity",city);
  liveSet("liveDistrict",district);
  liveSet("liveCoords",`${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`);
  liveSet("liveLocationStatus",`${country}・${city}・${district}`);

  const c=weather?.current||{};
  liveSet("tempNow",Number.isFinite(c.temperature_2m)?`${c.temperature_2m}°C`:"—");
  liveSet("feelsNow",Number.isFinite(c.apparent_temperature)?`${c.apparent_temperature}°C`:"—");
  liveSet("rainNow",Number.isFinite(c.precipitation)?`${c.precipitation} mm`:"—");
  liveSet("windNow",Number.isFinite(c.wind_speed_10m)?`${c.wind_speed_10m} km/h`:"—");

  const risk=weatherRisk(
    Number(c.temperature_2m||0),
    Number(c.apparent_temperature||0),
    Number(c.precipitation||0),
    Number(c.wind_speed_10m||0),
    Number(c.weather_code||0)
  );

  const badge=document.getElementById("weatherBadge");
  if(badge){
    badge.className=`weather-badge ${risk.level}`;
    badge.textContent=risk.title;
  }
  const ws=document.getElementById("weatherSummary");
  if(ws){
    ws.innerHTML=`<b>${weatherCodeText(Number(c.weather_code||0))}</b>`+
      risk.notes.map(x=>`<div>• ${esc(x)}</div>`).join("");
  }

  const links={
    nearPolice:mapsNear("police station",lat,lon),
    nearHospital:mapsNear("hospital emergency room",lat,lon),
    nearPharmacy:mapsNear("pharmacy",lat,lon),
    nearShelter:mapsNear("emergency shelter",lat,lon)
  };
  Object.entries(links).forEach(([id,href])=>{
    const el=document.getElementById(id);
    if(el)el.href=href;
  });
}

window.locateAndUpdate=async function locateAndUpdate(){
  if(!navigator.geolocation){
    liveSet("liveLocationStatus","此瀏覽器不支援定位。");
    return;
  }
  liveSet("liveLocationStatus","正在取得目前位置…");

  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    try{
      liveSet("liveLocationStatus","正在查詢城市、地區與天氣…");
      const [geo,weather]=await Promise.all([
        reverseGeocode(lat,lon),
        currentWeather(lat,lon)
      ]);
      const data={lat,lon,geo,weather};
      saveLiveCache(data);
      renderLive(data);
    }catch(e){
      liveSet("liveLocationStatus","已取得座標，但城市／天氣服務暫時沒有回應。");
      liveSet("liveCoords",`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    }
  },()=>{
    liveSet("liveLocationStatus","無法取得定位。請在 Safari 允許此網站使用位置。");
  },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}

document.addEventListener("DOMContentLoaded",()=>{
  const cached=loadLiveCache();
  if(cached && Date.now()-cached.time<60*60*1000){
    renderLive(cached.data);
    liveSet("liveLocationStatus",
      document.getElementById("liveLocationStatus").textContent+"（最近 1 小時快取）");
  }
  const btn=document.getElementById("locateMe");
  if(btn)btn.addEventListener("click",locateAndUpdate);
});
