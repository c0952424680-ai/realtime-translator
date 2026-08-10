
function renderDataCenterView(){
  const ctx=window.TravelContext?.get?.()||{};
  const dc=window.DataCenter?.state?.()||{};
  const loc=[ctx.country,ctx.city,ctx.district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・")||"等待位置";
  const el=id=>document.getElementById(id);
  if(el("dcLocation"))el("dcLocation").textContent=loc;
  if(el("dcSource"))el("dcSource").textContent=
    dc.source==="cache"?"離線快取":dc.source==="network"?"線上最新":"尚未載入";
  if(el("dcVersion"))el("dcVersion").textContent=dc.version||"V9.5.2";
  if(el("dcUpdated"))el("dcUpdated").textContent=
    window.DataCenter?.freshnessText?.()||"尚未更新";
}
document.addEventListener("DOMContentLoaded",renderDataCenterView);
window.addEventListener("travel-context-updated",renderDataCenterView);
window.addEventListener("data-center-updated",renderDataCenterView);
