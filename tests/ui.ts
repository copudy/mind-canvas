import { expect, type Page } from "@playwright/test";
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
  const show = p.getByRole("button", { name: "展開白板清單", exact: true });
  if (await show.isVisible()) await show.click();
  await p
    .getByRole("button", { name: "歡迎使用 Mind Canvas", exact: true })
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
