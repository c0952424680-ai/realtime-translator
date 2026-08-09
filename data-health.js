
function renderDataHealth(){
  const badge=document.getElementById("dataHealthBadge");
  const msg=document.getElementById("dataHealthMessage");
  const retry=document.getElementById("dataRetryState");
  if(!badge||!msg)return;

  const s=window.DataCenter?.state?.()||{};
  const online=navigator.onLine;

  let label="資料正常",cls="healthy",text="資料中心已同步。";
  if(!online || s.health==="offline"){
    label="離線資料";cls="offline";
    text=`目前使用快取｜${s.freshness||"尚未更新"}`;
  }
  if(s.health==="stale"){
    label="資料過期";cls="stale";
    text=`最後更新：${s.freshness||"未知"}，建議重新整理。`;
  }
  if(s.health==="warning"){
    label="更新異常";cls="warning";
    text="資料更新失敗，系統會自動重試。";
  }

  badge.className=`health-badge ${cls}`;
  badge.textContent=label;
  msg.textContent=text;
  if(retry)retry.textContent=s.retryCount?`重試 ${s.retryCount} 次`:"";
}

document.addEventListener("DOMContentLoaded",renderDataHealth);
window.addEventListener("data-center-updated",renderDataHealth);
window.addEventListener("smart-update-status",renderDataHealth);
window.addEventListener("online",renderDataHealth);
window.addEventListener("offline",renderDataHealth);
