import { test, expect, type Page } from "@playwright/test";
import { makeBoard, makeItem } from "../src/model";
async function ready(page: Page, url = "/") {
  await page.goto(url);
  await expect(page.getByText("已儲存於此裝置", { exact: true })).toBeVisible();
}
const nodes = (page: Page) => page.locator(".react-flow__node");
const node = (page: Page, text: string) =>
  nodes(page).filter({ has: page.locator(".node-text", { hasText: text }) });
async function saved(page: Page) {
  await expect(page.getByText("已儲存於此裝置", { exact: true })).toBeVisible();
}
async function edit(page: Page, text: string) {
  const field = page.getByRole("textbox", { name: "編輯節點文字" });
  await field.fill(text);
  await field.press("Control+Enter");
}
async function readBoards(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open("freeform-mind-canvas", 1);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return new Promise<any[]>((res, rej) => {
      const r = db.transaction("boards").objectStore("boards").getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  });
}
test("create edit keyboard tree collapse and undo/redo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  expect(await nodes(page).count()).toBe(7);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page
    .getByRole("button", { name: "新增心智圖節點", exact: true })
    .click();
  await edit(page, "專案主題");
  expect(await nodes(page).count()).toBe(1);
  await node(page, "專案主題").click();
  await page.keyboard.press("Tab");
  await edit(page, "第一個子節點");
  expect(await nodes(page).count()).toBe(2);
  await node(page, "第一個子節點").click();
  await page.keyboard.press("Enter");
  await edit(page, "第二個子節點");
  expect(await nodes(page).count()).toBe(3);
  await node(page, "專案主題").click();
  await page.keyboard.press("Space");
  expect(await nodes(page).count()).toBe(1);
  await page.keyboard.press("Space");
  expect(await nodes(page).count()).toBe(3);
  await node(page, "第二個子節點").click();
  await page.keyboard.press("Shift+Tab");
  await saved(page);
  let b = (await readBoards(page)).find((b) => b.name === "新的白板");
  expect(
    b.nodes.find((n: any) => n.text === "第二個子節點").parentId,
  ).toBeNull();
  await page.keyboard.press("Control+z");
  await saved(page);
  b = (await readBoards(page)).find((b) => b.name === "新的白板");
  expect(
    b.nodes.find((n: any) => n.text === "第二個子節點").parentId,
  ).not.toBeNull();
  await node(page, "第一個子節點").click();
  await page.keyboard.press("F2");
  await page
    .getByRole("textbox", { name: "編輯節點文字" })
    .fill("多行文字\nTab / Delete 不改階層");
  await page.getByRole("textbox", { name: "編輯節點文字" }).press("Enter");
  expect(await nodes(page).count()).toBe(3);
  await edit(page, "修改後的子節點");
  await node(page, "修改後的子節點").click();
  await page.keyboard.press("Delete");
  expect(await nodes(page).count()).toBe(2);
  await page.keyboard.press("Control+z");
  expect(await nodes(page).count()).toBe(3);
  await page.keyboard.press("Control+Shift+z");
  expect(await nodes(page).count()).toBe(2);
  expect(errors).toEqual([]);
});
test("pinned calculator precision, invalid input, result nodes and persisted dimensions", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "釘選計算機", exact: true }).click();
  const calc = page.locator(".canvas-item.calculator");
  const input = calc.getByRole("textbox", { name: "計算機算式" });
  await input.fill("0.1+0.2");
  await input.press("Enter");
  await expect(calc.locator("output")).toHaveText("0.3");
  expect(await nodes(page).count()).toBe(1);
  await input.press("Tab");
  expect(await nodes(page).count()).toBe(1);
  await input.fill("1/0");
  await input.press("Enter");
  await expect(calc.locator("output")).toHaveText("不能除以零");
  await input.fill("(1800+650)*2");
  await input.press("Enter");
  await expect(calc.locator("output")).toHaveText("4900");
  await calc
    .getByRole("button", { name: "结果建立為節點".replace("结果", "結果") })
    .click();
  await edit(page, "旅遊總預算：4900");
  expect(await nodes(page).count()).toBe(2);
  const title = page.locator(".calc-drag");
  const box = await title.boundingBox();
  await page.mouse.move(box!.x + 40, box!.y + 15);
  await page.mouse.down();
  await page.mouse.move(box!.x - 180, box!.y - 100, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  const handle = calc.locator(".react-flow__resize-control.bottom.right");
  const hb = await handle.boundingBox();
  await page.mouse.move(hb!.x + 2, hb!.y + 2);
  await page.mouse.down();
  await page.mouse.move(hb!.x + 60, hb!.y + 50, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  let b = (await readBoards(page)).find((b) => b.name === "新的白板");
  const c = b.nodes.find((n: any) => n.kind === "calculator");
  expect(c.width).toBeGreaterThan(280);
  expect(c.height).toBeGreaterThan(340);
  expect(c.expression).toBe("(1800+650)*2");
  await page.reload();
  await saved(page);
  await expect(page.locator(".canvas-item.calculator output")).toHaveText(
    "4900",
  );
  b = (await readBoards(page)).find((b) => b.name === "新的白板");
  expect(b.nodes.find((n: any) => n.kind === "calculator")).toEqual(c);
});
test("independent boards, rename duplicate search and JSON roundtrip", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "新增便條紙", exact: true }).click();
  await edit(page, "獨立白板資料");
  await saved(page);
  await page
    .getByRole("button", { name: "管理 新的白板", exact: true })
    .click();
  await page.getByRole("button", { name: "重新命名", exact: true }).click();
  await page.getByRole("textbox", { name: "白板新名稱" }).fill("測試工作台");
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(page.getByRole("heading", { name: "測試工作台" })).toBeVisible();
  await saved(page);
  await page
    .getByRole("button", { name: /週末旅行 · 靈感工作台.*7 個想法/ })
    .click();
  await expect(
    page.getByText("獨立白板資料", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /測試工作台.*1 個想法/ }).click();
  await expect(page.getByText("獨立白板資料", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出本白板", exact: true }).click();
  const path = await (await download).path();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(
    page.getByRole("heading", { name: "測試工作台（匯入）" }),
  ).toBeVisible();
  await expect(page.getByText("獨立白板資料", { exact: true })).toBeVisible();
  await saved(page);
  await page.reload();
  await saved(page);
  await expect(
    page.getByRole("heading", { name: "測試工作台（匯入）" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "管理 測試工作台（匯入）", exact: true })
    .click();
  await page.getByRole("button", { name: "複製白板", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "測試工作台（匯入）（複本）" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "搜尋白板名稱" }).fill("週末");
  await expect(page.locator(".board-open")).toHaveCount(1);
  await page.getByRole("textbox", { name: "搜尋白板名稱" }).fill("");
  await page
    .getByRole("button", {
      name: "管理 測試工作台（匯入）（複本）",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "刪除白板", exact: true }).click();
  await page.getByRole("button", { name: "確認刪除", exact: true }).click();
  await expect(page.locator(".board-open")).toHaveCount(3);
  expect(
    (await readBoards(page)).some(
      (b) => b.name === "測試工作台（匯入）（複本）",
    ),
  ).toBe(false);
});
test("drag entire branch, intentional reparent, prevent cycles and local layouts", async ({
  page,
}) => {
  await ready(page);
  const root = node(page, "一場剛剛好的旅行"),
    box = await root.boundingBox();
  const before = await readBoards(page);
  const old = before[0].nodes.find((n: any) => n.text === "想去的地方");
  await page.mouse.move(box!.x + 35, box!.y + 20);
  await page.mouse.down();
  await page.mouse.move(box!.x - 80, box!.y + 100, { steps: 12 });
  await page.mouse.up();
  await saved(page);
  let b = (await readBoards(page))[0];
  const moved = b.nodes.find((n: any) => n.text === "想去的地方");
  expect(moved.position.x).not.toBe(old.position.x);
  expect(moved.parentId).toBe(old.parentId);
  expect(moved.position.x - old.position.x).toBeCloseTo(
    b.nodes.find((n: any) => n.text === "一場剛剛好的旅行").position.x -
      before[0].nodes.find((n: any) => n.text === "一場剛剛好的旅行").position
        .x,
  );
  await page.keyboard.press("Control+z");
  await saved(page);
  const child = node(page, "想去的地方"),
    target = node(page, "留一點空白");
  const cb = await child.boundingBox(),
    tb = await target.boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.move(cb!.x + cb!.width / 2, cb!.y + cb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb!.x + tb!.width / 2, tb!.y + tb!.height / 2, {
    steps: 12,
  });
  await expect(page.locator(".mount-label")).toContainText("掛載");
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await saved(page);
  b = (await readBoards(page))[0];
  expect(b.nodes.find((n: any) => n.text === "想去的地方").parentId).toBe(
    b.nodes.find((n: any) => n.text === "留一點空白").id,
  );
  await page.keyboard.press("Control+z");
  await saved(page);
  await root.click();
  for (const name of ["向右", "左右", "放射"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await saved(page);
    b = (await readBoards(page))[0];
    expect(b.nodes.find((n: any) => n.text === "一場剛剛好的旅行").layout).toBe(
      name === "向右" ? "right" : name === "左右" ? "split" : "radial",
    );
  }
});
test("multi-selection, batch styles, copy paste and free relation independence", async ({
  page,
}) => {
  await ready(page);
  await node(page, "想去的地方").click();
  await node(page, "留一點空白").click({ modifiers: ["Shift"] });
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(2);
  await page.getByRole("button", { name: "背景 #fff1bf", exact: true }).click();
  await saved(page);
  let b = (await readBoards(page))[0];
  expect(
    b.nodes
      .filter((n: any) => ["想去的地方", "留一點空白"].includes(n.text))
      .every((n: any) => n.background === "#fff1bf"),
  ).toBe(true);
  await node(page, "想去的地方").click();
  await page.keyboard.press("Escape");
  await node(page, "想去的地方").click();
  await page.keyboard.press("Control+c");
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+v");
  await expect(nodes(page)).toHaveCount(1);
  await page.keyboard.press("Control+d");
  await expect(nodes(page)).toHaveCount(2);
  await nodes(page).first().click();
  await page.getByRole("button", { name: "建立關聯線", exact: true }).click();
  await nodes(page).last().click();
  await saved(page);
  b = (await readBoards(page)).find((b) => b.name === "新的白板");
  expect(b.relations.length).toBe(1);
  expect(b.nodes.every((n: any) => n.parentId === null)).toBe(true);
});
test("production PWA installs cache, reloads offline and saves calculator state", async ({
  page,
  context,
}) => {
  await ready(page, "http://127.0.0.1:4173/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "釘選計算機", exact: true }).click();
  const input = page.getByRole("textbox", { name: "計算機算式" });
  await input.fill("1200*3+800");
  await input.press("Enter");
  await expect(page.locator("output")).toHaveText("4400");
  await saved(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("output")).toHaveText("4400");
  await input.fill("4400/2");
  await input.press("Enter");
  await expect(page.locator("output")).toHaveText("2200");
  await expect(
    page.getByText("離線 · 已儲存於此裝置", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await saved(page);
  await expect(page.locator("output")).toHaveText("2200");
  const manifest = await page.request.get(
    "http://127.0.0.1:4173/manifest.webmanifest",
  );
  expect(manifest.ok()).toBe(true);
  const m = await manifest.json();
  expect(m.icons.some((i: any) => i.sizes === "192x192")).toBe(true);
});
test("mobile viewport supports text editing and theme toggle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "收合白板清單", exact: true }).click();
  await page.getByRole("button", { name: "新增自由文字", exact: true }).click();
  await edit(page, "手機基本編輯");
  await expect(page.getByText("手機基本編輯", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "切換深色主題", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const contrast = await node(page, "手機基本編輯")
    .locator(".node-text")
    .evaluate((el) => {
      const luminance = (color: string) => {
        const values = color
          .match(/\d+/g)!
          .slice(0, 3)
          .map((x) => {
            const v = +x / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
      };
      const a = luminance(getComputedStyle(el).color),
        b = luminance(
          getComputedStyle(document.querySelector(".canvas-surface")!)
            .backgroundColor,
        );
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await saved(page);
  await page.screenshot({ path: "artifacts/mobile.png" });
});

test("storage failures are visible and never claim success", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
      if (this.name === "boards")
        throw new DOMException("測試配額耗盡", "QuotaExceededError");
      return original.call(this, value, key!);
    };
  });
  await page.getByRole("button", { name: "新增自由文字", exact: true }).click();
  await edit(page, "應提示儲存失敗");
  await expect(page.getByRole("alert")).toContainText("儲存失敗");
  await expect(page.locator(".save-status")).toHaveText("儲存失敗");
  await expect(
    page.getByText("已儲存於此裝置", { exact: true }),
  ).not.toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "全部備份", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("workspace");
});

test("box selection and group drag preserve offsets, snaps and undo", async ({
  page,
}) => {
  await ready(page);
  const a = await node(page, "想去的地方").boundingBox(),
    c = await node(page, "留一點空白").boundingBox();
  await page.mouse.move(a!.x - 25, a!.y - 15);
  await page.mouse.down();
  await page.mouse.move(c!.x + c!.width + 25, c!.y + c!.height + 15, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(2);
  await saved(page);
  const before = (await readBoards(page))[0];
  const old = before.nodes.find((n: any) => n.text === "想去的地方");
  const old2 = before.nodes.find((n: any) => n.text === "留一點空白");
  await page.mouse.move(a!.x + 40, a!.y + 20);
  await page.mouse.down();
  await page.mouse.move(a!.x + 100, a!.y + 70, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  const after = (await readBoards(page))[0];
  const moved = after.nodes.find((n: any) => n.text === "想去的地方"),
    moved2 = after.nodes.find((n: any) => n.text === "留一點空白");
  expect(moved.position.x - old.position.x).toBeCloseTo(
    moved2.position.x - old2.position.x,
  );
  expect(moved.position.y - old.position.y).toBeCloseTo(
    moved2.position.y - old2.position.y,
  );
  await page.keyboard.press("Control+z");
  await saved(page);
  expect((await readBoards(page))[0].nodes.map((n: any) => n.position)).toEqual(
    before.nodes.map((n: any) => n.position),
  );
});

test("ordinary proximity never reparents and Alt cannot create a cycle", async ({
  page,
}) => {
  await ready(page);
  const child = node(page, "想去的地方"),
    target = node(page, "留一點空白"),
    cb = await child.boundingBox(),
    tb = await target.boundingBox();
  const before = (await readBoards(page))[0];
  await page.mouse.move(cb!.x + cb!.width / 2, cb!.y + cb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb!.x + tb!.width / 2, tb!.y + tb!.height / 2, {
    steps: 10,
  });
  await expect(page.locator(".mount-label")).toHaveCount(0);
  await page.mouse.up();
  await saved(page);
  expect(
    (await readBoards(page))[0].nodes.find((n: any) => n.text === "想去的地方")
      .parentId,
  ).toBe(before.nodes.find((n: any) => n.text === "想去的地方").parentId);
  await page.keyboard.press("Control+z");
  await saved(page);
  const rb = await node(page, "一場剛剛好的旅行").boundingBox(),
    childBox = await child.boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.move(rb!.x + rb!.width / 2, rb!.y + rb!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    childBox!.x + childBox!.width / 2,
    childBox!.y + childBox!.height / 2,
    { steps: 10 },
  );
  await expect(page.locator(".mount-label")).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up("Alt");
  await saved(page);
  expect(
    (await readBoards(page))[0].nodes.find(
      (n: any) => n.text === "一場剛剛好的旅行",
    ).parentId,
  ).toBeNull();
});

test("floating calculator can pin, connect, unpin and undo", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await ready(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "浮動計算機", exact: true }).click();
  const floating = page.locator(".floating-calculator");
  await floating
    .getByRole("textbox", { name: "計算機算式" })
    .fill("12000*1.05");
  await floating.getByRole("button", { name: "=", exact: true }).click();
  await expect(floating.locator("output")).toHaveText("12600");
  await floating
    .getByRole("button", { name: "複製計算結果", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "12600",
  );
  await page
    .getByRole("button", { name: "釘選浮動計算機", exact: true })
    .click();
  await expect(floating).toHaveCount(0);
  await expect(page.locator(".canvas-item.calculator output")).toHaveText(
    "12600",
  );
  await page.getByRole("button", { name: "取消釘選", exact: true }).click();
  await expect(floating.locator("output")).toHaveText("12600");
  await expect(nodes(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: "關閉浮動計算機", exact: true })
    .click();
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await expect(nodes(page)).toHaveCount(1);
  await saved(page);
});

test("invalid JSON fails without changing boards; board deletion requires confirmation", async ({
  page,
}) => {
  await ready(page);
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"wrong"}'),
  });
  await expect(page.getByRole("alert")).toContainText("匯入失敗");
  expect(await page.locator(".board-open").count()).toBe(1);
  await page
    .getByRole("button", { name: "管理 週末旅行 · 靈感工作台", exact: true })
    .click();
  await page.getByRole("button", { name: "刪除白板", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "確認刪除白板" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect(await nodes(page).count()).toBe(7);
});

test("viewport restores independently and drawing connection uses boundary handles", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Zoom Out", exact: true }).click();
  await saved(page);
  const before = (await readBoards(page))[0];
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "Zoom In", exact: true }).click();
  await saved(page);
  await page
    .getByRole("button", { name: /週末旅行 · 靈感工作台.*7 個想法/ })
    .click();
  await saved(page);
  await page.reload();
  await saved(page);
  const after = (await readBoards(page)).find((b) => b.name === before.name);
  expect(after.viewport).toEqual(before.viewport);
  await node(page, "想去的地方").click();
  const source = node(page, "想去的地方").locator(
    ".node-port[data-handleid=bottom]",
  );
  const target = node(page, "留一點空白").locator(
    ".node-port[data-handleid=top]",
  );
  const sb = await source.boundingBox(),
    tb = await target.boundingBox();
  await page.mouse.move(sb!.x + 4, sb!.y + 4);
  await page.mouse.down();
  await page.mouse.move(tb!.x + 4, tb!.y + 4, { steps: 10 });
  await page.mouse.up();
  await saved(page);
  const b = (await readBoards(page)).find((b) => b.name === before.name);
  expect(b.relations.length).toBe(2);
  expect(b.nodes.find((n: any) => n.text === "想去的地方").parentId).toBe(
    before.nodes.find((n: any) => n.text === "想去的地方").parentId,
  );
});

test("GitHub Pages subpath assets, service worker scope and offline reload", async ({
  page,
  context,
}) => {
  const url = "http://127.0.0.1:4174/freeform-mind-canvas/";
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page, url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
    )
    .toBe(url + "sw.js");
  const manifest = await page.request.get(url + "manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "週末旅行 · 靈感工作台" }),
  ).toBeVisible();
  expect(await nodes(page).count()).toBe(7);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "artifacts/subpath-offline.png" });
  await context.setOffline(false);
});

