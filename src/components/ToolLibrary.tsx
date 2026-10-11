import ToolPreview, { type PreviewInfo } from "./ToolPreview";
import type { Widget } from "../widgets";
import { Table2, CalendarDays, Smile } from "lucide-react";
import { useState, useRef } from "react";
import {
  GitBranch,
  Type,
  StickyNote,
  Square,
  Circle,
  Calculator,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layout,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
  Heading,
  List,
  Quote,
  Network,
} from "lucide-react";
import type { Kind } from "../model";
import type { LayoutMode } from "../model";
import { officialTemplates, type CanvasTemplate } from "../templates";
export const categories = [
  "思考框架",
  "文字筆記",
  "圖形圖表",
  "連線關係",
  "實用工具",
  "排版整理",
] as const;
export default function ToolLibrary({
  add,
  widget,
  template,
  connect,
  selected,
  align,
  arrange,
  floating,
  undo,
  redo,
  canUndo,
  canRedo,
  insertTemplate,
  myTemplates,
  layout,
  canLayout,
}: {
  add: (k: Kind, text?: string) => unknown;
  widget: (type: Widget["type"]) => void;
  template: (type: "mind" | "flow") => void;
  connect: () => void;
  selected: number;
  align: (m: "left" | "center" | "right") => void;
  arrange: () => void;
  floating: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  insertTemplate: (t: CanvasTemplate) => void;
  myTemplates: () => void;
  layout: (mode: LayoutMode) => void;
  canLayout: boolean;
}) {
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const focusedPreview = useRef<string | null>(null);
  const descriptions: Record<string, string> = {
    我的範本: "開啟你保存的物件組合；可先看結構再插入、改名或刪除。",
    心智圖節點: "只新增一個想法，從空白開始；選取後按 Tab 延伸分支。",
    心智圖範本: "一次加入主題及範例分支，適合快速開始；每個節點都能修改。",
    流程圖範本: "一次加入多個步驟與連線，適合安排先後順序。",
    圖示: "可選擇並更換的符號物件，標記重點、狀態或地點。",
    表格: "可編輯儲存格，增減列欄；適合清單、比較與紀錄，沒有自動試算。",
    小日曆: "切換月份、選擇日期與保存每日記事，不會同步外部行事曆。",
    便條紙: "記下短想法，雙擊編輯、拖曳移動。",
  };
  const [category, setCategory] =
    useState<(typeof categories)[number]>("思考框架");
  const [collapsed, setCollapsed] = useState(() => {
    // Short viewports start compact without overwriting the saved preference.
    if (window.innerHeight < 700) return true;
    try {
      return localStorage.getItem("mind-tools-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const tool = (
    label: string,
    Icon: typeof Type,
    run: () => unknown,
    disabled = false,
    aria = label,
    data?: CanvasTemplate,
  ) => (
    <button
      key={label}
      aria-label={aria}
      aria-describedby={preview?.label === label ? "tool-preview" : undefined}
      onMouseEnter={(e) => {
        if (focusedPreview.current) return;
        setPreview({
          label,
          description:
            data?.description ||
            descriptions[label] ||
            `使用${label}整理你的白板。`,
          document: data?.document,
          rect: e.currentTarget.getBoundingClientRect(),
        });
      }}
      onFocus={(e) => {
        focusedPreview.current = label;
        setPreview({
          label,
          description:
            data?.description ||
            descriptions[label] ||
            `使用${label}整理你的白板。`,
          document: data?.document,
          rect: e.currentTarget.getBoundingClientRect(),
        });
      }}
      onMouseLeave={() => {
        if (!focusedPreview.current) setPreview(null);
      }}
      onMouseMove={(e) => {
        if (e.movementX || e.movementY) {
          focusedPreview.current = null;
          setPreview({
            label,
            description:
              data?.description ||
              descriptions[label] ||
              `使用${label}整理你的白板。`,
            document: data?.document,
            rect: e.currentTarget.getBoundingClientRect(),
          });
        }
      }}
      onBlur={() => {
        focusedPreview.current = null;
        setPreview(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          focusedPreview.current = null;
          setPreview(null);
        }
      }}
      disabled={disabled}
      onClick={() => {
        focusedPreview.current = null;
        setPreview(null);
        run();
      }}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
  return (
    <section
      className={`tool-library ${collapsed ? "collapsed" : ""}`}
      aria-label="畫布工具庫"
    >
      <div className="library-top">
        {!collapsed && (
          <div role="tablist" aria-label="工具分類">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => {
                  setPreview(null);
                  setCategory(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {collapsed && <span>工具庫 · {category}</span>}
        <button
          className="library-toggle"
          aria-label={collapsed ? "展開工具庫" : "收合工具庫"}
          aria-expanded={!collapsed}
          onClick={() => {
            setCollapsed(!collapsed);
            try {
              localStorage.setItem("mind-tools-collapsed", String(!collapsed));
            } catch {}
          }}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {!collapsed && (
        <div className="library-tools" role="toolbar" aria-label={category}>
          {category === "思考框架" && (
            <>
              {tool("我的範本", Layout, myTemplates)}
              {tool(
                "心智圖節點",
                GitBranch,
                () => add("mind"),
                false,
                "新增心智圖節點",
              )}
              {tool("心智圖範本", Network, () => template("mind"))}
              {tool("流程圖範本", Layout, () => template("flow"))}
              {officialTemplates.map((t) =>
                tool(
                  t.name,
                  Network,
                  () => insertTemplate(t),
                  false,
                  t.name,
                  t,
                ),
              )}
            </>
          )}
          {category === "文字筆記" && (
            <>
              {tool("純文字", Type, () => add("text"), false, "新增自由文字")}
              {tool("標題", Heading, () => add("text", "新的標題"))}
              {tool("清單", List, () =>
                add("text", "• 第一項\n• 第二項\n• 第三項"),
              )}
              {tool("圖示", Smile, () => widget("icon"))}
              {tool("表格", Table2, () => widget("table"))}
              {tool("引用", Quote, () =>
                add("text", "「留下一句值得記住的話。」"),
              )}
            </>
          )}
          {category === "圖形圖表" && (
            <>
              {tool("矩形", Square, () => add("rectangle"), false, "新增矩形")}
              {tool("橢圓", Circle, () => add("ellipse"), false, "新增橢圓")}
            </>
          )}
          {category === "連線關係" &&
            tool("正交關聯線", Link2, connect, !selected, "建立關聯線")}
          {category === "實用工具" && (
            <>
              {tool("計算機", Calculator, floating)}
              {tool(
                "便條紙",
                StickyNote,
                () => add("sticky"),
                false,
                "新增便條紙",
              )}
              {tool("小日曆", CalendarDays, () => widget("calendar"))}
              {tool("日期標記", Type, () =>
                add("text", new Date().toLocaleDateString("zh-TW")),
              )}
            </>
          )}
          {category === "排版整理" && (
            <>
              {tool("向右", GitBranch, () => layout("right"), !canLayout)}
              {tool("左右", Network, () => layout("split"), !canLayout)}
              {tool("放射", Network, () => layout("radial"), !canLayout)}
              {tool("靠左對齊", AlignLeft, () => align("left"), selected < 2)}
              {tool(
                "置中對齊",
                AlignCenter,
                () => align("center"),
                selected < 2,
              )}
              {tool("靠右對齊", AlignRight, () => align("right"), selected < 2)}
              {tool("局部自動整理", Layout, arrange, !selected)}
            </>
          )}
          <div className="library-history">
            {tool("復原", Undo2, undo, !canUndo)}
            {tool("重作", Redo2, redo, !canRedo)}
          </div>
        </div>
      )}
      {!collapsed && <ToolPreview info={preview} />}
    </section>
  );
}
