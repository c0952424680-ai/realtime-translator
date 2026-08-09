
const CK="rt74contacts";
const TK="rt74travel";

function loadArr(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}}
function loadObj(k){try{return JSON.parse(localStorage.getItem(k)||"{}")}catch{return{}}}

function renderContacts(){
  const a=loadArr(CK);
  $("clist").innerHTML=a.length?a.map((x,i)=>`
    <div class="card">
      <b>${esc(x.n)}</b>
      <div>${esc(x.r)}</div>
      <a class="callbtn" href="${tel(x.p)}">☎️ ${esc(x.p)}</a>
      <div>${esc(x.m)}</div>
      <button data-del="${i}">刪除</button>
    </div>`).join(""):'<div class="small">尚未儲存緊急聯絡人</div>';

  document.querySelectorAll("[data-del]").forEach(btn=>{
    btn.onclick=()=>{
      const arr=loadArr(CK);
      arr.splice(Number(btn.dataset.del),1);
      localStorage.setItem(CK,JSON.stringify(arr));
      renderContacts();
    };
  });
}
$("csave").onclick=()=>{
  const n=$("cname").value.trim(),p=$("cphone").value.trim();
  if(!n||!p){alert("請至少填寫姓名與電話");return}
  const arr=loadArr(CK);
  arr.push({n,p,r:$("crel").value.trim(),m:$("cmatter").value.trim()});
  localStorage.setItem(CK,JSON.stringify(arr));
  renderContacts();
};
renderContacts();

let cardVisible=false;

function renderTravel(){
  const d=loadObj(TK);
  if(!d.name){
    $("cardview").innerHTML='<div class="small">尚未建立旅行資料卡</div>';
    return;
  }
  $("cardview").innerHTML=`
    <div class="travelcard">
      <h2>${esc(d.name)}</h2>
      <div>國籍：${esc(d.nat)}</div>
      <div>血型：${esc(d.blood)}</div>
      <div>出生年份：${esc(d.birth)}</div>
      <div>過敏：${esc(d.allergy)}</div>
      <div>慢性病：${esc(d.condition)}</div>
      <div>藥物：${esc(d.meds)}</div>
      <div>保險：${esc(d.ins)}</div>
      <div>保險電話：${esc(d.insphone)}</div>
      <div>護照末四碼：${esc(d.pass4)}</div>
      <div>備註：${esc(d.note)}</div>
      ${d.insphone?`<a class="callbtn" href="${tel(d.insphone)}">☎️ 撥打保險公司</a>`:""}
    </div>`;
}
$("savecard").onclick=()=>{
  const d={};
  ["name","nat","blood","birth","allergy","condition","meds","ins","insphone","pass4","note"].forEach(k=>d[k]=$(k).value.trim());
  if(!d.name){alert("請至少填寫姓名");return}
  localStorage.setItem(TK,JSON.stringify(d));
  alert("旅行資料卡已儲存在此裝置");
  if(cardVisible)renderTravel();
};
$("showcard").onclick=()=>{
  cardVisible=!cardVisible;
  $("cardview").style.display=cardVisible?"block":"none";
  if(cardVisible)renderTravel();
};
$("cardview").style.display="none";
