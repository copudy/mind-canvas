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
    if (n.content !== undefined && !Array.isArray(n.content)) return false;
    if (n.marks !== undefined && !Array.isArray(n.marks)) return false;
    const children = n.content || [];
    if (!Array.isArray(children)) return false;
    if (children.some((c) => !c || typeof c !== "object")) return false;
    const blocks = [
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "blockquote",
      "codeBlock",
      "horizontalRule",
    ];
    if (
      (n.type === "doc" || n.type === "blockquote") &&
      (!children.length || children.some((c) => !blocks.includes(c.type)))
    )
      return false;
    if (
      ["bulletList", "orderedList"].includes(n.type) &&
      (!children.length || children.some((c) => c.type !== "listItem"))
    )
      return false;
    if (
      n.type === "listItem" &&
      (children[0]?.type !== "paragraph" ||
        children.some((c) => !blocks.includes(c.type)))
    )
      return false;
    if (
      ["paragraph", "heading"].includes(n.type) &&
      children.some((c) => !["text", "hardBreak"].includes(c.type))
    )
      return false;
    if (n.type === "codeBlock" && children.some((c) => c.type !== "text"))
      return false;
    if (
      ["text", "hardBreak", "horizontalRule"].includes(n.type) &&
      children.length
    )
      return false;
    if (n.type === "text" && (typeof n.text !== "string" || !n.text))
      return false;
    if (n.text !== undefined) {
      if (typeof n.text !== "string") return false;
      length += n.text.length;
      if (length > 10000) return false;
    }
    if (n.attrs) {
      if (typeof n.attrs !== "object" || Array.isArray(n.attrs)) return false;
      for (const [k, a] of Object.entries(n.attrs)) {
        if (k === "type" && n.type === "orderedList") {
          if (
            a !== null &&
            (typeof a !== "string" || !["1", "a", "A", "i", "I"].includes(a))
          )
            return false;
          continue;
        }
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
      if (
        typeof id !== "string" ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(id) ||
        ids.has(id)
      )
        return false;
      ids.add(id);
    }
    if (n.marks && !Array.isArray(n.marks)) return false;
    if (
      n.marks?.some(
        (m) =>
          !m ||
          typeof m !== "object" ||
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
  const rich = n.rich ? structuredClone(n.rich) : undefined;
  const clean = (r: RichNode) => {
    if (r.marks) r.marks = r.marks.filter((m) => m.type === "code");
    r.content?.forEach(clean);
  };
  if (rich) clean(rich);
  const heading = n.textRole === "heading",
    callout = !!n.callout;
  return {
    ...(rich ? { rich } : {}),
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
      ? { widget: { ...structuredClone(n.widget), styles: {} } }
      : {}),
    ...(callout
      ? { callout: { ...n.callout!, icon: "💡", accent: "#3b82f6" } }
      : {}),
  };
}
