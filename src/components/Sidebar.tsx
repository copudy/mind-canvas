import { useState } from "react";
import {
  Plus,
  Search,
  PanelLeftClose,
  MoreHorizontal,
  Layers,
  Download,
  Upload,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Board } from "../model";
export default function Sidebar({
  boards,
  active,
  onOpen,
  onAdd,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
  onBackup,
  onImport,
}: {
  boards: Board[];
  active: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onBackup: () => void;
  onImport: () => void;
}) {
  const [search, setSearch] = useState(""),
    [menu, setMenu] = useState<string | null>(null),
    [rename, setRename] = useState<string | null>(null),
    [name, setName] = useState("");
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">m</span>
        <div>
          mind canvas<small>自由式思維畫布</small>
        </div>
        <button aria-label="收合白板清單" onClick={onClose}>
          <PanelLeftClose size={18} />
        </button>
      </div>
      <button className="new-board" onClick={onAdd}>
        <Plus size={18} /> 新的白板 <span>＋</span>
      </button>
      <label className="board-search">
        <Search size={16} />
        <input
          aria-label="搜尋白板名稱"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="尋找你的想法…"
        />
      </label>
      <div className="list-label">
        我的白板 <span>{boards.length}</span>
      </div>
      <div className="board-list">
        {boards
          .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
          .map((b) => (
            <div
              className={`board-row ${b.boardId === active ? "active" : ""}`}
              key={b.boardId}
            >
              {rename === b.boardId ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRename(b.boardId, name);
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
                      onOpen(b.boardId);
                      setMenu(null);
                    }}
                  >
                    <Layers size={16} />
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
                    onClick={() =>
                      setMenu(menu === b.boardId ? null : b.boardId)
                    }
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </>
              )}
              {menu === b.boardId && (
                <div className="board-menu">
                  <button
                    onClick={() => {
                      setName(b.name);
                      setRename(b.boardId);
                      setMenu(null);
                    }}
                  >
                    <Pencil size={14} />
                    重新命名
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(b.boardId);
                      setMenu(null);
                    }}
                  >
                    <Copy size={14} />
                    複製白板
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      onDelete(b.boardId);
                      setMenu(null);
                    }}
                  >
                    <Trash2 size={14} />
                    刪除白板
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
      <div className="sidebar-footer">
        <div className="local-note">
          <span className="status-dot" />
          <span>
            你的想法，留在你的裝置<small>離線優先 · 無需帳號</small>
          </span>
        </div>
        <div className="backup-buttons">
          <button onClick={onBackup}>
            <Download size={15} />
            全部備份
          </button>
          <button onClick={onImport}>
            <Upload size={15} />
            匯入
          </button>
        </div>
      </div>
    </aside>
  );
}
