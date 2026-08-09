
document.addEventListener("DOMContentLoaded",()=>{
  const btn=document.getElementById("manualSmartRefresh");
  btn?.addEventListener("click",async()=>{
    btn.disabled=true;
    btn.textContent="更新中…";
    try{
      await window.SmartUpdate?.tick?.(true);
      btn.textContent="✅ 已完成更新";
    }catch{
      btn.textContent="⚠️ 部分更新失敗";
    }
    setTimeout(()=>{
      btn.disabled=false;
      btn.textContent="立即更新全部資料";
    },1600);
  });
});
