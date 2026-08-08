const $=id=>document.getElementById(id);
const input=$("input"),output=$("output"),from=$("from"),to=$("to");
const latency=$("latency"),engine=$("engine"),historyBox=$("history"),netState=$("netState");
const cacheKey="rt_v3_cache", histKey="rt_v3_history";
let cache=JSON.parse(localStorage.getItem(cacheKey)||"{}");
let history=JSON.parse(localStorage.getItem(histKey)||"[]");

const offline={
 "zh-TW|ja-JP":{
   "你好":"こんにちは。","謝謝":"ありがとうございます。","多少錢":"いくらですか？",
   "我想去東京車站，但不知道在哪裡換車":"東京駅に行きたいのですが、どこで乗り換えればいいか分かりません。"
 },
 "zh-TW|en-US":{
   "你好":"Hello.","謝謝":"Thank you.","多少錢":"How much is it?",
   "我想去東京車站，但不知道在哪裡換車":"I want to go to Tokyo Station, but I don't know where to transfer."
 }
};

function updateNet(){
  const online=navigator.onLine;
  netState.textContent=online?"已連線":"離線";
  netState.style.background=online?"#e8f4ff":"#fff2d8";
  netState.style.color=online?"#0878d1":"#9a6400";
}
addEventListener("online",updateNet); addEventListener("offline",updateNet); updateNet();

$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x};
$("clear").onclick=()=>{input.value="";output.textContent="尚未翻譯";latency.textContent="等待翻譯"};

function key(text){return `${from.value}|${to.value}|${text}`}

async function callMyMemory(text){
  const pair=`${from.value.split("-")[0]}|${to.value.split("-")[0]}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const url="https://api.mymemory.translated.net/get?q="+encodeURIComponent(text)+"&langpair="+encodeURIComponent(pair);
    const r=await fetch(url,{signal:controller.signal,cache:"no-store"});
    const d=await r.json();
    return d.responseData?.translatedText||"";
  }finally{clearTimeout(timer)}
}

async function translate(){
  const text=input.value.trim();
  if(!text){output.textContent="請先輸入文字。";return}
  if(from.value===to.value){output.textContent=text;return}
  const t0=performance.now();
  const k=key(text);

  if(cache[k]){
    output.textContent=cache[k];
    engine.textContent="快取翻譯";
    latency.textContent=`⚡ ${Math.round(performance.now()-t0)} ms`;
    saveHistory(text,cache[k]);
    return;
  }

  const local=offline[`${from.value}|${to.value}`]?.[text];
  if(local){
    output.textContent=local;
    engine.textContent="本地快速詞庫";
    cache[k]=local; persistCache();
    latency.textContent=`⚡ ${Math.round(performance.now()-t0)} ms`;
    saveHistory(text,local);
    return;
  }

  if(!navigator.onLine){
    output.textContent="目前離線，這句尚未儲存在本地。";
    engine.textContent="離線";
    return;
  }

  output.textContent="翻譯中…";
  engine.textContent="網路翻譯";
  try{
    const result=await callMyMemory(text);
    if(!result) throw new Error("empty");
    output.textContent=result;
    cache[k]=result; persistCache();
    latency.textContent=`${((performance.now()-t0)/1000).toFixed(1)} 秒`;
    saveHistory(text,result);
  }catch(e){
    output.textContent="翻譯服務暫時無回應，請再按一次。";
    engine.textContent="連線逾時";
    latency.textContent="超過 6.5 秒";
  }
}
$("translate").onclick=translate;

function persistCache(){
  const entries=Object.entries(cache);
  if(entries.length>120) cache=Object.fromEntries(entries.slice(-120));
  localStorage.setItem(cacheKey,JSON.stringify(cache));
}
function saveHistory(src,dst){
  history.unshift({src,dst,time:Date.now()});
  history=history.slice(0,8);
  localStorage.setItem(histKey,JSON.stringify(history));
  renderHistory();
}
function renderHistory(){
  historyBox.innerHTML=history.length?history.map(x=>`<div class="history-item"><div class="src">${esc(x.src)}</div><div class="dst">${esc(x.dst)}</div></div>`).join(""):'<small>還沒有紀錄</small>';
}
function esc(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
renderHistory();

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null;
if(SR){
  rec=new SR();
  rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;
  rec.onstart=()=>{$("mic").textContent="⏹️ 聆聽中…"};
  rec.onresult=e=>{
    let text="";
    for(let i=e.resultIndex;i<e.results.length;i++) text+=e.results[i][0].transcript;
    input.value=text;
  };
  rec.onend=()=>{$("mic").textContent="🎙️ 語音輸入"};
  rec.onerror=e=>{$("mic").textContent="🎙️ 語音輸入";engine.textContent="語音辨識："+e.error};
  $("mic").onclick=()=>{rec.lang=from.value;try{rec.start()}catch{}};
}else{
  $("mic").onclick=()=>alert("目前 Safari 不支援網頁語音辨識，請先用文字輸入。");
}

let voices=[];
function loadVoices(){voices=speechSynthesis.getVoices()}
loadVoices();
if("speechSynthesis" in window) speechSynthesis.onvoiceschanged=loadVoices;
function bestVoice(lang){
  const l=lang.toLowerCase();
  return voices.find(v=>v.lang.toLowerCase()===l)||voices.find(v=>v.lang.toLowerCase().startsWith(l.split("-")[0]))||null;
}
$("speak").onclick=()=>{
  const text=output.textContent.trim();
  if(!text||["尚未翻譯","翻譯中…"].includes(text))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=to.value;
  const v=bestVoice(to.value); if(v)u.voice=v;
  u.rate=.95;u.volume=1;
  speechSynthesis.speak(u);
};
$("copy").onclick=async()=>{
  try{await navigator.clipboard.writeText(output.textContent);engine.textContent="已複製翻譯"}catch{}
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
