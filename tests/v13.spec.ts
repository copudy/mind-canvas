import { test, expect, type Page } from "@playwright/test";
import { waitSaved, dataAction } from "./ui";
import { readFile } from "node:fs/promises";
test("offline first use loads the lazy rich editor and persists formatted text", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await waitSaved(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await tool(page, "文字筆記", "新增自由文字");
  const e = page.getByRole("textbox", { name: "編輯節點文字", exact: true });
  await e.fill("");
  await e.pressSequentially("**offline** ");
  await expect(e.locator("strong")).toHaveText("offline");
  await e.press("Control+Enter");
  await waitSaved(page);
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(page.locator(".rich-view strong")).toHaveText("offline");
  await context.setOffline(false);
});
async function start(p: Page) {
  await p.goto("./");
  await waitSaved(p);
  await p.getByRole("button", { name: "建立新白板", exact: true }).click();
}
async function tool(p: Page, category: string, name: string) {
  const expand = p.getByRole("button", { name: "展開工具庫", exact: true });
  if (await expand.isVisible()) await expand.click();
  await p.getByRole("tab", { name: category, exact: true }).click();
  await p.getByRole("button", { name, exact: true }).click();
}
async function text(p: Page, value: string, name = "新增自由文字") {
  await tool(p, "文字筆記", name);
  const e = p.getByRole("textbox", { name: "編輯節點文字", exact: true });
  await e.fill(value);
  await e.press("Control+Enter");
  await waitSaved(p);
}
async function board(p: Page) {
  return p.evaluate(async () => {
    const r = indexedDB.open("freeform-mind-canvas", 1);
    const db = await new Promise<IDBDatabase>(
      (resolve) => (r.onsuccess = () => resolve(r.result)),
    );
    const tx = db.transaction(["meta", "boards"]);
    const active = await new Promise<string>((resolve) => {
      const q = tx.objectStore("meta").get("workspace-v1");
      q.onsuccess = () => resolve(JSON.parse(q.result).lastOpened);
    });
    return await new Promise<any>((resolve) => {
      const q = tx.objectStore("boards").get(active);
      q.onsuccess = () => {
        resolve(q.result);
        db.close();
      };
    });
  });
}
test("new text and heading size, eight captured resize handles and appearance undo", async ({
  page,
}) => {
  await start(page);
  await text(page, "一個完整可讀的想法");
  const node = page.locator(".react-flow__node");
  await node.locator(".node-text").click();
  await expect(node.locator(".resize-hit")).toHaveCount(8);
  const box = await node.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(230);
  const handle = node.getByRole("button", {
    name: "縮放 bottom-right",
    exact: true,
  });
  const hit = await handle.boundingBox();
  expect(hit!.width).toBeGreaterThanOrEqual(27);
  await page.mouse.move(hit!.x + hit!.width / 2, hit!.y + hit!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    hit!.x + hit!.width / 2 + 100,
    hit!.y + hit!.height / 2 + 50,
    { steps: 5 },
  );
  await page.mouse.up();
  expect((await node.boundingBox())!.width).toBeGreaterThan(box!.width + 80);
  await page.getByLabel("快捷背景色", { exact: true }).fill("#ff0000");
  await expect(node.locator(".canvas-item")).toHaveCSS(
    "background-color",
    "rgb(255, 0, 0)",
  );
  await page.getByRole("button", { name: "重設外觀", exact: true }).click();
  await expect(node.locator(".canvas-item")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await expect(node.locator(".canvas-item")).toHaveCSS(
    "background-color",
    "rgb(255, 0, 0)",
  );
  await text(page, "明確標題", "標題");
  const h = page.locator(".canvas-item", { hasText: "明確標題" });
  await expect(h).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(h).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
  await page.screenshot({ path: "artifacts/v13-appearance.png" });
});
test("Markdown WYSIWYG paste, editing shortcuts, composition safety and restore", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "新增自由文字");
  const e = page.getByRole("textbox", { name: "編輯節點文字", exact: true });
  await e.fill("");
  await e.evaluate((el) => {
    const data = new DataTransfer();
    data.setData(
      "text/plain",
      "**粗體** *斜體* `code`\n\n- 機票\n- 住宿\n\n1. 開始\n2. 完成",
    );
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(e.locator("strong")).toHaveText("粗體");
  await expect(e.locator("em")).toHaveText("斜體");
  await expect(e.locator("code")).toHaveText("code");
  await expect(e.locator("li")).toHaveCount(4);
  await e.evaluate((el) =>
    el.dispatchEvent(
      new CompositionEvent("compositionstart", { data: "", bubbles: true }),
    ),
  );
  await e.evaluate((el) =>
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  await expect(e).toBeVisible();
  await e.evaluate((el) =>
    el.dispatchEvent(
      new CompositionEvent("compositionend", { data: "中文", bubbles: true }),
    ),
  );
  await page.waitForTimeout(100);
  await e.press("Control+Enter");
  await waitSaved(page);
  const b = await board(page);
  expect(b.nodes[0].rich).toBeTruthy();
  expect(b.nodes[0].text).not.toContain("**");
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(page.locator(".rich-view strong")).toHaveText("粗體");
  await expect(page.locator(".rich-view li")).toHaveCount(4);
});
test("list item anchor survives reorder and deletion undo and JSON backup", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "清單");
  await page
    .getByRole("textbox", { name: "編輯節點文字", exact: true })
    .press("Control+Enter");
  await waitSaved(page);
  const list = page.locator(".react-flow__node").first();
  await text(page, "飯店比較");
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  await page.waitForTimeout(400);
  const port = list.locator(".list-port.source").nth(1),
    target = page
      .locator(".react-flow__node")
      .nth(1)
      .locator(".node-port.react-flow__handle-left");
  const a = await port.boundingBox(),
    b = await target.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await waitSaved(page);
  let d = await board(page);
  expect(d.relations).toHaveLength(1);
  const originalPath = await page
    .locator(".react-flow__edge-path")
    .getAttribute("d");
  const anchor = d.relations[0].sourceItem;
  expect(anchor).toBeTruthy();
  await list.locator("li").nth(1).hover();
  await list
    .locator("li")
    .nth(1)
    .getByRole("button", { name: "清單項目上移", exact: true })
    .click();
  await waitSaved(page);
  d = await board(page);
  expect(d.relations[0].sourceItem).toBe(anchor);
  await expect(page.locator(".react-flow__edge-path")).not.toHaveAttribute(
    "d",
    originalPath!,
  );
  await list.locator("li").first().hover();
  await list
    .getByRole("button", { name: "刪除清單項目", exact: true })
    .first()
    .click();
  await waitSaved(page);
  expect((await board(page)).relations).toHaveLength(0);
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await waitSaved(page);
  expect((await board(page)).relations[0].sourceItem).toBe(anchor);
  const download = page.waitForEvent("download");
  await dataAction(page, "匯出本白板");
  const f = await (await download).path();
  const raw = JSON.parse(await readFile(f!, "utf8"));
  expect(raw.schemaVersion).toBe(4);
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles(f!);
  await waitSaved(page);
  expect((await board(page)).relations[0].sourceItem).toBe(anchor);
});
test("table selected cell range row column styles persist and undo", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "表格");
  const first = page.getByRole("textbox", {
      name: "表格第 2 列第 1 欄",
      exact: true,
    }),
    last = page.getByRole("textbox", {
      name: "表格第 3 列第 2 欄",
      exact: true,
    });
  await first.click();
  await last.click({ modifiers: ["Shift"] });
  await page.getByLabel("儲存格背景色", { exact: true }).fill("#fff1bf");
  await waitSaved(page);
  let w = (await board(page)).nodes[0].widget;
  expect(Object.keys(w.styles)).toHaveLength(4);
  await page.getByRole("button", { name: "選取第 2 欄", exact: true }).click();
  await page.getByLabel("儲存格文字色", { exact: true }).fill("#ff0000");
  await page.getByLabel("儲存格對齊", { exact: true }).selectOption("center");
  await waitSaved(page);
  w = (await board(page)).nodes[0].widget;
  expect(w.styles["0:1"].color).toBe("#ff0000");
  expect(w.styles["2:1"].align).toBe("center");
  await page.getByRole("button", { name: "清除格式", exact: true }).click();
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await waitSaved(page);
  expect((await board(page)).nodes[0].widget.styles["0:1"].color).toBe(
    "#ff0000",
  );
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  expect((await board(page)).nodes[0].widget.styles["2:1"].align).toBe(
    "center",
  );
  const download = page.waitForEvent("download");
  await dataAction(page, "匯出本白板");
  const file = await (await download).path();
  expect(JSON.parse(await readFile(file!, "utf8")).schemaVersion).toBe(4);
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles(file!);
  await waitSaved(page);
  expect((await board(page)).nodes[0].widget.styles["2:1"].align).toBe(
    "center",
  );
  await page.screenshot({ path: "artifacts/v13-table.png" });
});
test("Callout body title icon presets and compact framework menu", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "Callout");
  await page
    .getByRole("textbox", { name: "編輯節點文字", exact: true })
    .fill("重要訊息 **不應丟失**");
  await page
    .getByRole("textbox", { name: "編輯節點文字", exact: true })
    .press("Control+Enter");
  await page.getByLabel("Callout 標題", { exact: true }).fill("出發前提醒");
  await page.getByLabel("Callout 圖示", { exact: true }).selectOption("⚠️");
  await page.getByLabel("Callout 強調色", { exact: true }).fill("#ff0000");
  await waitSaved(page);
  expect((await board(page)).nodes[0].callout).toMatchObject({
    title: "出發前提醒",
    icon: "⚠️",
    accent: "#ff0000",
  });
  await page
    .getByLabel("Callout 外觀預設", { exact: true })
    .selectOption("quote");
  await page.getByRole("tab", { name: "思考框架", exact: true }).click();
  expect(
    await page.locator(".library-tools > button").allTextContents(),
  ).toEqual(["我的範本", "心智圖範本"]);
  await expect(
    page.getByRole("button", { name: "新增心智圖節點", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "artifacts/v13-callout.png" });
});

