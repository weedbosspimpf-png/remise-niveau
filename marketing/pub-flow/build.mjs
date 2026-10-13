// Montage de la pub « Koffi » (plans Google Flow) : node build.mjs
// → rendu/pub-flow-koffi.mp4 (1920×1080, 30 i/s, ~38 s)
// Les plans Flow (sources/) sont assemblés avec des fondus ; on ajoute un plan « vrai site » rendu
// depuis ../site/index.html, des légendes narratives (pas de voix off pour l'instant) et l'écran de fin.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(process.execPath, "../../lib/node_modules/playwright")); }
const dir = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(dir, ".tmp");
const out = path.join(dir, "rendu");
mkdirSync(tmp, { recursive: true });
mkdirSync(out, { recursive: true });
const FPS = 30, X = 0.4; // durée des fondus enchaînés
const run = (args) => new Promise((ok, ko) => spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" }).on("close", (c) => (c ? ko(new Error("ffmpeg " + c)) : ok())));

// Segments, dans l'ordre : [fichier, début, durée]
const SEG = [
  ["sources/1-marche.mp4", 0, 8],
  ["sources/2-decouverte.mp4", 0, 7.5],
  ["SITE", 0, 4.5],
  ["sources/3-livraison.mp4", 0.5, 7],
  ["sources/4-boutique.mp4", 0.5, 7],
  ["FIN", 0, 6],
];
const debuts = [];
SEG.reduce((t, s, i) => { debuts.push(t); return t + s[2] - (i < SEG.length - 1 ? X : 0); }, 0);
const DUREE = debuts.at(-1) + SEG.at(-1)[2];

// Légendes : [début, fin, texte] en temps absolu
const LEG = [
  [0.6, 3.9, "À Abidjan, Koffi se bat chaque jour pour faire grandir son commerce."],
  [4.1, 7.4, "Mais en ligne… personne ne le trouve."],
  [8.6, 14.4, "Un soir, il découvre <span class='or'>Hortan Intelligence Plus</span>."],
  [debuts[3] + 0.5, debuts[3] + 6.4, "Quelques jours plus tard, son site est en ligne… et les commandes arrivent."],
  [debuts[4] + 0.5, debuts[4] + 6.3, "Son commerce passe à la vitesse supérieure."],
];

const browser = await pw.chromium.launch();

// 1. Capture du vrai site, format téléphone
const tel = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await tel.goto(pathToFileURL(path.join(dir, "../site/index.html")).href, { waitUntil: "networkidle" });
await tel.evaluate(() => document.fonts.ready);
const capture = path.join(tmp, "site-telephone.png");
await tel.screenshot({ path: capture, fullPage: true });
await tel.close();

// 2. Scènes rendues image par image
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(dir, "scenes.html")).href);
await page.evaluate(() => document.fonts.ready);
async function rendreScene(nom, fn, duree, fichier, extra) {
  await page.evaluate((n) => window.montrer(n), nom);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-r", String(FPS), fichier], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < Math.round(duree * FPS); i++) {
    await page.evaluate(([f, t, e]) => window[f](t, e), [fn, i / FPS, extra]);
    if (!ff.stdin.write(await page.screenshot({ type: "jpeg", quality: 95 }))) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}
await page.evaluate((src) => { document.getElementById("capture").src = src; }, pathToFileURL(capture).href);
await page.waitForFunction(() => document.getElementById("capture").complete);
const hauteur = await page.evaluate(() => document.getElementById("capture").getBoundingClientRect().height);
await rendreScene("site", "siteAt", 4.5, path.join(tmp, "site.mp4"), hauteur);
await rendreScene("fin", "finAt", 6, path.join(tmp, "fin.mp4"));

// 3. Légendes : PNG transparents
await page.evaluate(() => window.montrer("legende"));
const pngs = [];
for (const [i, [, , txt]] of LEG.entries()) {
  await page.evaluate((t) => window.legende(t), txt);
  const f = path.join(tmp, `legende-${i}.png`);
  await page.screenshot({ path: f, omitBackground: true });
  pngs.push(f);
}
await browser.close();

// 4. Assemblage vidéo
const entrees = [], filtres = [];
SEG.forEach(([f, d, l], i) => {
  const src = f === "SITE" ? path.join(tmp, "site.mp4") : f === "FIN" ? path.join(tmp, "fin.mp4") : path.join(dir, f);
  entrees.push("-ss", String(d), "-t", String(l), "-i", src);
  filtres.push(`[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=${FPS},format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);
});
let prec = "v0";
for (let i = 1; i < SEG.length; i++) {
  filtres.push(`[${prec}][v${i}]xfade=transition=fade:duration=${X}:offset=${(debuts[i]).toFixed(3)}[x${i}]`);
  prec = `x${i}`;
}
pngs.forEach((f, i) => {
  const k = SEG.length + i, [a, b] = LEG[i];
  entrees.push("-loop", "1", "-t", String(DUREE), "-i", f);
  filtres.push(`[${k}:v]format=rgba,fade=t=in:st=${a}:d=0.35:alpha=1,fade=t=out:st=${b - 0.35}:d=0.35:alpha=1[l${i}]`);
  filtres.push(`[${prec}][l${i}]overlay=0:0:enable='between(t,${a},${b})'[o${i}]`);
  prec = `o${i}`;
});
// 5. Son : ambiance des plans Flow (baissée) + musique Hortan, dont le « drop » (4 s) tombe quand il découvre le site
const DROP = 9.6, mDebut = DROP - 4.0;
const audios = [];
let nIn = SEG.length + pngs.length;
SEG.forEach(([f, d, l], i) => {
  if (f === "SITE" || f === "FIN") return;
  const ms = Math.round(debuts[i] * 1000);
  filtres.push(`[${i}:a]atrim=0:${l},asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=${l - 0.4}:d=0.4,volume=0.55,adelay=${ms}|${ms}[a${i}]`);
  audios.push(`[a${i}]`);
});
entrees.push("-i", path.join(dir, "../pub-motion/musique.mp3"));
const msM = Math.round(mDebut * 1000);
filtres.push(`[${nIn}:a]volume=0.6,afade=t=in:d=1.2,adelay=${msM}|${msM}[mus]`);
filtres.push(`${audios.join("")}[mus]amix=inputs=${audios.length + 1}:duration=longest:normalize=0,atrim=0:${DUREE},afade=t=out:st=${DUREE - 1.8}:d=1.8,alimiter=limit=0.95[a]`);

await run([...entrees, "-filter_complex", filtres.join(";"), "-map", `[${prec}]`, "-map", "[a]",
  "-t", String(DUREE), "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-c:a", "aac", "-b:a", "192k",
  "-movflags", "+faststart", path.join(out, "pub-flow-koffi.mp4")]);
console.log(`✓ rendu/pub-flow-koffi.mp4 (${DUREE.toFixed(1)} s)`);
