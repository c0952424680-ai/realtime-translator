
const from=$("from"),to=$("to");
from.innerHTML=opts("zh-TW");
to.innerHTML=opts("ja-JP");

let audioOn=false;
let voices=[];
let timer=null;
let timerA=null,timerB=null;
let faceTimerA=null,faceTimerB=null;

const TR_CACHE_KEY="rt_v74_translate_cache";

function getTranslateCache(){
  try{return JSON.parse(localStorage.getItem(TR_CACHE_KEY)||"{}")}catch{return{}}
}
function setTranslateCache(key,value){
  const c=getTranslateCache();
  c[key]={v:value,time:Date.now()};
  const keys=Object.keys(c).sort((a,b)=>(c[b].time||0)-(c[a].time||0)).slice(0,60);
  const trimmed={};
  keys.forEach(k=>trimmed[k]=c[k]);
  localStorage.setItem(TR_CACHE_KEY,JSON.stringify(trimmed));
}
async function fetchWithTimeout(url,ms=8000){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),ms);
  try{
    return await fetch(url,{cache:"no-store",signal:controller.signal});
  }finally{
    clearTimeout(timeout);
  }
}
async function tr(text,src,dst){
  if(src===dst)return text;
  const key=src+"|"+dst+"|"+text.trim();
  const cached=getTranslateCache()[key];
  if(cached && Date.now()-cached.time<7*86400000)return cached.v;

  const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+
    encodeURIComponent(src.split("-")[0])+
    "&tl="+encodeURIComponent(dst.split("-")[0])+
    "&dt=t&q="+encodeURIComponent(text);

  const attempts=$("translationMode")?.value==="stable"?2:1;
  let lastErr=null;
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetchWithTimeout(url,8000);
      if(!r.ok)throw new Error("HTTP "+r.status);
      const j=await r.json();
      const result=Array.isArray(j?.[0])?j[0].map(x=>x?.[0]||"").join(""):"";
      if(result)setTranslateCache(key,result);
      return result;
    }catch(e){
      lastErr=e;
    }
  }
  throw lastErr||new Error("翻譯失敗");
}

function loadVoices(){
  if("speechSynthesis" in window)voices=speechSynthesis.getVoices();
}
loadVoices();
if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=loadVoices;

function speak(text,lang,onend){
  if(!audioOn||!text||!("speechSynthesis" in window))return;
  const mode=$("voiceMode")?.value||"natural";
  const cfg={natural:[.90,1.04],slow:[.78,1.02],clear:[.84,1.00]}[mode];
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang;u.rate=cfg[0];u.pitch=cfg[1];u.volume=1;

  const base=lang.split("-")[0].toLowerCase();
  const candidate=voices.find(v=>(v.lang||"").toLowerCase().startsWith(base));
  if(candidate)u.voice=candidate;

  if(onend)u.onend=onend;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

async function singleTranslate(){
  const text=$("input").value.trim();
  if(!text)return;
  $("out").textContent="翻譯中…";
  try{
    const result=await tr(text,from.value,to.value);
    $("out").textContent=result||"翻譯失敗";
    if($("autos").checked)speak(result,to.value);
  }catch(e){
    $("out").textContent=navigator.onLine?"翻譯服務暫時沒有回應":"目前離線；最近翻譯可能仍可使用";
  }
}

$("go").onclick=singleTranslate;
$("input").oninput=()=>{
  if($("autot").checked){
    clearTimeout(timer);
    timer=setTimeout(singleTranslate,850);
  }
};
$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x};
$("audio").onclick=()=>{
  audioOn=true;
  const u=new SpeechSynthesisUtterance("語音已啟用");
  u.lang="zh-TW";
  speechSynthesis.speak(u);
  $("audio").textContent="✅ 語音已啟用";
};

// mode switching
function mode(n){
  $("single").hidden=n!==1;
  $("two").hidden=n!==2;
  $("face").hidden=n!==3;
  ["m1","m2","m3"].forEach((id,i)=>$(id).classList.toggle("active",i===n-1));
}
$("m1").onclick=()=>mode(1);
$("m2").onclick=()=>mode(2);
$("m3").onclick=()=>mode(3);

// two-way
const a=$("aLang"),b=$("bLang");
a.innerHTML=opts("zh-TW");
b.innerHTML=opts("ja-JP");
$("swap2").onclick=()=>{const x=a.value;a.value=b.value;b.value=x};

async function tw(side){
  const isA=side==="A";
  const inp=$(isA?"aIn":"bIn");
  const box=$(isA?"aOut":"bOut");
  const src=isA?a.value:b.value;
  const dst=isA?b.value:a.value;
  const text=inp.value.trim();
  if(!text)return;
  box.textContent="翻譯中…";
  try{
    const result=await tr(text,src,dst);
    box.textContent=result||"翻譯失敗";
    audioOn=true;
    speak(result,dst);
  }catch{
    box.textContent=navigator.onLine?"翻譯失敗":"目前離線";
  }
}
$("aGo").onclick=()=>tw("A");
$("bGo").onclick=()=>tw("B");
$("aIn").oninput=()=>{clearTimeout(timerA);timerA=setTimeout(()=>tw("A"),950)};
$("bIn").oninput=()=>{clearTimeout(timerB);timerB=setTimeout(()=>tw("B"),950)};

// face-to-face
const fa=$("fa"),fb=$("fb");
fa.innerHTML=opts("zh-TW");
fb.innerHTML=opts("ja-JP");

function labels(){
  $("faLabel").textContent="A 方 · "+LANGS[fa.value];
  $("fbLabel").textContent="B 方 · "+LANGS[fb.value];
}
labels();
fa.onchange=labels;
fb.onchange=labels;
$("fswap").onclick=()=>{const x=fa.value;fa.value=fb.value;fb.value=x;labels()};

async function faceTranslate(side){
  const isA=side==="A";
  const inp=$(isA?"faIn":"fbIn");
  const box=$(isA?"fbOut":"faOut");
  const src=isA?fa.value:fb.value;
  const dst=isA?fb.value:fa.value;
  const text=inp.value.trim();
  if(!text)return;
  box.textContent="翻譯中…";
  try{
    const result=await tr(text,src,dst);
    box.textContent=result||"翻譯失敗";
    audioOn=true;
    speak(result,dst);
  }catch{
    box.textContent=navigator.onLine?"翻譯失敗":"目前離線";
  }
}
$("faGo").onclick=()=>faceTranslate("A");
$("fbGo").onclick=()=>faceTranslate("B");
$("faIn").oninput=()=>{clearTimeout(faceTimerA);faceTimerA=setTimeout(()=>faceTranslate("A"),950)};
$("fbIn").oninput=()=>{clearTimeout(faceTimerB);faceTimerB=setTimeout(()=>faceTranslate("B"),950)};

$("faceFullscreen").onclick=async()=>{
  const stage=document.querySelector(".face");
  try{
    if(!document.fullscreenElement)await stage.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }catch{}
};
