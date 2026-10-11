import { test, expect, chromium, type Page } from "@playwright/test";
import { makeBoard, makeItem } from "../src/model";
import { greetings } from "../src/guide";
const base = "http://127.0.0.1:4173";
async function ready(page: Page) {
  await page.goto(base);
  await expect(page.getByText("已儲存於此裝置", { exact: true })).toBeVisible();
}
async function boards(page: Page): Promise<any[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("freeform-mind-canvas", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const data = await new Promise<any[]>((resolve) => {
      const r = db.transaction("boards").objectStore("boards").getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return data;
  });
}
const saved = (page: Page) =>
  expect(page.getByText("已儲存於此裝置", { exact: true })).toBeVisible();
const item = (page: Page, text: string) =>
  page.locator(".react-flow__node").filter({
    has: page
      .locator(".node-text")
      .filter({ hasText: new RegExp("^" + text + "$") }),
  });
test("brand assets title tokens and unobstructed bottom library", async ({
  page,
}) => {
  await ready(page);
  await expect(page).toHaveTitle("PD-1 Center | Mind Canvas");
  await expect(page.locator(".header-brand")).toHaveText(
    "PD-1 Center | Mind Canvas",
  );
  const svg = await (await page.request.get(base + "/icon.svg")).text();
  expect(svg).toContain("M4 10 L4 4 L10 4");
  expect(svg).toContain("#3b82f6");
  expect(svg).toContain(">PD</text>");
  const manifest = await (
    await page.request.get(base + "/manifest.webmanifest")
  ).json();
  expect(manifest.name).toBe("PD-1 Center | Mind Canvas");
  for (const size of [192, 512]) {
    const dimensions = await page.evaluate(async (size) => {
      const img = new Image();
      img.src = "./icon-" + size + ".png";
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, size);
    expect(dimensions).toEqual([size, size]);
  }
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--brand-accent")
        .trim(),
    ),
  ).toBe("#3b82f6");
  await expect(
    page.getByRole("button", { name: "選取工具", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "平移工具", exact: true }),
  ).toHaveCount(0);
  const library = await page.locator(".tool-library").boundingBox();
  const canvas = await page.locator(".canvas-surface").boundingBox();
  const minimap = await page.locator(".react-flow__minimap").boundingBox();
  expect(library!.height).toBe(120);
  expect(library!.y).toBeGreaterThan(canvas!.y + canvas!.height / 2);
  expect(library!.x + library!.width).toBeLessThan(minimap!.x);
  const buttons = await page.locator(".library-tools button").all();
  for (const b of buttons) {
    const r = await b.boundingBox();
    expect(r!.width).toBe(100);
    expect(r!.height).toBe(62);
  }
  await page.screenshot({ path: "artifacts/welcome.png" });
  await page.getByRole("button", { name: "收合工具庫" }).click();
  expect((await page.locator(".tool-library").boundingBox())!.height).toBe(34);
  await page.reload();
  await saved(page);
  await expect(page.getByRole("button", { name: "展開工具庫" })).toBeVisible();
  await page.getByRole("button", { name: "展開工具庫" }).click();
  await page.getByRole("tab", { name: "文字筆記", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "新增自由文字", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "預算表", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "標題", exact: true }).click();
  await page
    .getByRole("textbox", { name: "編輯節點文字" })
    .press("Control+Enter");
  await saved(page);
  const heading = (await boards(page))[0].nodes.find(
    (n: any) => n.text === "新的標題",
  );
  expect(heading.fontSize).toBe(26);
  expect(heading.bold).toBe(true);
});
test("guide initializes once greetings confined stable and editable branching", async ({
  page,
}) => {
  await ready(page);
  let data = await boards(page);
  expect(data).toHaveLength(1);
  expect(data[0].name).toBe("歡迎使用 Mind Canvas");
  expect(data[0].guide).toBeTruthy();
  const greeting = () =>
    page
      .locator(".node-text")
      .filter({ hasText: new RegExp(greetings.join("|")) })
      .innerText();
  const first = await greeting();
  await page.getByRole("button", { name: "開啟歡迎指南", exact: true }).click();
  expect(await greeting()).toBe(first);
  await page.getByRole("tab", { name: "文字筆記", exact: true }).click();
  expect(await greeting()).toBe(first);
  await item(page, "旅行計畫").click();
  await page.keyboard.press("Tab");
  const editor = page.getByRole("textbox", { name: "編輯節點文字" });
  await editor.fill("指南可互動");
  await editor.press("Control+Enter");
  await saved(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await saved(page);
  await expect(page.getByText(first, { exact: true })).toHaveCount(0);
  await page.reload();
  await saved(page);
  await expect(page.locator("h1")).toHaveText("歡迎使用 Mind Canvas");
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(page.locator(".board-row.active")).toContainText("新的白板");
  await page.getByRole("button", { name: "開啟歡迎指南" }).click();
  await expect(item(page, "指南可互動")).toBeVisible();
  const second = await greeting();
  expect(second).not.toBe(first);
  await page.getByRole("tab", { name: "圖形圖表", exact: true }).click();
  expect(await greeting()).toBe(second);
  data = await boards(page);
  expect(data.filter((b) => b.guide)).toHaveLength(1);
  await page.getByRole("button", { name: "重設指南", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(item(page, "指南可互動")).toBeVisible();
  await page.getByRole("button", { name: "重設指南", exact: true }).click();
  await page.getByRole("button", { name: "確認重設", exact: true }).click();
  await saved(page);
  await expect(item(page, "指南可互動")).toHaveCount(0);
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  await expect(item(page, "指南可互動")).toBeVisible();
  expect(
    (await boards(page)).find((b) => b.name === "新的白板").nodes,
  ).toHaveLength(0);
});
test("existing data untouched automatic welcome guide and guide creation idempotent", async ({
  page,
}) => {
  await page.goto(base);
  await saved(page);
  const b = makeBoard("既有重要白板");
  b.nodes.push(makeItem("sticky", { x: 20, y: 40 }, "保留我的資料"));
  await page.evaluate(async (b) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("freeform-mind-canvas", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const tx = db.transaction(["boards", "meta"], "readwrite");
    tx.objectStore("boards").clear();
    tx.objectStore("boards").put(b);
    tx.objectStore("meta").put(b.boardId, "active");
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, b);
  await page.reload();
  await saved(page);
  expect((await boards(page)).find((x) => x.boardId === b.boardId)).toEqual(b);
  await expect(page.locator("h1")).toHaveText("歡迎使用 Mind Canvas");
  await page.getByRole("button", { name: "開啟歡迎指南" }).click();
  await saved(page);
  await page.getByRole("button", { name: "開啟歡迎指南" }).click();
  await saved(page);
  const data = await boards(page);
  expect(data).toHaveLength(2);
  expect(data.find((x) => x.boardId === b.boardId)).toEqual(b);
});
test("templates create real editable objects relations and undo", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("button", { name: "流程圖範本", exact: true }).click();
  await saved(page);
  let b = (await boards(page)).find((b) => b.name === "新的白板");
  expect(b.nodes).toHaveLength(3);
  expect(b.relations).toHaveLength(2);
  await item(page, "下一步").dblclick();
  await page.getByRole("textbox", { name: "編輯節點文字" }).fill("可編輯步驟");
  await page
    .getByRole("textbox", { name: "編輯節點文字" })
    .press("Control+Enter");
  await saved(page);
  await page.locator(".canvas-surface").focus();
  await page.keyboard.press("Control+z");
  await saved(page);
  await expect(item(page, "下一步")).toBeVisible();
  await page.getByRole("button", { name: "心智圖範本", exact: true }).click();
  await saved(page);
  b = (await boards(page)).find((b) => b.name === "新的白板");
  expect(b.nodes.filter((n: any) => n.parentId)).toHaveLength(2);
});
test("independent browser profiles do not share boards and no outbound data requests", async ({
  browser,
  page,
  context,
}) => {
  const outgoing: string[] = [];
  context.on("request", (r) => {
    if (r.url().startsWith("http") && new URL(r.url()).origin !== base)
      outgoing.push(r.url());
  });
  await ready(page);
  await page.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await page.getByRole("tab", { name: "實用工具", exact: true }).click();
  await page.getByRole("button", { name: "釘選計算機", exact: true }).click();
  await page.getByRole("textbox", { name: "計算機算式" }).fill("888+12");
  await page.getByRole("textbox", { name: "計算機算式" }).press("Enter");
  await saved(page);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await ready(otherPage);
  expect(await boards(otherPage)).toHaveLength(1);
  expect((await boards(otherPage))[0].name).toBe("歡迎使用 Mind Canvas");
  await other.close();
  await page.reload();
  await saved(page);
  await expect(page.locator("h1")).toHaveText("歡迎使用 Mind Canvas");
  await page.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(page.locator("output")).toHaveText("900");
  expect(outgoing).toEqual([]);
});
test("close browser and reopen same profile restores active board calculator geometry and styles", async ({}, info) => {
  const profile = info.outputPath("isolated-profile");
  let ctx = await chromium.launchPersistentContext(profile, {
    channel: "msedge",
    viewport: { width: 1440, height: 900 },
  });
  let p = await ctx.newPage();
  await ready(p);
  await p.getByRole("button", { name: "新的白板 ＋", exact: true }).click();
  await p.getByRole("tab", { name: "實用工具", exact: true }).click();
  await p.getByRole("button", { name: "釘選計算機", exact: true }).click();
  await p.getByRole("textbox", { name: "計算機算式" }).fill("(350+25)*3");
  await p.getByRole("textbox", { name: "計算機算式" }).press("Enter");
  await saved(p);
  const before = (await boards(p)).find((b) => b.name === "新的白板");
  await ctx.close();
  ctx = await chromium.launchPersistentContext(profile, {
    channel: "msedge",
    viewport: { width: 1440, height: 900 },
  });
  p = await ctx.newPage();
  await ready(p);
  await expect(p.locator("h1")).toHaveText("歡迎使用 Mind Canvas");
  await p.getByRole("button", { name: /繼續上次的白板/ }).click();
  await expect(p.locator("output")).toHaveText("1125");
  expect((await boards(p)).find((b) => b.boardId === before.boardId)).toEqual(
    before,
  );
  await ctx.close();
});
for (const mode of ["granted", "denied", "unsupported", "throws"])
  test("persist request handles " + mode, async ({ page }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator.storage, "persisted", {
        value: async () => false,
      });
      Object.defineProperty(navigator.storage, "persist", {
        value:
          mode === "unsupported"
            ? undefined
            : async () => {
                if (mode === "throws") throw Error("blocked");
                return mode === "granted";
              },
      });
    }, mode);
    await ready(page);
    await page.getByRole("button", { name: "保留本機儲存" }).click();
    await expect(page.locator(".toast")).toContainText(
      mode === "granted"
        ? "不是永久保存"
        : mode === "denied"
          ? "未授予"
          : mode === "unsupported"
            ? "不支援"
            : "無法取得",
    );
    await saved(page);
  });
