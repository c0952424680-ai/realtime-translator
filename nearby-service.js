
const NearbyService = {
  overpassEndpoints: [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter"
  ],
  osrmEndpoint: "https://router.project-osrm.org",

  state() {
    return StateCore.get();
  },

  typeLabel(kind) {
    return ({
      hospital: "醫院／急診",
      clinic: "診所／醫師",
      pharmacy: "藥局",
      police: "警察局",
      fire: "消防局"
    })[kind] || "緊急設施";
  },

  async fetchJson(url, options = {}, timeout = 6500) {
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

  async resolveCenter() {
    const s = this.state();

    // 手動選國家/城市時，搜尋中心必須跟著選擇位置，不能被台灣手機 GPS 覆蓋。
    if (s.locationMode === "manual") {
      return {
        lat: Number(s.lat),
        lon: Number(s.lon),
        accuracy: null,
        mode: "manual",
        label: `${s.country}・${s.city}・${s.district}`
      };
    }

    // GPS 模式若最近 2 分鐘已有座標，直接使用，避免每次搜尋都卡 GPS。
    const age = s.updatedAt ? Date.now() - Date.parse(s.updatedAt) : Infinity;
    if (
      Number.isFinite(Number(s.lat)) &&
      Number.isFinite(Number(s.lon)) &&
      s.locationMode === "gps" &&
      age < 120000
    ) {
      return {
        lat: Number(s.lat),
        lon: Number(s.lon),
        accuracy: s.accuracy,
        mode: "gps",
        label: "目前 GPS"
      };
    }

    try {
      const p = await LocationEngine.getFreshPosition(2600);
      StateCore.set({
        lat: p.lat,
        lon: p.lon,
        accuracy: p.accuracy,
        gpsStatus: "ok",
        locationMode: "gps"
      }, "nearby-gps");
      return { ...p, mode: "gps", label: "目前 GPS" };
    } catch {
      if (
        Number.isFinite(Number(s.lat)) &&
        Number.isFinite(Number(s.lon))
      ) {
        return {
          lat: Number(s.lat),
          lon: Number(s.lon),
          accuracy: s.accuracy,
          mode: s.locationMode || "saved",
          label: "已儲存位置"
        };
      }
      throw new Error("沒有可用位置");
    }
  },

  query(kind, radiusKm, lat, lon) {
    const r = Math.round(radiusKm * 1000);
    let filter = "";

    if (kind === "hospital") {
      filter = `
        nwr["amenity"="hospital"](around:${r},${lat},${lon});
        nwr["healthcare"="hospital"](around:${r},${lat},${lon});
        nwr["emergency"="yes"]["amenity"!="clinic"](around:${r},${lat},${lon});
      `;
    } else if (kind === "clinic") {
      filter = `
        nwr["amenity"="clinic"](around:${r},${lat},${lon});
        nwr["healthcare"="clinic"](around:${r},${lat},${lon});
        nwr["amenity"="doctors"](around:${r},${lat},${lon});
        nwr["healthcare"="doctor"](around:${r},${lat},${lon});
      `;
    } else if (kind === "pharmacy") {
      filter = `
        nwr["amenity"="pharmacy"](around:${r},${lat},${lon});
        nwr["healthcare"="pharmacy"](around:${r},${lat},${lon});
      `;
    } else if (kind === "police") {
      filter = `nwr["amenity"="police"](around:${r},${lat},${lon});`;
    } else if (kind === "fire") {
      filter = `nwr["amenity"="fire_station"](around:${r},${lat},${lon});`;
    }

    // 完全沒有 city / district 條件，因此可跨城市、跨行政區找最近設施。
    return `[out:json][timeout:12];(${filter});out center tags;`;
  },

  async requestOverpass(kind, radiusKm, lat, lon) {
    const q = this.query(kind, radiusKm, lat, lon);
    let last;

    for (const ep of this.overpassEndpoints) {
      try {
        const data = await this.fetchJson(ep, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: "data=" + encodeURIComponent(q)
        }, 6000);

        if (Array.isArray(data?.elements)) return data;
      } catch (e) {
        last = e;
      }
    }

    throw last || new Error("附近資料來源暫時無回應");
  },

  normalize(data, center) {
    const seen = new Map();

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

      if (!String(name).trim()) continue;

      const item = {
        name: String(name).trim(),
        lat,
        lon,
        straightKm: App.distanceKm(center.lat, center.lon, lat, lon),
        driveKm: null,
        driveMin: null,
        phone:
          t.phone ||
          t["contact:phone"] ||
          t["contact:mobile"] ||
          "",
        opening: t.opening_hours || "",
        address: [
          t["addr:postcode"],
          t["addr:city"],
          t["addr:district"],
          t["addr:street"],
          t["addr:housenumber"]
        ].filter(Boolean).join(" ")
      };

      const key = `${lat.toFixed(5)}|${lon.toFixed(5)}`;
      const old = seen.get(key);
      const score = x =>
        (x.phone ? 2 : 0) +
        (x.address ? 2 : 0) +
        (x.opening ? 1 : 0);

      if (!old || score(item) > score(old)) {
        seen.set(key, item);
      }
    }

    return [...seen.values()]
      .sort((a, b) => a.straightKm - b.straightKm);
  },

  async roadMatrix(items, center) {
    const list = items.slice(0, 15);
    if (!list.length) return list;

    const coords = [
      `${center.lon},${center.lat}`,
      ...list.map(x => `${x.lon},${x.lat}`)
    ].join(";");

    const destinations = list.map((_, i) => i + 1).join(";");

    try {
      const d = await this.fetchJson(
        `${this.osrmEndpoint}/table/v1/driving/${coords}` +
        `?sources=0&destinations=${destinations}&annotations=distance,duration`,
        {},
        4500
      );

      const km = d?.distances?.[0] || [];
      const sec = d?.durations?.[0] || [];

      return list.map((x, i) => ({
        ...x,
        driveKm: Number.isFinite(km[i]) ? km[i] / 1000 : null,
        driveMin: Number.isFinite(sec[i]) ? sec[i] / 60 : null
      }));
    } catch {
      return list;
    }
  },

  roadSort(items) {
    return [...items]
      .sort((a, b) => {
        const ad = Number.isFinite(a.driveKm) ? a.driveKm : a.straightKm;
        const bd = Number.isFinite(b.driveKm) ? b.driveKm : b.straightKm;
        return ad - bd;
      })
      .slice(0, 6);
  },

  async search(kind) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (box) box.innerHTML = "";

    let center;
    try {
      center = await this.resolveCenter();
    } catch {
      if (status) status.textContent = "⚠️ 沒有可用位置。";
      return;
    }

    if (status) {
      status.textContent =
        center.mode === "manual"
          ? `📍 搜尋位置：${center.label}`
          : "📍 搜尋位置：目前 GPS";
    }

    // 優先只查 5 公里，真正找附近。
    // 5 公里不足 3 筆才擴到 15 公里；仍不足才到 40 公里。
    const plans = [5, 15, 40];
    let list = [];
    let used = 5;

    for (const radius of plans) {
      used = radius;

      if (status) {
        status.textContent =
          `🔎 正在搜尋 ${radius} 公里內「${this.typeLabel(kind)}」…`;
      }

      try {
        const raw = await this.requestOverpass(
          kind,
          radius,
          center.lat,
          center.lon
        );

        list = this.normalize(raw, center);

        if (list.length >= 3) break;
      } catch {}
    }

    if (!list.length) {
      App.health("nearby", "error", "附近資料暫時無回應");
      if (status) {
        status.textContent = "⚠️ 暫時找不到可靠附近資料。";
      }
      if (box) box.innerHTML = this.fallbackButtons(kind, center);
      return;
    }

    // 先立刻顯示 GPS 最近結果，不等道路 API，改善體感速度。
    const first = list.slice(0, 6);
    this.render(first, kind, used, center, false);

    // 背景補道路距離，完成後再自動重排。
    const road = this.roadSort(await this.roadMatrix(first, center));
    this.render(road, kind, used, center, true);

    App.health(
      "nearby",
      "ok",
      `${center.mode === "manual" ? "手動位置" : "GPS"}；${used}km；${road.length}筆`
    );
  },

  fallbackButtons(kind, center) {
    const q = this.typeLabel(kind);
    const gps = `${center.lat},${center.lon}`;

    const google =
      `https://www.google.com/maps/search/?api=1&query=` +
      encodeURIComponent(`${q} ${gps}`);

    const apple =
      `https://maps.apple.com/?q=${encodeURIComponent(q)}` +
      `&ll=${encodeURIComponent(gps)}`;

    return `
      <div class="grid2">
        <a class="btn primary"
           href="${google}"
           target="_blank"
           rel="noopener">Google Maps 搜尋</a>

        <a class="btn"
           href="${apple}"
           target="_blank"
           rel="noopener">Apple 地圖搜尋</a>
      </div>
    `;
  },

  render(list, kind, used, center, roadReady) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (status) {
      status.textContent =
        `✅ ${center.mode === "manual" ? `依 ${center.label}` : "依目前 GPS"}｜` +
        `${roadReady ? "道路距離" : "GPS 距離"}由近到遠｜` +
        `搜尋半徑 ${used} 公里`;
    }

    if (!box) return;

    box.innerHTML = list.map((x, i) => {
      const straight =
        x.straightKm < 1
          ? `${Math.round(x.straightKm * 1000)} 公尺`
          : `${x.straightKm.toFixed(1)} 公里`;

      const drive =
        Number.isFinite(x.driveKm)
          ? `${x.driveKm.toFixed(1)} 公里`
          : null;

      const mins =
        Number.isFinite(x.driveMin)
          ? `${Math.max(1, Math.round(x.driveMin))} 分鐘`
          : null;

      const origin = `${center.lat},${center.lon}`;
      const dest = `${x.lat},${x.lon}`;

      const google =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(dest)}` +
        `&travelmode=driving`;

      const apple =
        `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}` +
        `&daddr=${encodeURIComponent(dest)}&dirflg=d`;

      const info =
        `https://www.google.com/maps/search/?api=1&query=` +
        encodeURIComponent(`${x.name} ${dest}`);

      const tel = x.phone
        ? x.phone.replace(/[^\d+]/g, "")
        : "";

      return `
        <article class="near-card">
          <div class="near-rank">${i + 1}</div>

          <div class="near-main">
            <h3>${esc(x.name)}</h3>

            <div class="meta">
              ${
                drive
                  ? `🚗 道路距離 ${drive}${mins ? `・約 ${mins}` : ""}`
                  : `📍 GPS 距離 ${straight}`
              }
            </div>

            ${
              drive
                ? `<div class="muted">直線距離：${straight}</div>`
                : ""
            }

            <div class="near-info">
              📍 ${x.address ? esc(x.address) : "地址未收錄"}
            </div>

            <div class="near-info">
              ${x.phone ? `📞 ${esc(x.phone)}` : "📞 電話未收錄"}
              ｜
              ${x.opening ? `🕒 ${esc(x.opening)}` : "🕒 營業資訊未收錄"}
            </div>

            <div class="near-actions">
              <a class="btn primary"
                 href="${google}"
                 target="_blank"
                 rel="noopener">Google 導航</a>

              <a class="btn"
                 href="${apple}"
                 target="_blank"
                 rel="noopener">Apple 導航</a>

              <a class="btn"
                 href="${info}"
                 target="_blank"
                 rel="noopener">完整資訊</a>

              ${tel ? `<a class="btn" href="tel:${tel}">📞 致電</a>` : ""}
            </div>
          </div>
        </article>
      `;
    }).join("");
  }
};

window.NearbyService = NearbyService;
