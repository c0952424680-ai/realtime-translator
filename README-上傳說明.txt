V10.10 修正版
================
請將這 4 個檔案上傳到 GitHub realtime-translator 專案根目錄並覆蓋同名檔案：

1. index.html
2. risk.html
3. contacts.html
4. location-engine.js

修正內容：
- index / risk / contacts 全部統一為 V10.10
- 所有前端資源版本由 ?v=111 統一為 ?v=112
- BUILD 統一為 V10.10-COUNTRY-FAST-NEAREST-20260820-01
- 修正 GPS 定位後 syncSelectors() 觸發 change，導致 locationMode 被改回 manual 的問題
- syncSelectors() 現在只同步下拉選單畫面，不會觸發手動位置套用

注意：
- 不要刪除其他檔案。
- 不修改 state-core.js 的 rt_v109_state，避免舊使用者已保存的位置/狀態資料失效。
