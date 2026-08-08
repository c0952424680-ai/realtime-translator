const $=id=>document.getElementById(id);

const input=$("input");
const output=$("output");
const from=$("from");
const to=$("to");
const statePill=$("statePill");
const latency=$("latency");
const engine=$("engine");
const debugText=$("debugText");
const voiceUsed=$("voiceUsed");
const autoTranslate=$("autoTranslate");
const autoSpeak=$("autoSpeak");
const voiceMode=$("voiceMode");
const keyboardHint=$("keyboardHint");
const unlockAudio=$("unlockAudio");

const names={
  "zh-TW":"中文",
  "en-US":"English",
  "ja-JP":"日本語",
  "ko-KR":"한국어",
  "th-TH":"ไทย",
  "vi-VN":"Tiếng Việt"
};

const keyboardHints={
  "zh-TW":"請切換到中文鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。",
  "en-US":"請切換到 English 鍵盤，再按 iPhone 鍵盤上的 🎙️ Dictation。",
  "ja-JP":"請切換到日本語鍵盤，再按 iPhone 鍵盤上的 🎙️ 音声入力。",
  "ko-KR":"請切換到한국어鍵盤，再按 iPhone 鍵盤上的 🎙️ 받아쓰기。",
  "th-TH":"請切換到ไทย鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。",
  "vi-VN":"請切換到Tiếng Việt鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。"
};

let debounceTimer=null;
let requestSeq=0;
let voices=[];
let audioUnlocked=false;

function setState(text){
  statePill.textContent=text;
}

function log(text){
  debugText.textContent=text;
}

function clean(text){
  return text.replace(/\s+/g," ").trim();
}

function updateKeyboardHint(){
  keyboardHint.textContent=keyboardHints[from.value]||"請切換到對應語言鍵盤後使用聽寫。";
}

from.addEventListener("change",()=>{
  updateKeyboardHint();

  if(clean(input.value) && autoTranslate.checked){
    scheduleTranslate(120);
  }
});

$("swap").addEventListener("click",()=>{
  const temp=from.value;
  from.value=to.value;
  to.value=temp;

  updateKeyboardHint();

  if(clean(input.value) && autoTranslate.checked){
    scheduleTranslate(120);
  }
});

$("focusInput").addEventListener("click",()=>{
  input.focus();
  setState("請開始聽寫");
  log(keyboardHints[from.value]);
});

input.addEventListener("input",()=>{
  setState("聽寫中");
  latency.textContent="正在接收文字…";

  if(autoTranslate.checked){
    scheduleTranslate(800);
  }
});

function scheduleTranslate(delay){
  clearTimeout(debounceTimer);
  debounceTimer=setTimeout(()=>translateText(),delay);
}

async function translateText(){
  const text=clean(input.value);

  if(!text){
    output.textContent="尚未翻譯";
    engine.textContent="翻譯引擎待命";
    return;
  }

  if(from.value===to.value){
    output.textContent=text;
    latency.textContent="同語言";
    engine.textContent="不需翻譯";
    setState("完成");

    if(autoSpeak.checked){
      speakCurrent();
    }

    return;
  }

  const seq=++requestSeq;
  const t0=performance.now();

  output.textContent="翻譯中…";
  engine.textContent="整句翻譯";
  setState("翻譯中");

  const sl=from.value.split("-")[0];
  const tl=to.value.split("-")[0];

  const url=
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl="+
    encodeURIComponent(sl)+
    "&tl="+encodeURIComponent(tl)+
    "&dt=t&q="+encodeURIComponent(text);

  try{
    const response=await fetch(url,{cache:"no-store"});

    if(!response.ok){
      throw new Error("HTTP "+response.status);
    }

    const data=await response.json();

    if(seq!==requestSeq){
      return;
    }

    const result=Array.isArray(data?.[0])
      ? data[0].map(item=>item?.[0]||"").join("")
      : "";

    if(!result){
      throw new Error("沒有翻譯結果");
    }

    output.textContent=result;
    latency.textContent=((performance.now()-t0)/1000).toFixed(1)+" 秒";
    engine.textContent="整句翻譯完成";
    setState("完成");

    if(autoSpeak.checked){
      speakCurrent();
    }

  }catch(error){
    if(seq!==requestSeq){
      return;
    }

    output.textContent="翻譯服務暫時沒有回應";
    engine.textContent="翻譯失敗";
    setState("失敗");
    log("翻譯錯誤："+error.message);
  }
}

$("translate").addEventListener("click",translateText);

function loadVoices(){
  if(!("speechSynthesis" in window)){
    return;
  }

  voices=speechSynthesis.getVoices();
}

