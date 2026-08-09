
const KEY="rt_v72_contacts";
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function saveAll(a){localStorage.setItem(KEY,JSON.stringify(a))}
function render(){const a=load();$("list").innerHTML="<h2>已儲存聯絡人</h2>"+(a.length?a.map((c,i)=>`<div class="contact-item"><h3>${i+1}. ${esc(c.name)}</h3><div>${esc(c.relation)}</div><div>☎️ ${esc(c.phone)}</div><div>事項：${esc(c.matter)}</div><div class="small">${esc(c.note)}</div><div class="actions"><a href="${telHref(c.phone)}">☎️ 撥打</a><button data-i="${i}">刪除</button></div></div>`).join(""):"<span class='small'>尚未儲存</span>");document.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const a=load();a.splice(+b.dataset.i,1);saveAll(a);render()})}
$("save").onclick=()=>{const n=$("name").value.trim(),p=$("phone").value.trim();if(!n||!p){alert("請至少填姓名與電話");return}const a=load();a.push({name:n,phone:p,relation:$("relation").value.trim(),matter:$("matter").value,note:$("note").value.trim()});saveAll(a);render()};
$("clearAll").onclick=()=>{if(confirm("確定清除全部？")){localStorage.removeItem(KEY);render()}};render();
