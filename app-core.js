
const AppCore={
  async init(){
    try{
      await AppState.load();
      AppUI.init();
      if(document.body.dataset.page==="risk"){RiskUI.init();LiveEventUI.init();}
      if(document.body.dataset.page==="sos")EmergencyUI.init();
      UpdateService.start();
      window.dispatchEvent(new Event("app-ready"));
    }catch(e){
      console.error(e);
      const el=document.getElementById("appBootError");
      if(el)el.textContent="App 資料載入失敗，請重新整理或確認網路。";
    }
  }
};
window.AppCore=AppCore;
document.addEventListener("DOMContentLoaded",()=>AppCore.init());
