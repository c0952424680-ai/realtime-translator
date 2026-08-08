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
  "vi-VN":"Tiếng Việt","mn-MN":"Монгол"
};

const keyboardHints={
  "zh-TW":"請切換到中文鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。",
  "en-US":"請切換到 English 鍵盤，再按 iPhone 鍵盤上的 🎙️ Dictation。",
  "ja-JP":"請切換到日本語鍵盤，再按 iPhone 鍵盤上的 🎙️ 音声入力。",
  "ko-KR":"請切換到한국어鍵盤，再按 iPhone 鍵盤上的 🎙️ 받아쓰기。",
  "th-TH":"請切換到ไทย鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。",
  "vi-VN":"請切換到Tiếng Việt鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。",
  "mn-MN":"若 iPhone 已安裝蒙古文鍵盤，請切換後使用鍵盤聽寫；若系統無聽寫支援，可直接輸入文字。"
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
  "vi-VN":["Linh","HoaiMy","Vietnamese"],
  "mn-MN":["Mongolian"]
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

const safetyData={
  "th":{
    country:"泰國",office:"駐泰國代表處（駐泰國台北經濟文化辦事處）",
    phone:"+66-2-1193555",emergency:"+66-81-6664006",
    address:"40/64 Vibhavadi-Rangsit 66, Laksi, 10210 Bangkok, Thailand",
    hours:"一般辦公：週一至週五 09:00–17:00",
    consular:"領務櫃台：週一至週五 09:00–11:30；電話諮詢 09:00–12:30、13:30–17:00",
    email:"tha@mofa.gov.tw",website:"https://www.taiwanembassy.org/th/",
    source:"中華民國外交部",lang:"th-TH"
  },
  "vn-hn":{
    country:"越南－北部／河內",office:"駐越南代表處（駐越南台北經濟文化辦事處）",
    phone:"+84-24-38335501",emergency:"+84-913219986",
    address:"20A/21st Floor, PVI Tower, No.1, Pham Van Bach Road, Cau Giay Ward, Hanoi, Vietnam",
    hours:"週一至週五 08:30–12:00、13:30–17:30",
    consular:"領務申辦時間依駐越南代表處官方最新公告",
    email:"vnm@mofa.gov.tw",website:"https://www.taiwanembassy.org/vn/index.html",
    source:"中華民國外交部",lang:"vi-VN"
  },
  "vn-hcm":{
    country:"越南－南部／胡志明市",office:"駐胡志明市辦事處（駐胡志明市台北經濟文化辦事處）",
    phone:"+84-28-38349160",emergency:"+84-903927019",
    address:"336 Nguyễn Tri Phương, Phường Vườn Lài, TP.Hồ Chí Minh, Việt Nam",
    hours:"週一至週五 08:00–12:00、13:30–17:30",
    consular:"領務：08:00–11:30、13:30–16:00；週六、日及越南國定假日停止辦公",
    email:"tecohcmc@mofa.gov.tw",website:"https://www.roc-taiwan.org/vnsgn/",
    source:"中華民國外交部",lang:"vi-VN"
  },
  "my":{
    country:"馬來西亞",office:"駐馬來西亞代表處（駐馬來西亞台北經濟文化辦事處）",
    phone:"+60-3-21614439",emergency:"+60-19-6569912",
    address:"Level 7, Menara Yayasan Tun Razak, 200, Jalan Bukit Bintang 55100 Kuala Lumpur, Malaysia",
    hours:"週一至週五 09:00–12:30、13:30–17:30",
    consular:"送件 09:00–12:00；取件 14:00–17:00；例假日及國定假日不開放",
    email:"mys@mofa.gov.tw",website:"https://www.taiwanembassy.org/my",
    source:"中華民國外交部",lang:"ms-MY"
  },
  "sg":{
    country:"新加坡",office:"駐新加坡代表處（駐新加坡台北代表處）",
    phone:"+65-65000100",emergency:"+65-96389436",
    address:"460 Alexandra Road #23-00, mTower, Singapore 119963",
    hours:"週一至週五 09:00–17:00；週末及國定假日休息",
    consular:"遞件 09:00–11:30；取件 13:30–16:00",
    email:"sgp@mofa.gov.tw",website:"https://www.taiwanembassy.org/sg",
    source:"中華民國外交部",lang:"en-US"
  },
  "id-jkt":{
    country:"印尼－雅加達及轄區",office:"駐印尼代表處（駐印尼臺北經濟貿易代表處）",
    phone:"+62-21-5153939",emergency:"+62-811-984676",
    address:"12th, 16th and 17th Floor, Gedung Artha Graha, Jl. Jend. Sudirman Kav. 52-53, Jakarta 12190, Indonesia",
    hours:"週一至週五 08:30–17:30",
    consular:"領務對外：08:30–11:30、13:30–15:30；領事事務請至12樓",
    email:"idn@mofa.gov.tw",website:"https://www.roc-taiwan.org/id/",
    source:"中華民國外交部",lang:"id-ID"
  },
  "id-sub":{
    country:"印尼－泗水／峇里島等轄區",office:"駐泗水辦事處（駐泗水臺北經濟貿易辦事處）",
    phone:"+62-31-99014600",emergency:"+62-822-5766-9680",
    address:"Jalan Indragiri No.49, Surabaya 60241, Indonesia",
    hours:"領務服務：週一至週五 08:30–11:30、13:30–16:00",
    consular:"下班後及假日急難專線：+62-822-5766-9680",
    email:"sub@mofa.gov.tw",website:"https://www.roc-taiwan.org/idsub/index.html",
    source:"中華民國外交部",lang:"id-ID"
  },
  "ph":{
    country:"菲律賓",office:"駐菲律賓代表處（駐菲律賓臺北經濟文化辦事處）",
    phone:"+63-2-88876688",emergency:"+63-917-8194597",
    address:"41F, Tower 1, RCBC Plaza, 6819 Ayala Avenue, Makati City 1200, Metro Manila, Philippines",
    hours:"週一至週五 08:30–12:30、13:30–17:30",
    consular:"收件 08:45–11:45；發件 13:45–16:45（例假日除外）",
    email:"phl@mofa.gov.tw",website:"https://www.roc-taiwan.org/ph/",
    source:"中華民國外交部",lang:"fil-PH"
  },
  "jp-tokyo":{
    country:"日本－東京／東日本",office:"駐日本代表處（台北駐日經濟文化代表處）",
    phone:"+81-3-32807811",emergency:"+81-80-10097179",emergency2:"+81-80-10097436",
    address:"東京都港区白金台5-20-2",
    hours:"週一至週五 09:00–12:00、13:00–18:00",
    consular:"領務 09:00–11:30、13:00–16:00；週五現場採網路預約制",
    email:"information@mofa.gov.tw",website:"https://www.roc-taiwan.org/jp",
    source:"中華民國外交部",lang:"ja-JP"
  },
  "jp-osaka":{
    country:"日本－大阪／關西等轄區",office:"駐大阪辦事處（台北駐大阪經濟文化辦事處）",
    phone:"+81-6-62278623",emergency:"+81-90-87944568",
    address:"Nakanoshima Festival Tower 17F & 19F, 3-18-2 Nakanoshima, Kita-ku, Osaka 530-0005, Japan",
    hours:"行政時間：週一至週五 09:00–12:00、13:00–18:00",
    consular:"受理 09:00–11:00、13:00–14:30；取件 09:00–11:30、13:00–15:00",
    email:"teco-osa@mofa.gov.tw",website:"https://www.taiwanembassy.org/jposa/",
    source:"中華民國外交部",lang:"ja-JP"
  },
  "jp-fukuoka":{
    country:"日本－福岡／九州",office:"駐福岡辦事處（台北駐大阪經濟文化辦事處福岡分處）",
    phone:"+81-92-7342810",emergency:"+81-90-19229740",
    address:"日本福岡縣福岡市中央區櫻坂3-12-42",
    hours:"週一至週五 09:00–12:00、13:00–18:00",
    consular:"收件 09:00–11:30；取件 13:00–15:00（下午原則不受理收件）",
    email:"fuk@mofa.gov.tw",website:"https://www.roc-taiwan.org/jpfuk/index.html",
    source:"中華民國外交部",lang:"ja-JP"
  },
  "jp-sapporo":{
    country:"日本－北海道",office:"駐札幌辦事處（台北駐日經濟文化代表處札幌分處）",
    phone:"+81-11-2222930",emergency:"+81-80-14602568",
    address:"北海道札幌市中央區北4條西4丁目1番地 伊藤大樓5樓",
    hours:"週一至週五 09:00–12:00、13:00–18:00",
    consular:"領務 10:00–12:00、13:30–15:30",
    email:"spk@mofa.gov.tw",website:"https://www.roc-taiwan.org/jpokd/",
    source:"中華民國外交部",lang:"ja-JP"
  },
  "jp-naha":{
    country:"日本－沖繩",office:"駐那霸辦事處（台北駐日經濟文化代表處那霸分處）",
    phone:"+81-98-8627008",emergency:"+81-80-80560122",
    address:"日本沖縄県那覇市久茂地3-15-9 アルテビル那覇6階",
    hours:"週一至週五 09:00–12:00、13:00–18:00",
    consular:"領務收件 09:00–11:30、13:00–17:00；各項申請需事先預約",
    email:"tecooka@mofa.gov.tw",website:"https://www.roc-taiwan.org/jpna/index.html",
    source:"中華民國外交部",lang:"ja-JP"
  },
  "kr-seoul":{
    country:"韓國－首爾及北／中部轄區",office:"駐韓國代表處（駐韓國台北代表部）",
    phone:"+82-2-63296000",emergency:"+82-10-90802761",
    address:"6F, Gwanghwamun Building, 149 Sejong-daero, Jongno-gu, Seoul 03186, Republic of Korea",
    hours:"領務受理：週一至週五 09:00–11:30、13:30–15:30",
    consular:"簽證等領務業務請撥代表電話後按領務組（分機1）",
    email:"kor@mofa.gov.tw",website:"https://www.roc-taiwan.org/kr/index.html",
    source:"中華民國外交部",lang:"ko-KR"
  },
  "kr-busan":{
    country:"韓國－釜山／南部及濟州",office:"駐釜山辦事處（駐韓國台北代表部釜山辦事處）",
    phone:"+82-51-4637965",emergency:"+82-10-45377961",
    address:"9F, Dongwon Industrial Building, 70, Jungang-daero, Jung-gu, Busan 48941, Republic of Korea",
    hours:"領務櫃檯：週一至週五 09:00–11:30；13:30–14:30僅接受事前預約",
    consular:"週休二日、韓國國定假日及中華民國國慶日不對外開放",
    email:"pus@mofa.gov.tw",website:"https://www.roc-taiwan.org/krpus/",
    source:"中華民國外交部",lang:"ko-KR"
  },
  "mn-ub":{
    country:"蒙古－烏蘭巴托",office:"駐蒙古代表處（駐烏蘭巴托台北貿易經濟代表處）",
    phone:"+976-11-328705",emergency:"+976-99091213",
    address:"3F, Taiwan Center, Tourist Street No.38, Chingeltei District, P.O.Box-1269, Ulaanbaatar-13, Mongolia",
    hours:"週一至週五 09:00–13:00、14:00–18:00",
    consular:"領務申辦請於12:00以前抵達排隊；其他洽公事項請先電話預約",
    email:"tteromn@mofa.gov.tw",website:"https://www.roc-taiwan.org/mn/",
    source:"中華民國外交部",lang:"mn-MN"
  }
};

function telHref(n){return "tel:"+n.replace(/[^\d+]/g,"")}
function mapsHref(address){return "https://maps.apple.com/?q="+encodeURIComponent(address)}

function renderSafetyOffice(){
  const d=safetyData[$("safetyCountry").value];
  const secondEmergency=d.emergency2
    ? '<div class="meta">🆘 備用急難電話：'+d.emergency2+'</div>'
    : '';

  $("officeCard").innerHTML=
    "<h3>"+d.office+"</h3>"+
    '<div class="meta">🌏 地區：'+d.country+"</div>"+
    '<div class="meta">📍 官方館址：'+d.address+"</div>"+
    '<div class="meta">☎️ 辦公室：'+d.phone+"</div>"+
    '<div class="meta">🆘 急難電話：'+d.emergency+"</div>"+
    secondEmergency+
    '<div class="meta">🕘 服務時間：'+d.hours+"</div>"+
    '<div class="meta">🪪 領務時間／說明：'+d.consular+"</div>"+
    '<div class="meta">✉️ 官方信箱：'+d.email+"</div>"+
    '<div class="office-actions">'+
      '<a href="'+telHref(d.phone)+'">☎️ 辦公室電話</a>'+
      '<a class="emergency" href="'+telHref(d.emergency)+'">🆘 急難電話</a>'+
      '<a href="'+mapsHref(d.address)+'" target="_blank" rel="noopener">📍 Apple 導航</a>'+
      '<a href="'+d.website+'" target="_blank" rel="noopener">🏛️ 官方網站</a>'+
      '<a href="mailto:'+d.email+'">✉️ 官方 Email</a>'+
      '<a href="tel:+886800085095">🇹🇼 外交部緊急中心</a>'+
    "</div>"+
    '<small>資料來源：中華民國外交部官方駐外館處資料｜查核日期：2026-08-09。服務時間遇當地或我國假日可能調整，出發或前往前請再點「官方網站」確認當日公告。</small>';
}
$("safetyCountry").addEventListener("change",renderSafetyOffice);
renderSafetyOffice();

async function translateEmergencyPhrase(){
  const d=safetyData[$("safetyCountry").value];
  const sourceText=$("emergencyPhrase").selectedOptions[0].textContent;
  const tl=d.lang.split("-")[0];
  const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl="+encodeURIComponent(tl)+"&dt=t&q="+encodeURIComponent(sourceText);
  $("emergencyOutput").textContent="翻譯中…";
  try{
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok) throw new Error("HTTP "+response.status);
    const data=await response.json();
    const result=Array.isArray(data?.[0])?data[0].map(x=>x?.[0]||"").join(""):"";
    $("emergencyOutput").textContent=result||sourceText;
  }catch(e){
    $("emergencyOutput").textContent=sourceText;
    log("緊急翻譯暫時無法連線；已顯示中文原文。");
  }
}
$("translateEmergency").addEventListener("click",translateEmergencyPhrase);
$("emergencyPhrase").addEventListener("change",translateEmergencyPhrase);
$("safetyCountry").addEventListener("change",translateEmergencyPhrase);
$("speakEmergency").addEventListener("click",()=>{
  const d=safetyData[$("safetyCountry").value];
  const text=$("emergencyOutput").textContent.trim();
  if(text && text!=="翻譯中…" && text!=="請先選擇句子"){
    audioUnlocked=true;
    speakText(text,d.lang);
  }
});
translateEmergencyPhrase();
