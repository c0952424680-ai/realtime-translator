
const DATA={
"th":["🇹🇭 泰國","駐泰國代表處","+66-2-1193555","+66-81-6664006","40/64 Vibhavadi-Rangsit 66, Laksi, Bangkok 10210, Thailand"],
"vn":["🇻🇳 越南","駐越南代表處","+84-24-38335501","+84-913219986","PVI Tower, No.1 Pham Van Bach Road, Cau Giay, Hanoi, Vietnam"],
"my":["🇲🇾 馬來西亞","駐馬來西亞代表處","+60-3-21614439","+60-19-6569912","Menara Yayasan Tun Razak, 200 Jalan Bukit Bintang, Kuala Lumpur"],
"sg":["🇸🇬 新加坡","駐新加坡代表處","+65-65000100","+65-96389436","460 Alexandra Road #23-00, mTower, Singapore 119963"],
"id":["🇮🇩 印尼","駐印尼代表處","+62-21-5153939","+62-811-984676","Gedung Artha Graha, Jl. Jend. Sudirman Kav.52-53, Jakarta"],
"ph":["🇵🇭 菲律賓","駐菲律賓代表處","+63-2-88876688","+63-9178194597","RCBC Plaza, 6819 Ayala Avenue, Makati City, Philippines"],
"jp":["🇯🇵 日本","駐日本代表處","+81-3-32807811","+81-80-10097179","5-20-2 Shirokanedai, Minato-ku, Tokyo, Japan"],
"kr":["🇰🇷 韓國","駐韓國代表處","+82-2-63296000","+82-10-90802761","149 Sejong-daero, Jongno-gu, Seoul, Republic of Korea"]
};
const c=$("country");c.innerHTML=Object.entries(DATA).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");
function render(){
 const d=DATA[c.value];
 $("steps").innerHTML="<h2>處理步驟</h2><ol><li>離開危險現場，移動到警察局、醫院、飯店或避難處。</li><li>有生命危險先聯絡當地警消醫療。</li><li>聯絡台灣駐外館處急難電話。</li><li>用 Google Maps 導航到安全地點。</li><li>通知緊急聯絡人，保留報案與醫療紀錄。</li></ol>";
 $("office").innerHTML=`<h2>${d[1]}</h2><div>☎️ 辦公室：${d[2]}</div><div>🆘 急難：${d[3]}</div><div>📍 ${d[4]}</div><div class="office-actions"><a class="hot" href="${telHref(d[3])}">🆘 撥急難電話</a><a href="${mapsHref(d[4])}" target="_blank">📍 Google Maps</a><a href="tel:+886800085095">🇹🇼 外交部緊急中心</a></div>`;
}
c.onchange=render;render();
