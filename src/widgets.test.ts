import { describe, it, expect } from "vitest";
import {
  calendarDays,
  dayKey,
  validDate,
  validWidget,
  makeWidget,
} from "./widgets";
import { makeBoard } from "./model";
import { exportProject, importBundle, validateBoard } from "./storage";
import { captureTemplate, instantiateTemplate } from "./templates";
describe("persisted widgets", () => {
  it("handles leap years, local date keys and month grids", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2026-13-01")).toBe(false);
    expect(calendarDays(2024, 1).filter(Boolean)).toHaveLength(29);
    expect(calendarDays(2026, 1).filter(Boolean)).toHaveLength(28);
    expect(dayKey(2026, 9, 12)).toBe("2026-10-12");
  });
  it("validates bounded tables, icons and calendar notes", () => {
    for (const type of ["icon", "table", "calendar"] as const)
      expect(validWidget(makeWidget(type, { x: 0, y: 0 }).widget)).toBe(true);
    expect(validWidget({ type: "table", cells: [["a", "b"], ["c"]] })).toBe(
      false,
    );
    expect(
      validWidget({ type: "table", cells: Array(13).fill(["a", "b"]) }),
    ).toBe(false);
    expect(validWidget({ type: "icon", symbol: "<script>" })).toBe(false);
    expect(
      validWidget({
        type: "calendar",
        year: 2026,
        month: 10,
        selected: "2026-11-01",
        notes: { "2026-02-30": "bad" },
      }),
    ).toBe(false);
  });
  it("roundtrips all widget data through version 3 while old documents remain readable", () => {
    const b = makeBoard();
    b.nodes = ["icon", "table", "calendar"].map((type) =>
      makeWidget(type as any, { x: 20, y: 30 }),
    );
    const raw = exportProject([b]);
    expect(JSON.parse(raw).schemaVersion).toBe(3);
    expect(importBundle(raw).boards[0].nodes).toEqual(b.nodes);
    const old = makeBoard();
    expect(JSON.parse(exportProject([old])).schemaVersion).toBe(1);
    expect(validateBoard(old)).toEqual(old);
    b.nodes[0].widget = { type: "table", cells: [["bad"]] };
    expect(() => validateBoard(b)).toThrow();
  });
  it("custom templates clone independent widget data and require version 3 backup", () => {
    const b = makeBoard();
    b.nodes = [makeWidget("table", { x: 20, y: 40 })];
    const t = captureTemplate(b, [b.nodes[0].id], "紀錄");
    const inserted = instantiateTemplate(t, { x: 200, y: 300 });
    expect(inserted.nodes[0].id).not.toBe(b.nodes[0].id);
    expect(inserted.nodes[0].widget).toEqual(b.nodes[0].widget);
    (inserted.nodes[0].widget as any).cells[0][0] = "changed";
    expect((b.nodes[0].widget as any).cells[0][0]).toBe("項目");
    expect(JSON.parse(exportProject([makeBoard()], [t])).schemaVersion).toBe(3);
  });
});