loadVoices();

if("speechSynthesis" in window){
  speechSynthesis.onvoiceschanged=loadVoices;
}

const preferredFemale={
  "zh-TW":["Mei-Jia","美佳","Ting-Ting","婷婷"],
  "en-US":["Samantha","Ava","Allison","Susan","Zoe"],
  "ja-JP":["Kyoko","O-ren","Hattori"],
  "ko-KR":["Yuna"],
  "th-TH":["Kanya","Narisa","Thai"],
  "vi-VN":["Linh","HoaiMy","Vietnamese"]
};

function pickVoice(lang){
  loadVoices();

  const base=lang.split("-")[0].toLowerCase();

  const candidates=voices.filter(voice=>{
    const voiceLang=(voice.lang||"").toLowerCase();

    return voiceLang===lang.toLowerCase() ||
      voiceLang.startsWith(base);
  });

  const preferences=preferredFemale[lang]||[];

  for(const preferredName of preferences){
    const matched=candidates.find(voice=>
      (voice.name||"").toLowerCase().includes(preferredName.toLowerCase())
    );

    if(matched){
      return matched;
    }
  }

  return candidates[0]||null;
}

const voiceSettings={
  natural:{rate:0.90,pitch:1.04,label:"自然"},
  slow:{rate:0.78,pitch:1.02,label:"慢速"},
  clear:{rate:0.84,pitch:1.00,label:"清晰"}
};

function speakText(text,lang){
  if(!("speechSynthesis" in window)){
    log("此瀏覽器不支援語音播放。");
    return;
  }

  if(!audioUnlocked){
    log("第一次請先按「啟用自動語音」，iPhone 才允許後續自動播放。");
    return;
  }

  speechSynthesis.cancel();
  loadVoices();

  const utterance=new SpeechSynthesisUtterance(text);
  const selectedVoice=pickVoice(lang);
  const mode=voiceSettings[voiceMode.value]||voiceSettings.natural;

  utterance.lang=lang;

  if(selectedVoice){
    utterance.voice=selectedVoice;
  }

  utterance.rate=mode.rate;
  utterance.pitch=mode.pitch;
  utterance.volume=1;

  utterance.onstart=()=>{
    setState("播放中");

    voiceUsed.textContent=
      names[lang]+
      " · "+
      mode.label+
      " · "+
      (selectedVoice?.name||"系統同語言聲音");
  };

  utterance.onend=()=>{
    setState("完成");
  };

  utterance.onerror=event=>{
    setState("播放失敗");
    log("語音播放失敗："+(event.error||"unknown"));
  };

  speechSynthesis.speak(utterance);
}

function speakCurrent(){
  const text=output.textContent.trim();

  if(!text || text==="尚未翻譯" || text==="翻譯中…"){
    return;
  }

  speakText(text,to.value);
}

$("speak").addEventListener("click",()=>{
  audioUnlocked=true;
  speakCurrent();
});

$("stopSpeak").addEventListener("click",()=>{
  if("speechSynthesis" in window){
    speechSynthesis.cancel();
  }

  setState("已停止");
});

unlockAudio.addEventListener("click",()=>{
  if(!("speechSynthesis" in window)){
    log("這個瀏覽器不支援語音播放。");
    return;
  }

  audioUnlocked=true;
  loadVoices();

  const utterance=new SpeechSynthesisUtterance("語音已啟用");
  const selectedVoice=pickVoice("zh-TW");

  utterance.lang="zh-TW";

  if(selectedVoice){
    utterance.voice=selectedVoice;
  }

  utterance.rate=0.88;
  utterance.pitch=1.02;
  utterance.volume=1;

  utterance.onend=()=>{
    unlockAudio.textContent="✅ 自動語音已啟用";
    unlockAudio.disabled=true;

    voiceUsed.textContent=
      "已啟用 · "+
      (selectedVoice?.name||"系統同語言聲音");

    log("自動語音已啟用。之後翻譯完成會嘗試自動朗讀。");
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
});

$("clear").addEventListener("click",()=>{
  clearTimeout(debounceTimer);
  requestSeq++;

  input.value="";
  output.textContent="尚未翻譯";
  latency.textContent="等待輸入";
  engine.textContent="翻譯引擎待命";
  voiceUsed.textContent="尚未選擇語音";

  setState("待命");
  input.focus();
});

updateKeyboardHint();

(async()=>{
  try{
    if("serviceWorker" in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration=>registration.unregister()));
    }

    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(key=>caches.delete(key)));
    }
  }catch(error){
    console.warn("清理舊快取失敗",error);
  }
})();