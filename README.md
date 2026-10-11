# Freeform Mind Canvas｜自由式思維畫布

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

- 上方工具列新增物件；雙擊或 F2 編輯文字，Ctrl+Enter 完成、Esc 取消。
- 空白處拖曳框選，Shift 點擊多選。手掌工具、中鍵或右鍵拖曳平移；滾輪／觸控板平移、Ctrl+滾輪或雙指縮放。
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
