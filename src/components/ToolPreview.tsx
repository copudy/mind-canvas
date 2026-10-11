import { createPortal } from "react-dom";
import type { Board } from "../model";
export function TemplateThumbnail({ document }: { document: Board }) {
  const ns = document.nodes;
  if (!ns.length) return null;
  const left = Math.min(...ns.map((n) => n.position.x)),
    top = Math.min(...ns.map((n) => n.position.y)),
    right = Math.max(...ns.map((n) => n.position.x + n.width)),
    bottom = Math.max(...ns.map((n) => n.position.y + n.height));
  const scale = Math.min(
    260 / Math.max(1, right - left),
    140 / Math.max(1, bottom - top),
  );
  const xy = (id: string) => {
    const n = ns.find((n) => n.id === id)!;
    return {
      x: (n.position.x - left) * scale + 12,
      y: (n.position.y - top) * scale + 10,
      w: n.width * scale,
      h: n.height * scale,
    };
  };
  const edges = [
    ...document.relations,
    ...ns
      .filter((n) => n.parentId)
      .map((n) => ({ source: n.parentId!, target: n.id })),
  ];
  return (
    <svg
      className="template-thumbnail"
      viewBox="0 0 284 164"
      role="img"
      aria-label="範本結構預覽"
    >
      {edges.map((e, i) => {
        const a = xy(e.source),
          b = xy(e.target),
          x = a.x + a.w,
          y = a.y + a.h / 2,
          tx = b.x,
          ty = b.y + b.h / 2;
        return (
          <polyline
            key={i}
            points={`${x},${y} ${(x + tx) / 2},${y} ${(x + tx) / 2},${ty} ${tx},${ty}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        );
      })}
      {ns.map((n) => {
        const p = xy(n.id);
        return (
          <g key={n.id}>
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx="3"
              fill={n.background === "transparent" ? "#eaf2ff" : n.background}
              stroke="var(--line)"
            />
            <text
              x={p.x + 4}
              y={p.y + Math.min(p.h / 2 + 3, 12)}
              fontSize={Math.max(6, Math.min(10, p.w / 8))}
              fill="#23344c"
            >
              {n.text.split("\n")[0].slice(0, 12)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export interface PreviewInfo {
  label: string;
  description: string;
  document?: Board;
  rect: DOMRect;
}
export default function ToolPreview({ info }: { info: PreviewInfo | null }) {
  if (!info) return null;
  const width = Math.min(310, window.innerWidth - 24),
    height = info.document ? 330 : 230;
  const left = Math.max(
    12,
    Math.min(
      window.innerWidth - width - 12,
      info.rect.left + info.rect.width / 2 - width / 2,
    ),
  );
  const top = Math.max(
    80,
    Math.min(window.innerHeight - height - 12, info.rect.top - height - 14),
  );
  return createPortal(
    <aside
      id="tool-preview"
      className="tool-preview"
      role="tooltip"
      style={{ left, top, width }}
    >
      <strong>{info.label}</strong>
      {info.document ? (
        <TemplateThumbnail document={info.document} />
      ) : (
        <div className="tool-preview-example" aria-hidden="true">
          {info.label.includes("節點") ? (
            <span>一個想法</span>
          ) : info.label.includes("心智圖") ? (
            <>
              <span>主題</span> → <span>分支</span>
            </>
          ) : info.label.includes("流程") ? (
            <>
              <span>開始</span> → <span>下一步</span>
            </>
          ) : info.label === "表格" ? (
            "項目 │ 內容 │ 備註"
          ) : info.label === "小日曆" ? (
            "日 一 二 三 四 五 六"
          ) : info.label === "圖示" ? (
            "💡 ⭐ 🎯 ✅"
          ) : info.label === "我的範本" ? (
            "你的內容 · 可重複使用"
          ) : (
            "先預覽，再開始"
          )}
        </div>
      )}
      <p>{info.description}</p>
      <small>點擊後開啟或加入白板；預覽不會新增物件。</small>
    </aside>,
    document.body,
  );
}
