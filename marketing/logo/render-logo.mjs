// Exporte les PNG du logo (fond transparent). Lancement : node render-logo.mjs
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "png");
mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1600 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(dir, "logo.html")).href);
await page.evaluate(() => document.fonts.ready);
for (const id of ["vertical-clair", "vertical-sombre", "horizontal-clair", "horizontal-sombre"]) {
  await page.locator("#" + id).screenshot({ path: path.join(out, `hortan-${id}.png`), omitBackground: true });
}
await page.setContent(`<img src="${pathToFileURL(path.join(dir, "hortan-symbole.svg")).href}" style="width:1024px;display:block">`);
await page.waitForLoadState("load");
await page.locator("img").screenshot({ path: path.join(out, "hortan-symbole.png"), omitBackground: true });
await browser.close();
console.log("✓ PNG du logo exportés dans logo/png/");
