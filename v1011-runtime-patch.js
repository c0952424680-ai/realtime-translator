(()=>{
 const VERSION="V10.11", BUILD="V10.11-AUTO-DATA-20260821-01";
 function patchApp(){
  if(!window.App)return;
  App.brand=()=>{document.querySelectorAll("[data-version]").forEach(e=>e.textContent=VERSION);document.querySelectorAll("[data-build]").forEach(e=>e.textContent=BUILD)};
  App.registerSW=()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=113").catch(()=>{})};
  const original=App.renderPhrase?.bind(App);
  if(original)App.renderPhrase=function(){original();const s=StateCore.get(),p=window.COUNTRY_LANGUAGE_PROFILE?.[s.countryKey];if(!p){const lang=document.getElementById("phraseLangLabel");if(lang)lang.textContent="英文備援（當地語言尚未人工驗證）"}};
 }
 function patchNearby(){
  if(!window.NearbyService)return;
  NearbyService.resolveCenter=async function(){
   const s=StateCore.get();
   if(s.nearbyMode==="gps"){
    const age=s.gpsUpdatedAt?Date.now()-Date.parse(s.gpsUpdatedAt):Infinity;
    if(!(Number.isFinite(Number(s.gpsLat))&&Number.isFinite(Number(s.gpsLon))&&age<300000)){const p=await LocationEngine.getFreshPosition(6500);StateCore.setGps(p)}
    const n=StateCore.get();return {lat:Number(n.gpsLat),lon:Number(n.gpsLon),accuracy:n.gpsAccuracy,mode:"gps",label:"手機實際 GPS"};
   }
   return {lat:Number(s.lat),lon:Number(s.lon),accuracy:null,mode:"manual",label:`${s.country}・${s.city}・${s.district}`};
  };
 }
 function addChoice(){
  const status=document.getElementById("nearbyStatus");if(!status||document.getElementById("nearbyModeControls"))return;
  const wrap=document.createElement("div");wrap.id="nearbyModeControls";wrap.className="grid2";wrap.style.marginTop="10px";
  const manual=document.createElement("button"),gps=document.createElement("button");manual.textContent="🗺️ 依選擇城市";gps.textContent="📍 依手機 GPS";
  const paint=()=>{const m=StateCore.get().nearbyMode||"manual";manual.classList.toggle("primary",m==="manual");gps.classList.toggle("primary",m==="gps")};
  manual.addEventListener("click",()=>{StateCore.set({nearbyMode:"manual"},"nearby-mode");paint()});
  gps.addEventListener("click",async()=>{StateCore.set({nearbyMode:"gps"},"nearby-mode");paint();try{await LocationEngine.locate()}catch{}});
  wrap.append(manual,gps);status.parentNode.insertBefore(wrap,status);paint();
 }
 patchApp();patchNearby();document.addEventListener("DOMContentLoaded",()=>{patchApp();patchNearby();addChoice()});
})();