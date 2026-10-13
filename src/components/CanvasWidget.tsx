import { useState, useRef, useEffect } from "react";
import { resizeTable, type CellStyle } from "../widgets";
import type { Item } from "../model";
import { calendarDays, dayKey, symbols, type Widget } from "../widgets";
export default function CanvasWidget({
  item,
  patch,
  checkpoint,
  edit,
  undo,
  redo,
}: {
  item: Item;
  patch: (p: Partial<Item>, record?: boolean) => void;
  checkpoint: () => void;
  edit: () => void;
  undo: () => void;
  redo: () => void;
}) {
  const [selectedCells, setCells] = useState<string[]>(["0:0"]);
  const anchor = useRef<[number, number]>([0, 0]);
  const scrollTouch = useRef<{ x: number; y: number } | null>(null);
  const w = item.widget!;
  const [rangeMode, setRangeMode] = useState(false);
  useEffect(() => {
    if (w.type !== "table") return;
    const rows = w.cells.length,
      cols = w.cells[0].length;
    setCells((old) => {
      const kept = old.filter((key) => {
        const [r, c] = key.split(":").map(Number);
        return r < rows && c < cols;
      });
      return kept.length ? kept : ["0:0"];
    });
    anchor.current = [
      Math.min(anchor.current[0], rows - 1),
      Math.min(anchor.current[1], cols - 1),
    ];
  }, [
    w.type,
    w.type === "table" ? w.cells.length : 0,
    w.type === "table" ? w.cells[0].length : 0,
  ]);
  const format = (style: CellStyle | null) => {
    if (w.type !== "table") return;
    const styles = { ...w.styles };
    for (const key of selectedCells.filter((key) => {
      const [r, c] = key.split(":").map(Number);
      return r < w.cells.length && c < w.cells[0].length;
    })) {
      if (style) styles[key] = { ...styles[key], ...style };
      else delete styles[key];
    }
    update({ ...w, styles });
  };
  const select = (i: number, j: number, shift = false, multi = false) => {
    const key = `${i}:${j}`;
    if (shift) {
      const [r, c] = anchor.current;
      setCells(
        w.type === "table"
          ? w.cells.flatMap((row, a) =>
              row.flatMap((_, b) =>
                a >= Math.min(r, i) &&
                a <= Math.max(r, i) &&
                b >= Math.min(c, j) &&
                b <= Math.max(c, j)
                  ? [`${a}:${b}`]
                  : [],
              ),
            )
          : [],
      );
    } else {
      anchor.current = [i, j];
      setCells((old) =>
        multi
          ? old.includes(key)
            ? old.filter((k) => k !== key)
            : [...old, key]
          : [key],
      );
    }
  };
  const update = (widget: Widget, record = true) => patch({ widget }, record);
  return (
    <div className="canvas-widget">
      <strong
        className="widget-title"
        title="雙擊或按 F2 修改標題"
        onDoubleClick={edit}
      >
        {item.text}
      </strong>
      <div
        className="widget-body nodrag nowheel"
        onKeyDown={(e) => {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const dataInput = target.matches("textarea,input:not([type=color])");
          if (
            (e.ctrlKey || e.metaKey) &&
            e.key.toLowerCase() === "z" &&
            !dataInput
          ) {
            e.preventDefault();
            e.shiftKey ? redo() : undo();
          }
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.pointerType === "touch" && e.isPrimary)
            scrollTouch.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "touch" || !scrollTouch.current) return;
          const dx = e.clientX - scrollTouch.current.x,
            dy = e.clientY - scrollTouch.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) {
            e.currentTarget.scrollTop -= dy;
            e.currentTarget.scrollLeft -= dx;
            scrollTouch.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerUp={() => {
          scrollTouch.current = null;
        }}
        onPointerCancel={() => {
          scrollTouch.current = null;
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {w.type === "icon" && (
          <>
            <div
              className="widget-symbol"
              role="img"
              aria-label={`圖示 ${w.symbol}`}
            >
              {w.symbol}
            </div>
            <label>
              選擇圖示
              <select
                aria-label="選擇圖示"
                value={w.symbol}
                onChange={(e) => update({ ...w, symbol: e.target.value })}
              >
                {symbols.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {w.type === "table" && (
          <>
            <div className="table-format-controls">
              <label>
                底色
                <input
                  aria-label="儲存格背景色"
                  type="color"
                  value={
                    w.styles?.[selectedCells[0]]?.background === "transparent"
                      ? "#ffffff"
                      : w.styles?.[selectedCells[0]]?.background || "#ffffff"
                  }
                  onChange={(e) => format({ background: e.target.value })}
                />
              </label>
              <label>
                字色
                <input
                  aria-label="儲存格文字色"
                  type="color"
                  value={w.styles?.[selectedCells[0]]?.color || "#23344c"}
                  onChange={(e) => format({ color: e.target.value })}
                />
              </label>
              <select
                aria-label="儲存格對齊"
                value={w.styles?.[selectedCells[0]]?.align || "left"}
                onChange={(e) =>
                  format({ align: e.target.value as CellStyle["align"] })
                }
              >
                <option value="left">靠左</option>
                <option value="center">置中</option>
                <option value="right">靠右</option>
              </select>
              <button
                aria-label="儲存格粗體"
                onClick={() =>
                  format({ bold: !w.styles?.[selectedCells[0]]?.bold })
                }
              >
                B
              </button>
              <button
                aria-label="儲存格斜體"
                onClick={() =>
                  format({ italic: !w.styles?.[selectedCells[0]]?.italic })
                }
              >
                I
              </button>
              <button onClick={() => format(null)}>清除格式</button>
              <button
                aria-label="選取儲存格範圍"
                aria-pressed={rangeMode}
                onClick={() => setRangeMode(!rangeMode)}
              >
                範圍
              </button>
              <small>
                已選 {selectedCells.length} 格 · Shift／範圍點選 · Ctrl 多選
              </small>
            </div>
            <div className="widget-table-scroll">
              <table
                aria-label="可編輯表格"
                style={{ minWidth: w.cells[0].length * 100 }}
              >
                <thead>
                  <tr>
                    <th>
                      <button
                        aria-label="選取整張表格"
                        onClick={() =>
                          setCells(
                            w.cells.flatMap((r, i) =>
                              r.map((_, j) => `${i}:${j}`),
                            ),
                          )
                        }
                      >
                        全部
                      </button>
                    </th>
                    {w.cells[0].map((_, j) => (
                      <th key={j}>
                        <button
                          aria-label={`選取第 ${j + 1} 欄`}
                          onClick={() =>
                            setCells(w.cells.map((_, i) => `${i}:${j}`))
                          }
                        >
                          {String.fromCharCode(65 + j)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {w.cells.map((row, i) => (
                    <tr key={i}>
                      <th>
                        <button
                          aria-label={`選取第 ${i + 1} 列`}
                          onClick={() =>
                            setCells(row.map((_, j) => `${i}:${j}`))
                          }
                        >
                          {i + 1}
                        </button>
                      </th>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={
                            selectedCells.includes(`${i}:${j}`)
                              ? "cell-selected"
                              : ""
                          }
                          style={{
                            background: w.styles?.[`${i}:${j}`]?.background,
                            color: w.styles?.[`${i}:${j}`]?.color,
                            textAlign: w.styles?.[`${i}:${j}`]?.align,
                            fontWeight:
                              w.styles?.[`${i}:${j}`]?.bold === false
                                ? 400
                                : w.styles?.[`${i}:${j}`]?.bold
                                  ? 700
                                  : undefined,
                            fontStyle: w.styles?.[`${i}:${j}`]?.italic
                              ? "italic"
                              : "normal",
                          }}
                        >
                          <input
                            aria-label={`表格第 ${i + 1} 列第 ${j + 1} 欄`}
                            value={cell}
                            onPointerDown={(e) =>
                              select(
                                i,
                                j,
                                e.shiftKey || rangeMode,
                                e.ctrlKey || e.metaKey,
                              )
                            }
                            style={{ textAlign: "inherit" }}
                            onFocus={() => {
                              checkpoint();
                              setCells((old) =>
                                old.includes(`${i}:${j}`) ? old : [`${i}:${j}`],
                              );
                            }}
                            maxLength={1000}
                            onChange={(e) => {
                              if (e.target.value !== cell) {
                                const cells = w.cells.map((r) => [...r]);
                                cells[i][j] = e.target.value;
                                update({ ...w, cells }, false);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="widget-actions">
              <button
                disabled={w.cells.length >= 12}
                onClick={() =>
                  patch({
                    widget: {
                      ...w,
                      cells: [...w.cells, w.cells[0].map(() => "")],
                    },
                    height: Math.max(
                      item.height,
                      (w.cells.length + 1) * 42 + 190,
                    ),
                  })
                }
              >
                ＋列
              </button>
              <button
                disabled={w.cells[0].length >= 10}
                onClick={() =>
                  update({ ...w, cells: w.cells.map((r) => [...r, ""]) })
                }
              >
                ＋欄
              </button>
              <button
                disabled={w.cells.length <= 2}
                onClick={() => {
                  if (confirm("刪除最後一列及其內容？"))
                    update(resizeTable(w, w.cells.slice(0, -1)));
                }}
              >
                －列
              </button>
              <button
                disabled={w.cells[0].length <= 2}
                onClick={() => {
                  if (confirm("刪除最後一欄及其內容？"))
                    update(
                      resizeTable(
                        w,
                        w.cells.map((r) => r.slice(0, -1)),
                      ),
                    );
                }}
              >
                －欄
              </button>
            </div>
          </>
        )}
        {w.type === "calendar" && (
          <>
            <div className="widget-month">
              <button
                aria-label="上一個月"
                disabled={w.year === 1970 && w.month === 0}
                onClick={() => {
                  const d = new Date(w.year, w.month - 1, 1);
                  update({ ...w, year: d.getFullYear(), month: d.getMonth() });
                }}
              >
                ‹
              </button>
              <strong>
                {w.year} 年 {w.month + 1} 月
              </strong>
              <button
                aria-label="下一個月"
                disabled={w.year === 2100 && w.month === 11}
                onClick={() => {
                  const d = new Date(w.year, w.month + 1, 1);
                  update({ ...w, year: d.getFullYear(), month: d.getMonth() });
                }}
              >
                ›
              </button>
            </div>
            <div className="widget-calendar">
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                <span key={d}>{d}</span>
              ))}
              {calendarDays(w.year, w.month).map((d, i) =>
                d === null ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    aria-label={`日期 ${dayKey(w.year, w.month, d)}`}
                    aria-pressed={w.selected === dayKey(w.year, w.month, d)}
                    className={
                      w.notes[dayKey(w.year, w.month, d)] ? "has-note" : ""
                    }
                    onClick={() =>
                      update({ ...w, selected: dayKey(w.year, w.month, d) })
                    }
                  >
                    {d}
                  </button>
                ),
              )}
            </div>
            <label>
              {w.selected} · 記事
              <textarea
                key={w.selected}
                aria-label="日期記事"
                value={w.notes[w.selected] || ""}
                onFocus={checkpoint}
                maxLength={1000}
                disabled={
                  !w.notes[w.selected] && Object.keys(w.notes).length >= 366
                }
                placeholder="記下行程或待辦…"
                onChange={(e) => {
                  if (e.target.value !== (w.notes[w.selected] || "")) {
                    const notes = { ...w.notes };
                    if (e.target.value.trim())
                      notes[w.selected] = e.target.value;
                    else delete notes[w.selected];
                    update({ ...w, notes }, false);
                  }
                }}
              />
            </label>
            {Object.keys(w.notes).length >= 366 && (
              <small>已達 366 筆記事，請先備份並整理。</small>
            )}
          </>
        )}
      </div>
    </div>
  );
}
