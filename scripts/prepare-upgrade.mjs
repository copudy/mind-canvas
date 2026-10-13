import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const project = fileURLToPath(new URL("../", import.meta.url));
const fixture = resolve(project, ".compat-v13-upgrade/v12");
// Only generated test fixtures are written. No browser storage or project sources are changed.
if (!existsSync(resolve(fixture, "dist/index.html"))) {
  const run = (command, args, cwd = project) => {
    const result = spawnSync(command, args, { cwd, stdio: "inherit" });
    if (result.error || result.status !== 0)
      throw new Error(
        `Upgrade fixture preparation failed: ${command}. Ensure v1.2.0 is available locally (git fetch --tags).`,
      );
  };
  mkdirSync(fixture, { recursive: true });
  const archive = resolve(project, ".compat-v13-upgrade/v12.tar");
  run("git", [
    "archive",
    "--format=tar",
    `--output=${archive}`,
    "v1.2.0",
    "src",
    "public",
    "index.html",
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
  ]);
  run("tar", ["-xf", archive, "-C", fixture]);
  run(
    process.execPath,
    [resolve(project, "node_modules/vite/bin/vite.js"), "build"],
    fixture,
  );
}
