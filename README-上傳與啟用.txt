V10.11 自動更新正式套件

功能：
- App 啟動／恢復連線時自動檢查 data/version.json。
- 有新版才下載 data/location-data.json。
- 新資料驗證成功才寫入手機快取；失敗沿用上一版。
- GitHub Actions 每天 04:30（台北時間）自動從 GeoNames + 內政部國土測繪中心重建資料。
- 台灣 22 縣市完整備援。
- GPS 與旅行目的地分離，GPS 不再改掉德國／日本等手動選擇。
- SOS 最近設施新增「依選擇城市 / 依手機 GPS」兩種模式。

上傳整包內容，包含：
.github/workflows/update-location-data.yml
scripts/update_data.py
data/location-data.json
data/version.json
index.html / risk.html / sos.html / contacts.html
state-core.js / location-engine.js
data-sync.js / v1011-runtime-patch.js
sw.js / manifest.webmanifest / 404.html / VERSION.txt / deploy-check.html

保留既有，不要刪：
app.js / nearby-service.js / risk-engine.js / live-events.js / news-engine.js
emergency-data.js / local-phrases.js / voice-engine.js / translate-live.js / style.css / location-data.js

首次上傳後：
GitHub → Actions → Update location data → Run workflow。
成功後，data/location-data.json 會擴充為全球主要城市資料，後續每天自動更新。

安全原則：
未人工驗證的國家緊急號碼與當地求助語不會自動猜測。
