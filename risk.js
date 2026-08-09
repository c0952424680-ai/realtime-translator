
document.addEventListener("DOMContentLoaded",()=>{
  // V8.4: 舊版單國家風險選單已移除，統一使用位置中心。
  // All risk linkage now follows the single location-context-change event.
  window.addEventListener("location-context-change",()=>{
    if(typeof renderLinkedRisk==="function")renderLinkedRisk();
    if(typeof syncWeatherLight==="function")syncWeatherLight();
    if(typeof renderTaiwanLink==="function")renderTaiwanLink();
  });
});
