
const VoiceEngine={speak(text,locale="zh-TW"){if(!("speechSynthesis" in window)||!text)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=locale;u.rate=.9;u.pitch=1;const voices=speechSynthesis.getVoices(),v=voices.find(x=>x.lang.toLowerCase()===locale.toLowerCase())||voices.find(x=>x.lang.toLowerCase().startsWith(locale.split("-")[0].toLowerCase()));if(v)u.voice=v;speechSynthesis.speak(u)}};
window.VoiceEngine=VoiceEngine;
