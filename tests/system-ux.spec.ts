import { test, expect } from "@playwright/test";
import { waitSaved, dataAction, locate } from "./ui";
for (const size of [
  { width: 464, height: 570 },
  { width: 390, height: 667 },
])
  test(`short viewport guide actions avoid library ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await waitSaved(page);
    await expect(page.locator(".guide-learning-bar")).toBeVisible();
    await expect
      .poll(() => page.locator(".react-flow__viewport").getAttribute("style"))
      .toContain("translate(16px");
    const create = page.getByRole("button", {
      name: "建立新白板",
      exact: true,
    });
    const lib = await page
      .locator(".tool-library,.guide-learning-bar")
      .boundingBox();
    const box = await create.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(lib!.y);
    await create.click();
    await waitSaved(page);
    await expect(page.locator("h1")).toHaveText("新的白板");
    await page.reload();
    await waitSaved(page);
    await expect
      .poll(() => page.locator(".react-flow__viewport").getAttribute("style"))
      .toContain("translate(16px");
    const resume = page.getByRole("button", {
      name: "繼續上次的白板 新的白板",
      exact: true,
    });
    const resumedBox = await resume.boundingBox();
    expect(resumedBox!.y + resumedBox!.height).toBeLessThan(
      (await page.locator(".tool-library,.guide-learning-bar").boundingBox())!
        .y,
    );
    await page.screenshot({ path: `artifacts/short-${size.width}.png` });
    await resume.click();
    await expect(page.locator("h1")).toHaveText("新的白板");
    await expect(page.locator(".guide-document")).toHaveCount(0);
  });
for (const width of [1440, 390, 320])
  test(`system hierarchy guide geometry and single header ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await waitSaved(page);
    await expect(page).toHaveTitle("Mind Canvas");
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator(".welcome-entry")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "開啟歡迎指南", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "探索使用指南", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".save-status")).not.toBeVisible();
    for (const label of ["匯出本白板", "匯入專案", "全部備份"])
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toHaveCount(0);
    await expect
      .poll(async () =>
        page.locator(".react-flow__viewport").getAttribute("style"),
      )
      .toContain(width === 1440 ? "translate(308px" : "translate(16px");
    await waitSaved(page);
    const geometry = await page.evaluate(() => {
      const lib = document
          .querySelector(".tool-library,.guide-learning-bar")!
          .getBoundingClientRect(),
        head = document.querySelector("header")!.getBoundingClientRect(),
        brand = document
          .querySelector(".header-brand")!
          .getBoundingClientRect();
      const overflow = [...document.querySelectorAll(".node-text")]
        .filter((e) => e.scrollHeight > e.clientHeight + 2)
        .map((e) => e.textContent);
      return {
        overflow,
        libWidth: lib.width,
        headHeight: head.height,
        brandHeight: brand.height,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry.pageOverflow).toBe(false);
    expect(geometry.headHeight).toBeLessThanOrEqual(68);
    expect(geometry.brandHeight).toBeLessThanOrEqual(36);
    expect(geometry.libWidth).toBeGreaterThan(
      width === 1440 ? 900 : width - 40,
    );
    expect(geometry.overflow).toEqual([]);
    await expect(
      page.getByRole("button", { name: "建立新白板", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `artifacts/system-${width}.png` });
    await page.getByRole("button", { name: "切換深色主題" }).click();
    await page.screenshot({ path: `artifacts/system-dark-${width}.png` });
    await locate(page, "旅行預算");
    const calc = page.locator(".calculator.nodrag");
    expect(
      await calc.evaluate((e) => e.scrollHeight <= e.clientHeight + 2),
    ).toBe(true);
    await page.getByRole("button", { name: "設定", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "設定", exact: true });
    await expect(dialog).toContainText("最後成功儲存");
    await expect(dialog).toContainText("IndexedDB");
    await page.screenshot({ path: `artifacts/data-${width}.png` });
  });
test("temporary UI no writes, viewport batches and drag saves only after release", async ({
  page,
}) => {
  await page.goto("/");
  await waitSaved(page);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await page.getByRole("button", { name: "心智圖範本", exact: true }).click();
  await waitSaved(page);
  await page.evaluate(() => {
    (window as any).boardWrites = 0;
    const old = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v: any, key?: IDBValidKey) {
      if (this.name === "boards") (window as any).boardWrites++;
      return old.call(this, v, key);
    };
  });
  await page.getByRole("tab", { name: "文字筆記", exact: true }).click();
  await page.getByRole("button", { name: "收合工具庫" }).click();
  await page.getByRole("button", { name: "展開工具庫" }).click();
  await page.getByRole("button", { name: "切換深色主題" }).click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "關閉設定", exact: true })
    .click();
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => (window as any).boardWrites)).toBe(0);
  await page.getByRole("button", { name: "Zoom In", exact: true }).click();
  await page.getByRole("button", { name: "Zoom Out", exact: true }).click();
  await waitSaved(page);
  expect(
    await page.evaluate(() => (window as any).boardWrites),
  ).toBeLessThanOrEqual(1);
  await page.evaluate(() => ((window as any).boardWrites = 0));
  const node = page
    .locator(".react-flow__node")
    .filter({ has: page.locator(".node-text", { hasText: "我的主題" }) });
  await node.click();
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).boardWrites)).toBe(0);
  const b = (await node.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 100, b.y + b.height / 2 - 70, {
    steps: 8,
  });
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => (window as any).boardWrites)).toBe(0);
  await page.mouse.up();
  await waitSaved(page);
  expect(await page.evaluate(() => (window as any).boardWrites)).toBe(1);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText(
    "最後成功儲存尚無紀錄",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "匯出本白板", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain("mind-canvas");
  await expect(page.getByRole("dialog")).toContainText(
    "此時間不代表檔案已完成下載",
  );
});
