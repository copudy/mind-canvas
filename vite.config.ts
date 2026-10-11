import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "./",
  server: {
    watch: {
      ignored: [
        "**/playwright-report/**",
        "**/test-results/**",
        "**/artifacts/**",
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          if (moduleId.includes("node_modules")) {
            if (
              moduleId.includes("@xyflow") ||
              moduleId.includes("d3-") ||
              moduleId.includes("zustand")
            )
              return "canvas";
            if (moduleId.includes("react") || moduleId.includes("scheduler"))
              return "react";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Freeform Mind Canvas",
        short_name: "Mind Canvas",
        description: "自由式個人思考工作台",
        lang: "zh-Hant",
        start_url: "./",
        scope: "./",
        display: "standalone",
        theme_color: "#437e70",
        background_color: "#f8f9f6",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,txt}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
