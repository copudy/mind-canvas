import type { Item, Point, Side } from "./model";
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: string;
}
export const rectOf = (n: Item): Rect => ({
  ...n.position,
  width: n.width,
  height: n.height,
  id: n.id,
});
const sides: Side[] = ["right", "left", "bottom", "top"];
export function port(r: Rect, s: Side): Point {
  return s === "left"
    ? { x: r.x, y: r.y + r.height / 2 }
    : s === "right"
      ? { x: r.x + r.width, y: r.y + r.height / 2 }
      : s === "top"
        ? { x: r.x + r.width / 2, y: r.y }
        : { x: r.x + r.width / 2, y: r.y + r.height };
}
function stub(p: Point, s: Side): Point {
  return {
    x: p.x + (s === "left" ? -20 : s === "right" ? 20 : 0),
    y: p.y + (s === "top" ? -20 : s === "bottom" ? 20 : 0),
  };
}
export function segmentHits(a: Point, b: Point, r: Rect): boolean {
  const epsilon = 0.01;
  if (a.x === b.x)
    return (
      a.x > r.x + epsilon &&
      a.x < r.x + r.width - epsilon &&
      Math.max(a.y, b.y) > r.y + epsilon &&
      Math.min(a.y, b.y) < r.y + r.height - epsilon
    );
  if (a.y === b.y)
    return (
      a.y > r.y + epsilon &&
      a.y < r.y + r.height - epsilon &&
      Math.max(a.x, b.x) > r.x + epsilon &&
      Math.min(a.x, b.x) < r.x + r.width - epsilon
    );
  return true;
}
export function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    if (out.length && p.x === out.at(-1)!.x && p.y === out.at(-1)!.y) continue;
    while (
      out.length > 1 &&
      ((out.at(-2)!.x === out.at(-1)!.x && out.at(-1)!.x === p.x) ||
        (out.at(-2)!.y === out.at(-1)!.y && out.at(-1)!.y === p.y))
    )
      out.pop();
    out.push(p);
  }
  return out;
}
function search(a: Point, b: Point, obstacles: Rect[]): Point[] | null {
  const xs = [
      ...new Set([a.x, b.x, ...obstacles.flatMap((r) => [r.x, r.x + r.width])]),
    ].sort((x, y) => x - y),
    ys = [
      ...new Set([
        a.y,
        b.y,
        ...obstacles.flatMap((r) => [r.y, r.y + r.height]),
      ]),
    ].sort((x, y) => x - y);
  const ix = xs.indexOf(a.x),
    iy = ys.indexOf(a.y),
    tx = xs.indexOf(b.x),
    ty = ys.indexOf(b.y);
  const key = (x: number, y: number, d: number) => `${x},${y},${d}`;
  const open: [number, number, number, number][] = [[ix, iy, 0, 0]],
    dist = new Map<string, number>([[key(ix, iy, 0), 0]]),
    prev = new Map<string, string>();
  let end: string | undefined;
  let count = 0;
  while (open.length && count++ < 18000) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      const f = (n: number[]) =>
        n[3] + Math.abs(xs[n[0]] - b.x) + Math.abs(ys[n[1]] - b.y);
      if (f(open[i]) < f(open[best])) best = i;
    }
    const [x, y, d, cost] = open.splice(best, 1)[0],
      k = key(x, y, d);
    if (cost !== dist.get(k)) continue;
    if (x === tx && y === ty) {
      end = k;
      break;
    }
    for (const [nx, ny, nd] of [
      [x - 1, y, 1],
      [x + 1, y, 1],
      [x, y - 1, 2],
      [x, y + 1, 2],
    ]) {
      if (nx < 0 || ny < 0 || nx >= xs.length || ny >= ys.length) continue;
      const p = { x: xs[x], y: ys[y] },
        q = { x: xs[nx], y: ys[ny] };
      if (obstacles.some((r) => segmentHits(p, q, r))) continue;
      const nc =
          cost +
          Math.abs(p.x - q.x) +
          Math.abs(p.y - q.y) +
          (d && d !== nd ? 28 : 0),
        nk = key(nx, ny, nd);
      if (nc < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nc);
        prev.set(nk, k);
        open.push([nx, ny, nd, nc]);
      }
    }
  }
  if (!end) return null;
  const points: Point[] = [];
  let k: string | undefined = end;
  while (k) {
    const [x, y] = k.split(",").map(Number);
    points.push({ x: xs[x], y: ys[y] });
    k = prev.get(k);
  }
  return simplify(points.reverse());
}
export interface Route {
  points: Point[];
  path: string;
  sourceSide: Side;
  targetSide: Side;
  blocked: boolean;
}
export function roundedPath(points: Point[], radius = 10): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1],
      l1 = Math.abs(b.x - a.x) + Math.abs(b.y - a.y),
      l2 = Math.abs(c.x - b.x) + Math.abs(c.y - b.y),
      r = Math.min(radius, l1 / 2, l2 / 2);
    const before = {
        x: b.x - Math.sign(b.x - a.x) * r,
        y: b.y - Math.sign(b.y - a.y) * r,
      },
      after = {
        x: b.x + Math.sign(c.x - b.x) * r,
        y: b.y + Math.sign(c.y - b.y) * r,
      };
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    d += ` L ${before.x} ${before.y} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${after.x} ${after.y}`;
  }
  const last = points.at(-1)!;
  return d + ` L ${last.x} ${last.y}`;
}
export function routeConnector(
  source: Rect,
  target: Rect,
  others: Rect[],
  manualSource?: Side,
  manualTarget?: Side,
  waypoints?: Point[],
): Route {
  const obstacles = [source, target, ...others].map((r) => ({
    ...r,
    x: r.x - 12,
    y: r.y - 12,
    width: r.width + 24,
    height: r.height + 24,
  }));
  const pairs = (manualSource ? [manualSource] : sides)
    .flatMap((s) =>
      (manualTarget ? [manualTarget] : sides).map((t) => ({
        s,
        t,
        score:
          Math.abs(port(source, s).x - port(target, t).x) +
          Math.abs(port(source, s).y - port(target, t).y),
      })),
    )
    .sort((a, b) => a.score - b.score);
  for (const { s, t } of pairs) {
    const a = port(source, s),
      b = port(target, t),
      start = stub(a, s),
      end = stub(b, t);
    if (
      [target, ...others].some((r) => segmentHits(a, start, r)) ||
      [source, ...others].some((r) => segmentHits(end, b, r))
    )
      continue;
    const via = [start, ...(waypoints || []), end];
    const paths: Point[][] = [];
    let valid = true;
    for (let i = 1; i < via.length; i++) {
      const path = search(via[i - 1], via[i], obstacles);
      if (!path) {
        valid = false;
        break;
      }
      paths.push(path);
    }
    if (valid) {
      const points = simplify([a, ...paths.flat(), b]);
      return {
        points,
        path: roundedPath(points),
        sourceSide: s,
        targetSide: t,
        blocked: false,
      };
    }
  }
  // Overlapping objects may make a collision-free connection geometrically impossible.
  const { s, t } = pairs[0],
    a = port(source, s),
    b = port(target, t),
    start = stub(a, s),
    end = stub(b, t);
  const outside = Math.min(source.y, target.y, ...others.map((r) => r.y)) - 40;
  const points = simplify([
    a,
    start,
    { x: start.x, y: outside },
    { x: end.x, y: outside },
    end,
    b,
  ]);
  return {
    points,
    path: roundedPath(points),
    sourceSide: s,
    targetSide: t,
    blocked: true,
  };
}
