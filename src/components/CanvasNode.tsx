import ResizeHandles from "./ResizeHandles";
import { lazy, Suspense } from "react";
const RichEditor = lazy(() => import("./RichEditor"));
import RichView from "./RichView";
import { listIds } from "../rich";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import CanvasWidget from "./CanvasWidget";
import {
  Handle,
  useUpdateNodeInternals,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Copy,
  CornerDownLeft,
  PinOff,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { calculate } from "../calculator";
import type { Item, Point } from "../model";
export interface CanvasActions {
  readOnly: boolean;
  practice: () => void;
  editId: string | null;
  setEdit: (id: string | null) => void;
  patch: (id: string, patch: Partial<Item>, record?: boolean) => void;
  checkpoint: () => void;
  insertResult: (text: string, position?: Point) => void;
  toggle: (id: string) => void;
  unpin: (id: string) => void;
  notify: (message: string) => void;
  beginGesture: () => void;
  endGesture: () => void;
  guideEntryId?: string;
  guideBackupId?: string;
  lastBoard?: string;
  resume: () => void;
  createBoard: () => void;
  dataSettings: () => void;
  listMetrics: Record<string, Record<string, number>>;
  setListMetrics: (id: string, ys: Record<string, number>) => void;
}
export const CanvasContext = createContext<CanvasActions>(null!);
export type FlowNode = Node<{ item: Item; mountPreview?: string }, "canvas">;
export function Calculator({
  item,
  onChange,
  onInsert,
  onUnpin,
}: {
  item: Item;
  onChange: (p: Partial<Item>, record?: boolean) => void;
  onInsert: () => void;
  onUnpin?: () => void;
}) {
  const actions = useContext(CanvasContext);
  const input = useRef<HTMLInputElement>(null);
  const evalNow = () => {
    try {
      onChange({ result: calculate(item.expression), calcError: "" });
    } catch (e) {
      onChange({
        result: "",
        calcError: e instanceof Error ? e.message : String(e),
      });
    }
  };
  const add = (key: string) => {
    if (key === "=") {
      evalNow();
      return;
    }
    if (key === "C") {
      onChange({ expression: "", result: "", calcError: "" });
      return;
    }
    if (key === "⌫") {
      onChange({
        expression: item.expression.slice(0, -1),
        result: "",
        calcError: "",
      });
      return;
    }
    onChange({
      expression: (item.expression + key).slice(0, 500),
      result: "",
      calcError: "",
    });
    input.current?.focus();
  };
  return (
    <div
      className="calculator nodrag nowheel"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="calc-caption">
        <span>計算工作台</span>
        {onUnpin && (
          <button
            aria-label="取消釘選"
            title="取消釘選，移至浮動視窗"
            onClick={onUnpin}
          >
            <PinOff size={15} />
          </button>
        )}
      </div>
      <input
        ref={input}
        aria-label="計算機算式"
        placeholder="輸入算式，例如 (1800+650)*2"
        value={item.expression}
        maxLength={500}
        onFocus={() => actions?.checkpoint()}
        onChange={(e) =>
          onChange(
            { expression: e.target.value, result: "", calcError: "" },
            false,
          )
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            evalNow();
          }
        }}
      />
      <output className={item.calcError ? "calc-error" : ""} aria-live="polite">
        {item.calcError || item.result || "0"}
      </output>
      <div className="calc-keys">
        {[
          "C",
          "(",
          ")",
          "⌫",
          "7",
          "8",
          "9",
          "/",
          "4",
          "5",
          "6",
          "*",
          "1",
          "2",
          "3",
          "-",
          "0",
          ".",
          "%",
          "+",
        ].map((k) => (
          <button key={k} onClick={() => add(k)}>
            {k === "*" ? "×" : k === "/" ? "÷" : k}
          </button>
        ))}
      </div>
      <div className="calc-bottom">
        <button
          title="複製結果"
          aria-label="複製計算結果"
          disabled={!item.result || !!item.calcError}
          onClick={() =>
            navigator.clipboard
              .writeText(item.result)
              .then(() => actions?.notify("結果已複製"))
              .catch(() =>
                actions?.notify("無法存取剪貼簿，請選取結果手動複製"),
              )
          }
        >
          <Copy size={16} />
        </button>
        <button
          title="結果建立為節點"
          aria-label="結果建立為節點"
          disabled={!item.result || !!item.calcError}
          onClick={onInsert}
        >
          <CornerDownLeft size={16} />
        </button>
        <button className="equals" onClick={evalNow}>
          =
        </button>
      </div>
      <small>百分比：10% = 0.1 · 結果保留 20 位有效數字</small>
    </div>
  );
}
export default function CanvasNode({
  id,
  data,
  selected,
}: NodeProps<FlowNode>) {
  const root = useRef<HTMLDivElement>(null);
  const item = data.item,
    actions = useContext(CanvasContext),
    editing = actions.editId === id;
  const updateInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateInternals(id);
  }, [id, item.width, item.height, updateInternals]);
  const [draft, setDraft] = useState(item.text);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setDraft(item.text);
  }, [item.text]);
  useEffect(() => {
    if (editing) {
      textarea.current?.focus();
      textarea.current?.select();
    }
  }, [editing]);
  useEffect(() => {
    const measure = () => {
      const el = root.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const scale = box.width / item.width;
      if (!scale) return;
      const ys: Record<string, number> = {};
      el.querySelectorAll<HTMLElement>("li[data-list-id],li[data-id]").forEach(
        (li) => {
          const r = li.getBoundingClientRect();
          const key = li.dataset.listId || li.dataset.id;
          if (key) ys[key] = (r.top - box.top + r.height / 2) / scale;
        },
      );
      actions.setListMetrics(id, ys);
      const content = el.querySelector<HTMLElement>(".rich-view,.rich-editor");
      if (item.autoSize && content) {
        const needed =
          content.scrollHeight + (editing ? 78 : 36) + (item.callout ? 48 : 0);
        if (needed > item.height + 2)
          actions.patch(id, { height: Math.min(3000, needed) }, false);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [item.rich, item.width, item.height, editing]);
  const commit = () => {
    if (draft !== item.text) actions.patch(id, { text: draft });
    actions.setEdit(null);
  };
  const minWidth =
    item.kind === "calculator"
      ? 260
      : item.widget?.type === "calendar"
        ? 260
        : item.widget?.type === "table"
          ? 240
          : item.widget
            ? 140
            : 80;
  const minHeight =
    item.kind === "calculator"
      ? 335
      : item.widget?.type === "calendar"
        ? 370
        : item.widget?.type === "table"
          ? 170
          : item.widget
            ? 160
            : 40;
  const style: CSSProperties = {
    background: item.background,
    borderColor: item.border,
    color:
      item.background === "transparent" && item.color === "#293b35"
        ? "var(--ink)"
        : item.color,
    fontSize: item.fontSize,
    fontWeight: item.bold ? 600 : 400,
    fontStyle: item.italic ? "italic" : "normal",
    textAlign: item.textAlign || "left",
  };
  return (
    <div
      ref={root}
      className={`canvas-item ${item.kind} ${id === actions.guideEntryId || id === actions.guideBackupId ? "guide-entry-node" : ""} ${selected ? "is-selected" : ""} ${data.mountPreview ? "mount-preview" : ""}`}
      style={style}
    >
      <div className="node-drag-grip" title="拖曳移動" aria-label="拖曳移動">
        ⠿
      </div>
      {item.callout && (
        <div
          className="callout-heading nodrag"
          onPointerDown={(e) => e.stopPropagation()}
          style={{ borderColor: item.callout.accent }}
        >
          <select
            aria-label="Callout 外觀預設"
            value={item.callout.icon === "💬" ? "quote" : "note"}
            onChange={(e) =>
              actions.patch(id, {
                background: e.target.value === "quote" ? "#f7f9fc" : "#eaf2ff",
                border: e.target.value === "quote" ? "#8b9dc3" : "#3b82f6",
                callout: {
                  ...item.callout!,
                  icon: e.target.value === "quote" ? "💬" : "💡",
                  accent: e.target.value === "quote" ? "#8b9dc3" : "#3b82f6",
                  title: e.target.value === "quote" ? "引言" : "提醒",
                },
              })
            }
          >
            <option value="note">提示</option>
            <option value="quote">引言</option>
          </select>
          <select
            aria-label="Callout 圖示"
            value={item.callout.icon}
            onChange={(e) =>
              actions.patch(id, {
                callout: { ...item.callout!, icon: e.target.value },
              })
            }
          >
            {["💡", "📌", "⚠️", "💬", "✅"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            aria-label="Callout 標題"
            maxLength={200}
            value={item.callout.title}
            onChange={(e) =>
              actions.patch(
                id,
                { callout: { ...item.callout!, title: e.target.value } },
                false,
              )
            }
            onFocus={actions.checkpoint}
          />
          <input
            type="color"
            aria-label="Callout 強調色"
            value={item.callout.accent}
            onChange={(e) =>
              actions.patch(id, {
                callout: { ...item.callout!, accent: e.target.value },
              })
            }
          />
        </div>
      )}
      {listIds(item.rich).map((li, i) => (
        <span key={li}>
          <Handle
            type="source"
            id={`item:${li}:right`}
            position={Position.Right}
            className="list-port"
            aria-label="清單項目連線"
            style={{
              top:
                actions.listMetrics[id]?.[li] || 36 + i * item.fontSize * 1.7,
            }}
          />
          <Handle
            type="target"
            id={`item:${li}:left`}
            position={Position.Left}
            className="list-port"
            style={{
              top:
                actions.listMetrics[id]?.[li] || 36 + i * item.fontSize * 1.7,
            }}
          />
        </span>
      ))}
      {selected && !editing && !actions.readOnly && (
        <ResizeHandles item={item} minWidth={minWidth} minHeight={minHeight} />
      )}

      {(
        [
          ["left", Position.Left],
          ["right", Position.Right],
          ["top", Position.Top],
          ["bottom", Position.Bottom],
        ] as const
      ).map(([side, pos]) => (
        <Handle
          key={side}
          type="source"
          id={side}
          position={pos}
          className="node-port"
          isConnectable={!actions.readOnly}
        />
      ))}
      {item.widget && !editing ? (
        <CanvasWidget
          item={item}
          patch={(p, r) => actions.patch(id, p, r)}
          checkpoint={actions.checkpoint}
          edit={() => actions.setEdit(id)}
        />
      ) : item.kind === "calculator" ? (
        <>
          <div className="calc-drag">
            ⠿ <span>預算計算機</span>
          </div>
          <fieldset
            disabled={actions.readOnly}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <Calculator
              item={item}
              onChange={(p, r) => actions.patch(id, p, r)}
              onInsert={() =>
                actions.insertResult(item.result, {
                  x: item.position.x + item.width + 65,
                  y: item.position.y,
                })
              }
              onUnpin={() => actions.unpin(id)}
            />
          </fieldset>
        </>
      ) : editing ? (
        <Suspense fallback={<div role="status">載入編輯器…</div>}>
          <RichEditor
            item={item}
            change={(rich) => actions.patch(id, { rich }, false)}
            finish={() => actions.setEdit(null)}
            checkpoint={actions.checkpoint}
          />
        </Suspense>
      ) : (
        <div
          className="node-text"
          onDoubleClick={() => !actions.readOnly && actions.setEdit(id)}
        >
          {item.rich ? (
            <RichView
              doc={item.rich}
              change={(rich) => actions.patch(id, { rich })}
            />
          ) : (
            item.text
          )}
        </div>
      )}
      {item.kind === "mind" && (
        <button
          className="collapse nodrag"
          title={item.collapsed ? "展開分支" : "收合分支"}
          aria-label={item.collapsed ? "展開分支" : "收合分支"}
          onClick={() => actions.toggle(id)}
          disabled={actions.readOnly}
        >
          {item.collapsed ? (
            <ChevronRight size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>
      )}
      {id === actions.guideEntryId && (
        <div
          className="guide-actions nodrag nowheel"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {actions.lastBoard && (
            <button onClick={actions.resume}>
              <span>繼續上次的白板</span>
              <strong>{actions.lastBoard}</strong>
            </button>
          )}
          <button onClick={actions.createBoard}>建立新白板</button>
        </div>
      )}
      {id === actions.guideBackupId && (
        <button
          className="guide-data-link nodrag"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={actions.dataSettings}
        >
          前往資料與備份
        </button>
      )}
      {item.mode === "Pinned" && (
        <span className="pin-badge" title="固定位置">
          ◆
        </span>
      )}
      {data.mountPreview && (
        <div className="mount-label">{data.mountPreview}</div>
      )}
    </div>
  );
}
