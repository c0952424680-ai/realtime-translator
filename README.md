# 即時譯 V10.9

完整重整版：跨縣市／跨行政區最近距離搜尋。

## 核心修正
- 每次「附近搜尋」先更新目前 GPS，避免沿用城市中心或舊定位。
- Overpass 查詢只使用座標 + 半徑，沒有 city/district filter。
- 15 km 一次搜尋，結果不足才擴大到 40 km，減少多次 API 等待。
- 醫療搜尋納入醫院、診所、醫師、急診。
- 先以 GPS 距離縮小候選，再以 OSRM 道路距離排序。
- 導航強制帶入目前 GPS 為 origin、設施座標為 destination。
- Cache 全部統一 v111，並清除舊 service worker cache。
