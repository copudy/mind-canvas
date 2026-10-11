import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Layers,
  Copy,
  Pencil,
  Trash2,
  Pin,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { Board } from "../model";
import type { WorkspacePrefs } from "../workspacePrefs";
type Props = {
  boards: Board[];
  active: string;
  prefs: WorkspacePrefs;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onPin: (id: string) => void;
  onAddSection: (name: string) => void;
  onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onCollapseSection: (id: string) => void;
  onMove: (id: string, section: string) => void;
};
export default function Sidebar(p: Props) {
  const [search, setSearch] = useState(""),
    [menu, setMenu] = useState<string | null>(null);
  const [rename, setRename] = useState<string | null>(null),
    [name, setName] = useState("");
  const [sectionEdit, setSectionEdit] = useState<string | null>(null),
    [sectionName, setSectionName] = useState("");
  const [deleteSection, setDeleteSection] = useState<string | null>(null);
  const guide = p.boards.find((b) => b.guide);
  const matches = p.boards
    .filter(
      (b) => !b.guide && b.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const row = (b: Board) => (
    <div
      className={`board-row ${b.boardId === p.active ? "active" : ""}`}
      key={b.boardId}
    >
      {rename === b.boardId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            p.onRename(b.boardId, name);
            setRename(null);
          }}
        >
          <input
            aria-label="白板新名稱"
            autoFocus
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setRename(null);
            }}
          />
          <button type="submit">儲存</button>
        </form>
      ) : (
        <>
          <button
            className="board-open"
            onClick={() => {
              p.onOpen(b.boardId);
              setMenu(null);
            }}
          >
            <Layers size={20} />
            <div>
              <strong>{b.name}</strong>
              <small>
                {new Date(b.updatedAt).toLocaleDateString("zh-TW", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {b.nodes.length} 個想法
              </small>
            </div>
          </button>
          <button
            className="board-more"
            aria-label={`管理 ${b.name}`}
            aria-expanded={menu === b.boardId}
            onClick={() => setMenu(menu === b.boardId ? null : b.boardId)}
          >
            <MoreHorizontal size={20} />
          </button>
        </>
      )}
      {menu === b.boardId && (
        <div className="board-menu">
          <button
            onClick={() => {
              p.onPin(b.boardId);
              setMenu(null);
            }}
          >
            <Pin size={20} />
            {p.prefs.pinned.includes(b.boardId) ? "取消釘選白板" : "釘選白板"}
          </button>
          <label className="move-board">
            移至區段
            <select
              aria-label={`移動 ${b.name} 至區段`}
              value={p.prefs.membership[b.boardId] || ""}
              onChange={(e) => {
                p.onMove(b.boardId, e.target.value);
                setMenu(null);
              }}
            >
              <option value="">未分類</option>
              {p.prefs.sections.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setName(b.name);
              setRename(b.boardId);
              setMenu(null);
            }}
          >
            <Pencil size={20} />
            重新命名
          </button>
          <button
            onClick={() => {
              p.onDuplicate(b.boardId);
              setMenu(null);
            }}
          >
            <Copy size={20} />
            複製白板
          </button>
          <button
            className="danger"
            onClick={() => {
              p.onDelete(b.boardId);
              setMenu(null);
            }}
          >
            <Trash2 size={20} />
            刪除白板
          </button>
        </div>
      )}
    </div>
  );
  const group = (label: string, items: Board[]) => (
    <section className="history-group" aria-label={label}>
      <div className="list-label">
        {label}
        <span>{items.length}</span>
      </div>
      {items.map((b) =>
        label === "釘選" ? (
          <button
            key={b.boardId}
            className={`pinned-shortcut ${b.boardId === p.active ? "active" : ""}`}
            aria-label={`開啟釘選白板 ${b.name}`}
            onClick={() => p.onOpen(b.boardId)}
          >
            <Pin size={20} />
            <strong>{b.name}</strong>
          </button>
        ) : (
          row(b)
        ),
      )}
      {!items.length && (
        <p className="empty-group">{search ? "沒有符合的白板" : "尚無白板"}</p>
      )}
    </section>
  );
  return (
    <aside className="sidebar">
      <button className="new-board" onClick={p.onAdd}>
        <Plus size={22} />
        新的白板<span>＋</span>
      </button>
      {guide && (
        <button
          className={`guide-entry ${p.active === guide.boardId ? "active" : ""}`}
          disabled={p.active === guide.boardId}
          onClick={() => p.onOpen(guide.boardId)}
        >
          <BookOpen size={22} />
          歡迎使用 Mind Canvas
        </button>
      )}
      <label className="board-search">
        <Search size={20} />
        <input
          aria-label="搜尋白板名稱"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋白板名稱…"
        />
      </label>
      <div className="board-list">
        {group(
          "釘選",
          p.prefs.pinned.flatMap((bid) =>
            matches.filter((b) => b.boardId === bid),
          ),
        )}
        {group(
          "最近編輯",
          matches.filter((b) => !p.prefs.membership[b.boardId]),
        )}
        {p.prefs.sections.map((s) => (
          <section
            className="history-group"
            aria-label={`區段 ${s.name}`}
            key={s.id}
          >
            <div className="section-heading">
              <button
                aria-label={`${s.collapsed ? "展開" : "收合"}區段 ${s.name}`}
                aria-expanded={!s.collapsed}
                onClick={() => p.onCollapseSection(s.id)}
              >
                {s.collapsed ? (
                  <ChevronRight size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
                <strong>{s.name}</strong>
              </button>
              <button
                aria-label={`管理區段 ${s.name}`}
                onClick={() => setMenu(menu === s.id ? null : s.id)}
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
            {menu === s.id && (
              <div className="section-menu">
                <button
                  onClick={() => {
                    setSectionEdit(s.id);
                    setSectionName(s.name);
                    setMenu(null);
                  }}
                >
                  重新命名區段
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setDeleteSection(s.id);
                    setMenu(null);
                  }}
                >
                  刪除區段
                </button>
              </div>
            )}
            {deleteSection === s.id && (
              <div className="section-confirm" role="alert">
                白板將移回未分類，不會被刪除。
                <div>
                  <button
                    onClick={() => {
                      p.onDeleteSection(s.id);
                      setDeleteSection(null);
                    }}
                  >
                    確認刪除區段
                  </button>
                  <button onClick={() => setDeleteSection(null)}>取消</button>
                </div>
              </div>
            )}
            {(!s.collapsed || search) &&
              matches
                .filter((b) => p.prefs.membership[b.boardId] === s.id)
                .map(row)}
          </section>
        ))}
        {sectionEdit !== null ? (
          <form
            className="section-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!sectionName.trim()) return;
              if (sectionEdit === "new") p.onAddSection(sectionName);
              else p.onRenameSection(sectionEdit, sectionName);
              setSectionEdit(null);
            }}
          >
            <input
              aria-label="區段名稱"
              value={sectionName}
              autoFocus
              maxLength={80}
              onChange={(e) => setSectionName(e.target.value)}
            />
            <div>
              <button type="submit">儲存區段</button>
              <button type="button" onClick={() => setSectionEdit(null)}>
                取消
              </button>
            </div>
          </form>
        ) : (
          <button
            className="add-section"
            onClick={() => {
              setSectionEdit("new");
              setSectionName("");
            }}
          >
            <Plus size={20} />
            新增區段
          </button>
        )}
      </div>
      <div className="sidebar-footer">
        <p className="storage-note">
          資料儲存在目前瀏覽器，不會跨裝置同步。清除網站資料、無痕模式或共用設定檔可能影響資料，請定期備份。
        </p>
      </div>
    </aside>
  );
}
