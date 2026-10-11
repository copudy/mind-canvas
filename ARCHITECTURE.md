# 架構與決策

## v1.2.0 可攜小工具與預覽

可選 Item.widget 保存 icon／table／calendar，不增加大型畫布框架。CanvasWidget 在既有節點內渲染；穩定 ID、拖曳／調整尺寸／關聯／複製／範本／背景儲存沿用既有路徑。輸入在 focus 記錄 checkpoint、change 更新不重複建立歷史；autosize 排除小工具。widgets.ts 集中邊界與日期驗證。含 widget 的匯出容器為 3，匯入仍讀 1／2／3，DB 版本未變。

ToolPreview 用 portal 避開工具庫的裁切，圖形從實際 Template 文件生成，pointer-events:none；滑鼠移動與鍵盤焦點分開避免捲動產生的事件覆寫。我的範本也使用同一縮圖 renderer。

## v1.1.1 文件指南

GuidePage 在官方指南分支以原生捲動與 CSS Grid 呈現；普通白板保持原 XYFlow 渲染。指南不再使用 RF 視角，不改 DB 文件格式，問候讀取原指南節點，resume／create／backup 共用既有 Workspace／Settings 動作。官方指南 duplicate 在 Workspace 層禁止，原副本不刪除。

## v1.1 本機增量（最新）

templates.ts以既有Board／Item／Relation捕捉、正規化相對座標及重新產生插入ID，保留內部樹／圖及樣式；TemplateDialog重用單一儲存／改名／刪除介面。IndexedDB版本1不变，meta新增templates-v1，完整匯入在單交易写入白板與範本；JSON容器2搭配仍為1的Board schema，兼容舊容器1。

官方Guide保護在Workspace內容命令與渲染／互動兩層，副本删除guide標記，老指南先原子保存練習副本；Header是指南唯一導覽入口。floating／closed／floatPosition為計算機可選狀態，保留同一ID及關聯。

側欄絕對定位，畫布尺寸與視角不隨收合改變；適應畫面預留面板，完成時顯式保存視角。contextToolbar.ts在投影物件外尋找空白區，避免操作列擋住兄弟節點。未換框架、無新執行依賴。詳細見V11_REPORT。

目前增量以末節「全站 UI/UX 整頓架構增量」及 SYSTEM_UX_REPORT.md 為準；前段保留架構演進記錄。

## 選型（2026-10-11）

| 候選 | 功能／效能／維護 | 授權 | 決策 |
| --- | --- | --- | --- |
| React + Vite + TypeScript | 成熟開發、型別檢查、靜態建置；與 XYFlow 整合直接 | MIT | 採用 |
| XYFlow / React Flow | 節點拖曳、多選、視角、Minimap、尺寸控制；自訂 React 節點可放計算機。既有互動節省維護成本；大規模路由另需優化 | MIT；保留歸屬標記與授權 | 唯一畫布框架 |
| tldraw | 白板工具成熟，但樹狀模型仍需自訂；新增大型 SDK 與正式授權管理 | 正式使用需有效 trial／commercial／hobby license | 不採用 |
| 自製完整畫布 | 渲染可完全控制，但指標／觸控／多選維護成本高 | 自有程式 | 僅自製領域邏輯 |
| IndexedDB + idb | 多文件異步交易與結構化資料，無後端 | idb ISC | 採用 |
| Decimal.js | 十進位運算，避免 0.1+0.2 浮點顯示誤差 | MIT | 採用，搭配自有受限解析器 |
| Vite PWA / Workbox | 正式建置預快取、離線重新開啟 | MIT | 採用 |

官方依據（A）：https://reactflow.dev/ 、https://github.com/xyflow/xyflow/blob/main/LICENSE 、https://tldraw.dev/community/license 。套件實際版本固定在 package-lock.json。未安裝第二套畫布框架，無付費或雲端資源。

