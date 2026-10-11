import type { Item } from "../model";
import { calendarDays, dayKey, symbols, type Widget } from "../widgets";
export default function CanvasWidget({
  item,
  patch,
  checkpoint,
  edit,
}: {
  item: Item;
  patch: (p: Partial<Item>, record?: boolean) => void;
  checkpoint: () => void;
  edit: () => void;
}) {
  const w = item.widget!;
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
        onKeyDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
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
            <div className="widget-table-scroll">
              <table
                aria-label="可編輯表格"
                style={{ minWidth: w.cells[0].length * 100 }}
              >
                <tbody>
                  {w.cells.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>
                          <input
                            aria-label={`表格第 ${i + 1} 列第 ${j + 1} 欄`}
                            value={cell}
                            onFocus={checkpoint}
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
                      (w.cells.length + 1) * 42 + 100,
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
                    update({ ...w, cells: w.cells.slice(0, -1) });
                }}
              >
                －列
              </button>
              <button
                disabled={w.cells[0].length <= 2}
                onClick={() => {
                  if (confirm("刪除最後一欄及其內容？"))
                    update({ ...w, cells: w.cells.map((r) => r.slice(0, -1)) });
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
