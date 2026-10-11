import { it, expect } from "vitest";
import { makeItem } from "./model";
import { contextToolbarPosition } from "./contextToolbar";
it("toolbar avoids sibling above selection instead of intercepting clicks", () => {
  const a = makeItem("mind", { x: 640, y: 360 }),
    b = makeItem("mind", { x: 900, y: 300 }),
    c = makeItem("mind", { x: 900, y: 380 });
  const p = contextToolbarPosition(
    [a, b, c],
    c,
    { x: 0, y: 0, zoom: 1 },
    { width: 1440, height: 832 },
    292,
    300,
  )!;
  expect(p).toBeTruthy();
  for (const n of [a, b, c])
    expect(
      p.left < n.position.x + n.width &&
        p.left + p.width > n.position.x &&
        p.top < n.position.y + n.height &&
        p.top + 54 > n.position.y,
    ).toBe(false);
});
it("no available space hides contextual strip rather than covering a full-canvas object", () => {
  const n = makeItem("rectangle", { x: 0, y: 0 });
  n.width = 1000;
  n.height = 1000;
  expect(
    contextToolbarPosition(
      [n],
      n,
      { x: 0, y: 0, zoom: 1 },
      { width: 390, height: 600 },
    ),
  ).toBeNull();
});
