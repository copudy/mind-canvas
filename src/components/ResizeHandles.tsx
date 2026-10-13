import { useRef, useContext } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { CanvasContext } from "./CanvasNode";
import type { Item } from "../model";
const positions = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
] as const;
export default function ResizeHandles({
  item,
  minWidth,
  minHeight,
}: {
  item: Item;
  minWidth: number;
  minHeight: number;
}) {
  const actions = useContext(CanvasContext),
    rf = useReactFlow();
  const zoom = useViewport().zoom;
  const start = useRef<{
    x: number;
    y: number;
    zoom: number;
    item: Item;
    position: string;
  } | null>(null);
  return (
    <>
      {positions.map((position) => {
        const top = position.includes("top")
            ? "0%"
            : position.includes("bottom")
              ? "100%"
              : "50%",
          left = position.includes("left")
            ? "0%"
            : position.includes("right")
              ? "100%"
              : "50%";
        return (
          <button
            key={position}
            className={`resize-hit react-flow__resize-control handle nodrag ${position.split("-").join(" ")}`}
            aria-label={`縮放 ${position}`}
            style={{
              width: (matchMedia("(pointer:coarse)").matches ? 40 : 28) / zoom,
              height: (matchMedia("(pointer:coarse)").matches ? 40 : 28) / zoom,
              top,
              left,
              cursor:
                position === "left" || position === "right"
                  ? "ew-resize"
                  : position === "top" || position === "bottom"
                    ? "ns-resize"
                    : position === "top-left" || position === "bottom-right"
                      ? "nwse-resize"
                      : "nesw-resize",
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              actions.checkpoint();
              actions.beginGesture();
              start.current = {
                x: e.clientX,
                y: e.clientY,
                zoom: rf.getZoom(),
                item: structuredClone(item),
                position,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const a = start.current;
              if (!a || a.position !== position) return;
              e.preventDefault();
              e.stopPropagation();
              const dx = (e.clientX - a.x) / a.zoom,
                dy = (e.clientY - a.y) / a.zoom;
              const w = position.includes("left")
                ? Math.max(minWidth, Math.min(3000, a.item.width - dx))
                : position.includes("right")
                  ? Math.max(minWidth, Math.min(3000, a.item.width + dx))
                  : a.item.width;
              const h = position.includes("top")
                ? Math.max(minHeight, Math.min(3000, a.item.height - dy))
                : position.includes("bottom")
                  ? Math.max(minHeight, Math.min(3000, a.item.height + dy))
                  : a.item.height;
              actions.patch(
                item.id,
                {
                  width: w,
                  height: h,
                  autoSize: false,
                  position: {
                    x:
                      a.item.position.x +
                      (position.includes("left") ? a.item.width - w : 0),
                    y:
                      a.item.position.y +
                      (position.includes("top") ? a.item.height - h : 0),
                  },
                },
                false,
              );
            }}
            onPointerUp={(e) => {
              if (!start.current) return;
              e.stopPropagation();
              start.current = null;
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
              actions.endGesture();
            }}
            onPointerCancel={() => {
              const a = start.current;
              if (a)
                actions.patch(
                  item.id,
                  {
                    width: a.item.width,
                    height: a.item.height,
                    position: a.item.position,
                  },
                  false,
                );
              start.current = null;
              actions.endGesture();
            }}
          >
            <span
              style={{
                width: 9 / zoom,
                height: 9 / zoom,
                borderWidth: 2 / zoom,
              }}
            />
          </button>
        );
      })}
    </>
  );
}
