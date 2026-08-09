
const from=$("from"),to=$("to"),input=$("input"),output=$("output");
from.innerHTML=buildLangOptions("zh-TW");to.innerHTML=buildLangOptions("ja-JP");

const statePill=$("statePill"),latency=$("latency"),engine=$("engine"),voiceUsed=$("voiceUsed");
const autoTranslate=$("autoTranslate"),autoSpeak=$("autoSpeak"),voiceMode=$("voiceMode");
let timer=null,seq=0,voices=[],audioUnlocked=false;

const hints={
"zh-TW":"請切換中文鍵盤後使用 🎙️ 聽寫。","en-US":"請切換 English 鍵盤後使用 Dictation。",
"ja-JP":"請切換日本語鍵盤後使用音声入力。","ko-KR":"請切換 한국어 鍵盤後使用聽寫。",
"th-TH":"請切換 ไทย 鍵盤後使用聽寫。","vi-VN":"請切換 Tiếng Việt 鍵盤後使用聽寫。"
};
function hint(){ $("keyboardHint").textContent=hints[from.value]||"請切換至對應語言鍵盤；若 iPhone 不支援該語言聽寫，可直接輸入文字。"; }
hint();
from.addEventListener("change",hint);
$("swap").addEventListener("click",()=>{let x=from.value;from.value=to.value;to.value=x;hint()});
$("focusInput").addEventListener("click",()=>input.focus());
input.addEventListener("input",()=>{statePill.textContent="聽寫中";latency.textContent="接收文字…";if(autoTranslate.checked){clearTimeout(timer);timer=setTimeout(translateText,800)}});

async function apiTranslate(text,sourceLang,targetLang){
  const sl=sourceLang.split("-")[0],tl=targetLang.split("-")[0];
  const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+encodeURIComponent(sl)+"&tl="+encodeURIComponent(tl)+"&dt=t&q="+encodeURIComponent(text);
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const d=await r.json();
  return Array.isArray(d?.[0])?d[0].map(x=>x?.[0]||"").join(""):"";
}

async function translateText(){
  const text=input.value.trim(); if(!text)return;
  if(from.value===to.value){output.textContent=text;if(autoSpeak.checked)speakCurrent();return}
  const mySeq=++seq,t0=performance.now(); output.textContent="翻譯中…";statePill.textContent="翻譯中";
  try{
    const result=await apiTranslate(text,from.value,to.value); if(mySeq!==seq)return;
    output.textContent=result||"翻譯失敗";latency.textContent=((performance.now()-t0)/1000).toFixed(1)+" 秒";engine.textContent="整句翻譯完成";statePill.textContent="完成";
    if(result&&autoSpeak.checked)speakCurrent();
  }catch(e){output.textContent="翻譯服務暫時沒有回應";statePill.textContent="失敗"}
}
$("translate").addEventListener("click",translateText);

function loadVoices(){if("speechSynthesis" in window)voices=speechSynthesis.getVoices()}
loadVoices();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=loadVoices;
const preferred={"zh-TW":["Mei-Jia","Ting-Ting"],"en-US":["Samantha","Ava"],"ja-JP":["Kyoko"],"ko-KR":["Yuna"],"th-TH":["Kanya"],"vi-VN":["Linh"],"id-ID":["Damayanti"]};
function pickVoice(lang){loadVoices();const base=lang.split("-")[0].toLowerCase(),c=voices.filter(v=>(v.lang||"").toLowerCase().startsWith(base));for(const p of (preferred[lang]||[])){const v=c.find(x=>(x.name||"").toLowerCase().includes(p.toLowerCase()));if(v)return v}return c[0]||null}
const modes={natural:{rate:.90,pitch:1.04,label:"自然"},slow:{rate:.78,pitch:1.02,label:"慢速"},clear:{rate:.84,pitch:1,label:"清晰"}};
function speakText(text,lang,modeName="natural",onEnd){
  if(!audioUnlocked)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text),v=pickVoice(lang),m=modes[modeName]||modes.natural;
  u.lang=lang;if(v)u.voice=v;u.rate=m.rate;u.pitch=m.pitch;u.volume=1;
  u.onstart=()=>{if(voiceUsed)voiceUsed.textContent=(LANGS[lang]||lang)+" · "+m.label+" · "+(v?.name||"系統語音")};
  if(onEnd)u.onend=onEnd;
  speechSynthesis.speak(u);
}
function speakCurrent(){const t=output.textContent.trim();if(t&&t!=="尚未翻譯"&&t!=="翻譯中…")speakText(t,to.value,voiceMode.value)}
$("speak").addEventListener("click",()=>{audioUnlocked=true;speakCurrent()});
$("stopSpeak").addEventListener("click",()=>speechSynthesis.cancel());
$("unlockAudio").addEventListener("click",()=>{audioUnlocked=true;const u=new SpeechSynthesisUtterance("語音已啟用");u.lang="zh-TW";u.onend=()=>{$("unlockAudio").textContent="✅ 自動語音已啟用";$("unlockAudio").disabled=true};speechSynthesis.speak(u)});
$("clear").addEventListener("click",()=>{seq++;input.value="";output.textContent="尚未翻譯";latency.textContent="等待輸入";engine.textContent="翻譯引擎待命"});

