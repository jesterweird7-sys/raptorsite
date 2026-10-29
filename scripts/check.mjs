/** Скриншот собранного сайта в реальном браузере: быстрая проверка вёрстки и
 *  анимаций без ручной возни. Нужен установленный Chromium или Edge.
 *
 *   npm run build && npm run mock &
 *   npm run check http://127.0.0.1:8091/app/#/live 390 844
 *
 * Переменная CHROME указывает браузер, если автопоиск не нашёл.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const CANDIDATES = [
  process.env.CHROME,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const exe = CANDIDATES.find((path) => existsSync(path));
if (!exe) {
  console.error("не найден браузер: поставь Chromium или укажи путь в CHROME=...");
  process.exit(1);
}

const url = process.argv[2] ?? "http://127.0.0.1:8091/app/";
const width = Number(process.argv[3] ?? 390);
const height = Number(process.argv[4] ?? 844);
/* путь берём через fileURLToPath: pathname оставляет %D0%9D в кириллических
   адресах, и mkdir падает на несуществующей папке */
const outDir = join(fileURLToPath(new URL(".", import.meta.url)), "..", "shots") + "/";
mkdirSync(outDir, { recursive: true });
const name = outDir + (process.argv[5] ?? `shot-${width}x${height}.png`);

const browser = await puppeteer.launch({ executablePath: exe, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

/* демо-вход: мок принимает любой ключ, боевой сервер — только настоящий */
await page.evaluateOnNewDocument(() => localStorage.setItem("raptor.session", "demo.local.token"));
await page.goto(url, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: name, fullPage: true });

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log(`${name}: переполнение по горизонтали ${overflow}px, ошибок консоли ${errors.length}`);
for (const error of errors.slice(0, 5)) console.log("  ", error);
await browser.close();
process.exit(overflow > 1 || errors.length ? 1 : 0);
