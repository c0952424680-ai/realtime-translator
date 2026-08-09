
function updateDataStatusBar(){
  const loc=window.TravelContext?.locationLabel?.()||"等待位置";
  const dc=window.DataCenter;
  const fresh=dc?.freshnessText?.()||"尚未更新";
  const health=dc?.health?.()||"healthy";
  let source=dc?.source==="cache"?"離線快取":dc?.source==="network"?"最新資料":"資料載入中";
  if(health==="stale")source="資料過期";
  const el=document.getElementById("dataStatusBar");
  if(el)el.innerHTML=`<b>${esc(loc)}</b><span>${source}｜${fresh}</span>`;
}
document.addEventListener("DOMContentLoaded",async()=>{
  try{await window.DataCenter?.load()}catch{}
  updateDataStatusBar();
});
window.addEventListener("travel-context-updated",updateDataStatusBar);
window.addEventListener("data-center-updated",updateDataStatusBar);
window.addEventListener("smart-update-status",updateDataStatusBar);
window.addEventListener("online",updateDataStatusBar);
window.addEventListener("offline",updateDataStatusBar);
