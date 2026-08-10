# 即時譯 V10.0｜旅外安全助理・App Core

V10.0 將舊版多組定位、風險、附近設施、緊急控制器重構為 App Service 架構。

## 核心
- `app/app-state.js`：唯一 App 狀態
- `services/location-service.js`：唯一定位服務
- `services/emergency-service.js`：唯一緊急電話／地圖／分享服務
- `services/nearby-service.js`：唯一附近設施服務
- `services/risk-service.js`：唯一風險事件服務
- `services/notification-service.js`：通知介面
- `services/update-service.js`：自動更新排程
- `ui/*`：只處理畫面，不保存第二份狀態

## SOS 修正
緊急頁所有按鈕重新綁定：
- 一鍵撥打當地警察／救護／消防
- 最近醫院／警局／藥局
- GPS
- 分享目前位置
- 通知權限
- 緊急處理步驟

## V10.0 即時性
目前支援 App 開啟期間的風險自動重新評估與瀏覽器 Notification API。
真正「App 關閉後仍可靠推播」需要 V10.1 後端 Push Service / Web Push 訂閱端點。