test("representative 60-object board loads and branch drag remains usable", async ({
  page,
}) => {
  await ready(page);
  const b = makeBoard("效能畫布");
  const root = makeItem("mind", { x: 0, y: 0 }, "效能測試根");
  b.nodes = [
    root,
    ...Array.from({ length: 39 }, (_, i) => {
      const n = makeItem(
        "mind",
        { x: 330 + (i % 3) * 260, y: (Math.floor(i / 3) - 6) * 100 },
        `分支 ${i + 1}`,
      );
      n.parentId = root.id;
      n.order = i;
      return n;
    }),
    ...Array.from({ length: 20 }, (_, i) =>
      makeItem(
        "sticky",
        { x: -300 - (i % 2) * 250, y: (Math.floor(i / 2) - 5) * 100 },
        `靈感 ${i + 1}`,
      ),
    ),
  ];
  b.viewport = { x: 410, y: 400, zoom: 0.45 };
  const start = Date.now();
  await page.locator("input[type=file]").setInputFiles({
    name: "performance.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "freeform-mind-canvas",
        schemaVersion: 1,
        boards: [b],
      }),
    ),
  });
  await expect(nodes(page)).toHaveCount(60);
  const load = Date.now() - start;
  console.log(`BROWSER PERFORMANCE 60 objects load: ${load}ms`);
  expect(load).toBeLessThan(5000);
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  await saved(page);
  const rootBox = await node(page, "效能測試根").boundingBox();
  const dragStart = Date.now();
  await page.mouse.move(
    rootBox!.x + rootBox!.width / 2,
    rootBox!.y + rootBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    rootBox!.x + rootBox!.width / 2 + 60,
    rootBox!.y + rootBox!.height / 2 + 40,
    { steps: 10 },
  );
  await page.mouse.up();
  await saved(page);
  const dragTime = Date.now() - dragStart;
  console.log(
    `BROWSER PERFORMANCE 60 objects / 40-node branch drag + save: ${dragTime}ms`,
  );
  expect(dragTime).toBeLessThan(5000);
  await page.screenshot({ path: "artifacts/performance.png" });
});

test("final desktop prototype visual and connectors styles", async ({
  page,
}) => {
  await ready(page);
  await node(page, "一場剛剛好的旅行").click();
  await page.getByRole("checkbox", { name: "父子線虛線", exact: true }).check();
  await saved(page);
  expect((await readBoards(page))[0].treeStyle.dashed).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "artifacts/desktop.png" });
});
test("long multiline auto-size remains exportable and fully restores", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "新增自由文字", exact: true }).click();
  const text = Array.from(
    { length: 300 },
    (_, i) => `第 ${i + 1} 行長文字與思考`,
  ).join("\n");
  await edit(page, text);
  await saved(page);
  const b = (await readBoards(page)).find((b) => b.name === "新的白板");
  expect(b.nodes[0].height).toBeLessThanOrEqual(3000);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出本白板", exact: true }).click();
  const file = await (await download).path();
  await page.locator("input[type=file]").setInputFiles(file!);
  await expect(
    page.getByRole("heading", { name: "新的白板（匯入）" }),
  ).toBeVisible();
  await saved(page);
  expect(
    (await readBoards(page)).find((b) => b.name === "新的白板（匯入）").nodes[0]
      .text,
  ).toBe(text);
});
