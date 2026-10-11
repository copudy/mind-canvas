import {
  X,
  Plus,
  ArrowUpRight,
  Copy,
  Trash2,
  Pin,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import type { Board, Item, Relation, Side } from "../model";
const colors = [
  "#ffffff",
  "#e0eee7",
  "#e5edfc",
  "#f4e4ec",
  "#fff1bf",
  "#efe7fa",
];
export default function Inspector({
  items,
  relation,
  board,
  patch,
  patchRelation,
  onClose,
  onChild,
  onSibling,
  onPromote,
  onDuplicate,
  onDelete,
  onDetach,
  onAlign,
}: {
  items: Item[];
  relation?: Relation;
  board: Board;
  patch: (p: Partial<Item>) => void;
  patchRelation: (p: Partial<Relation>) => void;
  onClose: () => void;
  onChild: () => void;
  onSibling: () => void;
  onPromote: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDetach: () => void;
  onAlign: (mode: "left" | "center" | "right") => void;
}) {
  const item = items[0];
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <strong>
          {relation
            ? "關聯線"
            : items.length > 1
              ? `${items.length} 個物件`
              : item?.kind === "calculator"
                ? "計算機"
                : "想法設定"}
        </strong>
        <button aria-label="關閉設定" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {relation ? (
        <>
          <label>
            線條顏色
            <input
              aria-label="關聯線顏色"
              type="color"
              value={relation.color}
              onChange={(e) => patchRelation({ color: e.target.value })}
            />
          </label>
          <label>
            線條粗細
            <input
              aria-label="關聯線粗細"
              type="range"
              min="1"
              max="8"
              value={relation.width}
              onChange={(e) => patchRelation({ width: +e.target.value })}
            />
          </label>
          <label>
            虛線
            <input
              type="checkbox"
              checked={relation.dashed}
              onChange={(e) => patchRelation({ dashed: e.target.checked })}
            />
          </label>
          {(["sourceSide", "targetSide"] as const).map((key) => (
            <label key={key}>
              {key === "sourceSide" ? "起點端點" : "終點端點"}
              <select
                aria-label={key === "sourceSide" ? "起點端點" : "終點端點"}
                value={relation[key] || ""}
                onChange={(e) =>
                  patchRelation({ [key]: e.target.value || undefined })
                }
              >
                <option value="">自動</option>
                {(["left", "right", "top", "bottom"] as Side[]).map((s, i) => (
                  <option key={s} value={s}>
                    {["左", "右", "上", "下"][i]}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="danger wide" onClick={onDelete}>
            <Trash2 size={15} />
            刪除關聯線
          </button>
        </>
      ) : (
        item && (
          <>
            <div className="inspector-section">外觀</div>
            <div className="swatches">
              {colors.map((c) => (
                <button
                  key={c}
                  title={c}
                  aria-label={`背景 ${c}`}
                  style={{ background: c }}
                  className={item.background === c ? "chosen" : ""}
                  onClick={() => patch({ background: c })}
                />
              ))}
            </div>
            <label>
              背景
              <input
                aria-label="背景顏色"
                type="color"
                value={
                  item.background === "transparent"
                    ? "#ffffff"
                    : item.background
                }
                onChange={(e) => patch({ background: e.target.value })}
              />
            </label>
            <label>
              文字
              <input
                aria-label="文字顏色"
                type="color"
                value={item.color}
                onChange={(e) => patch({ color: e.target.value })}
              />
            </label>
            <label>
              邊框
              <input
                aria-label="邊框顏色"
                type="color"
                value={item.border === "transparent" ? "#ffffff" : item.border}
                onChange={(e) => patch({ border: e.target.value })}
              />
            </label>
            <label>
              字級
              <input
                aria-label="字級"
                type="number"
                min="10"
                max="48"
                value={item.fontSize}
                onChange={(e) =>
                  patch({
                    fontSize: Math.max(10, Math.min(48, +e.target.value)),
                  })
                }
              />
            </label>
            <label>
              粗體
              <input
                type="checkbox"
                checked={item.bold}
                onChange={(e) => patch({ bold: e.target.checked })}
              />
            </label>
            <label>
              自動尺寸
              <input
                type="checkbox"
                checked={item.autoSize}
                onChange={(e) => patch({ autoSize: e.target.checked })}
              />
            </label>
            <label>
              最大寬度
              <input
                aria-label="最大寬度"
                type="number"
                min="80"
                max="1000"
                value={item.maxWidth}
                onChange={(e) =>
                  patch({
                    maxWidth: Math.max(80, Math.min(1000, +e.target.value)),
                  })
                }
              />
            </label>
            <label>
              位置狀態
              <select
                aria-label="位置狀態"
                value={item.mode}
                onChange={(e) =>
                  patch({ mode: e.target.value as Item["mode"] })
                }
              >
                <option value="Auto">Auto · 參與排版</option>
                <option value="Pinned">Pinned · 固定位置</option>
                <option value="Free">Free · 自由位置</option>
              </select>
            </label>
            {item.kind === "mind" && (
              <>
                <div className="inspector-section">局部心智圖</div>
                <button className="wide" onClick={onChild}>
                  <Plus size={15} />
                  新增子節點 <kbd>Tab</kbd>
                </button>
                <button className="wide" onClick={onSibling}>
                  <Plus size={15} />
                  新增同層 <kbd>Enter</kbd>
                </button>
                <button
                  className="wide"
                  disabled={!item.parentId}
                  onClick={onPromote}
                >
                  <ArrowUpRight size={15} />
                  提升層級 <kbd>⇧ Tab</kbd>
                </button>
                <button
                  className="wide"
                  disabled={!item.parentId}
                  onClick={onDetach}
                >
                  <Pin size={15} />
                  解除父子關係
                </button>
                <small>
                  按住 Alt
                  拖入目標節點，才會重新掛載。普通拖曳移動整枝並保留階層。
                </small>
              </>
            )}
            {items.length > 1 && (
              <>
                <div className="inspector-section">對齊</div>
                <div className="align-buttons">
                  <button aria-label="靠左對齊" onClick={() => onAlign("left")}>
                    <AlignLeft size={16} />
                  </button>
                  <button
                    aria-label="置中對齊"
                    onClick={() => onAlign("center")}
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    aria-label="靠右對齊"
                    onClick={() => onAlign("right")}
                  >
                    <AlignRight size={16} />
                  </button>
                </div>
              </>
            )}
            <div className="inspector-section">操作</div>
            <button className="wide" onClick={onDuplicate}>
              <Copy size={15} />
              複製物件與分支 <kbd>Ctrl D</kbd>
            </button>
            <button className="danger wide" onClick={onDelete}>
              <Trash2 size={15} />
              刪除選取與分支
            </button>
            <small>本白板共 {board.nodes.length} 個物件</small>
          </>
        )
      )}
    </aside>
  );
}
