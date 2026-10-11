import type { Board } from "./model";
export interface WorkspacePrefs {
  version: 1;
  lastOpened?: string;
  pinned: string[];
  sections: { id: string; name: string; collapsed: boolean }[];
  membership: Record<string, string>;
}
export const emptyPrefs = (): WorkspacePrefs => ({
  version: 1,
  pinned: [],
  sections: [],
  membership: {},
});
export function normalizePrefs(
  raw: unknown,
  boards: Board[],
  legacyActive?: string,
): WorkspacePrefs {
  const p = emptyPrefs();
  const valid = new Set(boards.filter((b) => !b.guide).map((b) => b.boardId));
  const r =
    raw && typeof raw === "object" ? (raw as Partial<WorkspacePrefs>) : {};
  const last = typeof r.lastOpened === "string" ? r.lastOpened : legacyActive;
  if (last && valid.has(last)) p.lastOpened = last;
  if (Array.isArray(r.pinned))
    p.pinned = [...new Set(r.pinned.filter((id) => valid.has(id)))];
  if (Array.isArray(r.sections))
    for (const s of r.sections) {
      if (
        s &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        s.name.trim() &&
        !p.sections.some((x) => x.id === s.id)
      )
        p.sections.push({
          id: s.id,
          name: s.name.trim().slice(0, 80),
          collapsed: !!s.collapsed,
        });
    }
  if (r.membership && typeof r.membership === "object")
    for (const [bid, sid] of Object.entries(r.membership))
      if (valid.has(bid) && p.sections.some((s) => s.id === sid))
        p.membership[bid] = sid;
  return p;
}
export function deleteSection(p: WorkspacePrefs, sid: string) {
  p.sections = p.sections.filter((s) => s.id !== sid);
  for (const bid of Object.keys(p.membership))
    if (p.membership[bid] === sid) delete p.membership[bid];
}
