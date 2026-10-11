# Mind Canvas v1.0.0 部署紀錄

## v1.1.0 發布完成（最新）

- 正式網址：https://copudy.github.io/mind-canvas/ ，公開 Repository：https://github.com/copudy/mind-canvas 。
- 分支 main；annotated Tag v1.1.0；發布 Commit `be694832d7b542ada290aba4cd66f2be7b9ee63f`。v1.0.0 與原始歷史保留，正常快轉與 Push，未 Force Push。
- Actions：https://github.com/copudy/mind-canvas/actions/runs/38153553180 ，build／deploy 均 success；沿用既有固定 SHA workflow、Node24 與 Pages 子路徑設定。
- A：發布前 Lint／Build、59/59 單元、51/51 完整瀏覽器測試通過。正式隔離 Edge 2/2 通過（11.8 秒）：標題 Mind Canvas、品牌資源／圖示、歡迎指南、白板建立編輯、計算機精度、JSON 匯出與副本還原、IndexedDB 刷新／繼續上次、SW scope=/mind-canvas/、離線重載與運算保存、390×844 手機。
- 敏感檔名、原始碼及 Git 歷史常見秘密標記未命中，沿用 .gitignore，作者 noreply 信箱；此檢查不代表完整安全稽核。
- E：實體手機、OS PWA 安裝、舊版既有正式瀏覽器的 SW 更新、正式環境完整關閉重開、真實儲存逐出／容量不足／強殺。全部新版功能已本機測試，正式未重跑完整 51 項。

更新時先匯出完整備份；不要清除網站資料。舊快取若未更新，可關閉本站所有分頁再重新開啟／刷新。含我的範本備份容器版本 2，新版支援 1／2，v1.0 拒絕 2。完整備份不含側欄偏好；跨裝置不自動同步。更新 SOP 見 RELEASE_SOP.md，後續版本仍需使用者授權。

以下為 v1.0.0 歷史紀錄。

2026-10-11，A／實測：首次部署完成。

- 正式網址：https://copudy.github.io/mind-canvas/
- 公開Repository：https://github.com/copudy/mind-canvas
- 分支main；Tag v1.0.0（annotated），Commit `40f576f38143426e033224f1db17407b804c1cba`。
- Actions：https://github.com/copudy/mind-canvas/actions/runs/38135027542 ，build 28秒、deploy 10秒，兩者success。
- 官方Actions以核對過的SHA固定於.github/workflows/pages.yml；Node24、npm ci、52單元、正式建置、Pages artifact／OIDC部署。產品／建置變更自動部署，文件／截圖不觸發，可手動dispatch。
- 本機52/52單元、42/42瀏覽器通過；正式隔離Edge2/2通過（12.7秒）。桌面及390×844手機，指南、建立／編輯／切換、Logo、Favicon、PWA圖示、IndexedDB刷新、JSON副本還原、SW範圍與離線重載／寫入／恢復網路均通過。
- 初始受限執行環境的CLI授權結果不足以判定Token失效；使用者完成官方登入後，在可連網環境確認copudy有效、repo／workflow scopes，以及目標Repository的admin／push權限。沒有要求或輸出秘密。
- 敏感檔名、追蹤內容、全Git歷史常見秘密掃描均無命中；無環境憑證提交。Git作者使用noreply電郵；保留原歷史與所有既有資料。

待使用者手動驗證：實體手機／其他瀏覽器、OS安裝PWA、正式環境完全關閉瀏覽器後重開、真實儲存逐出／強殺／容量不足。正常刷新與離線已自動驗證，但不代表上述全部通過。

Actions有非阻斷維護提醒：部分官方Pages／artifact Action宣告Node20，由runner以Node24執行；ubuntu-latest近期映像轉換。本次成功，後續授權更新時再核對官方相容性，不在本次擴大升級。

後續版本流程見RELEASE_SOP.md。首次發布Tag固定，完成紀錄的文件Commit不移動它。本機資料需JSON搬到正式origin，Pages公開網址不提供私人存取隔離。其餘已知產品限制見SYSTEM_UX_REPORT.md。

## 以下為部署前準備歷史

目前僅本機原型。以下是準備資料，沒有建立遠端、Git Push 或部署。

## 必須先取得

1. 使用者明確確認原型驗收通過、授權正式上線。
2. 確認 GitHub 擁有者、repository 名稱與公開設定。
3. 使用者重新處理失效的 GitHub CLI 認證；不由代理讀取或輸出 token。

## 已準備

- Vite `base: './'`，manifest `start_url`／`scope` 皆為 `./`。
- Service Worker 從 `import.meta.env.BASE_URL` 註冊，靜態資源與 notices 都預快取。
- 本機 `/freeform-mind-canvas/` 子目錄伺服器測試 assets、scope 與離線重新整理。
- package-lock 固定實際套件版本；第三方授權在 public/THIRD_PARTY_NOTICES.txt。
- GitHub Actions 範本附於下方，尚未啟用。

## 授權後流程

檢查追蹤內容、備份／截圖無個人資料、秘密資訊、套件 notices；建立或連結指定 repository；推送本機 main；Settings → Pages 設 GitHub Actions；加入 `.github/workflows/pages.yml`：

```yaml
name: Deploy Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

此範本須在正式執行當日確認官方版本與實際 repository 設定。正式網址的功能、IndexedDB、離線与子目錄資源必須重新驗證；本機成功不代表已正式上線。GitHub Pages 為靜態託管，公開網址不是私人存取權限保護。

版本依據（2026-10-11 官方資料，A）：[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[setup-node](https://github.com/actions/setup-node)。

部署更新後，舊頁面可能待所有舊分頁關閉才啟用新的離線快取；更新前先備份。正式網址與本機 origin 的資料不同，需 JSON 移轉。

### 儲存隔離補充

正式GitHub Pages與127.0.0.1、5173、4173的origin不同，需JSON移轉。IndexedDB不是帳號隔離或加密；同一瀏覽器profile會共用白板，同一GitHub owner的其他Pages子路徑在同origin，路徑本身不提供安全隔離。一般公開Pages不需登入，私有repo也不等於私人網站。正式實測仍待授權。
