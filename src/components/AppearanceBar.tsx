import type { Item } from "../model";
export default function AppearanceBar({
  item,
  patch,
  advanced,
  reset,
}: {
  item: Item;
  patch: (p: Partial<Item>) => void;
  advanced: () => void;
  reset: () => void;
}) {
  return (
    <div
      className="appearance-bar"
      role="toolbar"
      aria-label="文字外觀"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label>
        字級
        <select
          aria-label="快捷字級"
          value={item.fontSize}
          onChange={(e) => patch({ fontSize: Number(e.target.value) })}
        >
          {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((n) => (
            <option key={n}>{n}</option>
          ))}
          {![12, 14, 16, 18, 20, 24, 28, 32, 40, 48].includes(
            item.fontSize,
          ) && <option>{item.fontSize}</option>}
        </select>
      </label>
      <button
        aria-label="快捷粗體"
        aria-pressed={item.bold}
        onClick={() => patch({ bold: !item.bold })}
      >
        B
      </button>
      <button
        aria-label="快捷斜體"
        aria-pressed={!!item.italic}
        onClick={() => patch({ italic: !item.italic })}
      >
        I
      </button>
      <select
        aria-label="文字對齊"
        value={item.textAlign || "left"}
        onChange={(e) =>
          patch({ textAlign: e.target.value as Item["textAlign"] })
        }
      >
        <option value="left">靠左</option>
        <option value="center">置中</option>
        <option value="right">靠右</option>
      </select>
      {(
        [
          ["文字色", "color"],
          ["背景色", "background"],
          ["框線色", "border"],
        ] as const
      ).map(([label, key]) => (
        <label key={key}>
          {label}
          <input
            type="color"
            aria-label={`快捷${label}`}
            value={
              item[key] === "transparent"
                ? key === "color"
                  ? "#23344c"
                  : "#ffffff"
                : item[key]
            }
            onChange={(e) => patch({ [key]: e.target.value })}
          />
        </label>
      ))}
      <button
        aria-label="切換背景與框線"
        onClick={() =>
          patch(
            item.background === "transparent" && item.border === "transparent"
              ? { background: "#ffffff", border: "#c5d5ef" }
              : { background: "transparent", border: "transparent" },
          )
        }
      >
        有框／無框
      </button>
      <label>
        背景
        <input
          aria-label="顯示背景"
          type="checkbox"
          checked={item.background !== "transparent"}
          onChange={(e) =>
            patch({ background: e.target.checked ? "#ffffff" : "transparent" })
          }
        />
      </label>
      <label>
        框線
        <input
          aria-label="顯示框線"
          type="checkbox"
          checked={item.border !== "transparent"}
          onChange={(e) =>
            patch({ border: e.target.checked ? "#c5d5ef" : "transparent" })
          }
        />
      </label>
      <button onClick={reset}>重設外觀</button>
      <button onClick={advanced}>進階設定</button>
    </div>
  );
}
