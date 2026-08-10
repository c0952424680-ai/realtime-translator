
const AppState={
  data:{countries:window.V10_FALLBACK_COUNTRIES||{},services:{},cityCoordinates:{}},
  state:{
    countryKey:"TW",country:"台灣",city:"臺北市",district:"全市",
    lat:null,lon:null,source:"default",updatedAt:null
  },

  async load(){
    const fallback=this.data;
    try{
      const r=await fetch("./data/app-data.json?v=101",{cache:"no-store"});
      if(!r.ok)throw new Error("app-data");
      const remote=await r.json();
      this.data={
        ...fallback,...remote,
        countries:{...(fallback.countries||{}),...(remote.countries||{})}
      };
      try{localStorage.setItem("rt_v1001_app_data",JSON.stringify({time:Date.now(),data:this.data}))}catch{}
    }catch{
      try{
        const c=JSON.parse(localStorage.getItem("rt_v1001_app_data")||"null");
        if(c?.data){
          this.data={
            ...fallback,...c.data,
            countries:{...(fallback.countries||{}),...(c.data.countries||{})}
          };
        }
      }catch{}
    }

    try{
      const saved=JSON.parse(localStorage.getItem("rt_v1001_state")||"null");
      if(saved)this.state={...this.state,...saved};
    }catch{}

    const c=this.country(this.state.countryKey)||this.country("TW");
    if(c){
      this.state.country=c.name||this.state.country;
      if(!this.state.city || !(c.cities||[]).includes(this.state.city))this.state.city=c.cities?.[0]||"";
      const ds=c.districts?.[this.state.city]||["全市"];
      if(!this.state.district || !ds.includes(this.state.district))this.state.district=ds[0]||"全市";
    }
    this.emit("ready");
    return this.data;
  },

  update(patch,reason="update"){
    this.state={...this.state,...patch,updatedAt:new Date().toISOString()};
    try{localStorage.setItem("rt_v1001_state",JSON.stringify(this.state))}catch{}
    this.emit(reason);
    return this.get();
  },

  get(){return {...this.state};},
  country(code=this.state.countryKey){return this.data?.countries?.[code]||null;},
  service(code=this.state.countryKey){return this.data?.services?.[code]||this.country(code)?.emergency||null;},
  policy(name){return this.data?.updatePolicies?.[name]||null;},
  locationLabel(){
    const s=this.state;
    return [s.country,s.city,s.district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・")||"位置尚未取得";
  },
  emit(reason){window.dispatchEvent(new CustomEvent("app-state-changed",{detail:{reason,state:this.get()}}));}
};
window.AppState=AppState;
