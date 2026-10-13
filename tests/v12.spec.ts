import { test, expect, type Page } from "@playwright/test";
import { waitSaved, dataAction } from "./ui";
import { readFile } from "node:fs/promises";
async function start(p: Page) {
  await p.goto("./");
  await waitSaved(p);
  await p.getByRole("button", { name: "建立新白板", exact: true }).click();
  await waitSaved(p);
}
async function tool(p: Page, category: string, label: string) {
  const expand = p.getByRole("button", { name: "展開工具庫", exact: true });
  if (await expand.isVisible()) await expand.click();
  await p.getByRole("tab", { name: category, exact: true }).click();
  await p.getByRole("button", { name: label, exact: true }).click();
}
async function resume(p: Page) {
  await p.reload();
  await waitSaved(p);
  await p.getByRole("button", { name: /繼續上次的白板/ }).click();
  await waitSaved(p);
}
test("frequent tools first and hover previews distinguish a node from structured templates", async ({
  page,
}) => {
  await start(page);
  const labels = await page
    .locator(".library-tools > button")
    .allTextContents();
  expect(labels).toEqual(["我的範本", "心智圖範本"]);
  await expect(
    page.getByRole("button", { name: "新增心智圖節點", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "流程圖範本", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "心智圖範本", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "一次加入主題及範例分支",
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/v12-preview-desktop.png" });
  await page.getByRole("button", { name: "我的範本", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toContainText("保存的物件組合");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("tab", { name: "文字筆記", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "新增便條紙", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "實用工具", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "新增便條紙", exact: true }),
  ).toBeVisible();
});
test("editable tables autosave while focused, resize rows and restore backup with custom template", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "表格");
  const cell = page.getByRole("textbox", {
    name: "表格第 2 列第 2 欄",
    exact: true,
  });
  await cell.fill("專案成本 1200");
  await waitSaved(page);
  await resume(page);
  await expect(cell).toHaveValue("專案成本 1200");
  await page.getByRole("button", { name: "＋列", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "表格第 4 列第 1 欄", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "－列", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "表格第 4 列第 1 欄", exact: true }),
  ).toHaveCount(0);
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await expect(
    page.getByRole("textbox", { name: "表格第 4 列第 1 欄", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "＋欄", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "表格第 1 列第 4 欄", exact: true }),
  ).toBeVisible();
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await expect(
    page.getByRole("textbox", { name: "表格第 1 列第 4 欄", exact: true }),
  ).toHaveCount(0);
  await page.locator(".widget-title").click();
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("/");
  await page
    .getByRole("textbox", { name: "搜尋節點與命令" })
    .fill("儲存為我的範本");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "儲存為我的範本", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "範本名稱", exact: true })
    .fill("成本紀錄表");
  await page.getByRole("button", { name: "保存範本", exact: true }).click();
  await waitSaved(page);
  const download = page.waitForEvent("download");
  await dataAction(page, "全部備份");
  const file = await (await download).path();
  const raw = JSON.parse(await readFile(file!, "utf8"));
  expect(raw.schemaVersion).toBe(3);
  expect(raw.templates[0].document.nodes[0].widget.cells[1][1]).toBe(
    "專案成本 1200",
  );
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles(file!);
  await waitSaved(page);
  await expect(cell).toHaveValue("專案成本 1200");
  await tool(page, "思考框架", "我的範本");
  await expect(
    page.getByRole("button", { name: "插入 成本紀錄表（匯入）", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "範本結構預覽" }).first(),
  ).toBeVisible();
});
test("icons and calendar notes persist without triggering canvas keyboard actions", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "圖示");
  await page.getByRole("combobox", { name: "選擇圖示" }).selectOption("⭐");
  await waitSaved(page);
  await resume(page);
  await expect(
    page.getByRole("img", { name: "圖示 ⭐", exact: true }),
  ).toBeVisible();
  await tool(page, "實用工具", "小日曆");
  const note = page.getByRole("textbox", { name: "日期記事", exact: true });
  await note.fill("旅行準備：確認住宿");
  await note.press("Enter");
  await note.press("Tab");
  await waitSaved(page);
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  await resume(page);
  await expect(note).toHaveValue("旅行準備：確認住宿\n");
  await page.getByRole("button", { name: "下一個月", exact: true }).click();
  await page.getByRole("button", { name: "上一個月", exact: true }).click();
  await expect(note).toHaveValue("旅行準備：確認住宿\n");
  await page.screenshot({ path: "artifacts/v12-calendar-desktop.png" });
});
test("mobile tool preview and calendar stay within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await page.getByRole("button", { name: "心智圖範本", exact: true }).focus();
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  const box = await tip.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "artifacts/v12-preview-mobile.png" });
  await tool(page, "實用工具", "小日曆");
  await page.getByRole("textbox", { name: "日期記事" }).fill("手機記事");
  await waitSaved(page);
  await resume(page);
  await expect(page.getByRole("textbox", { name: "日期記事" })).toHaveValue(
    "手機記事",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/v12-calendar-mobile.png" });
});
