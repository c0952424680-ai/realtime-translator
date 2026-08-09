
const DATA_CENTER_CACHE="rt_v92_data_center";

const DataCenter={
  data:null,
  source:"none",
  loadedAt:null,

  async load(force=false){
    if(this.data && !force)return this.data;
    try{
      const url=`./data-center.json?v=92${force?`&t=${Date.now()}`:""}`;
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw new Error("data-center");
      this.data=await r.json();
      this.source="network";
      this.loadedAt=new Date();
      try{
        localStorage.setItem(DATA_CENTER_CACHE,JSON.stringify({time:Date.now(),data:this.data}));
      }catch{}
      this.emit("network");
      return this.data;
    }catch(e){
      try{
        const c=JSON.parse(localStorage.getItem(DATA_CENTER_CACHE)||"null");
        if(c?.data){
          this.data=c.data;
          this.source="cache";
          this.loadedAt=new Date(c.time);
          this.emit("cache");
          return this.data;
        }
      }catch{}
      throw e;
    }
  },

  emit(source){
    window.dispatchEvent(new CustomEvent("data-center-updated",{
      detail:{source,data:this.data,loadedAt:this.loadedAt}
    }));
  },

  country(code){ return this.data?.countries?.[code]||null; },
  service(code){ return this.data?.services?.[code]||null; },
  cityCoords(city){ return this.data?.cityCoordinates?.[city]||null; },
  policy(name){ return this.data?.updatePolicies?.[name]||null; },

  freshnessText(){
    if(!this.loadedAt)return "尚未更新";
    const min=Math.max(0,Math.floor((Date.now()-this.loadedAt.getTime())/60000));
    if(min<1)return "剛剛更新";
    if(min<60)return `${min} 分鐘前`;
    return this.loadedAt.toLocaleString("zh-TW",{hour12:false});
  },

  state(){
    return {
      source:this.source,
      loadedAt:this.loadedAt,
      version:this.data?.version||"—",
      build:this.data?.build||"—"
    };
  }
};

window.DataCenter=DataCenter;
