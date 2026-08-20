即時譯 V10.10 修正版

本次修正三個問題：
1. 搜尋速度慢
   - 手動選國家時不再等待 GPS
   - GPS 最近 2 分鐘有有效座標就直接用
   - 先搜尋 5 公里，找到至少 3 筆立即停止擴張
   - 先立刻顯示 GPS 最近結果，實際道路距離在背景更新

2. 醫院／診所／藥局分開
   - 最近醫院／急診
   - 最近診所／醫師
   - 最近藥局
   - 另保留警察局與消防局

3. 選國家後緊急應變與搜尋仍跑台灣
   - 國家／城市／行政區選單變更後立即寫入 StateCore
   - 選越南後搜尋中心使用越南選定城市座標
   - 手動國家模式不會被 iPhone 台灣 GPS 覆蓋
   - 緊急電話與求助語言依 StateCore 立即重繪

請覆蓋：
app.js
nearby-service.js
sos.html
sw.js
deploy-check.html
VERSION.txt

驗證頁：
deploy-check.html?v=112
