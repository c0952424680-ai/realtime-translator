【這包要做什麼】
只替換 GitHub 專案根目錄的 nearby-service.js。
不要改 Cloudflare worker.js。
不要刪其他檔案。

【完成後功能】
1. 先使用 Cloudflare Worker / Supabase 附近設施資料。
2. Worker 無資料或失敗時，自動切換 OpenStreetMap Overpass。
3. 搜尋半徑從 15km 開始，每次 +5km，最大 50km。
4. 支援 hospital / police / pharmacy / fire。
5. 依 GPS 距離由近到遠排序，最多顯示 5 筆。
6. Google Maps / Apple Maps 導航。
7. 有電話時顯示一鍵致電。
8. 所有來源失敗時，仍保留地圖備援搜尋。

【iPhone 最簡單上傳方式】
A. 先把此 ZIP 解壓縮到「檔案」App。
B. GitHub 開啟 c0952424680-ai/realtime-translator。
C. 在儲存庫首頁使用 Add file / ＋ / Upload files（名稱依手機畫面可能不同）。
D. 選擇本包的 nearby-service.js。
E. 如果 GitHub 提示同名檔案，確認以這個新檔覆蓋原本 nearby-service.js。
F. Commit message 填：Fix nearby service GPS search
G. Commit 到 main。

【如果手機 GitHub 不允許直接覆蓋同名檔案】
不要進程式碼編輯器。改用 GitHub App 或 Safari 的「要求桌面網站」再進 Upload files。
仍然只上傳 nearby-service.js。

【完成後驗證】
1. 等待網站部署 1～3 分鐘。
2. 用 Safari 無痕分頁重新開 App，避免舊快取。
3. 允許定位。
4. 依序測試：醫院、警察局、藥局。
5. 正常狀態會看到「已依目前 GPS 距離排序」及搜尋半徑。

【注意】
這包沒有修改 Cloudflare Worker，也沒有修改 Supabase 結構。
如果 Worker 網址之後更換，只需在 nearby-service.js 頂部 workerEndpoints 更新網址。
