
const KEY="rt_v7_contacts";
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function save(v){localStorage.setItem(KEY,JSON.stringify(v))}
function render(){
 const a=load(),box=$("list");
 if(!a.length){box.innerHTML="<h2>已儲存聯絡人</h2><small>尚未儲存。</small>";return}
 box.innerHTML="<h2>已儲存聯絡人</h2>"+a.map((c,i)=>`<div class="contact-item"><h3>${i+1}. ${escapeHtml(c.name)}</h3><div class="meta">${escapeHtml(c.relation)}</div><div class="meta">事項：${escapeHtml(c.matter)}</div><div class="meta">☎️ ${escapeHtml(c.phone)}</div>${c.note?`<div class="meta">備註：${escapeHtml(c.note)}</div>`:""}<div class="contact-actions"><a class="call" href="${telHref(c.phone)}">☎️ 撥打</a><button data-i="${i}">刪除</button></div></div>`).join("");
 box.querySelectorAll("[data-i]").forEach(b=>b.addEventListener("click",()=>{const a=load();a.splice(+b.dataset.i,1);save(a);render()}));
}
$("save").addEventListener("click",()=>{
 const name=$("name").value.trim(),phone=$("phone").value.trim();if(!name||!phone){alert("請至少填姓名與電話");return}
 const a=load();a.push({name,phone,relation:$("relation").value.trim(),matter:$("matter").value,note:$("note").value.trim()});save(a);
 ["name","phone","relation","note"].forEach(id=>$(id).value="");render();
});
$("clearAll").addEventListener("click",()=>{if(confirm("確定清除全部緊急聯絡人？")){localStorage.removeItem(KEY);render()}});
render();
