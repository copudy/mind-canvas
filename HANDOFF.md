# Mind Canvas 安全交接

## v1.3.0 UX 整合進行中（最新，尚未發布）

使用者本次已授權全部安全檢查通過後直接部署；分支 feature/v1.3.0-ux，基準 main afa3642／正式 v1.2.0，Remote copudy/mind-canvas。文字 WYSIWYG（Tiptap 3.31.4／ProseMirror／Markdown／UniqueID）、可選 Rich JSON／外觀／Callout、清單穩定 ID 錨點、表格 cell styles、Pointer Capture 八方向縮放與較少轉折路由已整合。旧白板不自動轉 Markdown、不清除資料；新內容匯出容器4，讀1／2／3／4，Board及DB仍1。

A：Lint／Build、70/70 單元與新 UX 5/5 瀏覽器專項通過（21.9秒）。原測試工具鏈安全告警已更新 Vitest5.0.4 修補，audit無告警；編輯器MIT，83 runtime套件授權告示已更新，編輯器獨立延後載入。

未完成：觸控／不同縮放／密集連線更多驗證；更新舊測試到新需求（不新增心智圖節點與流程／分析框架入口，原文件用JSON驗證保留），完整回歸；資料相容與正式部署前檢查；推送／標記／部署與正式驗證。尚未 Push、建立 v1.3.0 Tag 或部署。任何核心／資料相容失敗都不可發布。先讀這段和 Git 狀態接續，不重建，不 reset 或清除資料。

## v1.2.0 正式上線完成（最新，2026-10-12）

依使用者本次明確授權完成工具排序、框架預覽、圖示／表格／小日曆与便條紙分類後直接部署。正式 https://copudy.github.io/mind-canvas/ ，公開 Repository https://github.com/copudy/mind-canvas 。main，annotated Tag v1.2.0，發布 Commit `f77b80fb63384aa88432eca5ecaf0f4abb9de11b`。Actions https://github.com/copudy/mind-canvas/actions/runs/38157425825 success，舊版本標記保留，不 Force Push。

A／實測：Lint／正式 PWA Build、63/63 單元、55/55 完整本機瀏覽器（3.4 分鐘）、正式 **7/7（28.9 秒）** 全部通過。正式含指南／品牌資源／白板／JSON／IDB／离線計算機與手機；新增工具排序、每框架先預覽不插入、焦點預覽、表格輸入／增減／確認／Undo／完整備份與我的範本、圖示更換、日期記事保存／月份瀏覽及手機預覽範圍通過。

詳細功能、限制與格式見 V12_REPORT.md。含新小工具的備份容器 3，新版支援 1／2／3，舊版拒絕 3；DB 版本未變，資料不清除。表格沒有公式；日曆是本機記事，不提供外部同步／通知。圖示為 16 種可更換符號。

E：實體手機／OS 安裝、既有正式 profile 的 SW 更新、真實逐出／容量不足／強殺／斷電仍未驗證。不要清除網站資料來更新；若見舊版本，關閉本站分頁再開啟／刷新。定期完整備份。

下一 Session 先讀本節、V12_REPORT 及 Git 狀態再依使用者問題接手。本次發布已完成；後續版本另取授權，不自動再部署。文件記錄 Commit 在發布之後，不移動 v1.2.0 Tag。

## v1.2.0 工具更新發布執行（最新）

2026-10-12 使用者明確授權排序、游標預覽、圖示／表格／小日曆及便條紙分類更新後直接部署。分支 feature/v1.2.0-tools，版本 1.2.0。本機 Lint／Build、63/63 單元及 55/55 完整瀏覽器流程通過（3.4 分鐘）。詳見 V12_REPORT.md；沿用公開 copudy/mind-canvas 與 main／Pages workflow，新標記 v1.2.0，舊標記不移動。正式結果完成後記錄於最上方。

DB 名稱與版本不變，Item.widget 為可選欄位。含新小工具的 JSON 容器 3，新版相容 1／2／3；舊版本不可還原 3，不應用舊客戶端編輯新工具文件。使用者資料不清除。

## v1.1.1 已正式上線（最新，2026-10-12）

使用者已授權調整後直接部署，正式網址 https://copudy.github.io/mind-canvas/ ，Repository https://github.com/copudy/mind-canvas 。分支 main，annotated Tag v1.1.1，發布 Commit `0459123fc8a2837f74175ea96fe3853f38622e8f`；Actions https://github.com/copudy/mind-canvas/actions/runs/38154965129 build／deploy 成功。v1.1.0／v1.0.0 標記與歷史保留，未 Force Push。

