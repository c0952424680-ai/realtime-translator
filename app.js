
const APP_VERSION="V10.4",APP_BUILD="V10.4-UNIFIED-VOICE-APP-20260811-01";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

const App={
 state:{countryKey:"TW",country:"台灣",city:"臺北市",district:"全市",lat:25.0375,lon:121.5637,source:"default",updatedAt:null},

 init(){
   this.restore();
   this.brand();
   this.initLocation();
   this.renderStatus();
   this.pageInit();
   this.registerSW();
   window.addEventListener("online",()=>this.renderStatus());
   window.addEventListener("offline",()=>this.renderStatus());
   setTimeout(()=>window.LiveEvents?.start?.(),40);
 },

 country(k=this.state.countryKey){return LOCATION_DATA[k]},
 city(countryKey=this.state.countryKey, cityName=this.state.city){return LOCATION_DATA[countryKey]?.cities?.[cityName]||null},

 restore(){
   try{
     const s=JSON.parse(localStorage.getItem("rt_v103_state")||"null");
     if(s&&LOCATION_DATA[s.countryKey])this.state={...this.state,...s};
   }catch{}
 },

 save(reason="update"){
   this.state.updatedAt=new Date().toISOString();
   try{localStorage.setItem("rt_v103_state",JSON.stringify(this.state))}catch{}
   this.renderStatus();
   window.dispatchEvent(new CustomEvent("location-changed",{detail:{...this.state,reason}}));
 },

 brand(){
   document.querySelectorAll("[data-version]").forEach(e=>e.textContent=APP_VERSION);
   document.querySelectorAll("[data-build]").forEach(e=>e.textContent=APP_BUILD);
 },

 renderStatus(){
   const label=`${this.country()?.flag||""} ${this.state.country}・${this.state.city}・${this.state.district}`;
   document.querySelectorAll("[data-location]").forEach(e=>e.textContent=label);
   document.querySelectorAll("[data-net]").forEach(e=>e.textContent=navigator.onLine?"線上":"離線");
 },

 initLocation(){
   const c=document.getElementById("countrySelect"),ct=document.getElementById("citySelect"),d=document.getElementById("districtSelect");
   if(!c)return;

   c.innerHTML=Object.entries(LOCATION_DATA).map(([k,v])=>`<option value="${k}">${v.flag} ${esc(v.name)}</option>`).join("");

   const fillDistricts=()=>{
     const list=LOCATION_DATA[c.value]?.cities?.[ct.value]?.districts||["全市"];
     d.innerHTML=list.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
     if(list.includes(this.state.district))d.value=this.state.district;
   };

   const fillCities=()=>{
     const list=Object.keys(LOCATION_DATA[c.value]?.cities||{});
     ct.innerHTML=list.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
     if(list.includes(this.state.city))ct.value=this.state.city;
     fillDistricts();
   };

   c.value=LOCATION_DATA[this.state.countryKey]?this.state.countryKey:"TW";
   fillCities();

   c.onchange=()=>{
     const x=LOCATION_DATA[c.value];
     this.state.countryKey=c.value;
     this.state.country=x.name;
     this.state.city=Object.keys(x.cities)[0]||"";
     this.state.district=x.cities[this.state.city]?.districts?.[0]||"全市";
     fillCities();
   };
   ct.onchange=fillDistricts;

   document.getElementById("applyLocation")?.addEventListener("click",()=>{
     const x=LOCATION_DATA[c.value],y=x.cities[ct.value];
     Object.assign(this.state,{countryKey:c.value,country:x.name,city:ct.value,district:d.value,lat:y.lat,lon:y.lon,source:"manual"});
     this.save("manual");
     const s=document.getElementById("locationStatus");if(s)s.textContent=`✅ 已套用：${x.flag} ${x.name}・${ct.value}・${d.value}`;
   });

   document.getElementById("useGps")?.addEventListener("click",()=>this.gps());
 },

 async gps(){
   const el=document.getElementById("locationStatus");
   if(el)el.textContent="正在取得 GPS 與反查所在地…";

   if(!navigator.geolocation){
     if(el)el.textContent="⚠️ 此裝置不支援定位，請改用手動選擇。";
     return;
   }

   try{
     const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{
       enableHighAccuracy:true,timeout:12000,maximumAge:15000
     }));
     const lat=p.coords.latitude,lon=p.coords.longitude;
     const geo=await this.reverseGeocode(lat,lon);
     Object.assign(this.state,{lat,lon,source:"gps"});

     if(geo){
       const code=geo.countryKey;
       if(code&&LOCATION_DATA[code]){
         const cityMatch=this.matchNearestCity(code,lat,lon,geo.city);
         const district=geo.district||LOCATION_DATA[code].cities[cityMatch]?.districts?.[0]||"全市";
         Object.assign(this.state,{
           countryKey:code,
           country:LOCATION_DATA[code].name,
           city:cityMatch,
           district
         });
       }
     }

     this.save("gps");
     this.syncSelectors();
     if(el)el.textContent=`✅ GPS 已同步：${this.state.country}・${this.state.city}・${this.state.district}｜${lat.toFixed(5)}, ${lon.toFixed(5)}`;
   }catch(err){
     const msg=err?.code===1?"Safari 未允許位置權限":err?.code===2?"目前無法取得位置":err?.code===3?"GPS 定位逾時":"GPS 或反查服務暫時不可用";
     if(el)el.textContent=`⚠️ ${msg}。仍可手動選擇所在地。`;
     this.updateDiagnostic("gps","error",msg);
   }
 },

 async reverseGeocode(lat,lon){
   try{
     const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5000);
     const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-TW,en`,{
       headers:{"Accept":"application/json"},signal:ctl.signal,cache:"no-store"
     });
     clearTimeout(timer);
     if(!r.ok)throw new Error("reverse");
     const j=await r.json(),a=j.address||{};
     const countryKey=(a.country_code||"").toUpperCase();
     const city=a.city||a.town||a.municipality||a.county||a.state||"";
     const district=a.suburb||a.city_district||a.district||a.borough||"";
     this.updateDiagnostic("reverse","ok","OpenStreetMap Nominatim");
     return {countryKey,city,district};
   }catch{
     this.updateDiagnostic("reverse","error","反查逾時或不可用");
     return null;
   }
 },

 matchNearestCity(code,lat,lon,preferred=""){
   const cities=LOCATION_DATA[code]?.cities||{};
   if(preferred){
     const exact=Object.keys(cities).find(n=>preferred.includes(n)||n.includes(preferred));
     if(exact)return exact;
   }
   let best=Object.keys(cities)[0]||"",bestD=Infinity;
   for(const [name,c] of Object.entries(cities)){
     const d=this.distanceKm(lat,lon,c.lat,c.lon);
     if(d<bestD){bestD=d;best=name}
   }
   return best;
 },

 syncSelectors(){
   const c=document.getElementById("countrySelect"),ct=document.getElementById("citySelect"),d=document.getElementById("districtSelect");
   if(!c)return;
   c.value=this.state.countryKey;
   c.dispatchEvent(new Event("change"));
   if([...ct.options].some(o=>o.value===this.state.city))ct.value=this.state.city;
   ct.dispatchEvent(new Event("change"));
   if([...d.options].some(o=>o.value===this.state.district))d.value=this.state.district;
 },

 distanceKm(a,b,c,d){
   const rad=x=>x*Math.PI/180,R=6371,dl=rad(c-a),dn=rad(d-b);
   const h=Math.sin(dl/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dn/2)**2;
   return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
 },


 pageInit(){
   const page=document.body.dataset.page;
   if(page==="translate")this.translationInit();
   if(page==="sos")this.sosInit();
   if(page==="trip")this.tripInit();
   if(page==="risk")this.riskInit();
 },

 translationInit(){
   const src=document.getElementById("srcLang"),dst=document.getElementById("dstLang"),input=document.getElementById("translateInput"),out=document.getElementById("translateOutput");
   const languageOptions=[
     ["zh-TW","繁體中文"],["zh-CN","简体中文"],["en","English"],["ja","日本語"],["ko","한국어"],
     ["th","ไทย"],["vi","Tiếng Việt"],["id","Bahasa Indonesia"],["ms","Bahasa Melayu"],["tl","Filipino"],
     ["km","ខ្មែរ"],["lo","ລາວ"],["my","မြန်မာ"],["mn","Монгол"],["fr","Français"],["de","Deutsch"],
     ["es","Español"],["it","Italiano"],["pt","Português"]
   ];
   const opts=languageOptions.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");
   src.innerHTML=opts;dst.innerHTML=opts;src.value="zh-TW";dst.value="en";

   const curated={
    "我是誰？":{"en":"Who am I?","ja":"私は誰ですか？","ko":"저는 누구ですか？"},
    "我需要幫助":{"en":"I need help.","ja":"助けが必要です。","ko":"도움이 필요합니다."},
    "請幫我叫救護車":{"en":"Please call an ambulance.","ja":"救急車を呼んでください。","ko":"구급차를 불러 주세요."},
    "請幫我報警":{"en":"Please call the police.","ja":"警察を呼んでください。","ko":"경찰을 불러 주세요."},
    "我的護照不見了":{"en":"My passport is missing.","ja":"パスポートをなくしました。","ko":"여권을 잃어버렸습니다."}
   };

   const translate=async()=>{
     const text=input.value.trim();if(!text){out.textContent="請輸入文字";return}
     out.textContent="翻譯中…";
     const hit=curated[text]?.[dst.value];
     if(hit){out.textContent=hit;return}
     if(!navigator.onLine){out.textContent="目前離線。緊急情境請改用『緊急』頁的人工校正求助句。";return}
     try{
       const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5500);
       const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(src.value+"|"+dst.value)}`,{signal:ctl.signal});
       clearTimeout(timer);
       const j=await r.json();
       out.textContent=j?.responseData?.translatedText||"翻譯服務暫無回應";
     }catch{
       out.textContent="翻譯逾時。請重試；安全／求救句請使用緊急頁人工校正版本。";
     }
   };

   document.getElementById("translateBtn").onclick=translate;
   document.getElementById("swapLang").onclick=()=>{const a=src.value;src.value=dst.value;dst.value=a};
   document.getElementById("speakBtn").onclick=()=>{
     const localeMap={"zh-TW":"zh-TW","zh-CN":"zh-CN","en":"en-US","ja":"ja-JP","ko":"ko-KR","th":"th-TH","vi":"vi-VN","id":"id-ID","ms":"ms-MY","tl":"fil-PH","km":"km-KH","lo":"lo-LA","my":"my-MM","mn":"mn-MN","fr":"fr-FR","de":"de-DE","es":"es-ES","it":"it-IT","pt":"pt-PT"};
     VoiceEngine.speak(out.textContent,localeMap[dst.value]||"en-US");
   };
   document.getElementById("voiceBtn").onclick=()=>{
     const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
     if(!SR){alert("此瀏覽器不支援語音輸入");return}
     const localeMap={"zh-TW":"zh-TW","zh-CN":"zh-CN","en":"en-US","ja":"ja-JP","ko":"ko-KR","th":"th-TH","vi":"vi-VN","id":"id-ID","ms":"ms-MY","tl":"fil-PH","km":"km-KH","lo":"lo-LA","my":"my-MM","mn":"mn-MN","fr":"fr-FR","de":"de-DE","es":"es-ES","it":"it-IT","pt":"pt-PT"};
     const r=new SR();r.lang=localeMap[src.value]||"en-US";r.interimResults=false;
     r.onresult=e=>{input.value=e.results[0][0].transcript;translate()};
     r.onerror=()=>alert("語音辨識失敗，請確認麥克風權限");
     r.start();
   };
 },

 sosInit(){
   const render=()=>{
     const e=this.country()?.emergency||{},box=document.getElementById("callGrid");
     if(box)box.innerHTML=[["👮 警察",e.police],["🚑 救護",e.ambulance],["🚒 消防",e.fire]].map(([l,n])=>`<a class="call" href="tel:${n}">${l}<b>${n}</b></a>`).join("");
     this.renderPhrase();
   };
   render();window.addEventListener("location-changed",render);

   document.getElementById("crisisType").onchange=()=>this.renderPhrase();
   document.getElementById("playPhrase").onclick=()=>{
     const type=document.getElementById("crisisType")?.value||"medical",p=EMERGENCY_PHRASES[type]||EMERGENCY_PHRASES.medical;
     const lang=this.country()?.translation||"en",locale=this.country()?.voiceLocale||"en-US";
     VoiceEngine.speak(p[lang]||p.en,locale);
   };
   document.getElementById("near-hospital").onclick=()=>NearbyService.search("hospital");
   document.getElementById("near-police").onclick=()=>NearbyService.search("police");
   document.getElementById("near-pharmacy").onclick=()=>NearbyService.search("pharmacy");
   document.getElementById("shareLocation").onclick=()=>this.shareLocation();
   document.getElementById("notifyBtn").onclick=async()=>{
     if(!("Notification" in window)){alert("此瀏覽器不支援通知");return}
     const p=await Notification.requestPermission();alert(p==="granted"?"已啟用通知":"未允許通知");
   };
 },

 renderPhrase(){
   const type=document.getElementById("crisisType")?.value||"medical",p=EMERGENCY_PHRASES[type]||EMERGENCY_PHRASES.medical;
   const lang=this.country()?.translation||"en";
   document.getElementById("phraseZh").textContent=p.zh;
   document.getElementById("phraseTarget").textContent=p[lang]||p.en;
 },

 async shareLocation(){
   const s=this.state,text=`我的目前位置：${s.country}・${s.city}・${s.district} ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} https://maps.google.com/?q=${s.lat},${s.lon}`;
   if(navigator.share){try{await navigator.share({title:"我的位置",text});return}catch{}}
   try{await navigator.clipboard.writeText(text);alert("位置已複製")}catch{location.href="sms:?&body="+encodeURIComponent(text)}
 },

 tripInit(){
   const fields=["name","passport","insurance","hotel","emergencyContact","medicalNote"];
   try{
     const x=JSON.parse(localStorage.getItem("rt_v103_trip")||"{}");
     fields.forEach(k=>document.getElementById("trip-"+k).value=x[k]||"");
   }catch{}
   document.getElementById("saveTrip").onclick=()=>{
     const x={};fields.forEach(k=>x[k]=document.getElementById("trip-"+k).value);
     localStorage.setItem("rt_v103_trip",JSON.stringify(x));alert("已儲存在此裝置");
   };
   document.getElementById("toggleSensitive").onclick=()=>document.getElementById("sensitiveFields").classList.toggle("reveal");
 },

 riskInit(){
   document.getElementById("diagRefresh")?.addEventListener("click",()=>this.renderDiagnostics());
   this.renderDiagnostics();
 },

 updateDiagnostic(key,status,message){
   const d=JSON.parse(localStorage.getItem("rt_v103_diag")||"{}");
   d[key]={status,message,time:new Date().toISOString()};
   localStorage.setItem("rt_v103_diag",JSON.stringify(d));
   this.renderDiagnostics();
 },

 renderDiagnostics(){
   const el=document.getElementById("diagnosticBox");if(!el)return;
   let d={};try{d=JSON.parse(localStorage.getItem("rt_v103_diag")||"{}")}catch{}
   const rows=[
     ["GPS",d.gps],["位置反查",d.reverse],["天氣",d.weather],["地震",d.quake],["新聞",d.news],["附近設施",d.nearby]
   ];
   el.innerHTML=rows.map(([name,x])=>`<div class="diag-row"><b>${name}</b><span>${x?.status==="ok"?"✅ 正常":x?.status==="error"?"⚠️ 異常":"— 尚未檢查"}</span><small>${esc(x?.message||"")}</small></div>`).join("");
 },

 registerSW(){if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=104").catch(()=>{})}
};
document.addEventListener("DOMContentLoaded",()=>App.init());
