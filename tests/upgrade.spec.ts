import { test, expect } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
import { waitSaved, dataAction } from "./ui";
test("actual v1.2 client upgrades same origin SW without altering boards or templates", async ({
  page,
}) => {
  test.setTimeout(60000);
  await writeFile(".compat-v13-upgrade/mode.txt", "old");
  await page.goto("http://127.0.0.1:4175/mind-canvas/");
  await waitSaved(page);
  await expect(page.locator(".workbench")).not.toHaveAttribute(
    "data-version",
    "1.3.0",
  );
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await page.getByRole("tab", { name: "文字筆記", exact: true }).click();
  await page.getByRole("button", { name: "新增自由文字", exact: true }).click();
  await page
    .getByRole("textbox", { name: "編輯節點文字", exact: true })
    .fill("舊版原文 **不要自動格式化** 中文與備份");
  await page
    .getByRole("textbox", { name: "編輯節點文字", exact: true })
    .press("Control+Enter");
  await page.getByRole("button", { name: "表格", exact: true }).click();
  await page
    .getByRole("textbox", { name: "表格第 2 列第 2 欄", exact: true })
    .fill("舊表格 12345");
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
  await page.getByRole("textbox", { name: "範本名稱" }).fill("舊表格範本");
  await page.getByRole("button", { name: "保存範本", exact: true }).click();
  await waitSaved(page);
  const snapshot = () =>
    page.evaluate(async () => {
      const r = indexedDB.open("freeform-mind-canvas", 1);
      const db = await new Promise<IDBDatabase>(
        (resolve) => (r.onsuccess = () => resolve(r.result)),
      );
      const tx = db.transaction(["boards", "meta"]);
      const docs = await new Promise<any[]>((resolve) => {
        const q = tx.objectStore("boards").getAll();
        q.onsuccess = () => resolve(q.result.filter((b) => !b.guide));
      });
      const templates = await new Promise<any>((resolve) => {
        const q = tx.objectStore("meta").get("templates-v1");
        q.onsuccess = () => resolve(JSON.parse(q.result));
      });
      db.close();
      return { docs, templates };
    });
  const before = await snapshot();
  expect(before.docs[0].nodes).toHaveLength(2);
  expect(before.templates).toHaveLength(1);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await writeFile(".compat-v13-upgrade/mode.txt", "new");
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    const changed = new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => resolve(),
        { once: true },
      ),
    );
    await r.update();
    await changed;
  });
  await page.reload();
  await waitSaved(page);
  await expect(page.locator(".workbench")).toHaveAttribute(
    "data-version",
    "1.3.0",
  );
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await waitSaved(page);
  expect(await snapshot()).toEqual(before);
  await expect(
    page.getByText("舊版原文 **不要自動格式化** 中文與備份", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "表格第 2 列第 2 欄", exact: true }),
  ).toHaveValue("舊表格 12345");
  const dl = page.waitForEvent("download");
  await dataAction(page, "全部備份");
  const file = await (await dl).path();
  const data = JSON.parse(await readFile(file!, "utf8"));
  expect(data.templates[0].name).toBe("舊表格範本");
  await page.screenshot({ path: "artifacts/v13-upgrade-preserved.png" });
});
