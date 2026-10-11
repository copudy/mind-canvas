import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "production.spec.ts",
  timeout: 60000,
  workers: 1,
  reporter: [["list"]],
  use: {
    channel: "msedge",
    baseURL:
      process.env.PRODUCTION_URL || "https://copudy.github.io/mind-canvas/",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