test("mobile tool library scrolls does not collide minimap and dark guide readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(
    page.getByRole("button", { name: "展開白板清單" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "文字筆記", exact: true }).click();
  const lib = await page.locator(".tool-library").boundingBox(),
    mini = await page.locator(".react-flow__minimap").boundingBox();
  expect(mini!.y + mini!.height).toBeLessThan(lib!.y);
  const mapSvg = await page.locator(".react-flow__minimap svg").boundingBox();
  expect(mapSvg!.width).toBeLessThanOrEqual(mini!.width);
  const brand = await page.locator(".header-brand").boundingBox();
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(390);
  expect(
    await page
      .locator(".library-tools")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "切換深色主題" }).click();
  const color = await item(page, "歡迎來到 Mind Canvas")
    .locator(".node-text")
    .evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(232, 240, 254)");
  expect(
    await page
      .locator(".react-flow")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(14, 21, 34)");
  await page.screenshot({ path: "artifacts/welcome-mobile.png" });
});
test("JSON browser roundtrip preserves every guide object field and calculator without overwriting", async ({
  page,
}) => {
  await ready(page);
  const calc = page.getByRole("textbox", { name: "計算機算式" });
  await calc.fill("0.1+0.2");
  await calc.press("Enter");
  await saved(page);
  const before = (await boards(page))[0];
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出本白板", exact: true }).click();
  const path = await (await download).path();
  await page.locator("input[type=file]").setInputFiles(path!);
  await saved(page);
  await expect(page.locator(".board-row.active")).toContainText("（匯入）");
  await page.reload();
  await saved(page);
  const data = await boards(page),
    imported = data.find((b) => b.name.endsWith("（匯入）"));
  expect(data).toHaveLength(2);
  const original = data.find((b) => b.boardId === before.boardId);
  // Reload intentionally changes only the guide greeting; backup payload stays intact.
  const reopenedGreeting = original.nodes.find(
    (n: any) => n.id === before.guide.greetingId,
  ).text;
  expect(greetings).toContain(reopenedGreeting);
  const expected = structuredClone(before);
  expected.nodes.find((n: any) => n.id === before.guide.greetingId).text =
    reopenedGreeting;
  expect(original).toEqual(expected);
  expect(imported.boardId).not.toBe(before.boardId);
  expect(imported.nodes).toEqual(before.nodes);
  expect(imported.relations).toEqual(before.relations);
  expect(imported.treeStyle).toEqual(before.treeStyle);
  expect(imported.viewport).toEqual(before.viewport);
  expect(imported.nodes.find((n: any) => n.kind === "calculator").result).toBe(
    "0.3",
  );
});
