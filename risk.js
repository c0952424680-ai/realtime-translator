
document.addEventListener("DOMContentLoaded",()=>{
  // V8.1: legacy riskCountry selector removed.
  // All risk linkage now follows the single location-context-change event.
  window.addEventListener("location-context-change",()=>{
    if(typeof renderLinkedRisk==="function")renderLinkedRisk();
    if(typeof syncWeatherLight==="function")syncWeatherLight();
    if(typeof renderTaiwanLink==="function")renderTaiwanLink();
  });
});
