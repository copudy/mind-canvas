import { test, expect } from "@playwright/test";
import { waitSaved, dataAction } from "./ui";
import { readFile } from "node:fs/promises";

test("production guide document is readable with no canvas overlays or copy action", async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await waitSaved(page);
    await expect(page.locator(".workbench")).toHaveAttribute(
      "data-version",
      "1.3.0",
    );
    await expect(page.locator(".guide-page")).toBeVisible();
    await expect(page.locator(".guide-card")).toHaveCount(6);
    await expect(
      page.locator(".guide-document .react-flow,.guide-learning-bar"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "建立可編輯副本", exact: true }),
    ).toHaveCount(0);
    const heading = await page.locator(".guide-hero h2 span").evaluate((e) => ({
      height: e.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(e).lineHeight),
    }));
    expect(heading.height).toBeLessThanOrEqual(heading.lineHeight + 3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/production-v111-guide-${width}.png`,
    });
    await page.getByRole("link", { name: "05 資料與備份" }).click();
    await expect(page.locator("#guide-backup")).toBeInViewport();
    await page.getByRole("button", { name: "開啟資料與備份" }).click();
    await expect(
      page.getByRole("dialog", { name: "設定", exact: true }),
    ).toContainText("IndexedDB");
  }
});

test("production assets, board editing, JSON restore and offline PWA", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Mind Canvas");
  await waitSaved(page);
  await expect(page.locator(".guide-document")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "PD-1 Center Logo" }),
  ).toBeVisible();
  const assets = await page.evaluate(async () => {
    const href =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href;
    const r = await fetch(href);
    const manifest = await (
      await fetch(new URL("manifest.webmanifest", location.href))
    ).json();
    const icons = await Promise.all(
      manifest.icons.map(
        async (i: { src: string }) =>
          (await fetch(new URL(i.src, location.href))).ok,
      ),
    );
    return { favicon: r.ok && (await r.text()).includes("<svg"), icons };
  });
  expect(assets.favicon).toBe(true);
  expect(assets.icons.every(Boolean)).toBe(true);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await page.getByRole("tab", { name: "實用工具", exact: true }).click();
  await page.getByRole("button", { name: "計算機", exact: true }).click();
  await page
    .getByRole("button", { name: "釘選浮動計算機", exact: true })
    .click();
  const input = page.getByRole("textbox", { name: "計算機算式" });
  await input.fill("0.1+0.2");
  await input.press("Enter");
  await expect(page.locator("output")).toHaveText("0.3");
  await page
    .getByRole("button", { name: "結果建立為節點", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "編輯節點文字" });
  await editor.fill("正式環境測試：預算 0.3");
  await editor.press("Control+Enter");
  await expect(
    page.locator(".node-text", { hasText: "正式環境測試：預算 0.3" }),
  ).toBeVisible();
  await waitSaved(page);
  const downloading = page.waitForEvent("download");
  await dataAction(page, "匯出本白板");
  const file = await (await downloading).path();
  const backup = JSON.parse(await readFile(file!, "utf8"));
  expect(JSON.stringify(backup)).toContain('"0.3"');
  await dataAction(page, "匯入專案");
  await page.locator('input[type="file"]').setInputFiles(file!);
  await waitSaved(page);
  await expect(page.locator("output")).toHaveText("0.3");
  await page.reload();
  await waitSaved(page);
  await expect(page.locator(".guide-document")).toBeVisible();
  await page.getByRole("button", { name: /^繼續上次的白板/ }).click();
  await expect(page.locator("output")).toHaveText("0.3");
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(scope).toBe(
    new URL(
      process.env.PRODUCTION_URL || "https://copudy.github.io/mind-canvas/",
    ).href,
  );
  await waitSaved(page);
  await context.setOffline(true);
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /^繼續上次的白板/ }).click();
  await input.fill("1200+300");
  await input.press("Enter");
  await expect(page.locator("output")).toHaveText("1500");
  await waitSaved(page);
  await context.setOffline(false);
  await page.reload();
  await waitSaved(page);
  await page.getByRole("button", { name: /^繼續上次的白板/ }).click();
  await expect(page.locator("output")).toHaveText("1500");
  await page.screenshot({ path: "artifacts/production-desktop.png" });
});

test("production mobile welcome and board creation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await waitSaved(page);
  await expect(page).toHaveTitle("Mind Canvas");
  await expect(page.locator("header")).toHaveCount(1);
  await page.getByRole("button", { name: "建立新白板", exact: true }).click();
  await waitSaved(page);
  await expect(page.locator(".guide-document")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/production-mobile.png" });
});
