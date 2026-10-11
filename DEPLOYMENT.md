# 正式上線前準備（尚未發布）

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
