import { waitSaved, dataAction, enterGuide, locate } from "./ui";
import { test, expect, type Page } from "@playwright/test";
const saved = (p: Page) => waitSaved(p);
async function state(p: Page) {
  return p.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((r) => {
      const q = indexedDB.open("freeform-mind-canvas", 1);
      q.onsuccess = () => r(q.result);
    });
    const get = (store: string, key?: string) =>
      new Promise<any>((r) => {
        const s = db.transaction(store).objectStore(store),
          q = key ? s.get(key) : s.getAll();
        q.onsuccess = () => r(q.result);
      });
    const boards = await get("boards"),
      raw = await get("meta", "workspace-v1");
    db.close();
    return { boards, prefs: JSON.parse(raw), version: 1 };
  });
}
async function start(p: Page) {
  await p.goto("/");
  await saved(p);
}
async function refresh(p: Page) {
  await saved(p);
  await p.reload();
  await saved(p);
  await expect(p.locator("h1")).toHaveText("歡迎使用 Mind Canvas");
}
async function rename(p: Page, old: string, name: string) {
  await p.getByRole("button", { name: `管理 ${old}`, exact: true }).click();
  await p.getByRole("button", { name: "重新命名", exact: true }).click();
  await p.getByRole("textbox", { name: "白板新名稱" }).fill(name);
  await p.getByRole("button", { name: "儲存", exact: true }).click();
  await saved(p);
}
async function create(p: Page, name: string) {
  await p.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await rename(p, "新的白板", name);
}
async function manage(p: Page, name: string) {
  await p.getByRole("button", { name: `管理 ${name}`, exact: true }).click();
}
async function section(p: Page, name: string) {
  await p.getByRole("button", { name: "新增區段", exact: true }).click();
  await p.getByRole("textbox", { name: "區段名稱" }).fill(name);
  await p.getByRole("button", { name: "儲存區段" }).click();
}
test("welcome startup refresh internal switching and last-opened independent of edit time", async ({
  page,
}) => {
  await start(page);
  await expect(
    page.getByRole("button", { name: /繼續上次的白板/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "探索使用指南", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("h1")).toHaveText("歡迎使用 Mind Canvas");

  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await rename(page, "新的白板", "A 最近編輯");
  await create(page, "B 最後開啟");
  await page.getByRole("button", { name: /A 最近編輯.*0 個想法/ }).click();
  await rename(page, "A 最近編輯", "A 更新內容");
  const before = (await state(page)).boards.find(
    (b: any) => b.name === "B 最後開啟",
  );
  await page.getByRole("button", { name: /B 最後開啟.*0 個想法/ }).click();
  await page.getByRole("button", { name: "Zoom In", exact: true }).click();
  await saved(page);
  await enterGuide(page);
  const x = await state(page);
  expect(x.prefs.lastOpened).toBe(before.boardId);
  expect(
    x.boards.find((b: any) => b.boardId === before.boardId).updatedAt,
  ).toBe(before.updatedAt);
  await refresh(page);
  await expect(
    page.getByRole("button", { name: /繼續上次的白板 B 最後開啟/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(page.locator("h1")).toHaveText("B 最後開啟");
  await refresh(page);
  expect((await state(page)).boards.filter((b: any) => b.guide)).toHaveLength(
    1,
  );
});
test("pin sections move rename collapse search delete and durable metadata preserve boards", async ({
  page,
}) => {
  await start(page);
  await create(page, "工作 A");
  await create(page, "生活 B");
  await section(page, "專案");
  await section(page, "生活");
  await manage(page, "工作 A");
  await page
    .getByRole("combobox", { name: "移動 工作 A 至區段" })
    .selectOption({ label: "專案" });
  await page
    .getByRole("button", { name: "收合區段 專案", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /工作 A.*0 個想法/ }),
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "搜尋白板名稱" }).fill("工作 A");
  await expect(
    page.getByRole("button", { name: /工作 A.*0 個想法/ }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "搜尋白板名稱" }).fill("");
  await manage(page, "生活 B");
  await page.getByRole("button", { name: "釘選白板", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "釘選", exact: true }),
  ).toContainText("生活 B");
  await page
    .getByRole("button", { name: "管理區段 生活", exact: true })
    .click();
  await page.getByRole("button", { name: "重新命名區段" }).click();
  await page.getByRole("textbox", { name: "區段名稱" }).fill("日常");
  await page.getByRole("button", { name: "儲存區段" }).click();
  const before = await state(page);
  await refresh(page);
  const after = await state(page);
  expect(after.prefs).toEqual(before.prefs);
  await expect(
    page.getByRole("button", { name: "展開區段 專案", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "收合區段 日常", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "管理區段 專案", exact: true })
    .click();
  await page.getByRole("button", { name: "刪除區段", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("不會被刪除");
  await page.getByRole("button", { name: "確認刪除區段", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "最近編輯", exact: true }),
  ).toContainText("工作 A");
  await manage(page, "生活 B");
  await page.getByRole("button", { name: "取消釘選白板", exact: true }).click();
  await manage(page, "生活 B");
  await page
    .getByRole("combobox", { name: "移動 生活 B 至區段" })
    .selectOption({ label: "日常" });
  await manage(page, "生活 B");
  await page
    .getByRole("combobox", { name: "移動 生活 B 至區段" })
    .selectOption({ label: "未分類" });
  await refresh(page);
  const end = await state(page);
  expect(end.boards.filter((b: any) => !b.guide)).toEqual(
    before.boards.filter((b: any) => !b.guide),
  );
  expect(end.prefs.membership).toEqual({});
  expect(end.prefs.pinned).toEqual([]);
});
test("deleting last board removes invalid continue without deleting guide", async ({
  page,
}) => {
  await start(page);
  await create(page, "暫存");
  await manage(page, "暫存");
  await page.getByRole("button", { name: "刪除白板", exact: true }).click();
  await page.getByRole("button", { name: "確認刪除", exact: true }).click();
  await refresh(page);
  await expect(
    page.getByRole("button", { name: /繼續上次的白板/ }),
  ).toHaveCount(0);
  expect((await state(page)).boards).toHaveLength(1);
});
for (const width of [1440, 390, 320])
  test(`readable UI no page overflow and accessible welcome controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await start(page);
    await expect(
      page.getByRole("button", { name: "建立新白板", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "探索使用指南", exact: true }),
    ).toHaveCount(0);
    const sizes = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      body: getComputedStyle(document.body).fontSize,
      tool: getComputedStyle(document.querySelector(".library-tools button")!)
        .fontSize,
      tab: getComputedStyle(document.querySelector('[role="tab"]')!).fontSize,
      zoom: getComputedStyle(document.body).zoom,
      icon: document
        .querySelector(".library-tools svg")!
        .getBoundingClientRect().width,
    }));
    expect(sizes.overflow).toBe(false);
    expect(parseFloat(sizes.body)).toBeGreaterThanOrEqual(14);
    expect(parseFloat(sizes.tool)).toBeGreaterThanOrEqual(13);
    expect(parseFloat(sizes.tab)).toBeGreaterThanOrEqual(13);
    expect(Number(sizes.zoom)).toBe(1);
    expect(sizes.icon).toBe(22);
    const lib = (await page.locator(".tool-library").boundingBox())!,
      mini = (await page.locator(".react-flow__minimap").boundingBox())!;
    expect(lib.x).toBeGreaterThanOrEqual(0);
    expect(lib.x + lib.width).toBeLessThanOrEqual(width);
    if (width < 760) expect(mini.y + mini.height).toBeLessThan(lib.y);
    await page.screenshot({ path: `artifacts/ux-${width}.png` });
    await page.screenshot({ path: `artifacts/ux-explore-${width}.png` });
  });

test("management storage failure warns while existing boards remain accessible", async ({
  page,
}) => {
  await start(page);
  await create(page, "不能遺失的白板");
  const before = (await state(page)).boards.find((b: any) => !b.guide);
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === "meta" && key === "workspace-v1")
        throw new DOMException("test quota", "QuotaExceededError");
      return original.call(this, value, key);
    };
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("白板管理設定儲存失敗");
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(page.locator("h1")).toHaveText("不能遺失的白板");
  await manage(page, "不能遺失的白板");
  await page.getByRole("button", { name: "釘選白板", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("白板管理設定儲存失敗");
  expect(
    (await state(page)).boards.find((b: any) => b.boardId === before.boardId),
  ).toEqual(before);
});
