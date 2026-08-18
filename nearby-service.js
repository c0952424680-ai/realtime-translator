const NearbyService = {
  overpassEndpoints: [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
  ],
  osrmEndpoint: "https://router.project-osrm.org",
  currentKind: "",

  state() {
    return StateCore.get();
  },

  validGps(s) {
    const lat = Number(s?.lat);
    const lon = Number(s?.lon);
    return Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180;
  },

  typeLabel(kind) {
    return ({
      hospital: "醫院／急診",
      police: "警察局",
      pharmacy: "藥局",
      fire: "消防局"
    })[kind] || "緊急設施";
  },

  async fetchJson(url, options = {}, timeout = 9000) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, {
        ...options,
        signal: ctl.signal,
        cache: "no-store"
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  },

  query(kind, km) {
    const s = this.state();
    const r = Math.round(km * 1000);

    const filter = kind === "hospital"
      ? `
        nwr["amenity"="hospital"](around:${r},${s.lat},${s.lon});
        nwr["healthcare"="hospital"](around:${r},${s.lat},${s.lon});
        nwr["amenity"="clinic"]["emergency"="yes"](around:${r},${s.lat},${s.lon});
      `
      : kind === "police"
        ? `
          nwr["amenity"="police"](around:${r},${s.lat},${s.lon});
        `
        : kind === "fire"
          ? `
            nwr["amenity"="fire_station"](around:${r},${s.lat},${s.lon});
          `
          : `
            nwr["amenity"="pharmacy"](around:${r},${s.lat},${s.lon});
            nwr["healthcare"="pharmacy"](around:${r},${s.lat},${s.lon});
          `;

    return `[out:json][timeout:20];(${filter});out center tags;`;
  },

  async requestOverpass(kind, km) {
    const q = this.query(kind, km);
    let last;

    for (const ep of this.overpassEndpoints) {
      try {
        const data = await this.fetchJson(ep, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: "data=" + encodeURIComponent(q)
        }, 9000);

        if (Array.isArray(data?.elements)) return data;
      } catch (e) {
        last = e;
      }
    }

    throw last || new Error("附近地圖資料暫時無回應");
  },

  normalize(data, kind) {
    const s = this.state();
    const seen = new Set();
    const out = [];

    for (const e of data?.elements || []) {
      const lat = Number(e.lat ?? e.center?.lat);
      const lon = Number(e.lon ?? e.center?.lon);
      const t = e.tags || {};

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const name =
        t["name:zh-Hant"] ||
        t["name:zh-TW"] ||
        t["name:zh"] ||
        t.name ||
        t.official_name ||
        "";

      // 沒有真實名稱的 POI 不拿來當「最近」結果，避免只顯示地圖釘。
      if (!name.trim()) continue;

      const key = `${lat.toFixed(5)}|${lon.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const phone =
        t.phone ||
        t["contact:phone"] ||
        t["contact:mobile"] ||
        "";

      const address = [
        t["addr:postcode"],
        t["addr:city"],
        t["addr:district"],
        t["addr:street"],
        t["addr:housenumber"]
      ].filter(Boolean).join(" ");

      out.push({
        id: `${e.type || "poi"}-${e.id || key}`,
        name,
        lat,
        lon,
        straightKm: App.distanceKm(
          Number(s.lat),
          Number(s.lon),
          lat,
          lon
        ),
        driveKm: null,
        driveMin: null,
        phone,
        opening: t.opening_hours || "",
        address,
        source: "OpenStreetMap"
      });
    }

    // 先用直線距離縮小候選，再算道路距離，避免遠處 POI 進入路徑計算。
    return out
      .sort((a, b) => a.straightKm - b.straightKm)
      .slice(0, 20);
  },

  async addDrivingDistances(list) {
    const s = this.state();
    if (!list.length) return list;

    const points = [
      `${Number(s.lon)},${Number(s.lat)}`,
      ...list.map(x => `${x.lon},${x.lat}`)
    ].join(";");

    const destinations = list.map((_, i) => i + 1).join(";");

    try {
      const url =
        `${this.osrmEndpoint}/table/v1/driving/${points}` +
        `?sources=0&destinations=${destinations}&annotations=distance,duration`;

      const data = await this.fetchJson(url, {}, 8500);

      const distances = data?.distances?.[0] || [];
      const durations = data?.durations?.[0] || [];

      return list.map((x, i) => ({
        ...x,
        driveKm: Number.isFinite(distances[i])
          ? distances[i] / 1000
          : null,
        driveMin: Number.isFinite(durations[i])
          ? durations[i] / 60
          : null
      }));
    } catch (_) {
      return list;
    }
  },

  sortNearest(list) {
    return [...list]
      .sort((a, b) => {
        const ad = Number.isFinite(a.driveKm) ? a.driveKm : a.straightKm;
        const bd = Number.isFinite(b.driveKm) ? b.driveKm : b.straightKm;
        return ad - bd;
      })
      .slice(0, 8);
  },

  async search(kind) {
    this.currentKind = kind;

    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");
    const s = this.state();

    if (box) box.innerHTML = "";

    if (!this.validGps(s)) {
      if (status) status.textContent =
        "⚠️ 尚未取得有效 GPS。請先允許定位，再搜尋最近設施。";
      if (box) box.innerHTML = this.fallbackButtons(kind);
      return;
    }

    let finalList = [];
    let used = 3;

    // 真正從附近開始，不再直接從 15 公里塞入遠處資料。
    for (const km of [3, 5, 10, 15, 20, 30, 40, 50]) {
      used = km;

      if (status) status.textContent =
        `📍 正在搜尋 ${km} 公里內的${this.typeLabel(kind)}…`;

      try {
        const raw = await this.requestOverpass(kind, km);
        let list = this.normalize(raw, kind);

        if (list.length) {
          if (status) status.textContent =
            `🚗 找到 ${list.length} 個候選地點，正在計算實際道路距離…`;

          list = await this.addDrivingDistances(list);
          finalList = this.sortNearest(list);
        }

        if (finalList.length >= 3) break;
      } catch (_) {}

      if (status) status.textContent =
        `${km} 公里內資料不足，自動擴大搜尋範圍…`;
    }

    if (finalList.length) {
      App.health(
        "nearby",
        "ok",
        `${used} 公里內找到 ${finalList.length} 筆，已依道路距離排序`
      );

      this.render(finalList, kind, used);
      return;
    }

    App.health("nearby", "error", "附近設施來源暫時無回應");

    if (status) status.textContent =
      "⚠️ 暫時無法取得可靠 POI，已切換 Google／Apple 地圖搜尋。";

    if (box) box.innerHTML = this.fallbackButtons(kind);
  },

  fallbackButtons(kind) {
    const s = this.state();
    const kw = this.typeLabel(kind);

    const google =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kw)}`;

    const apple = this.validGps(s)
      ? `https://maps.apple.com/?q=${encodeURIComponent(kw)}&ll=${encodeURIComponent(`${s.lat},${s.lon}`)}`
      : `https://maps.apple.com/?q=${encodeURIComponent(kw)}`;

    return `
      <div class="grid2">
        <a class="btn primary"
           href="${google}"
           target="_blank"
           rel="noopener">
          Google Maps 搜尋
        </a>

        <a class="btn"
           href="${apple}"
           target="_blank"
           rel="noopener">
          Apple 地圖搜尋
        </a>
      </div>`;
  },

  render(list, kind, used) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (status) {
      const hasRoad = list.some(x => Number.isFinite(x.driveKm));
      status.textContent = hasRoad
        ? `✅ 已依「實際道路距離」由近到遠排序｜搜尋範圍 ${used} 公里`
        : `✅ 道路服務暫時不可用，已依 GPS 直線距離由近到遠排序｜搜尋範圍 ${used} 公里`;
    }

    if (!box) return;

    box.innerHTML = list.map((x, i) => {
      const straight =
        x.straightKm < 1
          ? `${Math.round(x.straightKm * 1000)} 公尺`
          : `${x.straightKm.toFixed(1)} 公里`;

      const driving = Number.isFinite(x.driveKm)
        ? `${x.driveKm.toFixed(1)} 公里`
        : null;

      const minutes = Number.isFinite(x.driveMin)
        ? `${Math.max(1, Math.round(x.driveMin))} 分鐘`
        : null;

      const google =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${encodeURIComponent(`${StateCore.get().lat},${StateCore.get().lon}`)}` +
        `&destination=${encodeURIComponent(`${x.lat},${x.lon}`)}` +
        `&travelmode=driving`;

      const apple =
        `https://maps.apple.com/?saddr=${encodeURIComponent(`${StateCore.get().lat},${StateCore.get().lon}`)}` +
        `&daddr=${encodeURIComponent(`${x.lat},${x.lon}`)}` +
        `&dirflg=d`;

      const tel = x.phone
        ? x.phone.replace(/[^\d+]/g, "")
        : "";

      return `
        <article class="near-card">
          <div class="near-rank">${i + 1}</div>

          <div class="near-main">
            <h3>${esc(x.name)}</h3>

            <div class="meta">
              ${driving
                ? `🚗 道路距離 ${driving}${minutes ? `・約 ${minutes}` : ""}`
                : `📍 GPS 直線距離 ${straight}`
              }
            </div>

            ${driving
              ? `<div class="muted">GPS 直線距離：${straight}</div>`
              : ""
            }

            <div class="near-info">
              ${x.address
                ? `📍 ${esc(x.address)}`
                : "📍 地址未公開"}
            </div>

            <div class="near-info">
              ${x.phone
                ? `📞 ${esc(x.phone)}`
                : "📞 電話未公開"}
              ｜
              ${x.opening
                ? `🕒 ${esc(x.opening)}`
                : "🕒 營業資訊未公開"}
            </div>

            <div class="near-actions">
              <a class="btn primary"
                 href="${google}"
                 target="_blank"
                 rel="noopener">
                Google 導航
              </a>

              <a class="btn"
                 href="${apple}"
                 target="_blank"
                 rel="noopener">
                Apple 導航
              </a>

              ${tel
                ? `<a class="btn" href="tel:${tel}">📞 致電</a>`
                : ""
              }
            </div>
          </div>
        </article>`;
    }).join("");
  },

  openFallback(kind) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (status) status.textContent = "已開啟地圖備援搜尋。";
    if (box) box.innerHTML = this.fallbackButtons(kind);
  }
};

window.NearbyService = NearbyService;
