
const BUILD_ID="V7.4-FRESH-20260809-01";
const $=id=>document.getElementById(id);
const LANGS={
"zh-TW":"🇹🇼 中文（繁體）","en-US":"🇺🇸 English（英文）","ja-JP":"🇯🇵 日本語（日文）","ko-KR":"🇰🇷 한국어（韓文）",
"th-TH":"🇹🇭 ไทย（泰文）","vi-VN":"🇻🇳 Tiếng Việt（越南文）","ms-MY":"🇲🇾 Bahasa Melayu（馬來文）",
"id-ID":"🇮🇩 Bahasa Indonesia（印尼文）","fil-PH":"🇵🇭 Filipino（菲律賓文）","km-KH":"🇰🇭 ខ្មែរ（高棉文）",
"lo-LA":"🇱🇦 ລາວ（寮文）","my-MM":"🇲🇲 မြန်မာ（緬甸文）","mn-MN":"🇲🇳 Монгол（蒙古文）"
};
function opts(sel){return Object.entries(LANGS).map(([v,n])=>`<option value="${v}" ${v===sel?"selected":""}>${n}</option>`).join("")}
function tel(v){return "tel:"+String(v||"").replace(/[^\d+]/g,"")}
function maps(q){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q)}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function netBadge(){const el=document.getElementById("net");if(!el)return;el.textContent=navigator.onLine?"🟢 線上":"🔴 離線";}
window.addEventListener("online",netBadge);window.addEventListener("offline",netBadge);document.addEventListener("DOMContentLoaded",netBadge);
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js?v=74").catch(()=>{});
