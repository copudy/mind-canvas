import { makeWidget, type Widget } from "./widgets";
import GuidePage from "./components/GuidePage";
import { useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  ControlButton,
  ConnectionMode,
  ConnectionLineType,
  SelectionMode,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Type,
  StickyNote,
  Square,
  Circle,
  GitBranch,
  Calculator as CalcIcon,
  Sun,
  Moon,
  PanelLeftOpen,
  PanelLeftClose,
  CircleHelp,
  BookOpen,
  Search,
  X,
  Plus,
  LocateFixed,
  Maximize2,
  Settings2,
} from "lucide-react";
import CanvasNode, {
  CanvasContext,
  Calculator,
  type FlowNode,
} from "./components/CanvasNode";
import Connector, { type FlowEdge } from "./components/Connector";
import Sidebar from "./components/Sidebar";
import FloatingCalculator from "./components/FloatingCalculator";
import {
  HelpDialog,
  CommandDialog,
  DeleteBoardDialog,
} from "./components/WorkbenchDialogs";
import Inspector from "./components/Inspector";
import ToolLibrary from "./components/ToolLibrary";
import DataSettings from "./components/DataSettings";
import TemplateDialog from "./components/TemplateDialog";
import {
  captureTemplate,
  instantiateTemplate,
  type CanvasTemplate,
} from "./templates";
import { useWorkspace } from "./useWorkspace";
import {
  makeItem,
  id,
  clone,
  childrenOf,
  branchIds,
  rootId,
  hiddenIds,
  reparent,
  removeItems,
  duplicateItems,
  type Board,
  type Item,
  type Kind,
  type Point,
  type LayoutMode,
  type Relation,
} from "./model";
import { layoutTree, snapPosition } from "./layout";
import { useCanvasGraph } from "./useCanvasGraph";
import { autosize } from "./measure";
import { contextToolbarPosition } from "./contextToolbar";
const nodeTypes = { canvas: CanvasNode },
  edgeTypes = { orthogonal: Connector };
