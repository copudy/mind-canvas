import { describe, it, expect } from "vitest";
import {
  plainDoc,
  listDoc,
  plainText,
  listIds,
  validRich,
  applyRich,
  appearance,
} from "./rich";
import { makeBoard, makeItem, clone } from "./model";
import { exportProject, importBundle, validateBoard } from "./storage";
import { captureTemplate, instantiateTemplate } from "./templates";
import { validWidget, resizeTable } from "./widgets";
import { routeConnector, segmentHits } from "./router";
describe("rich documents and anchor compatibility", () => {
  it("keeps legacy Markdown-looking text literal and preserves all line breaks", () => {
    const t = "**原本字樣**\n\n中文 *文字*";
    expect(plainText(plainDoc(t))).toBe(t);
    expect(validRich(plainDoc(t))).toBe(true);
  });
  it("list reorder preserves identity and deletion removes only referenced relations", () => {
    const b = makeBoard();
    const n = makeItem("text", { x: 0, y: 0 }),
      target = makeItem("text", { x: 500, y: 0 });
    n.rich = listDoc(["機票", "住宿", "交通"]);
    b.nodes = [n, target];
    const ids = listIds(n.rich);
    b.relations = [
      {
        id: "a",
        source: n.id,
        target: target.id,
        sourceItem: ids[1],
        color: "#3b82f6",
        width: 2,
        dashed: false,
      },
    ];
    const next = clone(n.rich);
    next.content![0].content!.reverse();
    applyRich(b, n.id, next);
    expect(b.relations[0].sourceItem).toBe(ids[1]);
    const restore = clone(b);
    next.content![0].content = next.content![0].content!.filter(
      (x) => x.attrs?.id !== ids[1],
    );
    applyRich(b, n.id, next);
    expect(b.relations).toHaveLength(0);
    expect(validateBoard(restore).relations).toHaveLength(1);
  });
  it("rejects invalid rich nodes, duplicate IDs and dangling item anchors", () => {
    expect(
      validRich({
        type: "doc",
        content: [{ type: "image", attrs: { src: "javascript:alert(1)" } }],
      }),
    ).toBe(false);
    const d = listDoc(["a", "b"]);
    d.content![0].content![1].attrs = d.content![0].content![0].attrs;
    expect(validRich(d)).toBe(false);
    const b = makeBoard();
    b.nodes = [
      makeItem("text", { x: 0, y: 0 }),
      makeItem("text", { x: 500, y: 0 }),
    ];
    b.relations = [
      {
        id: "r",
        source: b.nodes[0].id,
        target: b.nodes[1].id,
        sourceItem: "missing",
        color: "#ffffff",
        width: 2,
        dashed: false,
      },
    ];
    expect(() => validateBoard(b)).toThrow();
  });
  it("roundtrips rich styles and stable anchors through backup 4 and custom templates", () => {
    const b = makeBoard(),
      n = makeItem("text", { x: 0, y: 0 }),
      t = makeItem("mind", { x: 500, y: 80 });
    n.rich = listDoc(["甲", "乙"]);
    n.italic = true;
    n.textAlign = "right";
    b.nodes = [n, t];
    b.relations = [
      {
        id: "r",
        source: n.id,
        target: t.id,
        sourceItem: listIds(n.rich)[0],
        color: "#3b82f6",
        width: 2,
        dashed: false,
      },
    ];
    expect(JSON.parse(exportProject([b])).schemaVersion).toBe(4);
    expect(importBundle(exportProject([b])).boards[0].nodes).toEqual(b.nodes);
    const template = captureTemplate(
      b,
      b.nodes.map((n) => n.id),
      "list",
    );
    const x = instantiateTemplate(template, { x: 200, y: 300 });
    expect(x.relations[0].sourceItem).toBe(b.relations[0].sourceItem);
    expect(x.nodes[0].id).not.toBe(n.id);
    expect(listIds(x.nodes[0].rich)).toEqual(listIds(n.rich));
  });
  it("cell formats validate and prune on row/column deletion", () => {
    const w = {
      type: "table" as const,
      cells: [
        ["a", "b"],
        ["c", "d"],
      ],
      styles: {
        "1:1": { background: "#ff0000", align: "center" as const, bold: true },
      },
    };
    expect(validWidget(w)).toBe(true);
    expect(resizeTable(w, [["a", "b"]]).styles).toEqual({});
    expect(
      validWidget({ ...w, styles: { "20:0": { color: "#ffffff" } } }),
    ).toBe(false);
    expect(
      validWidget({ ...w, styles: { "0:0": { background: "url(secret)" } } }),
    ).toBe(false);
  });
  it("appearance restores heading transparency and ordinary text frame", () => {
    const n = makeItem("text", { x: 0, y: 0 });
    expect(appearance(n).background).toBe("#ffffff");
    n.textRole = "heading";
    expect(appearance(n)).toMatchObject({
      background: "transparent",
      border: "transparent",
      fontSize: 28,
      italic: false,
    });
  });
  it("routes exact list-item boundary anchors with orthogonal obstacle avoidance", () => {
    const a = { x: 0, y: 0, width: 260, height: 200 },
      b = { x: 600, y: 80, width: 240, height: 100 },
      block = { x: 330, y: 50, width: 160, height: 100 };
    const r = routeConnector(a, b, [block], "right", "left", undefined, {
      source: { x: 260, y: 65 },
      target: { x: 600, y: 130 },
    });
    expect(r.blocked).toBe(false);
    expect(r.points[0]).toEqual({ x: 260, y: 65 });
    for (let i = 1; i < r.points.length; i++) {
      expect(
        r.points[i].x === r.points[i - 1].x ||
          r.points[i].y === r.points[i - 1].y,
      ).toBe(true);
      expect(segmentHits(r.points[i - 1], r.points[i], block)).toBe(false);
    }
  });
});
