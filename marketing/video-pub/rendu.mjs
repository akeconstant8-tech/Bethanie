// Fabrique la vidéo de présentation : sert le projet en local, fige l'animation image par image (60 images/s) dans
// Edge sans fenêtre, fusionne les images deux à deux (flou de mouvement, 30 images/s), compose la bande-son
// (son.py, d'après les repères de l'animation) et assemble les MP4.
//
//   node rendu.mjs <ffmpeg.exe>                        vidéo complète + version du site
//   node rendu.mjs <ffmpeg.exe> --assembler            refait seulement le son et l'assemblage (images déjà filmées)
//   node rendu.mjs <ffmpeg.exe> --apercus <dossier>    quelques images clés (PNG) et repères sonores pour vérifier
//
// Prérequis : Microsoft Edge, ffmpeg, Python avec numpy et scipy (variable PYTHON), puppeteer-core (dans le projet
// ou dans le dossier PUPPETEER_DIR).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const puppeteer = await import('puppeteer-core').then((m) => m.default).catch(() =>
  import(pathToFileURL(path.join(process.env.PUPPETEER_DIR ?? '.', 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href).then((m) => m.default));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const [ffmpeg, mode, previewDir] = process.argv.slice(2);
const PYTHON = process.env.PYTHON ?? 'python';
const FPS = 60;
// Dossier de travail gardé entre deux rendus (images filmées, repères, sons) ; ignoré par Git.
const TMP = path.join(HERE, '.travail');
fs.mkdirSync(TMP, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

const run = (cmd, args) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'pipe'] });
  let log = '';
  p.stderr.on('data', (d) => (log += d));
  p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} a échoué :\n${log.slice(-1500)}`))));
});

// Petit serveur en lecture seule, limité au dossier du projet.
const server = http.createServer((req, res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent((req.url ?? '/').split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(4300);

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
page.on('requestfailed', (r) => errors.push(`${r.url()} ${r.failure()?.errorText}`));
await page.goto('http://localhost:4300/marketing/video-pub/index.html?rendu', { waitUntil: 'networkidle0' });
const total = await page.evaluate(() => window.__prepare());
const shot = async (t, type = 'jpeg') => {
  await page.evaluate((v) => window.__seek(v), t);
  return page.screenshot({ type, quality: type === 'jpeg' ? 94 : undefined, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
};

try {
  if (mode === '--apercus') {
    fs.mkdirSync(previewDir, { recursive: true });
    const beat = 60000 / 128;
    for (const b of [1, 3.5, 6.5, 7.8, 10, 14.5, 16.8, 18.6, 21.5, 25, 26.8, 28.5, 30, 34.5, 36.6, 38.5, 39.4, 42, 44.5, 49.5, 52.5, 57.5, 63.5, 67.5]) {
      fs.writeFileSync(path.join(previewDir, `b${String(b).padStart(4, '0')}.png`), await shot(Math.round(b * beat), 'png'));
    }
    fs.writeFileSync(path.join(previewDir, 'cues.json'), JSON.stringify(await page.evaluate(() => window.__cues())));
    console.log('aperçus écrits dans', previewDir);
  } else {
    // 1. Images : 60 par seconde, fusionnées deux à deux (flou de mouvement) → 30 images/s, sans son.
    const silent = path.join(TMP, 'image.mp4');
    if (mode !== '--assembler' || !fs.existsSync(silent)) {
      const partial = path.join(TMP, 'image-en-cours.mp4');
      const enc = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-vf', "tmix=frames=2:weights='1 1',fps=30,scale=in_range=pc:out_range=tv,format=yuv420p", '-color_range', 'tv',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', partial], { stdio: ['pipe', 'ignore', 'pipe'] });
      let log = '';
      enc.stderr.on('data', (d) => (log += d));
      const frames = Math.round((total / 1000) * FPS);
      for (let i = 0; i < frames; i++) {
        const buf = await shot((i * 1000) / FPS);
        if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
        if (i % 300 === 0) console.log(`image ${i} / ${frames}`);
      }
      enc.stdin.end();
      if ((await new Promise((r) => enc.on('close', r))) !== 0) throw new Error(`ffmpeg (images) a échoué :\n${log.slice(-1500)}`);
      fs.renameSync(partial, silent); // seulement une fois toutes les images filmées
    }

    // 2. Bande-son d'après les repères de l'animation.
    const cues = path.join(TMP, 'cues.json');
    fs.writeFileSync(cues, JSON.stringify(await page.evaluate(() => window.__cues())));
    // Voix off : accélérée de 12 % (hauteur de voix conservée) et rééchantillonnée, puis placée phrase par phrase.
    const voice = path.join(TMP, 'voix.wav');
    await run(ffmpeg, ['-y', '-i', path.join(HERE, 'voix-off-fr.wav'), '-af', 'atempo=1.12,aresample=48000', '-ac', '1', voice]);
    const audio = path.join(TMP, 'son.wav');
    await run(PYTHON, [path.join(HERE, 'son.py'), cues, audio, voice]);

    // 3. Version pleine qualité (WhatsApp, réseaux sociaux) et version légère du site, avec le son.
    const full = path.join(HERE, 'bethanie-pub-9x16.mp4');
    // Moins de 16 Mo : limite d'envoi de certains téléphones (WhatsApp).
    await run(ffmpeg, ['-y', '-i', silent, '-i', audio, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', full]);
    const web = path.join(ROOT, 'public/videos/bethanie-presentation.mp4');
    await run(ffmpeg, ['-y', '-i', full, '-vf', 'scale=720:1280:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28',
      '-profile:v', 'high', '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', web]);
    const poster = path.join(TMP, 'affiche.png');
    fs.writeFileSync(poster, await shot(Math.round(7.2 * 60000 / 128), 'png'));
    await run(ffmpeg, ['-y', '-i', poster, '-vf', 'scale=360:640:flags=lanczos', '-quality', '82', path.join(ROOT, 'public/videos/bethanie-presentation.webp')]);
    const size = (f) => `${(fs.statSync(f).size / 1048576).toFixed(1)} Mo`;
    console.log(`vidéo : ${full} (${size(full)})\nsite : ${web} (${size(web)})`);
  }
} finally {
  if (errors.length) console.log('erreurs de la page :', errors.slice(0, 5));
  await browser.close();
  server.close();
}
