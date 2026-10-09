// Génère rendu/pub-60s.mp4 : animation motion-60.html + voix off + musique (baissée sous la voix).
// Lancement : node render-60.mjs
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "rendu");
mkdirSync(out, { recursive: true });
const FPS = 30, W = 1080, H = 1350;
// La musique démarre 1,32 s après la voix : son « drop » (4 s) tombe sur « Chez Hortan… » (5,32 s).
const DECALAGE_MUSIQUE = 1.32;
const run = (args) => new Promise((ok, ko) => spawn("ffmpeg", args, { stdio: "inherit" }).on("close", (c) => c ? ko(new Error("ffmpeg " + c)) : ok()));

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(pathToFileURL(path.join(dir, "motion-60.html")).href + "?capture");
await page.evaluate(() => document.fonts.ready);
const duree = await page.evaluate(() => window.DUREE);
const muet = path.join(dir, "..", "..", ".pub-60s-muet.tmp.mp4");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "slow", muet], { stdio: ["pipe", "inherit", "inherit"] });
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

const ms = Math.round(DECALAGE_MUSIQUE * 1000);
await run(["-y", "-loglevel", "error", "-i", muet, "-i", path.join(dir, "audio/voix-60.wav"), "-i", path.join(dir, "musique.mp3"),
  "-filter_complex",
  `[1]aformat=channel_layouts=stereo,apad,asplit[voix][cle];` +
  `[2]volume=0.55,adelay=${ms}|${ms},apad[mus];` +
  `[mus][cle]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[musb];` +
  `[voix][musb]amix=inputs=2:duration=longest:normalize=0,atrim=0:${duree},afade=t=out:st=${duree - 1.5}:d=1.5,alimiter=limit=0.95[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(duree), "-movflags", "+faststart",
  path.join(out, "pub-60s.mp4")]);
console.log("\r✓ rendu/pub-60s.mp4        ");
