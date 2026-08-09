
const AutoUpdateCenter={
  timers:[],

  async start(){
    this.stop();
    try{await window.DataCenter?.load()}catch{}

    const weatherMin=window.DataCenter?.policy("weatherMinutes")||10;
    const dataMin=window.DataCenter?.policy("travelDataMinutes")||30;

    this.timers.push(setInterval(()=>{
      if(document.visibilityState!=="visible")return;
      const s=window.TravelContext?.get?.();
      if(s && Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&typeof window.currentWeather==="function"){
        window.currentWeather(s.lat,s.lon).then(weather=>{
          const geo={address:{country:s.country,city:s.city,city_district:s.district}};
          if(typeof window.renderLive==="function"){
            window.renderLive({lat:s.lat,lon:s.lon,geo,weather});
          }
        }).catch(()=>{});
      }
    },weatherMin*60*1000));

    this.timers.push(setInterval(async()=>{
      if(document.visibilityState!=="visible")return;
      try{
        await window.DataCenter?.load(true);
        await window.refreshSafetyHub?.();
        if(typeof renderLinkedRisk==="function")renderLinkedRisk();
      }catch{}
    },dataMin*60*1000));
  },

  stop(){
    this.timers.forEach(clearInterval);
    this.timers=[];
  }
};

document.addEventListener("DOMContentLoaded",()=>AutoUpdateCenter.start());
window.AutoUpdateCenter=AutoUpdateCenter;
