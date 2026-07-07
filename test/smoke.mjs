// Smoke test: abre index.html en un navegador real (Chromium vía Playwright), con los CDNs
// (React/ReactDOM/XLSX/Supabase/Tailwind) servidos desde node_modules o stubs, y verifica que:
//   1) la app monta (#root tiene contenido),
//   2) se puede navegar a Análisis,
//   3) NO hay errores de consola ni de página.
// Es hermético (sin red) y determinista. Lo usa el CI en cada PR.
import { chromium } from "playwright";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Ubicar Chromium: en CI lo instala `playwright install` (launch por defecto lo encuentra); en
// entornos con un Chromium pre-instalado (p.ej. PLAYWRIGHT_BROWSERS_PATH) se usa ese ejecutable.
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base && existsSync(base)) {
    for (const d of readdirSync(base).filter((n) => n.startsWith("chromium")).sort().reverse()) {
      const exe = join(base, d, "chrome-linux", "chrome");
      if (existsSync(exe)) return exe;
    }
  }
  return null;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const fileUrl = "file://" + join(root, "index.html");

const read = (p) => readFileSync(join(root, p), "utf8");
const local = {
  react: read("node_modules/react/umd/react.production.min.js"),
  reactDom: read("node_modules/react-dom/umd/react-dom.production.min.js"),
  xlsx: read("node_modules/xlsx/dist/xlsx.full.min.js"),
  stub: read("test/supabase-stub.js"),
};

const fail = (msg) => { console.error("✗ " + msg); process.exitCode = 1; };

const exe = chromePath();
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1100, height: 1600 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

const js = (body) => (route) => route.fulfill({ contentType: "application/javascript", body });
await page.route("**/react@18/**", js(local.react));
await page.route("**/react-dom@18/**", js(local.reactDom));
await page.route("**/xlsx/**", js(local.xlsx));
await page.route("**/@supabase/**", js(local.stub));
await page.route("https://cdn.tailwindcss.com/**", js("/* tailwind stub */"));
await page.route("https://cdn.tailwindcss.com", js("/* tailwind stub */"));
await page.route("**/css2**", (route) => route.fulfill({ contentType: "text/css", body: "" }));

await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

const rootLen = (await page.locator("#root").innerHTML()).length;
if (rootLen < 200) fail(`#root casi vacío (${rootLen} chars) — la app no montó`);
else console.log(`✓ app montada (#root ${rootLen} chars)`);

try {
  await page.getByText("Análisis", { exact: true }).first().click({ timeout: 5000 });
  await page.waitForTimeout(600);
  const kpis = await page.getByText("Facturación", { exact: false }).count();
  if (kpis < 1) fail("no se ve la sección de Análisis (Facturación)");
  else console.log("✓ navegación a Análisis OK");
} catch (e) {
  fail("no se pudo navegar a Análisis: " + e.message.split("\n")[0]);
}

if (consoleErrors.length) {
  fail(`${consoleErrors.length} error(es) de consola:`);
  consoleErrors.slice(0, 10).forEach((e) => console.error("   · " + e));
} else {
  console.log("✓ sin errores de consola");
}

await browser.close();
if (process.exitCode) console.error("\nSmoke test FALLÓ.");
else console.log("\nSmoke test OK.");