const singleMode=$("singleMode"),conversationMode=$("conversationMode");
$("singleModeBtn").addEventListener("click",()=>{singleMode.hidden=false;conversationMode.hidden=true;$("singleModeBtn").classList.add("active");$("conversationModeBtn").classList.remove("active")});
$("conversationModeBtn").addEventListener("click",()=>{singleMode.hidden=true;conversationMode.hidden=false;$("conversationModeBtn").classList.add("active");$("singleModeBtn").classList.remove("active")});

const langA=$("langA"),langB=$("langB"),inputA=$("inputA"),inputB=$("inputB"),resultA=$("resultA"),resultB=$("resultB");
langA.innerHTML=buildLangOptions("zh-TW");langB.innerHTML=buildLangOptions("ja-JP");
const conversationAutoSpeak=$("conversationAutoSpeak"),autoFlip=$("autoFlip"),conversationVoiceMode=$("conversationVoiceMode");
let timerA=null,timerB=null,history=[];

function updateLabels(){
  $("speakerALabel").textContent="A 方 · "+(LANGS[langA.value]||langA.value);
  $("speakerBLabel").textContent="B 方 · "+(LANGS[langB.value]||langB.value);
}
updateLabels();langA.addEventListener("change",updateLabels);langB.addEventListener("change",updateLabels);
$("swapConversation").addEventListener("click",()=>{const x=langA.value;langA.value=langB.value;langB.value=x;updateLabels()});

function addHistory(side,sourceText,translatedText){
  history.unshift({side,sourceText,translatedText,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});
  history=history.slice(0,30);renderHistory();
}
function renderHistory(){
  const box=$("conversationHistory");
  if(!history.length){box.innerHTML="<small>尚無對話紀錄。</small>";return}
  box.innerHTML=history.map(h=>`<div class="history-bubble ${h.side==="A"?"from-a":"from-b"}"><div class="history-meta">${h.side} 方 · ${h.time}</div><div>${escapeHtml(h.sourceText)}</div><div class="history-translation">${escapeHtml(h.translatedText)}</div></div>`).join("");
}
$("clearConversation").addEventListener("click",()=>{history=[];renderHistory()});

async function translateConversation(side){
  const isA=side==="A";
  const srcInput=isA?inputA:inputB;
  const srcLang=isA?langA.value:langB.value;
  const dstLang=isA?langB.value:langA.value;
  const dstResult=isA?resultA:resultB;
  const status=$(isA?"speakerAStatus":"speakerBStatus");
  const text=srcInput.value.trim(); if(!text)return;
  status.textContent="翻譯中…";dstResult.textContent="翻譯中…";
  try{
    const result=srcLang===dstLang?text:await apiTranslate(text,srcLang,dstLang);
    dstResult.textContent=result||"翻譯失敗";status.textContent="完成";
    addHistory(side,text,result);
    if(conversationAutoSpeak.checked&&result){
      audioUnlocked=true;
      speakText(result,dstLang,conversationVoiceMode.value,()=>{
        if(autoFlip.checked)setTimeout(()=>(isA?inputB:inputA).focus(),120);
      });
    }else if(autoFlip.checked){
      (isA?inputB:inputA).focus();
    }
  }catch(e){dstResult.textContent="翻譯服務暫時沒有回應";status.textContent="失敗"}
}
$("translateA").addEventListener("click",()=>translateConversation("A"));
$("translateB").addEventListener("click",()=>translateConversation("B"));
$("focusA").addEventListener("click",()=>inputA.focus());
$("focusB").addEventListener("click",()=>inputB.focus());
inputA.addEventListener("input",()=>{clearTimeout(timerA);$("speakerAStatus").textContent="聽寫中";timerA=setTimeout(()=>translateConversation("A"),900)});
inputB.addEventListener("input",()=>{clearTimeout(timerB);$("speakerBStatus").textContent="聽寫中";timerB=setTimeout(()=>translateConversation("B"),900)});
