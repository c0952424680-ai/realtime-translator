const $=id=>document.getElementById(id);
const input=$("input"),output=$("output"),from=$("from"),to=$("to");
$("swap").onclick=()=>{const x=from.value;from.value=to.value;to.value=x};

const offline={
 "zh-TW|ja":{"你好":"こんにちは。","謝謝":"ありがとうございます。","請問洗手間在哪裡":"トイレはどこですか？","多少錢":"いくらですか？","請幫幫我":"助けてください。"},
 "zh-TW|en":{"你好":"Hello.","謝謝":"Thank you.","請問洗手間在哪裡":"Where is the restroom?","多少錢":"How much is it?","請幫幫我":"Please help me."},
 "zh-TW|ko":{"你好":"안녕하세요.","謝謝":"감사합니다.","請問洗手間在哪裡":"화장실이 어디예요?","多少錢":"얼마예요?","請幫幫我":"도와주세요."}
};

async function translate(){
  const text=input.value.trim();
  if(!text){output.textContent="請先輸入文字。";return}
  if(from.value===to.value){output.textContent=text;return}
  const local=offline[`${from.value}|${to.value}`]?.[text];
  if(local){output.textContent=local;return}
  output.textContent="翻譯中…";
  try{
    const pair=`${from.value}|${to.value}`;
    const r=await fetch("https://api.mymemory.translated.net/get?q="+encodeURIComponent(text)+"&langpair="+encodeURIComponent(pair));
    const d=await r.json();
    output.textContent=d.responseData?.translatedText||"翻譯失敗";
  }catch(e){output.textContent="目前離線，這句不在離線詞庫。"}
}
$("translate").onclick=translate;

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
  const rec=new SR();rec.interimResults=false;rec.continuous=false;
  $("mic").onclick=()=>{rec.lang=from.value==="zh-TW"?"zh-TW":from.value;rec.start();$("mic").textContent="🎙️ 聆聽中…"};
  rec.onresult=e=>input.value=e.results[0][0].transcript;
  rec.onend=()=> $("mic").textContent="🎙️ 開始說話";
}else{$("mic").onclick=()=>alert("此 iPhone Safari 版本不支援網頁語音辨識，請先用文字輸入。")}

$("speak").onclick=()=>{
  const t=output.textContent;if(!t||t==="尚未翻譯")return;
  const u=new SpeechSynthesisUtterance(t);u.lang=to.value==="zh-TW"?"zh-TW":to.value;
  speechSynthesis.cancel();speechSynthesis.speak(u);
};
document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{input.value=b.dataset.p;translate()});

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
