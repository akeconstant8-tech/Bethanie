/* Construit le déploiement Vercel (« npm run vercel-build », lancé par Vercel via vercel.json).
 *
 * Format « Build Output API » de Vercel (.vercel/output) :
 *   static/            le site compilé (copie de dist/, avec toutes les images de public/) ;
 *   functions/api.func l'API Express + SQLite (server/vercel.ts) regroupée en un seul fichier ;
 *   config.json        les règles : fichiers statiques d'abord, puis /api/* et /uploads/* vers l'API.
 *
 * Prérequis : « npm run build » (dist/) ; vercel-build l'enchaîne automatiquement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { SITE_SECURITY_HEADERS } from '../server/security-policy.js';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const output = path.join(root, '.vercel', 'output');
const fn = path.join(output, 'functions', 'api.func');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('✖ dist/ est absent : lancez « npm run build » avant ce script.');
  process.exit(1);
}

fs.rmSync(output, { recursive: true, force: true });

// En local, mêmes variables que Vite et le serveur ; sur Vercel, elles viennent des réglages du projet.
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const firebaseProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '').trim();
console.log(
  firebaseProjectId
    ? `✓ Connexion Google : projet Firebase « ${firebaseProjectId} » transmis au serveur`
    : '⚠ Connexion Google : ni FIREBASE_PROJECT_ID ni VITE_FIREBASE_PROJECT_ID dans les variables de construction'
);

// 1. Site statique
fs.cpSync(dist, path.join(output, 'static'), { recursive: true });

// 2. API : un seul fichier ESM pour Node.js
await build({
  entryPoints: [path.join(root, 'server', 'vercel.ts')],
  outfile: path.join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['node:sqlite'],
  legalComments: 'none',
  logLevel: 'warning',
  banner: {
    js: [
      // Les dépendances CommonJS (Express…) utilisent require : on le recrée dans ce module ESM.
      "import { createRequire as __bethanieRequire } from 'node:module';",
      'const require = __bethanieRequire(import.meta.url);',
      // Seul /tmp est modifiable sur Vercel ; le site est servi en HTTPS.
      "process.env.DATA_DIR ??= '/tmp/bethanie';",
      "process.env.COOKIE_SECURE ??= 'true';",
      // Connexion Google : le serveur vérifie les jetons avec l'identifiant du projet Firebase (public). Il est repris
      // des variables de la construction (les mêmes que le site), pour ne jamais manquer à l'exécution.
      ...(firebaseProjectId ? [`process.env.FIREBASE_PROJECT_ID ??= ${JSON.stringify(firebaseProjectId)};`] : []),
    ].join('\n'),
  },
});
fs.writeFileSync(
  path.join(fn, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 60 }, null, 2)
);

// 3. Règles de routage et en-têtes de cache (mêmes règles qu'avec « npm start »)
const config = {
  version: 3,
  routes: [
    // En-têtes de sécurité des pages et fichiers du site (l'API a les siens) : server/security-policy.js.
    { src: '^/(?!api/|uploads/).*$', headers: SITE_SECURITY_HEADERS, continue: true },
    { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/(sw\\.js|manifest\\.webmanifest|index\\.html)?$', headers: { 'cache-control': 'no-cache' }, continue: true },
    { handle: 'filesystem' },
    { src: '^/(api|uploads)(/.*)?$', dest: '/api' },
  ],
};
fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify(config, null, 2));

const size = (fs.statSync(path.join(fn, 'index.mjs')).size / 1024).toFixed(0);
console.log(`✓ .vercel/output prêt : site statique + API (${size} Ko)`);
