
const offices={
"th":{name:"駐泰國代表處",phone:"+66-2-1193555",emergency:"+66-81-6664006",address:"40/64 Vibhavadi-Rangsit 66, Laksi, Bangkok 10210, Thailand",lang:"th-TH"},
"vn":{name:"駐越南代表處（河內）",phone:"+84-24-38335501",emergency:"+84-913219986",address:"PVI Tower, No.1 Pham Van Bach Road, Cau Giay, Hanoi, Vietnam",lang:"vi-VN"},
"my":{name:"駐馬來西亞代表處",phone:"+60-3-21614439",emergency:"+60-19-6569912",address:"Menara Yayasan Tun Razak, 200 Jalan Bukit Bintang, Kuala Lumpur",lang:"ms-MY"},
"sg":{name:"駐新加坡代表處",phone:"+65-65000100",emergency:"+65-96389436",address:"460 Alexandra Road #23-00, mTower, Singapore 119963",lang:"en-US"},
"id":{name:"駐印尼代表處",phone:"+62-21-5153939",emergency:"+62-811-984676",address:"Gedung Artha Graha, Jl. Jend. Sudirman Kav.52-53, Jakarta",lang:"id-ID"},
"ph":{name:"駐菲律賓代表處",phone:"+63-2-88876688",emergency:"+63-9178194597",address:"RCBC Plaza, 6819 Ayala Avenue, Makati City, Philippines",lang:"fil-PH"},
"jp":{name:"駐日本代表處",phone:"+81-3-32807811",emergency:"+81-80-10097179",address:"5-20-2 Shirokanedai, Minato-ku, Tokyo, Japan",lang:"ja-JP"},
"kr":{name:"駐韓國代表處",phone:"+82-2-63296000",emergency:"+82-10-90802761",address:"149 Sejong-daero, Jongno-gu, Seoul, Republic of Korea",lang:"ko-KR"},
"mm":{name:"駐緬甸代表處",phone:"+95-9-427355550",emergency:"+95-9-257257575",address:"Dhammazedi Road, Kamayut Township, Yangon, Myanmar",lang:"my-MM"},
"bn":{name:"駐汶萊代表處",phone:"+673-2455482",emergency:"+673-8956338",address:"Jalan Sungai Akar, Bandar Seri Begawan, Brunei Darussalam",lang:"ms-MY"}
};
const country=$("country");country.innerHTML=Object.entries(offices).map(([k,v])=>`<option value="${k}">${v.name.replace("駐","🇹🇼 駐")}</option>`).join("");
const localNumbers={
my:[["🚨 全國緊急","999"]],sg:[["👮 警察","999"],["🚒🔥 消防／緊急救護","995"]],ph:[["🚨 Unified 911","911"]],
id:[["👮 警察","110"],["🚑 醫療","119"]],bn:[["🚑 救護","991"],["👮 警察","993"],["🚒🔥 消防","995"]]
};
const phrases={
injury:["我受傷了，需要醫療協助。","請幫我叫救護車。"],crime:["我遭到搶劫或攻擊，請幫我聯絡警察。"],traffic:["我發生車禍，需要警察和醫療協助。"],
passport:["我的護照遺失了，請幫我聯絡台灣駐外代表處。"],detained:["我是台灣旅客，我需要聯絡台灣駐外代表處。"],
scam:["我可能遭到詐騙或限制人身自由，請幫我聯絡警察。"],disaster:["這裡是否需要撤離？請告訴我最近的安全避難地點。"],other:["我是台灣旅客，我需要幫助。"]
};
function render(){
 const inc=$("incident").value,d=offices[country.value];
 $("sosSteps").innerHTML=`<h2>立即處理步驟</h2><ol class="steps-list">
 <li><b>先離開危險現場</b>，前往警察局、醫院、飯店、避難所或人多安全處。</li>
 <li><b>有立即生命危險</b>：先撥當地警察／消防／救護。</li>
 <li><b>聯絡台灣駐外館處</b>：重大急難使用急難電話。</li>
 <li><b>開 Google Maps</b>：導航到館處、醫院或警察局。</li>
 <li><b>聯絡家人</b>：告知位置、事件、是否受傷；保留報案與醫療證明。</li></ol>`;
 const local=(localNumbers[country.value]||[]).map(x=>`<a class="emergency-link" href="${telHref(x[1])}">${x[0]} ${x[1]}</a>`).join("");
 $("officialContact").innerHTML=`<h2>${d.name}</h2><div class="meta">☎️ 辦公室：${d.phone}</div><div class="meta">🆘 急難：${d.emergency}</div><div class="meta">📍 ${d.address}</div>
 <div class="office-actions">${local}<a href="${telHref(d.emergency)}">🆘 台灣館處急難電話</a><a href="${mapsHref(d.address)}" target="_blank">📍 Google Maps 導航</a><a href="tel:+886800085095">🇹🇼 外交部緊急中心</a></div>`;
 $("phrase").innerHTML=phrases[inc].map(x=>`<option>${x}</option>`).join("");
}
$("incident").addEventListener("change",render);country.addEventListener("change",render);render();

async function translatePhrase(){
 const d=offices[country.value],text=$("phrase").value,tl=d.lang.split("-")[0];
 const url="https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl="+encodeURIComponent(tl)+"&dt=t&q="+encodeURIComponent(text);
 $("phraseOutput").textContent="翻譯中…";
 try{const r=await fetch(url,{cache:"no-store"}),j=await r.json();$("phraseOutput").textContent=j[0].map(x=>x[0]||"").join("")||text}catch{$("phraseOutput").textContent=text}
}
$("translatePhrase").addEventListener("click",translatePhrase);
$("phrase").addEventListener("change",translatePhrase);
$("speakPhrase").addEventListener("click",()=>{const d=offices[country.value],t=$("phraseOutput").textContent;if(!t||t==="翻譯中…")return;const u=new SpeechSynthesisUtterance(t);u.lang=d.lang;u.rate=.84;speechSynthesis.cancel();speechSynthesis.speak(u)});
