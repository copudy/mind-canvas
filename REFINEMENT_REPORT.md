# PD-1 Center | Mind Canvas — 四項調整

2026-10-11。本次僅本機修改及驗證，沒有 Git Push、遠端寫入或正式部署。

## 品牌來源（A／原始碼、實測）

已透過 GitHub 連接器直接讀取以下原始碼，並以瀏覽器查看主站：

- [globals.css](https://github.com/copudy/pd1-center/blob/master/src/app/globals.css)：#3b82f6、深色面板、文字色與系統字體。SHA 3aa5ff04b663a5cafd1053023746ade6042c7edc。
- [Header.tsx](https://github.com/copudy/pd1-center/blob/master/src/components/Header.tsx)：PD 四角框 SVG、品牌分隔線與互動色。SHA dd4b722bf2ff0e2c9f135dc4729e0bd188ebc4d0。
- [icon.svg](https://github.com/copudy/pd1-center/blob/master/src/app/icon.svg)：正式素材原樣使用；Favicon、Header、Sidebar 共用，PNG 由此 SVG 渲染，未重新設計 Logo。SHA 18fecbf2f2b94b4fd0511670bc0c73cad92d2a3f。
- [主站](https://pd1-center.vercel.app/)：已查看實際 Header 與全站。
- [money-system globals.css](https://github.com/copudy/money-system/blob/main/src/app/globals.css)：同套品牌色。SHA f29fd709fdca5dd0e3d3d767d896f48f4c8ba66a。
- [team-training](https://github.com/copudy/team-training/tree/master)：實際為訓練紀錄／registry 專案，沒有 Web UI，不虛構視覺參考。

src/design-tokens.css 集中維護主品牌及淺／深工作區 tokens。title、Header、PWA 名稱統一為 **PD-1 Center | Mind Canvas**。藍色套用選取、側欄、焦點、計算機及新建連線；既有白板的自訂物件樣式保留。使用者明確指定沿用自己主品牌素材；沒有搬入私有 repository 的其他程式或資料。

## 工具庫與指南

底部中央雙層工具庫，展開 120px、收合 34px；localStorage 保存收合偏好。六分類可橫向捲動，工具統一 76×62px。移除選取／平移入口，沿用框選、中鍵／右鍵、滾輪及快捷鍵。選取物件附近提供編輯、複製、刪除、連線及局部排版。Minimap／控制列避開工具庫。

| 分類 | 實際可用 |
| --- | --- |
| 思考框架 | 心智圖節點、三節點心智圖範本、三步驟流程圖範本 |
| 文字筆記 | 純文字、標題文字、便條、文字清單、引用文字 |
| 圖形圖表 | 矩形、橢圓 |
| 連線關係 | 圓角正交自由關聯；線色／粗細／虛線仍於物件設定 |
| 實用工具 | 浮動／釘選計算機、可編輯日期文字 |
| 排版整理 | 靠左／置中／靠右對齊、局部心智圖整理、復原／重作 |

範本由真實節點及連線組成，可編輯、擴充、保存、備份及復原。文字清單／引用／日期是可編輯文字，不冒充進階結構工具。

**後續項目（沒有空按鈕）**：記帳本、預算表、看板、比較矩陣、時間軸、SWOT／四象限、因果圖；可勾選核取清單、菱形／箭頭／分隔線／區域容器；箭頭及關係標籤；計時器、專用計算節點；平均分布、正式群組、鎖定。Pinned 是排版位置狀態，不宣稱等於禁止拖動。

全新儲存空間建立「歡迎使用 Mind Canvas」，包含真實文字、便條、心智圖、流程與旅費計算機。首次視角適配並預留工具庫空間；可縮放細看。既有使用者不被自動新增或切換；按 Header「指南」建立／開啟，重複點擊不重複建立。

指南可修改；重設需確認、可 Ctrl＋Z 復原，不改其他白板。問候語是指南中的文字節點，進入指南才抽換一次，其他操作不跳動，普通白板沒有問候浮層，無 AI API。指南複本／匯入保留原文字內容，但不是官方指南入口，也不自動更新問候語。

## 資料持久性逐項檢核

「通過」為本機正式建置及隔離 Edge 實測，不等於正式網址已上線。

| 要求 | 結果 | 證據／修正 |
| --- | --- | --- |
| 公開網址、無登入 | 通過（本機）；正式未驗證 | 無帳號或認證路由；[GitHub 官方](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)說明一般 Pages 公開存取。未部署 |
| 不同裝置／瀏覽器資料獨立 | 通過（隔離設定檔）；實體跨裝置未驗證 | 同網址兩個隔離 context，A 的白板與計算機不出現在 B |
| 同設定檔不按身分隔離 | 已修正 | 側欄及指南明示共用設定檔會共用白板 |
| 白板／計算機沒有意外上傳 | 通過（檢查＋實測） | 執行期無 fetch／XHR／Beacon／WebSocket 上傳；請求監測未見外部 origin；素材及字體本機打包 |
| 新增、編輯、切換、刷新恢復 | 通過 | 既有操作套件驗證保存及各白板視角 |
| 關閉瀏覽器重開恢復 | 通過 | 隔離持久 Edge profile 真正關閉／再啟動；同一 boardId、算式／結果／位置／尺寸／樣式比較 |
| JSON 完整還原 | 通過 | 核心模型及瀏覽器備份還原；指南單元比對 nodes、relations、viewport、treeStyle。匯入新 boardId；官方指南入口標記不複製 |
| 匯入不覆蓋／錯誤資料保護 | 通過 | 新白板名稱帶「（匯入）」；錯誤 JSON 保留既有資料 |
| 儲存失敗須警告 | 通過 | QuotaExceededError 注入，明示失敗，不顯示成功；可匯出記憶體備份 |
| navigator.storage.persist | 已修正／處理測試通過 | Header「保留本機儲存」在點擊時要求；先檢查 persisted，授予／拒絕／不支援／例外各有提示 |
| 不宣稱永久保存 | 已修正 | 即使授予仍提示需備份／清除網站資料仍刪除；依 [MDN persist](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)及[淘汰規則](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) |
| 子路徑、PWA、SW、IDB、離線 | 通過（本機模擬） | 正式 dist 掛在 /freeform-mind-canvas/，驗證資源、SW scope、離線重載及計算機保存 |
| 本機／正式儲存遷移提示 | 已修正 | 指南與文件明示 origin 不同須 JSON；不同 port 亦獨立 |
| 正式 GitHub Pages 核心驗證 | 未驗證 | 等待驗收及上線授權，不以本機測試冒充正式結果 |
| 真實手機／OS PWA 安裝 | 未驗證 | 390px viewport 編輯與主題已測，不等於實機／安裝測試 |

剩餘風險：persist 可被拒絕，清除網站資料、無痕關閉、儲存淘汰或裝置遺失可能失去資料；請定期 JSON 備份。未驗證電源中斷／程序強殺，無跨分頁衝突合併。共用 browser profile 不是私人帳號隔離。IndexedDB 依 origin 而非 URL 子路徑隔離：同 owner 的其他 GitHub Pages 專案位於同 origin，子路徑不是安全隔離；本案 DB 名稱獨立，但不是加密或存取控制。

## 本次驗收

1. 開啟 http://127.0.0.1:4173/ 。已開舊版 PWA 時重新整理讓 SW 更新，必要時再重新整理；不要清除網站資料。
2. 檢查 Logo、title、Header、側欄、圖示與兩種主題。
3. 既有白板應仍在；按「指南」。拖便條、旅行根節點按 Tab、編輯流程矩形、改計算式。
4. 新增自己的白板，問候語消失；重新進指南才更新，其他操作保持穩定。
5. 收合／展開工具庫並刷新，檢查偏好、分類、入口及 Minimap。
6. 試範本、文字、圖形、連線、浮動／釘選計算機與 Ctrl＋Z。
7. 匯出／匯入 JSON，原白板保留，外觀及計算機恢復。
8. 重設指南先取消，再確認並復原；其他白板不變。
9. 點「保留本機儲存」，查看瀏覽器提示；不是永久保存承諾。

測試與 Commit 見 TEST_REPORT.md、PROGRESS.md。本次等待使用者驗收，不進入正式部署。


## 最終驗證結果

A／實測：TypeScript＋正式建置成功、47/47核心測試、29/29完整瀏覽器流程；最後小幅修正後12/12專項重測通過。SVG blob hash與官方原件完全相同。實際IAB保留舊白板並加入指南。所有測試使用隔離測試資料，未清除使用者儲存。GitHub CLI token仍無效；connector唯讀素材可用。最終本機版本見git log，無remote、無push、無部署。
