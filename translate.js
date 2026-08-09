
const PHRASE_FIXES = {
  "zh-TW|ja-JP|我是誰？":"私は誰ですか？",
  "zh-TW|ja-JP|我是誰?":"私は誰ですか？",
  "zh-TW|ja-JP|我是大老闆":"私は社長です。",
  "zh-TW|ja-JP|我是老闆":"私は社長です。",
  "ja-JP|zh-TW|私は社長です。":"我是老闆。",
  "ja-JP|zh-TW|私は社長です":"我是老闆。"
};
function phraseFix(text,src,dst){
  return PHRASE_FIXES[src+"|"+dst+"|"+text.trim()]||null;
}
function applyFontSize(){
  const v=document.getElementById("fontSizeMode")?.value||"9mm";
  document.documentElement.style.setProperty("--main-font-mm",v);
}
document.addEventListener("DOMContentLoaded",()=>{
  const f=document.getElementById("fontSizeMode");
  if(f){applyFontSize();f.onchange=applyFontSize}
});

function v75State(m){const e=document.getElementById("translateState");if(e)e.textContent=m}
function v75Center(){
 const n=document.getElementById("networkState");if(n)n.textContent=navigator.onLine?"🟢 線上":"🔴 離線";
 const o=document.getElementById("offlineState");if(o)o.textContent=("serviceWorker"in navigator)?"✅ 已啟用":"⚠️ 不支援";
 const c=document.getElementById("cacheCount");if(c){try{c.textContent=Object.keys(JSON.parse(localStorage.getItem("rt751_cache")||"{}")).length}catch{c.textContent="0"}}
}
window.addEventListener("online",v75Center);window.addEventListener("offline",v75Center);
document.addEventListener("DOMContentLoaded",()=>{v75Center();const b=document.getElementById("refreshOffline");if(b)b.onclick=async()=>{b.textContent="更新中…";try{const r=await navigator.serviceWorker?.getRegistration();if(r)await r.update();b.textContent="✅ 已更新離線資料"}catch{b.textContent="⚠️ 更新失敗"}}});

