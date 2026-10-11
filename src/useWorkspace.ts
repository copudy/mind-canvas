import { useEffect, useRef, useState } from "react";
import { clone, makeBoard, id, type Board } from "./model";
import { welcomeBoard, refreshGreeting } from "./guide";
import { History } from "./history";
import { repository, exportProject, importProject } from "./storage";
import {
  emptyPrefs,
  normalizePrefs,
  deleteSection,
  type WorkspacePrefs,
} from "./workspacePrefs";
let initial:
  | Promise<{
      boards: Board[];
      prefs: WorkspacePrefs;
      guideId: string;
      prefsWarning: string;
      unsaved: Board[];
    }>
  | undefined;
async function initialize() {
  const boards = await repository.list();
  const unsaved: Board[] = [];
  let prefsWarning = "";
  if (!boards.some((b) => b.guide)) {
    const b = welcomeBoard();
    boards.push(b);
  }
  const active = await repository.active();
  let raw: unknown;
  try {
    raw = await repository.workspacePrefs();
  } catch {
    prefsWarning =
      "白板管理設定讀取失敗；已保留白板內容，請重新設定釘選與區段。";
  }
  const prefs = normalizePrefs(raw, boards, active);
  try {
    await repository.workspacePrefs(prefs);
  } catch {
    prefsWarning =
      "白板管理設定儲存失敗；本次釘選、區段與上次開啟紀錄可能無法保留。";
  }
  const guide = boards.find((b) => b.guide)!;
  refreshGreeting(guide);
  try {
    await repository.save(guide);
  } catch {
    unsaved.push(guide);
  }
  return { boards, prefs, guideId: guide.boardId, prefsWarning, unsaved };
}
export function useWorkspace() {
  const [prefs, setPrefs] = useState<WorkspacePrefs>(emptyPrefs);
  const prefsRef = useRef<WorkspacePrefs>(emptyPrefs());
  const prefsQueue = useRef(Promise.resolve());
  const [prefsError, setPrefsError] = useState("");
  const prefsPending = useRef(0);
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
    failed = useRef(new Map<string, Board>()),
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
        failed.current.delete(b.boardId);
        if (rev === revision.current) {
          if (failed.current.size) {
            setStatus("儲存失敗");
            setError(
              `仍有 ${failed.current.size} 張白板未儲存。請立即匯出全部備份。`,
            );
          } else {
            setStatus("已儲存於此裝置");
            setError("");
          }
        }
      })
      .catch((e) => {
        failed.current.set(b.boardId, b);
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
    return Promise.all([queue.current, prefsQueue.current]).then(() => {});
  };
  const schedule = (b: Board) => {
    // A completed older write must never announce a newer edit as saved.
    revision.current++;
    setStatus("尚未儲存");
    pending.current = clone(b);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  useEffect(() => {
    let alive = true;
    initial ??= initialize();
    initial
      .then(({ boards, prefs, guideId, prefsWarning, unsaved }) => {
        if (!alive) return;
        all.current = boards;
        setBoards(boards);
        prefsRef.current = prefs;
        setPrefs(prefs);
        setPrefsError(prefsWarning);
        unsaved.forEach((b) => failed.current.set(b.boardId, b));
        sync(boards.find((b) => b.boardId === guideId)!);
        setStatus(unsaved.length ? "儲存失敗" : "已儲存於此裝置");
        if (unsaved.length)
          setError(
            "指南儲存失敗。既有白板已保留，請匯出備份並檢查瀏覽器儲存空間。",
          );
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
        if (
          pending.current ||
          prefsPending.current ||
          status === "儲存中…" ||
          error ||
          prefsError
        ) {
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
  }, [status, error, prefsError]);
  const changePrefs = (fn: (p: WorkspacePrefs) => void) => {
    const next = clone(prefsRef.current);
    fn(next);
    prefsRef.current = next;
    setPrefs(next);
    prefsPending.current++;
    prefsQueue.current = prefsQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          await repository.workspacePrefs(next);
          setPrefsError("");
        } catch (e) {
          setPrefsError(
            `白板管理設定儲存失敗：${String(e)}。重新開啟後可能無法保留本次設定。`,
          );
        } finally {
          prefsPending.current--;
        }
      });
    return prefsQueue.current;
  };
  const remember = (bid: string) =>
    changePrefs((p) => {
      p.lastOpened = bid;
    });
  const history = () => {
    const bid = current.current!.boardId;
    if (!histories.current.has(bid)) histories.current.set(bid, new History());
    return histories.current.get(bid)!;
  };
  const checkpoint = () => {
    if (current.current) history().push(current.current);
  };
  const update = (
    fn: (b: Board) => void,
    record = true,
    contentChange = true,
  ) => {
    if (!current.current) return;
    if (record) checkpoint();
    const next = clone(current.current);
    fn(next);
    if (contentChange) next.updatedAt = Date.now();
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
    if (current.current?.boardId === bid) return;
    await flush();
    const b = all.current.find((b) => b.boardId === bid);
    if (b) {
      sync(clone(b));
      if (!b.guide) await remember(bid);
    }
  };
  const add = async () => {
    await flush();
    const b = makeBoard("新的白板");
    sync(b);
    await persist(b);
    await remember(b.boardId);
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
    delete b.guide;
    b.name = b.name.slice(0, 180) + "（複本）";
    b.updatedAt = Date.now();
    sync(b);
    await persist(b);
    await remember(b.boardId);
  };
  const remove = async (bid: string) => {
    await flush();
    try {
      await repository.remove(bid);
      failed.current.delete(bid);
      all.current = all.current.filter((b) => b.boardId !== bid);
      await changePrefs((p) => {
        p.pinned = p.pinned.filter((x) => x !== bid);
        delete p.membership[bid];
        if (p.lastOpened === bid) delete p.lastOpened;
      });
      histories.current.delete(bid);
      if (!all.current.length) await add();
      else if (current.current?.boardId === bid) {
        sync(all.current[0]);
        if (!all.current[0].guide) await remember(all.current[0].boardId);
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
      await repository.saveMany(imported);
      all.current.push(...imported);
      sync(imported[0]);
      await remember(imported[0].boardId);
      if (failed.current.size) {
        setStatus("儲存失敗");
        setError(
          `仍有 ${failed.current.size} 張白板未儲存。請立即匯出全部備份。`,
        );
      } else {
        setStatus("已儲存於此裝置");
        setError("");
      }
    } catch (e) {
      setError(`匯入失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  };
  return {
    prefs,
    lastBoard: boards.find((b) => b.boardId === prefs.lastOpened && !b.guide),
    togglePin: (bid: string) =>
      changePrefs((p) => {
        if (!all.current.some((b) => b.boardId === bid && !b.guide)) return;
        p.pinned = p.pinned.includes(bid)
          ? p.pinned.filter((x) => x !== bid)
          : [...p.pinned, bid];
      }),
    addSection: (name: string) =>
      changePrefs((p) => {
        if (name.trim())
          p.sections.push({
            id: id(),
            name: name.trim().slice(0, 80),
            collapsed: false,
          });
      }),
    renameSection: (sid: string, name: string) =>
      changePrefs((p) => {
        const s = p.sections.find((s) => s.id === sid);
        if (s && name.trim()) s.name = name.trim().slice(0, 80);
      }),
    removeSection: (sid: string) => changePrefs((p) => deleteSection(p, sid)),
    collapseSection: (sid: string) =>
      changePrefs((p) => {
        const s = p.sections.find((s) => s.id === sid);
        if (s) s.collapsed = !s.collapsed;
      }),
    moveBoard: (bid: string, sid: string) =>
      changePrefs((p) => {
        if (sid && p.sections.some((s) => s.id === sid))
          p.membership[bid] = sid;
        else delete p.membership[bid];
      }),
    createGuide: async () => {
      const existing = all.current.find((b) => b.guide);
      if (existing) return open(existing.boardId);
      await flush();
      const b = welcomeBoard();
      sync(b);
      await persist(b);
    },
    resetGuide: () =>
      update((b) => {
        const fresh = welcomeBoard();
        Object.assign(b, {
          nodes: fresh.nodes,
          relations: fresh.relations,
          guide: fresh.guide,
          viewport: fresh.viewport,
          treeStyle: fresh.treeStyle,
        });
      }),
    board,
    boards,
    status,
    error: error || prefsError,
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
    safeToReload: () =>
      !failed.current.size &&
      !pending.current &&
      !prefsPending.current &&
      !prefsError &&
      status !== "儲存失敗",
    canUndo: board
      ? (histories.current.get(board.boardId)?.past.length || 0) > 0
      : false,
    canRedo: board
      ? (histories.current.get(board.boardId)?.future.length || 0) > 0
      : false,
  };
}
