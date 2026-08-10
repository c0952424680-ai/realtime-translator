
const AppState={
  data:null,
  state:{
    countryKey:"TW",country:"台灣",city:"臺北市",district:"全市",
    lat:null,lon:null,source:"default",updatedAt:null,
    network:navigator.onLine?"online":"offline"
  },

  async load(){
    try{
      const r=await fetch("./data/app-data.json?v=100",{cache:"no-store"});
      if(!r.ok)throw new Error("app-data");
      this.data=await r.json();
      localStorage.setItem("rt_v10_app_data",JSON.stringify({time:Date.now(),data:this.data}));
    }catch{
      const c=JSON.parse(localStorage.getItem("rt_v10_app_data")||"null");
      if(c?.data)this.data=c.data;
      else throw new Error("無法載入 App 資料");
    }
    try{
      const saved=JSON.parse(localStorage.getItem("rt_v10_state")||"null");
      if(saved)this.state={...this.state,...saved};
    }catch{}
    this.emit("ready");
    return this.data;
  },

  update(patch,reason="update"){
    this.state={...this.state,...patch,updatedAt:new Date().toISOString()};
    try{localStorage.setItem("rt_v10_state",JSON.stringify(this.state))}catch{}
    this.emit(reason);
    return this.state;
  },

  get(){return {...this.state};},
  country(code=this.state.countryKey){return this.data?.countries?.[code]||null;},
  service(code=this.state.countryKey){return this.data?.services?.[code]||this.country(code)?.emergency||null;},
  policy(name){return this.data?.updatePolicies?.[name]||null;},
  locationLabel(){
    const s=this.state;
    return [s.country,s.city,s.district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・")||"位置尚未取得";
  },
  emit(reason){
    window.dispatchEvent(new CustomEvent("app-state-changed",{detail:{reason,state:this.get()}}));
  }
};
window.AppState=AppState;
