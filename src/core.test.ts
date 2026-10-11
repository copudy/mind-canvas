import { describe, it, expect } from "vitest";
import "fake-indexeddb/auto";
import { calculate } from "./calculator";
import {
  makeBoard,
  makeItem,
  childrenOf,
  reparent,
  branchIds,
  hiddenIds,
  duplicateItems,
  removeItems,
  clone,
} from "./model";
import { layoutTree, snapPosition } from "./layout";
import { History } from "./history";
import { routeConnector, segmentHits, port, type Rect } from "./router";
import {
  repository,
  validateBoard,
  exportProject,
  importProject,
} from "./storage";
function tree() {
  const b = makeBoard("測試");
  const r = makeItem("mind", { x: 0, y: 0 });
  const a = makeItem("mind", { x: 200, y: 100 }),
    c = makeItem("mind", { x: 200, y: 200 });
  a.parentId = r.id;
  c.parentId = r.id;
  a.mode = c.mode = "Auto";
  c.order = 1;
  const d = makeItem("mind", { x: 400, y: 100 });
  d.parentId = a.id;
  d.mode = "Auto";
  b.nodes = [r, a, c, d];
  return { b, r, a, c, d };
}
describe("Calculator", () => {
  it.each([
    ["2+3*4", "14"],
    ["(1800+650)*2", "4900"],
    ["0.1+0.2", "0.3"],
    ["100*10%", "10"],
    ["-2*(3+.5)", "-7"],
    ["1/8", "0.125"],
    ["1--2", "3"],
    ["50%+25%", "0.75"],
    ["1/3", "0.33333333333333333333"],
  ])("%s = %s", (s, result) => expect(calculate(s)).toBe(result));
  it.each([
    "",
    "1/0",
    "1/(2-2)",
    "1+",
    "(2+3",
    "2(3)",
    "alert(1)",
    "1e5",
    "1;process.exit()",
    ".",
    "2**3",
    ")2(",
    "(".repeat(100) + "1" + ")".repeat(100),
  ])("rejects %s", (s) => expect(() => calculate(s)).toThrow());
});
describe("Tree model and history", () => {
  it("prevents cycles and non-mind parents", () => {
    const { b, r, a, d } = tree();
    expect(reparent(b, r.id, d.id)).toBe(false);
    expect(reparent(b, a.id, a.id)).toBe(false);
    const s = makeItem("sticky", { x: 0, y: 0 });
    b.nodes.push(s);
    expect(reparent(b, a.id, s.id)).toBe(false);
    expect(reparent(b, d.id, r.id, 0)).toBe(true);
    expect(childrenOf(b, r.id)[0].id).toBe(d.id);
  });
  it("collapse hides descendants while preserving data", () => {
    const { b, r } = tree();
    r.collapsed = true;
    expect(hiddenIds(b).size).toBe(3);
    expect(b.nodes.length).toBe(4);
  });
  it("duplicate remaps IDs, edges and internal parents", () => {
    const { b, r, a } = tree();
    b.relations.push({
      id: crypto.randomUUID(),
      source: r.id,
      target: a.id,
      color: "#ffffff",
      width: 2,
      dashed: false,
    });
    const ids = duplicateItems(b, [r.id]);
    expect(ids.length).toBe(4);
    expect(new Set(b.nodes.map((n) => n.id)).size).toBe(8);
    expect(b.relations.length).toBe(2);
    expect(ids).toContain(b.relations[1].source);
    validateBoard(b);
  });
  it("delete branch and undo/redo restore all data", () => {
    const { b, a } = tree();
    const history = new History();
    history.push(b);
    removeItems(b, [a.id]);
    expect(b.nodes.length).toBe(2);
    const before = history.undo(b)!;
    expect(before.nodes.length).toBe(4);
    expect(history.redo(before)!.nodes.length).toBe(2);
  });
  it("branch movement set includes all descendants", () => {
    const { b, a, d, c } = tree();
    expect(branchIds(b, a.id).has(d.id)).toBe(true);
    expect(branchIds(b, a.id).has(c.id)).toBe(false);
  });
});
describe("Local layout", () => {
  it.each(["right", "split", "radial"] as const)(
    "%s keeps other trees and pinned positions",
    (mode) => {
      const { b, r, a } = tree();
      const external = makeItem("mind", { x: 850, y: 850 });
      b.nodes.push(external);
      a.mode = "Pinned";
      const pinned = clone(a.position),
        free = clone(external.position);
      layoutTree(b, r.id, mode);
      expect(a.position).toEqual(pinned);
      expect(external.position).toEqual(free);
      for (const n of b.nodes) expect(Number.isFinite(n.position.x)).toBe(true);
    },
  );
  it("auto layout separates siblings and supports left/right", () => {
    const { b, r, a, c } = tree();
    layoutTree(b, r.id, "split");
    expect(a.position.x).toBeGreaterThan(r.position.x);
    expect(c.position.x).toBeLessThan(r.position.x);
  });
  it("snaps alignment within tolerance", () => {
    const { b, r, a } = tree();
    expect(
      snapPosition(b, new Set([a.id]), { x: r.position.x + 4, y: 100 }, a)
        .position.x,
    ).toBe(r.position.x);
  });
});
describe("Rounded orthogonal routing", () => {
  const a: Rect = { x: 0, y: 0, width: 100, height: 60 },
    b: Rect = { x: 400, y: 150, width: 100, height: 60 };
  function assertRoute(source: Rect, target: Rect, others: Rect[] = []) {
    const r = routeConnector(source, target, others);
    expect(r.blocked).toBe(false);
    expect(r.points[0]).toEqual(port(source, r.sourceSide));
    expect(r.points.at(-1)).toEqual(port(target, r.targetSide));
    for (let i = 1; i < r.points.length; i++) {
      const p = r.points[i - 1],
        q = r.points[i];
      expect(p.x === q.x || p.y === q.y).toBe(true);
      for (const rect of [source, target, ...others])
        expect(segmentHits(p, q, rect)).toBe(false);
    }
    return r;
  }
  it("uses boundary ports and true circular bends", () => {
    const r = assertRoute(a, b);
    expect(r.path).toMatch(/ A 10 10/);
    expect(r.path).not.toMatch(/ C | Q /);
  });
  it("routes around intervening objects", () => {
    assertRoute(a, b, [{ x: 170, y: -40, width: 120, height: 280 }]);
  });
  it("supports reverse direction", () => assertRoute(b, a));
  it("supports near nodes", () =>
    assertRoute(a, { x: 112, y: 70, width: 100, height: 60 }));
  it("handles overlapping rectangles with explicit blocked signal", () => {
    expect(
      routeConnector(a, { x: 10, y: 10, width: 40, height: 32 }, []).blocked,
    ).toBe(true);
  });
  it("supports manual ports and orthogonal waypoint segments", () => {
    const r = routeConnector(a, b, [], "top", "bottom", [{ x: 280, y: -100 }]);
    expect(r.sourceSide).toBe("top");
    expect(r.targetSide).toBe("bottom");
    expect(r.blocked).toBe(false);
    for (let i = 1; i < r.points.length; i++)
      expect(
        r.points[i].x === r.points[i - 1].x ||
          r.points[i].y === r.points[i - 1].y,
      ).toBe(true);
  });
  it("updates when size changes", () => {
    const r = routeConnector({ ...a, width: 170 }, b, [], "right");
    expect(r.points[0].x).toBe(170);
  });
});
describe("Storage and import", () => {
  it("independent boards survive storage roundtrip", async () => {
    const { b } = tree();
    const second = makeBoard("第二張");
    second.nodes.push(makeItem("calculator", { x: 25, y: 90 }));
    second.nodes[0].expression = "0.1+0.2";
    second.nodes[0].result = "0.3";
    await repository.save(b);
    await repository.save(second);
    const list = await repository.list();
    expect(list.find((x) => x.boardId === b.boardId)?.nodes.length).toBe(4);
    expect(
      list.find((x) => x.boardId === second.boardId)?.nodes[0].result,
    ).toBe("0.3");
    await repository.remove(b.boardId);
    expect(
      (await repository.list()).find((x) => x.boardId === second.boardId),
    ).toEqual(second);
  });
  it("JSON restores every field and allocates a new board ID", () => {
    const { b } = tree();
    const c = makeItem("calculator", { x: 600, y: 700 });
    c.expression = "123*2";
    c.result = "246";
    b.nodes.push(c);
    b.viewport = { x: -50, y: 80, zoom: 0.7 };
    const restored = importProject(exportProject([b]))[0];
    expect(restored.boardId).not.toBe(b.boardId);
    expect(restored.nodes).toEqual(b.nodes);
    expect(restored.viewport).toEqual(b.viewport);
  });
  it("rejects unsupported schema, duplicate IDs, cycles and dangling edges", () => {
    const { b, r, d } = tree();
    expect(() => validateBoard({ ...b, schemaVersion: 2 })).toThrow();
    expect(() => validateBoard({ ...b, nodes: [r, r] })).toThrow();
    r.parentId = d.id;
    expect(() => validateBoard(b)).toThrow();
    r.parentId = null;
    b.relations.push({
      id: "x",
      source: r.id,
      target: "missing",
      color: "#ffffff",
      width: 2,
      dashed: false,
    });
    expect(() => validateBoard(b)).toThrow();
  });
  it("rejects malicious data and invalid numbers", () => {
    const { b, r } = tree();
    r.position.x = NaN;
    expect(() => validateBoard(b)).toThrow();
    r.position.x = 0;
    r.background = "url(https://example.com)";
    expect(() => validateBoard(b)).toThrow();
    expect(() => importProject("{bad")).toThrow();
  });
});