A／實測：本機 Lint／Build、59/59 單元、51/51 完整瀏覽器回歸通過；正式 Edge **3/3 通過（13.5 秒）**。指南於 1440／390／320 寬驗證六章、Mind Canvas 品牌詞完整、無水平溢出、無畫布控制／浮動列／副本入口、章節跳轉及備份捷徑；白板建立編輯、JSON、IndexedDB、計算機、SW 子路徑與離線保存也通過。正式截圖 artifacts/production-v111-guide-*.png 已檢視；指南設計報告 V111_REPORT.md。

資料格式未變，使用者既有白板及練習資料未刪除／覆寫。E：實體手機、OS PWA 安裝、既有正式 profile 的 SW 更新、真實逐出／配額／斷電仍待手動驗證。若仍見舊頁，關閉本站分頁重新開啟或刷新，不清除網站資料。

下一 Session 先讀本節／V111_REPORT／git status 再依使用者問題接手；此次發布已完成，不再自動部署，後續版本另取授權。測試與文件記錄 Commit 在發布之後，不移動 v1.1.1 Tag。

## v1.1.1 指南修正發布執行（最新）

2026-10-12 使用者授權修改後直接部署。分支 fix/v1.1.1-guide、版本 1.1.1。文件指南取代畫布指南、移除副本入口與浮動遮擋，資料格式未改且保留既有白板。Lint／Build、59/59 單元、51/51 完整瀏覽器回歸通過（3.2 分鐘）。詳見 V111_REPORT.md；部署結果將追加於最上方。v1.1.0／v1.0.0 標記不移動。

## v1.1.0 正式部署完成（最新）

使用者本次明確授權後已正常推送 main 與 annotated Tag v1.1.0；發布 Commit `be694832d7b542ada290aba4cd66f2be7b9ee63f`。Actions https://github.com/copudy/mind-canvas/actions/runs/38153553180 的 build／deploy 均 success。正式網址 https://copudy.github.io/mind-canvas/ ，公開 Repository https://github.com/copudy/mind-canvas 。v1.0.0 保留、不移動，未 Force Push，未發布額外 GitHub Release。

A／實測：本機 Lint／Build、59/59 單元、51/51 完整瀏覽器回歸通過（4.8 分鐘）；正式隔離 Edge 2/2 通過（11.8 秒），涵蓋桌面／手機指南、標題／Logo／Favicon／PWA 圖示、白板建立編輯、計算機、JSON 副本還原、IndexedDB 刷新、SW 子路徑及離線運算保存。版本與更新 SOP 見 DEPLOYMENT.md／RELEASE_SOP.md；下方等待授權／本機狀態保留為歷史。

E：實體手機／OS 安裝、舊版既有正式 profile 的 SW 更新體驗、真實逐出／容量不足／強殺／斷電尚未驗證。新範本與指南資料遷移已在本機隔離測試通過；正式測試未逐項重跑全部 51 項。IndexedDB 資料保持本機，建議定期完整備份，含範本格式 2 需新版還原。

下一 Session 先讀本節與 git status／log／remote，再依使用者回報處理。此次 v1.1.0 發布授權已完成，後續發布仍需新授權。不自動再次部署、不清除資料、不重新開發。記錄用文件／截圖 Commit 會在發布 Commit 之後，v1.1.0 Tag 不隨文件更新移動。

## v1.1.0 發布授權與執行（最新）

使用者已明確授權「先這樣 push 上線進行版控」，本次範圍為目前已驗收 v1.1.0 推送、版本標記與 GitHub Pages 部署，不新增功能。沿用公開 copudy/mind-canvas、既有 main 與 Actions。v1.0.0 Tag 不移動；本機成果 b45294b 保留。最終發布 Commit、Actions 與正式測試結果由下方後續完成紀錄補充；目前仍在發布前完整回歸。

認證在可連網環境確認 copudy／ADMIN 與 repo、workflow scopes 有效；受限環境顯示認證失敗不能據此認定 Token 失效。追蹤檔名、原始碼及全 Git 歷史常見秘密標記檢查未命中，此為有限檢查，非完整安全稽核。資料不清除，沿用 DB／遷移，完整範本備份版本 2。

## v1.1.0 本機開發／待驗收（最新）

2026-10-11：本次僅授權本機開發與測試。分支develop/v1.1.0，版本1.1.0-dev.0；沒有Push／新增Tag／正式部署。必須收到「Demo OK，可以部署 v1.1.0」才發布。下方v1.0首次發布授權已完成，不得延伸到新版。

