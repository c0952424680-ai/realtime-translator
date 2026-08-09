
function updateDataStatusBar(){
  const loc=window.TravelContext?.locationLabel?.()||"等待位置";
  const fresh=window.DataCenter?.freshnessText?.()||"尚未更新";
  const source=window.DataCenter?.source==="cache"?"離線快取":
               window.DataCenter?.source==="network"?"最新資料":"資料載入中";
  const el=document.getElementById("dataStatusBar");
  if(el)el.innerHTML=`<b>${esc(loc)}</b><span>${source}｜${fresh}</span>`;
}

document.addEventListener("DOMContentLoaded",async()=>{
  try{await window.DataCenter?.load()}catch{}
  updateDataStatusBar();
});
window.addEventListener("travel-context-updated",updateDataStatusBar);
window.addEventListener("data-center-updated",updateDataStatusBar);
window.addEventListener("online",updateDataStatusBar);
window.addEventListener("offline",updateDataStatusBar);
