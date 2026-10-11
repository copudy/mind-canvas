import { TemplateThumbnail } from "./ToolPreview";
import { useState } from "react";
import { X } from "lucide-react";
import type { CanvasTemplate } from "../templates";
export default function TemplateDialog(p: {
  mode: "save" | "library";
  templates: CanvasTemplate[];
  selected: number;
  close: () => void;
  save: (name: string) => Promise<void>;
  insert: (t: CanvasTemplate) => void;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [deleting, setDeleting] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onClick={p.close}>
      <section
        className="modal templates-dialog"
        role="dialog"
        aria-label={p.mode === "save" ? "儲存為我的範本" : "我的範本"}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" aria-label="關閉範本" onClick={p.close}>
          <X size={22} />
        </button>
        <h2>{p.mode === "save" ? "儲存為我的範本" : "我的範本"}</h2>
        <p>
          保留選取物件的內容、樣式、相對位置與內部連線。插入時建立獨立的新物件。
        </p>
        {error && <p role="alert">{error}</p>}
        {p.mode === "save" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await p.save(name);
                p.close();
              });
            }}
          >
            <label>
              範本名稱
              <input
                aria-label="範本名稱"
                value={name}
                maxLength={80}
                required
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>
            <p>已選取 {p.selected} 個物件</p>
            <button disabled={busy || !name.trim()}>保存範本</button>
          </form>
        ) : (
          <>
            {!p.templates.length && (
              <p>
                尚無自訂範本。框選物件後，使用情境工具列「儲存為我的範本」；也可按
                / 搜尋此命令。完整備份會包含這些範本。
              </p>
            )}
            {p.templates.map((t) => (
              <article className="template-row" key={t.id}>
                <strong>{t.name}</strong>
                <p>{t.description}</p>
                <TemplateThumbnail document={t.document} />
                {editing === t.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        await p.rename(t.id, name);
                        setEditing(null);
                      });
                    }}
                  >
                    <input
                      aria-label="範本新名稱"
                      value={name}
                      required
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <button disabled={busy || !name.trim()}>儲存名稱</button>
                  </form>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        p.insert(t);
                        p.close();
                      }}
                    >
                      插入 {t.name}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(t.id);
                        setName(t.name);
                      }}
                    >
                      重新命名 {t.name}
                    </button>
                    <button onClick={() => setDeleting(t.id)}>
                      刪除 {t.name}
                    </button>
                  </div>
                )}
                {deleting === t.id && (
                  <div>
                    <span>確定刪除這個範本？已插入的白板物件不受影響。</span>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await p.remove(t.id);
                          setDeleting(null);
                        })
                      }
                    >
                      確定刪除範本
                    </button>
                    <button onClick={() => setDeleting(null)}>取消</button>
                  </div>
                )}
              </article>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
