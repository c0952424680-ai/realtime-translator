const $=id=>document.getElementById(id);
const input=$("input"),output=$("output"),from=$("from"),to=$("to");
const statePill=$("statePill"),latency=$("latency"),engine=$("engine");
const debugText=$("debugText"),voiceUsed=$("voiceUsed");
const autoTranslate=$("autoTranslate"),autoSpeak=$("autoSpeak"),rateSel=$("rate");

const names={"zh-TW":"中文","en-US":"English","ja-JP":"日本語","ko-KR":"한국어","vi-VN":"Tiếng Việt","th-TH":"ไทย"};
let debounceTimer=null;
let requestSeq=0;
let voices=[];
let audioUnlocked=false;

function setState(t){statePill.textContent=t}
function log(t){debugText.textContent=t}
function clean(t){return t.replace(/\s+/g," ").trim()}

$("swap").addEventListener("click",()=>{
  const x=from.value;from.value=to.value;to.value=x;
  if(clean(input.value) && autoTranslate.checked) scheduleTranslate(100);
});

$("focusInput").addEventListener("click",()=>{
  input.focus();
  setState("請開始聽寫");
  log("鍵盤出現後，請按 iPhone 鍵盤上的 🎙️ 麥克風開始聽寫。");
});

input.addEventListener("input",()=>{
  setState("聽寫中");
  latency.textContent="正在接收文字…";
  if(autoTranslate.checked) scheduleTranslate(750);
});

function scheduleTranslate(ms){
  clearTimeout(debounceTimer);
  debounceTimer=setTimeout(()=>translateText(),ms);
}

async function translateText(){
  const text=clean(input.value);
  if(!text){output.textContent="尚未翻譯";return}
  if(from.value===to.value){output.textContent=text;if(autoSpeak.checked)speakCurrent();return}

  const seq=++requestSeq;
  const t0=performance.now();
  output.textContent="翻譯中…";
  setState("翻譯中");
  engine.textContent="整句翻譯";

  const sl=from.value.split("-")[0];
  const tl=to.value.split("-")[0];
  const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+encodeURIComponent(sl)+"&tl="+encodeURIComponent(tl)+"&dt=t&q="+encodeURIComponent(text);

  try{
    const r=await fetch(url,{cache:"no-store"});
    const d=await r.json();
    if(seq!==requestSeq)return;
    const result=Array.isArray(d?.[0])?d[0].map(x=>x?.[0]||"").join(""):"";
    output.textContent=result||"翻譯失敗";
    latency.textContent=((performance.now()-t0)/1000).toFixed(1)+" 秒";
    engine.textContent="整句翻譯完成";
    setState("完成");
    if(result && autoSpeak.checked) speakCurrent();
  }catch(e){
    if(seq!==requestSeq)return;
    output.textContent="翻譯服務暫時沒有回應";
    engine.textContent="翻譯失敗";
    setState("失敗");
  }
}

$("translate").addEventListener("click",translateText);

function loadVoices(){
  if(!("speechSynthesis" in window))return;
  voices=speechSynthesis.getVoices();
}
loadVoices();
if("speechSynthesis" in window) speechSynthesis.onvoiceschanged=loadVoices;

// iPhone 常見較自然女聲名稱；若裝置沒有則退回同語言系統聲音。
const preferredFemale={
  "zh-TW":["Mei-Jia","美佳","Ting-Ting","婷婷"],
  "ja-JP":["Kyoko","O-ren","Hattori"],
  "en-US":["Samantha","Ava","Allison","Susan","Zoe"],
  "ko-KR":["Yuna"],
  "vi-VN":["Linh","Thanh","HoaiMy"],
  "th-TH":["Kanya","Narisa","Kamon"]
};

function pickVoice(lang){
  loadVoices();
  const prefs=preferredFemale[lang]||[];
  for(const p of prefs){
    const v=voices.find(x=>x.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase()) && x.name.toLowerCase().includes(p.toLowerCase()));
    if(v)return v;
  }
  return voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())
      || voices.find(v=>v.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase()))
      || null;
}

function speakText(text,lang){
  if(!("speechSynthesis" in window)){log("此瀏覽器不支援語音播放。");return}
  if(!audioUnlocked){
    log("請先按一次「啟用自動語音」，iPhone 才允許後續自動播放。");
    return;
  }
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  const v=pickVoice(lang);
  u.lang=lang;
  if(v)u.voice=v;
  u.rate=Number(rateSel.value||0.88);
  u.volume=1;
  u.pitch=1.04;
  u.onstart=()=>{
    setState("播放中");
    voiceUsed.textContent=`${names[lang]} · ${v?.name||"系統女聲優先"}`;
  };
  u.onend=()=>setState("完成");
  u.onerror=e=>log("語音播放失敗："+(e.error||"unknown"));
  speechSynthesis.speak(u);
}

function speakCurrent(){
  const text=output.textContent.trim();
  if(!text || text==="尚未翻譯" || text==="翻譯中…")return;
  speakText(text,to.value);
}

$("speak").addEventListener("click",()=>{
  if(!audioUnlocked) audioUnlocked=true;
  speakCurrent();
});

$("stopSpeak").addEventListener("click",()=>{
  if("speechSynthesis" in window)speechSynthesis.cancel();
  setState("已停止");
});

$("unlockAudio").addEventListener("click",()=>{
  audioUnlocked=true;
  loadVoices();
  // 用極短、低音量測試句解鎖 iOS 使用者手勢限制
  const u=new SpeechSynthesisUtterance("語音已啟用");
  const v=pickVoice("zh-TW");
  u.lang="zh-TW"; if(v)u.voice=v; u.rate=.9;u.volume=1;
  u.onend=()=>{
    $("unlockAudio").textContent="✅ 自動語音已啟用";
    $("unlockAudio").disabled=true;
    voiceUsed.textContent=`已啟用 · ${v?.name||"系統語音"}`;
    log("自動語音已啟用。之後聽寫完成後會自動翻譯並朗讀。");
  };
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

$("clear").addEventListener("click",()=>{
  clearTimeout(debounceTimer);
  requestSeq++;
  input.value="";
  output.textContent="尚未翻譯";
  latency.textContent="等待輸入";
  engine.textContent="翻譯引擎待命";
  setState("待命");
  input.focus();
});

// V5 不再註冊 Service Worker，避免舊版快取干擾。
// 首次載入時主動移除舊 SW / Cache。
(async()=>{
  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch{}
})();
