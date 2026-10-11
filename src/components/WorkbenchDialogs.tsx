import { X, Search, Plus, LocateFixed } from "lucide-react";
import type { Item } from "../model";
export function HelpDialog({ close }: { close: () => void }) {
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal help-modal"
        role="dialog"
        aria-label="操作說明"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="關閉操作說明"
          onClick={close}
        >
          <X size={19} />
        </button>
        <span className="eyebrow">A LITTLE ROOM FOR BIG IDEAS</span>
        <h2>開始自由思考</h2>
        <p>同一張白板，可以有很多棵心智圖，也可以什麼都不連。</p>
        <div className="help-grid">
          <div>
            <h3>創造與編輯</h3>
            <p>
              工具列新增物件；雙擊或 F2 編輯文字。Ctrl＋Enter 完成，Esc
              取消。選取後拖曳邊角調整尺寸。
            </p>
            <h3>移動與連線</h3>
            <p>
              空白處拖曳框選，Shift
              點擊多選。滑鼠中鍵／右鍵拖曳，或手掌工具平移。Ctrl＋滾輪縮放。拖節點邊緣圓點建立自由關聯線。
            </p>
          </div>
          <div>
            <h3>讓想法長出分支</h3>
            <p>
              Tab 新增子節點；Enter 新增同層；Shift＋Tab 提升層級；Space
              收合。普通拖曳移動整枝；Alt＋拖入節點內重新掛載，綠色預覽顯示插入順序。
            </p>
            <h3>安全保存</h3>
            <p>
              Ctrl＋Z 復原，Ctrl＋Shift＋Z 重作；Ctrl＋D 複製分支，Ctrl＋C／V
              跨白板複製貼上。JSON
              備份保留白板全部資料。清除瀏覽器網站資料會移除本機白板。
            </p>
          </div>
        </div>
        <p className="help-note">
          首次載入正式建置完成快取後可離線開啟；開發模式不啟用離線快取。百分比採除以
          100，不支援隱含乘法。
        </p>
        <button className="primary" onClick={close}>
          開始思考
        </button>
      </div>
    </div>
  );
}
export function DeleteBoardDialog({
  name,
  close,
  backup,
  confirm,
}: {
  name: string;
  close: () => void;
  backup: () => void;
  confirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-label="確認刪除白板">
        <h2>刪除這張白板？</h2>
        <p>「{name}」將從此裝置刪除。此操作無法復原，建議先匯出備份。</p>
        <div className="modal-actions">
          <button onClick={close}>取消</button>
          <button onClick={backup}>先備份全部</button>
          <button className="danger" onClick={confirm}>
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}
export function CommandDialog({
  query,
  setQuery,
  close,
  commands,
  nodes,
  onLocate,
}: {
  query: string;
  setQuery: (s: string) => void;
  close: () => void;
  commands: { label: string; run: () => unknown }[];
  nodes: Item[];
  onLocate: (n: Item) => void;
}) {
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="command-menu"
        role="dialog"
        aria-label="快速命令"
        onClick={(e) => e.stopPropagation()}
      >
        <label>
          <Search size={20} />
          <input
            autoFocus
            aria-label="搜尋節點與命令"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋節點，或找一個動作…"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
          />
          <button aria-label="關閉命令" onClick={close}>
            <X size={17} />
          </button>
        </label>
        <div className="command-results">
          {commands
            .filter((c) => c.label.includes(query))
            .map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  close();
                  c.run();
                }}
              >
                <Plus size={16} />
                {c.label}
              </button>
            ))}
          {nodes
            .filter((n) => query && n.text.includes(query))
            .slice(0, 30)
            .map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  close();
                  onLocate(n);
                }}
              >
                <LocateFixed size={16} />
                {n.text.slice(0, 60)}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
