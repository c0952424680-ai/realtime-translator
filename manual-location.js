
let LOCATION_MASTER={},DISTRICT_MASTER={},CITY_COORDS={};
let LOCATION_MODE="manual";

async function fetchJson(url){
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok)throw new Error(url);
  return await r.json();
}

async function loadLocationMasters(){
  [LOCATION_MASTER,DISTRICT_MASTER,CITY_COORDS]=await Promise.all([
    fetchJson("./locations.json?v=86"),
    fetchJson("./location-districts.json?v=86"),
    fetchJson("./city-coordinates.json?v=86")
  ]);

  const c=document.getElementById("manualCountry");
  c.innerHTML=Object.entries(LOCATION_MASTER)
    .map(([k,v])=>`<option value="${k}">${v.name}</option>`).join("");

  // Default Taiwan instead of Japan.
  c.value="TW";
  renderCities();
  updateLocationMode("manual");
}

function updateLocationMode(mode){
  LOCATION_MODE=mode;
  const badge=document.getElementById("locationModeBadge");
  if(badge){
    badge.textContent=mode==="gps"?"GPS 模式":"手動模式";
    badge.className="location-mode-badge "+mode;
  }
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

function normalizeCountryName(s){return (s||"").replace(/^.. /,"").trim();}
function countryKeyByName(name){
  const n=(name||"").toLowerCase();
  for(const [key,data] of Object.entries(LOCATION_MASTER)){
    const names=[data.name,...(data.country_match||[])].map(x=>String(x).replace(/^.. /,"").toLowerCase());
    if(names.some(x=>n.includes(x)||x.includes(n)))return key;
  }
  return null;
}

function bestOptionMatch(select,text){
  const t=(text||"").replace("台","臺");
  const opts=[...select.options];
  return opts.find(o=>{
    const v=o.value.replace("台","臺");
    return t.includes(v)||v.includes(t);
  })||null;
}

async function geocodePlace(countryName,city,district){
  const detail=(district && !["全市","全島"].includes(district))?district:"";
  const q=[detail,city,normalizeCountryName(countryName)].filter(Boolean).join(", ");
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-TW&q="+encodeURIComponent(q);
  const r=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!r.ok)throw new Error("geocode failed");
  const data=await r.json();
  if(!data?.length)throw new Error("no geocode result");
  return [Number(data[0].lat),Number(data[0].lon)];
}

async function resolveCoords(country,city,district){
  if(district && !["全市","全島"].includes(district)){
    try{return await geocodePlace(country.name,city,district)}catch{}
  }
  if(CITY_COORDS[city])return CITY_COORDS[city];
  try{return await geocodePlace(country.name,city,"")}catch{}
  return null;
}

async function applyResolvedLocation(countryKey,city,district,coords,source){
  const country=LOCATION_MASTER[countryKey];
  const countryText=normalizeCountryName(country.name);
  const shownDistrict=(district && !["全市","全島"].includes(district))?district:city;

  document.getElementById("liveCountry").textContent=countryText;
  document.getElementById("liveCity").textContent=city;
  document.getElementById("liveDistrict").textContent=shownDistrict;
  document.getElementById("liveLocationStatus").textContent=
    `${source==="gps"?"GPS 定位":"手動選擇"}：${country.name}・${city}${shownDistrict!==city?"・"+shownDistrict:""}`;

  if(coords){
    try{
      const weather=typeof window.currentWeather==="function"
        ? await window.currentWeather(coords[0],coords[1]) : null;
      const geo={address:{country:countryText,city,city_district:shownDistrict}};
      if(typeof window.renderLive==="function"){
        window.renderLive({lat:coords[0],lon:coords[1],geo,weather});
      }
      if(typeof window.updateNearbyPosition==="function"){
        window.updateNearbyPosition(coords[0],coords[1]);
      }
    }catch{}
  }

  window.dispatchEvent(new CustomEvent("location-context-change",{
    detail:{countryKey,country,city,district:shownDistrict,coords,source}
  }));
}

async function applyManualSelection(){
  updateLocationMode("manual");
  const k=document.getElementById("manualCountry").value;
  const city=document.getElementById("manualCity").value;
  const district=document.getElementById("manualDistrict").value;
  const status=document.getElementById("manualLocationStatus");
  status.textContent="正在同步城市、地區、天氣、風險與附近設施…";
  const coords=await resolveCoords(LOCATION_MASTER[k],city,district);
  await applyResolvedLocation(k,city,district,coords,"manual");
  status.textContent=`✅ 已同步：${LOCATION_MASTER[k].name}・${city}・${district}`;
}

window.syncSelectorsFromGps=async function(geo,lat,lon){
  if(!geo?.address)return;
  updateLocationMode("gps");

  const a=geo.address;
  const countryName=a.country||"";
  const cityName=a.city||a.town||a.village||a.municipality||a.county||"";
  const districtName=a.city_district||a.suburb||a.borough||a.quarter||a.county||cityName;

  const key=countryKeyByName(countryName);
  if(!key)return;

  const c=document.getElementById("manualCountry");
  c.value=key;
  renderCities();

  const citySel=document.getElementById("manualCity");
  const cityOpt=bestOptionMatch(citySel,cityName);
  if(cityOpt)citySel.value=cityOpt.value;
  renderDistricts();

  const distSel=document.getElementById("manualDistrict");
  const distOpt=bestOptionMatch(distSel,districtName);
  if(distOpt)distSel.value=distOpt.value;

  await applyResolvedLocation(
    key,
    citySel.value||cityName,
    distSel.value||districtName,
    [lat,lon],
    "gps"
  );

  const status=document.getElementById("manualLocationStatus");
  status.textContent=`✅ GPS 已同步選單：${LOCATION_MASTER[key].name}・${citySel.value}・${distSel.value}`;
};

document.addEventListener("DOMContentLoaded",async()=>{
  await loadLocationMasters();

  document.getElementById("manualCountry").onchange=renderCities;
  document.getElementById("manualCity").onchange=renderDistricts;
  document.getElementById("applyManualLocation").onclick=applyManualSelection;

  document.getElementById("useGpsLocation").onclick=()=>{
    updateLocationMode("gps");
    document.getElementById("locateMe")?.click();
  };

  // Start with Taiwan visible in the unified selector.
  const k="TW";
  const city=document.getElementById("manualCity").value;
  const district=document.getElementById("manualDistrict").value;
  window.dispatchEvent(new CustomEvent("location-context-change",{
    detail:{countryKey:k,country:LOCATION_MASTER[k],city,district,coords:null,source:"manual"}
  }));
});
