
let LOCATION_MASTER={},DISTRICT_MASTER={},CITY_COORDS={};

async function fetchJson(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok)throw new Error(url);
  return await r.json();
}

async function loadLocationMasters(){
  [LOCATION_MASTER,DISTRICT_MASTER,CITY_COORDS]=await Promise.all([
    fetchJson("./locations.json?v=80"),
    fetchJson("./location-districts.json?v=80"),
    fetchJson("./city-coordinates.json?v=80")
  ]);

  const country=document.getElementById("manualCountry");
  country.innerHTML=Object.entries(LOCATION_MASTER)
    .map(([k,v])=>`<option value="${k}">${v.name}</option>`).join("");
  country.value="TW";
  renderCities();
}

function renderCities(){
  const k=document.getElementById("manualCountry").value;
  const city=document.getElementById("manualCity");
  city.innerHTML=(LOCATION_MASTER[k]?.cities||[])
    .map(x=>`<option value="${x}">${x}</option>`).join("");
  renderDistricts();
}

function renderDistricts(){
  const k=document.getElementById("manualCountry").value;
  const city=document.getElementById("manualCity").value;
  const district=document.getElementById("manualDistrict");
  let arr=DISTRICT_MASTER[k]?.[city]||["全市"];
  if(!arr.length)arr=["全市"];
  district.innerHTML=arr.map(x=>`<option value="${x}">${x}</option>`).join("");
}

async function geocodePlace(countryName,city,district){
  const detail=(district && !["全市","全島"].includes(district))?district:"";
  const q=[detail,city,countryName.replace(/^.. /,"")].filter(Boolean).join(", ");
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q="+encodeURIComponent(q);
  const r=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!r.ok)throw new Error("geocode failed");
  const data=await r.json();
  if(!data?.length)throw new Error("no geocode result");
  return [Number(data[0].lat),Number(data[0].lon)];
}

async function resolveCoords(country,city,district){
  // Prefer exact online geocoding for district; fall back to known city coordinates.
  if(district && !["全市","全島"].includes(district)){
    try{return await geocodePlace(country.name,city,district)}catch{}
  }
  if(CITY_COORDS[city])return CITY_COORDS[city];
  try{return await geocodePlace(country.name,city,"")}catch{}
  return null;
}

async function dispatchManualLocation(country,city,district){
  const countryText=country.name.replace(/^.. /,"");
  const shownDistrict=(district&& !["全市","全島"].includes(district))?district:city;

  document.getElementById("liveCountry").textContent=countryText;
  document.getElementById("liveCity").textContent=city;
  document.getElementById("liveDistrict").textContent=shownDistrict;
  document.getElementById("liveLocationStatus").textContent=
    `手動選擇：${country.name}・${city}${shownDistrict!==city?"・"+shownDistrict:""}`;

  const status=document.getElementById("manualLocationStatus");
  if(status)status.textContent="正在取得該地區座標、天氣與附近設施…";

  const coords=await resolveCoords(country,city,district);
  if(coords){
    try{
      const weather=typeof window.currentWeather==="function"
        ? await window.currentWeather(coords[0],coords[1])
        : null;
      const geo={address:{
        country:countryText,
        city,
        city_district:shownDistrict
      }};
      const payload={lat:coords[0],lon:coords[1],geo,weather};
      if(typeof window.renderLive==="function")window.renderLive(payload);
      if(typeof window.updateNearbyPosition==="function")window.updateNearbyPosition(coords[0],coords[1]);
      if(status)status.textContent=`✅ 已串聯：${countryText}・${city}・${shownDistrict}`;
    }catch{
      if(status)status.textContent="已取得地區座標，但部分即時服務暫時沒有回應。";
    }
  }else{
    if(status)status.textContent="找不到此地區座標，風險資訊仍會依國家／城市顯示。";
  }

  window.dispatchEvent(new CustomEvent("manual-location-change",{
    detail:{country,city,district,coords}
  }));
}

document.addEventListener("DOMContentLoaded",async()=>{
  await loadLocationMasters();
  document.getElementById("manualCountry").onchange=renderCities;
  document.getElementById("manualCity").onchange=renderDistricts;

  document.getElementById("applyManualLocation").onclick=async()=>{
    const k=document.getElementById("manualCountry").value;
    const city=document.getElementById("manualCity").value;
    const district=document.getElementById("manualDistrict").value;
    await dispatchManualLocation(LOCATION_MASTER[k],city,district);
  };
  document.getElementById("useGpsLocation").onclick=()=>document.getElementById("locateMe")?.click();
});
