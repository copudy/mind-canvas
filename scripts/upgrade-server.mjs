import "./prepare-upgrade.mjs";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const project = fileURLToPath(new URL("../", import.meta.url));
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain",
};
http
  .createServer(async (req, res) => {
    try {
      const mode = await readFile(
        resolve(project, ".compat-v13-upgrade/mode.txt"),
        "utf8",
      ).catch(() => "old");
      const root = resolve(
        project,
        mode.trim() === "new" ? "dist" : ".compat-v13-upgrade/v12/dist",
      );
      const url = new URL(req.url, "http://127.0.0.1:4175");
      if (!url.pathname.startsWith("/mind-canvas/")) {
        res.writeHead(404);
        res.end();
        return;
      }
      const file = resolve(
        root,
        decodeURIComponent(url.pathname.slice("/mind-canvas/".length)) ||
          "index.html",
      );
      if (!file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(4175, "127.0.0.1");
