# 開發進度與恢復

2026-10-11，第一次原型開發中。未 Git Push、未建立遠端、未正式部署。

## 環境盤點（A 實測）

- 起始目錄空白，未有 Git repository／既有檔案。
- Node 24.14.1、npm 11.11.0、Git 2.54.0.windows.1、gh 2.93.0。
- Git 本機 user.name 與 user.email 已設置，保留既有設定。
- gh 帳號 copudy 的現有 token 無效；上線前需使用者重新認證。未嘗試改動遠端或驗證推送權限。
- 已初始化本機 main；必要套件安裝於專案，未裝全域工具。
- Windows 沙箱使 Vite/Vitest realpath 出現 EPERM，工具已用獲准的專案命令執行；一般 PowerShell 使用 npm.cmd 可避免 npm.ps1 問題。

## 階段狀態

| 階段 | 已實作 | 驗證 |
| --- | --- | --- |
| A | 研究、選型、模型、測試計畫、授權記錄 | 已完成官方資料與環境檢查 |
| B | 自由畫布、物件、多選、尺寸、路由、歷史、吸附、Minimap、主題 | 型別與首次建置通過；瀏覽器驗證中 |
| C | 多根階層、快捷鍵、Alt 掛載、收合、整枝、三種排版、位置狀態 | 核心模型／排版單元測試通過；互動驗證中 |
| D | 白板管理、IndexedDB、視角、自動保存、JSON | 模型／儲存 roundtrip 通過；瀏覽器驗證中 |
| E | 浮動／釘選計算機、結果節點、複製、連線、恢復 | 計算引擎通過；瀏覽器驗證中 |
| F | PWA、響應式、相對路徑建置 | 待正式建置離線測試、完整回歸與交付 |

## 恢復方式

先讀 README、ARCHITECTURE、TEST_REPORT、ACCEPTANCE 及本文件，再看 `git status`／`git log`。不要重新建立專案。執行 `npm.cmd test`、`npm.cmd run build`，啟動 dev 5173／preview 4173。若已有 server 先確認，不重複啟動。

## 下一步

1. 完成核心回歸測試、瀏覽器操作與正式建置離線測試。
2. 修正互動與保存缺陷，測試效能／手機檢視。
3. 更新實際 TEST_REPORT／ACCEPTANCE，保存里程碑 Commit。
4. 交付原型並停在使用者驗收；未取得「驗收通過＋授權上線」不得進入遠端流程。
