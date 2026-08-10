
const VoiceEngine={
 voices:[],
 init(){this.refresh();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=()=>this.refresh()},
 refresh(){this.voices=("speechSynthesis" in window)?speechSynthesis.getVoices():[];document.querySelectorAll("[data-voice-status]").forEach(e=>e.textContent=this.voices.length?`語音已自動就緒（${this.voices.length} 個）`:"正在等待裝置語音…")},
 select(locale){const target=(locale||"en-US").toLowerCase(),base=target.split("-")[0];return this.voices.find(v=>(v.lang||"").toLowerCase()===target)||this.voices.find(v=>(v.lang||"").toLowerCase().startsWith(base))||null},
 speak(text,locale){if(!("speechSynthesis" in window)){alert("此瀏覽器不支援語音播放");return false}const t=String(text||"").trim();if(!t)return false;const u=new SpeechSynthesisUtterance(t);u.lang=locale||"en-US";u.rate=.95;const v=this.select(u.lang);if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u);return true}
};
window.VoiceEngine=VoiceEngine;
document.addEventListener("DOMContentLoaded",()=>VoiceEngine.init());
