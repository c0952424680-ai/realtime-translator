
const BUILD_ID="V8.3";
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
window.addEventListener("online",netBadge);
window.addEventListener("offline",netBadge);
document.addEventListener("DOMContentLoaded",netBadge);

const CURRENT_BUILD="V8.3";
(async function forceUpgrade(){
  try{
    const previous=localStorage.getItem("rt_current_build");
    if(previous!==CURRENT_BUILD){
      localStorage.setItem("rt_current_build",CURRENT_BUILD);

      if("serviceWorker" in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }

      if("caches" in window){
        const keys=await caches.keys();
        await Promise.all(keys.map(k=>caches.delete(k)));
      }

      const u=new URL(location.href);
      if(u.searchParams.get("build")!==CURRENT_BUILD){
        u.searchParams.set("build",CURRENT_BUILD);
        location.replace(u.toString());
        return;
      }
    }

    if("serviceWorker" in navigator){
      await navigator.serviceWorker.register("./sw.js?v=83");
    }
  }catch(e){
    console.warn("V8.3.1 force-upgrade cleanup failed",e);
  }
})();

function detectLangByText(text){
  const t=(text||"").trim();
  if(!t)return null;
  if(/[ぁ-んァ-ン]/.test(t)) return "ja-JP";
  if(/[가-힣]/.test(t)) return "ko-KR";
  if(/[\u0E00-\u0E7F]/.test(t)) return "th-TH";
  if(/[\u1000-\u109F]/.test(t)) return "my-MM";
  if(/[\u1780-\u17FF]/.test(t)) return "km-KH";
  if(/[\u0E80-\u0EFF]/.test(t)) return "lo-LA";
  if(/[A-Za-z]/.test(t) && !/[\u4E00-\u9FFF]/.test(t)) return "en-US";
  if(/[\u4E00-\u9FFF]/.test(t)) return "zh-TW";
  return null;
}
