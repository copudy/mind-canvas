import { listIds } from "./rich";
import { useMemo, useRef } from "react";
import { hiddenIds, type Board } from "./model";
import { routeConnector, rectOf, type Route } from "./router";
import type { FlowNode } from "./components/CanvasNode";
import type { FlowEdge } from "./components/Connector";
export function useCanvasGraph(
  board: Board | null,
  selected: string[],
  selectedEdge: string | null,
  mount: { id: string; index: number } | null,
  listMetrics: Record<string, Record<string, number>> = {},
) {
  const previous = useRef<{ boardId: string; routes: Map<string, Route> }>({
    boardId: "",
    routes: new Map(),
  });
  const hidden = useMemo(
    () => (board ? hiddenIds(board) : new Set<string>()),
    [board],
  );
  const visible =
    board?.nodes.filter((n) => !hidden.has(n.id) && !n.floating) || [];
  const nodes: FlowNode[] = visible.map((n) => ({
    id: n.id,
    type: "canvas",
    position: n.position,
    width: n.width,
    height: n.height,
    measured: { width: n.width, height: n.height },
    style: { width: n.width, height: n.height },
    selected: selected.includes(n.id),
    data: {
      item: n,
      mountPreview:
        mount?.id === n.id
          ? `掛載 · 第 ${mount.index + 1} 個子節點`
          : undefined,
    },
    draggable: !board?.guide,
    selectable: !board?.guide,
    connectable: !board?.guide,
  }));
  // Text/calculator edits and selection do not invalidate geometry routes.
  const geometry = JSON.stringify([
    visible.map((n) => [
      n.id,
      n.position,
      n.width,
      n.height,
      n.parentId,
      n.treeStyle,
      listIds(n.rich),
      listMetrics[n.id],
    ]),
    board?.relations,
    board?.treeStyle,
  ]);
  const routed = useMemo(() => {
    if (!board) return [];
    if (previous.current.boardId !== board.boardId)
      previous.current = { boardId: board.boardId, routes: new Map() };
    const map = new Map(visible.map((n) => [n.id, n]));
    const relations = [
      ...board.relations.map((r) => ({ ...r, tree: false })),
      ...visible
        .filter((n) => n.parentId && map.has(n.parentId))
        .map((n) => ({
          id: `tree:${n.id}`,
          source: n.parentId!,
          target: n.id,
          ...(() => {
            let p = n;
            while (p.parentId && map.has(p.parentId)) p = map.get(p.parentId)!;
            return p.treeStyle || board.treeStyle;
          })(),
          tree: true,
          sourceItem: undefined,
          targetItem: undefined,
          sourceSide: undefined,
          targetSide: undefined,
          waypoints: undefined,
        })),
    ];
    return relations
      .filter((r) => map.has(r.source) && map.has(r.target))
      .map((r) => {
        const a = map.get(r.source)!,
          b = map.get(r.target)!;
        const anchor = (
          n: typeof a,
          key: string | undefined,
          side: "left" | "right",
        ) =>
          key
            ? {
                x: n.position.x + (side === "right" ? n.width : 0),
                y:
                  n.position.y +
                  (listMetrics[n.id]?.[key] ??
                    36 +
                      Math.max(0, listIds(n.rich).indexOf(key)) *
                        n.fontSize *
                        1.7),
              }
            : undefined;
        const sourceSide = r.sourceItem
          ? r.sourceSide || "right"
          : r.sourceSide;
        const targetSide = r.targetItem ? r.targetSide || "left" : r.targetSide;
        const sourceAnchor = anchor(
            a,
            r.sourceItem,
            sourceSide === "left" ? "left" : "right",
          ),
          targetAnchor = anchor(
            b,
            r.targetItem,
            targetSide === "right" ? "right" : "left",
          );
        let route = routeConnector(
          rectOf(a),
          rectOf(b),
          visible.filter((n) => n.id !== a.id && n.id !== b.id).map(rectOf),
          sourceSide,
          targetSide,
          r.waypoints,
          { source: sourceAnchor, target: targetAnchor },
        );
        const old = previous.current.routes.get(r.id);
        if (
          old &&
          !r.sourceSide &&
          !r.targetSide &&
          !r.sourceItem &&
          !r.targetItem &&
          !r.waypoints?.length &&
          !route.blocked
        ) {
          const stable = routeConnector(
            rectOf(a),
            rectOf(b),
            visible.filter((n) => n.id !== a.id && n.id !== b.id).map(rectOf),
            old.sourceSide,
            old.targetSide,
          );
          const score = (v: Route) =>
            v.points.reduce(
              (sum, p, i) =>
                i
                  ? sum +
                    Math.abs(p.x - v.points[i - 1].x) +
                    Math.abs(p.y - v.points[i - 1].y)
                  : 0,
              0,
            ) +
            (v.points.length - 2) * 32;
          if (!stable.blocked && score(stable) <= score(route) * 1.15 + 16)
            route = stable;
        }
        previous.current.routes.set(r.id, route);
        return {
          id: r.id,
          type: "orthogonal" as const,
          source: r.source,
          target: r.target,
          sourceHandle: r.sourceItem
            ? `item:${r.sourceItem}:${r.sourceSide || "right"}`
            : route.sourceSide,
          targetHandle: r.targetItem
            ? `item:${r.targetItem}:${r.targetSide || "left"}`
            : route.targetSide,
          selectable: !r.tree,
          data: { path: route.path, blocked: route.blocked, tree: r.tree },
          style: {
            stroke: r.color,
            strokeWidth: r.width,
            strokeDasharray: r.dashed ? "7 5" : undefined,
          },
        };
      });
  }, [geometry]);
  const edges: FlowEdge[] = routed.map((e) => ({
    ...e,
    selected: selectedEdge === e.id,
  }));
  return {
    hidden,
    visible,
    nodes,
    edges,
    blocked: routed.filter((e) => e.data.blocked).length,
  };
}
