
let COUNTRY_SERVICES={};
let ACTIVE_COUNTRY_KEY="TW";
let LAST_LOCATION_DETAIL=null;

async function ensureCountryServices(){
  const dc=await window.DataCenter.load();
  COUNTRY_SERVICES=dc?.services||{};
  return COUNTRY_SERVICES;
}

function serviceCallButton(icon,label,number,callable=true){
  if(!number)return "";
  if(callable===false){
    return `<span class="emergency-call secondary">${icon} ${label} ${number}</span>`;
  }
  const tel=String(number).replace(/[^\d+]/g,"");
  return `<a class="emergency-call" href="tel:${tel}">${icon} ${label} ${number}</a>`;
}

function renderLocalEmergency(key){
  const d=COUNTRY_SERVICES[key];
  if(!d)return;
  ACTIVE_COUNTRY_KEY=key;

  const row=document.getElementById("taiwanEmergencyRow");
  if(row){
    const items=[
      serviceCallButton("👮","警察",d.police),
      serviceCallButton("🚑","救護",d.ambulance)
    ];
    if(d.fire && d.fire!==d.ambulance){
      items.push(serviceCallButton("🚒","消防",d.fire));
    }
    (d.extra||[]).forEach(x=>{
      items.push(serviceCallButton("☎️",x.label,x.number,x.callable!==false));
    });
    row.hidden=false;
    row.innerHTML=items.join("");
  }

  const note=document.getElementById("emergencyCountryNote");
  if(note){
    note.innerHTML=`📍 ${d.country}緊急電話已同步｜<a target="_blank" rel="noopener" href="${d.emergencySourceUrl}">官方來源</a>`;
  }

  const overview=document.getElementById("overviewContact");
  if(overview)overview.textContent=`${d.police}／${d.ambulance}`;
}

function renderMission(key){
  const d=COUNTRY_SERVICES[key];
  const card=document.getElementById("taiwanMissionCard");
  const body=document.getElementById("taiwanMissionBody");
  if(!card||!body)return;

  if(!d?.mission){
    card.hidden=true;
    return;
  }

  card.hidden=false;
  const m=d.mission;
  const tel=String(m.phone||"").replace(/[^\d+]/g,"");
  body.innerHTML=`
    <div class="mission-name">${esc(m.name||"")}</div>
    <div class="mission-actions">
      <a href="tel:${tel}">📞 ${esc(m.phone||"")}</a>
      <a target="_blank" rel="noopener" href="${m.officialUrl}">🏛️ 外交部官方資料</a>
    </div>
    <small>館處電話與地址可能調整，出發前請以外交部領事事務局最新資料為準。</small>`;
}

function updateHubStatus(detail){
  const key=detail?.countryKey||ACTIVE_COUNTRY_KEY;
  const d=COUNTRY_SERVICES[key];
  const status=document.getElementById("safetyHubStatus");
  if(!status||!d)return;

  const city=detail?.city||document.getElementById("liveCity")?.textContent||"";
  const district=detail?.district||document.getElementById("liveDistrict")?.textContent||"";
  const loc=[d.country,city,district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・");
  status.textContent=`✅ ${loc}｜緊急電話、館處、天氣、風險與附近設施共用統一資料中心。`;
}

async function applyCountryServiceHub(detail){
  LAST_LOCATION_DETAIL=detail||LAST_LOCATION_DETAIL||{};
  await ensureCountryServices();
  const key=LAST_LOCATION_DETAIL.countryKey||
    document.getElementById("manualCountry")?.value||
    window.TravelContext?.get?.().countryKey||
    "TW";

  renderLocalEmergency(key);
  renderMission(key);
  updateHubStatus({...LAST_LOCATION_DETAIL,countryKey:key});

  window.dispatchEvent(new CustomEvent("safety-hub-updated",{
    detail:{countryKey:key,service:COUNTRY_SERVICES[key]}
  }));
}

window.getEmergencyContact=()=>COUNTRY_SERVICES[ACTIVE_COUNTRY_KEY]||null;
window.getCountryService=key=>COUNTRY_SERVICES[key]||null;
window.refreshSafetyHub=()=>applyCountryServiceHub(LAST_LOCATION_DETAIL);

window.addEventListener("location-context-change",e=>applyCountryServiceHub(e.detail||{}));
window.addEventListener("travel-context-updated",e=>applyCountryServiceHub(e.detail||{}));
window.addEventListener("data-center-updated",()=>applyCountryServiceHub(LAST_LOCATION_DETAIL));

document.addEventListener("DOMContentLoaded",async()=>{
  await ensureCountryServices();
  const sel=document.getElementById("manualCountry");
  await applyCountryServiceHub({
    countryKey:sel?.value||window.TravelContext?.get?.().countryKey||"TW"
  });
});
