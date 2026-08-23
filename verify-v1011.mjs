import fs from "node:fs";
import vm from "node:vm";

const root = new URL("./", import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), "utf8");
const checks = [];
const ok = (name, value) => { if (!value) throw new Error(`FAIL: ${name}`); checks.push(name); };

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read("location-data.js"), context);
const data = context.window.LOCATION_DATA;

ok("13 countries loaded", Object.keys(data).length === 13);
ok("Taiwan has 22 counties/cities", Object.keys(data.TW.cities).length === 22);
ok("Germany has 10 major cities", Object.keys(data.DE.cities).length === 10);
ok("Munich coordinates", data.DE.cities["慕尼黑"].lat === 48.1351 && data.DE.cities["慕尼黑"].lon === 11.582);
ok("Germany emergency numbers", data.DE.emergency.police === "110" && data.DE.emergency.ambulance === "112");

const state = read("state-core.js");
const nearby = read("nearby-service.js");
const app = read("app.js");
const version = read("VERSION.txt");
ok("manual/GPS state separated", /manualLat/.test(state) && /gpsLat/.test(state));
ok("GPS has dedicated timestamp", /gpsUpdatedAt/.test(state) && /gpsUpdatedAt/.test(nearby));
ok("V10.9 state migration exists", /legacyKey:\s*"rt_v109_state"/.test(state));
ok("radius advances by 5 km", /Array\.from\(\{length:8\}/.test(nearby) && /\(i\+1\)\*5/.test(nearby));
ok("15 road candidates", /list\.slice\(0, 15\)/.test(nearby));
ok("stale search blocked", /searchId/.test(nearby));
ok("app version", /V10\.11-GPS-SEPARATED-STEP5-20260823-01/.test(app));
ok("version file", /CACHE=RT-V10\.11-GPS-SEPARATED-113/.test(version));

const saved = new Map([["rt_v109_state", JSON.stringify({countryKey:"DE",country:"德國",city:"柏林",district:"全市",lat:25.04,lon:121.56,locationMode:"gps"})]]);
const stateContext = {
  window: { LOCATION_DATA:data, dispatchEvent(){} }, LOCATION_DATA:data,
  localStorage: { getItem:k=>saved.get(k)||null, setItem:(k,v)=>saved.set(k,v), removeItem:k=>saved.delete(k) },
  CustomEvent: class { constructor(type,init){this.type=type;this.detail=init?.detail} }
};
vm.createContext(stateContext);
vm.runInContext(state, stateContext);
const stateCore = stateContext.window.StateCore;
stateCore.init();
ok("legacy GPS coordinates are not reused", stateCore.get().locationMode === "manual" && stateCore.get().lat === 52.52 && stateCore.get().lon === 13.405);
stateCore.set({gpsLat:25.1,gpsLon:121.7,gpsAccuracy:20,gpsUpdatedAt:Date.now(),locationMode:"gps"},"test-gps");
ok("GPS mode uses only GPS point", stateCore.get().lat === 25.1 && stateCore.get().lon === 121.7 && stateCore.get().countryKey === "DE");
stateCore.set({manualLat:48.1351,manualLon:11.582,city:"慕尼黑",locationMode:"manual"},"test-manual");
ok("manual mode restores manual point", stateCore.get().lat === 48.1351 && stateCore.get().lon === 11.582);

const statusBox={textContent:""},resultBox={innerHTML:""},radiusCalls=[],renders=[];
const nearbyContext={
  window:{App:{awaitManualLocation:async()=>{}}},
  StateCore:{get:()=>({locationMode:"manual",manualLat:48.1351,manualLon:11.582,country:"德國",city:"慕尼黑",district:"全市"}),validPoint:(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))},
  LocationEngine:{},
  App:{distanceKm:()=>1,health(){}},
  document:{getElementById:id=>id==="nearbyStatus"?statusBox:id==="nearbyResults"?resultBox:null},
  esc:String,
  AbortController,
  fetch
};
vm.createContext(nearbyContext);
vm.runInContext(nearby,nearbyContext);
const service=nearbyContext.window.NearbyService;
service.requestOverpass=async(_kind,radius)=>{radiusCalls.push(radius);return {elements:radius<15?[]:Array.from({length:15},(_,i)=>({lat:48.1351+i/1000,lon:11.582+i/1000,tags:{name:`P${i}`}}))}};
service.roadMatrix=async items=>items.map((x,i)=>({...x,driveKm:20-i,driveMin:20-i}));
service.render=(items,_kind,_used,_center,roadReady)=>renders.push({count:items.length,roadReady});
await service.search("hospital");
ok("search expands 5 km at a time", radiusCalls.join(",") === "5,10,15");
ok("straight results render before road results", renders.length === 2 && renders[0].roadReady === false && renders[1].roadReady === true);
ok("road matrix evaluates 15 then returns 6", renders[0].count === 6 && renders[1].count === 6);

for (const name of ["index.html", "risk.html", "sos.html", "contacts.html", "sw.js", "manifest.webmanifest", "404.html"]) {
  const value = read(name);
  ok(`${name} uses cache 113`, !/v=112/.test(value) && /113/.test(value));
}

console.log(`PASS ${checks.length} checks`);
for (const name of checks) console.log(`✓ ${name}`);
