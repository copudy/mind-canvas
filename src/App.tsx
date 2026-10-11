import { useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
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
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Square,
  Circle,
  GitBranch,
  Calculator as CalcIcon,
  Undo2,
  Redo2,
  Sun,
  Moon,
  PanelLeftOpen,
  Download,
  Upload,
  Search,
  HelpCircle,
  Link2,
  X,
  Plus,
  LocateFixed,
  Settings2,
  Pin,
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
  const [selected, setSelected] = useState<string[]>([]),
    [selectedEdge, setSelectedEdge] = useState<string | null>(null),
    [editId, setEdit] = useState<string | null>(null),
    [sidebar, setSidebar] = useState(true),
    [pan, setPan] = useState(false),
    [dark, setDark] = useState(() => {
      try {
        return localStorage.getItem("mind-theme") === "dark";
      } catch {
        return false;
      }
    }),
    [floating, setFloating] = useState<Item | null>(null),
    [help, setHelp] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(""),
    [connectSource, setConnectSource] = useState<string | null>(null),
    [mount, setMount] = useState<{ id: string; index: number } | null>(null),
    [guide, setGuide] = useState<{ gx?: number; gy?: number }>({}),
    [deleteBoard, setDeleteBoard] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [inspector, setInspector] = useState(true),
    [online, setOnline] = useState(navigator.onLine);
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
    setSelected([]);
    setSelectedEdge(null);
    setEdit(null);
    setConnectSource(null);
    setMount(null);
    setGuide({});
    if (ws.board) void rf.setViewport(ws.board.viewport);
  }, [boardId]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  const notify = (message: string) => setNotice(message);
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
    const n = makeItem(kind, pos || center(), text);
    autosize(n);
    ws.update((b) => b.nodes.push(n));
    setSelected([n.id]);
    setSelectedEdge(null);
    if (kind !== "calculator") setEdit(n.id);
    return n.id;
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
          color: "#83978e",
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
    setMount(null);
    setGuide({});
  };
  const nodeClick: NodeMouseHandler<FlowNode> = (_, n) => {
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
        deleteBoard
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
    ws.update((b) => removeItems(b, [nid]));
    setSelected([]);
  };
  const fileImport = () => importInput.current?.click();
  if (!ws.board) return <div className="loading">正在打開你的思考空間…</div>;
  const board = ws.board;
  const commands = [
    ...tools.map((t) => ({ label: `新增${t.label}`, run: () => add(t.kind) })),
    { label: "釘選計算機", run: () => add("calculator") },
    {
      label: "適應全部內容",
      run: () => rf.fitView({ padding: 0.2, duration: 250 }),
    },
    { label: "復原", run: ws.undo },
    { label: "重作", run: ws.redo },
    { label: "匯出本白板", run: () => ws.backup() },
  ];
  return (
    <CanvasContext.Provider
      value={{
        editId,
        setEdit,
        patch,
        checkpoint: ws.checkpoint,
        insertResult,
        toggle,
        unpin,
        notify,
      }}
    >
      <div className={`workbench ${sidebar ? "with-sidebar" : ""}`}>
        {sidebar && (
          <Sidebar
            boards={ws.boards}
            active={board.boardId}
            onOpen={(bid) => void ws.open(bid)}
            onAdd={() => void ws.add().catch((e) => ws.setError(String(e)))}
            onRename={(bid, name) => void ws.rename(bid, name)}
            onDuplicate={(bid) => void ws.duplicate(bid)}
            onDelete={setDeleteBoard}
            onClose={() => setSidebar(false)}
            onBackup={() => void ws.backup(true)}
            onImport={fileImport}
          />
        )}
        <main className="main">
          <header className="topbar">
            <div className="board-title">
              {!sidebar && (
                <button
                  aria-label="展開白板清單"
                  onClick={() => setSidebar(true)}
                >
                  <PanelLeftOpen size={19} />
                </button>
              )}
              <span className="breadcrumb">我的白板 /</span>
              <h1>{board.name}</h1>
            </div>
            <div className="top-actions">
              <span className={`save-status ${ws.error ? "failed" : ""}`}>
                <span className="status-dot" />
                {online ? ws.status : "離線 · " + ws.status}
              </span>
              <button
                aria-label="尋找節點與快速命令"
                title="尋找節點與快速命令 /"
                onClick={() => {
                  setQuery("");
                  setCommand(true);
                }}
              >
                <Search size={18} />
              </button>
              <button
                aria-label="匯出本白板"
                title="匯出本白板 JSON"
                onClick={() => void ws.backup()}
              >
                <Download size={18} />
              </button>
              <button
                aria-label="匯入專案"
                title="匯入 JSON 專案"
                onClick={fileImport}
              >
                <Upload size={18} />
              </button>
              <span className="divider" />
              <button
                aria-label={dark ? "切換淺色主題" : "切換深色主題"}
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button aria-label="操作說明" onClick={() => setHelp(true)}>
                <HelpCircle size={18} />
              </button>
            </div>
          </header>
          <div
            className="canvas-surface"
            tabIndex={-1}
            aria-label="自由思維畫布"
          >
            <ReactFlow<FlowNode, FlowEdge>
              key={board.boardId}
              nodes={nodes}
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
                document.querySelector<HTMLElement>(".canvas-surface")?.focus();
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
                const old = ws.current.current?.viewport;
                if (old && JSON.stringify(old) !== JSON.stringify(v))
                  ws.update((b) => {
                    b.viewport = v;
                  }, false);
              }}
              defaultViewport={board.viewport}
              minZoom={0.1}
              maxZoom={3}
              panOnDrag={pan ? [0, 1, 2] : [1, 2]}
              selectionOnDrag={!pan}
              selectionMode={SelectionMode.Partial}
              multiSelectionKeyCode="Shift"
              selectionKeyCode={null}
              panActivationKeyCode={null}
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
                color={dark ? "#35443f" : "#d5ddd5"}
              />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) =>
                  (n.data as FlowNode["data"]).item.background === "transparent"
                    ? "#9bad9f"
                    : (n.data as FlowNode["data"]).item.background
                }
                maskColor={dark ? "rgba(24,34,29,.6)" : "rgba(245,247,243,.65)"}
              />
              <Controls showInteractive={false} />
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
            <div
              className="canvas-toolbar"
              role="toolbar"
              aria-label="畫布工具"
            >
              <button
                className={!pan ? "tool-active" : ""}
                aria-label="選取工具"
                title="選取 · 空白處拖曳框選"
                onClick={() => setPan(false)}
              >
                <MousePointer2 size={19} />
              </button>
              <button
                className={pan ? "tool-active" : ""}
                aria-label="平移工具"
                title="平移畫布"
                onClick={() => setPan(true)}
              >
                <Hand size={19} />
              </button>
              <span className="divider" />
              {tools.map((t) => (
                <button
                  key={t.kind}
                  aria-label={`新增${t.label}`}
                  title={`新增${t.label}`}
                  onClick={() => add(t.kind)}
                >
                  <t.icon size={19} />
                </button>
              ))}
              <button
                aria-label="釘選計算機"
                title="新增画布計算機"
                onClick={() => add("calculator")}
              >
                <CalcIcon size={19} />
                <span className="tiny-plus">+</span>
              </button>
              <span className="divider" />
              <button
                disabled={!selected.length}
                className={connectSource ? "tool-active" : ""}
                aria-label="建立關聯線"
                title="選取起點，再點選此工具與終點"
                onClick={() => {
                  setConnectSource(selected[0]);
                  notify("請點選目標物件，建立自由關聯線");
                }}
              >
                <Link2 size={19} />
              </button>
              <span className="divider" />
              <button
                aria-label="復原"
                title="復原 Ctrl Z"
                disabled={!ws.canUndo}
                onClick={ws.undo}
              >
                <Undo2 size={19} />
              </button>
              <button
                aria-label="重作"
                title="重作 Ctrl Shift Z"
                disabled={!ws.canRedo}
                onClick={ws.redo}
              >
                <Redo2 size={19} />
              </button>
            </div>
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
              <button
                onClick={() =>
                  setFloating(
                    floating || makeItem("calculator", { x: 0, y: 0 }),
                  )
                }
              >
                <CalcIcon size={15} />
                浮動計算機
              </button>
            </div>
            {blocked > 0 && (
              <div className="route-warning" role="status">
                {blocked} 條連線暫停顯示：端點受遮擋，請分開重疊物件。
              </div>
            )}
            {selectedItem?.kind === "mind" && (
              <div className="layout-bar">
                <span>局部整理</span>
                {(["right", "split", "radial"] as LayoutMode[]).map((m, i) => (
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
                  ws.update((b) => Object.assign(b.treeStyle, p))
                }
              />
            )}
            {floating && (
              <FloatingCalculator
                item={floating}
                onChange={setFloating}
                onInsert={() => insertResult(floating.result)}
                onClose={() => setFloating(null)}
                onPin={() => {
                  const n = {
                    ...clone(floating),
                    id: id(),
                    position: center(),
                  };
                  ws.update((b) => b.nodes.push(n));
                  setFloating(null);
                  setSelected([n.id]);
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
