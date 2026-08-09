
const data={
"mm":{name:"🇲🇲 緬甸",foreign:"極高／部分地區紅色",hazards:["戰爭／武裝衝突","人口販運","電信詐騙","治安"],health:"另查疾管署國際旅遊疫情",weather:"Department of Meteorology and Hydrology Myanmar",weatherUrl:"https://www.moezala.gov.mm/",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"kh":{name:"🇰🇭 柬埔寨",foreign:"極高／部分邊境紅色",hazards:["邊境衝突","詐騙","限制人身自由","治安"],health:"東南亞蚊媒疾病與飲食衛生風險",weather:"Cambodia Ministry of Water Resources and Meteorology",weatherUrl:"https://www.mowram.gov.kh/",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"th":{name:"🇹🇭 泰國",foreign:"高／部分邊境橙色；其他地區提高警覺",hazards:["邊境武裝風險","治安","詐騙","疾病"],health:"留意登革熱、M痘、麻疹、瘧疾等疾管署旅遊疫情",weather:"Thai Meteorological Department",weatherUrl:"https://www.tmd.go.th/en",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"jp":{name:"🇯🇵 日本",foreign:"依外交部最新公告",hazards:["地震","海嘯","颱風","火山","大雪／高溫"],health:"依疾管署最新國際旅遊疫情",weather:"Japan Meteorological Agency",weatherUrl:"https://www.jma.go.jp/jma/indexe.html",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"ph":{name:"🇵🇭 菲律賓",foreign:"依外交部最新公告",hazards:["颱風","洪水","治安","詐騙"],health:"蚊媒疾病與飲食衛生",weather:"PAGASA",weatherUrl:"https://www.pagasa.dost.gov.ph/",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"id":{name:"🇮🇩 印尼",foreign:"依外交部最新公告",hazards:["地震","海嘯","火山","洪水","治安"],health:"蚊媒疾病、飲食與飲水衛生",weather:"BMKG",weatherUrl:"https://www.bmkg.go.id/",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"sg":{name:"🇸🇬 新加坡",foreign:"依外交部最新公告",hazards:["高溫","雷暴","豪雨","煙霾","詐騙"],health:"留意疾管署公告",weather:"Meteorological Service Singapore",weatherUrl:"https://www.weather.gov.sg/",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"},
"my":{name:"🇲🇾 馬來西亞",foreign:"依外交部最新公告",hazards:["豪雨／洪水","雷暴","煙霾","治安／詐騙"],health:"蚊媒疾病與衛生",weather:"MET Malaysia",weatherUrl:"https://www.met.gov.my/",official:"https://www.boca.gov.tw/sp-trwa-list-1.html"}
};
const sel=$("riskCountry");sel.innerHTML=Object.entries(data).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join("");
function render(){
 const d=data[sel.value];
 $("riskDashboard").innerHTML=`<h2>${d.name}</h2><div class="risk-banner orange">官方旅行警示：${d.foreign}</div>
 <div class="risk-tags">${d.hazards.map(x=>`<span class="risk-tag">${x}</span>`).join("")}</div>
 <div class="risk-item"><b>🦠 衛生／疾病</b><small>${d.health}</small></div>
 <div class="office-actions"><a href="${d.official}" target="_blank">🇹🇼 外交部最新旅遊警示</a><a href="https://www.cdc.gov.tw/TravelEpidemic/" target="_blank">🦠 疾管署國際疫情</a></div>`;
 $("weatherCard").innerHTML=`<h2>🌦️ 官方天氣與災害</h2><div class="meta">${d.weather}</div><div class="office-actions"><a href="${d.weatherUrl}" target="_blank">查看官方即時警報</a><a href="https://www.google.com/maps" target="_blank">🗺️ Google Maps</a></div>`;
}
sel.addEventListener("change",render);render();
