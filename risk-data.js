
const RISK_SNAPSHOT = {
  checkedAt:"2026-08-09",
  countries:{
    jp:{
      name:"🇯🇵 日本",
      appLevel:"green",
      official:"外交部頁面目前特別提醒福島縣「歸返困難區域」應避免前往。",
      green:["東京、大阪、京都、札幌等一般旅遊區域（App 相對低風險摘要，非官方安全認證）"],
      orange:["福島縣歸返困難區域：飯館村、葛尾村、南相馬市、浪江町、雙葉町、大熊町、富岡町部分區域"],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-2137-338f3-1.html"
    },
    kr:{
      name:"🇰🇷 韓國",
      appLevel:"green",
      official:"外交部目前列第一級灰色提醒。",
      green:["首爾、釜山、濟州等一般旅遊地區（App 相對低風險摘要）"],
      orange:[],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-2972-e7941-1.html"
    },
    vn:{
      name:"🇻🇳 越南",
      appLevel:"green",
      official:"外交部目前列第一級灰色提醒。",
      green:["河內、峴港、胡志明市等一般旅遊地區（App 相對低風險摘要）"],
      orange:[],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-2383-405a4-1.html"
    },
    my:{
      name:"🇲🇾 馬來西亞",
      appLevel:"green",
      official:"馬來西亞整體第一級灰色提醒；沙巴東部沿海地區第二級黃色注意。",
      green:["吉隆坡、檳城、麻六甲等一般旅遊地區（App 相對低風險摘要）"],
      orange:["沙巴東部沿海地區（含島嶼、潛水地點、度假村等）— 綁架風險，官方黃色注意"],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-3004-4114a-1.html"
    },
    ph:{
      name:"🇵🇭 菲律賓",
      appLevel:"green",
      official:"菲律賓整體第一級灰色提醒；民答那峨島第三級橙色避免前往；坎拉翁火山警戒區應遠離。",
      green:["馬尼拉、宿霧等未被外交部列為橙／紅特殊區域的常見旅遊地區（非安全保證）"],
      orange:["民答那峨島 — 官方第三級橙色避免前往","坎拉翁火山政府警戒區域 — 應遠離並遵從當地安全指示"],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-2730-bcdd7-1.html"
    },
    th:{
      name:"🇹🇭 泰國",
      appLevel:"orange",
      official:"泰國整體第二級黃色注意；部分泰柬邊境府為第三級橙色避免前往。",
      green:[],
      orange:[
        "泰國全境 — 官方第二級黃色注意，App 以橙色表示提高警覺",
        "烏汶府、四色菊府、素林府、武里喃府、沙繳府、達勒府、尖竹汶府之泰柬邊境50公里內 — 官方第三級橙色避免前往"
      ],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-2936-ae708-1.html"
    },
    id:{
      name:"🇮🇩 印尼",
      appLevel:"orange",
      official:"外交部目前列第二級黃色注意。",
      green:[],
      orange:["印尼全境 — 官方第二級黃色注意；峇里島水域活動須特別注意溺水風險"],
      red:[],
      source:"https://www.boca.gov.tw/sp-trwa-content-2190-4a1bc-1.html"
    }
  }
};
