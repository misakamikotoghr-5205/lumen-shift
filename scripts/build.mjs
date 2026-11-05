import fs from "node:fs/promises";
await fs.rm("dist", { recursive: true, force: true });
await fs.mkdir("dist/docs", { recursive: true });
for (const file of [
  "index.html",
  "style.css",
  "app.js",
  "engine.js",
  "levels.js",
  "LICENSE",
  "docs/competition.md",
  "docs/landscape.md",
])
  await fs.copyFile(file, "dist/" + file);
console.log("Built the complete offline game in dist/.");
