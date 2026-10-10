// Fabrique la vidéo de présentation : sert le projet en local, fige l'animation image par image (30 images/s) dans
// Edge sans fenêtre et assemble le MP4 avec ffmpeg. Usage :
//   node rendu.mjs <ffmpeg.exe> [sortie.mp4]        vidéo complète
//   node rendu.mjs <ffmpeg.exe> --apercus <dossier>  quelques images clés (PNG) pour vérifier
// Prérequis : Microsoft Edge, ffmpeg, et puppeteer-core (dans le projet ou dans le dossier PUPPETEER_DIR).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Navigateur piloté : puppeteer-core du projet s'il est installé, sinon celui du dossier PUPPETEER_DIR.
const puppeteer = await import('puppeteer-core').then((m) => m.default).catch(() =>
  import(pathToFileURL(path.join(process.env.PUPPETEER_DIR ?? '.', 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href).then((m) => m.default));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const [ffmpeg, arg2, arg3] = process.argv.slice(2);
const FPS = 30;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

// Petit serveur en lecture seule, limité au dossier du projet.
const server = http.createServer((req, res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(4300);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`${r.url()} ${r.failure()?.errorText}`));
await page.goto('http://localhost:4300/marketing/video-pub/index.html?rendu', { waitUntil: 'networkidle0' });
const total = await page.evaluate(() => window.__prepare());
const shot = async (t, type = 'jpeg') => {
  await page.evaluate((v) => window.__seek(v), t);
  return page.screenshot({ type, quality: type === 'jpeg' ? 95 : undefined, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
};

if (arg2 === '--apercus') {
  fs.mkdirSync(arg3, { recursive: true });
  for (const t of [600, 1500, 3000, 4400, 6800, 9600, 11500, 14500, 15700, 16200, 17200, 20900, 24600, 26000, 29200, 31000, 34500]) {
    fs.writeFileSync(path.join(arg3, `t${String(t).padStart(5, '0')}.png`), await shot(t, 'png'));
  }
  console.log('aperçus écrits dans', arg3);
} else {
  const out = arg2 ?? path.join(HERE, 'bethanie-pub-9x16.mp4');
  const enc = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '21', '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-color_range', 'tv', '-profile:v', 'high', '-movflags', '+faststart', '-r', String(FPS), out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let log = '';
  enc.stderr.on('data', (d) => (log += d));
  const frames = Math.round((total / 1000) * FPS);
  for (let i = 0; i <= frames; i++) {
    const buf = await shot((i * 1000) / FPS);
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`image ${i} / ${frames}`);
  }
  enc.stdin.end();
  const code = await new Promise((r) => enc.on('close', r));
  console.log(code === 0 ? `vidéo écrite : ${out} (${(fs.statSync(out).size / 1048576).toFixed(1)} Mo)` : `échec de ffmpeg :\n${log.slice(-1500)}`);
}
if (errors.length) console.log('erreurs de la page :', errors.slice(0, 5));
await browser.close();
server.close();
