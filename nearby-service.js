const NearbyService = {
  workerEndpoints: [
    "https://travel-safety-autosync.c0952424680.workers.dev",
    "https://c0952424680.workers.dev"
  ],
  overpassEndpoints: [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
  ],
  currentKind: "",

  state() {
    return StateCore.get();
  },

  validGps(s) {
    const lat = Number(s?.lat);
    const lon = Number(s?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  },

  apiType(kind) {
    return ({ hospital: "medical", police: "police", pharmacy: "pharmacy", fire: "fire" })[kind] || kind;
  },

  async fetchJson(url, options = {}, timeout = 6500) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { ...options, signal: ctl.signal, cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  },

  normalizeWorker(data, kind) {
    const s = this.state();
    const rows = Array.isArray(data?.records) ? data.records : Array.isArray(data?.data) ? data.data : [];
    const seen = new Set();
    const out = [];

    for (const x of rows) {
      const lat = Number(x.latitude ?? x.lat);
      const lon = Number(x.longitude ?? x.lng ?? x.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const name = x.name_zh_tw || x.name_zh || x.name_en || x.name || ({
        hospital: "未命名醫院",
        police: "未命名警察機關",
        pharmacy: "未命名藥局",
        fire: "未命名消防單位"
      })[kind] || "未命名設施";

      const key = `${name}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const calculated = App.distanceKm(Number(s.lat), Number(s.lon), lat, lon);
      out.push({
        name,
        lat,
        lon,
        distanceKm: Number.isFinite(Number(x.distance_km)) ? Number(x.distance_km) : calculated,
        phone: x.phone || "",
        opening: x.opening_hours || x.opening || "",
        address: x.address || [x.city_name, x.district_name].filter(Boolean).join(" "),
        mapUrl: x.google_maps_url || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
        source: "安全資料庫"
      });
    }

    return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
  },

  async requestWorker(kind, km) {
    const s = this.state();
    const type = this.apiType(kind);
    let last;

    for (const base of this.workerEndpoints) {
      try {
        const url = `${base.replace(/\/$/, "")}/nearby-services?lat=${encodeURIComponent(s.lat)}&lng=${encodeURIComponent(s.lon)}&service_type=${encodeURIComponent(type)}&radius_km=${encodeURIComponent(km)}`;
        const data = await this.fetchJson(url, {}, 6500);
        const list = this.normalizeWorker(data, kind);
        if (data?.ok !== false && list.length) return list;
      } catch (e) {
        last = e;
      }
    }

    throw last || new Error("worker unavailable");
  },

  query(kind, km) {
    const s = this.state();
    const r = Math.round(km * 1000);
    const filter = kind === "hospital"
      ? `nwr["amenity"="hospital"](around:${r},${s.lat},${s.lon});nwr["healthcare"="hospital"](around:${r},${s.lat},${s.lon});nwr["amenity"="clinic"]["emergency"="yes"](around:${r},${s.lat},${s.lon});`
      : kind === "police"
        ? `nwr["amenity"="police"](around:${r},${s.lat},${s.lon});`
        : kind === "fire"
          ? `nwr["amenity"="fire_station"](around:${r},${s.lat},${s.lon});`
          : `nwr["amenity"="pharmacy"](around:${r},${s.lat},${s.lon});nwr["healthcare"="pharmacy"](around:${r},${s.lat},${s.lon});`;

    return `[out:json][timeout:18];(${filter});out center tags;`;
  },

  async requestOverpass(kind, km) {
    const q = this.query(kind, km);
    let last;

    for (const ep of this.overpassEndpoints) {
      try {
        return await this.fetchJson(ep, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: "data=" + encodeURIComponent(q)
        }, 7000);
      } catch (e) {
        last = e;
      }
    }

    throw last || new Error("overpass unavailable");
  },

  normalizeOverpass(data, kind) {
    const s = this.state();
    const seen = new Set();
    const out = [];

    for (const e of data?.elements || []) {
      const lat = Number(e.lat ?? e.center?.lat);
      const lon = Number(e.lon ?? e.center?.lon);
      const t = e.tags || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const name = t["name:zh-Hant"] || t["name:zh"] || t["name:en"] || t.name || ({
        hospital: "未命名醫院",
        police: "未命名警察機關",
        pharmacy: "未命名藥局",
        fire: "未命名消防單位"
      })[kind] || "未命名設施";

      const key = `${name}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        name,
        lat,
        lon,
        distanceKm: App.distanceKm(Number(s.lat), Number(s.lon), lat, lon),
        phone: t.phone || t["contact:phone"] || "",
        opening: t.opening_hours || "",
        address: [t["addr:housenumber"], t["addr:street"], t["addr:district"], t["addr:city"]].filter(Boolean).join(" "),
        mapUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
        source: "OpenStreetMap"
      });
    }

    return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
  },

  async search(kind) {
    this.currentKind = kind;
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");
    const s = this.state();

    if (box) box.innerHTML = "";

    if (!this.validGps(s)) {
      if (status) status.textContent = "⚠️ 尚未取得有效位置，請先允許定位或手動選擇所在地。";
      if (box) box.innerHTML = this.fallbackButtons(kind);
      return;
    }

    if (status) status.textContent = "📍 正在搜尋 15 公里內最近設施…";

    let best = [];
    let used = 15;
    let source = "";

    for (const km of [15, 20, 25, 30, 35, 40, 45, 50]) {
      used = km;
      if (status) status.textContent = `📍 正在搜尋 ${km} 公里內最近設施…`;

      try {
        const workerList = await this.requestWorker(kind, km);
        if (workerList.length) {
          best = workerList;
          source = "安全資料庫";
        }
      } catch (_) {}

      if (best.length < 3) {
        try {
          const raw = await this.requestOverpass(kind, km);
          const osm = this.normalizeOverpass(raw, kind);
          if (osm.length > best.length) {
            best = osm;
            source = "OpenStreetMap";
          }
        } catch (_) {}
      }

      if (best.length >= 3) break;
      if (status) status.textContent = `${km} 公里內資料不足，自動擴大 5 公里搜尋…`;
    }

    if (best.length) {
      App.health("nearby", "ok", `${used} 公里內找到 ${best.length} 筆`);
      this.render(best, kind, used, source);
      return;
    }

    App.health("nearby", "error", "附近設施來源暫時無回應");
    if (status) status.textContent = `⚠️ ${used} 公里內暫時沒有可用資料，已切換地圖備援搜尋。`;
    if (box) box.innerHTML = this.fallbackButtons(kind);
  },

  fallbackButtons(kind) {
    const s = this.state();
    const kw = ({ hospital: "醫院 急診", police: "警察局", pharmacy: "藥局", fire: "消防局" })[kind] || "緊急設施";
    const label = [s.country, s.city, s.district].filter(Boolean).join(" ");
    const gps = this.validGps(s) ? `${s.lat},${s.lon}` : "";

    const google = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kw + " " + label)}`;
    const apple = this.validGps(s)
      ? `https://maps.apple.com/?q=${encodeURIComponent(kw)}&ll=${encodeURIComponent(gps)}`
      : `https://maps.apple.com/?q=${encodeURIComponent(kw + " " + label)}`;

    return `<div class="grid2"><a class="btn primary" href="${google}" target="_blank" rel="noopener">Google Maps 搜尋</a><a class="btn" href="${apple}" target="_blank" rel="noopener">Apple 地圖搜尋</a></div>`;
  },

  render(list, kind, used, source) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (status) status.textContent = `✅ 已依目前 GPS 距離排序，顯示最近 ${list.length} 筆｜搜尋半徑 ${used} 公里｜來源：${source || "自動"}`;
    if (!box) return;
    if (!list.length) {
      box.innerHTML = this.fallbackButtons(kind);
      return;
    }

    box.innerHTML = list.map((x, i) => {
      const distance = x.distanceKm < 1 ? `${Math.round(x.distanceKm * 1000)} 公尺` : `${x.distanceKm.toFixed(1)} 公里`;
      const google = x.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}&travelmode=driving`;
      const apple = `https://maps.apple.com/?daddr=${x.lat},${x.lon}&dirflg=d`;
      const tel = x.phone ? x.phone.replace(/[^\d+]/g, "") : "";

      return `<article class="near-card">
        <div class="near-rank">${i + 1}</div>
        <div class="near-main">
          <h3>${esc(x.name)}</h3>
          <div class="meta">📍 ${distance}${x.address ? `｜${esc(x.address)}` : ""}</div>
          <div class="near-info">${x.phone ? `📞 ${esc(x.phone)}` : "📞 無公開電話"}｜${x.opening ? `🕒 ${esc(x.opening)}` : "🕒 無公開營業資訊"}</div>
          <div class="near-actions">
            <a class="btn primary" href="${google}" target="_blank" rel="noopener">Google 導航</a>
            <a class="btn" href="${apple}" target="_blank" rel="noopener">Apple 導航</a>
            ${tel ? `<a class="btn" href="tel:${tel}">📞 致電</a>` : ""}
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
