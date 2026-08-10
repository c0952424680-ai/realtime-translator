
const EmergencyMode={
  active:false,

  init(){
    this.active=localStorage.getItem("rt_v95_emergency_mode")==="1";
    this.bind();
    this.set(this.active,false);
    this.renderAll();
  },

  bind(){
    document.getElementById("toggleEmergencyMode")?.addEventListener("click",()=>this.set(!this.active,true));
    window.addEventListener("travel-context-updated",()=>this.renderAll());
    window.addEventListener("safety-hub-updated",()=>this.renderContacts());
  },

  set(on,persist=true){
    this.active=!!on;
    document.body.classList.toggle("emergency-mode",this.active);
    if(persist){
      try{localStorage.setItem("rt_v95_emergency_mode",this.active?"1":"0")}catch{}
    }
    const b=document.getElementById("toggleEmergencyMode");
    if(b){
      b.textContent=this.active?"退出緊急模式":"啟用緊急模式";
      b.setAttribute("aria-pressed",this.active?"true":"false");
    }
  },

  renderAll(){
    this.renderContext();
    this.renderContacts();
    this.renderMapLinks();
    this.renderShare();
  },

  renderContext(){
    const s=window.TravelContext?.get?.()||{};
    const label=[s.country,s.city,s.district].filter((x,i,a)=>x&&a.indexOf(x)===i).join("・")||"位置尚未取得";
    const coords=Number.isFinite(s.lat)&&Number.isFinite(s.lon)?`${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}`:"尚未取得";
    const a=document.getElementById("emergencyLocation"),b=document.getElementById("emergencyCoords");
    if(a)a.textContent=label;
    if(b)b.textContent=coords;
  },

  renderContacts(){
    const box=document.getElementById("emergencyLocalContacts");
    if(!box)return;
    const d=window.getEmergencyContact?.();
    if(!d){
      box.innerHTML='<div class="official-note">正在同步當地緊急電話…</div>';
      return;
    }
    const rows=[["👮 警察",d.police],["🚑 救護",d.ambulance],["🚒 消防",d.fire]];
    (d.extra||[]).forEach(x=>rows.push([`☎️ ${x.label}`,x.number]));
    box.innerHTML=rows.filter(x=>x[1]).map(([label,num])=>{
      const tel=String(num).replace(/[^\d+]/g,"");
      return `<a class="emergency-big-call" href="tel:${tel}"><span>${esc(label)}</span><b>${esc(num)}</b></a>`;
    }).join("");
  },

  renderMapLinks(){
    const s=window.TravelContext?.get?.()||{};
    const defs=[
      ["emergencyNearestHospital","hospital emergency room"],
      ["emergencyNearestPolice","police station"],
      ["emergencyNearestPharmacy","pharmacy"]
    ];
    defs.forEach(([id,q])=>{
      const a=document.getElementById(id);
      if(!a)return;
      if(Number.isFinite(s.lat)&&Number.isFinite(s.lon)){
        a.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${q} near ${s.lat},${s.lon}`);
        a.classList.remove("disabled");
      }else{
        a.removeAttribute("href");
        a.classList.add("disabled");
      }
    });
  },

  renderShare(){
    const a=document.getElementById("shareEmergencyLocation");
    if(!a)return;
    const s=window.TravelContext?.get?.()||{};
    if(Number.isFinite(s.lat)&&Number.isFinite(s.lon)){
      const txt=`我的目前位置：${[s.country,s.city,s.district].filter(Boolean).join("・")} ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} https://maps.google.com/?q=${s.lat},${s.lon}`;
      a.href=`sms:?&body=${encodeURIComponent(txt)}`;
      a.classList.remove("disabled");
    }else{
      a.removeAttribute("href");
      a.classList.add("disabled");
    }
  }
};

window.EmergencyMode=EmergencyMode;
document.addEventListener("DOMContentLoaded",()=>EmergencyMode.init());
