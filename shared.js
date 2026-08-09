
const $ = id => document.getElementById(id);

const LANGS = {
  "zh-TW":"🇹🇼 中文（繁體中文）",
  "en-US":"🇺🇸 English（英文）",
  "ja-JP":"🇯🇵 日本語（日文）",
  "ko-KR":"🇰🇷 한국어（韓文）",
  "th-TH":"🇹🇭 ไทย（泰文）",
  "vi-VN":"🇻🇳 Tiếng Việt（越南文）",
  "ms-MY":"🇲🇾 Bahasa Melayu（馬來文）",
  "id-ID":"🇮🇩 Bahasa Indonesia（印尼文）",
  "fil-PH":"🇵🇭 Filipino（菲律賓文／他加祿語）",
  "km-KH":"🇰🇭 ខ្មែរ（高棉文／柬埔寨）",
  "lo-LA":"🇱🇦 ລາວ（寮文）",
  "my-MM":"🇲🇲 မြန်မာ（緬甸文）",
  "ta-IN":"🇸🇬 தமிழ்（坦米爾文）",
  "mn-MN":"🇲🇳 Монгол（蒙古文）"
};

function options(selected){
  return Object.entries(LANGS).map(([v,n]) =>
    `<option value="${v}" ${v===selected?"selected":""}>${n}</option>`
  ).join("");
}
function telHref(v){ return "tel:"+String(v||"").replace(/[^\d+]/g,""); }
function mapsHref(q){
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
}
function esc(s){
  return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
(function markNav(){
  const p = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".bottom-nav a").forEach(a=>{
    if(a.getAttribute("href")===p) a.classList.add("active");
  });
})();
