
const APP_VERSION="V10.2",APP_BUILD="V10.2-CLEAN-ROOM-APP-20260810-01";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const App={
 state:{countryKey:"TW",country:"台灣",city:"臺北市",district:"全市",lat:25.0375,lon:121.5637,source:"default"},
 init(){this.restore();this.brand();this.initLocation();this.renderStatus();this.pageInit();this.registerSW();setTimeout(()=>window.LiveEvents?.start?.(),30)},
 country(k=this.state.countryKey){return LOCATION_DATA[k]}, city(){return this.country()?.cities?.[this.state.city]},
 restore(){try{const s=JSON.parse(localStorage.getItem("rt_v102_state")||"null");if(s)this.state={...this.state,...s}}catch{}},
 save(reason="update"){try{localStorage.setItem("rt_v102_state",JSON.stringify(this.state))}catch{};this.renderStatus();window.dispatchEvent(new CustomEvent("location-changed",{detail:{...this.state,reason}}))},
 brand(){document.querySelectorAll("[data-version]").forEach(e=>e.textContent=APP_VERSION);document.querySelectorAll("[data-build]").forEach(e=>e.textContent=APP_BUILD)},
 renderStatus(){document.querySelectorAll("[data-location]").forEach(e=>e.textContent=`${this.country()?.flag||""} ${this.state.country}・${this.state.city}・${this.state.district}`);document.querySelectorAll("[data-net]").forEach(e=>e.textContent=navigator.onLine?"線上":"離線")},
 initLocation(){
  const c=document.getElementById("countrySelect"),ct=document.getElementById("citySelect"),d=document.getElementById("districtSelect");if(!c)return;
  c.innerHTML=Object.entries(LOCATION_DATA).map(([k,v])=>`<option value="${k}">${v.flag} ${esc(v.name)}</option>`).join("");
  const districts=()=>{const list=LOCATION_DATA[c.value]?.cities?.[ct.value]?.districts||["全市"];d.innerHTML=list.map(n=>`<option>${esc(n)}</option>`).join("");if(list.includes(this.state.district))d.value=this.state.district};
  const cities=()=>{const list=Object.keys(LOCATION_DATA[c.value].cities);ct.innerHTML=list.map(n=>`<option>${esc(n)}</option>`).join("");if(list.includes(this.state.city))ct.value=this.state.city;districts()};
  if(LOCATION_DATA[this.state.countryKey])c.value=this.state.countryKey;cities();
  c.onchange=()=>{this.state.countryKey=c.value;this.state.country=LOCATION_DATA[c.value].name;this.state.city="";this.state.district="";cities()};ct.onchange=districts;
  document.getElementById("applyLocation")?.addEventListener("click",()=>{const x=LOCATION_DATA[c.value],y=x.cities[ct.value];Object.assign(this.state,{countryKey:c.value,country:x.name,city:ct.value,district:d.value,lat:y.lat,lon:y.lon,source:"manual"});this.save("manual")});
  document.getElementById("useGps")?.addEventListener("click",()=>this.gps());
 },
 gps(){const s=document.getElementById("locationStatus");if(s)s.textContent="正在取得 GPS…";if(!navigator.geolocation){if(s)s.textContent="此裝置不支援定位。";return}navigator.geolocation.getCurrentPosition(p=>{this.state.lat=p.coords.latitude;this.state.lon=p.coords.longitude;this.state.source="gps";this.save("gps");if(s)s.textContent=`✅ GPS 已取得：${this.state.lat.toFixed(5)}, ${this.state.lon.toFixed(5)}。`},()=>{if(s)s.textContent="⚠️ 無法取得 GPS。仍可手動選擇所在地。"}, {enableHighAccuracy:true,timeout:10000,maximumAge:30000})},
 pageInit(){const p=document.body.dataset.page;if(p==="translate")this.translationInit();if(p==="sos")this.sosInit();if(p==="trip")this.tripInit()},
 translationInit(){
  const src=document.getElementById("srcLang"),dst=document.getElementById("dstLang"),input=document.getElementById("translateInput"),out=document.getElementById("translateOutput");
  const local={"我是誰？":{"ja":"私は誰ですか？","en":"Who am I?","ko":"저는 누구인가요?"},"我需要幫助":{"ja":"助けが必要です。","en":"I need help.","ko":"도움이 필요합니다."},"請幫我叫救護車":{"ja":"救急車を呼んでください。","en":"Please call an ambulance.","ko":"구급차를 불러 주세요."}};
  const go=async()=>{const text=input.value.trim();if(!text){out.textContent="請輸入文字";return}out.textContent="翻譯中…";const hit=local[text]?.[dst.value];if(hit){out.textContent=hit;return}if(!navigator.onLine){out.textContent="離線時此句尚未收錄。可使用緊急頁內建求助句。";return}try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),5000);const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(src.value+"|"+dst.value)}`,{signal:ctl.signal});clearTimeout(t);const j=await r.json();out.textContent=j?.responseData?.translatedText||"翻譯服務暫無回應"}catch{out.textContent="翻譯逾時。請重試，或使用緊急頁離線求助句。"}};
  document.getElementById("translateBtn").onclick=go;document.getElementById("swapLang").onclick=()=>{const a=src.value;src.value=dst.value;dst.value=a};
  document.getElementById("speakBtn").onclick=()=>{const u=new SpeechSynthesisUtterance(out.textContent);u.lang=dst.value==="ja"?"ja-JP":dst.value==="ko"?"ko-KR":dst.value==="zh-TW"?"zh-TW":"en-US";const vs=speechSynthesis.getVoices();u.voice=vs.find(v=>v.lang.startsWith(u.lang.split("-")[0])&&/female|samantha|kyoko|mei|ting|yuna/i.test(v.name))||vs.find(v=>v.lang.startsWith(u.lang.split("-")[0]))||null;speechSynthesis.cancel();speechSynthesis.speak(u)};
  document.getElementById("voiceBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("此瀏覽器不支援語音輸入");return}const r=new SR();r.lang=src.value==="ja"?"ja-JP":src.value==="ko"?"ko-KR":src.value==="zh-TW"?"zh-TW":"en-US";r.onresult=e=>{input.value=e.results[0][0].transcript;go()};r.start()}
 },
 sosInit(){const render=()=>{const e=this.country()?.emergency||{},box=document.getElementById("callGrid");if(box)box.innerHTML=[["👮 警察",e.police],["🚑 救護",e.ambulance],["🚒 消防",e.fire]].map(([l,n])=>`<a class="call" href="tel:${n}">${l}<b>${n}</b></a>`).join("");this.renderPhrase()};render();window.addEventListener("location-changed",render);document.getElementById("crisisType").onchange=()=>this.renderPhrase();document.getElementById("near-hospital").onclick=()=>this.openNearby("hospital");
  document.getElementById("near-police").onclick=()=>this.openNearby("police");
  document.getElementById("near-pharmacy").onclick=()=>this.openNearby("pharmacy");document.getElementById("shareLocation").onclick=()=>this.shareLocation();document.getElementById("notifyBtn").onclick=async()=>{if(!("Notification" in window)){alert("此瀏覽器不支援通知");return}const p=await Notification.requestPermission();alert(p==="granted"?"已啟用通知":"未允許通知")}},
 renderPhrase(){const type=document.getElementById("crisisType")?.value||"medical",p=EMERGENCY_PHRASES[type]||EMERGENCY_PHRASES.medical,lang=this.country()?.lang||"en";document.getElementById("phraseZh").textContent=p.zh;document.getElementById("phraseTarget").textContent=p[lang]||p.en},
 openNearby(kind){const q={hospital:"hospital emergency room",police:"police station",pharmacy:"pharmacy"}[kind],s=this.state;location.href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+s.lat+","+s.lon)}`},
 async shareLocation(){const s=this.state,text=`我的目前位置：${s.country}・${s.city}・${s.district} ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} https://maps.google.com/?q=${s.lat},${s.lon}`;if(navigator.share){try{await navigator.share({title:"我的位置",text});return}catch{}}try{await navigator.clipboard.writeText(text);alert("位置已複製")}catch{location.href="sms:?&body="+encodeURIComponent(text)}},
 tripInit(){const f=["name","passport","insurance","hotel","emergencyContact","medicalNote"];try{const x=JSON.parse(localStorage.getItem("rt_v102_trip")||"{}");f.forEach(k=>document.getElementById("trip-"+k).value=x[k]||"")}catch{};document.getElementById("saveTrip").onclick=()=>{const x={};f.forEach(k=>x[k]=document.getElementById("trip-"+k).value);localStorage.setItem("rt_v102_trip",JSON.stringify(x));alert("已儲存在此裝置")};document.getElementById("toggleSensitive").onclick=()=>document.getElementById("sensitiveFields").classList.toggle("reveal")},
 registerSW(){if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=102").catch(()=>{})}
};
document.addEventListener("DOMContentLoaded",()=>App.init());
