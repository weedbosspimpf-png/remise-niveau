// Génère rendu/pub-15s.mp4 (1080×1350, 30 i/s) et rendu/affiche.png.
// Prérequis : Playwright + ffmpeg.  Lancement : node render.mjs
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "rendu");
mkdirSync(out, { recursive: true });
const FPS = 30, W = 1080, H = 1350;

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

// Affiche
await page.goto(pathToFileURL(path.join(dir, "affiche.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(out, "affiche.png") });
console.log("✓ rendu/affiche.png");

// Vidéo : rendu image par image, envoyé directement à ffmpeg
await page.goto(pathToFileURL(path.join(dir, "motion.html")).href + "?capture");
await page.evaluate(() => document.fonts.ready);
const duree = await page.evaluate(() => window.DUREE);
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart",
  path.join(out, "pub-15s.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
const total = Math.round(duree * FPS);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.renderAt(t), i / FPS);
  const img = await page.screenshot({ type: "jpeg", quality: 95 });
  if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % FPS === 0) process.stdout.write(`\r  vidéo ${Math.round(i / total * 100)} %`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("\r✓ rendu/pub-15s.mp4      ");

// Version avec musique : on démarre la piste 1 s plus tôt pour que le « drop » (à 4 s)
// tombe sur le passage à la scène « Sites web » (à 3 s).
const MUSIQUE = path.join(dir, "musique.mp3"), DECALAGE = 1.0;
if (existsSync(MUSIQUE)) {
  const fin = duree - 1.2;
  const fa = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(out, "pub-15s.mp4"),
    "-ss", String(DECALAGE), "-t", String(duree), "-i", MUSIQUE,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-af", `afade=t=in:d=0.3,afade=t=out:st=${fin}:d=1.2`, "-shortest", "-movflags", "+faststart",
    path.join(out, "pub-15s-musique.mp4")], { stdio: "inherit" });
  await new Promise((r) => fa.on("close", r));
  console.log("✓ rendu/pub-15s-musique.mp4");
}
