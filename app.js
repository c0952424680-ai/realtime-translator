
const APP_VERSION="V10.8",APP_BUILD="V10.8-LOCAL-LANGUAGE-LIVE-TRANSLATE-20260811-01";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const App={
 healthState:{},
 init(){StateCore.init();this.brand();this.renderStatus();this.initLocationControls();this.pageInit();this.renderHealth();window.addEventListener("state-changed",()=>this.renderStatus());window.addEventListener("online",()=>this.renderStatus());window.addEventListener("offline",()=>this.renderStatus());this.registerSW();setTimeout(()=>window.LiveEvents?.start?.(),50)},
 country(){return LOCATION_DATA[StateCore.get().countryKey]},
 brand(){document.querySelectorAll("[data-version]").forEach(e=>e.textContent=APP_VERSION);document.querySelectorAll("[data-build]").forEach(e=>e.textContent=APP_BUILD)},
 renderStatus(){document.querySelectorAll("[data-location]").forEach(e=>e.textContent=StateCore.label());document.querySelectorAll("[data-net]").forEach(e=>e.textContent=navigator.onLine?"線上":"離線")},
 distanceKm(a,b,c,d){const r=x=>x*Math.PI/180,R=6371,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))},
 initLocationControls(){
  const c=document.getElementById("countrySelect"),ct=document.getElementById("citySelect"),d=document.getElementById("districtSelect");if(!c)return;
  c.innerHTML=Object.entries(LOCATION_DATA).map(([k,v])=>`<option value="${k}">${v.flag} ${esc(v.name)}</option>`).join("");
  const fd=()=>{const list=LOCATION_DATA[c.value]?.cities?.[ct.value]?.districts||["全市"];d.innerHTML=list.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("")};
  const fc=()=>{const list=Object.keys(LOCATION_DATA[c.value]?.cities||{});ct.innerHTML=list.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");fd()};
  const s=StateCore.get();c.value=s.countryKey;fc();if([...ct.options].some(o=>o.value===s.city))ct.value=s.city;fd();if([...d.options].some(o=>o.value===s.district))d.value=s.district;
  c.onchange=fc;ct.onchange=fd;
  document.getElementById("applyLocation")?.addEventListener("click",()=>{const x=LOCATION_DATA[c.value],y=x.cities[ct.value];StateCore.set({countryKey:c.value,country:x.name,city:ct.value,district:d.value,lat:y.lat,lon:y.lon,locationMode:"manual"},"manual");const st=document.getElementById("locationStatus");if(st)st.textContent=`✅ 已套用：${StateCore.label()}`});
  document.getElementById("useGps")?.addEventListener("click",()=>LocationEngine.locate());
 },
 pageInit(){const p=document.body.dataset.page;if(p==="translate")this.translationInit();if(p==="sos")this.sosInit();if(p==="trip")this.tripInit();if(p==="risk")this.riskInit()},
 translationInit(){
  const src=document.getElementById("srcLang"),dst=document.getElementById("dstLang"),input=document.getElementById("translateInput"),out=document.getElementById("translateOutput");
  const opts=[["zh-TW","繁體中文"],["zh-CN","簡體中文"],["en","英文"],["ja","日文"],["ko","韓文"],["th","泰文"],["vi","越南文"],["id","印尼文"],["ms","馬來文"],["tl","菲律賓文"],["km","高棉文"],["lo","寮文"],["my","緬甸文"],["mn","蒙古文"],["fr","法文"],["de","德文"],["es","西班牙文"],["it","義大利文"],["pt","葡萄牙文"]];
  const h=opts.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");src.innerHTML=h;dst.innerHTML=h;src.value="zh-TW";dst.value="en";
  document.getElementById("swapLang").onclick=()=>{const a=src.value;src.value=dst.value;dst.value=a;src.dispatchEvent(new Event("change"))};
  document.getElementById("speakBtn").onclick=()=>{const m={"zh-TW":"zh-TW","zh-CN":"zh-CN","en":"en-US","ja":"ja-JP","ko":"ko-KR","th":"th-TH","vi":"vi-VN","id":"id-ID","ms":"ms-MY","tl":"fil-PH","km":"km-KH","lo":"lo-LA","my":"my-MM","mn":"mn-MN","fr":"fr-FR","de":"de-DE","es":"es-ES","it":"it-IT","pt":"pt-PT"};VoiceEngine.speak(out.textContent,m[dst.value]||"en-US")};
  document.getElementById("voiceBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("此瀏覽器不支援語音輸入");return}const m={"zh-TW":"zh-TW","zh-CN":"zh-CN","en":"en-US","ja":"ja-JP","ko":"ko-KR","th":"th-TH","vi":"vi-VN","id":"id-ID","ms":"ms-MY","tl":"fil-PH"};const r=new SR();r.lang=m[src.value]||"en-US";r.onresult=e=>{input.value=e.results[0][0].transcript;input.dispatchEvent(new Event("input"))};r.start()};
  LiveTranslate.init();
 },
 sosInit(){
  const render=()=>{const e=this.country()?.emergency||{},box=document.getElementById("callGrid");if(box)box.innerHTML=[["👮 警察",e.police],["🚑 救護",e.ambulance],["🚒 消防",e.fire]].map(([l,n])=>`<a class="call" href="tel:${n}">${l}<b>${n}</b></a>`).join("");this.renderPhrase()};render();window.addEventListener("state-changed",render);
  document.getElementById("crisisType").onchange=()=>this.renderPhrase();
  document.getElementById("playPhrase").onclick=()=>{const t=document.getElementById("crisisType").value,s=StateCore.get(),profile=COUNTRY_LANGUAGE_PROFILE[s.countryKey],fallback=EMERGENCY_PHRASES[t]||EMERGENCY_PHRASES.medical,phraseSet=profile?LOCAL_PHRASES[profile.phrase]:null,text=phraseSet?.[t]||fallback[this.country()?.translation||"en"]||fallback.en;VoiceEngine.speak(text,profile?.voice||this.country()?.voiceLocale||"en-US")};
  document.getElementById("near-hospital").onclick=()=>NearbyService.search("hospital");document.getElementById("near-police").onclick=()=>NearbyService.search("police");document.getElementById("near-pharmacy").onclick=()=>NearbyService.search("pharmacy");document.getElementById("shareLocation").onclick=()=>this.shareLocation();
  const n=document.getElementById("notifyBtn");if(n){const standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;if(!standalone){n.textContent="加入主畫面後可啟用安全通知";n.onclick=()=>alert("iPhone 請先用 Safari『分享 → 加入主畫面』，再從主畫面開啟 App 後啟用通知。")}else{n.onclick=async()=>{if(!("Notification" in window)){alert("此裝置不支援通知");return}const p=await Notification.requestPermission();alert(p==="granted"?"已啟用安全通知":"未允許通知")}}}
 },
 renderPhrase(){const t=document.getElementById("crisisType")?.value||"medical",s=StateCore.get(),profile=COUNTRY_LANGUAGE_PROFILE[s.countryKey],fallback=EMERGENCY_PHRASES[t]||EMERGENCY_PHRASES.medical,phraseSet=profile?LOCAL_PHRASES[profile.phrase]:null;document.getElementById("phraseZh").textContent=LOCAL_PHRASES.zhTW[t]||fallback.zh;document.getElementById("phraseTarget").textContent=phraseSet?.[t]||fallback[this.country()?.translation||"en"]||fallback.en;const lang=document.getElementById("phraseLangLabel");if(lang)lang.textContent=profile?.label||"當地語言"},
 async shareLocation(){const s=StateCore.get(),text=`我的目前位置：${StateCore.label()} ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} https://maps.google.com/?q=${s.lat},${s.lon}`;if(navigator.share){try{await navigator.share({title:"我的位置",text});return}catch{}}try{await navigator.clipboard.writeText(text);alert("位置已複製")}catch{location.href="sms:?&body="+encodeURIComponent(text)}},
 tripInit(){const f=["name","passport","insurance","hotel","emergencyContact","medicalNote"];try{const x=JSON.parse(localStorage.getItem("rt_v106_trip")||"{}");f.forEach(k=>document.getElementById("trip-"+k).value=x[k]||"")}catch{};document.getElementById("saveTrip").onclick=()=>{const x={};f.forEach(k=>x[k]=document.getElementById("trip-"+k).value);localStorage.setItem("rt_v106_trip",JSON.stringify(x));alert("已儲存在此裝置")};document.getElementById("toggleSensitive").onclick=()=>document.getElementById("sensitiveFields").classList.toggle("reveal")},
 riskInit(){document.getElementById("diagRefresh")?.addEventListener("click",()=>this.renderHealth())},
 health(key,status,message){this.healthState[key]={status,message,time:new Date().toISOString()};this.renderHealth()},
 renderHealth(){const el=document.getElementById("diagnosticBox");if(!el)return;const s=StateCore.get(),rows=[["GPS",s.gpsStatus==="ok"?{status:"ok",message:"已取得 GPS"}:s.gpsStatus==="checking"?{status:"checking",message:"定位中"}:{status:"idle",message:"尚未使用 GPS"}],["位置反查",s.reverseStatus==="ok"?{status:"ok",message:"已同步所在地"}:s.reverseStatus==="checking"?{status:"checking",message:"反查中"}:{status:"idle",message:"尚未反查"}],["天氣",this.healthState.weather],["地震",this.healthState.quake],["新聞",this.healthState.news],["附近設施",this.healthState.nearby]];el.innerHTML=rows.map(([n,x])=>`<div class="diag-row"><b>${n}</b><span>${x?.status==="ok"?"✅ 正常":x?.status==="error"?"⚠️ 異常":x?.status==="checking"?"⏳ 處理中":"— 尚未使用"}</span><small>${esc(x?.message||"")}</small></div>`).join("")},
 registerSW(){if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=108").catch(()=>{})}
};
window.App=App;
document.addEventListener("DOMContentLoaded",()=>App.init());
