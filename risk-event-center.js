
const RiskEventCenter={
  events:[],

  severity(v){
    const s=String(v||"").toLowerCase();
    if(["red","high","severe","critical","danger","3"].includes(s))return "red";
    if(["orange","medium","warning","elevated","2"].includes(s))return "orange";
    return "green";
  },

  add(event){
    if(!event?.type)return;
    this.events.push({
      id:event.id||`${event.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type:event.type,
      title:event.title||event.type,
      area:event.area||window.TravelContext?.locationLabel?.()||"",
      severity:this.severity(event.severity),
      summary:event.summary||"",
      source:event.source||"統一資料中心",
      sourceUrl:event.sourceUrl||"",
      updatedAt:event.updatedAt||new Date().toISOString()
    });
  },

  build(){
    this.events=[];
    const ctx=window.TravelContext?.get?.()||{};
    const c=window.DataCenter?.country?.(ctx.countryKey)||{};
    const risk=c.risk||{};

    const map=[
      ["治安",risk.crime||risk.security],
      ["詐騙",risk.scam||risk.fraud],
      ["疾病",risk.disease||risk.health],
      ["戰爭／衝突",risk.conflict||risk.war],
      ["環境",risk.environment],
      ["天然災害",risk.disaster]
    ];

    map.forEach(([title,obj])=>{
      if(!obj)return;
      if(typeof obj==="string"){
        this.add({type:title,title,severity:"green",summary:obj});
      }else{
        this.add({
          type:title,title,
          severity:obj.level||obj.severity||"green",
          summary:obj.summary||obj.note||obj.text||"",
          source:obj.source||"統一資料中心",
          sourceUrl:obj.sourceUrl||obj.url||"",
          updatedAt:obj.updatedAt||obj.updated_at
        });
      }
    });

    const weatherText=
      document.getElementById("weatherSummary")?.textContent||
      document.getElementById("weatherRiskText")?.textContent||"";
    if(weatherText){
      let sev="green";
      if(/颱風|暴雨|豪雨|洪水|極端|警報|危險|高溫警告|寒流/.test(weatherText))sev="orange";
      if(/立即|嚴重|極危險|紅色警報/.test(weatherText))sev="red";
      this.add({type:"天氣",title:"天氣風險",severity:sev,summary:weatherText,source:"即時天氣"});
    }

    this.render();
    window.dispatchEvent(new CustomEvent("risk-events-updated",{detail:{events:this.events}}));
  },

  overall(){
    if(this.events.some(e=>e.severity==="red"))return "red";
    if(this.events.some(e=>e.severity==="orange"))return "orange";
    return "green";
  },

  render(){
    const level=this.overall();
    const overall=document.getElementById("riskOverall");
    const text=document.getElementById("riskOverallText");
    const box=document.getElementById("riskEventList");

    if(overall){
      overall.className=`risk-overall ${level}`;
      overall.textContent=level==="green"?"🟢 安全":level==="orange"?"🟠 注意":"🔴 高風險";
    }
    if(text){
      text.textContent=level==="green"
        ?"目前未偵測到立即性生命危險。"
        :level==="orange"
          ?"目前有需要提高警覺的風險事項。"
          :"目前存在高風險事項，請優先確認官方資訊並避開相關地區。";
    }
    if(!box)return;

    box.innerHTML=this.events.length?this.events.map(e=>`
      <div class="risk-event ${e.severity}">
        <div class="risk-event-head"><b>${esc(e.title)}</b><span>${e.severity==="green"?"綠色":e.severity==="orange"?"橙色":"紅色"}</span></div>
        <div class="risk-event-area">${esc(e.area||"")}</div>
        <p>${esc(e.summary||"尚無詳細說明")}</p>
        <div class="risk-event-foot">
          <span>${esc(e.source||"")}</span>
          ${e.sourceUrl?`<a target="_blank" rel="noopener" href="${e.sourceUrl}">官方來源</a>`:""}
        </div>
      </div>`).join(""):'<div class="official-note">目前沒有可顯示的風險事件。</div>';
  }
};

window.RiskEventCenter=RiskEventCenter;
document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>RiskEventCenter.build(),700));
window.addEventListener("travel-context-updated",()=>setTimeout(()=>RiskEventCenter.build(),250));
window.addEventListener("data-center-updated",()=>setTimeout(()=>RiskEventCenter.build(),250));
window.addEventListener("smart-update-complete",()=>setTimeout(()=>RiskEventCenter.build(),250));
