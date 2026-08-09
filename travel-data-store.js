
const TravelDataStore={
  get data(){return window.DataCenter?.data||null;},
  get loadedAt(){return window.DataCenter?.loadedAt||null;},
  get source(){return window.DataCenter?.source||"none";},
  async load(force=false){return await window.DataCenter.load(force);},
  country(code){return window.DataCenter?.country(code)||null;},
  freshnessText(){return window.DataCenter?.freshnessText()||"尚未更新";}
};
window.TravelDataStore=TravelDataStore;
