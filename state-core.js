
const StateCore={
  state:{countryKey:"TW",country:"台灣",city:"基隆市",district:"七堵區",lat:25.1089,lon:121.6814,locationMode:"manual",gpsStatus:"idle",reverseStatus:"idle",accuracy:null,updatedAt:null},
  init(){try{const x=JSON.parse(localStorage.getItem("rt_v109_state")||"null");if(x&&window.LOCATION_DATA?.[x.countryKey])this.state={...this.state,...x}}catch{}},
  get(){return {...this.state}},
  set(patch,reason="update"){this.state={...this.state,...patch,updatedAt:new Date().toISOString()};try{localStorage.setItem("rt_v109_state",JSON.stringify(this.state))}catch{};window.dispatchEvent(new CustomEvent("state-changed",{detail:{state:this.get(),reason}}))},
  label(){const c=LOCATION_DATA[this.state.countryKey];return `${c?.flag||""} ${this.state.country}・${this.state.city}・${this.state.district}`}
};
window.StateCore=StateCore;