已實作受保護使用指南／練習副本、單一計算機入口、六官方範本與我的範本、完整備份版本2／舊版1相容、側欄覆蓋模式与情境避障。完整設計、資料遷移、測試／限制／驗收見V11_REPORT.md及TEST_REPORT最新段落。原v1.0 Tag40f576f與main594f7d2保留不動。

接手先讀上述報告與git status／log，勿重建或清除IndexedDB。模板放在原DB的meta/templates-v1；舊指南修改會保留為一般白板。含範本備份要用v1.1還原，v1.0拒絕格式2。4173本機預覽可用START_PREVIEW.cmd重啟。完成本機驗收後停止，不自動部署。

## v1.0.0 首次發布已完成（2026-10-11）

使用者已驗收並授權本次GitHub推送與Pages首次部署，另明確確認公開Repository。已建立copudy/mind-canvas，帳號copudy具admin／push權限，repo／workflow認證有效，Actions開啟，Pages來源workflow。下方安全收尾段落為歷史；現行授權以本段為準。

正式網站：https://copudy.github.io/mind-canvas/ 。Repository：https://github.com/copudy/mind-canvas （Public）。origin=https://github.com/copudy/mind-canvas.git，分支main，annotated Tag v1.0.0 指向發布／部署Commit `40f576f38143426e033224f1db17407b804c1cba`。Actions https://github.com/copudy/mind-canvas/actions/runs/38135027542 build及deploy皆success。

版本1.0.0，保留全部歷史，未Force Push或覆蓋Tag。發布前本機正式建置、52單元、42瀏覽器流程通過；正式Edge桌面／手機2流程通過，含指南、建立／編輯／切換、IndexedDB刷新恢復、JSON匯出與匯入副本、Logo／Favicon／PWA圖示、SW子路徑與離線重載／保存／上線恢復。敏感檔案與全Git歷史常見秘密掃描無命中；作者使用GitHub noreply電郵。未修改UI／文件資料模型。詳見DEPLOYMENT.md與TEST_REPORT.md，更新SOP見RELEASE_SOP.md。

待使用者手動驗證：實體手機、OS安裝PWA、正式環境完全關閉瀏覽器後重開、真實儲存逐出／容量不足／強殺。已知限制沿用SYSTEM_UX_REPORT；全部JSON備份不含側欄分類偏好。本機與正式資料獨立，須JSON移轉。

下一Session先讀本節並核對git status／log／remote及遠端Tag；文件完成紀錄會有後續Commit，但v1.0.0固定不移動。此次授權已完成，後續發布或UI修改須另有指示。不要自動重部署，不重建專案，不清除IndexedDB。

以下為2026-10-11上一階段安全收尾歷史，當時尚未部署；現況以上方已完成發布紀錄為準。本次建立Tag但未另外發布GitHub Release。

## 目前狀態與驗收

使用者本次明確確認 Demo 已達可上線程度；本次授權僅安全收尾與本機 Commit，沒有正式發布授權。不再擴充功能或重構。下一次不得把本文件當成遠端寫入授權。

專案：`D:\03_Business Files\01_Projects\03_Vibe Coding Project\Freeform Mind Canvas`。

已保存原始碼、設定、package-lock、測試、操作文件與截圖。既有正式建置 dist/index.html 存在；dist 被忽略且可重建，不是唯一版本來源。白板使用者資料在瀏覽器 IndexedDB，不在 Git；不要清除網站資料，搬移需 JSON。

已驗收版本包含自由畫布、多種物件、局部心智圖與三種排版、圓角正交連線、Undo／Redo、多白板與釘選／區段／搜尋、浮動與釘選計算機、IndexedDB、自動儲存、JSON、指南、PD-1 品牌、單列 Header、底部兩層工具庫、集中資料管理與基本 PWA／離線功能。詳見 SYSTEM_UX_REPORT.md、ACCEPTANCE.md。

上次完成實測（A）：型別／正式建置通過、單元52/52、Edge瀏覽器42/42；含桌面、手機尺寸、矮視窗、舊資料、JSON逐欄還原、儲存失敗、子路徑與離線。此次安全收尾未重跑測試，也未改程式。

## Git 與授權檢查（A／本次實測）

