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
  "zh-TW":"中文","en-US":"English","ja-JP":"日本語","ko-KR":"한국어",
  "th-TH":"ไทย","vi-VN":"Tiếng Việt","ms-MY":"Bahasa Melayu",
  "id-ID":"Bahasa Indonesia","fil-PH":"Filipino","km-KH":"ខ្មែរ",
  "lo-LA":"ລາວ","my-MM":"မြန်မာ","ta-IN":"தமிழ்","mn-MN":"Монгол"
};

const keyboardHints={
  "zh-TW":"請切換到中文鍵盤，再按 iPhone 鍵盤上的 🎙️ 聽寫。",
  "en-US":"請切換到 English 鍵盤，再按 iPhone 鍵盤上的 🎙️ Dictation。",
  "ja-JP":"請切換到日本語鍵盤，再使用 iPhone 鍵盤聽寫。",
  "ko-KR":"請切換到 한국어 鍵盤，再使用 iPhone 鍵盤聽寫。",
  "th-TH":"請切換到 ไทย（泰文）鍵盤，再使用 iPhone 鍵盤聽寫。",
  "vi-VN":"請切換到 Tiếng Việt（越南文）鍵盤，再使用 iPhone 鍵盤聽寫。",
  "ms-MY":"請切換到 Bahasa Melayu（馬來文）鍵盤；若無聽寫支援可直接輸入文字。",
  "id-ID":"請切換到 Bahasa Indonesia（印尼文）鍵盤；若無聽寫支援可直接輸入文字。",
  "fil-PH":"請切換到 Filipino（菲律賓文）鍵盤；若無聽寫支援可直接輸入文字。",
  "km-KH":"請切換到 ខ្មែរ（高棉文）鍵盤；若無聽寫支援可直接輸入文字。",
  "lo-LA":"請切換到 ລາວ（寮文）鍵盤；若無聽寫支援可直接輸入文字。",
  "my-MM":"請切換到 မြန်မာ（緬甸文）鍵盤；若無聽寫支援可直接輸入文字。",
  "ta-IN":"請切換到 தமிழ்（坦米爾文）鍵盤；若無聽寫支援可直接輸入文字。",
  "mn-MN":"若 iPhone 已安裝蒙古文鍵盤請切換後使用；若無聽寫支援可直接輸入文字。"
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
  "ja-JP":["Kyoko","O-ren","Hattori"],"ko-KR":["Yuna"],
  "th-TH":["Kanya","Narisa","Thai"],"vi-VN":["Linh","HoaiMy","Vietnamese"],
  "ms-MY":["Amira","Malay"],"id-ID":["Damayanti","Indonesian"],
  "fil-PH":["Filipino","Tagalog"],"km-KH":["Khmer"],"lo-LA":["Lao"],
  "my-MM":["Burmese"],"ta-IN":["Veena","Tamil"],"mn-MN":["Mongolian"]
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
  },
  "kh":{
    country:"柬埔寨",office:"駐胡志明市辦事處（兼轄柬埔寨）",
    phone:"+84-28-38349160",emergency:"+84-903927019",
    address:"336 Nguyễn Tri Phương, Phường Vườn Lài, TP.Hồ Chí Minh, Việt Nam",
    hours:"週一至週五 08:00–12:00、13:30–17:30",
    consular:"柬埔寨由駐胡志明市台北經濟文化辦事處兼轄；重大急難使用急難專線",
    email:"tecohcmc@mofa.gov.tw",website:"https://www.roc-taiwan.org/vnsgn/",
    source:"中華民國外交部",lang:"km-KH"
  },
  "la":{
    country:"寮國",office:"駐越南代表處（兼轄寮國）",
    phone:"+84-24-38335501",emergency:"+84-913219986",
    address:"20A/21st Floor, PVI Tower, No.1, Pham Van Bach Road, Cau Giay Ward, Hanoi, Vietnam",
    hours:"週一至週五 08:30–12:00、13:30–17:30",
    consular:"寮國由駐越南台北經濟文化辦事處兼理；重大急難使用急難專線",
    email:"vnm@mofa.gov.tw",website:"https://www.taiwanembassy.org/vn/index.html",
    source:"中華民國外交部",lang:"lo-LA"
  },
  "mm":{
    country:"緬甸",office:"駐緬甸代表處（駐緬甸臺北經濟文化辦事處）",
    phone:"+95-9-427355550",emergency:"+95-9-257257575",
    address:"No. 97/101(A), Dhammazedi Road, Kamayut Township, Yangon, Myanmar",
    hours:"週一至週五 08:30–12:30、13:30–17:30",
    consular:"領務收件 09:00–11:30；取件 13:30–15:00",
    email:"mmr@mofa.gov.tw",website:"https://www.roc-taiwan.org/mm/",
    source:"中華民國外交部",lang:"my-MM"
  },
  "bn":{
    country:"汶萊",office:"駐汶萊代表處（駐汶萊臺北經濟文化辦事處）",
    phone:"+673-2455482",emergency:"+673-8956338",
    address:"No. 3, Lot 57775, Simpang 120, Jalan Sungai Akar, Bandar Seri Begawan, BC3915, Brunei Darussalam",
    hours:"週一至週四 08:00–12:00、13:00–17:00；週五 08:00–12:00、14:00–17:00",
    consular:"領務申辦時間同服務時間（國定假日除外）",
    email:"brn@mofa.gov.tw",website:"https://www.roc-taiwan.org/bn/index.html",
    source:"中華民國外交部",lang:"ms-MY"
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


const localEmergencyData={

  "kh":{
    title:"🇰🇭 柬埔寨當地緊急服務",
    note:"柬埔寨電信監管機關官方公布的全國緊急短碼。",
    items:[
      {label:"👮 警察",number:"117",detail:"Police"},
      {label:"🚒🔥 消防",number:"118",detail:"Fire Fighter"},
      {label:"🚑 救護車",number:"119",detail:"Ambulance"}
    ],
    verified:"Telecommunication Regulator of Cambodia（柬埔寨電信監管機關）"
  },
  "bn":{
    title:"🇧🇳 汶萊當地緊急服務",
    note:"汶萊政府官方緊急電話。",
    items:[
      {label:"🚑 救護車",number:"991",detail:"Ambulance / EMAS"},
      {label:"👮 警察",number:"993",detail:"Police"},
      {label:"🚒🔥 消防與救援",number:"995",detail:"Fire & Rescue"},
      {label:"🛟 搜索與救援",number:"998",detail:"Search & Rescue"},
      {label:"ℹ️ Darussalam Line",number:"123",detail:"政府公共服務熱線"}
    ],
    verified:"Brunei Ministry of Health / E-Government National Centre / Fire & Rescue Department"
  },

  "my":{
    title:"🇲🇾 馬來西亞當地緊急服務",
    note:"NG999／999 為全國整合緊急號碼，可轉接警察、消防、衛生部醫療、海事及民防。",
    items:[
      {label:"🚨 警察／消防／救護／重大急難",number:"999",detail:"NG999 全國整合緊急服務"},
      {label:"👮 馬來西亞皇家警察控制中心",number:"+60322663333",detail:"另有 +60 3 2031 9999；立即危險仍優先撥 999"}
    ],
    verified:"馬來西亞政府 Malaysia.gov.my、Royal Malaysia Police"
  },
  "sg":{
    title:"🇸🇬 新加坡當地緊急服務",
    note:"新加坡政府官方緊急號碼。",
    items:[
      {label:"👮 警察緊急",number:"999",detail:"Police Emergencies"},
      {label:"🚒🔥 消防／緊急救護車",number:"995",detail:"SCDF Ambulance and Fire Service"},
      {label:"🚑 非緊急救護車",number:"1777",detail:"Non-Emergency Ambulance Service"},
      {label:"📱 警察緊急簡訊",number:"70999",detail:"Police Emergency SMS；此按鈕僅顯示號碼，不自動發簡訊"}
    ],
    verified:"Singapore Government gov.sg"
  },
  "ph":{
    title:"🇵🇭 菲律賓當地緊急服務",
    note:"Unified 911 為全國單一緊急熱線，整合警察、消防、緊急醫療、救援與地方政府。",
    items:[
      {label:"🚨 全國警察／消防／醫療／救援",number:"911",detail:"Unified 911；政府公告為全國整合緊急服務"}
    ],
    verified:"Philippine DILG / Philippine Information Agency"
  },
  "id-jkt":{
    title:"🇮🇩 印尼－雅加達當地緊急服務",
    note:"印尼警察 110、衛生部 PSC 119；雅加達政府 112 提供消防與救援等緊急服務。",
    items:[
      {label:"👮 印尼國家警察",number:"110",detail:"Polri Call Center，免費"},
      {label:"🚑 醫療急救",number:"119",detail:"印尼衛生部 Public Safety Center (PSC) 119"},
      {label:"🚒🔥 雅加達消防／救援",number:"112",detail:"DKI Jakarta 官方緊急號碼，24/7"}
    ],
    verified:"POLRI、印尼衛生部、DKI Jakarta Fire & Rescue"
  },
  "id-sub":{
    title:"🇮🇩 印尼－泗水／峇里島等地",
    note:"全國可使用警察 110 與醫療 PSC 119。地方消防／救援號碼可能依城市不同，App 不用未逐市查核的號碼取代官方資料。",
    items:[
      {label:"👮 印尼國家警察",number:"110",detail:"Polri Call Center，免費、24 小時"},
      {label:"🚑 醫療急救",number:"119",detail:"印尼衛生部 Public Safety Center (PSC) 119"}
    ],
    verified:"POLRI、印尼衛生部"
  }
};

function renderLocalEmergency(){
  const key=$("safetyCountry").value;
  const d=localEmergencyData[key];
  const box=$("localEmergencyCard");
  if(!d){
    const key=$("safetyCountry").value;
    const special=(key==="la"||key==="mm")
      ? "目前未找到足以交叉確認的當地政府官方緊急號碼頁面。為避免在真正急難時提供錯誤電話，本版只顯示已查核的台灣駐外館處急難聯絡方式。"
      : "此地區的政府緊急服務資料尚未完成本版逐項查核。為避免誤導，不顯示未確認號碼。";
    box.innerHTML='<h3>🚨 當地警察／消防／醫療</h3><div class="meta">'+special+'</div>';
    return;
  }
  box.innerHTML='<h3>'+d.title+'</h3>'+
    '<div class="meta">'+d.note+'</div>'+
    d.items.map(x=>'<div class="emergency-service-row"><div><b>'+x.label+'</b><small>'+x.detail+'</small></div><a href="'+telHref(x.number)+'">'+x.number+'</a></div>').join("")+
    '<small>官方查核來源：'+d.verified+'｜查核日：2026-08-09</small>';
}
$("safetyCountry").addEventListener("change",renderLocalEmergency);
renderLocalEmergency();


const dangerData={
  "mm":{
    country:"緬甸 Myanmar",
    updated:"外交部更新：2026-04-09／2026-04-10",
    tags:["戰爭／武裝衝突","治安","人口販運","毒品犯罪","電信詐騙"],
    advisories:[
      {
        level:"red",
        title:"第四級紅色：儘速離境／切勿前往",
        area:"克欽邦、欽邦、克耶邦、克倫邦、實皆省、若開邦、撣邦北部、馬圭省、曼德勒省北部、孟邦，以及外交部公告之德林達依省、勃固省部分地區",
        detail:"外交部指出這些地區涉及武裝衝突，且部分地區有人口及毒品走私、電信詐騙等犯罪聚集，並可能非政府公權力有效管轄區。"
      },
      {
        level:"orange",
        title:"第三級橙色：避免前往",
        area:"奈比都、撣邦南部及東部，以及外交部公告之德林達依省、曼德勒省、勃固省、伊洛瓦底省部分地區",
        detail:"屬武裝衝突交戰潛在風險地區，外交部呼籲切勿前往滯留。"
      }
    ],
    health:[
      "健康風險請另查衛福部疾管署國際旅遊疫情；戰爭／犯罪警示不能用疾病風險取代。"
    ],
    sourceName:"外交部領事事務局",
    sourceUrl:"https://www.boca.gov.tw/sp-trwa-print-2993-cab72-1.html"
  },
  "kh":{
    country:"柬埔寨 Cambodia",
    updated:"外交部更新：2025-12-16／2025-12-19",
    tags:["戰爭／邊境衝突","詐騙","限制人身自由","治安"],
    advisories:[
      {
        level:"red",
        title:"第四級紅色：儘速離境／切勿前往",
        area:"柏威夏省、奧多棉芷省、班達棉芷省、馬德望省、菩薩省、國公省",
        detail:"外交部指出柬泰邊境軍事衝突曾涉及戰機、重砲、裝甲車、無人機及地雷，已造成平民死傷與大規模撤離。"
      },
      {
        level:"orange",
        title:"第三級橙色：避免非必要旅行",
        area:"柬埔寨整體及特別是柬泰邊境",
        detail:"外交部另警示近年有國人受網路高薪工作廣告誘騙赴柬，之後遭限制人身自由的求助案件。"
      }
    ],
    health:[
      "東南亞常見蚊媒傳染病與飲食衛生風險，請出發前查看疾管署國際旅遊疫情。"
    ],
    sourceName:"外交部領事事務局",
    sourceUrl:"https://www.boca.gov.tw/sp-trwa-content-2920-e5076-1.html"
  },
  "th":{
    country:"泰國 Thailand",
    updated:"外交部更新：2026-01-15；疾管署資料查核：2026-08-09",
    tags:["邊境武裝風險","治安","疾病","蚊媒傳染病"],
    advisories:[
      {
        level:"orange",
        title:"第三級橙色：避免前往",
        area:"烏汶府、四色菊府、素林府、武里喃府、沙繳府、達勒府、尖竹汶府之泰柬邊境高風險區域",
        detail:"外交部提醒避免前往泰柬邊境50公里內相關地區，並隨時注意泰國政府最新公告。"
      },
      {
        level:"yellow",
        title:"第二級黃色：提高警覺",
        area:"泰國其他地區",
        detail:"外交部提醒留意周遭環境、人身與財務安全，並避免進入橙色警示邊境地區。"
      }
    ],
    health:[
      "疾管署目前列出泰國 M痘、登革熱、麻疹、瘧疾、屈公病、茲卡病毒感染症等第一級注意（Watch）旅遊疫情建議。",
      "建議防蚊、注意飲食與飲水衛生，並依疾管署建議評估旅遊疫苗／預防藥物。"
    ],
    sourceName:"外交部領事事務局／衛福部疾管署",
    sourceUrl:"https://www.boca.gov.tw/sp-trwa-print-2936-ae708-1.html"
  },
  "mn":{
    country:"蒙古 Mongolia",
    updated:"疾管署資料查核：2026-08-09",
    tags:["疾病","環境／動物接觸"],
    advisories:[
      {
        level:"gray",
        title:"本版未標示戰爭紅／橙區",
        area:"蒙古",
        detail:"危險區標示以外交部最新旅遊警示為準；本卡主要提示目前可確認之健康風險。"
      }
    ],
    health:[
      "疾管署列有麻疹第一級注意（Watch）。",
      "疾管署國際重要疫情資料另列蒙古流行性腦脊髓膜炎、炭疽病及鼠疫等事件，應避免接觸病死動物並注意官方衛生公告。"
    ],
    sourceName:"衛福部疾病管制署",
    sourceUrl:"https://www.cdc.gov.tw/InternationalTravel/Print?Type=full&cid=550"
  }
};

function renderDanger(){
  const d=dangerData[$("dangerCountry").value];
  const tags=d.tags.map(x=>'<span class="risk-tag">'+x+'</span>').join("");
  const adv=d.advisories.map(x=>
    '<div class="risk-item">'+
      '<div class="risk-banner '+x.level+'">'+x.title+'</div>'+
      '<b>📍 '+x.area+'</b>'+
      '<small>'+x.detail+'</small>'+
    '</div>'
  ).join("");
  const health=d.health.map(x=>
    '<div class="risk-item"><div class="risk-banner health">🦠 健康／衛生提醒</div><small>'+x+'</small></div>'
  ).join("");

  $("dangerCard").innerHTML=
    '<div class="danger-card">'+
      '<h3>'+d.country+'</h3>'+
      '<div class="meta">🕘 '+d.updated+'</div>'+
      '<div class="risk-tags">'+tags+'</div>'+
      adv+health+
      '<div class="office-actions">'+
        '<a href="'+d.sourceUrl+'" target="_blank" rel="noopener">🏛️ 查看官方最新警示</a>'+
        '<a href="https://www.cdc.gov.tw/TravelEpidemic/" target="_blank" rel="noopener">🦠 疾管署國際疫情</a>'+
      '</div>'+
      '<small>來源：'+d.sourceName+'。本頁只整理官方已發布內容，不依網路傳聞自行判定危險區。</small>'+
    '</div>';
}
$("dangerCountry").addEventListener("change",renderDanger);
renderDanger();


const weatherAgencyData={
  "th":{name:"Thai Meteorological Department（泰國氣象局）",url:"https://www.tmd.go.th/en",hazards:"熱帶風暴、季風豪雨、洪水、高溫、雷暴"},
  "vn":{name:"National Center for Hydro-Meteorological Forecasting（越南國家水文氣象預報中心）",url:"https://nchmf.gov.vn/",hazards:"颱風、豪雨、洪水、土石流、高溫"},
  "my":{name:"MET Malaysia（馬來西亞氣象局）",url:"https://www.met.gov.my/",hazards:"豪雨、雷暴、洪水、高溫、煙霾"},
  "sg":{name:"Meteorological Service Singapore（新加坡氣象署）",url:"https://www.weather.gov.sg/",hazards:"雷暴、豪雨、淹水、高溫、煙霾"},
  "id":{name:"BMKG（印尼氣象氣候暨地球物理局）",url:"https://www.bmkg.go.id/",hazards:"地震、海嘯、火山相關資訊、豪雨、洪水、強風"},
  "ph":{name:"PAGASA（菲律賓大氣地球物理和天文服務管理局）",url:"https://www.pagasa.dost.gov.ph/",hazards:"颱風、風暴潮、豪雨、洪水、高溫"},
  "kh":{name:"Cambodia Ministry of Water Resources and Meteorology（柬埔寨水資源暨氣象部）",url:"https://www.mowram.gov.kh/",hazards:"季風豪雨、洪水、高溫"},
  "la":{name:"Department of Meteorology and Hydrology, Lao PDR（寮國氣象水文局）",url:"https://dmh.gov.la/",hazards:"豪雨、洪水、熱帶風暴、高溫"},
  "mm":{name:"Department of Meteorology and Hydrology Myanmar（緬甸氣象水文局）",url:"https://www.moezala.gov.mm/",hazards:"氣旋、豪雨、洪水、高溫、地震"},
  "bn":{name:"Brunei Darussalam Meteorological Department（汶萊氣象局）",url:"https://www.met.gov.bn/",hazards:"雷暴、豪雨、淹水、高溫"},
  "jp":{name:"Japan Meteorological Agency（日本氣象廳）",url:"https://www.jma.go.jp/jma/indexe.html",hazards:"颱風、豪雨、地震、海嘯、火山、大雪、高溫"},
  "kr":{name:"Korea Meteorological Administration（韓國氣象廳）",url:"https://www.weather.go.kr/w/index.do",hazards:"颱風、豪雨、大雪、高溫、寒害"},
  "mn":{name:"NAMEM Mongolia（蒙古國氣象與環境監測機關）",url:"https://namem.gov.mn/",hazards:"極端低溫、暴風雪、沙塵暴、草原火災"}
};

function renderWeatherSafety(){
  const d=weatherAgencyData[$("weatherCountry").value];
  $("weatherSafetyCard").innerHTML=
    "<h3>"+d.name+"</h3>"+
    '<div class="meta">⚠️ 常見重大天氣／環境風險：'+d.hazards+"</div>"+
    '<div class="office-actions">'+
      '<a href="'+d.url+'" target="_blank" rel="noopener">🌦️ 官方天氣／警報</a>'+
      '<a href="https://www.boca.gov.tw/sp-trwa-list-1.html" target="_blank" rel="noopener">🇹🇼 外交部旅遊警示</a>'+
    "</div>"+
    '<small>天氣可能快速變化；遇颱風、洪水、地震、火山、海嘯或極端高溫時，請以所在地政府即時警報與撤離命令為準。</small>';
}
$("weatherCountry").addEventListener("change",renderWeatherSafety);
renderWeatherSafety();

const CONTACTS_KEY="rt_v66_emergency_contacts";

function loadContacts(){
  try{return JSON.parse(localStorage.getItem(CONTACTS_KEY)||"[]")}catch{return []}
}
function saveContacts(list){
  localStorage.setItem(CONTACTS_KEY,JSON.stringify(list));
}
function renderContacts(){
  const list=loadContacts();
  const box=$("contactList");

  if(!list.length){
    box.innerHTML='<small>尚未儲存緊急聯絡人。</small>';
    return;
  }

  box.innerHTML=list.map((c,i)=>
    '<div class="contact-item">'+
      '<h3>'+(i+1)+'. '+escapeHtml(c.name)+'</h3>'+
      '<div class="meta">關係／單位：'+escapeHtml(c.relation||"未填")+'</div>'+
      '<div class="meta">事項：'+escapeHtml(c.matter)+'</div>'+
      '<div class="meta">電話：'+escapeHtml(c.phone)+'</div>'+
      (c.note?'<div class="meta">備註：'+escapeHtml(c.note)+'</div>':"")+
      '<div class="contact-actions">'+
        '<a class="call" href="tel:'+c.phone.replace(/[^\d+]/g,"")+'">☎️ 撥打</a>'+
        '<button type="button" data-delete-contact="'+i+'">刪除</button>'+
      '</div>'+
    '</div>'
  ).join("");

  box.querySelectorAll("[data-delete-contact]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const arr=loadContacts();
      arr.splice(Number(btn.dataset.deleteContact),1);
      saveContacts(arr);
      renderContacts();
    });
  });
}
function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
$("saveContact").addEventListener("click",()=>{
  const name=$("contactName").value.trim();
  const phone=$("contactPhone").value.trim();

  if(!name||!phone){
    log("請至少填寫聯絡人姓名與電話。");
    return;
  }

  const list=loadContacts();
  list.push({
    name,
    relation:$("contactRelation").value.trim(),
    phone,
    matter:$("contactMatter").value,
    note:$("contactNote").value.trim()
  });
  saveContacts(list);

  $("contactName").value="";
  $("contactRelation").value="";
  $("contactPhone").value="";
  $("contactNote").value="";
  renderContacts();
  log("緊急聯絡人已儲存在這台裝置。");
});
$("clearContacts").addEventListener("click",()=>{
  if(confirm("確定清除全部緊急聯絡人？")){
    localStorage.removeItem(CONTACTS_KEY);
    renderContacts();
  }
});
renderContacts();
