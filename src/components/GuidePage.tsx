import type { Board } from "../model";

export default function GuidePage({
  board,
  lastBoard,
  resume,
  create,
  backup,
}: {
  board: Board;
  lastBoard?: string;
  resume: () => void;
  create: () => void;
  backup: () => void;
}) {
  const greeting = board.nodes.find(
    (n) => n.id === board.guide?.greetingId,
  )?.text;
  return (
    <article className="guide-page" aria-label="Mind Canvas 使用指南">
      <div className="guide-content">
        <section className="guide-hero">
          <p className="guide-eyebrow">PD-1 CENTER · 自由思考工作台</p>
          <h2>
            歡迎來到 <span>Mind Canvas</span>
          </h2>
          <p className="guide-greeting">{greeting}</p>
          <p className="guide-intro">
            把想法放下來，再慢慢連成方向。從一張白板開始，文字、分支、計算與計畫都能放在一起。
          </p>
          <div className="guide-start">
            {lastBoard && (
              <button className="guide-primary" onClick={resume}>
                繼續上次的白板 <strong>{lastBoard}</strong>
              </button>
            )}
            <button
              className={lastBoard ? "" : "guide-primary"}
              onClick={create}
            >
              建立新白板
            </button>
            <a href="#guide-basics">看看怎麼使用 ↓</a>
          </div>
        </section>
        <nav className="guide-chapters" aria-label="指南章節">
          {[
            "基本操作",
            "心智圖",
            "範本",
            "計算機",
            "資料與備份",
            "開始思考",
          ].map((s, i) => (
            <a
              key={s}
              href={`#guide-${["basics", "mind", "templates", "calculator", "backup", "start"][i]}`}
            >
              <span>0{i + 1}</span>
              {s}
            </a>
          ))}
        </nav>
        <div className="guide-sections">
          <section id="guide-basics" className="guide-card">
            <p className="guide-eyebrow">01 · 基本操作</p>
            <h3>先放下一個念頭</h3>
            <p>
              建立白板後，從底部工具庫加入文字或便條紙。雙擊物件編輯，拖動物件調整位置。
            </p>
            <dl>
              <dt>選取與移動</dt>
              <dd>空白處拖曳框選；Shift＋點擊多選；拖曳邊角調整大小。</dd>
              <dt>瀏覽畫布</dt>
              <dd>
                滾輪平移；中鍵或右鍵拖曳；Ctrl＋滾輪縮放。左下角可適應畫面。
              </dd>
              <dt>操作可復原</dt>
              <dd>Ctrl＋Z 復原；Ctrl＋Shift＋Z 重作；按 / 找工具與命令。</dd>
            </dl>
            <div className="guide-example guide-note">
              今天想完成的一件小事
              <br />
              <small>把一個想法寫下來，就已經開始了。</small>
            </div>
          </section>
          <section id="guide-mind" className="guide-card">
            <p className="guide-eyebrow">02 · 心智圖</p>
            <h3>讓想法長出分支</h3>
            <p>
              從「思考框架 → 心智圖」開始。選取節點後，Tab 加子節點、Enter
              加同層、Space 收合或展開。
            </p>
            <div className="guide-mind-example" aria-label="旅行計畫心智圖示範">
              <strong>旅行計畫</strong>
              <div>
                <span>想去的地方</span>
                <span>預算與準備</span>
                <span>留一點空白</span>
              </div>
            </div>
            <p>
              用「排版整理」切換向右、左右或放射。各棵心智圖獨立整理，不會重排整張白板。
            </p>
          </section>
          <section id="guide-templates" className="guide-card">
            <p className="guide-eyebrow">03 · 範本與關係</p>
            <h3>需要結構時，再套用框架</h3>
            <p>
              思考框架提供
              SWOT、5W1H、決策矩陣、WBS、旅行規劃及會議紀錄。插入後的內容可以自由修改。
            </p>
            <div className="guide-example guide-flow">
              <span>收集想法</span>
              <b>→</b>
              <span>比較選項</span>
              <b>→</b>
              <span>下一步</span>
            </div>
            <p>
              用「連線關係」連接物件。框選一組內容後，可從情境工具列或 /
              選單「儲存為我的範本」，下次插入會建立獨立新物件。
            </p>
          </section>
          <section id="guide-calculator" className="guide-card">
            <p className="guide-eyebrow">04 · 計算機</p>
            <h3>把數字放進思考裡</h3>
            <p>
              「實用工具 →
              計算機」預設浮動開啟；工具內可釘選到畫布或解除釘選。同一個計算機會保存算式與結果。
            </p>
            <div className="guide-example guide-budget">
              <span>旅行預算示範</span>
              <code>(1800 + 650) × 2</code>
              <strong>4,900</strong>
            </div>
            <p>
              支援括號、小數及百分比。結果可複製或建立為新節點，再連到你的計畫。
            </p>
          </section>
          <section id="guide-backup" className="guide-card">
            <p className="guide-eyebrow">05 · 資料與備份</p>
            <h3>想法留在這個瀏覽器，備份由你掌握</h3>
            <p>
              白板會自動儲存到目前瀏覽器的
              IndexedDB，不會上傳，也不會跨裝置自動同步。同一瀏覽器設定檔共用資料。
            </p>
            <ol>
              <li>重要修改後、換裝置前，開啟「設定 → 資料與備份」。</li>
              <li>
                選「全部備份」，保存所有白板與我的範本；「匯出本白板」只保存目前白板。
              </li>
              <li>
                在目標瀏覽器選「匯入專案」，還原
                JSON。匯入會建立副本，不覆蓋原白板。
              </li>
            </ol>
            <p className="guide-risk">
              清除網站資料、無痕模式、瀏覽器自動清理或更換裝置，都可能讓資料遺失。建議定期備份；側欄分類與偏好不包含於
              JSON。
            </p>
            <button onClick={backup}>開啟資料與備份</button>
          </section>
          <section id="guide-start" className="guide-card">
            <p className="guide-eyebrow">06 · 開始思考</p>
            <h3>選一個你今天用得上的題目</h3>
            <ul>
              <li>
                <strong>旅行：</strong>地點分支、行程便條、計算預算。
              </li>
              <li>
                <strong>工作：</strong>WBS 拆任務，會議範本追蹤下一步。
              </li>
              <li>
                <strong>生活：</strong>整理支出、比較選項、記下想做的事。
              </li>
            </ul>
            <p>
              左側可以新增、搜尋、釘選與分類白板。在任何白板都能從
              Header「說明與幫助」回到這份指南。
            </p>
            <p>
              這是官方說明頁，不需要建立指南副本。直接建立自己的白板，邊做邊熟悉工具就好。
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
