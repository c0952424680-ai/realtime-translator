
const D={"th":["泰國","駐泰國代表處","+66-2-1193555","+66-81-6664006","40/64 Vibhavadi-Rangsit 66, Laksi, Bangkok"],"vn":["越南","駐越南代表處","+84-24-38335501","+84-913219986","PVI Tower, Hanoi"],"my":["馬來西亞","駐馬來西亞代表處","+60-3-21614439","+60-19-6569912","Menara Yayasan Tun Razak, Kuala Lumpur"],"sg":["新加坡","駐新加坡代表處","+65-65000100","+65-96389436","460 Alexandra Road, Singapore"],"id":["印尼","駐印尼代表處","+62-21-5153939","+62-811-984676","Gedung Artha Graha, Jakarta"],"ph":["菲律賓","駐菲律賓代表處","+63-2-88876688","+63-9178194597","RCBC Plaza, Makati"],"jp":["日本","駐日本代表處","+81-3-32807811","+81-80-10097179","5-20-2 Shirokanedai, Tokyo"],"kr":["韓國","駐韓國代表處","+82-2-63296000","+82-10-90802761","149 Sejong-daero, Seoul"]};const c=$("country");c.innerHTML=Object.entries(D).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");let n=0;function steps(){return["先離開危險現場，到警察局、醫院、飯店、避難所或人多安全處。","若有人重傷、失去意識、呼吸困難、持續出血或受困，立即聯絡當地警消醫療。","聯絡台灣駐外館處急難電話。","使用 Google Maps 前往館處、警察局、醫院或避難處。","通知緊急聯絡人，告知位置、事件、是否受傷並保存證據。"]}function render(){const s=steps(),d=D[c.value];$("prog").textContent=`第 ${n+1} 步／共 ${s.length} 步`;$("guide").innerHTML=`<h2>${s[n]}</h2>`;$("prev").disabled=n===0;$("office").innerHTML=`<h2>${d[1]}</h2><div>☎️ ${d[2]}</div><div>🆘 ${d[3]}</div><div>📍 ${d[4]}</div><a class="hot" href="${tel(d[3])}">🆘 撥急難電話</a><a href="${maps(d[4])}" target="_blank">📍 Google Maps</a><a href="tel:+886800085095">🇹🇼 外交部緊急中心</a>`}$("next").onclick=()=>{n=n>=steps().length-1?0:n+1;render()};$("prev").onclick=()=>{if(n>0)n--;render()};c.onchange=()=>{n=0;render()};render();

const OFFLINE_EN={
"我是台灣旅客，我需要幫助。":"I am a traveler from Taiwan. I need help.",
"請幫我聯絡警察。":"Please help me contact the police.",
"我需要醫療協助。":"I need medical assistance.",
"請幫我聯絡台灣駐外館處。":"Please help me contact the Taiwan representative office.",
"我的護照遺失了。":"My passport is lost."
};
function renderOfflinePhrase(){
  const t=$("offlinePhrase").value;
  $("offlineEnglish").textContent=OFFLINE_EN[t]||t;
}
$("offlinePhrase").onchange=renderOfflinePhrase;
$("copyOffline").onclick=async()=>{const ok=await copyText($("offlineEnglish").textContent);$("copyOffline").textContent=ok?"✅ 已複製":"請長按文字複製"};
$("speakOffline").onclick=()=>{const u=new SpeechSynthesisUtterance($("offlineEnglish").textContent);u.lang="en-US";u.rate=.84;speechSynthesis.cancel();speechSynthesis.speak(u)};
renderOfflinePhrase();
