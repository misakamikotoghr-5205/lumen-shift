import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url)),
  port = Number(process.env.PORT || 4191);
let base = root;
try {
  await fs.access(path.join(root, "dist/index.html"));
  base = path.join(root, "dist");
} catch {}
const publicFiles = new Set([
  "index.html",
  "style.css",
  "app.js",
  "engine.js",
  "levels.js",
  "LICENSE",
  "docs/competition.md",
  "docs/landscape.md",
]);
http
  .createServer(async (req, res) => {
    try {
      const name =
        decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        ).replace(/^\//, "") || "index.html";
      if (!publicFiles.has(name)) throw Error("not public");
      const data = await fs.readFile(path.join(base, name));
      res.writeHead(200, {
        "Content-Type": name.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : name.endsWith(".css")
            ? "text/css; charset=utf-8"
            : name.endsWith(".html")
              ? "text/html; charset=utf-8"
              : "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Lumen Shift: http://127.0.0.1:${port}`),
  );
