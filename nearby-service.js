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
    return Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180;
  },

  apiType(kind) {
    return ({
      hospital: "medical",
      police: "police",
      pharmacy: "pharmacy",
      fire: "fire"
    })[kind] || kind;
  },

  typeLabel(kind) {
    return ({
      hospital: "醫院／急診",
      police: "警察機關",
      pharmacy: "藥局",
      fire: "消防單位"
    })[kind] || "緊急設施";
  },

  isTestRecord(x = {}) {
    const values = [
      x.name_zh_tw,
      x.name_zh,
      x.name_en,
      x.name,
      x.data_provider,
      x.provider_id,
      x.external_id,
      x.source_name
    ].filter(Boolean).join(" ").toLowerCase();

    return /\bgps[\s_-]*test\b|\btest\b|\bdummy\b|\bsample\b|\bmock\b/.test(values);
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

  normalizeWorker(data, kind) {
    const s = this.state();
    const rows = Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data?.data)
        ? data.data
        : [];

    const out = [];

    for (const x of rows) {
      if (this.isTestRecord(x)) continue;

      const lat = Number(x.latitude ?? x.lat);
      const lon = Number(x.longitude ?? x.lng ?? x.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const zhName =
        x.name_zh_tw ||
        x.name_zh ||
        x.name_zh_hant ||
        "";

      const originalName =
        x.name ||
        x.name_en ||
        "";

      const name = zhName || this.typeLabel(kind);

      out.push({
        name,
        originalName: zhName ? "" : originalName,
        lat,
        lon,
        distanceKm: App.distanceKm(
          Number(s.lat),
          Number(s.lon),
          lat,
          lon
        ),
        phone: x.phone || "",
        opening: x.opening_hours || x.opening || "",
        address:
          x.address ||
          [x.city_name, x.district_name, x.postal_code]
            .filter(Boolean)
            .join(" "),
        mapUrl:
          x.google_maps_url ||
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
        source: "安全資料庫"
      });
    }

    return out;
  },

  async requestWorker(kind, km) {
    const s = this.state();
    const type = this.apiType(kind);
    let last;

    for (const base of this.workerEndpoints) {
      try {
        const url =
          `${base.replace(/\/$/, "")}/nearby-services` +
          `?lat=${encodeURIComponent(s.lat)}` +
          `&lng=${encodeURIComponent(s.lon)}` +
          `&service_type=${encodeURIComponent(type)}` +
          `&radius_km=${encodeURIComponent(km)}`;

        const data = await this.fetchJson(url, {}, 6500);
        if (data?.ok === false) throw new Error(data?.error || "worker error");

        return this.normalizeWorker(data, kind);
      } catch (e) {
        last = e;
      }
    }

    if (last) throw last;
    return [];
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

    return `[out:json][timeout:18];(${filter});out center tags;`;
  },

  async requestOverpass(kind, km) {
    const q = this.query(kind, km);
    let last;

    for (const ep of this.overpassEndpoints) {
      try {
        return await this.fetchJson(ep, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: "data=" + encodeURIComponent(q)
        }, 7500);
      } catch (e) {
        last = e;
      }
    }

    if (last) throw last;
    return { elements: [] };
  },

  normalizeOverpass(data, kind) {
    const s = this.state();
    const out = [];

    for (const e of data?.elements || []) {
      const lat = Number(e.lat ?? e.center?.lat);
      const lon = Number(e.lon ?? e.center?.lon);
      const t = e.tags || {};

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const zhName =
        t["name:zh-Hant"] ||
        t["name:zh"] ||
        t["name:zh-TW"] ||
        t["name:zh-Hans"] ||
        "";

      const localName =
        t.name ||
        t["official_name"] ||
        "";

      const name = zhName || localName || this.typeLabel(kind);

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
        name,
        originalName: zhName ? "" : "",
        lat,
        lon,
        distanceKm: App.distanceKm(
          Number(s.lat),
          Number(s.lon),
          lat,
          lon
        ),
        phone,
        opening: t.opening_hours || "",
        address,
        mapUrl:
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
        source: "OpenStreetMap"
      });
    }

    return out;
  },

  dedupeAndSort(items) {
    const seen = new Map();

    for (const x of items) {
      if (!x || !Number.isFinite(Number(x.lat)) || !Number.isFinite(Number(x.lon))) {
        continue;
      }

      const key =
        `${Number(x.lat).toFixed(5)}|${Number(x.lon).toFixed(5)}`;

      const old = seen.get(key);
      if (!old) {
        seen.set(key, x);
        continue;
      }

      const score = y =>
        (y.name && !/^未命名|醫院／急診|警察機關|藥局|消防單位$/.test(y.name) ? 3 : 0) +
        (y.phone ? 2 : 0) +
        (y.address ? 2 : 0) +
        (y.opening ? 1 : 0);

      if (score(x) > score(old)) seen.set(key, x);
    }

    return [...seen.values()]
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm))
      .slice(0, 8);
  },

  async search(kind) {
    this.currentKind = kind;

    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");
    const s = this.state();

    if (box) box.innerHTML = "";

    if (!this.validGps(s)) {
      if (status) {
        status.textContent =
          "⚠️ 尚未取得有效 GPS，請先允許定位或使用手動所在地。";
      }
      if (box) box.innerHTML = this.fallbackButtons(kind);
      return;
    }

    let best = [];
    let used = 15;
    let sources = [];

    for (const km of [15, 20, 25, 30, 35, 40, 45, 50]) {
      used = km;

      if (status) {
        status.textContent =
          `📍 正在搜尋 ${km} 公里內資料，並重新依目前 GPS 距離排序…`;
      }

      const [workerResult, osmResult] = await Promise.allSettled([
        this.requestWorker(kind, km),
        this.requestOverpass(kind, km)
      ]);

      const merged = [];

      if (workerResult.status === "fulfilled") {
        merged.push(...workerResult.value);
        if (workerResult.value.length) sources.push("安全資料庫");
      }

      if (osmResult.status === "fulfilled") {
        const osm = this.normalizeOverpass(osmResult.value, kind);
        merged.push(...osm);
        if (osm.length) sources.push("OpenStreetMap");
      }

      best = this.dedupeAndSort(merged);

      if (best.length >= 5) break;

      if (status) {
        status.textContent =
          `${km} 公里內有效資料不足，自動擴大 5 公里搜尋…`;
      }
    }

    sources = [...new Set(sources)];

    if (best.length) {
      App.health(
        "nearby",
        "ok",
        `${used} 公里內找到 ${best.length} 筆`
      );

      this.render(best, kind, used, sources);
      return;
    }

    App.health(
      "nearby",
      "error",
      "附近設施來源暫時無可用資料"
    );

    if (status) {
      status.textContent =
        `⚠️ ${used} 公里內沒有可用結果，已切換地圖備援搜尋。`;
    }

    if (box) box.innerHTML = this.fallbackButtons(kind);
  },

  fallbackButtons(kind) {
    const s = this.state();

    const kw = ({
      hospital: "醫院 急診",
      police: "警察局",
      pharmacy: "藥局",
      fire: "消防局"
    })[kind] || "緊急設施";

    const label =
      [s.country, s.city, s.district]
        .filter(Boolean)
        .join(" ");

    const gps = this.validGps(s)
      ? `${s.lat},${s.lon}`
      : "";

    const google =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        kw + " " + label
      )}`;

    const apple = gps
      ? `https://maps.apple.com/?q=${encodeURIComponent(kw)}&ll=${encodeURIComponent(gps)}`
      : `https://maps.apple.com/?q=${encodeURIComponent(kw + " " + label)}`;

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
      </div>
    `;
  },

  render(list, kind, used, sources) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (status) {
      status.textContent =
        `✅ 已重新依目前 GPS 真實距離排序，顯示最近 ${list.length} 筆｜搜尋半徑 ${used} 公里｜來源：${(sources || []).join("＋") || "自動"}`;
    }

    if (!box) return;

    if (!list.length) {
      box.innerHTML = this.fallbackButtons(kind);
      return;
    }

    box.innerHTML = list.map((x, i) => {
      const distance =
        Number(x.distanceKm) < 1
          ? `${Math.round(Number(x.distanceKm) * 1000)} 公尺`
          : `${Number(x.distanceKm).toFixed(1)} 公里`;

      const google =
        x.mapUrl ||
        `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}&travelmode=driving`;

      const apple =
        `https://maps.apple.com/?daddr=${x.lat},${x.lon}&dirflg=d`;

      const tel = x.phone
        ? x.phone.replace(/[^\d+]/g, "")
        : "";

      return `
        <article class="near-card">
          <div class="near-rank">${i + 1}</div>

          <div class="near-main">
            <h3>${esc(x.name)}</h3>

            ${x.originalName
              ? `<div class="muted">原名：${esc(x.originalName)}</div>`
              : ""
            }

            <div class="meta">
              📍 ${distance}
              ${x.address ? `｜${esc(x.address)}` : ""}
            </div>

            <div class="near-info">
              ${x.phone
                ? `📞 ${esc(x.phone)}`
                : "📞 無公開電話"}
              ｜
              ${x.opening
                ? `🕒 ${esc(x.opening)}`
                : "🕒 無公開營業資訊"}
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
        </article>
      `;
    }).join("");
  },

  openFallback(kind) {
    const box = document.getElementById("nearbyResults");
    const status = document.getElementById("nearbyStatus");

    if (status) {
      status.textContent = "已開啟地圖備援搜尋。";
    }

    if (box) {
      box.innerHTML = this.fallbackButtons(kind);
    }
  }
};

window.NearbyService = NearbyService;
