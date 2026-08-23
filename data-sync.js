(()=>{
 const KEY="rt_data_location_v1", VER="rt_data_version_v1", RELOAD="rt_data_reload_guard";
 const valid=x=>x&&typeof x==="object"&&x.TW&&x.TW.cities&&Object.keys(x.TW.cities).length===22;
 try{const cached=JSON.parse(localStorage.getItem(KEY)||"null");if(valid(cached))window.LOCATION_DATA=cached}catch{}
 const u=p=>`${p}${p.includes("?")?"&":"?"}_=${Date.now()}`;
 async function sync(){
  if(!navigator.onLine)return;
  try{
   const vr=await fetch(u("./data/version.json"),{cache:"no-store"});if(!vr.ok)return;
   const meta=await vr.json(), old=localStorage.getItem(VER)||"";
   if(String(meta.version||"")===old)return;
   const dr=await fetch(u("./data/location-data.json"),{cache:"no-store"});if(!dr.ok)return;
   const data=await dr.json();if(!valid(data))throw new Error("invalid location data");
   localStorage.setItem(KEY,JSON.stringify(data));localStorage.setItem(VER,String(meta.version||""));
   window.dispatchEvent(new CustomEvent("location-data-updated",{detail:meta}));
   if(sessionStorage.getItem(RELOAD)!==String(meta.version||"")){sessionStorage.setItem(RELOAD,String(meta.version||""));location.reload()}
  }catch(e){console.warn("DataSync",e)}
 }
 window.DataSync={sync,version:()=>localStorage.getItem(VER)||"內建資料"};
 setTimeout(sync,250);window.addEventListener("online",sync);
})();