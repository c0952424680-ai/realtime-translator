
const VoiceEngine={
  voices:[],
  settings:{rate:1.0,locale:"auto",voiceURI:""},

  init(){
    this.loadSettings();
    this.refreshVoices();
    if("speechSynthesis" in window){
      window.speechSynthesis.onvoiceschanged=()=>this.refreshVoices();
    }
    this.bindControls();
  },

  loadSettings(){
    try{
      const s=JSON.parse(localStorage.getItem("rt_v104_voice")||"null");
      if(s)this.settings={...this.settings,...s};
    }catch{}
  },

  saveSettings(){
    try{localStorage.setItem("rt_v104_voice",JSON.stringify(this.settings))}catch{}
    window.dispatchEvent(new CustomEvent("voice-settings-changed",{detail:{...this.settings}}));
  },

  refreshVoices(){
    this.voices=("speechSynthesis" in window)?speechSynthesis.getVoices():[];
    this.renderControls();
    this.renderStatus();
  },

  normalizeLocale(locale){
    if(!locale||locale==="auto")return (window.App?.country?.()?.voiceLocale)||"en-US";
    return locale;
  },

  candidates(locale){
    const target=this.normalizeLocale(locale).toLowerCase();
    const base=target.split("-")[0];
    const exact=this.voices.filter(v=>(v.lang||"").toLowerCase()===target);
    const same=this.voices.filter(v=>(v.lang||"").toLowerCase().startsWith(base));
    return exact.length?exact:(same.length?same:this.voices);
  },

  selectVoice(locale){
    const pool=this.candidates(locale);
    if(!pool.length)return null;

    if(this.settings.voiceURI){
      const picked=pool.find(v=>v.voiceURI===this.settings.voiceURI);
      if(picked)return picked;
    }
    return pool[0];
  },

  speak(text,locale){
    if(!("speechSynthesis" in window)){alert("此瀏覽器不支援語音播放");return false}
    const value=String(text||"").trim();
    if(!value){alert("沒有可播放的文字");return false}

    const realLocale=this.normalizeLocale(locale);
    const u=new SpeechSynthesisUtterance(value);
    u.lang=realLocale;
    u.rate=Number(this.settings.rate)||1;
    u.pitch=1;
    const v=this.selectVoice(realLocale);
    if(v)u.voice=v;

    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    this.renderStatus(v,realLocale);
    return true;
  },
  setRate(v){this.settings.rate=Number(v)||1;this.saveSettings()},
  setLocale(v){this.settings.locale=v||"auto";this.settings.voiceURI="";this.saveSettings();this.renderControls();this.renderStatus()},
  setVoice(uri){this.settings.voiceURI=uri||"";this.saveSettings();this.renderStatus()},

  bindControls(){
    document.querySelectorAll("[data-voice-rate]").forEach(el=>{
      el.value=String(this.settings.rate);
      el.addEventListener("change",()=>this.setRate(el.value));
    });
    document.querySelectorAll("[data-voice-locale]").forEach(el=>{
      el.value=this.settings.locale;
      el.addEventListener("change",()=>this.setLocale(el.value));
    });
    document.querySelectorAll("[data-voice-picker]").forEach(el=>{
      el.addEventListener("change",()=>this.setVoice(el.value));
    });
  },

  renderControls(){
  },

  renderStatus(v=null,locale=null){
    const loc=locale||this.normalizeLocale(this.settings.locale);
    const voice=v||this.selectVoice(loc);
    document.querySelectorAll("[data-voice-status]").forEach(el=>{
      if(!this.voices.length){
        el.textContent="尚未取得裝置語音；Safari 載入後會自動更新。";
        return;
      }
      el.textContent=`可用語音 ${this.voices.length} 個｜目前 ${voice?voice.name:"系統預設"}｜${loc}`;
    });
  }
};
window.VoiceEngine=VoiceEngine;
document.addEventListener("DOMContentLoaded",()=>VoiceEngine.init());
