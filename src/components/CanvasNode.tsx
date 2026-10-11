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
  NodeResizer,
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
  };
  return (
    <div
      className={`canvas-item ${item.kind} ${id === actions.guideEntryId || id === actions.guideBackupId ? "guide-entry-node" : ""} ${selected ? "is-selected" : ""} ${data.mountPreview ? "mount-preview" : ""}`}
      style={style}
    >
      <NodeResizer
        isVisible={selected && !editing && !actions.readOnly}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={3000}
        maxHeight={3000}
        onResizeStart={() => {
          actions.checkpoint();
          actions.beginGesture();
        }}
        onResizeEnd={actions.endGesture}
        onResize={(_, p) =>
          actions.patch(
            id,
            {
              width: Math.max(minWidth, p.width),
              height: Math.max(minHeight, p.height),
              autoSize: false,
            },
            false,
          )
        }
      />
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
        <textarea
          ref={textarea}
          className="node-editor nodrag nowheel"
          aria-label="編輯節點文字"
          value={draft}
          maxLength={10000}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              setDraft(item.text);
              actions.setEdit(null);
            }
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <div
          className="node-text"
          onDoubleClick={() => !actions.readOnly && actions.setEdit(id)}
        >
          {item.text}
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
