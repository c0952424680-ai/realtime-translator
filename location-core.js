
const LocationCore={
  countryData:{},
  cityCoords:{},

  async init(){
    try{
      const dc=await window.DataCenter.load();
      this.countryData=dc?.countries||{};
      this.cityCoords=dc?.cityCoordinates||{};
    }catch{}
    this.bind();
    this.render(window.TravelContext?.get?.()||{});
  },

  bind(){
    const country=document.getElementById("manualCountry");
    const city=document.getElementById("manualCity");
    const district=document.getElementById("manualDistrict");
    const apply=document.getElementById("applyManualLocation");
    const gps=document.getElementById("locateMe")||
              document.getElementById("getCurrentLocation")||
              document.getElementById("useMyLocation");

    country?.addEventListener("change",()=>{
      this.populateCities(country.value);
      this.populateDistricts(country.value,city?.value||"");
    });
    city?.addEventListener("change",()=>{
      this.populateDistricts(country?.value||"",city.value);
    });
    apply?.addEventListener("click",()=>this.applyManual());
    gps?.addEventListener("click",()=>this.useGPS());
  },

  countryName(code){
    return this.countryData?.[code]?.name||code||"";
  },

  populateCities(code){
    const city=document.getElementById("manualCity");
    if(!city)return;
    const items=this.countryData?.[code]?.cities||[];
    city.innerHTML=items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  },

  populateDistricts(code,cityName){
    const district=document.getElementById("manualDistrict");
    if(!district)return;
    const items=this.countryData?.[code]?.districts?.[cityName]||["全市"];
    district.innerHTML=items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  },

  resolveCoords(city){
    return this.cityCoords?.[city]||null;
  },

  applyManual(){
    const code=document.getElementById("manualCountry")?.value||"TW";
    const city=document.getElementById("manualCity")?.value||"";
    const district=document.getElementById("manualDistrict")?.value||"";
    const coords=this.resolveCoords(city);

    const state=window.TravelContext.update({
      countryKey:code,
      country:this.countryName(code),
      city,
      district,
      lat:coords?.[0]??null,
      lon:coords?.[1]??null,
      source:"manual"
    },"manual-location");

    this.render(state);
    this.emitLegacy(state);
  },

  useGPS(){
    const status=document.getElementById("liveLocationStatus")||
                 document.getElementById("gpsStatus")||
                 document.getElementById("manualLocationStatus");

    if(!navigator.geolocation){
      if(status)status.textContent="此裝置不支援定位。";
      return;
    }

    if(status)status.textContent="正在取得目前位置…";

    navigator.geolocation.getCurrentPosition(
      pos=>this.handleGPS(pos),
      ()=>{ if(status)status.textContent="無法取得定位。請在 Safari 的網站設定中允許「位置」。"; },
      {enableHighAccuracy:true,timeout:12000,maximumAge:60000}
    );
  },

  async handleGPS(pos){
    const lat=pos.coords.latitude;
    const lon=pos.coords.longitude;
    const status=document.getElementById("liveLocationStatus")||
                 document.getElementById("gpsStatus")||
                 document.getElementById("manualLocationStatus");

    if(status)status.textContent="定位成功，正在同步國家、城市與附近資訊…";

    let previous=window.TravelContext?.get?.()||{};
    let resolved={
      countryKey:previous.countryKey||"TW",
      country:previous.country||"台灣",
      city:previous.city||"",
      district:previous.district||""
    };

    try{
      const r=await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-TW`,
        {headers:{"Accept":"application/json"}}
      );
      if(r.ok){
        const j=await r.json();
        const a=j.address||{};
        const cc=(a.country_code||"").toUpperCase();
        const city=a.city||a.town||a.municipality||a.county||"";
        const district=a.suburb||a.city_district||a.district||"";
        resolved={
          countryKey:this.countryData[cc]?cc:(previous.countryKey||cc||"TW"),
          country:this.countryData[cc]?.name||a.country||previous.country||"",
          city,
          district
        };
      }
    }catch{}

    const state=window.TravelContext.update({
      ...resolved,
      lat,lon,source:"gps"
    },"gps-location");

    this.syncSelectors(state);
    this.render(state);
    this.emitLegacy(state);

    if(status)status.textContent="✅ 已取得目前位置，相關資料已同步更新。";
  },

  syncSelectors(state){
    const country=document.getElementById("manualCountry");
    const city=document.getElementById("manualCity");
    const district=document.getElementById("manualDistrict");

    if(country && [...country.options].some(o=>o.value===state.countryKey)){
      country.value=state.countryKey;
      this.populateCities(state.countryKey);
      if(city && [...city.options].some(o=>o.value===state.city))city.value=state.city;
      this.populateDistricts(state.countryKey,state.city);
      if(district && [...district.options].some(o=>o.value===state.district))district.value=state.district;
    }
  },

  render(state){
    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val||"—";};
    set("liveCountry",state.country);
    set("liveCity",state.city);
    set("liveDistrict",state.district);
    set("liveCoords",Number.isFinite(state.lat)&&Number.isFinite(state.lon)?`${state.lat.toFixed(5)}, ${state.lon.toFixed(5)}`:"尚未取得");

    if(Number.isFinite(state.lat)&&Number.isFinite(state.lon)){
      window.updateNearbyPosition?.(state.lat,state.lon);
      if(typeof window.currentWeather==="function"){
        window.currentWeather(state.lat,state.lon).then(weather=>{
          const geo={address:{country:state.country,city:state.city,city_district:state.district}};
          window.renderLive?.({lat:state.lat,lon:state.lon,geo,weather});
        }).catch(()=>{});
      }
    }
  },

  emitLegacy(state){
    window.dispatchEvent(new CustomEvent("location-context-change",{detail:{
      countryKey:state.countryKey,
      country:state.country,
      city:state.city,
      district:state.district,
      lat:state.lat,
      lon:state.lon,
      coords:Number.isFinite(state.lat)&&Number.isFinite(state.lon)?[state.lat,state.lon]:null,
      source:state.source
    }}));
  }
};

window.LocationCore=LocationCore;
document.addEventListener("DOMContentLoaded",()=>LocationCore.init());
window.addEventListener("travel-context-updated",e=>LocationCore.render(e.detail||{}));