參考專案 https://github.com/pjwang2022/trace-by-hand-whiteboard 與 https://draw.prod-stack.com/ ：已讀 README 並在瀏覽器查看工具、新增物件、快捷鍵與 Minimap。借鏡簡潔工具列、直接放置、局部工具及畫布視角；該專案呈現單檔 HTML 與 localStorage，本案選模組化與 IndexedDB。檢視的檔案列表未見 LICENSE，不推定授權、不複製其程式碼（A：官方 repo／實際介面；授權完整狀態待查）。

## 模組

- `model.ts` Document／Tree／Graph：穩定 UUID，父子 parentId、order 與獨立 relations；座標不代表階層。
- `layout.ts` Layout Engine：局部子樹計算 span，向右／左右／放射，跳過 Pinned／Free，避開已占用矩形；拖曳智慧吸附。
- `router.ts` Connector Router：四向外框 ports、20px stubs，矩形障礙膨脹 12px，直角格點 A* 搜尋、轉折懲罰、折線簡化，SVG A 圓弧半徑最多 10px。
- `components/CanvasNode.tsx`／`Connector.tsx`：自訂 XYFlow 畫面；節點輸入、尺寸與連線。
- `useCanvasGraph.ts`：模型轉 renderer nodes／edges，尺寸同步 measured；依幾何變化快取路由，避免文字／計算機輸入反覆重算。
- `history.ts` Command History：每白板獨立 snapshot Undo／Redo，最多 100 次；拖曳、尺寸與文字輸入以操作起點記錄。
- `useWorkspace.ts` Workspace Manager：工作集、切換、命名、複製、刪除、匯入匯出；保存佇列＋400ms debounce，切换／隱藏前 flush。
- `storage.ts` Storage Repository：IndexedDB boards／meta；交易完成後顯示成功；JSON 格式、型別、範圍、引用、循環、數量驗證。
- `calculator.ts` Calculator Engine：受限遞迴下降解析、優先順序、單元正負號、括號、百分比，拒絕非法字元／除零／極端範圍。
- `App.tsx` 協調畫布事件、操作與 UI；`Sidebar`、`Inspector` 分離管理 UI。
- `FloatingCalculator`、`WorkbenchDialogs`：浮動工具與命令／說明／刪除確認分離。

## 文件 v1

`Board {schemaVersion:1,boardId,name,updatedAt,nodes,relations,treeStyle,viewport}`。

每個 `Item` 包含 id、kind、text、position、width／height、autoSize／maxWidth、parentId／order、collapsed、mode（Auto／Pinned／Free）、layout、background／border／color／fontSize／bold、expression／result／calcError。計算機與普通物件共用穩定 ID、座標與尺寸。父子線由階層衍生，自由線獨立含 id／source／target／style／optional sides／waypoints；ports／waypoints 欄位為未來手動路由預留。

匯入外層 `{format:'freeform-mind-canvas',schemaVersion:1,boards:[...]}`。只接受 v1；未來 migration 需明確增加，不能默默當成 v1。上限每白板 2000 節點／5000 關聯、100 張匯入、20 MB 檔案；不是該規模的效能保證。

## 限制與可逆性

最後實作補充：無安全路徑時保留關係、暫停繪線並顯示警告，不画穿文字。

完全包覆／重疊可能讓外框連線在幾何上無法完全避障，會顯示警告；不宣稱此時路由無碰撞。路由優先選短外框組合與可行路径，未做全圖交叉／共用線束最小化。Pinned 是排版位置固定，仍允許使用者主動拖曳。普通拖曳整枝改為 Free；Alt 必須在目標內部才掛載，防循環，歷史可復原。白板刪除需 UI 明確確認，無 Undo；物件刪除有 Undo。

資料安全依賴瀏覽器 IndexedDB；無同步、無使用者帳號、無伺服器、無外部資料請求。不同 origin／port 的資料獨立，備份是移轉方式。Undo 僅本次執行記憶體，不持久化；目前不做 operation log、PNG/SVG/Markdown/OPML。

## 2026-10-11 四項修改架構增量

