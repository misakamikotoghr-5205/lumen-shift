import { spawnSync } from "node:child_process";
import fs from "node:fs";
for (const file of [
  "app.js",
  "engine.js",
  "levels.js",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "scripts/build.mjs",
]) {
  if (
    spawnSync(process.execPath, ["--check", file], { stdio: "inherit" }).status
  )
    process.exit(1);
}
for (const file of [
  "index.html",
  "style.css",
  "app.js",
  "engine.js",
  "levels.js",
])
  if (
    /https?:\/\/|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(
      fs.readFileSync(file, "utf8"),
    )
  )
    throw Error("Unexpected external content in " + file);
console.log("Syntax and runtime no-network checks passed.");