const tools = [
  { kind: "mind", label: "心智圖節點", icon: GitBranch },
  { kind: "text", label: "自由文字", icon: Type },
  { kind: "sticky", label: "便條紙", icon: StickyNote },
  { kind: "rectangle", label: "矩形", icon: Square },
  { kind: "ellipse", label: "橢圓", icon: Circle },
] as const;
interface DragState {
  board: Board;
  ids: Set<string>;
  anchor: string;
}
function Workbench() {
  const ws = useWorkspace(),
    rf = useReactFlow<FlowNode, FlowEdge>();
  const floating = ws.board?.nodes.find((n) => n.floating && !n.closed) || null;
  const [selected, setSelected] = useState<string[]>([]),
    [selectedEdge, setSelectedEdge] = useState<string | null>(null),
    [editId, setEdit] = useState<string | null>(null),
    [sidebar, setSidebar] = useState(() => window.innerWidth > 760),
    [resetGuide, setResetGuide] = useState(false),
    [settings, setSettings] = useState(false),
    [dark, setDark] = useState(() => {
      try {
        return localStorage.getItem("mind-theme") === "dark";
      } catch {
        return false;
      }
    }),
    [helpMenu, setHelpMenu] = useState(false),
    [templateDialog, setTemplateDialog] = useState<"save" | "library" | null>(
      null,
    ),
    [help, setHelp] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(""),
    [connectSource, setConnectSource] = useState<string | null>(null),
    [mount, setMount] = useState<{ id: string; index: number } | null>(null),
    [guide, setGuide] = useState<{ gx?: number; gy?: number }>({}),
    [deleteBoard, setDeleteBoard] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [inspector, setInspector] = useState(true),
    [online, setOnline] = useState(navigator.onLine),
    [updateAvailable, setUpdateAvailable] = useState(false);
  const drag = useRef<DragState | null>(null),
    copyBuffer = useRef<Board | null>(null),
    importInput = useRef<HTMLInputElement>(null),
    boardId = ws.board?.boardId;
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("mind-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let hadController = !!navigator.serviceWorker.controller;
    const changed = () => {
      if (hadController) setUpdateAvailable(true);
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
  }, []);
  useEffect(() => {
    setSelected([]);
    setSelectedEdge(null);
    setEdit(null);
    setConnectSource(null);
    setMount(null);
    setGuide({});
    if (ws.board && !ws.board.guide) void rf.setViewport(ws.board.viewport);
  }, [boardId]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  const notify = (message: string) => setNotice(message);
  const setFloating = (item: Item | null, record = true) =>
    ws.update(
      (b) => {
        if (!item) {
          const n = b.nodes.find((n) => n.floating && !n.closed);
          if (n) n.closed = true;
          return;
        }
        const n = b.nodes.find((n) => n.id === item.id);
        const next = { ...clone(item), floating: true, closed: false };
        if (n) Object.assign(n, next);
        else b.nodes.push(next);
      },
      item ? record : false,
    );
  const openCalculator = () => {
    if (ws.current.current?.guide) return notify("請先建立新的白板。");
    const found =
      ws.current.current?.nodes.find((n) => n.floating) ||
      ws.current.current?.nodes.find(
        (n) => n.kind === "calculator" && selected.includes(n.id),
      ) ||
      ws.current.current?.nodes.find((n) => n.kind === "calculator");
    setFloating(found || makeItem("calculator", center()));
  };
  const insertTemplate = (t: CanvasTemplate) => {
    if (ws.current.current?.guide) return notify("請先建立新的白板。");
    const p = center(),
      existing = ws.current.current?.nodes.filter((n) => !n.floating) || [];
    const collision = t.document.nodes.some((n) =>
      existing.some(
        (e) =>
          p.x + n.position.x < e.position.x + e.width + 24 &&
          p.x + n.position.x + n.width + 24 > e.position.x &&
          p.y + n.position.y < e.position.y + e.height + 24 &&
          p.y + n.position.y + n.height + 24 > e.position.y,
      ),
    );
    if (collision)
      p.x = Math.max(...existing.map((e) => e.position.x + e.width)) + 80;
    const bundle = instantiateTemplate(t, p);
    if (
      bundle.nodes.some(
        (n) => Math.abs(n.position.x) > 1e7 || Math.abs(n.position.y) > 1e7,
      )
    )
      return notify("畫布座標超出備份範圍，請在新白板插入範本。");
    if (
      (ws.current.current?.nodes.length || 0) + bundle.nodes.length > 2000 ||
      (ws.current.current?.relations.length || 0) + bundle.relations.length >
        5000
    )
      return notify("白板容量不足，請在新的白板插入範本。");
    ws.update((b) => {
      b.nodes.push(...bundle.nodes);
      b.relations.push(...bundle.relations);
    });
    setSelected(bundle.nodes.map((n) => n.id));
    setSelectedEdge(null);
    focusItems(bundle.nodes);
  };
  const patch = (nid: string, p: Partial<Item>, record = true) =>
    ws.update((b) => {
      const n = b.nodes.find((n) => n.id === nid);
      if (n) {
        Object.assign(n, p);
        if (
          ["text", "fontSize", "bold", "maxWidth", "autoSize"].some(
            (k) => k in p,
          )
        )
          autosize(n);
        if (n.parentId && n.mode === "Auto" && ("text" in p || "autoSize" in p))
          layoutTree(
            b,
            n.parentId,
            b.nodes.find((x) => x.id === rootId(b, n.id))?.layout || "right",
          );
      }
    }, record);
  const center = (): Point => {
    const el = document
      .querySelector(".canvas-surface")
      ?.getBoundingClientRect();
    return rf.screenToFlowPosition({
      x: (el?.x || 0) + (el?.width || 900) / 2 - 80,
      y: (el?.y || 0) + (el?.height || 700) / 2 - 30,
    });
  };
  const add = (kind: Kind, text?: string, pos?: Point) => {
    if (ws.current.current?.guide) {
      notify("請建立自己的白板開始操作。");
      return "";
    }
    const n = makeItem(kind, pos || center(), text);
    if (kind === "calculator" && !pos) {
      n.position.x -= n.width / 2 - 80;
      n.position.y -= n.height / 2 - 30;
    }
    if (kind === "text" && text === "新的標題") {
      n.bold = true;
      n.fontSize = 26;
      n.maxWidth = 480;
    }
    autosize(n);
    ws.update((b) => b.nodes.push(n));
    setSelected([n.id]);
    setSelectedEdge(null);
    if (kind !== "calculator") setEdit(n.id);
    return n.id;
  };
  const addWidget = (type: Widget["type"]) => {
    if (ws.current.current?.guide) return;
    const n = makeWidget(type, center());
    ws.update((b) => b.nodes.push(n));
    setSelected([n.id]);
    setSelectedEdge(null);
    setEdit(null);
    focusItems([n]);
  };
  const focusItems = (items: Item[]) => {
    if (!items.length) return;
    const area = document
      .querySelector(".canvas-surface")!
      .getBoundingClientRect();
    const left = Math.min(...items.map((n) => n.position.x)),
      top = Math.min(...items.map((n) => n.position.y)),
      right = Math.max(...items.map((n) => n.position.x + n.width)),
      bottom = Math.max(...items.map((n) => n.position.y + n.height));
    const inset = window.innerWidth > 760 && sidebar ? 292 : 0;
    const zoom = Math.max(
      0.1,
      Math.min(
        1,
        (area.width - inset - 80) / (right - left),
        (area.height - 260) / (bottom - top),
      ),
    );
    const bid = ws.current.current?.boardId;
    setTimeout(() => {
      if (ws.current.current?.boardId !== bid) return;
      const next = { x: inset + 40 - left * zoom, y: 40 - top * zoom, zoom };
      void rf.setViewport(next, { duration: 0 }).then(() => {
        if (ws.current.current?.boardId === bid)
          ws.update(
            (b) => {
              b.viewport = next;
            },
            false,
            false,
          );
      });
    }, 60);
  };
  const addTemplate = (type: "mind" | "flow") => {
    const p = center();
    const root = makeItem(
      type === "mind" ? "mind" : "rectangle",
      p,
      type === "mind" ? "我的主題" : "開始",
    );
    root.bold = true;
    const parts =
      type === "mind" ? ["第一個想法", "第二個想法"] : ["下一步", "完成"];
    const ns = parts.map((text, i) => {
      const n = makeItem(
        type === "mind" ? "mind" : "rectangle",
        {
          x: p.x + (type === "mind" ? 250 : (i + 1) * 240),
          y: p.y + (type === "mind" ? i * 100 : 0),
        },
        text,
      );
      if (type === "mind") {
        n.parentId = root.id;
        n.order = i;
        n.mode = "Auto";
      }
      return n;
    });
    ws.update((b) => {
      b.nodes.push(root, ...ns);
      if (type === "flow")
        [root, ...ns].slice(0, 2).forEach((n, i) =>
          b.relations.push({
            id: id(),
            source: n.id,
            target: ns[i].id,
            color: "#3b82f6",
            width: 2,
            dashed: false,
          }),
        );
    });
    setSelected([root.id]);
    focusItems([root, ...ns]);
  };
  const insertResult = (text: string, pos?: Point) => add("text", text, pos);
  const toggle = (nid: string) =>
    ws.update((b) => {
      const n = b.nodes.find((n) => n.id === nid);
      if (n) {
        n.collapsed = !n.collapsed;
        if (!n.collapsed)
          layoutTree(
            b,
            n.id,
            b.nodes.find((x) => x.id === rootId(b, n.id))?.layout || "right",
          );
      }
    });
  const selectedItem = ws.board?.nodes.find((n) => n.id === selected[0]);
  const addRelative = (sibling = false) => {
    const b = ws.current.current,
      n = b?.nodes.find((n) => n.id === selected[0]);
    if (!b || !n || n.kind !== "mind") return;
    const parent = sibling ? n.parentId : n.id,
      newNode = makeItem(
        "mind",
        { x: n.position.x + 250, y: n.position.y + 90 },
        "新的想法",
      );
    newNode.parentId = parent;
    newNode.mode = parent ? "Auto" : "Free";
    newNode.order = sibling ? n.order + 1 : childrenOf(b, n.id).length;
    ws.update((d) => {
      if (sibling)
        d.nodes
          .filter((x) => x.parentId === parent && x.order > n.order)
          .forEach((x) => x.order++);
      d.nodes.push(newNode);
      if (parent) {
        const p = d.nodes.find((x) => x.id === parent)!;
        p.collapsed = false;
        layoutTree(
          d,
          parent,
          d.nodes.find((x) => x.id === rootId(d, parent))?.layout || "right",
        );
      }
    });
    setSelected([newNode.id]);
    setSelectedEdge(null);
    setEdit(newNode.id);
  };
  const promote = () => {
    const n = selectedItem;
    if (!n?.parentId) return;
    ws.update((b) => {
      const p = b.nodes.find((x) => x.id === n.parentId)!;
      reparent(b, n.id, p.parentId, p.order + 1);
      if (p.parentId)
        layoutTree(
          b,
          p.parentId,
          b.nodes.find((x) => x.id === rootId(b, p.id))?.layout || "right",
        );
    });
  };
  const remove = () => {
    if (selectedEdge) {
      ws.update((b) => {
        b.relations = b.relations.filter((r) => r.id !== selectedEdge);
      });
      setSelectedEdge(null);
      return;
    }
    if (selected.length) {
      ws.update((b) => removeItems(b, selected));
      setSelected([]);
      setEdit(null);
    }
  };
  const duplicate = () => {
    let added: string[] = [];
    ws.update((b) => {
      added = duplicateItems(b, selected);
    });
    setSelected(added);
  };
  const copy = () => {
    const b = ws.current.current;
    if (!b || !selected.length) return;
    const ids = new Set<string>();
    selected.forEach((nid) => branchIds(b, nid).forEach((bid) => ids.add(bid)));
    copyBuffer.current = {
      ...clone(b),
      nodes: b.nodes
        .filter((n) => ids.has(n.id))
        .map((n) => ({
          ...clone(n),
          parentId: n.parentId && ids.has(n.parentId) ? n.parentId : null,
        })),
      relations: b.relations
        .filter((r) => ids.has(r.source) && ids.has(r.target))
        .map(clone),
    };
    notify("物件與分支已複製，可在其他白板貼上");
  };
  const paste = () => {
    const copied = copyBuffer.current;
    if (!copied) return;
    const data = clone(copied),
      newIds = duplicateItems(
        data,
        data.nodes.map((n) => n.id),
        40,
      ),
      newSet = new Set(newIds);
    ws.update((b) => {
      b.nodes.push(...data.nodes.filter((n) => newSet.has(n.id)));
      b.relations.push(
        ...data.relations.filter(
          (r) => newSet.has(r.source) && newSet.has(r.target),
        ),
      );
    });
    setSelected(newIds);
  };
  const arrange = (mode: LayoutMode) => {
    const n = selectedItem;
    if (!n || n.kind !== "mind") {
      notify("請先選取心智圖節點");
      return;
    }
    ws.update((b) => {
      const root = rootId(b, n.id);
      layoutTree(b, root, mode);
    });
    notify("已整理這棵心智圖；自由與固定位置保持原位");
  };
  const addRelation = (source: string, target: string, c?: Connection) => {
    if (source === target) return;
    ws.update((b) => {
      if (!b.relations.some((r) => r.source === source && r.target === target))
        b.relations.push({
          id: id(),
          source,
          target,
          color: "#3b82f6",
          width: 2,
          dashed: false,
          sourceSide: (c?.sourceHandle as Relation["sourceSide"]) || undefined,
          targetSide: (c?.targetHandle as Relation["targetSide"]) || undefined,
        });
    });
    setConnectSource(null);
  };
  const { hidden, visible, nodes, edges, blocked } = useCanvasGraph(
    ws.board,
    selected,
    selectedEdge,
    mount,
  );
  const changes = (changes: NodeChange<FlowNode>[]) => {
    const selections = changes.filter((c) => c.type === "select");
    if (selections.length)
      setSelected((prev) => {
        const s = new Set(prev);
        for (const c of selections)
          if (c.type === "select") {
            if (c.selected) s.add(c.id);
            else s.delete(c.id);
          }
        return [...s];
      });
    const moves = changes.filter((c) => c.type === "position" && c.position);
    if (moves.length && !drag.current)
      ws.update((b) => {
        for (const c of moves)
          if (c.type === "position" && c.position) {
            const n = b.nodes.find((n) => n.id === c.id);
            if (n) n.position = c.position;
          }
      }, false);
  };
  const edgeChanges = (changes: EdgeChange<FlowEdge>[]) => {
    for (const c of changes)
      if (c.type === "select" && c.selected) setSelectedEdge(c.id);
  };
  const startDrag: OnNodeDrag<FlowNode> = (_, n, ns) => {
    ws.beginGesture();
    const b = ws.current.current;
    if (!b) return;
    const ids = new Set<string>();
    (ns.length ? ns : [n]).forEach((x) =>
      branchIds(b, x.id).forEach((nid) => ids.add(nid)),
    );
    drag.current = { board: clone(b), ids, anchor: n.id };
    ws.checkpoint();
  };
  const targetAt = (
    event: MouseEvent | TouchEvent,
    n: FlowNode,
    b: Board,
    ids: Set<string>,
  ) => {
    if (!("altKey" in event) || !event.altKey || n.data.item.kind !== "mind")
      return null;
    const cx = n.position.x + n.data.item.width / 2,
      cy = n.position.y + n.data.item.height / 2;
    const target = b.nodes.find(
      (t) =>
        t.kind === "mind" &&
        !ids.has(t.id) &&
        !hidden.has(t.id) &&
        cx > t.position.x + 10 &&
        cx < t.position.x + t.width - 10 &&
        cy > t.position.y + 5 &&
        cy < t.position.y + t.height - 5,
    );
    if (!target) return null;
    return {
      id: target.id,
      index: Math.min(
        childrenOf(b, target.id).length,
        Math.floor(
          ((cy - target.position.y) / target.height) *
            (childrenOf(b, target.id).length + 1),
        ),
      ),
    };
  };
  const moveDrag: OnNodeDrag<FlowNode> = (event, n) => {
    const session = drag.current;
    if (!session) return;
    const original = session.board.nodes.find((x) => x.id === session.anchor)!;
    const snap = snapPosition(
      session.board,
      session.ids,
      n.position,
      original,
      7 / rf.getZoom(),
    );
    setGuide(snap);
    const dx = snap.position.x - original.position.x,
      dy = snap.position.y - original.position.y;
    ws.update((b) => {
      for (const item of b.nodes) {
        if (session.ids.has(item.id)) {
          const source = session.board.nodes.find((x) => x.id === item.id)!;
          item.position = {
            x: source.position.x + dx,
            y: source.position.y + dy,
          };
          item.mode = "Free";
        }
      }
    }, false);
    setMount(
      targetAt(
        event,
        { ...n, position: snap.position },
        session.board,
        session.ids,
      ),
    );
  };
  const stopDrag: OnNodeDrag<FlowNode> = (event, n) => {
    const session = drag.current;
    if (!session) return;
    const target = targetAt(event, n, session.board, session.ids);
    if (target) {
      ws.update((b) => {
        if (reparent(b, n.id, target.id, target.index)) {
          for (const item of b.nodes)
            if (session.ids.has(item.id)) item.mode = "Auto";
          b.nodes.find((x) => x.id === target.id)!.collapsed = false;
          layoutTree(
            b,
            target.id,
            b.nodes.find((x) => x.id === rootId(b, target.id))?.layout ||
              "right",
          );
        }
      }, false);
      notify("分支已重新掛載，可復原");
    }
    drag.current = null;
    ws.endGesture();
    setMount(null);
    setGuide({});
  };
  const nodeClick: NodeMouseHandler<FlowNode> = (_, n) => {
    if (ws.current.current?.guide) return;
    if (connectSource) {
      addRelation(connectSource, n.id);
      return;
    }
    setSelectedEdge(null);
  };
  const navigate = (key: string) => {
    const b = ws.current.current,
      n = selectedItem;
    if (!b || !n) return;
    const candidates = b.nodes
      .filter((x) => !hidden.has(x.id) && x.id !== n.id)
      .map((x) => {
        const dx = x.position.x - n.position.x,
          dy = x.position.y - n.position.y;
        const valid =
          key === "ArrowRight"
            ? dx > 0
            : key === "ArrowLeft"
              ? dx < 0
              : key === "ArrowDown"
                ? dy > 0
                : dy < 0;
        return {
          x,
          score: valid
            ? Math.hypot(dx, dy) +
              (key === "ArrowRight" || key === "ArrowLeft"
                ? Math.abs(dy)
                : Math.abs(dx)) *
                0.8
            : Infinity,
        };
      })
      .sort((a, c) => a.score - c.score);
    if (candidates[0]?.score !== Infinity && candidates[0]) {
      setSelected([candidates[0].x.id]);
      void rf.fitView({
        nodes: [{ id: candidates[0].x.id }],
        maxZoom: rf.getZoom(),
        duration: 180,
      });
    }
  };
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,select,[contenteditable="true"],.calculator,button',
        ) ||
        e.isComposing ||
        help ||
        command ||
        settings ||
        helpMenu ||
        templateDialog ||
        (ws.current.current?.guide && e.key !== "/") ||
        deleteBoard ||
        resetGuide
      )
        return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ["z", "d", "c", "v"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const k = e.key.toLowerCase();
        if (k === "z") {
          e.shiftKey ? ws.redo() : ws.undo();
        }
        if (k === "d") duplicate();
        if (k === "c") copy();
        if (k === "v") paste();
        return;
      }
      if (e.key === "Escape") {
        setEdit(null);
        setSelected([]);
        setSelectedEdge(null);
        setConnectSource(null);
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        setCommand(true);
        setQuery("");
        return;
      }
      if (!selected.length && !selectedEdge) return;
      if (e.key === "Tab") {
        e.preventDefault();
        e.shiftKey ? promote() : addRelative();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        addRelative(true);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      }
      if (e.key === " " && selectedItem?.kind === "mind") {
        e.preventDefault();
        toggle(selectedItem.id);
      }
      if (e.key === "F2" && selectedItem?.kind !== "calculator") {
        e.preventDefault();
        setEdit(selected[0]);
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        navigate(e.key);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });
  const align = (mode: "left" | "center" | "right") =>
    ws.update((b) => {
      const ns = b.nodes.filter((n) => selected.includes(n.id));
      if (!ns.length) return;
      const left = Math.min(...ns.map((n) => n.position.x)),
        right = Math.max(...ns.map((n) => n.position.x + n.width));
      for (const n of ns) {
        n.position.x =
          mode === "left"
            ? left
            : mode === "right"
              ? right - n.width
              : (left + right - n.width) / 2;
        n.mode = "Free";
      }
    });
  const unpin = (nid: string) => {
    const n = ws.current.current?.nodes.find((n) => n.id === nid);
    if (!n) return;
    if (floating) {
      notify("請先關閉浮動計算機，再取消釘選");
      return;
    }
    setFloating(clone(n));
    setSelected([]);
  };
  const fileImport = () => importInput.current?.click();
  if (!ws.board) return <div className="loading">正在打開你的思考空間…</div>;
  const board = ws.board;
  const viewport = rf.getViewport();
  const surface = document.querySelector(".canvas-surface");
  const contextPosition = selectedItem
    ? contextToolbarPosition(
        visible,
        selectedItem,
        viewport,
        {
          width: surface?.clientWidth || 900,
          height: surface?.clientHeight || 700,
        },
        window.innerWidth > 760 && sidebar ? 292 : 0,
        window.innerWidth > 760 && inspector ? 300 : 0,
      )
    : null;
  const commands = [
    ...(selected.length > 0 && !board.guide
      ? [{ label: "儲存為我的範本", run: () => setTemplateDialog("save") }]
      : []),
    ...tools.map((t) => ({ label: `新增${t.label}`, run: () => add(t.kind) })),
    { label: "計算機", run: openCalculator },
    {
      label: "適應全部內容",
      run: () => focusItems(visible),
    },
    { label: "復原", run: ws.undo },
    { label: "重作", run: ws.redo },
    { label: "資料與備份", run: () => setSettings(true) },
  ];
  return (
    <CanvasContext.Provider
      value={{
        readOnly: !!board.guide,
        practice: () => void ws.add(),
        editId,
        setEdit: (nid) => {
          if (!board.guide) setEdit(nid);
        },
        patch,
        checkpoint: ws.checkpoint,
        insertResult,
        toggle,
        unpin,
        notify,
        beginGesture: ws.beginGesture,
        endGesture: ws.endGesture,
        guideEntryId: board.guide?.entryId,
        guideBackupId: board.guide?.backupId,
        lastBoard: ws.lastBoard?.name,
        resume: () => ws.lastBoard && void ws.open(ws.lastBoard.boardId),
        createBoard: () => void ws.add(),
        dataSettings: () => setSettings(true),
      }}
    >
      {templateDialog && (
        <TemplateDialog
          mode={templateDialog}
          templates={ws.templates}
          selected={selected.length}
          close={() => setTemplateDialog(null)}
          save={async (name) => {
            await ws.saveTemplate(captureTemplate(board, selected, name));
            notify("已儲存至我的範本");
          }}
          insert={insertTemplate}
          rename={ws.renameTemplate}
          remove={ws.removeTemplate}
        />
      )}
      {settings && (
        <DataSettings
          close={() => setSettings(false)}
          backup={ws.backup}
          restore={fileImport}
          status={ws.status}
          error={ws.error}
          lastSaved={ws.lastSaved}
          lastBackup={ws.lastBackup}
          name={board.name}
          notify={notify}
          help={() => setHelp(true)}
        />
      )}
      {resetGuide && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-label="確認重設指南">
            <h2>重設這張指南？</h2>
            <p>
              指南中的修改會被替換；其他白板保持原樣。重設後可用 Ctrl＋Z 復原。
            </p>
            <div className="modal-actions">
              <button onClick={() => setResetGuide(false)}>取消</button>
              <button
                onClick={() => {
                  ws.resetGuide();
                  setResetGuide(false);
                  setTimeout(
                    () =>
                      void rf.fitView({
                        padding: {
                          top: "35px",
                          bottom: "180px",
                          left: "35px",
                          right: "35px",
                        },
                      }),
                    100,
                  );
                }}
              >
                確認重設
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`workbench ${sidebar ? "with-sidebar" : ""}`}
        data-save-state={ws.status}
      >
        <span className="save-status visually-hidden" aria-hidden="true">
          {online ? ws.status : "離線 · " + ws.status}
        </span>
        {sidebar && (
          <Sidebar
            prefs={ws.prefs}
            onPin={(bid) => void ws.togglePin(bid)}
            onAddSection={(name) => void ws.addSection(name)}
            onRenameSection={(sid, name) => void ws.renameSection(sid, name)}
            onDeleteSection={(sid) => void ws.removeSection(sid)}
            onCollapseSection={(sid) => void ws.collapseSection(sid)}
            onMove={(bid, sid) => void ws.moveBoard(bid, sid)}
            boards={ws.boards}
            active={board.boardId}
            onOpen={(bid) => {
              void ws.open(bid);
              if (window.innerWidth <= 760) setSidebar(false);
            }}
            onAdd={() => {
              void ws.add().catch((e) => ws.setError(String(e)));
              if (window.innerWidth <= 760) setSidebar(false);
            }}
            onRename={(bid, name) => void ws.rename(bid, name)}
            onDuplicate={(bid) => void ws.duplicate(bid)}
            onDelete={setDeleteBoard}
            onClose={() => setSidebar(false)}
          />
        )}
        <main className="main">
          <header className="topbar">
            <div className="board-title">
              <button
                aria-label={sidebar ? "收合白板清單" : "展開白板清單"}
                title={sidebar ? "收合白板清單" : "展開白板清單"}
                aria-expanded={sidebar}
                aria-controls="board-sidebar"
                onClick={() => setSidebar(!sidebar)}
              >
                {sidebar ? (
                  <PanelLeftClose size={22} />
                ) : (
                  <PanelLeftOpen size={22} />
                )}
              </button>
              <div className="header-brand">
                <img
                  src={`${import.meta.env.BASE_URL}icon.svg`}
                  alt="PD-1 Center Logo"
                />
                <strong>
                  <span className="brand-parent">PD-1 Center | </span>Mind
                  Canvas
                </strong>
              </div>
              <h1 hidden={!!board.guide}>{board.name}</h1>
            </div>
            <div className="top-actions">
              {updateAvailable && (
                <button
                  aria-label="載入新版"
                  onClick={() =>
                    void ws.flush().then(() => {
                      if (ws.safeToReload()) location.reload();
                      else notify("請先匯出備份，儲存失敗時不自動重新載入。");
                    })
                  }
                >
                  載入新版
                </button>
              )}
              <button
                aria-label="尋找節點與快速命令"
                onClick={() => {
                  setQuery("");
                  setCommand(true);
                }}
              >
                <Search size={22} />
              </button>
              <button
                aria-label={dark ? "切換淺色主題" : "切換深色主題"}
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={22} /> : <Moon size={22} />}
              </button>
              <button
                aria-label="設定"
                title="設定 · 資料與備份"
                onClick={() => setSettings(true)}
              >
                <Settings2 size={22} />
              </button>
              <div
                className="help-entry"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setHelpMenu(false);
                }}
              >
                <button
                  aria-label="說明與幫助"
                  title="說明與幫助"
                  aria-expanded={helpMenu}
                  onClick={() => setHelpMenu(!helpMenu)}
                >
                  <CircleHelp size={22} />
                </button>
                {helpMenu && (
                  <div className="help-menu" role="menu">
                    <button
                      role="menuitem"
                      disabled={!!board.guide}
                      onClick={() => {
                        setHelpMenu(false);
                        void ws.createGuide();
                      }}
                    >
                      <BookOpen size={20} />
                      Mind Canvas 使用指南
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setHelpMenu(false);
                        setHelp(true);
                      }}
                    >
                      操作說明
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div
            className={`canvas-surface ${board.guide ? "guide-document" : ""}`}
            tabIndex={-1}
            aria-label="自由思維畫布"
          >
            {board.guide ? (
              <GuidePage
                board={board}
                lastBoard={ws.lastBoard?.name}
                resume={() =>
                  ws.lastBoard && void ws.open(ws.lastBoard.boardId)
                }
                create={() => void ws.add()}
                backup={() => setSettings(true)}
              />
            ) : (
              <ReactFlow<FlowNode, FlowEdge>
                key={board.boardId}
                nodes={nodes}
                nodesDraggable={!board.guide}
                nodesConnectable={!board.guide}
                elementsSelectable={!board.guide}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={changes}
                onEdgesChange={edgeChanges}
                onNodeClick={nodeClick}
                onEdgeClick={(_, e) => {
                  if (!e.data?.tree) {
                    setSelectedEdge(e.id);
                    setSelected([]);
                  }
                }}
                onPaneClick={() => {
                  setSelected([]);
                  setSelectedEdge(null);
                  setEdit(null);
                  setConnectSource(null);
                  document
                    .querySelector<HTMLElement>(".canvas-surface")
                    ?.focus();
                }}
                onConnect={(c) => addRelation(c.source, c.target, c)}
                connectionMode={ConnectionMode.Loose}
                connectionLineType={ConnectionLineType.SmoothStep}
                isValidConnection={(c) => c.source !== c.target}
                onNodeDragStart={startDrag}
                onNodeDrag={moveDrag}
                onNodeDragStop={stopDrag}
                onSelectionDragStart={(e, ns) => {
                  if (ns[0]) startDrag(e.nativeEvent, ns[0], ns);
                }}
                onSelectionDrag={(e, ns) => {
                  if (ns[0]) moveDrag(e.nativeEvent, ns[0], ns);
                }}
                onSelectionDragStop={(e, ns) => {
                  if (ns[0]) stopDrag(e.nativeEvent, ns[0], ns);
                }}
                onMoveEnd={(_, v) => {
                  if (ws.current.current?.boardId !== board.boardId) return;
                  const old = ws.current.current?.viewport;
                  if (old && JSON.stringify(old) !== JSON.stringify(v))
                    ws.update(
                      (b) => {
                        b.viewport = v;
                      },
                      false,
                      false,
                    );
                }}
                defaultViewport={board.viewport}
                minZoom={0.1}
                maxZoom={3}
                panOnDrag={[1, 2]}
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                multiSelectionKeyCode="Shift"
                selectionKeyCode={null}
                panActivationKeyCode="Space"
                zoomOnScroll={false}
                panOnScroll
                zoomOnPinch
                zoomActivationKeyCode="Control"
                deleteKeyCode={null}
                disableKeyboardA11y
                autoPanOnNodeDrag
                colorMode={dark ? "dark" : "light"}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={24}
                  size={1}
                  color={dark ? "#26344d" : "#d6dfef"}
                />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(n) =>
                    (n.data as FlowNode["data"]).item.background ===
                    "transparent"
                      ? "#8b9dc3"
                      : (n.data as FlowNode["data"]).item.background
                  }
                  maskColor={
                    dark ? "rgba(10,14,23,.6)" : "rgba(247,249,252,.65)"
                  }
                />
                <Controls showInteractive={false} showFitView={false}>
                  <ControlButton
                    aria-label="Fit View"
                    title="適應畫面"
                    onClick={() => focusItems(visible)}
                  >
                    <Maximize2 size={16} />
                  </ControlButton>
                </Controls>
                {(guide.gx !== undefined || guide.gy !== undefined) && (
                  <svg className="guide-svg">
                    {guide.gx !== undefined && (
                      <line
                        x1={guide.gx * rf.getZoom() + rf.getViewport().x}
                        x2={guide.gx * rf.getZoom() + rf.getViewport().x}
                        y1="0"
                        y2="100%"
                      />
                    )}
                    {guide.gy !== undefined && (
                      <line
                        y1={guide.gy * rf.getZoom() + rf.getViewport().y}
                        y2={guide.gy * rf.getZoom() + rf.getViewport().y}
                        x1="0"
                        x2="100%"
                      />
                    )}
                  </svg>
                )}
              </ReactFlow>
            )}
            {!board.guide && (
              <ToolLibrary
                widget={addWidget}
                insertTemplate={insertTemplate}
                myTemplates={() => setTemplateDialog("library")}
                layout={arrange}
                canLayout={selectedItem?.kind === "mind"}
                add={add}
                template={addTemplate}
                connect={() => {
                  setConnectSource(selected[0]);
                  notify("請點選目標物件，建立自由關聯線");
                }}
                selected={selected.length}
                align={align}
                arrange={() => arrange(selectedItem?.layout || "right")}
                floating={openCalculator}
                undo={ws.undo}
                redo={ws.redo}
                canUndo={ws.canUndo}
                canRedo={ws.canRedo}
              />
            )}
            {visible.length === 0 && (
              <div className="canvas-heading">
                <span>THINK WITHOUT BOUNDARIES</span>
                <p>讓想法自由生長</p>
              </div>
            )}
            <div className="canvas-bottom">
              <span>
                {visible.length} 個物件 · {selected.length} 個選取
              </span>
              <span className="hint">
                拖曳框選 · Shift 多選 · 滾動平移 · Ctrl＋滾輪縮放
              </span>
            </div>
            {blocked > 0 && (
              <div className="route-warning" role="status">
                {blocked} 條連線暫停顯示：端點受遮擋，請分開重疊物件。
              </div>
            )}
            {selectedItem && !editId && contextPosition && (
              <div className="layout-bar context-tools" style={contextPosition}>
                <button
                  aria-label="編輯選取物件"
                  onClick={() => {
                    if (selectedItem.kind === "calculator")
                      document
                        .querySelector<HTMLInputElement>(
                          `[data-id="${selectedItem.id}"] input`,
                        )
                        ?.focus();
                    else setEdit(selectedItem.id);
                  }}
                >
                  編輯
                </button>
                <button aria-label="複製選取物件" onClick={duplicate}>
                  複製
                </button>
                <button aria-label="刪除選取物件" onClick={remove}>
                  刪除
                </button>
                <button
                  aria-label="連接選取物件"
                  onClick={() => {
                    setConnectSource(selected[0]);
                    notify("請點選目標物件");
                  }}
                >
                  連線
                </button>
                <span>局部整理</span>
                <button onClick={() => setTemplateDialog("save")}>
                  儲存為我的範本
                </button>
                {selectedItem.kind === "mind" &&
                  (["right", "split", "radial"] as LayoutMode[]).map((m, i) => (
                    <button key={m} onClick={() => arrange(m)}>
                      {["向右", "左右", "放射"][i]}
                    </button>
                  ))}
                <button
                  aria-label="定位選取節點"
                  title="定位選取"
                  onClick={() =>
                    rf.fitView({
                      nodes: selected.map((id) => ({ id })),
                      maxZoom: 1,
                      duration: 200,
                    })
                  }
                >
                  <LocateFixed size={16} />
                </button>
                <button
                  aria-label="物件設定"
                  onClick={() => setInspector(!inspector)}
                >
                  <Settings2 size={16} />
                </button>
              </div>
            )}
            {inspector && (selected.length > 0 || selectedEdge) && (
              <Inspector
                items={board.nodes.filter((n) => selected.includes(n.id))}
                relation={board.relations.find((r) => r.id === selectedEdge)}
                board={board}
                patch={(p) =>
                  ws.update((b) => {
                    for (const n of b.nodes)
                      if (selected.includes(n.id)) {
                        Object.assign(n, p);
                        autosize(n);
                      }
                  })
                }
                patchRelation={(p) =>
                  ws.update((b) =>
                    Object.assign(
                      b.relations.find((r) => r.id === selectedEdge)!,
                      p,
                    ),
                  )
                }
                onClose={() => {
                  setSelected([]);
                  setSelectedEdge(null);
                }}
                onChild={() => addRelative()}
                onSibling={() => addRelative(true)}
                onPromote={promote}
                onDuplicate={duplicate}
                onDelete={remove}
                onDetach={() =>
                  ws.update((b) => reparent(b, selected[0], null))
                }
                onAlign={align}
                onTreeStyle={(p) =>
                  ws.update((b) => {
                    Object.assign(b.treeStyle, p);
                    if (selectedItem?.kind === "mind") {
                      const r = b.nodes.find(
                        (n) => n.id === rootId(b, selectedItem.id),
                      );
                      if (r?.treeStyle) Object.assign(r.treeStyle, p);
                    }
                  })
                }
              />
            )}
            {floating && (
              <FloatingCalculator
                key={floating.id}
                item={floating}
                onChange={setFloating}
                onInsert={() => insertResult(floating.result)}
                onClose={() => setFloating(null)}
                onPin={() => {
                  const p = center();
                  p.x -= floating.width / 2 - 80;
                  p.y -= floating.height / 2 - 30;
                  patch(floating.id, {
                    floating: false,
                    closed: false,
                    position: p,
                  });
                  setSelected([floating.id]);
                }}
              />
            )}
          </div>
        </main>
        <input
          ref={importInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void ws.restore(file);
            e.target.value = "";
          }}
        />
        {ws.error && (
          <div className="error-banner" role="alert">
            {ws.error}
            <button onClick={() => void ws.backup(true)}>匯出備份</button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
        {deleteBoard && (
          <DeleteBoardDialog
            name={ws.boards.find((b) => b.boardId === deleteBoard)?.name || ""}
            close={() => setDeleteBoard(null)}
            backup={() => void ws.backup(true)}
            confirm={() => {
              void ws.remove(deleteBoard);
              setDeleteBoard(null);
            }}
          />
        )}
        {help && <HelpDialog close={() => setHelp(false)} />}
        {command && (
          <CommandDialog
            query={query}
            setQuery={setQuery}
            close={() => setCommand(false)}
            commands={commands}
            nodes={board.nodes}
            onLocate={(n) => {
              if (hidden.has(n.id))
                ws.update((b) => {
                  let p = n.parentId;
                  while (p) {
                    const parent = b.nodes.find((x) => x.id === p)!;
                    parent.collapsed = false;
                    p = parent.parentId;
                  }
                });
              setSelected([n.id]);
              setTimeout(
                () =>
                  void rf.fitView({
                    nodes: [{ id: n.id }],
                    maxZoom: 1,
                    duration: 200,
                  }),
                50,
              );
            }}
          />
        )}
      </div>
    </CanvasContext.Provider>
  );
}
export default function App() {
  return (
    <ReactFlowProvider>
      <Workbench />
    </ReactFlowProvider>
  );
}
