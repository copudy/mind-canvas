import { describe, it, expect } from "vitest";
import { makeBoard } from "./model";
import { welcomeBoard } from "./guide";
import { normalizePrefs, deleteSection } from "./workspacePrefs";
describe("workspace metadata migration", () => {
  it("migrates a valid legacy active ID without changing documents", () => {
    const b = makeBoard("舊白板"),
      g = welcomeBoard(),
      before = structuredClone(b);
    expect(normalizePrefs(undefined, [b, g], b.boardId).lastOpened).toBe(
      b.boardId,
    );
    expect(
      normalizePrefs(undefined, [b, g], g.boardId).lastOpened,
    ).toBeUndefined();
    expect(b).toEqual(before);
  });
  it("filters dangling IDs, duplicate pins and invalid section membership", () => {
    const b = makeBoard(),
      g = welcomeBoard();
    const p = normalizePrefs(
      {
        lastOpened: "missing",
        pinned: [b.boardId, b.boardId, g.boardId, "missing"],
        sections: [
          { id: "s", name: " 工作 ", collapsed: true },
          { id: "s", name: "重複" },
        ],
        membership: { [b.boardId]: "s", [g.boardId]: "s", missing: "s" },
      },
      [b, g],
    );
    expect(p.pinned).toEqual([b.boardId]);
    expect(p.sections).toEqual([{ id: "s", name: "工作", collapsed: true }]);
    expect(p.membership).toEqual({ [b.boardId]: "s" });
    expect(p.lastOpened).toBeUndefined();
  });
  it("deletes only section metadata while preserving pin and last-opened references", () => {
    const b = makeBoard(),
      before = structuredClone(b);
    const p = normalizePrefs(
      {
        lastOpened: b.boardId,
        pinned: [b.boardId],
        sections: [{ id: "s", name: "工作", collapsed: false }],
        membership: { [b.boardId]: "s" },
      },
      [b],
    );
    deleteSection(p, "s");
    expect(p.sections).toEqual([]);
    expect(p.membership).toEqual({});
    expect(p.lastOpened).toBe(b.boardId);
    expect(p.pinned).toEqual([b.boardId]);
    expect(b).toEqual(before);
  });
});
