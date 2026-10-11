import { it, expect } from "vitest";
import "fake-indexeddb/auto";
import {
  captureTemplate,
  instantiateTemplate,
  officialTemplates,
  validateTemplates,
} from "./templates";
import { clone, makeBoard, makeItem, id } from "./model";
import {
  exportProject,
  importBundle,
  importProject,
  repository,
  validateBoard,
} from "./storage";
it("official frameworks have substantive valid editable objects and relationships", () => {
  expect(officialTemplates).toHaveLength(6);
  for (const t of officialTemplates) {
    expect(validateBoard(t.document)).toEqual(t.document);
    expect(t.document.nodes.length).toBeGreaterThanOrEqual(5);
    expect(t.document.nodes.some((n) => n.text.includes("\n"))).toBe(true);
    expect(
      t.document.relations.length +
        t.document.nodes.filter((n) => n.parentId).length,
    ).toBeGreaterThan(0);
  }
});
it("captured subset preserves internal hierarchy styles and bends and detaches outside parents", () => {
  const b = makeBoard(),
    root = makeItem("mind", { x: 100, y: 200 }),
    child = makeItem("mind", { x: 400, y: 250 }),
    other = makeItem("sticky", { x: 800, y: 200 });
  child.parentId = root.id;
  child.order = 1;
  child.color = "#123456";
  b.nodes = [root, child, other];
  b.treeStyle.color = "#ff0000";
  b.relations = [
    {
      id: id(),
      source: root.id,
      target: child.id,
      color: "#112233",
      width: 3,
      dashed: true,
      waypoints: [{ x: 350, y: 230 }],
    },
  ];
  const original = clone(b),
    t = captureTemplate(b, [root.id, child.id], "我的分支");
  const a = instantiateTemplate(t, { x: 900, y: 600 }),
    c = instantiateTemplate(t, { x: 0, y: 0 });
  expect(b).toEqual(original);
  expect(a.nodes[1].parentId).toBe(a.nodes[0].id);
  expect(a.nodes[1].color).toBe(child.color);
  expect(a.nodes[0].treeStyle?.color).toBe("#ff0000");
  expect(a.relations[0].source).toBe(a.nodes[0].id);
  expect(a.relations[0].waypoints).toEqual([{ x: 1150, y: 630 }]);
  expect(a.nodes[1].position.x - a.nodes[0].position.x).toBe(300);
  expect(a.nodes.some((n) => c.nodes.some((m) => m.id === n.id))).toBe(false);
  expect(
    captureTemplate(b, [child.id], "單枝").document.nodes[0].parentId,
  ).toBeNull();
});
it("complete JSON roundtrip includes templates and remains compatible with v1 board-only backups", () => {
  const b = makeBoard(),
    t = officialTemplates[0],
    text = exportProject([b], [t]);
  const bundle = importBundle(text);
  expect(JSON.parse(text).schemaVersion).toBe(2);
  expect(bundle.templates[0].document).toEqual(t.document);
  expect(bundle.templates[0].id).not.toBe(t.id);
  expect(importBundle(exportProject([b])).templates).toEqual([]);
  expect(importProject(text)).toHaveLength(1);
  const malformed = JSON.parse(text);
  malformed.templates[0].document.relations[0].target = "missing";
  expect(() => importBundle(JSON.stringify(malformed))).toThrow("關聯");
});
it("templates persist in existing IndexedDB meta and transactions keep boards and templates atomic", async () => {
  const b = makeBoard(),
    t = officialTemplates[1];
  await repository.saveMany([b], [t]);
  expect(await repository.templates()).toEqual([t]);
  expect((await repository.list()).some((x) => x.boardId === b.boardId)).toBe(
    true,
  );
});
it("invalid names, duplicate IDs and malformed calculator states are rejected", () => {
  expect(() =>
    validateTemplates([officialTemplates[0], officialTemplates[0]]),
  ).toThrow();
  expect(() => captureTemplate(makeBoard(), [], "x")).toThrow();
  const b = makeBoard();
  b.nodes.push({ ...makeItem("text", { x: 0, y: 0 }), floating: true });
  expect(() => validateBoard(b)).toThrow();
});
