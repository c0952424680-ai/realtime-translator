
function updateAssistantSummary(){
  const country=document.getElementById("liveCountry")?.textContent||"";
  const city=document.getElementById("liveCity")?.textContent||"";
  const district=document.getElementById("liveDistrict")?.textContent||"";
  const loc=[country,city,district].filter((x,i,a)=>x && x!=="—" && a.indexOf(x)===i).join("・");
  const le=document.getElementById("assistantLocation");
  if(le)le.textContent=loc||"等待位置";

  const lights=["crimeLight","weatherLight","scamLight","diseaseLight","highRiskLight"]
    .map(id=>document.getElementById(id))
    .filter(Boolean);
  let level="green";
  if(lights.some(x=>x.classList.contains("red")))level="red";
  else if(lights.some(x=>x.classList.contains("orange")))level="orange";
  else if(!lights.some(x=>x.classList.contains("green")))level="neutral";
  const labels={green:"🟢 相對低風險摘要",orange:"🟠 有項目需提高警覺",red:"🔴 有高風險項目",neutral:"等待資料"};
  const oe=document.getElementById("assistantOverall");
  if(oe)oe.textContent=labels[level];

  const rows=[...document.querySelectorAll("#nearbyResults .facility-row")];
  const currentKind=document.querySelector(".nearby-tab.active")?.dataset.kind;
  if(currentKind==="hospital" && rows[0]){
    document.getElementById("assistantMedical").textContent=rows[0].querySelector(".facility-main b")?.textContent||"已找到";
  }
  if(currentKind==="police" && rows[0]){
    document.getElementById("assistantPolice").textContent=rows[0].querySelector(".facility-main b")?.textContent||"已找到";
  }
}
document.addEventListener("DOMContentLoaded",()=>{
  updateAssistantSummary();
  const obs=new MutationObserver(updateAssistantSummary);
  ["liveCountry","liveCity","liveDistrict","crimeLight","weatherLight","scamLight","diseaseLight","highRiskLight","nearbyResults"].forEach(id=>{
    const e=document.getElementById(id);
    if(e)obs.observe(e,{childList:true,subtree:true,attributes:true});
  });
  window.addEventListener("location-context-change",updateAssistantSummary);
});
