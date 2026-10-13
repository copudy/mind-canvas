import { officialTemplates, instantiateTemplate } from "../src/templates";
import { makeBoard } from "../src/model";
import { test, expect, type Page } from "@playwright/test";
import { waitSaved, dataAction } from "./ui";
import { readFile } from "node:fs/promises";
test("legacy editable guide upgraded atomically and archived once without losing content", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  await page.waitForTimeout(300);
  await waitSaved(page);
  const original = (await docs(page)).find((b) => b.guide);
  await page.evaluate(async (g) => {
    delete g.guide.protected;
    g.nodes[0].text = "保留我的舊指南修改";
    const r = indexedDB.open("freeform-mind-canvas", 1);
    const db = await new Promise<IDBDatabase>(
      (resolve) => (r.onsuccess = () => resolve(r.result)),
    );
    const tx = db.transaction("boards", "readwrite");
    tx.objectStore("boards").put(g);
    await new Promise<void>((resolve) => (tx.oncomplete = () => resolve()));
    db.close();
  }, original);
  await page.reload();
  await waitSaved(page);
  const migrated = await docs(page);
  expect(migrated).toHaveLength(2);
  expect(migrated.find((b) => !b.guide).nodes[0].text).toBe(
    "保留我的舊指南修改",
  );
  expect(migrated.find((b) => b.guide).boardId).toBe(original.boardId);
  expect(migrated.find((b) => b.guide).nodes[0].text).toBe(
    "歡迎來到 Mind Canvas",
  );
  await page.reload();
  await waitSaved(page);
  expect(await docs(page)).toHaveLength(2);
});
test("malformed template import leaves all existing boards and templates intact", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  const original = await docs(page);
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad-template.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "freeform-mind-canvas",
        schemaVersion: 2,
        boards: original,
        templates: [
          {
            id: "bad",
            name: "broken",
            description: "",
            document: { schemaVersion: 99 },
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("alert")).toContainText("匯入失敗");
  expect((await docs(page)).map((b) => b.boardId)).toEqual(
    original.map((b) => b.boardId),
  );
});
async function docs(p: Page) {
  return p.evaluate(async () => {
    const r = indexedDB.open("freeform-mind-canvas", 1);
    const db = await new Promise<IDBDatabase>(
      (resolve) => (r.onsuccess = () => resolve(r.result)),
    );
    const rows = await new Promise<any[]>((resolve) => {
      const q = db.transaction("boards").objectStore("boards").getAll();
      q.onsuccess = () => resolve(q.result);
    });
    db.close();
    return rows;
  });
}
async function guide(p: Page) {
  await p.getByRole("button", { name: "說明與幫助", exact: true }).click();
  await p
    .getByRole("menuitem", { name: "Mind Canvas 使用指南", exact: true })
    .click();
  await waitSaved(p);
}
async function tool(p: Page, category: string, name: string) {
  const expand = p.getByRole("button", { name: "展開工具庫", exact: true });
  if (await expand.isVisible()) await expand.click();
  await p.getByRole("tab", { name: category, exact: true }).click();
  await p.getByRole("button", { name, exact: true }).click();
}
test("official guide read-only document, no copy, returns from any board", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  const original = (await docs(page)).find((b) => b.guide);
  await expect(page.locator(".guide-page")).toBeVisible();
  await expect(page.locator(".guide-card")).toHaveCount(6);
  await expect(page.locator(".guide-document .react-flow")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "建立可編輯副本", exact: true }),
  ).toHaveCount(0);
  await page.locator(".guide-hero h2").dblclick();
  await page.keyboard.press("Delete");
  await page.keyboard.press("Control+d");
  await expect(page.getByRole("textbox", { name: "編輯節點文字" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await waitSaved(page);
  await guide(page);
  const after = (await docs(page)).find((b) => b.guide);
  expect(
    after.nodes.filter((n: any) => n.id !== after.guide.greetingId),
  ).toEqual(
    original.nodes.filter((n: any) => n.id !== original.guide.greetingId),
  );
  await page.reload();
  await waitSaved(page);
  expect((await docs(page)).filter((b) => b.guide)).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: /繼續上次的白板/ }),
  ).toBeVisible();
});
test("six legacy official frameworks retain data and relations after menu removal", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  const legacy = makeBoard("既有分析框架");
  officialTemplates.forEach((t, i) => {
    const doc = instantiateTemplate(t, { x: i * 1100, y: 0 });
    legacy.nodes.push(...doc.nodes);
    legacy.relations.push(...doc.relations);
  });
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles({
    name: "legacy-frameworks.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "freeform-mind-canvas",
        schemaVersion: 1,
        boards: [legacy],
      }),
    ),
  });
  await waitSaved(page);
  const b = (await docs(page)).find((b) => b.name === "既有分析框架（匯入）");
  expect(b.nodes).toEqual(legacy.nodes);
  expect(b.relations).toEqual(legacy.relations);
  for (const t of officialTemplates)
    await expect(
      page.getByRole("button", { name: t.name, exact: true }),
    ).toHaveCount(0);
  expect(b.nodes.length).toBeGreaterThanOrEqual(30);
  expect(new Set(b.nodes.map((n: any) => n.id)).size).toBe(b.nodes.length);
  expect(b.relations.length).toBeGreaterThan(0);
  expect(b.nodes.some((n: any) => n.parentId)).toBe(true);
});
test("my templates save, insert with fresh IDs, rename, full backup restore and delete", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await tool(page, "思考框架", "心智圖範本");
  await waitSaved(page);
  // Select the complete real branch through Shift selection, equivalent to box selection output.
  const nodes = page.locator(".react-flow__node");
  await nodes.nth(0).click();
  await nodes.nth(1).click({ modifiers: ["Shift"] });
  await nodes.nth(2).click({ modifiers: ["Shift"] });
  await page
    .getByRole("button", { name: "儲存為我的範本", exact: true })
    .click();
  await page.getByRole("textbox", { name: "範本名稱" }).fill("我的專案分支");
  await page.getByRole("button", { name: "保存範本", exact: true }).click();
  await tool(page, "思考框架", "我的範本");
  await page
    .getByRole("button", { name: "插入 我的專案分支", exact: true })
    .click();
  await waitSaved(page);
  const b = (await docs(page)).find((b) => !b.guide);
  expect(b.nodes).toHaveLength(6);
  expect(b.nodes.filter((n: any) => n.parentId)).toHaveLength(4);
  expect(new Set(b.nodes.map((n: any) => n.id)).size).toBe(6);
  await tool(page, "思考框架", "我的範本");
  await page
    .getByRole("button", { name: "重新命名 我的專案分支", exact: true })
    .click();
  await page.getByRole("textbox", { name: "範本新名稱" }).fill("常用分支");
  await page.getByRole("button", { name: "儲存名稱", exact: true }).click();
  await page.getByRole("button", { name: "關閉範本" }).click();
  const d = page.waitForEvent("download");
  await dataAction(page, "全部備份");
  const path = await (await d).path();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.templates[0].name).toBe("常用分支");
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles(path!);
  await waitSaved(page);
  await tool(page, "思考框架", "我的範本");
  await expect(
    page.getByRole("button", { name: "插入 常用分支（匯入）", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "刪除 常用分支", exact: true })
    .click();
  await page.getByRole("button", { name: "確定刪除範本", exact: true }).click();
  await page.getByRole("button", { name: "關閉範本" }).click();
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await tool(page, "思考框架", "我的範本");
  await expect(
    page.getByRole("button", { name: "插入 常用分支", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "插入 常用分支（匯入）", exact: true }),
  ).toBeVisible();
});
test("single calculator mode toggles preserve ID, values, close/reopen and relations", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await tool(page, "實用工具", "計算機");
  await expect(
    page.getByRole("button", { name: "浮動計算機", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "釘選計算機", exact: true }),
  ).toHaveCount(0);
  const input = page.getByRole("textbox", { name: "計算機算式" });
  await input.fill("0.1+0.2");
  await input.press("Enter");
  await waitSaved(page);
  const c = (await docs(page)).find((b) => !b.guide).nodes[0];
  await tool(page, "實用工具", "計算機");
  await expect(page.locator(".floating-calculator")).toHaveCount(1);
  await page.getByRole("button", { name: "釘選浮動計算機" }).click();
  await expect(page.locator(".canvas-item.calculator output")).toHaveText(
    "0.3",
  );
  await waitSaved(page);
  expect((await docs(page)).find((b) => !b.guide).nodes[0].id).toBe(c.id);
  await page.getByRole("button", { name: "取消釘選", exact: true }).click();
  await page
    .getByRole("button", { name: "關閉浮動計算機", exact: true })
    .click();
  await waitSaved(page);
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await tool(page, "實用工具", "計算機");
  await expect(page.locator(".floating-calculator output")).toHaveText("0.3");
  expect((await docs(page)).find((b) => !b.guide).nodes).toHaveLength(1);
});
for (const width of [1440, 390, 320])
  test(`guide readable document and sidebar stable canvas ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await waitSaved(page);
    await expect(page.locator(".guide-page")).toBeVisible();
    const box = await page.locator(".canvas-surface").boundingBox();
    const toggle = page.getByRole("button", { name: /白板清單/ });
    const label = await toggle.getAttribute("aria-label");
    await toggle.click();
    await expect(toggle).not.toHaveAttribute("aria-label", label!);
    expect(await page.locator(".canvas-surface").boundingBox()).toEqual(box);
    if (width <= 760) await toggle.click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const geometry = await page
      .locator(".guide-hero h2 span")
      .evaluate((e) => ({
        height: e.getBoundingClientRect().height,
        line: parseFloat(getComputedStyle(e).lineHeight),
        width: e.getBoundingClientRect().width,
      }));
    expect(geometry.height).toBeLessThanOrEqual(geometry.line + 3);
    await expect(
      page.locator(
        ".guide-learning-bar,.guide-document .react-flow__controls,.guide-document .react-flow__minimap",
      ),
    ).toHaveCount(0);
    await page.screenshot({ path: `artifacts/v111-guide-${width}.png` });
    await page.getByRole("button", { name: "切換深色主題" }).click();
    await page.screenshot({ path: `artifacts/v111-guide-dark-${width}.png` });
    await page.getByRole("link", { name: "05 資料與備份" }).click();
    await expect(page.locator("#guide-backup")).toBeInViewport();
    await page.getByRole("button", { name: "開啟資料與備份" }).click();
    await expect(
      page.getByRole("dialog", { name: "設定", exact: true }),
    ).toContainText("IndexedDB");
  });
