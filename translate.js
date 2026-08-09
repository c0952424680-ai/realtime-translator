
const from=$("from"),to=$("to"),input=$("input"),output=$("output");
from.innerHTML=options("zh-TW");to.innerHTML=options("ja-JP");
let voices=[],audioEnabled=false,singleTimer=null,aTimer=null,bTimer=null,history=[];

function setState(t){$("state").textContent=t}
async function translateApi(text,src,dst){
  if(src===dst)return text;
  const sl=src.split("-")[0],tl=dst.split("-")[0];
  const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+encodeURIComponent(sl)+"&tl="+encodeURIComponent(tl)+"&dt=t&q="+encodeURIComponent(text);
  const r=await fetch(url,{cache:"no-store"}); if(!r.ok)throw new Error("HTTP "+r.status);
  const d=await r.json(); return Array.isArray(d?.[0])?d[0].map(x=>x?.[0]||"").join(""):"";
}
function loadVoices(){if("speechSynthesis" in window)voices=speechSynthesis.getVoices()}
loadVoices();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=loadVoices;
const pref={"zh-TW":["Mei-Jia","Ting-Ting"],"en-US":["Samantha","Ava"],"ja-JP":["Kyoko"],"ko-KR":["Yuna"],"th-TH":["Kanya"],"vi-VN":["Linh"],"id-ID":["Damayanti"]};
function pickVoice(lang){loadVoices();const base=lang.split("-")[0].toLowerCase(),c=voices.filter(v=>(v.lang||"").toLowerCase().startsWith(base));for(const p of(pref[lang]||[])){const v=c.find(x=>(x.name||"").toLowerCase().includes(p.toLowerCase()));if(v)return v}return c[0]||null}
const voiceCfg={natural:[.90,1.04,"自然"],slow:[.78,1.02,"慢速"],clear:[.84,1.00,"清晰"]};
function speak(text,lang,onend){
  if(!audioEnabled||!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text),v=pickVoice(lang),cfg=voiceCfg[$("voiceMode").value]||voiceCfg.natural;
  u.lang=lang;if(v)u.voice=v;u.rate=cfg[0];u.pitch=cfg[1];u.volume=1;
  u.onstart=()=>{$("voiceUsed").textContent=(LANGS[lang]||lang)+" · "+cfg[2]+" · "+(v?.name||"系統語音")};
  if(onend)u.onend=onend;speechSynthesis.speak(u);
}
async function doSingle(){
  const text=input.value.trim();if(!text)return;setState("翻譯中");output.textContent="翻譯中…";
  try{const result=await translateApi(text,from.value,to.value);output.textContent=result||"翻譯失敗";setState("完成");if($("autoSpeak").checked)speak(result,to.value)}
  catch{output.textContent="翻譯服務暫時沒有回應";setState("失敗")}
}
input.addEventListener("input",()=>{if($("autoTranslate").checked){clearTimeout(singleTimer);singleTimer=setTimeout(doSingle,850)}});
$("translate").onclick=doSingle;$("clear").onclick=()=>{input.value="";output.textContent="尚未翻譯";setState("待命")};
$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x};
$("enableAudio").onclick=()=>{audioEnabled=true;const u=new SpeechSynthesisUtterance("語音已啟用");u.lang="zh-TW";speechSynthesis.speak(u);$("enableAudio").textContent="✅ 語音已啟用"};
$("play").onclick=()=>{audioEnabled=true;const t=output.textContent;if(t&&t!=="尚未翻譯"&&t!=="翻譯中…")speak(t,to.value)};

$("singleBtn").onclick=()=>{$("singleView").hidden=false;$("twoWayView").hidden=true;$("singleBtn").classList.add("active");$("twoWayBtn").classList.remove("active")};
$("twoWayBtn").onclick=()=>{$("singleView").hidden=true;$("twoWayView").hidden=false;$("twoWayBtn").classList.add("active");$("singleBtn").classList.remove("active")};

const langA=$("langA"),langB=$("langB"),inputA=$("inputA"),inputB=$("inputB");
langA.innerHTML=options("zh-TW");langB.innerHTML=options("ja-JP");
function labels(){$("labelA").textContent="A 方 · "+LANGS[langA.value];$("labelB").textContent="B 方 · "+LANGS[langB.value]}
labels();langA.onchange=labels;langB.onchange=labels;
$("swapAB").onclick=()=>{const x=langA.value;langA.value=langB.value;langB.value=x;labels()};

function addHistory(side,src,dst){
  history.unshift({side,src,dst,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});history=history.slice(0,40);
  $("history").innerHTML=history.map(h=>`<div class="bubble ${h.side==="A"?"a":"b"}"><div class="small">${h.side} 方 · ${h.time}</div><div>${esc(h.src)}</div><div class="translated">${esc(h.dst)}</div></div>`).join("");
}
async function doAB(side){
  const isA=side==="A",srcInput=isA?inputA:inputB,srcLang=isA?langA.value:langB.value,dstLang=isA?langB.value:langA.value;
  const resultBox=$(isA?"resultA":"resultB"),status=$(isA?"statusA":"statusB"),next=isA?inputB:inputA;
  const text=srcInput.value.trim();if(!text)return;status.textContent="翻譯中";resultBox.textContent="翻譯中…";
  try{
    const result=await translateApi(text,srcLang,dstLang);resultBox.textContent=result||"翻譯失敗";status.textContent="完成";addHistory(side,text,result);
    if($("autoSpeakAB").checked){audioEnabled=true;speak(result,dstLang,()=>{if($("autoSwitchAB").checked)setTimeout(()=>next.focus(),150)})}
    else if($("autoSwitchAB").checked)next.focus();
  }catch{resultBox.textContent="翻譯服務暫時沒有回應";status.textContent="失敗"}
}
$("goA").onclick=()=>doAB("A");$("goB").onclick=()=>doAB("B");$("focusA").onclick=()=>inputA.focus();$("focusB").onclick=()=>inputB.focus();
inputA.addEventListener("input",()=>{clearTimeout(aTimer);$("statusA").textContent="聽寫中";aTimer=setTimeout(()=>doAB("A"),950)});
inputB.addEventListener("input",()=>{clearTimeout(bTimer);$("statusB").textContent="聽寫中";bTimer=setTimeout(()=>doAB("B"),950)});
$("clearHistory").onclick=()=>{history=[];$("history").innerHTML='<span class="small">尚無紀錄</span>'};
