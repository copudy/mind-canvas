import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: { timeout: 8000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    channel: "msedge",
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command:
        "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
    },
    {
      command: "node scripts/subpath-server.mjs",
      url: "http://127.0.0.1:4174/freeform-mind-canvas/",
      reuseExistingServer: true,
    },
  ],
});
