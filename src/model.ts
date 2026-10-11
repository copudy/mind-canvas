export type Kind =
  "mind" | "text" | "sticky" | "rectangle" | "ellipse" | "calculator";
export type PositionMode = "Auto" | "Pinned" | "Free";
export type LayoutMode = "right" | "split" | "radial";
export type Side = "left" | "right" | "top" | "bottom";
export interface Point {
  x: number;
  y: number;
}
export interface Item {
  id: string;
  kind: Kind;
  text: string;
  position: Point;
  width: number;
  height: number;
  autoSize: boolean;
  maxWidth: number;
  parentId: string | null;
  order: number;
  collapsed: boolean;
  mode: PositionMode;
  layout: LayoutMode;
  background: string;
  border: string;
  color: string;
  fontSize: number;
  bold: boolean;
  expression: string;
  result: string;
  calcError: string;
}
export interface Relation {
  id: string;
  source: string;
  target: string;
  color: string;
  width: number;
  dashed: boolean;
  sourceSide?: Side;
  targetSide?: Side;
  waypoints?: Point[];
}
export interface Board {
  schemaVersion: 1;
  boardId: string;
  name: string;
  updatedAt: number;
  nodes: Item[];
  relations: Relation[];
  treeStyle: { color: string; width: number; dashed: boolean };
  viewport: { x: number; y: number; zoom: number };
}
export const id = () => crypto.randomUUID();
export const clone = <T>(v: T): T => structuredClone(v);
export function makeItem(kind: Kind, position: Point, text = ""): Item {
  return {
    id: id(),
    kind,
    text:
      text ||
      {
        mind: "新的想法",
        text: "自由文字",
        sticky: "記下一個靈感",
        rectangle: "圖形",
        ellipse: "想法",
        calculator: "計算機",
      }[kind],
    position,
    width: kind === "calculator" ? 280 : kind === "sticky" ? 200 : 180,
    height: kind === "calculator" ? 340 : kind === "sticky" ? 130 : 56,
    autoSize: kind !== "calculator",
    maxWidth: 320,
    parentId: null,
    order: 0,
    collapsed: false,
    mode: "Free",
    layout: "right",
    background:
      kind === "sticky"
        ? "#fff1bf"
        : kind === "text"
          ? "transparent"
          : "#ffffff",
    border:
      kind === "text"
        ? "transparent"
        : kind === "sticky"
          ? "#e7d99f"
          : "#a3b8ae",
    color: "#293b35",
    fontSize: 16,
    bold: false,
    expression: "",
    result: "",
    calcError: "",
  };
}
export function makeBoard(name = "未命名白板"): Board {
  return {
    schemaVersion: 1,
    boardId: id(),
    name,
    updatedAt: Date.now(),
    nodes: [],
    relations: [],
    treeStyle: { color: "#73968a", width: 2, dashed: false },
    viewport: { x: 70, y: 80, zoom: 1 },
  };
}
export function demoBoard(): Board {
  const b = makeBoard("週末旅行 · 靈感工作台");
  b.viewport = { x: 35, y: 85, zoom: 0.78 };
  const root = makeItem("mind", { x: 150, y: 235 }, "一場剛剛好的旅行");
  root.bold = true;
  root.background = "#e0eee7";
  root.width = 215;
  const children = [
    makeItem("mind", { x: 475, y: 105 }, "想去的地方"),
    makeItem("mind", { x: 475, y: 235 }, "留一點空白"),
    makeItem("mind", { x: 475, y: 365 }, "預算與準備"),
  ];
  children.forEach((n, i) => {
    n.parentId = root.id;
    n.mode = "Auto";
    n.order = i;
  });
  const note = makeItem(
    "sticky",
    { x: 130, y: 450 },
    "不必把每一刻排滿。\n找一家小店，慢慢喝杯咖啡。",
  );
  note.width = 235;
  note.height = 130;
  const heading = makeItem(
    "text",
    { x: 125, y: 0 },
    "把想法放下，讓思緒展開。",
  );
  heading.fontSize = 25;
  heading.bold = true;
  heading.width = 400;
  heading.maxWidth = 480;
  const calc = makeItem("calculator", { x: 780, y: 115 });
  calc.expression = "(1800 + 650) * 2";
  calc.result = "4900";
  b.nodes = [heading, root, ...children, note, calc];
  b.relations = [
    {
      id: id(),
      source: children[2].id,
      target: calc.id,
      color: "#c29955",
      width: 2,
      dashed: true,
    },
  ];
  return b;
}
export function childrenOf(b: Board, parent: string): Item[] {
  return b.nodes
    .filter((n) => n.parentId === parent)
    .sort((a, c) => a.order - c.order || a.id.localeCompare(c.id));
}
export function branchIds(b: Board, root: string): Set<string> {
  const ids = new Set<string>([root]);
  const queue = [root];
  while (queue.length) {
    for (const n of childrenOf(b, queue.shift()!))
      if (!ids.has(n.id)) {
        ids.add(n.id);
        queue.push(n.id);
      }
  }
  return ids;
}
export function rootId(b: Board, nodeId: string): string {
  let n = b.nodes.find((n) => n.id === nodeId);
  const seen = new Set<string>();
  while (n?.parentId && !seen.has(n.id)) {
    seen.add(n.id);
    n = b.nodes.find((x) => x.id === n!.parentId);
  }
  return n?.id || nodeId;
}
export function hiddenIds(b: Board): Set<string> {
  const hidden = new Set<string>();
  for (const n of b.nodes)
    if (n.collapsed)
      for (const cid of branchIds(b, n.id)) if (cid !== n.id) hidden.add(cid);
  return hidden;
}
export function reparent(
  b: Board,
  nodeId: string,
  parentId: string | null,
  index = Infinity,
): boolean {
  const n = b.nodes.find((n) => n.id === nodeId),
    p = b.nodes.find((n) => n.id === parentId);
  if (
    !n ||
    n.kind !== "mind" ||
    (parentId &&
      (!p || p.kind !== "mind" || branchIds(b, nodeId).has(parentId)))
  )
    return false;
  n.parentId = parentId;
  const siblings = childrenOf(b, parentId || "").filter((x) => x.id !== nodeId);
  siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, n);
  siblings.forEach((x, i) => (x.order = i));
  return true;
}
export function removeItems(b: Board, selected: string[]): void {
  const ids = new Set<string>();
  for (const sid of selected) for (const bid of branchIds(b, sid)) ids.add(bid);
  b.nodes = b.nodes.filter((n) => !ids.has(n.id));
  b.relations = b.relations.filter(
    (r) => !ids.has(r.source) && !ids.has(r.target),
  );
}
export function duplicateItems(
  b: Board,
  selected: string[],
  offset = 32,
): string[] {
  const ids = new Set<string>();
  for (const sid of selected) for (const bid of branchIds(b, sid)) ids.add(bid);
  const map = new Map([...ids].map((sid) => [sid, id()]));
  const added = b.nodes
    .filter((n) => ids.has(n.id))
    .map((n) => ({
      ...clone(n),
      id: map.get(n.id)!,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      parentId: n.parentId && map.has(n.parentId) ? map.get(n.parentId)! : null,
    }));
  b.nodes.push(...added);
  b.relations.push(
    ...b.relations
      .filter((r) => ids.has(r.source) && ids.has(r.target))
      .map((r) => ({
        ...clone(r),
        id: id(),
        source: map.get(r.source)!,
        target: map.get(r.target)!,
      })),
  );
  return added.map((n) => n.id);
}
