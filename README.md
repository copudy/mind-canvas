# PD-1 Center | Mind Canvas

目前工作分支為v1.1本機Demo（1.1.0-dev.0），**未推送或部署**；操作及验收見[V11_REPORT.md](V11_REPORT.md)。指南在Header「說明與幫助」，官方原稿只讀，練習請建立副本。計算機只有一個入口，可在工具內釘選／解除。思考框架包含官方範本與我的範本；全部備份保存自訂範本，含範本的格式2需用新版還原。

正式 v1.0.0：[開啟 Mind Canvas](https://copudy.github.io/mind-canvas/) · [GitHub](https://github.com/copudy/mind-canvas)。首次部署與正式測試見 DEPLOYMENT.md，後續版本流程見 RELEASE_SOP.md。本機與正式網址的資料獨立，請透過 JSON 搬移。

離線優先的個人思考工作台。自由放置多棵心智圖、文字、便條、圖形與可實際運算的計算機。資料保存於此瀏覽器的 IndexedDB，沒有會員、雲端或後端。

## 本機啟動

需要 Node.js 22.12+（本機驗證版本 24.14.1）、npm 與現代瀏覽器。

Windows 可雙擊 START_PREVIEW.cmd，等待建置後開啟顯示的 4173 本機網址；保持該視窗開啟。也可使用下列命令。

```powershell
npm.cmd ci
npm.cmd run dev -- --port 5173 --strictPort
```

開啟 http://127.0.0.1:5173/ 。正式建置及 PWA 本機測試：

```powershell
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

開啟 http://127.0.0.1:4173/ 。Service Worker 只在正式建置啟用。首次載入與離線快取完成後可離線重新整理。不同網址／連接埠的 IndexedDB 相互獨立，移轉請用 JSON。

## 操作

- 底部工具庫選擇分類並新增物件；雙擊或 F2 編輯文字，Ctrl+Enter 完成、Esc 取消。
- 空白處拖曳框選，Shift 點擊多選。中鍵或右鍵拖曳平移；滾輪／觸控板平移、Ctrl+滾輪或雙指縮放。
- 選取心智圖：Tab 子節點、Enter 同層、Shift+Tab 提升、Space 收合／展開。普通拖曳移動整枝；按住 Alt 將節點中心放在另一節點內，依綠色預覽重新掛載。
- 向右／左右／放射只整理所選心智圖。Auto 參與排版，Pinned／Free 保留位置；手動拖曳轉為 Free。
- 選取後拖曳尺寸控制點；右側設定外觀與位置狀態。Shift 多選可批次樣式、對齊、刪除。
- 從邊框連接點拖到其他節點建立自由關聯線，或選取起點 → 關聯工具 → 點終點。關聯線不改變父子階層。
- Ctrl+Z／Ctrl+Shift+Z 復原／重作；Ctrl+D 複製整枝；Ctrl+C／V 在本次應用程式內跨白板複製貼上；方向鍵定位鄰近節點；/ 搜尋節點與命令。
- 計算機可輸入 `+ - * / ( ) . %`，Enter 或 = 計算；百分比等於除以 100，`100+10%` 得到 `100.1`。Decimal 運算保留 32 位內部精度、20 位結果有效數字；不使用 eval。
- 釘選計算機可拖曳標題、調整尺寸、連線，結果可複製或建立文字節點。浮動計算機可拖曳標題與釘選。
- 左側管理白板；刪除白板需確認且無法復原。JSON 匯入會建立新白板，不覆寫原資料。
- 清除瀏覽器網站資料會移除本機白板；定期使用「全部備份」。儲存失敗時立即匯出 JSON。

## 檢查

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

測試及限制見 TEST_REPORT.md，驗收清單見 ACCEPTANCE.md，開發恢復見 PROGRESS.md。

完整第一次交付報告見 BUILD_REPORT.md。瀏覽器測試直接使用正式建置，先執行 build；使用已安裝 Edge（隔離測試資料），預覽 4173 與子目錄 4174 由測試設定啟動。29 個第三方套件授權文字在 public/THIRD_PARTY_NOTICES.txt；依賴更新後執行 `node scripts/licenses.mjs` 重新產生。

支援的瀏覽器可透過其安裝選項安裝此 PWA；實際作業系統安裝尚未驗證。manifest／圖示／離線重新開啟已實測。

## 發布狀態

僅本機原型，未推送 GitHub、未公開部署。必須經使用者驗收及正式上線授权後才能設定遠端與 GitHub Pages。Vite 相對資源路徑、PWA scope／start_url 已為子目錄託管準備。


## 2026-10-11 品牌與工具庫更新

原品牌研究及資料持久性結果見 REFINEMENT_REPORT.md；目前介面以 SYSTEM_UX_REPORT.md 為準。收合工具庫偏好記在此瀏覽器，未實作工具沒有空按鈕。設定 → 資料與備份可要求保留本機儲存；即使授予仍須定期匯出備份。

若舊 PWA 尚顯示前版，重新整理讓 Service Worker 更新，必要時再刷新或點「載入新版」。不要清除網站資料。相同 browser profile 會共用白板，沒有按個人身分隔離；跨裝置／origin 不同步，請用 JSON 遷移。

## 最新本機 UX 版本（2026-10-11）

每次開啟／刷新先到歡迎指南；主視覺內「繼續上次的白板」依最後開啟的非指南白板決定，也可立即建立白板。平移畫布即可探索其餘可編輯教學。側欄固定指南、釘選捷徑、自訂區段及搜尋；未分類與各區段依實際內容編輯時間排序，查看／平移／縮放不改時間。區段刪除只移回未分類。手機側欄預設收起。

釘選／區段／收合狀態保存於 IndexedDB 管理設定；JSON仍備份全部白板文件，側欄分類不包含於JSON。跨網址搬移後需重新分類。逐項檢核與驗收方式見 [UX_REPORT.md](UX_REPORT.md)。

## 全站 UI/UX 整頓（目前版本）

單列品牌 Header、較寬的兩層工具庫與一致字級；瀏覽器標題 Mind Canvas。JSON 匯出／全部備份／匯入統一移至右上設定 → 資料與備份，此處也可查看最後成功儲存時間、要求保留儲存與重設指南。一般自動儲存安靜執行，失敗會明顯警告。內容 800ms、視角 1600ms 合併寫入，拖曳／調尺寸放開後保存。高度不足 700px 先收合工具庫，不覆寫原偏好。

完整修改前問題、保存機制、測試證據、截圖與剩餘風險見 [SYSTEM_UX_REPORT.md](SYSTEM_UX_REPORT.md)。較早報告保留為開發歷史；與目前入口不同時以此報告為準。未推送或正式部署。
