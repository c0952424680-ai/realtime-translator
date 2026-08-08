const $=id=>document.getElementById(id);
const input=$("input"), output=$("output"), from=$("from"), to=$("to");
const debug=$("debugText"), meterBar=$("meterBar"), meterText=$("meterText");
const audioState=$("audioState"), voiceInfo=$("voiceInfo");
$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x};

let stream=null, audioCtx=null, analyser=null;
let recognition=null, micReady=false;

function log(msg){debug.textContent=msg}
function setState(txt, ok=false){
  audioState.textContent=txt;
  audioState.style.background=ok?"#e7f8ee":"#fff2d8";
  audioState.style.color=ok?"#147a3a":"#9a6400";
}

async function initMic(){
  try{
    if(!navigator.mediaDevices?.getUserMedia) throw new Error("瀏覽器不支援麥克風 API");
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    micReady=true;
    setState("麥克風已允許",true);
    $("mic").textContent="🎙️ 開始語音辨識";
    meterText.textContent="麥克風已連線，請說話測試";
    log("已取得麥克風權限。音量條有跳動就代表收音正常。");

    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") await audioCtx.resume();
    const src=audioCtx.createMediaStreamSource(stream);
    analyser=audioCtx.createAnalyser();
    analyser.fftSize=256;
    src.connect(analyser);
    const data=new Uint8Array(analyser.frequencyBinCount);

    const tick=()=>{
      analyser.getByteFrequencyData(data);
      let sum=0; for(const v of data) sum+=v;
      const level=Math.min(100,(sum/data.length)*1.8);
      meterBar.style.width=level+"%";
      requestAnimationFrame(tick);
    };
    tick();
  }catch(e){
    micReady=false;
    setState("麥克風未允許");
    meterText.textContent="無法取得麥克風";
    log("麥克風錯誤："+e.message+"。請到 iPhone 設定 → Safari → 麥克風，允許此網站。");
  }
}

function setupRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    log("此 Safari 不支援 Web Speech 語音辨識；可測麥克風，但無法自動轉文字。");
    return;
  }
  recognition=new SR();
  recognition.interimResults=true;
  recognition.continuous=false;
  recognition.maxAlternatives=1;
  recognition.onstart=()=>{ $("mic").textContent="⏹️ 停止辨識"; log("正在語音辨識…"); };
  recognition.onresult=e=>{
    let text="";
    for(let i=e.resultIndex;i<e.results.length;i++) text+=e.results[i][0].transcript;
    input.value=text;
  };
  recognition.onerror=e=>{ log("語音辨識錯誤："+e.error); $("mic").textContent="🎙️ 開始語音辨識"; };
  recognition.onend=()=>{ $("mic").textContent="🎙️ 開始語音辨識"; };
}
setupRecognition();

$("mic").onclick=async()=>{
  if(!micReady){ await initMic(); return; }
  if(!recognition){
    alert("麥克風已正常，但此 Safari 版本不支援網頁語音辨識。");
    return;
  }
  recognition.lang=from.value;
  try{ recognition.start(); }catch{}
};

const offline={
 "zh-TW|ja-JP":{"你好":"こんにちは。","謝謝":"ありがとうございます。","請問洗手間在哪裡":"トイレはどこですか？","多少錢":"いくらですか？","請幫幫我":"助けてください。"},
 "zh-TW|en-US":{"你好":"Hello.","謝謝":"Thank you.","請問洗手間在哪裡":"Where is the restroom?","多少錢":"How much is it?","請幫幫我":"Please help me."},
 "zh-TW|ko-KR":{"你好":"안녕하세요.","謝謝":"감사합니다.","請問洗手間在哪裡":"화장실이 어디예요?","多少錢":"얼마예요?","請幫幫我":"도와주세요."}
};

async function translate(){
  const text=input.value.trim();
  if(!text){output.textContent="請先輸入文字。";return}
  if(from.value===to.value){output.textContent=text;return}
  const local=offline[`${from.value}|${to.value}`]?.[text];
  if(local){output.textContent=local;return}
  output.textContent="翻譯中…";
  try{
    const pair=`${from.value.split("-")[0]}|${to.value.split("-")[0]}`;
    const r=await fetch("https://api.mymemory.translated.net/get?q="+encodeURIComponent(text)+"&langpair="+encodeURIComponent(pair));
    const d=await r.json();
    output.textContent=d.responseData?.translatedText||"翻譯失敗";
  }catch(e){
    output.textContent="目前離線，這句不在離線詞庫。";
  }
}
$("translate").onclick=translate;

let voices=[];
function refreshVoices(){
  voices=speechSynthesis.getVoices();
  voiceInfo.textContent=`已載入 ${voices.length} 個系統語音`;
}
refreshVoices();
if("speechSynthesis" in window) speechSynthesis.onvoiceschanged=refreshVoices;

function pickVoice(lang){
  const base=lang.toLowerCase();
  return voices.find(v=>v.lang.toLowerCase()===base)
      || voices.find(v=>v.lang.toLowerCase().startsWith(base.split("-")[0]))
      || voices[0];
}
function speakText(text, lang){
  if(!("speechSynthesis" in window)){log("此瀏覽器不支援文字轉語音。");return}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang;
  const v=pickVoice(lang); if(v) u.voice=v;
  u.rate=0.9; u.volume=1.0; u.pitch=1.0;
  u.onstart=()=>log(`正在播放：${v?.name||lang}`);
  u.onerror=e=>log("播放錯誤："+(e.error||"unknown"));
  speechSynthesis.speak(u);
}
$("speak").onclick=()=>{
  const t=output.textContent.trim();
  if(!t||t==="尚未翻譯"||t==="翻譯中…") return;
  speakText(t,to.value);
};
$("testVoice").onclick=()=>speakText("這是即時譯聲音測試。","zh-TW");

document.addEventListener("visibilitychange", async()=>{
  if(document.visibilityState==="visible" && audioCtx?.state==="suspended"){
    try{await audioCtx.resume()}catch{}
  }
});
