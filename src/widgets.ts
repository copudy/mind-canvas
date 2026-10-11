import { makeItem, type Point } from "./model";
export type Widget =
  | { type: "icon"; symbol: string }
  | { type: "table"; cells: string[][] }
  | {
      type: "calendar";
      year: number;
      month: number;
      selected: string;
      notes: Record<string, string>;
    };
export const symbols = [
  "💡",
  "⭐",
  "🎯",
  "✅",
  "📌",
  "❤️",
  "📍",
  "🚀",
  "💰",
  "✈️",
  "🏠",
  "💼",
  "📚",
  "🌱",
  "⚠️",
  "🔔",
];
export function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function calendarDays(year: number, month: number) {
  const offset = new Date(year, month, 1).getDay(),
    count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
    i >= offset && i < offset + count ? i - offset + 1 : null,
  );
}
export function validDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  return (
    y >= 1970 &&
    y <= 2100 &&
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= new Date(y, m, 0).getDate()
  );
}
export function validWidget(v: unknown): v is Widget {
  if (!v || typeof v !== "object") return false;
  const w = v as Record<string, unknown>;
  if (w.type === "icon") return symbols.includes(String(w.symbol));
  const cells = w.cells;
  if (w.type === "table")
    return (
      Array.isArray(cells) &&
      cells.length >= 2 &&
      cells.length <= 12 &&
      Array.isArray(cells[0]) &&
      cells.every(
        (row) =>
          Array.isArray(row) &&
          row.length >= 2 &&
          row.length <= 10 &&
          row.length === cells[0].length &&
          row.every((s: unknown) => typeof s === "string" && s.length <= 1000),
      )
    );
  if (w.type === "calendar")
    return (
      Number.isInteger(w.year) &&
      Number(w.year) >= 1970 &&
      Number(w.year) <= 2100 &&
      Number.isInteger(w.month) &&
      Number(w.month) >= 0 &&
      Number(w.month) <= 11 &&
      validDate(w.selected) &&
      !!w.notes &&
      typeof w.notes === "object" &&
      !Array.isArray(w.notes) &&
      Object.entries(w.notes).length <= 366 &&
      Object.entries(w.notes).every(
        ([k, s]) => validDate(k) && typeof s === "string" && s.length <= 1000,
      )
    );
  return false;
}
export function makeWidget(type: Widget["type"], position: Point) {
  const n = makeItem(
    "rectangle",
    position,
    { icon: "圖示", table: "我的表格", calendar: "小日曆" }[type],
  );
  n.autoSize = false;
  if (type === "icon") {
    n.widget = { type, symbol: "💡" };
    n.width = 190;
    n.height = 180;
  }
  if (type === "table") {
    n.widget = {
      type,
      cells: [
        ["項目", "內容", "備註"],
        ["第一項", "", ""],
        ["第二項", "", ""],
      ],
    };
    n.width = 440;
    n.height = 260;
  }
  if (type === "calendar") {
    const t = new Date();
    n.widget = {
      type,
      year: t.getFullYear(),
      month: t.getMonth(),
      selected: dayKey(t.getFullYear(), t.getMonth(), t.getDate()),
      notes: {},
    };
    n.width = 330;
    n.height = 435;
  }
  return n;
}
