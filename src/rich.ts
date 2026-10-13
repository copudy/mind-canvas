import type { Item, Board } from "./model";
export interface RichNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
}
export function plainDoc(text: string): RichNode {
  return {
    type: "doc",
    content: text.split("\n").map((s) => ({
      type: "paragraph",
      content: s ? [{ type: "text", text: s }] : [],
    })),
  };
}
export function listDoc(values: string[]): RichNode {
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: values.map((text) => ({
          type: "listItem",
          attrs: { id: crypto.randomUUID() },
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        })),
      },
    ],
  };
}
export function listIds(doc?: RichNode): string[] {
  const ids: string[] = [];
  const walk = (n: RichNode) => {
    if (n.type === "listItem" && typeof n.attrs?.id === "string")
      ids.push(n.attrs.id);
    n.content?.forEach(walk);
  };
  if (doc) walk(doc);
  return ids;
}
export function plainText(doc: RichNode): string {
  const text = (n: RichNode): string =>
    n.type === "text"
      ? n.text || ""
      : n.type === "hardBreak"
        ? "\n"
        : (n.content || [])
            .map(text)
            .join(
              ["doc", "bulletList", "orderedList", "listItem"].includes(n.type)
                ? "\n"
                : "",
            );
  return text(doc);
}
export function validRich(doc: unknown): doc is RichNode {
  let count = 0,
    length = 0;
  const ids = new Set<string>();
  const check = (v: unknown, depth: number): boolean => {
    if (!v || typeof v !== "object" || depth > 20 || ++count > 5000)
      return false;
    const n = v as RichNode;
    if (
      ![
        "doc",
        "paragraph",
        "text",
        "hardBreak",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "codeBlock",
        "horizontalRule",
      ].includes(n.type)
    )
      return false;
    if (n.text !== undefined) {
      if (typeof n.text !== "string") return false;
      length += n.text.length;
      if (length > 10000) return false;
    }
    if (n.attrs) {
      if (typeof n.attrs !== "object" || Array.isArray(n.attrs)) return false;
      for (const [k, a] of Object.entries(n.attrs)) {
        if (
          !["id", "level", "start", "language"].includes(k) ||
          !(
            a === null ||
            (typeof a === "string" && a.length < 200) ||
            (typeof a === "number" &&
              Number.isFinite(a) &&
              a >= 0 &&
              a <= 100000)
          )
        )
          return false;
      }
    }
    if (n.type === "listItem") {
      const id = n.attrs?.id;
      if (typeof id !== "string" || !id || ids.has(id)) return false;
      ids.add(id);
    }
    if (n.marks && !Array.isArray(n.marks)) return false;
    if (
      n.marks?.some(
        (m) =>
          !["bold", "italic", "code", "strike", "underline"].includes(m.type) ||
          (m.attrs && Object.keys(m.attrs).length),
      )
    )
      return false;
    return (
      !n.content ||
      (Array.isArray(n.content) && n.content.every((c) => check(c, depth + 1)))
    );
  };
  return check(doc, 0) && (doc as RichNode).type === "doc";
}
export function applyRich(b: Board, nodeId: string, doc: RichNode) {
  const n = b.nodes.find((n) => n.id === nodeId);
  if (!n) return;
  n.rich = doc;
  n.text = plainText(doc);
  const ids = new Set(listIds(doc));
  b.relations = b.relations.filter(
    (r) =>
      !(r.source === nodeId && r.sourceItem && !ids.has(r.sourceItem)) &&
      !(r.target === nodeId && r.targetItem && !ids.has(r.targetItem)),
  );
}
export function appearance(n: Item): Partial<Item> {
  const heading = n.textRole === "heading",
    callout = !!n.callout;
  return {
    color: "#23344c",
    fontSize: heading ? 28 : 16,
    bold: heading,
    italic: false,
    textAlign: "left",
    background: heading
      ? "transparent"
      : callout
        ? "#eaf2ff"
        : n.kind === "sticky"
          ? "#fff1bf"
          : "#ffffff",
    border: heading ? "transparent" : callout ? "#3b82f6" : "#c5d5ef",
    ...(n.widget?.type === "table"
      ? { widget: { ...n.widget, styles: {} } }
      : {}),
    ...(callout
      ? { callout: { title: "提醒", icon: "💡", accent: "#3b82f6" } }
      : {}),
  };
}
