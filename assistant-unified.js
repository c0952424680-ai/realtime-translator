
function qs(id){return document.getElementById(id)}
function setTxt(id,text){const e=qs(id);if(e)e.textContent=text}

function assistantRiskLevel(){
  const ids=["crimeLight","weatherLight","scamLight","diseaseLight","highRiskLight"];
  const els=ids.map(qs).filter(Boolean);
  if(els.some(x=>x.classList.contains("red")))return ["🔴 高風險","red"];
  if(els.some(x=>x.classList.contains("orange")))return ["🟠 提高警覺","orange"];
  if(els.some(x=>x.classList.contains("green")))return ["🟢 相對低風險","green"];
  return ["等待資料","neutral"];
}

function updateAssistantUnified(){
  const country=qs("liveCountry")?.textContent||"";
  const city=qs("liveCity")?.textContent||"";
  const district=qs("liveDistrict")?.textContent||"";
  const loc=[country,city,district].filter((x,i,a)=>x && x!=="—" && a.indexOf(x)===i).join("・");

  const [riskText,riskLevel]=assistantRiskLevel();
  setTxt("overviewRisk",riskText);

  const weatherBadge=qs("weatherBadge")?.textContent||"等待天氣";
  setTxt("overviewWeather",weatherBadge);

  const nearbyCount=qs("nearbyResults")?.querySelectorAll(".facility-row")?.length||0;
  setTxt("overviewEmergency",nearbyCount?`已找到 ${nearbyCount} 筆`:"等待搜尋");

  const mode=qs("locationModeBadge")?.textContent||"位置模式";
  setTxt("assistantMode",mode);
  setTxt("assistantNetwork",navigator.onLine?"🟢 線上":"🔴 離線");

  const updated=qs("linkedUpdated")?.textContent||"";
  setTxt("assistantFreshness",updated||"等待風險資料");

  const key=qs("assistantKeyMessage");
  if(key){
    key.className="assistant-key-message "+riskLevel;
    key.textContent=loc
      ? `${loc}｜${riskText}｜${weatherBadge}`
      : "取得位置後，會把治安、天氣、詐騙、疾病、高風險地區與附近緊急設施同步顯示。";
  }

  // emergency contact summary
  const tw=country.includes("台灣")||country.includes("臺灣");
  setTxt("overviewContact",tw?"110／119／165":"查看 SOS／館處");
}

async function refreshAssistantAll(){
  const btn=qs("refreshAssistantAll");
  if(btn)btn.textContent="更新中…";
  try{
    if(typeof window.locateAndUpdate==="function" && qs("locationModeBadge")?.classList.contains("gps")){
      await window.locateAndUpdate();
    }
    if(typeof refreshAllLinkedRisk==="function")await refreshAllLinkedRisk();
    if(typeof refreshNearby==="function")await refreshNearby();
    updateAssistantUnified();
    if(btn)btn.textContent="✅ 已更新";
  }catch{
    if(btn)btn.textContent="⚠️ 部分更新失敗";
  }
  setTimeout(()=>{if(btn)btn.textContent="全部更新"},1600);
}

function jumpClass(cls){
  const e=document.querySelector("."+cls);
  if(e)e.scrollIntoView({behavior:"smooth",block:"start"});
}

document.addEventListener("DOMContentLoaded",()=>{
  updateAssistantUnified();

  qs("refreshAssistantAll")?.addEventListener("click",refreshAssistantAll);

  document.querySelectorAll(".assistant-tile[data-jump]").forEach(b=>{
    b.addEventListener("click",()=>jumpClass(b.dataset.jump));
  });

  qs("jumpNearestHospital")?.addEventListener("click",()=>{
    const b=document.querySelector('.nearby-tab[data-kind="hospital"]');
    b?.click(); jumpClass("nearby-card");
  });
  qs("jumpNearestPolice")?.addEventListener("click",()=>{
    const b=document.querySelector('.nearby-tab[data-kind="police"]');
    b?.click(); jumpClass("nearby-card");
  });

  const obs=new MutationObserver(updateAssistantUnified);
  ["liveCountry","liveCity","liveDistrict","locationModeBadge","linkedUpdated","crimeLight","weatherLight","scamLight","diseaseLight","highRiskLight","weatherBadge","nearbyResults"].forEach(id=>{
    const e=qs(id);if(e)obs.observe(e,{childList:true,subtree:true,attributes:true});
  });

  window.addEventListener("location-context-change",updateAssistantUnified);
  window.addEventListener("online",updateAssistantUnified);
  window.addEventListener("offline",updateAssistantUnified);
});
