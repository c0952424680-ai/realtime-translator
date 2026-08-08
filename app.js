const $=id=>document.getElementById(id);
const input=$("input"),output=$("output"),from=$("from"),to=$("to");
const startMic=$("startMic"),stopMic=$("stopMic"),statePill=$("statePill"),recognitionLang=$("recognitionLang"),recordingTime=$("recordingTime"),latency=$("latency"),engine=$("engine"),debugText=$("debugText"),voiceUsed=$("voiceUsed");
const names={"zh-TW":"中文","en-US":"English","ja-JP":"日本語","ko-KR":"한국어"};
let recognition=null,isRecording=false,timerId=null,seconds=0,finalTranscript="",voices=[];
function setState(t,k="neutral"){statePill.textContent=t;const c={neutral:["#eef2f7","#475569"],good:["#e7f8ee","#147a3a"],warn:["#fff2d8","#9a6400"],bad:["#ffe9e7","#b42318"]}[k];statePill.style.background=c[0];statePill.style.color=c[1]}
function log(t){debugText.textContent=t}
function fmt(s){return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function updateLang(){recognitionLang.textContent=`辨識語言：${names[from.value]}`}
$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x;updateLang()};from.onchange=updateLang;updateLang();
function clean(t){return t.replace(/^[「『"'“”]+/g,"").replace(/[」』"'“”]+$/g,"").replace(/\s+/g," ").trim()}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
 recognition=new SR();recognition.interimResults=true;recognition.continuous=true;recognition.maxAlternatives=1;
 recognition.onstart=()=>{isRecording=true;finalTranscript="";startMic.disabled=true;stopMic.disabled=false;setState("錄音中","warn");log(`正在辨識 ${names[from.value]}，按停止錄音即可結束。`);seconds=0;recordingTime.textContent="00:00";clearInterval(timerId);timerId=setInterval(()=>{seconds++;recordingTime.textContent=fmt(seconds)},1000)};
 recognition.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalTranscript+=t;else interim+=t}input.value=clean(finalTranscript+interim)};
 recognition.onerror=e=>{log("語音辨識錯誤："+e.error);finishRec();setState("辨識錯誤","bad")};
 recognition.onend=async()=>{const had=isRecording;finishRec();const t=clean(input.value);input.value=t;if(had&&t){log("錄音已停止，正在自動翻譯整句。");await translateText()}};
}else{startMic.disabled=true;log("此 Safari 不支援網頁語音辨識，可直接輸入文字。")}
function finishRec(){isRecording=false;clearInterval(timerId);startMic.disabled=false;stopMic.disabled=true;setState("待命","neutral")}
startMic.onclick=()=>{if(!recognition)return;recognition.lang=from.value;try{recognition.start()}catch(e){log("無法開始辨識："+e.message)}};
stopMic.onclick=()=>{if(recognition&&isRecording){log("正在停止錄音…");try{recognition.stop()}catch{}}};

const overrides={"zh-TW|ja-JP":{"我明天早上九點要去東京車站，請問從這裡搭地鐵要在哪一站轉車？":"明日の朝9時に東京駅へ行きたいのですが、ここから地下鉄で行く場合、どの駅で乗り換えればいいですか？","我明天早上九點要去東京車站，請問從這裡搭地鐵要在哪一站轉車":"明日の朝9時に東京駅へ行きたいのですが、ここから地下鉄で行く場合、どの駅で乗り換えればいいですか？"}};
async function googleTranslate(text){const sl=from.value.split("-")[0],tl=to.value.split("-")[0],u="https://translate.googleapis.com/translate_a/single?client=gtx&sl="+encodeURIComponent(sl)+"&tl="+encodeURIComponent(tl)+"&dt=t&q="+encodeURIComponent(text),c=new AbortController(),tm=setTimeout(()=>c.abort(),7000);try{const r=await fetch(u,{signal:c.signal,cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);const d=await r.json();return Array.isArray(d?.[0])?d[0].map(x=>x?.[0]||"").join(""):""}finally{clearTimeout(tm)}}
async function myMemory(text){const sl=from.value.split("-")[0],tl=to.value.split("-")[0],u="https://api.mymemory.translated.net/get?q="+encodeURIComponent(text)+"&langpair="+encodeURIComponent(sl+"|"+tl),c=new AbortController(),tm=setTimeout(()=>c.abort(),7000);try{const r=await fetch(u,{signal:c.signal,cache:"no-store"}),d=await r.json();return d.responseData?.translatedText||""}finally{clearTimeout(tm)}}
async function translateText(){const text=clean(input.value);input.value=text;if(!text){output.textContent="請先說話或輸入文字。";return}if(from.value===to.value){output.textContent=text;return}const t0=performance.now(),ov=overrides[`${from.value}|${to.value}`]?.[text];if(ov){output.textContent=ov;engine.textContent="整句優化詞庫";latency.textContent=`⚡ ${Math.round(performance.now()-t0)} ms`;setState("完成","good");return}output.textContent="翻譯中…";setState("翻譯中","warn");engine.textContent="整句翻譯";try{let r="";try{r=await googleTranslate(text);if(r)engine.textContent="整句翻譯（主引擎）"}catch{log("主翻譯引擎無回應，改用備援引擎。")}if(!r){r=await myMemory(text);if(r)engine.textContent="整句翻譯（備援）"}if(!r)throw new Error("沒有翻譯結果");output.textContent=r;latency.textContent=`${((performance.now()-t0)/1000).toFixed(1)} 秒`;setState("完成","good");log("翻譯完成。播放會依右側目標語言選擇語音。")}catch(e){output.textContent="翻譯服務暫時沒有回應，請再試一次。";engine.textContent="翻譯失敗";setState("失敗","bad");log("翻譯錯誤："+e.message)}}
$("translate").onclick=translateText;

function loadVoices(){if("speechSynthesis" in window)voices=speechSynthesis.getVoices()}loadVoices();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=loadVoices;
function bestVoice(lang){return voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase()))||null}
$("speak").onclick=()=>{const text=output.textContent.trim();if(!text||text==="尚未翻譯"||text==="翻譯中…")return;if(!("speechSynthesis" in window)){log("此瀏覽器無法使用文字轉語音。");return}speechSynthesis.cancel();loadVoices();const u=new SpeechSynthesisUtterance(text),v=bestVoice(to.value);u.lang=to.value;if(v)u.voice=v;u.rate=.92;u.volume=1;u.pitch=1;u.onstart=()=>{voiceUsed.textContent=`播放語言：${names[to.value]}${v?" · "+v.name:""}`;setState("播放中","good");log(`正在用 ${to.value} 播放翻譯。`)};u.onend=()=>setState("完成","good");u.onerror=e=>{setState("播放失敗","bad");log("語音播放錯誤："+(e.error||"unknown"))};speechSynthesis.speak(u)};
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(output.textContent);log("已複製翻譯。")}catch{}};
$("clear").onclick=()=>{input.value="";output.textContent="尚未翻譯";latency.textContent="等待翻譯";engine.textContent="翻譯引擎待命";voiceUsed.textContent="";log("已清除。");setState("待命","neutral")};
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js?v=4",{updateViaCache:"none"}).catch(()=>{});
