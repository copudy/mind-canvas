import { it, expect } from "vitest";
import { routeConnector, type Rect } from "./router";
it("routes a representative 60-object board within an interactive budget", () => {
  const root: Rect = { x: 0, y: 0, width: 180, height: 56 };
  const rectangles: Rect[] = [
    root,
    ...Array.from({ length: 39 }, (_, i) => ({
      x: 330 + (i % 3) * 260,
      y: (Math.floor(i / 3) - 6) * 100,
      width: 180,
      height: 56,
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      x: -300 - (i % 2) * 250,
      y: (Math.floor(i / 2) - 5) * 100,
      width: 160,
      height: 70,
    })),
  ];
  const start = performance.now();
  let blocked = 0;
  for (let i = 1; i < 40; i++) {
    const route = routeConnector(
      root,
      rectangles[i],
      rectangles.filter((_, j) => j !== 0 && j !== i),
    );
    if (route.blocked) blocked++;
  }
  const elapsed = performance.now() - start;
  console.log(
    `PERFORMANCE 60 objects / 39 connectors: ${elapsed.toFixed(1)}ms; blocked=${blocked}`,
  );
  expect(elapsed).toBeLessThan(2000);
  expect(blocked).toBe(0);
});