- 主品牌原 SVG 與來源 SHA 見 REFINEMENT_REPORT.md，design-tokens.css 集中管理品牌及獨立淺／深工作區色彩。沒有加入第二個畫布框架。
- ToolLibrary 僅重組既有功能入口、加入由節點／連線組成的小範本；六分類及收合偏好獨立於文件。
- Board 新增可選 guide { version:1, greetingId }。舊 schemaVersion1 仍可讀，不改 DB 版本；嚴格驗證 greetingId 為現有文字節點。複製／匯入保留物件內容，但不複製官方指南入口標記。
- guide.ts 建立官方互動文件；僅無白板才初始化，有資料不自動新增。開啟指南在其文字節點抽換問候，沒有全站問候元件。重設是可復原文件命令，UI 先確認。
- persistence.ts 封裝 persisted／persist 能力與失敗處理。使用者點擊時要求，拒絕不阻斷正常 IndexedDB 寫入。
- SW skipWaiting + clientsClaim 接管新版快取；已開頁面顯示載入新版入口，先 flush 再檢查失敗／待儲存狀態，避免強制重載未保存文件。首次接管不提示更新。
- 畫布視角事件檢查 boardId，避免已離開白板的視角事件寫入當前白板。

## 最新 UX 與管理偏好（2026-10-11）

workspacePrefs.ts 將工作區偏好獨立於 Board：version1、lastOpened、pinned、sections、membership。沿用 IndexedDB v1 的 meta store，以 workspace-v1 儲存字串JSON，無破壞性資料庫升級。normalizePrefs驗證參照、去重並從舊active遷移有效非指南ID；無可靠歷史時不猜測。釘選為ID捷徑，原區段不變。刪區段只清理membership。

useWorkspace初始化保留既有文件、補唯一指南、刷新一次問候並開指南。管理設定採獨立序列寫入／失敗提示；初始化設定失敗仍呈現已讀取文件。update的contentChange旗標使視角寫入不修改updatedAt。指南開啟不修改lastOpened，工作白板開啟／新增／複製／匯入更新它；刪除時清除無效參照。

此段為前一版決策：目前比例與入口見下節。React Flow 文件座標與縮放維持原系統，不使用 CSS zoom。新計算機430px高並置於可視中央，舊一般白板保持原尺寸與座標。

## 全站 UI/UX 整頓架構增量（目前版本）

- design-tokens.css 定義 UI15／輔助13／工具14／點擊44／間距4–24；workspace-ui.css 統一單列 Header、側欄、工具庫、指南入口與設定響應式規則，工具圖示22、工具112×80、庫高148／收合36。
- DataSettings 是唯一資料管理介面，呼叫既有 workspace backup／restore／persistence；指南捷徑、命令搜尋與 Header 設定指向同一組功能。移除第二層指南導覽與側欄重複資料按鈕。
- Board.guide 增加可選 entryId／backupId，驗證有效文字物件；不改 schema／DB 版本。CanvasNode 在這些指南物件中渲染操作，問候仍是指定文字節點。arrangeGuide 保留原ID／關係，一次重新安排標準教學、加入操作物件；有入口不重複新增，標準主視覺緊湊遷移只處理尚未移動的入口。
- 內容／視角更新先比較快照，無差異跳過。schedule 內容800ms／視角1600ms；節點拖曳與調尺寸透過 beginGesture／endGesture 暫停計時並於放開250ms提交；switch／visibility flush 與 beforeunload 保護保持。
- meta 增加 saved-boardId／backup-at 字串時間戳，白板與成功時間在同一交易保存，交易完成才報告成功。備份時間只記錄下載啟動；畫面不把它當成落地成功。內容與視角仍保存同一 Board 快照，未引入新持久化框架。
- 一般狀態只在設定顯示，錯誤仍主畫面警告。設定開啟時停用畫布快捷鍵，避免誤刪背後物件。
- PWA保留相對路徑；Favicon版本參數v納入Workbox忽略條件，避免離線時讀不到已快取SVG。正式素材blob未更改。
- 高度不足700px的工具庫初始收合但不覆寫原偏好；指南隱藏Minimap／縮放輔助控制，保留主要CTA與手勢／搜尋。一般白板仍有Minimap與控制。

詳細機制、證據與風險見 SYSTEM_UX_REPORT.md。原React＋XYFlow＋IndexedDB＋Decimal架構維持，不新增外部依賴或服務。
