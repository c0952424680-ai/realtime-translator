
const DATA_CENTER_CACHE="rt_v93_data_center";

const DataCenter={
  data:null,
  source:"none",
  loadedAt:null,
  lastHash:null,
  retryCount:0,
  lastError:null,

  hashObject(obj){
    try{
      const s=JSON.stringify(obj);
      let h=2166136261;
      for(let i=0;i<s.length;i++){
        h^=s.charCodeAt(i);
        h=Math.imul(h,16777619);
      }
      return (h>>>0).toString(16);
    }catch{return "";}
  },

  async load(force=false){
    if(this.data && !force)return this.data;

    try{
      const url=`./data-center.json?v=941${force?`&t=${Date.now()}`:""}`;
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const next=await r.json();
      const nextHash=this.hashObject(next);
      const changed=this.lastHash!==nextHash;

      this.data=next;
      this.lastHash=nextHash;
      this.source="network";
      this.loadedAt=new Date();
      this.retryCount=0;
      this.lastError=null;

      try{
        localStorage.setItem(DATA_CENTER_CACHE,JSON.stringify({
          time:Date.now(),
          hash:nextHash,
          data:this.data
        }));
      }catch{}

      this.emit(changed?"changed":"fresh");
      return this.data;
    }catch(e){
      this.lastError=String(e?.message||e);
      try{
        const c=JSON.parse(localStorage.getItem(DATA_CENTER_CACHE)||"null");
        if(c?.data){
          this.data=c.data;
          this.lastHash=c.hash||this.hashObject(c.data);
          this.source="cache";
          this.loadedAt=new Date(c.time);
          this.emit("cache");
          return this.data;
        }
      }catch{}
      throw e;
    }
  },

  async refreshWithRetry(){
    const maxRetries=this.policy("maxRetries")||4;
    const base=(this.policy("retryBaseSeconds")||8)*1000;
    const max=(this.policy("retryMaxSeconds")||120)*1000;

    let lastErr;
    for(let i=0;i<=maxRetries;i++){
      try{
        return await this.load(true);
      }catch(e){
        lastErr=e;
        this.retryCount=i+1;
        const wait=Math.min(max,base*Math.pow(2,i));
        this.emit("retry");
        if(i<maxRetries){
          await new Promise(r=>setTimeout(r,wait));
        }
      }
    }
    throw lastErr;
  },

  emit(status){
    window.dispatchEvent(new CustomEvent("data-center-updated",{
      detail:{
        status,
        source:this.source,
        data:this.data,
        loadedAt:this.loadedAt,
        retryCount:this.retryCount,
        lastError:this.lastError
      }
    }));
  },

  country(code){return this.data?.countries?.[code]||null;},
  service(code){return this.data?.services?.[code]||null;},
  cityCoords(city){return this.data?.cityCoordinates?.[city]||null;},
  policy(name){return this.data?.updatePolicies?.[name]||null;},

  ageMinutes(){
    if(!this.loadedAt)return Infinity;
    return Math.max(0,Math.floor((Date.now()-this.loadedAt.getTime())/60000));
  },

  isStale(){
    const limit=this.policy("staleWarningMinutes")||60;
    return this.ageMinutes()>limit;
  },

  freshnessText(){
    if(!this.loadedAt)return "尚未更新";
    const min=this.ageMinutes();
    if(min<1)return "剛剛更新";
    if(min<60)return `${min} 分鐘前`;
    return this.loadedAt.toLocaleString("zh-TW",{hour12:false});
  },

  health(){
    if(this.source==="cache" && this.isStale())return "stale";
    if(this.source==="cache")return "offline";
    if(this.lastError)return "warning";
    return "healthy";
  },

  state(){
    return {
      source:this.source,
      loadedAt:this.loadedAt,
      version:this.data?.version||"—",
      build:this.data?.build||"—",
      freshness:this.freshnessText(),
      stale:this.isStale(),
      health:this.health(),
      retryCount:this.retryCount
    };
  }
};

window.DataCenter=DataCenter;
