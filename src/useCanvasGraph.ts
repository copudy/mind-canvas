import { useMemo } from "react";
import { hiddenIds, type Board } from "./model";
import { routeConnector, rectOf } from "./router";
import type { FlowNode } from "./components/CanvasNode";
import type { FlowEdge } from "./components/Connector";
export function useCanvasGraph(
  board: Board | null,
  selected: string[],
  selectedEdge: string | null,
  mount: { id: string; index: number } | null,
) {
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
    ]),
    board?.relations,
    board?.treeStyle,
  ]);
  const routed = useMemo(() => {
    if (!board) return [];
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
        const route = routeConnector(
          rectOf(a),
          rectOf(b),
          visible.filter((n) => n.id !== a.id && n.id !== b.id).map(rectOf),
          r.sourceSide,
          r.targetSide,
          r.waypoints,
        );
        return {
          id: r.id,
          type: "orthogonal" as const,
          source: r.source,
          target: r.target,
          sourceHandle: route.sourceSide,
          targetHandle: route.targetSide,
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
