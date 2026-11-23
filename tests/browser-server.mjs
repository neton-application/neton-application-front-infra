// UI acceptance fixture, deliberately not a backend/storage integration test.
// Reuses the host's already installed esbuild. No production requests or credentials.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { realpathSync } from "node:fs";
const root = resolve(import.meta.dirname, "..");
const require = createRequire(realpathSync(resolve(root, "../neton-application-front/node_modules/tsx/package.json")));
const { build } = require("esbuild");
const runtime = resolve(root, "../neton-application-front/packages/front-runtime/src");
const result = await build({ entryPoints: [resolve(root, "tests/browser-fixture.tsx")], bundle: true, write: false, format: "esm", jsx: "automatic", define: { "process.env": "{}" }, alias: {
  react: resolve(root, "node_modules/react"), "react-dom": resolve(root, "node_modules/react-dom"),
  "@neton/application-front-runtime/client-context": `${runtime}/client-context.tsx`,
  "@neton/application-front-runtime/client": `${runtime}/client.ts`,
  "@neton/application-front-runtime/i18n": `${runtime}/i18n.tsx`,
  "@neton/application-front-runtime/errors": `${runtime}/errors.ts`,
  "@neton/application-front-kit": resolve(root, "../neton-application-front/packages/front-kit/src/index.ts"),
} });
const rows = []; let failSave = false; const requests = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/fixture/fail") { failSave = true; res.end("ok"); return; }
  if (url.pathname === "/fixture/requests") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(requests)); return; }
  if (url.pathname.startsWith("/admin/")) {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString(); const body = text ? JSON.parse(text) : null;
    requests.push({ method: req.method, path: url.pathname, body });
    res.setHeader("Content-Type", "application/json");
    if (failSave && /\/(create|update)$/.test(url.pathname)) { failSave = false; res.statusCode = 400; res.end(JSON.stringify({ code: 40001, message: "FILE_STORAGE_NOT_ALLOWED" })); return; }
    let data = true;
    if (url.pathname.endsWith("/page")) data = { list: rows, total: rows.length, page: 1, size: 20, totalPages: 1 };
    else if (url.pathname.includes("/get/")) data = rows.find((r) => r.id === Number(url.pathname.split("/").at(-1)));
    else if (url.pathname.endsWith("/create")) { data = rows.length + 1; rows.push({ ...body, id: data, valid: true }); }
    else if (url.pathname.endsWith("/update")) Object.assign(rows.find((r) => r.id === body.id), body);
    res.end(JSON.stringify({ code: 0, data })); return;
  }
  if (url.pathname === "/app.js") { res.setHeader("Content-Type", "text/javascript"); res.end(result.outputFiles[0].contents); return; }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html><head><title>Storage UI fixture</title></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});
server.listen(58151, "127.0.0.1", () => console.log("UI fixture http://127.0.0.1:58151"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
