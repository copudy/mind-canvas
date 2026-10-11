import { readFile, readdir, writeFile } from "node:fs/promises";
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
let text =
  "Freeform Mind Canvas — Third-party runtime notices\nGenerated from package-lock.json. No reference project code was copied.\n";
let count = 0;
for (const [folder, meta] of Object.entries(lock.packages)) {
  if (!folder || meta.dev) continue;
  const pkg = JSON.parse(await readFile(`${folder}/package.json`, "utf8"));
  const files = (await readdir(folder)).filter((n) =>
    /^(license|licence|copying|notice)(\.|$)/i.test(n),
  );
  if (!files.length) throw new Error(`License text missing for ${pkg.name}`);
  text += `\n${"=".repeat(72)}\n${pkg.name} ${pkg.version} (${meta.license || pkg.license})\n${"=".repeat(72)}\n`;
  for (const file of files)
    text += (await readFile(`${folder}/${file}`, "utf8")) + "\n";
  count++;
}
await writeFile("public/THIRD_PARTY_NOTICES.txt", text);
console.log(`Preserved license notices for ${count} runtime packages.`);
