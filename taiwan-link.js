
let TAIWAN_REGIONS=null;

function isTaiwanCountry(name){
  const n=(name||"").trim();
  return ["台灣","臺灣","Taiwan","Taiwan (R.O.C.)","Republic of China"].some(x=>n.includes(x));
}
function normalizeTwRegion(s){
  return (s||"").replace("台","臺");
}

async function loadTaiwanRegions(){
  try{
    const r=await fetch("./taiwan-regions.json?v=941",{cache:"no-store"});
    if(r.ok)TAIWAN_REGIONS=await r.json();
  }catch{}
}

window.renderTaiwanLink=function renderTaiwanLink(){
  const country=document.getElementById("liveCountry")?.textContent||"";
  const card=document.getElementById("taiwanRegionCard");
  const emergency=document.getElementById("taiwanEmergencyRow");
  if(!card)return;

  const on=isTaiwanCountry(country);
  card.hidden=!on;
  // Global emergency row is controlled by emergency-link.js.
  if(!on)return;

  const geoDistrict=normalizeTwRegion(document.getElementById("liveDistrict")?.textContent||"");
  const geoCity=normalizeTwRegion(document.getElementById("liveCity")?.textContent||"");
  let region=null;

  for(const key of Object.keys(TAIWAN_REGIONS||{})){
    if(geoCity.includes(key)||geoDistrict.includes(key)||key.includes(geoCity)||key.includes(geoDistrict)){
      region=key;break;
    }
  }

  const d=region?TAIWAN_REGIONS[region]:null;
  const name=document.getElementById("taiwanRegionName");
  if(name){
    name.innerHTML=d
      ? `<h3>📍 ${esc(region)}</h3><p>${esc(d.note)}</p><b>${esc(d.emergency)}</b>`
      : `<h3>📍 台灣</h3><p>已確認位於台灣；縣市辨識仍以定位回傳地址為準。</p><b>110 警察／119 消防救護／165 反詐騙</b>`;
  }

  // Taiwan linked detail source labels
  const cs=document.getElementById("crimeSource");
  const ss=document.getElementById("scamSource");
  const ds=document.getElementById("diseaseSource");
  if(cs)cs.innerHTML='來源：<a target="_blank" href="https://www.npa.gov.tw/">內政部警政署</a>';
  if(ss)ss.innerHTML='來源：<a target="_blank" href="https://165.npa.gov.tw/">165 全民防騙網／打詐儀錶板</a>';
  if(ds)ds.innerHTML='來源：<a target="_blank" href="https://www.cdc.gov.tw/">衛生福利部疾病管制署</a>';
}

document.addEventListener("DOMContentLoaded",async()=>{
  await loadTaiwanRegions();
  renderTaiwanLink();
  const obs=new MutationObserver(renderTaiwanLink);
  ["liveCountry","liveCity","liveDistrict"].forEach(id=>{
    const e=document.getElementById(id);if(e)obs.observe(e,{childList:true,subtree:true});
  });
});

window.addEventListener("location-context-change",()=>window.renderTaiwanLink?.());
