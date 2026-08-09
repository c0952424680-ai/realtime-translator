
const rc=$("riskCountry");

function regionItems(items, emptyText){
  if(!items||!items.length)return `<div class="region-empty">${emptyText}</div>`;
  return items.map(x=>`<div class="region-item">${esc(x)}</div>`).join("");
}

function renderRisk(){
  const d=RISK_SNAPSHOT.countries[rc.value];
  $("snapshotTime").textContent=`官方資料快照查核：${RISK_SNAPSHOT.checkedAt}｜位置可即時更新，警示資料需重新部署或查看官方連結取得最新版本。`;
  $("countrySummary").innerHTML=`<h3>${d.name}</h3><p>${esc(d.official)}</p>`;
  $("greenRegions").innerHTML=regionItems(d.green,"目前沒有可列入綠色摘要的地區。");
  $("orangeRegions").innerHTML=regionItems(d.orange,"目前沒有已列入橙色摘要的地區。");
  $("redRegions").innerHTML=regionItems(d.red,"目前沒有已列入紅色摘要的地區。");
  $("officialRiskLink").href=d.source;
}
rc.onchange=renderRisk;

$("useLocation").onclick=()=>{
  if(!navigator.geolocation){
    $("locationText").textContent="此瀏覽器不支援定位。";
    return;
  }
  $("locationText").textContent="正在取得位置…";
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude.toFixed(5),lon=pos.coords.longitude.toFixed(5);
    $("locationText").textContent=`即時位置：${lat}, ${lon}（請確認上方國家選擇是否正確）`;
    $("currentMapLink").href=`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  },err=>{
    $("locationText").textContent="無法取得定位；請在 Safari 允許此網站使用位置，或手動選擇國家。";
  },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
};

renderRisk();
