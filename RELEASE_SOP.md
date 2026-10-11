# Mind Canvas 發布與更新 SOP

首次目標：公開 https://github.com/copudy/mind-canvas ，GitHub Pages https://copudy.github.io/mind-canvas/ 。本次授權僅 v1.0.0，後續發布需另有使用者授權。

1. 讀 HANDOFF、DEPLOYMENT、TEST_REPORT，檢查工作區、分支、Remote、授權與 Tag；不 reset、Force Push 或覆蓋既有 Tag。
2. 審查所有待提交內容、Git歷史中的秘密與公開截圖；不要提交 .env、私鑰、瀏覽器白板或登入資料。先匯出重要白板。
3. 在獨立修改中調整 package.json／package-lock 版本，執行單元、型別／正式建置及必要瀏覽器回歸：

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

4. 建立正常 Commit；檢查新 Tag 在本機與遠端均不存在，才建立 annotated Tag。取得該次發布授權後，正常 Push main 與指定 Tag，禁止 Force。
5. 本次 Pages workflow 在 main 的產品／建置設定變更時啟動。文件／截圖更新不自動部署；需要重部署可在 Actions 手動啟動 workflow。官方Actions固定SHA，更新時先核對官方版本。
6. 等待 Actions build 與 deploy 均 success，再驗證正式網址與資源；用隔離 Edge profile 執行：

```powershell
npx.cmd playwright test --config playwright.production.config.ts
```

7. 驗證指南、建立／編輯／切換、JSON副本還原、IndexedDB、刷新、SW範圍與離線寫入。OS安裝與實體手機另列手動驗證，不把Actions綠燈當成全部驗收。
8. 更新 HANDOFF／DEPLOYMENT／TEST_REPORT，記錄Commit、Tag、Actions網址、測試及風險；文件提交不挪動發布Tag。正式與本機資料不共用，以JSON搬移。

若失敗，保留失敗紀錄，先確認根因；不擅自重寫Git歷史、不以刪除資料或清理網站資料修復快取。回復部署須另取得授權，優先對既有良好版本手動重部署。