const from=$("from"),to=$("to");from.innerHTML=opts("zh-TW");to.innerHTML=opts("ja-JP");
let audio=false,voices=[],t1=null,tA=null,tB=null,tFA=null,tFB=null;
const CACHE="rt751_cache";
function cache(){try{return JSON.parse(localStorage.getItem(CACHE)||"{}")}catch{return{}}}
function setCache(k,v){const c=cache();c[k]={v,time:Date.now()};localStorage.setItem(CACHE,JSON.stringify(c))}
async function timeoutFetch(url){const c=new AbortController();const t=setTimeout(()=>c.abort(),8000);try{return await fetch(url,{cache:"no-store",signal:c.signal})}finally{clearTimeout(t)}}
async function tr(text,s,d){if(s===d)return text;const fixed=phraseFix(text,s,d);if(fixed)return fixed;const key=s+"|"+d+"|"+text;const hit=cache()[key];if(hit&&Date.now()-hit.time<604800000)return hit.v;const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+s.split("-")[0]+"&tl="+d.split("-")[0]+"&dt=t&q="+encodeURIComponent(text);let err;for(let i=0;i<2;i++){try{const r=await timeoutFetch(url);if(!r.ok)throw new Error();const j=await r.json();const x=j[0].map(a=>a[0]||"").join("");setCache(key,x);return x}catch(e){err=e}}throw err}
function load(){if("speechSynthesis"in window)voices=speechSynthesis.getVoices()}load();if("speechSynthesis"in window)speechSynthesis.onvoiceschanged=load;
function femaleVoiceScore(v,lang){
  const name=(v.name||"").toLowerCase(),vl=(v.lang||"").toLowerCase(),target=lang.toLowerCase(),base=target.split("-")[0];
  if(!vl.startsWith(base))return -999;
  let s=0;
  if(vl===target)s+=20;
  // iOS/macOS 常見女聲，以及其他平台常見女性語音名稱。
  const femaleHints=["samantha","tingting","meijia","kyoko","o-ren","yuna","sora","kanya","narisa","lekha","veena","female","woman","girl"];
  const maleHints=["daniel","alex","fred","thomas","male","man"];
  if(femaleHints.some(x=>name.includes(x)))s+=12;
  if(maleHints.some(x=>name.includes(x)))s-=12;
  if(v.localService)s+=2;
  return s;
}
function preferredFemaleVoice(lang){
  return voices.slice().sort((a,b)=>femaleVoiceScore(b,lang)-femaleVoiceScore(a,lang))[0]||null;
}
function speak(text,lang){
  if(!audio||!text)return;
  const mode=$("voiceMode")?.value||"natural";
  const cfg={natural:[.88,1.08],slow:[.72,1.07],clear:[.80,1.06]}[mode];
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang;u.rate=cfg[0];u.pitch=cfg[1];u.volume=1;
  const v=preferredFemaleVoice(lang);
  if(v&&femaleVoiceScore(v,lang)>-999)u.voice=v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
async function single(){const text=$("input").value.trim();if(!text)return;
if($("autoDetectLang")?.checked){
  const detected=detectLangByText(text);
  if(detected && detected!==from.value){
    if(detected===to.value){const x=from.value;from.value=to.value;to.value=x;}
    else from.value=detected;
  }
}v75State("⏳ 翻譯中…");$("out").textContent="翻譯中…";try{const x=await tr(text,from.value,to.value);$("out").textContent=x;v75State("✅ 翻譯完成");v75Center();speak(x,to.value)}catch{$("out").textContent=navigator.onLine?"翻譯暫時失敗":"目前離線"}}
$("go").onclick=single;$("input").oninput=()=>{if($("auto").checked){clearTimeout(t1);t1=setTimeout(single,850)}};$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x};$("audio").onclick=()=>{audio=true;const u=new SpeechSynthesisUtterance("女性語音已啟用");u.lang="zh-TW";u.rate=.88;u.pitch=1.08;const fv=preferredFemaleVoice("zh-TW");if(fv)u.voice=fv;speechSynthesis.speak(u);$("audio").textContent="✅ 語音已啟用"};
function mode(n){$("v1").hidden=n!==1;$("v2").hidden=n!==2;$("v3").hidden=n!==3;["m1","m2","m3"].forEach((x,i)=>$(x).classList.toggle("active",i===n-1))}$("m1").onclick=()=>mode(1);$("m2").onclick=()=>mode(2);$("m3").onclick=()=>mode(3);
const a=$("aLang"),b=$("bLang");a.innerHTML=opts("zh-TW");b.innerHTML=opts("ja-JP");$("swap2").onclick=()=>{const x=a.value;a.value=b.value;b.value=x};
async function tw(side){let A=side==="A";const inp=$(A?"aIn":"bIn"),box=$(A?"aOut":"bOut");let s=A?a.value:b.value,d=A?b.value:a.value,text=inp.value.trim();if(!text)return;
if($("autoDetectLang")?.checked){
 const detected=detectLangByText(text);
 if(detected){
   if(detected===b.value && A){A=false;s=b.value;d=a.value;}
   else if(detected===a.value && !A){A=true;s=a.value;d=b.value;}
 }
}box.textContent="翻譯中…";try{const x=await tr(text,s,d);box.textContent=x;audio=true;speak(x,d)}catch{box.textContent="翻譯失敗"}}$("aGo").onclick=()=>tw("A");$("bGo").onclick=()=>tw("B");$("aIn").oninput=()=>{clearTimeout(tA);tA=setTimeout(()=>tw("A"),950)};$("bIn").oninput=()=>{clearTimeout(tB);tB=setTimeout(()=>tw("B"),950)};
const fa=$("fa"),fb=$("fb");fa.innerHTML=opts("zh-TW");fb.innerHTML=opts("ja-JP");function labels(){$("faLabel").textContent="A 方 · "+LANGS[fa.value];$("fbLabel").textContent="B 方 · "+LANGS[fb.value]}labels();fa.onchange=labels;fb.onchange=labels;$("fswap").onclick=()=>{const x=fa.value;fa.value=fb.value;fb.value=x;labels()};
async function ft(side){const A=side==="A",inp=$(A?"faIn":"fbIn"),box=$(A?"fbOut":"faOut"),s=A?fa.value:fb.value,d=A?fb.value:fa.value,text=inp.value.trim();if(!text)return;box.textContent="翻譯中…";try{const x=await tr(text,s,d);box.textContent=x;audio=true;speak(x,d)}catch{box.textContent="翻譯失敗"}}$("faGo").onclick=()=>ft("A");$("fbGo").onclick=()=>ft("B");$("faIn").oninput=()=>{clearTimeout(tFA);tFA=setTimeout(()=>ft("A"),950)};$("fbIn").oninput=()=>{clearTimeout(tFB);tFB=setTimeout(()=>ft("B"),950)};$("full").onclick=async()=>{try{if(!document.fullscreenElement)await $("face").requestFullscreen?.();else await document.exitFullscreen?.()}catch{}};
