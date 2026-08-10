
const RiskEngine={
 sources:{weather:"idle",quake:"idle",news:"idle"},
 weather:null,quakes:[],news:[],

 levelText(level){
   return level==="red"?"高風險地區":level==="orange"?"提高警覺地區":level==="yellow"?"可能有危害地區":level==="green"?"目前無重大警報":"資料不足";
 },

 evaluate(){
   const alerts=[];
   const s=StateCore.get();

   if(this.weather){
     if(Number(this.weather.wind)>=70)alerts.push({level:"red",title:"強風高風險",detail:`所在地風速 ${this.weather.wind} km/h`,area:s.district});
     else if(Number(this.weather.wind)>=45)alerts.push({level:"orange",title:"強風注意",detail:`所在地風速 ${this.weather.wind} km/h`,area:s.district});
     if([95,96,99].includes(Number(this.weather.code)))alerts.push({level:"orange",title:"雷暴注意",detail:"所在地可能有雷擊與強降雨",area:s.district});
     if(Number(this.weather.rain)>=30)alerts.push({level:"orange",title:"強降雨注意",detail:`目前降雨 ${this.weather.rain} mm`,area:s.district});
   }

   for(const q of this.quakes){
     if(q.sev==="red"||q.sev==="orange")alerts.push({level:q.sev,title:q.title,detail:q.summary,url:q.url,area:q.area||s.city});
   }

   const bad=Object.values(this.sources).some(x=>x==="error");
   let level="green",label="🟢 目前無已知重大警報";
   if(alerts.some(x=>x.level==="red")){level="red";label="🔴 高風險"}
   else if(alerts.some(x=>x.level==="orange")){level="orange";label="🟠 提高警覺"}
   else if(alerts.some(x=>x.level==="yellow")){level="yellow";label="🟡 可能有危害"}
   else if(bad){level="gray";label="⚪ 部分資料不足"}

   const b=document.getElementById("riskBadge");
   if(b){b.className=`badge ${level}`;b.textContent=label}

   const box=document.getElementById("eventBox");
   if(box){
     box.innerHTML=alerts.length
       ?alerts.map(x=>`<article class="event ${x.level}"><header><b>${esc(x.title)}</b><span>${this.levelText(x.level)}</span></header><p>${esc(x.area||"")}｜${esc(x.detail||"")}</p>${x.url?`<a href="${x.url}" target="_blank" rel="noopener">官方來源</a>`:""}</article>`).join("")
       :`<div class="status">${bad?"目前部分即時資料來源異常；不能判定為安全，請查看官方旅遊警示與當地公告。":"目前沒有偵測到鄰近重大警報；此狀態不代表絕對安全。"}</div>`;
   }

   this.renderAreaBoard(alerts,bad);
   this.renderCountryInfo();
   this.maybeNotify(level,alerts);
 },

 renderAreaBoard(alerts,bad){
   const el=document.getElementById("areaRiskBoard");if(!el)return;
   const s=StateCore.get(),current=alerts.find(x=>x.area===s.district)||alerts[0];
   let currentLevel=current?.level||(bad?"gray":"green");
   const currentText=this.levelText(currentLevel);

   const cityData=LOCATION_DATA[s.countryKey]?.cities?.[s.city];
   const districts=(cityData?.districts||[]).filter(x=>!/^全/.test(x)).slice(0,8);
   const safeList=currentLevel==="green"&&!bad?districts.slice(0,4):[];
   const cautionList=currentLevel==="orange"?[s.district]:currentLevel==="yellow"?[s.district]:[];
   const dangerList=currentLevel==="red"?[s.district]:[];

   el.innerHTML=`
   <div class="area-current ${currentLevel}">
     <b>${StateCore.label()}</b>
     <span>${currentText}</span>
   </div>
   <div class="risk-columns">
     <div class="risk-col green"><h3>🟢 安全參考</h3><p>${safeList.length?safeList.map(esc).join("、"):"目前沒有足夠資料可列出特定安全區域"}</p></div>
     <div class="risk-col yellow"><h3>🟡 可能有危害</h3><p>${cautionList.length?cautionList.map(esc).join("、"):"目前無特定區域"}</p></div>
     <div class="risk-col orange"><h3>🟠 提高警覺</h3><p>${currentLevel==="orange"?esc(s.district):"目前無特定區域"}</p></div>
     <div class="risk-col red"><h3>🔴 高風險</h3><p>${dangerList.length?dangerList.map(esc).join("、"):"目前無特定區域"}</p></div>
   </div>
   <div class="muted">區域分級依目前天氣、地震與重大事件訊號產生；沒有警報不代表保證安全，治安仍應參考當地官方資料。</div>`;
 },

 renderCountryInfo(){
   const el=document.getElementById("countryLiveInfo");if(!el)return;
   const s=StateCore.get(),c=LOCATION_DATA[s.countryKey],e=c?.emergency||{};
   el.innerHTML=`
    <div class="info-grid">
      <div><span>國家 / 地區</span><b>${c?.flag||""} ${esc(s.country)}</b></div>
      <div><span>城市</span><b>${esc(s.city)}</b></div>
      <div><span>行政區</span><b>${esc(s.district)}</b></div>
      <div><span>警察</span><b>${esc(e.police||"—")}</b></div>
      <div><span>救護</span><b>${esc(e.ambulance||"—")}</b></div>
      <div><span>消防</span><b>${esc(e.fire||"—")}</b></div>
    </div>`;
 },

 async maybeNotify(level,alerts){
   if(!["red","orange"].includes(level)||!alerts.length)return;
   const standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
   if(!standalone||!("Notification" in window)||Notification.permission!=="granted")return;
   const key=`rt_v107_alert_${level}_${alerts[0].title}_${StateCore.get().city}`;
   if(sessionStorage.getItem(key))return;
   sessionStorage.setItem(key,"1");
   try{
     const reg=await navigator.serviceWorker?.ready;
     if(reg)await reg.showNotification(level==="red"?"🔴 重大安全警報":"🟠 安全提醒",{body:`${StateCore.label()}｜${alerts[0].title}｜${alerts[0].detail||""}`});
   }catch{}
 }
};
window.RiskEngine=RiskEngine;
