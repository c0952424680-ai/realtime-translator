
const SmartUpdate={
  timers:new Map(),
  lastRun:{},
  running:false,

  interval(name,fallback){
    return (window.DataCenter?.policy(name)||fallback)*60*1000;
  },

  due(key,ms){
    return !this.lastRun[key] || Date.now()-this.lastRun[key]>=ms;
  },

  mark(key){
    this.lastRun[key]=Date.now();
  },

  async refreshWeather(){
    const s=window.TravelContext?.get?.();
    if(!s || !Number.isFinite(s.lat)||!Number.isFinite(s.lon))return;
    if(typeof window.currentWeather!=="function")return;
    const weather=await window.currentWeather(s.lat,s.lon);
    const geo={address:{country:s.country,city:s.city,city_district:s.district}};
    if(typeof window.renderLive==="function"){
      window.renderLive({lat:s.lat,lon:s.lon,geo,weather});
    }
    this.mark("weather");
    window.dispatchEvent(new CustomEvent("smart-update-complete",{detail:{type:"weather"}}));
  },

  async refreshNearby(){
    if(typeof window.refreshNearby!=="function")return;
    await window.refreshNearby();
    this.mark("nearby");
    window.dispatchEvent(new CustomEvent("smart-update-complete",{detail:{type:"nearby"}}));
  },

  async refreshRisk(){
    if(typeof window.renderLinkedRisk==="function"){
      window.renderLinkedRisk();
      this.mark("risk");
      window.dispatchEvent(new CustomEvent("smart-update-complete",{detail:{type:"risk"}}));
    }
  },

  async refreshDataCenter(){
    await window.DataCenter?.refreshWithRetry();
    await window.refreshSafetyHub?.();
    this.mark("data");
    window.dispatchEvent(new CustomEvent("smart-update-complete",{detail:{type:"data"}}));
  },

  async tick(force=false){
    if(this.running || document.visibilityState!=="visible")return;
    this.running=true;
    try{
      const weatherMs=this.interval("weatherMinutes",10);
      const nearbyMs=this.interval("nearbyMinutes",15);
      const riskMs=this.interval("riskMinutes",20);
      const dataMs=this.interval("travelDataMinutes",30);

      const jobs=[];
      if(force || this.due("data",dataMs))jobs.push(this.refreshDataCenter().catch(()=>{}));
      if(force || this.due("weather",weatherMs))jobs.push(this.refreshWeather().catch(()=>{}));
      if(force || this.due("nearby",nearbyMs))jobs.push(this.refreshNearby().catch(()=>{}));
      if(force || this.due("risk",riskMs))jobs.push(this.refreshRisk().catch(()=>{}));
      await Promise.all(jobs);
    }finally{
      this.running=false;
      window.dispatchEvent(new Event("smart-update-status"));
    }
  },

  start(){
    this.stop();
    this.tick(false);
    const id=setInterval(()=>this.tick(false),60*1000);
    this.timers.set("heartbeat",id);
  },

  stop(){
    this.timers.forEach(clearInterval);
    this.timers.clear();
  }
};

document.addEventListener("DOMContentLoaded",()=>SmartUpdate.start());

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"){
    SmartUpdate.tick(false);
  }
});

window.addEventListener("online",()=>SmartUpdate.tick(true));
window.SmartUpdate=SmartUpdate;
