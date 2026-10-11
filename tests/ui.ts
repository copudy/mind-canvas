import { expect, type Page } from "@playwright/test";
import { welcomeBoard } from "../src/guide";
export async function practiceBoard(p: Page) {
  // Test fixture through the real JSON importer; no official-guide copy action.
  const b = welcomeBoard();
  delete b.guide;
  b.name = "測試操作白板";
  await dataAction(p, "匯入專案");
  await p.locator('input[type="file"]').setInputFiles({
    name: "practice.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "freeform-mind-canvas",
        schemaVersion: 1,
        boards: [b],
      }),
    ),
  });
  await waitSaved(p);
}
export async function waitSaved(p: Page) {
  await expect(p.locator(".workbench")).toHaveAttribute(
    "data-save-state",
    "已儲存於此裝置",
  );
}
export async function dataAction(p: Page, name: string) {
  await p.getByRole("button", { name: "設定", exact: true }).click();
  await p
    .getByRole("dialog", { name: "設定", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
  const close = p
    .getByRole("dialog", { name: "設定", exact: true })
    .getByRole("button", { name: "關閉設定", exact: true });
  if (await close.isVisible()) await close.click();
}
export async function enterGuide(p: Page) {
  if (await p.locator(".guide-document").count()) return;
  await p.getByRole("button", { name: "說明與幫助", exact: true }).click();
  await p
    .getByRole("menuitem", { name: "Mind Canvas 使用指南", exact: true })
    .click();
}
export async function locate(p: Page, text: string) {
  await p
    .getByRole("button", { name: "尋找節點與快速命令", exact: true })
    .click();
  await p.getByRole("textbox", { name: "搜尋節點與命令" }).fill(text);
  await p
    .getByRole("dialog")
    .getByRole("button", { name: text, exact: true })
    .click();
}
