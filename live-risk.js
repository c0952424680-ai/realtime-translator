
const RISK_FEED_URL="./risk-feed.json";
const RISK_FEED_CACHE="rt_v77_risk_feed";
let linkedFeed=null;
let linkedCountryKey=null;

function setMiniLight(id,level,label){
  const el=document.getElementById(id);
  if(!el)return;
  el.className=`mini-light ${level||"neutral"}`;
  const labels={green:"綠",orange:"橙",red:"紅",neutral:"—"};
  el.textContent=label||labels[level]||"—";
}

function saveRiskFeed(feed){
  try{localStorage.setItem(RISK_FEED_CACHE,JSON.stringify({time:Date.now(),feed}))}catch{}
}
function cachedRiskFeed(){
  try{return JSON.parse(localStorage.getItem(RISK_FEED_CACHE)||"null")}catch{return null}
}

async function loadRiskFeed(){
  try{
    const r=await fetch(`${RISK_FEED_URL}?t=${Date.now()}`,{cache:"no-store"});
    if(!r.ok)throw new Error("risk feed failed");
    const feed=await r.json();
    linkedFeed=feed;
    saveRiskFeed(feed);
    return feed;
  }catch(e){
    const c=cachedRiskFeed();
    if(c?.feed){linkedFeed=c.feed;return c.feed}
    throw e;
  }
}

function normalizeCountryName(name){
  return (name||"").trim().toLowerCase();
}
function findCountryKey(feed,countryName){
  if(!feed?.countries)return null;
  const target=normalizeCountryName(countryName);
  for(const [key,data] of Object.entries(feed.countries)){
    const names=[key,...(data.aliases||[])].map(normalizeCountryName);
    if(names.includes(target))return key;
  }
  return null;
}

function showRiskSource(id,text,url){
  const el=document.getElementById(id);
  if(!el)return;
  el.innerHTML=url?`來源：<a href="${url}" target="_blank">${esc(text)}</a>`:`來源：${esc(text)}`;
}

function renderLinkedRisk(){
  if(!linkedFeed)return;
  const country=document.getElementById("liveCountry")?.textContent||"";
  const city=document.getElementById("liveCity")?.textContent||"";
  const district=document.getElementById("liveDistrict")?.textContent||"";
  const key=findCountryKey(linkedFeed,country);
  linkedCountryKey=key;

  const cityLine=[country,city,district].filter((x,i,a)=>x && x!=="—" && x!=="未知" && x!=="未提供" && a.indexOf(x)===i).join("・");
  const lc=document.getElementById("linkedCity");
  if(lc)lc.textContent=cityLine||"尚未取得城市";

  const lu=document.getElementById("linkedUpdated");
  if(lu)lu.textContent=`資料產生：${linkedFeed.generated_at||"未知"}`;

  if(!key){
    ["crime","scam","disease","highRisk"].forEach(prefix=>{
      const id=prefix==="highRisk"?"highRiskLight":`${prefix}Light`;
      setMiniLight(id,"neutral");
    });
    if(document.getElementById("crimeText"))crimeText.textContent="目前沒有此國家的聯動風險資料，請查看官方來源。";
    if(document.getElementById("scamText"))scamText.textContent="目前沒有此國家的聯動風險資料。";
    if(document.getElementById("diseaseText"))diseaseText.textContent="請查看疾管署最新國際旅遊疫情。";
    if(document.getElementById("highRiskText"))highRiskText.textContent="目前沒有此國家的高風險地區資料。";
    return;
  }

  const d=linkedFeed.countries[key];

  setMiniLight("crimeLight",d.crime?.level);
  crimeText.textContent=`${city||country}${district&&district!==city?"・"+district:""}：${d.crime?.text||"尚無資料"}`;
  showRiskSource("crimeSource",linkedFeed.sources?.boca?.name||"外交部",linkedFeed.sources?.boca?.url);

  setMiniLight("scamLight",d.scam?.level);
  scamText.textContent=`${city||country}：${d.scam?.text||"尚無資料"}`;
  showRiskSource("scamSource",linkedFeed.sources?.boca?.name||"外交部",linkedFeed.sources?.boca?.url);

  setMiniLight("diseaseLight",d.disease?.level);
  diseaseText.textContent=`${city||country}：${d.disease?.text||"尚無資料"}`;
  showRiskSource("diseaseSource",linkedFeed.sources?.cdc?.name||"疾管署",linkedFeed.sources?.cdc?.url);

  setMiniLight("highRiskLight",d.highrisk?.level);
  const regions=(d.highrisk?.regions||[]);
  highRiskText.innerHTML=
    `<div>${esc(d.highrisk?.text||"")}</div>`+
    (regions.length?`<div class="highrisk-regions">${regions.map(r=>`<span>${esc(r)}</span>`).join("")}</div>`:"");
  showRiskSource("highRiskSource",linkedFeed.sources?.boca?.name||"外交部",linkedFeed.sources?.boca?.url);
}

function syncWeatherLight(){
  const badge=document.getElementById("weatherBadge");
  if(!badge)return;
  let level="neutral";
  if(badge.classList.contains("green"))level="green";
  else if(badge.classList.contains("orange"))level="orange";
  else if(badge.classList.contains("red"))level="red";

  setMiniLight("weatherLight",level);
  const wt=document.getElementById("weatherRiskText");
  const ws=document.getElementById("weatherSummary");
  if(wt)wt.textContent=ws?.innerText?.trim()||"等待即時天氣";
}

async function refreshAllLinkedRisk(){
  const btn=document.getElementById("refreshLinkedRisk");
  if(btn)btn.textContent="更新中…";
  try{
    await loadRiskFeed();
    renderLinkedRisk();
    syncWeatherLight();
    const reg=window.locateAndUpdate;
    if(typeof reg==="function")await reg();
    if(btn)btn.textContent="✅ 已更新";
  }catch{
    if(btn)btn.textContent="⚠️ 更新失敗";
  }
  setTimeout(()=>{if(btn)btn.textContent="立即更新"},1800);
}

document.addEventListener("DOMContentLoaded",async()=>{
  try{
    await loadRiskFeed();
    renderLinkedRisk();
    syncWeatherLight();
  }catch{}

  document.getElementById("refreshLinkedRisk")?.addEventListener("click",refreshAllLinkedRisk);

  // Weather / linked feed polling
  setInterval(async()=>{
    try{
      await loadRiskFeed();
      renderLinkedRisk();
    }catch{}
  },5*60*1000);

  setInterval(()=>{
    if(typeof window.locateAndUpdate==="function")window.locateAndUpdate();
  },30*60*1000);

  setInterval(syncWeatherLight,60*1000);

  // Observe live city/weather changes and re-link immediately
  const obs=new MutationObserver(()=>{renderLinkedRisk();syncWeatherLight()});
  ["liveCountry","liveCity","liveDistrict","weatherBadge","weatherSummary"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)obs.observe(el,{childList:true,subtree:true,attributes:true});
  });
});

window.addEventListener("manual-location-change",()=>{
  renderLinkedRisk();
  syncWeatherLight();
});

window.addEventListener("manual-location-change",()=>{
  renderLinkedRisk();
  syncWeatherLight();
});
