const StateCore = {
  storageKey: "rt_v1011_state",
  legacyKey: "rt_v109_state",
  state: {
    countryKey: "TW", country: "台灣", city: "基隆市", district: "七堵區",
    lat: 25.1089, lon: 121.6814,
    manualLat: 25.1089, manualLon: 121.6814, manualSource: "data",
    gpsLat: null, gpsLon: null, gpsAccuracy: null, gpsUpdatedAt: null,
    gpsCountryKey: "", gpsCity: "", gpsDistrict: "",
    locationMode: "manual", gpsStatus: "idle", reverseStatus: "idle",
    accuracy: null, updatedAt: null
  },

  validPoint(lat, lon) {
    const a = Number(lat), b = Number(lon);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
  },

  init() {
    try {
      const current = JSON.parse(localStorage.getItem(this.storageKey) || "null");
      if (current && window.LOCATION_DATA?.[current.countryKey]) {
        this.state = { ...this.state, ...current };
      } else {
        const legacy = JSON.parse(localStorage.getItem(this.legacyKey) || "null");
        if (legacy && window.LOCATION_DATA?.[legacy.countryKey]) {
          const country = LOCATION_DATA[legacy.countryKey];
          const city = country.cities?.[legacy.city] ? legacy.city : Object.keys(country.cities || {})[0];
          const cityData = country.cities?.[city];
          this.state = {
            ...this.state,
            countryKey: legacy.countryKey,
            country: country.name,
            city,
            district: cityData?.districts?.includes?.(legacy.district) ? legacy.district : cityData?.districts?.[0] || "全市",
            lat: Number(cityData?.lat), lon: Number(cityData?.lon),
            manualLat: Number(cityData?.lat), manualLon: Number(cityData?.lon),
            locationMode: "manual", gpsStatus: "idle", reverseStatus: "idle", accuracy: null
          };
        }
        localStorage.removeItem(this.legacyKey);
      }
    } catch {}
    try { localStorage.removeItem(this.legacyKey); } catch {}
    if (!this.validPoint(this.state.manualLat, this.state.manualLon)) {
      const city = LOCATION_DATA[this.state.countryKey]?.cities?.[this.state.city];
      this.state.manualLat = Number(city?.lat ?? 25.1089);
      this.state.manualLon = Number(city?.lon ?? 121.6814);
    }
    this.syncActivePoint();
    this.persist();
  },

  syncActivePoint() {
    const useGps = this.state.locationMode === "gps" && this.validPoint(this.state.gpsLat, this.state.gpsLon);
    this.state.lat = Number(useGps ? this.state.gpsLat : this.state.manualLat);
    this.state.lon = Number(useGps ? this.state.gpsLon : this.state.manualLon);
    this.state.accuracy = useGps ? this.state.gpsAccuracy : null;
  },

  persist() { try { localStorage.setItem(this.storageKey, JSON.stringify(this.state)); } catch {} },
  get() { return { ...this.state }; },

  set(patch, reason = "update") {
    this.state = { ...this.state, ...patch, updatedAt: new Date().toISOString() };
    this.syncActivePoint();
    this.persist();
    window.dispatchEvent(new CustomEvent("state-changed", { detail: { state: this.get(), reason } }));
  },

  label() {
    const c = LOCATION_DATA[this.state.countryKey];
    return `${c?.flag || ""} ${this.state.country}・${this.state.city}・${this.state.district}`;
  },

  activePoint() { return { lat: this.state.lat, lon: this.state.lon, mode: this.state.locationMode }; }
};

window.StateCore = StateCore;
