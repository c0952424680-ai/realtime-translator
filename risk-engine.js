
const RiskEngine={
 sources:{weather:"idle",quake:"idle",news:"idle"},weather:null,quakes:[],news:[],
 evaluate(){
  const alerts=[];
  if(this.weather){
   if(Number(this.weather.wind)>=70)alerts.push({level:"red",title:"強風高風險",detail:`風速 ${this.weather.wind} km/h`});
   else if(Number(this.weather.wind)>=45)alerts.push({level:"orange",title:"強風注意",detail:`風速 ${this.weather.wind} km/h`});
   if([95,96,99].includes(Number(this.weather.code)))alerts.push({level:"orange",title:"雷暴注意",detail:"請注意雷擊與強降雨"});
  }
  for(const q of this.quakes)if(q.sev==="red"||q.sev==="orange")alerts.push({level:q.sev,title:q.title,detail:q.summary,url:q.url});
  const bad=Object.values(this.sources).some(x=>x==="error");
  let level="green",label="🟢 目前無已知重大警報";
  if(alerts.some(x=>x.level==="red")){level="red";label="🔴 高風險"}
  else if(alerts.some(x=>x.level==="orange")){level="orange";label="🟠 注意"}
  else if(bad){level="gray";label="⚪ 部分資料來源異常，無法判定為安全"}
  const b=document.getElementById("riskBadge");if(b){b.className=`badge ${level}`;b.textContent=label}
  const box=document.getElementById("eventBox");if(box)box.innerHTML=alerts.length?alerts.map(x=>`<article class="event ${x.level}"><b>${esc(x.title)}</b><p>${esc(x.detail||"")}</p>${x.url?`<a href="${x.url}" target="_blank" rel="noopener">官方來源</a>`:""}</article>`).join(""):`<div class="status">${bad?"目前部分即時資料來源異常；請查看官方旅遊警示與當地公告。":"目前沒有偵測到鄰近重大警報；不代表絕對安全。"}</div>`;
 }
};
window.RiskEngine=RiskEngine;