test("typed Markdown input rules shortcuts and native editor undo redo", async ({
  page,
}) => {
  await start(page);
  await tool(page, "文字筆記", "新增自由文字");
  const e = page.getByRole("textbox", { name: "編輯節點文字", exact: true });
  await e.fill("");
  await e.pressSequentially("**鍵盤粗體** ");
  await expect(e.locator("strong").first()).toContainText("鍵盤粗體");
  await e.press("Control+b");
  await e.pressSequentially("快捷");
  await e.press("Control+b");
  await e.press("Control+z");
  await e.press("Control+Shift+z");
  await expect(e).toContainText("快捷");
  await e.press("Control+i");
  await e.pressSequentially("斜體");
  await e.press("Control+i");
  await expect(e.locator("em").first()).toContainText("斜體");
  await e.pressSequentially(" `行內` ");
  await expect(e.locator("code").first()).toContainText("行內");
  await e.press("Enter");
  await e.pressSequentially("- 項目 A");
  await e.press("Enter");
  await e.pressSequentially("項目 B");
  await expect(e.locator("ul li")).toHaveCount(2);
  await e.press("Enter");
  await e.press("Enter");
  await e.pressSequentially("1. 步驟");
  await expect(e.locator("ol li")).toHaveCount(1);
  await e.press("Control+Enter");
  await waitSaved(page);
  await expect(page.locator(".rich-view strong").first()).toContainText(
    "鍵盤粗體",
  );
  await page.screenshot({ path: "artifacts/v13-markdown.png" });
});
test.describe("touch and viewport coordinate transforms", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("touch selects and captures resize at two zoom levels", async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await start(page);
    await text(page, "觸控想法");
    const node = page.locator(".react-flow__node");
    const body = await node.locator(".node-text").boundingBox();
    await page.touchscreen.tap(body!.x + 15, body!.y + 15);
    await expect(node.locator(".resize-hit")).toHaveCount(8);
    const cdp = await context.newCDPSession(page);
    const before = (await board(page)).nodes[0];
    const handle = node.getByRole("button", {
      name: "縮放 bottom-right",
      exact: true,
    });
    const hit = await handle.boundingBox();
    expect(hit!.width).toBeGreaterThanOrEqual(38);
    const x = hit!.x + hit!.width / 2,
      y = hit!.y + hit!.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 45, y: y + 30 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await waitSaved(page);
    expect((await board(page)).nodes[0].width).toBeGreaterThan(
      before.width + 35,
    );
    await page.locator(".canvas-surface").focus();
    await page.keyboard.down("Control");
    await page.mouse.move(200, 360);
    await page.mouse.wheel(0, 500);
    await page.keyboard.up("Control");
    await page.waitForTimeout(400);
    await waitSaved(page);
    expect((await board(page)).viewport.zoom).toBeLessThan(1);
    expect((await handle.boundingBox())!.width).toBeGreaterThanOrEqual(38);
    await expect(
      page.getByRole("button", { name: "進階設定", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: "artifacts/v13-touch.png" });
    expect(errors).toEqual([]);
  });
});
