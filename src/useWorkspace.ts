import { useEffect, useRef, useState } from "react";
import { clone, demoBoard, makeBoard, id, type Board } from "./model";
import { History } from "./history";
import { repository, exportProject, importProject } from "./storage";
let initial:
  Promise<{ boards: Board[]; active: string | undefined }> | undefined;
async function initialize() {
  const boards = await repository.list();
  if (!boards.length) {
    const b = demoBoard();
    await repository.save(b);
    boards.push(b);
  }
  return { boards, active: await repository.active() };
}
export function useWorkspace() {
  const [boards, setBoards] = useState<Board[]>([]),
    [board, setBoard] = useState<Board | null>(null),
    [status, setStatus] = useState("正在載入…"),
    [error, setError] = useState("");
  const current = useRef<Board | null>(null),
    all = useRef<Board[]>([]),
    histories = useRef(new Map<string, History>()),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    pending = useRef<Board | null>(null),
    queue = useRef(Promise.resolve()),
    revision = useRef(0);
  const sync = (b: Board) => {
    current.current = b;
    setBoard(b);
    all.current = [
      b,
      ...all.current.filter((x) => x.boardId !== b.boardId),
    ].sort((a, c) => c.updatedAt - a.updatedAt);
    setBoards(all.current);
  };
  const persist = (b: Board) => {
    const rev = ++revision.current;
    setStatus("儲存中…");
    queue.current = queue.current
      .catch(() => {})
      .then(() => repository.save(b))
      .then(() => {
        if (rev === revision.current) {
          setStatus("已儲存於此裝置");
          setError("");
        }
      })
      .catch((e) => {
        setStatus("儲存失敗");
        setError(
          `儲存失敗：${e instanceof Error ? e.message : String(e)}。請立即匯出 JSON 備份。`,
        );
      });
    return queue.current;
  };
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current) {
      const b = pending.current;
      pending.current = null;
      persist(b);
    }
    return queue.current;
  };
  const schedule = (b: Board) => {
    setStatus("尚未儲存");
    pending.current = clone(b);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  useEffect(() => {
    let alive = true;
    initial ??= initialize();
    initial
      .then(({ boards, active }) => {
        if (!alive) return;
        all.current = boards;
        setBoards(boards);
        sync(boards.find((b) => b.boardId === active) || boards[0]);
        setStatus("已儲存於此裝置");
      })
      .catch((e) => {
        initial = undefined;
        if (alive) {
          const b = makeBoard();
          all.current = [b];
          sync(b);
          setError(
            `無法開啟儲存空間：${String(e)}。目前在記憶體中操作，請匯出備份。`,
          );
          setStatus("儲存失敗");
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const hide = () => {
        if (document.visibilityState === "hidden") void flush();
      },
      unload = (e: BeforeUnloadEvent) => {
        if (pending.current || status === "儲存中…" || error) {
          void flush();
          e.preventDefault();
          e.returnValue = "";
        }
      };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", unload);
    };
  }, [status, error]);
  const history = () => {
    const bid = current.current!.boardId;
    if (!histories.current.has(bid)) histories.current.set(bid, new History());
    return histories.current.get(bid)!;
  };
  const checkpoint = () => {
    if (current.current) history().push(current.current);
  };
  const update = (fn: (b: Board) => void, record = true) => {
    if (!current.current) return;
    if (record) checkpoint();
    const next = clone(current.current);
    fn(next);
    next.updatedAt = Date.now();
    sync(next);
    schedule(next);
  };
  const undo = () => {
    if (!current.current) return;
    const b = history().undo(current.current);
    if (b) {
      b.updatedAt = Date.now();
      sync(b);
      schedule(b);
    }
  };
  const redo = () => {
    if (!current.current) return;
    const b = history().redo(current.current);
    if (b) {
      b.updatedAt = Date.now();
      sync(b);
      schedule(b);
    }
  };
  const open = async (bid: string) => {
    await flush();
    const b = all.current.find((b) => b.boardId === bid);
    if (b) {
      sync(b);
      repository.active(bid).catch((e) => setError(String(e)));
    }
  };
  const add = async () => {
    await flush();
    const b = makeBoard("新的白板");
    sync(b);
    await persist(b);
    await repository.active(b.boardId);
  };
  const rename = async (bid: string, name: string) => {
    if (!name.trim()) return;
    await flush();
    const b = clone(all.current.find((b) => b.boardId === bid)!);
    b.name = name.trim().slice(0, 200);
    b.updatedAt = Date.now();
    all.current = all.current.map((x) => (x.boardId === bid ? b : x));
    setBoards(all.current);
    if (current.current?.boardId === bid) sync(b);
    await persist(b);
  };
  const duplicate = async (bid: string) => {
    await flush();
    const b = clone(all.current.find((b) => b.boardId === bid)!);
    b.boardId = id();
    b.name = b.name.slice(0, 180) + "（複本）";
    b.updatedAt = Date.now();
    sync(b);
    await persist(b);
    await repository.active(b.boardId);
  };
  const remove = async (bid: string) => {
    await flush();
    try {
      await repository.remove(bid);
      all.current = all.current.filter((b) => b.boardId !== bid);
      histories.current.delete(bid);
      if (!all.current.length) await add();
      else if (current.current?.boardId === bid) {
        sync(all.current[0]);
        await repository.active(all.current[0].boardId);
      } else setBoards(all.current);
    } catch (e) {
      setError(`刪除失敗：${String(e)}`);
    }
  };
  const backup = async (whole = false) => {
    await flush();
    const text = exportProject(whole ? all.current : [current.current!]);
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-canvas-${whole ? "workspace" : current.current!.name}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const restore = async (file: File) => {
    try {
      if (file.size > 20_000_000) throw new Error("檔案超過 20 MB");
      const imported = importProject(await file.text());
      await flush();
      for (const b of imported) {
        await repository.save(b);
        all.current.push(b);
      }
      sync(imported[0]);
      await repository.active(imported[0].boardId);
      setStatus("已儲存於此裝置");
      setError("");
    } catch (e) {
      setError(`匯入失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  };
  return {
    board,
    boards,
    status,
    error,
    setError,
    current,
    update,
    checkpoint,
    undo,
    redo,
    open,
    add,
    rename,
    duplicate,
    remove,
    backup,
    restore,
    flush,
    canUndo: board
      ? (histories.current.get(board.boardId)?.past.length || 0) > 0
      : false,
    canRedo: board
      ? (histories.current.get(board.boardId)?.future.length || 0) > 0
      : false,
  };
}
