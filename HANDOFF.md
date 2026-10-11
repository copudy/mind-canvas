# Mind Canvas 安全交接

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
