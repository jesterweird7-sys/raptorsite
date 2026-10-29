/** Локальный мок API: `/app/api` отвечает фиктивными, но структурно настоящими
 *  данными, чтобы сайт запускался и кликался без внешнего сервиса.
 *
 *   npm run mock          # http://127.0.0.1:8091/app/  (после npm run build)
 *   npm run dev + mock    # http://localhost:5173/app/  — горячая перезагрузка
 *
 * Формы ответов совпадают с типами из `src/lib/api.ts`: меняешь контракт —
 * правь и фикстуры, иначе мок разойдётся с фронтом молча.
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PORT = Number(process.env.MOCK_PORT || 8091);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

const raw = readFileSync(join(ROOT, "mock", "fixtures.json"), "utf8");
const fresh = (text) => text.replace(/"__NOW__"/g, `"${new Date().toISOString()}"`);
const fx = JSON.parse(fresh(raw));

/* мок живёт до перезапуска: правки фильтров и подписки должны переживать
   несколько запросов, иначе нельзя проверить, что кнопка реально сохранила */
const state = {
  board: structuredClone(fx.board),
  filters: structuredClone(fx.filters),
  subscription: structuredClone(fx.subscription),
  watched: new Set(fx.board.rows.filter((r) => r.watched).map((r) => r.gameId)),
  tick: 0,
};

const TOKEN = "demo.local.token";
const json = (res, body, code = 200) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};
const notFound = (res, path) =>
  json(res, { error: { kind: "mock", message: `мока нет: ${path}`, retryable: false } }, 404);

const routes = {
  "POST /session": () => ({ ...fx.session, token: TOKEN }),
  "GET /me": () => fx.session,
  "GET /day": () => fx.feed,
  "GET /collections": () => fx.collections,
  "GET /journal": () => fx.journal,
  "GET /history": () => fx.history,
  "GET /plans": () => fx.plans,
  "GET /public/plans": () => fx.plans,
  "GET /public/results": () => fx.public_results,
  "GET /referral": () => ({ code: "demo", link: "https://t.me/demo?start=demo", total: 2, paid: 1, bonus: 3 }),
  "GET /scanner/board": () => boardPayload(),
  "GET /scanner/signals": () => fx.signals,
  "GET /scanner/filters": () => state.filters,
  "GET /scanner/subscription": () => state.subscription,
  "GET /scanner/scenarios": () => fx.scenarios,
  "GET /admin/scanner": () => fx.admin,
  "GET /admin/dashboard": () => fx.admin_dashboard,
  "GET /admin/users": () => fx.admin_users,
  "GET /admin/settings": () => fx.admin_settings,
  "GET /admin/source": () => ({ configured: true, baseUrl: "https://demo.example", lastError: null }),
  "PATCH /scanner/filters": (body) => Object.assign(state.filters, body),
  "PATCH /scanner/subscription": (body) => Object.assign(state.subscription, body),
  "PATCH /band": (body) => body,
  "POST /scanner/watch": (body) => {
    if (body.on) state.watched.add(body.gameId);
    else state.watched.delete(body.gameId);
    return { watched: !!body.on, gameId: body.gameId };
  },
  "POST /journal": () => ({ id: Math.floor(Math.random() * 9000) + 1000 }),
  "POST /journal/1/resolve": () => ({ ok: true }),
  "POST /subscribe": (body) => ({ url: "https://t.me/demo?start=sub", plan: body.plan, amount: 1 }),
  "POST /admin/unlock": () => ({ unlocked: true }),
  "POST /admin/settings": (body) => ({ key: body.key, value: String(body.value) }),
  "POST /admin/settings/toggle": (body) => ({ key: body.key, value: true }),
  "POST /admin/jobs/mass": () => ({ jobId: "demo-job" }),
  "GET /jobs/demo-job": () => ({
    id: "demo-job", kind: "mass", label: "масс-анализ", stage: "готово", done: 10, total: 10,
    pct: 100, status: "done", result: null, error: null, elapsed: 1.2,
  }),
};

function boardPayload() {
  state.tick += 1;
  const rows = state.board.rows.map((row) => ({
    ...row,
    watched: state.watched.has(row.gameId),
    /* лента должна шевелиться: минута и возраст растут, иначе не проверить анимации */
    minute: Math.min(90, row.minute + (state.tick % 3 === 0 ? 1 : 0)),
  }));
  return {
    ...state.board,
    updated: new Date().toISOString(),
    ageSeconds: 3 + (state.tick % 5),
    rows,
    filters: state.filters,
    latestSignal: 5000 + (state.tick % 5),
  };
}

const readBody = (req) =>
  new Promise((resolve) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => {
      try {
        resolve(text ? JSON.parse(text) : {});
      } catch {
        resolve({});
      }
    });
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  /* SSE: тот же транспорт, что в бою, чтобы анимации и «поток активен»
     проверялись на локальной машине без внешнего сервиса */
  if (path === "/app/api/scanner/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const push = () => res.write(`event: board\ndata: ${JSON.stringify(boardPayload())}\n\n`);
    push();
    const timer = setInterval(push, 5000);
    req.on("close", () => clearInterval(timer));
    return;
  }

  if (path.startsWith("/app/api")) {
    const rest = path.slice("/app/api".length);
    if (rest.startsWith("/scanner/game/")) {
      const id = Number(rest.split("/")[3]);
      const row = state.board.rows.find((item) => item.gameId === id);
      if (!row) return notFound(res, rest);
      json(res, { ...fx.game, gameId: id, signal: row.signal, watched: state.watched.has(id) });
      return;
    }
    const hit = routes[`${req.method} ${rest}`];
    if (!hit) return notFound(res, `${req.method} ${rest}`);
    const body = req.method === "GET" ? undefined : await readBody(req);
    json(res, hit(body || {}));
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405).end();
    return;
  }
  const dir = join(ROOT, "dist");
  if (!existsSync(dir)) {
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end("<p>Мок API запущен. Статика не собрана: выполни <code>npm run build</code> или открой <code>npm run dev</code>.</p>");
    return;
  }
  let file = path === "/app" || path === "/app/" ? join(dir, "index.html") : join(dir, path.replace(/^\/app/, ""));
  file = normalize(file);
  if (!file.startsWith(normalize(dir)) || !existsSync(file)) file = join(dir, "index.html");
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`мок API: http://127.0.0.1:${PORT}/app/api/health`);
  console.log(`статика: http://127.0.0.1:${PORT}/app/  (нужен npm run build)`);
});
