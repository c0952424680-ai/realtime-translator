const TRAVEL_CONTEXT_KEY="rt_v90_travel_context";
const TravelContext={
 state:{countryKey:"TW",country:"台灣",city:"",district:"",lat:null,lon:null,source:"manual",updatedAt:null},
 load(){try{const x=JSON.parse(localStorage.getItem(TRAVEL_CONTEXT_KEY)||"null");if(x?.countryKey)this.state={...this.state,...x}}catch{}return this.state},
 save(){try{localStorage.setItem(TRAVEL_CONTEXT_KEY,JSON.stringify(this.state))}catch{}},
 update(patch,reason="update"){this.state={...this.state,...patch,updatedAt:new Date().toISOString()};this.save();window.dispatchEvent(new CustomEvent("travel-context-updated",{detail:{...this.state,reason}}));return this.state},
 get(){return {...this.state}},
 locationLabel(){const s=this.state;return [s.country,s.city,s.district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・")}
};
window.TravelContext=TravelContext;TravelContext.load();
window.addEventListener("location-context-change",e=>{
  const d=e.detail||{};
  if(!d.countryKey)return;
  const countryText=typeof d.country==="string"
    ? d.country
    : (d.country?.name||"").replace(/^.. /,"");
  window.TravelContext?.update({
    countryKey:d.countryKey,
    country:countryText,
    city:d.city||"",
    district:d.district||"",
    lat:d.coords?.[0]??d.lat??null,
    lon:d.coords?.[1]??d.lon??null,
    source:d.source||"manual"
  },"legacy-location-sync");
});
