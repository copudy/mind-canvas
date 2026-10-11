// Local-only test fixture for GitHub Pages style subdirectory hosting.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
const prefix = "/freeform-mind-canvas/";
const types = {
  ".html": "text/html;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (!url.pathname.startsWith(prefix)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const file = path.resolve(
        root,
        decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      await stat(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(4174, "127.0.0.1", () =>
    console.log("Subpath QA: http://127.0.0.1:4174/freeform-mind-canvas/"),
  );
