
let COUNTRY_SERVICES={};
let ACTIVE_COUNTRY_KEY="TW";
let LAST_LOCATION_DETAIL=null;

async function loadCountryServices(){
  try{
    const r=await fetch("./country-services.json?v=88",{cache:"no-store"});
    if(r.ok)COUNTRY_SERVICES=await r.json();
  }catch{}
}

function callButton(icon,label,number,callable=true){
  if(!number)return "";
  if(callable===false)return `<span class="emergency-call secondary">${icon} ${label} ${number}</span>`;
  return `<a class="emergency-call" href="tel:${String(number).replace(/[^\d+]/g,"")}">${icon} ${label} ${number}</a>`;
}

function renderLocalEmergency(key){
  const d=COUNTRY_SERVICES[key]; if(!d)return;
  ACTIVE_COUNTRY_KEY=key;
  const row=document.getElementById("taiwanEmergencyRow");
  if(row){
    const items=[callButton("👮","警察",d.police),callButton("🚑","救護",d.ambulance)];
    if(d.fire && d.fire!==d.ambulance)items.push(callButton("🚒","消防",d.fire));
    (d.extra||[]).forEach(x=>items.push(callButton("☎️",x.label,x.number,x.callable!==false)));
    row.hidden=false;
    row.innerHTML=items.join("");
  }
  const note=document.getElementById("emergencyCountryNote");
  if(note)note.innerHTML=`📍 ${d.country}緊急電話已同步｜<a target="_blank" rel="noopener" href="${d.emergencySourceUrl}">官方來源</a>`;
  const overview=document.getElementById("overviewContact");
  if(overview)overview.textContent=`${d.police}／${d.ambulance}`;
}

function renderMission(key){
  const d=COUNTRY_SERVICES[key];
  const card=document.getElementById("taiwanMissionCard");
  const body=document.getElementById("taiwanMissionBody");
  if(!card||!body)return;
  if(!d || !d.mission){card.hidden=true;return;}
  card.hidden=false;
  const m=d.mission;
  body.innerHTML=`
    <div class="mission-name">${esc(m.name)}</div>
    <div class="mission-actions">
      <a href="tel:${String(m.phone).replace(/[^\d+]/g,"")}">📞 ${esc(m.phone)}</a>
      <a target="_blank" rel="noopener" href="${m.officialUrl}">🏛️ 外交部官方資料</a>
    </div>
    <small>館處電話與地址可能調整，出發前請以外交部領事事務局最新資料為準。</small>`;
}

function updateHubStatus(detail){
  const d=COUNTRY_SERVICES[detail?.countryKey||ACTIVE_COUNTRY_KEY];
  const status=document.getElementById("safetyHubStatus");
  if(!status||!d)return;
  const city=detail?.city||document.getElementById("liveCity")?.textContent||"";
  const district=detail?.district||document.getElementById("liveDistrict")?.textContent||"";
  const loc=[d.country,city,district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・");
  status.textContent=`✅ ${loc}｜天氣、風險、緊急電話、附近設施與館處資訊共用同一位置。`;
}

function applyCountryServiceHub(detail){
  LAST_LOCATION_DETAIL=detail||LAST_LOCATION_DETAIL||{};
  const key=LAST_LOCATION_DETAIL.countryKey||document.getElementById("manualCountry")?.value||"TW";
  renderLocalEmergency(key);
  renderMission(key);
  updateHubStatus({...LAST_LOCATION_DETAIL,countryKey:key});
  window.dispatchEvent(new CustomEvent("safety-hub-updated",{detail:{countryKey:key,service:COUNTRY_SERVICES[key]}}));
}

window.getEmergencyContact=()=>COUNTRY_SERVICES[ACTIVE_COUNTRY_KEY]||null;
window.getCountryService=key=>COUNTRY_SERVICES[key]||null;
window.refreshSafetyHub=()=>applyCountryServiceHub(LAST_LOCATION_DETAIL);

window.addEventListener("location-context-change",e=>applyCountryServiceHub(e.detail||{}));

document.addEventListener("DOMContentLoaded",async()=>{
  await loadCountryServices();
  const sel=document.getElementById("manualCountry");
  applyCountryServiceHub({countryKey:sel?.value||"TW"});
  sel?.addEventListener("change",()=>applyCountryServiceHub({
    countryKey:sel.value,
    city:document.getElementById("manualCity")?.value||"",
    district:document.getElementById("manualDistrict")?.value||""
  }));
});
