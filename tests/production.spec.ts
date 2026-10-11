import { test, expect } from "@playwright/test";
import { waitSaved, dataAction } from "./ui";
import { readFile } from "node:fs/promises";

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
  await page.getByRole("button", { name: "釘選計算機", exact: true }).click();
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
  expect(scope).toBe("https://copudy.github.io/mind-canvas/");
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
