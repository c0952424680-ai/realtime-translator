
const R={
"mm":["🇲🇲 緬甸","極高／部分地區紅色",["戰爭","武裝衝突","人口販運","電信詐騙","治安"],"https://www.moezala.gov.mm/"],
"kh":["🇰🇭 柬埔寨","部分邊境高風險",["邊境衝突","詐騙","限制人身自由","治安"],"https://www.mowram.gov.kh/"],
"th":["🇹🇭 泰國","部分邊境橙色／其他提高警覺",["邊境風險","詐騙","疾病","豪雨／高溫"],"https://www.tmd.go.th/en"],
"jp":["🇯🇵 日本","依外交部最新公告",["地震","海嘯","颱風","火山","高溫／大雪"],"https://www.jma.go.jp/jma/indexe.html"],
"ph":["🇵🇭 菲律賓","依外交部最新公告",["颱風","洪水","治安","詐騙"],"https://www.pagasa.dost.gov.ph/"],
"id":["🇮🇩 印尼","依外交部最新公告",["地震","海嘯","火山","洪水","治安"],"https://www.bmkg.go.id/"],
"sg":["🇸🇬 新加坡","依外交部最新公告",["高溫","雷暴","豪雨","煙霾","詐騙"],"https://www.weather.gov.sg/"],
"my":["🇲🇾 馬來西亞","依外交部最新公告",["豪雨／洪水","雷暴","煙霾","治安／詐騙"],"https://www.met.gov.my/"]
};
const s=$("riskCountry");s.innerHTML=Object.entries(R).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");
function render(){const d=R[s.value];$("riskBox").innerHTML=`<h2>${d[0]}</h2><div class="risk-level orange">官方警示概況：${d[1]}</div><div class="risk-tags">${d[2].map(x=>`<span class="tag">${x}</span>`).join("")}</div><div class="office-actions"><a href="https://www.boca.gov.tw/sp-trwa-list-1.html" target="_blank">🇹🇼 外交部旅遊警示</a><a href="https://www.cdc.gov.tw/TravelEpidemic/" target="_blank">🦠 疾管署國際疫情</a></div>`;$("weatherBox").innerHTML=`<h2>🌦️ 官方天氣／災害</h2><div class="office-actions"><a href="${d[3]}" target="_blank">查看當地官方警報</a><a href="https://www.google.com/maps" target="_blank">🗺️ Google Maps</a></div>`}
s.onchange=render;render();
