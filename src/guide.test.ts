import { it, expect } from "vitest";
import {
  welcomeBoard,
  refreshGreeting,
  greetings,
  arrangeGuide,
} from "./guide";
import { exportProject, importProject, validateBoard } from "./storage";
import { makeBoard, clone } from "./model";
it("guide is valid portable real editable content with stable document references", () => {
  const b = welcomeBoard();
  expect(validateBoard(b)).toEqual(b);
  expect(
    b.nodes.some((n) => n.kind === "calculator" && n.result === "4900"),
  ).toBe(true);
  expect(b.nodes.filter((n) => n.parentId)).toHaveLength(2);
  expect(b.relations).toHaveLength(2);
  const restored = importProject(exportProject([b]))[0];
  expect(restored.nodes).toEqual(b.nodes);
  expect(restored.relations).toEqual(b.relations);
  expect(restored.viewport).toEqual(b.viewport);
  expect(restored.treeStyle).toEqual(b.treeStyle);
  expect(restored.guide).toBeUndefined();
});
it("greeting changes on entry within the guide only and preserves other content", () => {
  const b = welcomeBoard(),
    other = makeBoard();
  const before = clone(b);
  const first = b.nodes.find((n) => n.id === b.guide!.greetingId)!.text;
  refreshGreeting(b);
  const after = b.nodes.find((n) => n.id === b.guide!.greetingId)!.text;
  expect(after).not.toBe(first);
  expect(greetings).toContain(after);
  expect(b.nodes.filter((n) => n.id !== b.guide!.greetingId)).toEqual(
    before.nodes.filter((n) => n.id !== b.guide!.greetingId),
  );
  expect(refreshGreeting(other)).toEqual(other);
});
it("invalid guide references are rejected", () => {
  const b = welcomeBoard();
  b.guide!.greetingId = "missing";
  expect(() => validateBoard(b)).toThrow("指南");
});
it("guide presentation upgrade preserves stable IDs and custom notes and is idempotent", () => {
  const b = welcomeBoard();
  const old = clone(b);
  delete b.guide!.entryId;
  delete b.guide!.backupId;
  b.nodes = b.nodes.filter(
    (n) => n.id !== old.guide!.entryId && n.id !== old.guide!.backupId,
  );
  const ids = b.nodes.map((n) => n.id);
  const custom = b.nodes[3];
  custom.text = "我的自訂教學文字";
  arrangeGuide(b);
  expect(ids.every((id) => b.nodes.some((n) => n.id === id))).toBe(true);
  expect(b.nodes.find((n) => n.id === custom.id)!.text).toBe(
    "我的自訂教學文字",
  );
  const after = clone(b);
  arrangeGuide(b);
  expect(b).toEqual(after);
  expect(b.nodes.filter((n) => n.parentId)).toHaveLength(2);
  expect(b.relations).toEqual(old.relations);
});
it("invalid guide action references are rejected", () => {
  const b = welcomeBoard();
  b.guide!.entryId = "missing";
  expect(() => validateBoard(b)).toThrow("指南操作");
});
