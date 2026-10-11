import type { Item, Board } from "./model";
/** Prefer nearby empty space; never cover another editable object. */
export function contextToolbarPosition(
  items: Item[],
  selected: Item,
  viewport: Board["viewport"],
  area: { width: number; height: number },
  leftInset = 0,
  rightInset = 0,
) {
  const width = Math.min(620, area.width - leftInset - rightInset - 24),
    height = 54;
  if (width < 160) return null;
  const left = Math.max(
    leftInset + 12,
    Math.min(
      selected.position.x * viewport.zoom + viewport.x,
      area.width - rightInset - width - 12,
    ),
  );
  const boxes = items.map((n) => ({
    left: n.position.x * viewport.zoom + viewport.x,
    top: n.position.y * viewport.zoom + viewport.y,
    right: (n.position.x + n.width) * viewport.zoom + viewport.x,
    bottom: (n.position.y + n.height) * viewport.zoom + viewport.y,
  }));
  const selectedTop = selected.position.y * viewport.zoom + viewport.y,
    selectedBottom =
      (selected.position.y + selected.height) * viewport.zoom + viewport.y;
  for (const direction of [-1, 1]) {
    let top = direction < 0 ? selectedTop - height - 12 : selectedBottom + 12;
    for (let i = 0; i < 32; i++) {
      if (top < 12 || top + height > area.height - 180) break;
      const collisions = boxes.filter(
        (b) =>
          left < b.right + 4 &&
          left + width > b.left - 4 &&
          top < b.bottom + 4 &&
          top + height > b.top - 4,
      );
      if (!collisions.length)
        return { left, top, width, bottom: "auto" as const, transform: "none" };
      top =
        direction < 0
          ? Math.min(...collisions.map((b) => b.top)) - height - 12
          : Math.max(...collisions.map((b) => b.bottom)) + 12;
    }
  }
  return null;
}
