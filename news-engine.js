const NewsEngine={
 items:[],sourceStatus:{gdacs:"idle"},
 async fetchText(url,ms=4500){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:"no-store",signal:c.signal});clearTimeout(t);if(!r.ok)throw new Error("http");return await r.text()}catch(e){clearTimeout(t);throw e}},
 async gdacs(){try{const txt=await this.fetchText("https://www.gdacs.org/xml/rss.xml",4500);const xml=new DOMParser().parseFromString(txt,"text/xml");const rows=[...xml.querySelectorAll("item")].slice(0,10).map(x=>({title:x.querySelector("title")?.textContent||"GDACS 警報",url:x.querySelector("link")?.textContent||"https://www.gdacs.org/",source:"GDACS"}));this.items.push(...rows);this.sourceStatus.gdacs="ok"}catch{this.sourceStatus.gdacs="error"}},
 officialLinks(){const s=StateCore.get(),country=LOCATION_DATA[s.countryKey]?.name||s.country;return [{title:`查看 ${country} 當地官方緊急資訊`,url:"https://www.google.com/search?q="+encodeURIComponent(country+" 政府 緊急 警報 官方"),source:"官方入口"},{title:"外交部領事事務局旅遊警示",url:"https://www.boca.gov.tw/",source:"台灣外交部"}]},
 merge(){const seen=new Set(),out=[];for(const x of [...this.items,...this.officialLinks()]){const k=(x.title||"")+"|"+(x.url||"");if(seen.has(k))continue;seen.add(k);out.push(x)}return out.slice(0,12)}
};window.NewsEngine=NewsEngine;
