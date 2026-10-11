import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const svg = fs.readFileSync("public/icon.svg", "utf8");
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{margin:0;padding:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true });
}
await browser.close();
