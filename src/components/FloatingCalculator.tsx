import { useRef, useState } from "react";
import { Pin, X } from "lucide-react";
import { Calculator } from "./CanvasNode";
import type { Item } from "../model";
export default function FloatingCalculator({
  item,
  onChange,
  onPin,
  onClose,
  onInsert,
}: {
  item: Item;
  onChange: (item: Item) => void;
  onPin: () => void;
  onClose: () => void;
  onInsert: () => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  return (
    <div
      className="floating-calculator"
      style={{ transform: `translate(${position.x}px,${position.y}px)` }}
    >
      <div
        className="floating-title"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            px: position.x,
            py: position.y,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d)
            setPosition({
              x: d.px + e.clientX - d.x,
              y: d.py + e.clientY - d.y,
            });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <span>⠿ 浮動計算機</span>
        <button aria-label="釘選浮動計算機" title="釘選到畫布" onClick={onPin}>
          <Pin size={16} />
        </button>
        <button aria-label="關閉浮動計算機" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <Calculator
        item={item}
        onChange={(p) => onChange({ ...item, ...p })}
        onInsert={onInsert}
      />
    </div>
  );
}
