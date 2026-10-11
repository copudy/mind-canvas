import {
  childrenOf,
  hiddenIds,
  branchIds,
  type Board,
  type Item,
  type LayoutMode,
} from "./model";
function intersects(a: Item, x: number, y: number, w: number, h: number) {
  return (
    x < a.position.x + a.width + 20 &&
    x + w + 20 > a.position.x &&
    y < a.position.y + a.height + 20 &&
    y + h + 20 > a.position.y
  );
}
export function layoutTree(b: Board, root: string, mode: LayoutMode): void {
  const found = b.nodes.find((n) => n.id === root);
  if (!found) return;
  const r: Item = found;
  r.layout = mode;
  const hidden = hiddenIds(b),
    branch = branchIds(b, root);
  const fixed = b.nodes.filter(
    (n) =>
      !hidden.has(n.id) &&
      (!branch.has(n.id) || n.mode !== "Auto" || n.id === root),
  );
  const placed: Item[] = [...fixed];
  const heights = new Map<string, number>();
  function span(n: Item): number {
    const cs = n.collapsed ? [] : childrenOf(b, n.id);
    const h = Math.max(
      n.height,
      cs.reduce((v, c) => v + span(c), 0) + Math.max(0, cs.length - 1) * 36,
    );
    heights.set(n.id, h);
    return h;
  }
  span(r);
  function place(n: Item, x: number, y: number) {
    if (n.mode !== "Auto") return;
    let attempts = 0;
    while (
      placed.some(
        (o) => o.id !== n.id && intersects(o, x, y, n.width, n.height),
      ) &&
      attempts++ < 200
    )
      y += 24;
    n.position = { x, y };
    placed.push(n);
  }
  function walk(n: Item, direction: number) {
    if (n.collapsed) return;
    const cs = childrenOf(b, n.id);
    let y =
      n.position.y +
      n.height / 2 -
      (cs.reduce((v, c) => v + (heights.get(c.id) || c.height), 0) +
        Math.max(0, cs.length - 1) * 36) /
        2;
    cs.forEach((c) => {
      const h = heights.get(c.id) || c.height;
      place(
        c,
        direction > 0
          ? n.position.x + n.width + 110
          : n.position.x - c.width - 110,
        y + (h - c.height) / 2,
      );
      walk(c, direction);
      y += h + 36;
    });
  }
  const cs = childrenOf(b, r.id);
  if (r.collapsed) return;
  if (mode === "right") walk(r, 1);
  else if (mode === "split") {
    const groups = [
      cs.filter((_, i) => i % 2 === 0),
      cs.filter((_, i) => i % 2 === 1),
    ];
    groups.forEach((group, i) => {
      const direction = i === 0 ? 1 : -1;
      let y =
        r.position.y +
        r.height / 2 -
        (group.reduce((v, c) => v + (heights.get(c.id) || c.height), 0) +
          Math.max(0, group.length - 1) * 36) /
          2;
      for (const c of group) {
        const h = heights.get(c.id) || c.height;
        place(
          c,
          direction > 0
            ? r.position.x + r.width + 110
            : r.position.x - c.width - 110,
          y + (h - c.height) / 2,
        );
        walk(c, direction);
        y += h + 36;
      }
    });
  } else {
    function radial(n: Item, start: number, end: number, depth: number) {
      if (n.collapsed) return;
      const children = childrenOf(b, n.id);
      children.forEach((c, i) => {
        const a = start + ((end - start) * (i + 0.5)) / children.length;
        const radius = 290 + depth * 260;
        place(
          c,
          r.position.x + r.width / 2 + Math.cos(a) * radius - c.width / 2,
          r.position.y + r.height / 2 + Math.sin(a) * radius - c.height / 2,
        );
        radial(
          c,
          start + ((end - start) * i) / children.length,
          start + ((end - start) * (i + 1)) / children.length,
          depth + 1,
        );
      });
    }
    radial(r, -Math.PI, Math.PI, 0);
  }
}
export function snapPosition(
  b: Board,
  ids: Set<string>,
  position: { x: number; y: number },
  node: Item,
  tolerance = 7,
) {
  let x = position.x,
    y = position.y;
  let gx: number | undefined, gy: number | undefined;
  let dx = tolerance,
    dy = tolerance;
  for (const other of b.nodes) {
    if (ids.has(other.id) || hiddenIds(b).has(other.id)) continue;
    for (const [a, offset] of [
      [other.position.x, 0],
      [other.position.x + other.width / 2, node.width / 2],
      [other.position.x + other.width, node.width],
    ]) {
      const diff = Math.abs(position.x + offset - a);
      if (diff < dx) {
        dx = diff;
        x = a - offset;
        gx = a;
      }
    }
    for (const [a, offset] of [
      [other.position.y, 0],
      [other.position.y + other.height / 2, node.height / 2],
      [other.position.y + other.height, node.height],
    ]) {
      const diff = Math.abs(position.y + offset - a);
      if (diff < dy) {
        dy = diff;
        y = a - offset;
        gy = a;
      }
    }
  }
  return { position: { x, y }, gx, gy };
}
