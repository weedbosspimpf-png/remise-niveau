// Exporte les PNG du logo (fond transparent). Lancement : node render-logo.mjs
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(dir, "logo.html")).href);
await page.evaluate(() => document.fonts.ready);
for (const id of ["horizontal-clair", "horizontal-sombre", "vertical-clair", "vertical-sombre"]) {
  await page.locator("#" + id).screenshot({ path: path.join(dir, `logo-${id}.png`), omitBackground: true });
}
await page.setContent(`<img src="${pathToFileURL(path.join(dir, "logo-icone.svg")).href}" style="width:512px;height:512px;display:block">`);
await page.locator("img").screenshot({ path: path.join(dir, "logo-icone.png"), omitBackground: true });
await browser.close();
console.log("✓ PNG du logo exportés");
