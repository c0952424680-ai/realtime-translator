const StateCore={
 state:{countryKey:"TW",country:"台灣",city:"基隆市",district:"七堵區",lat:25.1276,lon:121.7392,locationMode:"manual",gpsLat:null,gpsLon:null,gpsAccuracy:null,gpsStatus:"idle",gpsUpdatedAt:null,accuracy:null,reverseStatus:"idle",nearbyMode:"manual",updatedAt:null},
 init(){try{const x=JSON.parse(localStorage.getItem("rt_v109_state")||"null");if(x&&window.LOCATION_DATA?.[x.countryKey])this.state={...this.state,...x}}catch{};if(!window.LOCATION_DATA?.[this.state.countryKey])this.state={...this.state,countryKey:"TW",country:"台灣",city:"基隆市",district:"七堵區",lat:25.1276,lon:121.7392}},
 get(){return {...this.state}},
 set(patch,reason="update"){this.state={...this.state,...patch,updatedAt:new Date().toISOString()};try{localStorage.setItem("rt_v109_state",JSON.stringify(this.state))}catch{};window.dispatchEvent(new CustomEvent("state-changed",{detail:{state:this.get(),reason}}))},
 setGps(p){this.set({gpsLat:Number(p.lat),gpsLon:Number(p.lon),gpsAccuracy:Number(p.accuracy)||null,accuracy:Number(p.accuracy)||null,gpsStatus:"ok",gpsUpdatedAt:new Date().toISOString()},"gps-physical")},
 label(){const c=LOCATION_DATA[this.state.countryKey];return `${c?.flag||""} ${this.state.country}・${this.state.city}・${this.state.district}`}
};
window.StateCore=StateCore;
