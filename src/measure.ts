import type { Item } from "./model";
let context: CanvasRenderingContext2D | null = null;
export function autosize(n: Item) {
  if (!n.autoSize || n.kind === "calculator") return;
  if (typeof document === "undefined") return;
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return;
  context.font = `${n.bold ? "600" : "400"} ${n.fontSize}px "Segoe UI", sans-serif`;
  const pad = n.kind === "text" ? 12 : 30;
  const max = n.maxWidth - pad;
  let lines = 0,
    widest = 0;
  for (const line of n.text.split("\n")) {
    let width = 0;
    lines++;
    for (const char of line) {
      const w = context.measureText(char).width;
      if (width + w > max) {
        widest = Math.max(widest, width);
        lines++;
        width = 0;
      }
      width += w;
    }
    widest = Math.max(widest, width);
  }
  n.width = Math.min(
    n.maxWidth,
    Math.max(n.kind === "sticky" ? 170 : 90, Math.ceil(widest + pad)),
  );
  n.height = Math.min(
    3000,
    Math.max(
      n.kind === "sticky" ? 100 : 48,
      Math.ceil(lines * n.fontSize * 1.55 + pad),
    ),
  );
}
