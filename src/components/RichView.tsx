import { Fragment, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import type { RichNode } from "../rich";
export default function RichView({
  doc,
  change,
}: {
  doc: RichNode;
  change: (d: RichNode) => void;
}) {
  const move = (id: string, direction: number) => {
    const next = structuredClone(doc);
    const walk = (n: RichNode): boolean => {
      const at = n.content?.findIndex((c) => c.attrs?.id === id) ?? -1;
      if (at >= 0) {
        if (direction === 0) n.content!.splice(at, 1);
        else {
          const to = at + direction;
          if (to >= 0 && to < n.content!.length)
            [n.content![at], n.content![to]] = [n.content![to], n.content![at]];
        }
        return true;
      }
      return n.content?.some(walk) || false;
    };
    walk(next);
    change(next);
  };
  const render = (n: RichNode, i: number): ReactNode => {
    let content: ReactNode =
      n.type === "text" ? n.text : n.content?.map(render);
    for (const m of n.marks || []) {
      content =
        m.type === "bold" ? (
          <strong>{content}</strong>
        ) : m.type === "italic" ? (
          <em>{content}</em>
        ) : m.type === "code" ? (
          <code>{content}</code>
        ) : m.type === "strike" ? (
          <s>{content}</s>
        ) : (
          <u>{content}</u>
        );
    }
    if (n.type === "listItem")
      return (
        <li
          key={String(n.attrs?.id)}
          data-list-id={String(n.attrs?.id)}
          className="rich-list-item"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              e.key === "Delete" ||
              (e.altKey && ["ArrowUp", "ArrowDown"].includes(e.key))
            ) {
              e.preventDefault();
              e.stopPropagation();
              move(
                String(n.attrs?.id),
                e.key === "Delete" ? 0 : e.key === "ArrowUp" ? -1 : 1,
              );
            }
          }}
        >
          {content}
          <span
            className="list-item-actions nodrag"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              aria-label="清單項目上移"
              onClick={() => move(String(n.attrs?.id), -1)}
            >
              ↑
            </button>
            <button
              aria-label="清單項目下移"
              onClick={() => move(String(n.attrs?.id), 1)}
            >
              ↓
            </button>
            <button
              aria-label="刪除清單項目"
              onClick={() => move(String(n.attrs?.id), 0)}
            >
              ×
            </button>
          </span>
        </li>
      );
    if (n.type === "bulletList") return <ul key={i}>{content}</ul>;
    if (n.type === "orderedList")
      return (
        <ol key={i} start={Number(n.attrs?.start) || 1}>
          {content}
        </ol>
      );
    if (n.type === "paragraph") return <p key={i}>{content || <br />}</p>;
    if (n.type === "heading") return <h3 key={i}>{content}</h3>;
    if (n.type === "hardBreak") return <br key={i} />;
    if (n.type === "blockquote")
      return <blockquote key={i}>{content}</blockquote>;
    if (n.type === "codeBlock")
      return (
        <pre key={i}>
          <code>{content}</code>
        </pre>
      );
    if (n.type === "horizontalRule") return <hr key={i} />;
    return <Fragment key={i}>{content}</Fragment>;
  };
  return <div className="rich-view">{render(doc, 0)}</div>;
}
