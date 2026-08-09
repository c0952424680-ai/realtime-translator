
const $=id=>document.getElementById(id);
const LANGS={
"zh-TW":"🇹🇼 中文","en-US":"🇺🇸 English（英文）","ja-JP":"🇯🇵 日本語（日文）","ko-KR":"🇰🇷 한국어（韓文）",
"th-TH":"🇹🇭 ไทย（泰文）","vi-VN":"🇻🇳 Tiếng Việt（越南文）","ms-MY":"🇲🇾 Bahasa Melayu（馬來文）",
"id-ID":"🇮🇩 Bahasa Indonesia（印尼文）","fil-PH":"🇵🇭 Filipino（菲律賓文）","km-KH":"🇰🇭 ខ្មែរ（高棉文）",
"lo-LA":"🇱🇦 ລາວ（寮文）","my-MM":"🇲🇲 မြန်မာ（緬甸文）","mn-MN":"🇲🇳 Монгол（蒙古文）"};
function opts(sel){return Object.entries(LANGS).map(([v,n])=>`<option value="${v}" ${v===sel?"selected":""}>${n}</option>`).join("")}
function tel(v){return "tel:"+String(v||"").replace(/[^\d+]/g,"")}
function maps(q){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q)}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=74").catch(()=>{});


// V7.4 共用：網路狀態、資料新鮮度與安全工具
function setNetworkBadge(){
  const el=document.getElementById("networkBadge");
  if(!el)return;
  const online=navigator.onLine;
  el.textContent=online?"🟢 線上":"🔴 離線";
  el.className="network-badge "+(online?"online":"offline");
}
window.addEventListener("online",setNetworkBadge);
window.addEventListener("offline",setNetworkBadge);
document.addEventListener("DOMContentLoaded",setNetworkBadge);

function daysSince(dateStr){
  const d=new Date(dateStr+"T00:00:00");
  return Math.floor((Date.now()-d.getTime())/86400000);
}
function freshnessLabel(dateStr){
  const days=daysSince(dateStr);
  if(days<=30)return {text:`✅ 官方資料查核：${dateStr}`,cls:"fresh"};
  if(days<=60)return {text:`⚠️ 已 ${days} 天未重新查核：${dateStr}`,cls:"aging"};
  return {text:`🚨 已 ${days} 天未重新查核，請先查看官方最新公告：${dateStr}`,cls:"stale"};
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    return false;
  }
}
