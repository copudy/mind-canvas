import { openDB, type DBSchema } from "idb";
import { clone, id, type Board, type Item, type Relation } from "./model";
interface CanvasDB extends DBSchema {
  boards: { key: string; value: Board };
  meta: { key: string; value: string };
}
const db = () =>
  openDB<CanvasDB>("freeform-mind-canvas", 1, {
    upgrade(db) {
      db.createObjectStore("boards", { keyPath: "boardId" });
      db.createObjectStore("meta");
    },
  });
export const repository = {
  async list() {
    return (await (await db()).getAll("boards")).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  },
  async save(board: Board) {
    const d = await db(),
      tx = d.transaction("boards", "readwrite");
    await tx.store.put(clone(board));
    await tx.done;
  },
  async remove(boardId: string) {
    const d = await db(),
      tx = d.transaction("boards", "readwrite");
    await tx.store.delete(boardId);
    await tx.done;
  },
  async active(boardId?: string) {
    const d = await db();
    if (boardId) await d.put("meta", boardId, "active");
    return d.get("meta", "active");
  },
};
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, min = -1e7, max = 1e7): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const str = (v: unknown, max = 10000): v is string =>
  typeof v === "string" && v.length <= max;
const point = (v: unknown) => object(v) && num(v.x) && num(v.y);
const color = (v: unknown) =>
  typeof v === "string" && (v === "transparent" || /^#[0-9a-fA-F]{6}$/.test(v));
export function validateBoard(raw: unknown): Board {
  if (!object(raw) || raw.schemaVersion !== 1)
    throw new Error("不支援的文件版本，需為 schemaVersion 1");
  if (
    !str(raw.boardId, 100) ||
    !raw.boardId ||
    !str(raw.name, 200) ||
    !raw.name.trim() ||
    !num(raw.updatedAt, 0, 1e15) ||
    !Array.isArray(raw.nodes) ||
    raw.nodes.length > 2000 ||
    !Array.isArray(raw.relations) ||
    raw.relations.length > 5000
  )
    throw new Error("白板資料格式或容量不符");
  if (
    !object(raw.viewport) ||
    !num(raw.viewport.x) ||
    !num(raw.viewport.y) ||
    !num(raw.viewport.zoom, 0.05, 4) ||
    !object(raw.treeStyle) ||
    !color(raw.treeStyle.color) ||
    !num(raw.treeStyle.width, 1, 8) ||
    typeof raw.treeStyle.dashed !== "boolean"
  )
    throw new Error("視角或連線樣式無效");
  const ids = new Set<string>();
  const nodes: Item[] = raw.nodes.map((v) => {
    if (
      !object(v) ||
      !str(v.id, 100) ||
      !v.id ||
      ids.has(v.id) ||
      ![
        "mind",
        "text",
        "sticky",
        "rectangle",
        "ellipse",
        "calculator",
      ].includes(String(v.kind)) ||
      !str(v.text) ||
      !point(v.position) ||
      !num(v.width, 40, 3000) ||
      !num(v.height, 32, 3000) ||
      typeof v.autoSize !== "boolean" ||
      !num(v.maxWidth, 80, 1000) ||
      !(v.parentId === null || str(v.parentId, 100)) ||
      !num(v.order, 0, 100000) ||
      !Number.isInteger(v.order) ||
      typeof v.collapsed !== "boolean" ||
      !["Auto", "Pinned", "Free"].includes(String(v.mode)) ||
      !["right", "split", "radial"].includes(String(v.layout)) ||
      !color(v.background) ||
      !color(v.border) ||
      !color(v.color) ||
      !num(v.fontSize, 10, 48) ||
      typeof v.bold !== "boolean" ||
      !str(v.expression, 500) ||
      !str(v.result, 200) ||
      !str(v.calcError, 500)
    )
      throw new Error("節點資料無效或 ID 重複");
    ids.add(v.id);
    return clone(v) as unknown as Item;
  });
  const map = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    if (
      n.parentId &&
      (n.kind !== "mind" || map.get(n.parentId)?.kind !== "mind")
    )
      throw new Error("父子關係包含無效節點");
    const seen = new Set<string>([n.id]);
    let p = n.parentId;
    while (p) {
      if (seen.has(p)) throw new Error("文件包含循環階層");
      seen.add(p);
      p = map.get(p)!.parentId;
    }
  }
  const edgeIds = new Set<string>();
  const relations: Relation[] = raw.relations.map((v) => {
    if (
      !object(v) ||
      !str(v.id, 100) ||
      !v.id ||
      ids.has(v.id) ||
      edgeIds.has(v.id) ||
      !str(v.source, 100) ||
      !str(v.target, 100) ||
      !ids.has(v.source) ||
      !ids.has(v.target) ||
      v.source === v.target ||
      !color(v.color) ||
      !num(v.width, 1, 8) ||
      typeof v.dashed !== "boolean" ||
      (v.sourceSide !== undefined &&
        !["left", "right", "top", "bottom"].includes(String(v.sourceSide))) ||
      (v.targetSide !== undefined &&
        !["left", "right", "top", "bottom"].includes(String(v.targetSide))) ||
      (v.waypoints !== undefined &&
        (!Array.isArray(v.waypoints) ||
          v.waypoints.length > 20 ||
          !v.waypoints.every(point)))
    )
      throw new Error("關聯線資料無效");
    edgeIds.add(v.id);
    return clone(v) as unknown as Relation;
  });
  // Reconstruct explicitly: imported documents cannot inject renderer properties.
  return {
    schemaVersion: 1,
    boardId: raw.boardId,
    name: raw.name,
    updatedAt: raw.updatedAt,
    nodes,
    relations,
    viewport: clone(raw.viewport) as Board["viewport"],
    treeStyle: clone(raw.treeStyle) as Board["treeStyle"],
  };
}
export function exportProject(boards: Board[]): string {
  return JSON.stringify(
    { format: "freeform-mind-canvas", schemaVersion: 1, boards },
    null,
    2,
  );
}
export function importProject(text: string): Board[] {
  if (text.length > 20_000_000) throw new Error("檔案超過 20 MB");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("檔案不是有效 JSON");
  }
  if (
    !object(raw) ||
    raw.format !== "freeform-mind-canvas" ||
    raw.schemaVersion !== 1 ||
    !Array.isArray(raw.boards) ||
    !raw.boards.length ||
    raw.boards.length > 100
  )
    throw new Error("不是有效的 Mind Canvas 專案");
  return raw.boards.map((v) => {
    const b = validateBoard(v);
    b.boardId = id();
    b.name = `${b.name.slice(0, 180)}（匯入）`;
    b.updatedAt = Date.now();
    return b;
  });
}