- 目前分支：`main`。
- 已驗收程式 Commit：`fb7121d9570d4b7b95267fec72952fe07d71a005`，訊息「統一全站介面、指南入口與安靜自動儲存」。
- 收尾開始時 `git status --short` 與完整未追蹤檢查均空白，無待存程式修改。
- Remote：空白，尚未連結任何 Repository。
- 本文件新增後建立僅限本機封存 Commit；其確切 Hash 用 `git log -1 --format=%H` 讀取。上述程式 Commit 保持不變，本次只加入交接文件。
- `.gitignore` 已排除 node_modules、dist、測試輸出、*.local、.env*、*.tsbuildinfo。沒有更動忽略規則或刪除檔案。
- 敏感檔名檢查（含被忽略檔，排除套件／建置／測試輸出）未找到 .env、私鑰／憑證或 credential／secret 檔案。追蹤檔亦未包含這些檔案。
- 文字常見 GitHub token、AWS key、API key 與私鑰標記掃描未命中；只輸出檔名，未輸出秘密。這是有限範圍檢查，不是完整秘密／資安稽核；正式公開前仍須審查追蹤檔及截圖。
- 既有 `gh` 位於 `C:\Program Files\GitHub CLI\gh.exe`。本次 `gh auth status` 回報 github.com 帳號 `copudy` token 無效，退出碼1；Repository 寫入／Pages 權限未驗證。沒有登入、登出或修改認證。

## 已知問題與未完成

- 尚無遠端、有效 CLI 認證、已啟用部署 workflow 或正式網址。
- E／未驗證：實體手機與其他瀏覽器、OS PWA 安裝、正式環境、真實磁碟耗盡／資料逐出／強殺／斷電。
- 瀏覽器持久儲存不保證永久；共用 profile 共用資料，跨裝置不自動同步。
- JSON全部備份包含白板文件，不含側欄釘選／區段或介面偏好；已在介面說明。
- 無跨分頁衝突合併；Undo不跨重開；找不到安全連線路徑時暫停繪線並警告，全圖交叉不保證最少。
- 沒有已知阻斷本機驗收的缺陷；其餘限制與測試修正紀錄見 TEST_REPORT.md 最新段落。

## GitHub Pages 發布前必要檢查

1. 明確取得下一階段 Push／建立或連結遠端／正式部署授權，確認 owner、repository 名稱及公開設定；不要猜測目標。
2. 由使用者處理有效 GitHub 認證，再唯讀檢查帳號、Repository 存取與 Pages／Actions 權限；不要讀取或輸出 token。
3. 再次檢查 Git狀態、追蹤檔、秘密、授權 notices 與 artifacts 截圖是否適合公開。保留使用者資料，必要時先用設定 → 資料與備份匯出。
4. 執行必要本機回歸及正式建置。已用相對 base、manifest scope/start_url、SW路徑與子路徑離線測試準備，但正式 origin 仍需重測。
5. DEPLOYMENT.md 有未啟用 Actions 範本；正式執行當天核對官方 Action 版本與設定後才建立 workflow。本次沒有安裝工具或建立 workflow。
6. 授權後才建立／連結指定遠端、推送、設定 Pages。成功後驗證正式網址、資源子路徑、主要操作、IndexedDB、離線與新版快取，不只看 Actions 綠燈。
7. 正式與本機 origin 的資料獨立，須 JSON 搬移；同 owner Pages 子路徑屬同 origin，路徑不提供資料安全隔離。Pages公開網址不是私人存取系統。

## 下一次 Session 的第一步與指令

先讀本文件、SYSTEM_UX_REPORT.md、TEST_REPORT.md、DEPLOYMENT.md，再做以下唯讀核對；**不要重新建立專案或清空資料庫**。

```powershell
Set-Location -LiteralPath 'D:\03_Business Files\01_Projects\03_Vibe Coding Project\Freeform Mind Canvas'
git status --short
git branch --show-current
git log -2 --oneline
git remote -v
gh auth status
```

確認程式基準仍為上述已驗收 Commit，交接 Commit 在其後。若有後續修改，先盤點，不 reset／覆寫。先補齊發布授權、repository 目標與失效認證，再進入部署。

需要回歸或本機預覽時（依賴已在本機，不必安裝新工具）：

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

有既有伺服器時先確認，不重複啟動。網址為 http://127.0.0.1:4173/；亦可用 START_PREVIEW.cmd 重現。正式建置後完整瀏覽器測試為 `npm.cmd run test:e2e`，使用已安裝 Edge 與隔離測試資料。

**交接完成不等於正式上線。下一階段只在授權與目標明確後發布。**
