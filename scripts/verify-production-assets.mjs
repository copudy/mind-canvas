import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generatorModule from "@babel/generator";
const base =
  process.env.PRODUCTION_URL || "https://copudy.github.io/mind-canvas/";
const version = JSON.parse(await readFile("package.json", "utf8")).version;
const commit = execFileSync("git", ["rev-parse", `v${version}^{}`], {
  encoding: "utf8",
}).trim();
const html = await (await fetch(base)).text();
const local = await readFile("dist/index.html", "utf8");
const paths = (s) =>
  [...s.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map((m) => m[1]);
const expected = paths(local);
const actual = paths(html);
if (JSON.stringify(expected) !== JSON.stringify(actual))
  throw new Error("Deployed asset names differ from tested build");
const sw = await (await fetch(new URL("sw.js", base))).text();
const localSw = await readFile("dist/sw.js", "utf8");
const entries = (s) =>
  [...s.matchAll(/url:"([^"]+)",revision:([^}]+)/g)].map((m) => [m[1], m[2]]);
const sorted = (s) =>
  entries(s)
    .map(([path]) => path)
    .sort();
if (JSON.stringify(sorted(sw)) !== JSON.stringify(sorted(localSw)))
  throw new Error("SW cached asset paths differ");
const code = (s) => {
  const ast = parse(
    s.replace(/precacheAndRoute\(\[.*?\],/s, "precacheAndRoute([],"),
  );
  let index = 0;
  // Compare lexical bindings, not platform-dependent minifier variable names.
  (traverseModule.default || traverseModule)(ast, {
    Scope(path) {
      for (const binding of Object.values(path.scope.bindings).sort(
        (a, b) => a.identifier.start - b.identifier.start,
      ))
        path.scope.rename(
          binding.identifier.name,
          `__verifiedBinding${index++}`,
        );
    },
  });
  return (generatorModule.default || generatorModule)(ast, {
    compact: true,
    comments: false,
  }).code;
};
if (code(sw) !== code(localSw))
  throw new Error("SW program differs beyond precache ordering/revisions");
const revisions = new Map(entries(sw));
const assets = [];
const workbox = `./${sw.match(/workbox-[\w-]+/)[0]}.js`;
for (const path of new Set([
  ...actual,
  ...entries(sw).map(([path]) => `./${path}`),
  workbox,
])) {
  const response = await fetch(new URL(path, base));
  if (!response.ok) throw new Error(`Asset failed ${path}: ${response.status}`);
  const remote = Buffer.from(await response.arrayBuffer());
  const disk = await readFile(`dist/${path.replace(/^\.\//, "")}`);
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  const license = path === "./THIRD_PARTY_NOTICES.txt";
  const matches = license
    ? remote.toString().replace(/\r\n/g, "\n") ===
      disk.toString().replace(/\r\n/g, "\n")
    : sha(remote) === sha(disk);
  if (!matches) throw new Error(`Asset content differs: ${path}`);
  const revision = revisions.get(path.replace(/^\.\//, ""));
  if (
    revision &&
    revision !== "null" &&
    JSON.parse(revision) !== createHash("md5").update(remote).digest("hex")
  )
    throw new Error(`SW revision incorrect: ${path}`);
  assets.push({
    path,
    status: response.status,
    sha256: sha(remote),
    matchesTestedBuild: true,
    comparison: license ? "line-ending-normalized" : "byte-for-byte",
  });
}
await writeFile(
  `artifacts/production-assets-${version}.json`,
  JSON.stringify(
    {
      version,
      commit,
      checkedAt: new Date().toISOString(),
      url: base,
      serviceWorker: {
        sameProgramAndAssetPaths: true,
        revisionsValidated: true,
        comparison: "AST after lexical binding normalization",
        difference:
          "precache ordering, minifier local variable names, THIRD_PARTY_NOTICES.txt CRLF/LF",
      },
      assets,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${assets.length} deployed assets verified; SW program, cache paths and revisions verified`,
);
