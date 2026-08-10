
const StateCore={
 state:{countryKey:"TW",country:"台灣",city:"臺北市",district:"全市",lat:25.0375,lon:121.5637,locationMode:"manual",gpsStatus:"idle",reverseStatus:"idle",updatedAt:null},
 init(){try{const x=JSON.parse(localStorage.getItem("rt_v106_state")||"null");if(x&&window.LOCATION_DATA?.[x.countryKey])this.state={...this.state,...x}}catch{}},
 get(){return {...this.state}},
 set(patch,reason="update"){this.state={...this.state,...patch,updatedAt:new Date().toISOString()};try{localStorage.setItem("rt_v106_state",JSON.stringify(this.state))}catch{};window.dispatchEvent(new CustomEvent("state-changed",{detail:{state:this.get(),reason}}))},
 label(){const c=LOCATION_DATA[this.state.countryKey];return `${c?.flag||""} ${this.state.country}・${this.state.city}・${this.state.district}`}
};
window.StateCore=StateCore;
