import { useEffect, useRef, useState } from "react";
import { clone, makeBoard, id, type Board } from "./model";
import { welcomeBoard, refreshGreeting, arrangeGuide } from "./guide";
import { History } from "./history";
import { repository, exportProject, importBundle } from "./storage";
import type { CanvasTemplate } from "./templates";
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
  if (!guide.guide?.protected) {
    const legacy = clone(guide);
    legacy.boardId = id();
    delete legacy.guide;
    legacy.name = "使用指南（舊版練習保留）";
    const fresh = welcomeBoard();
    fresh.boardId = guide.boardId;
    // Archive old editable content and upgrade the official document atomically.
    try {
      await repository.saveMany([legacy, fresh]);
      boards.push(legacy);
      Object.assign(guide, fresh);
    } catch {
      unsaved.push(guide);
      prefsWarning = "指南升級未完成；舊指南內容已保留，請先備份。";
    }
  }
  arrangeGuide(guide);
  refreshGreeting(guide);
  try {
    await repository.save(guide);
  } catch {
    unsaved.push(guide);
  }
  return { boards, prefs, guideId: guide.boardId, prefsWarning, unsaved };
}
export function useWorkspace() {
  const [templates, setTemplates] = useState<CanvasTemplate[]>([]);
  const templatesRef = useRef<CanvasTemplate[]>([]);
  const templatesReadFailed = useRef(false);
  const templatesReady = useRef(false);
  useEffect(() => {
    void repository
      .templates()
      .then((t) => {
        templatesReady.current = true;
        templatesRef.current = t;
        setTemplates(t);
      })
      .catch(() => {
        templatesReady.current = true;
        templatesReadFailed.current = true;
        setError(
          "我的範本讀取失敗；為保護原資料，已停用範本修改與全部備份。請保留現有備份。",
        );
      });
  }, []);
  const saveTemplates = async (
    change: (current: CanvasTemplate[]) => CanvasTemplate[],
  ) => {
    if (!templatesReady.current) throw new Error("正在載入範本，請稍後再試");
    if (templatesReadFailed.current)
      throw new Error("範本讀取失敗，不能覆寫原資料");
    prefsPending.current++;
    const job = prefsQueue.current
      .catch(() => {})
      .then(async () => {
        const next = change(templatesRef.current);
        await repository.templates(next);
        templatesRef.current = next;
        setTemplates(next);
      });
    prefsQueue.current = job.then(
      () => {},
      () => {},
    );
    try {
      await job;
    } catch (e) {
      setError(`範本儲存失敗：${String(e)}。請勿關閉本頁。`);
      throw e;
    } finally {
      prefsPending.current--;
    }
  };
  const [prefs, setPrefs] = useState<WorkspacePrefs>(emptyPrefs);
  const prefsRef = useRef<WorkspacePrefs>(emptyPrefs());
  const prefsQueue = useRef(Promise.resolve());
  const [prefsError, setPrefsError] = useState("");
  const prefsPending = useRef(0);
  const gesture = useRef(false);
  const [lastSaved, setLastSaved] = useState(0),
    [lastBackup, setLastBackup] = useState(0);
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
      .then((stamp) => {
        if (current.current?.boardId === b.boardId) setLastSaved(stamp);
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
  const schedule = (b: Board, content = true) => {
    // A completed older write must never announce a newer edit as saved.
    revision.current++;
    setStatus("尚未儲存");
    pending.current = clone(b);
    if (timer.current) clearTimeout(timer.current);
    if (!gesture.current)
      timer.current = setTimeout(flush, content ? 800 : 1600);
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
        void repository
          .savedAt(guideId)
          .then((stamp) => {
            if (current.current?.boardId === guideId) setLastSaved(stamp);
          })
          .catch(() => {});
        void repository
          .backupAt()
          .then(setLastBackup)
          .catch(() => {});
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
    if (JSON.stringify(next) === JSON.stringify(prefsRef.current))
      return prefsQueue.current;
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
    if (current.current && !current.current.guide)
      history().push(current.current);
  };
  const update = (
    fn: (b: Board) => void,
    record = true,
    contentChange = true,
  ) => {
    if (!current.current) return;
    if (current.current.guide && contentChange) return;
    const next = clone(current.current);
    fn(next);
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    if (record) checkpoint();
    if (contentChange) next.updatedAt = Date.now();
    sync(next);
    schedule(next, contentChange);
  };
  const undo = () => {
    if (!current.current || current.current.guide) return;
    const b = history().undo(current.current);
    if (b) {
      b.updatedAt = Date.now();
      sync(b);
      schedule(b);
    }
  };
  const redo = () => {
    if (!current.current || current.current.guide) return;
    const b = history().redo(current.current);
    if (b) {
      if (b.guide) refreshGreeting(b);
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
      setLastSaved(await repository.savedAt(bid).catch(() => 0));
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
    if (all.current.find((b) => b.boardId === bid)?.guide) return;
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
    if (all.current.find((b) => b.boardId === bid)?.guide) return;
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
    if (whole && !templatesReady.current) {
      setError("正在載入範本，請稍後再製作完整備份。");
      return;
    }
    if (whole && templatesReadFailed.current) {
      setError(
        "範本讀取失敗，無法製作完整備份；請先匯出個別白板，保留原範本資料。",
      );
      return;
    }
    await flush();
    const text = exportProject(
      whole ? all.current : [current.current!],
      whole ? templatesRef.current : undefined,
    );
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-canvas-${whole ? "workspace" : current.current!.name}.json`;
    a.click();
    const stamp = Date.now();
    try {
      await repository.backupAt(stamp);
      setLastBackup(stamp);
    } catch {
      setPrefsError("備份資訊保存失敗；JSON 匯出已發起，請確認下載檔案。");
    }
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const restore = async (file: File) => {
    try {
      if (!templatesReady.current)
        throw new Error("正在載入範本，請稍後再匯入");
      if (templatesReadFailed.current)
        throw new Error("原範本讀取失敗，已停止匯入以避免覆寫");
      if (file.size > 20_000_000) throw new Error("檔案超過 20 MB");
      const bundle = importBundle(await file.text()),
        imported = bundle.boards;
      await flush();
      const mergedTemplates = [...templatesRef.current, ...bundle.templates];
      if (mergedTemplates.length > 100)
        throw new Error("範本超過100個；未匯入任何資料");
      const stamp = await repository.saveMany(imported, mergedTemplates);
      templatesRef.current = mergedTemplates;
      setTemplates(mergedTemplates);
      all.current.push(...imported);
      sync(imported[0]);
      setLastSaved(stamp);
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
    templates,
    saveTemplate: (t: CanvasTemplate) =>
      saveTemplates((current) => [...current, t]),
    renameTemplate: (tid: string, name: string) =>
      saveTemplates((current) =>
        current.map((t) =>
          t.id === tid ? { ...t, name: name.trim().slice(0, 80) } : t,
        ),
      ),
    removeTemplate: (tid: string) =>
      saveTemplates((current) => current.filter((t) => t.id !== tid)),
    lastSaved,
    lastBackup,
    beginGesture: () => {
      gesture.current = true;
      if (timer.current) clearTimeout(timer.current);
    },
    endGesture: () => {
      gesture.current = false;
      if (pending.current) timer.current = setTimeout(flush, 250);
    },
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
