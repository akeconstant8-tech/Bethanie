import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { META_CSP } from './server/security-policy.js';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const PUBLIC_DIR = path.resolve(__dirname, 'public');

/** Fichiers de public/ gardés dans le cache du service worker dès l'installation (fonctionnement hors ligne). */
const PUBLIC_PRECACHE = [
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/favicon-32.png',
  'vendor/fontawesome/css/all.min.css',
  'vendor/fontawesome/webfonts/fa-solid-900.woff2',
  'vendor/fontawesome/webfonts/fa-regular-400.woff2',
  'images/placeholder-product.svg',
  'images/banner/banniere-accueil.webp',
];
const PUBLIC_PRECACHE_DIRS = ['fonts', 'images/categories'];

/**
 * Génère dist/sw.js à partir de src/pwa/service-worker.js : la liste des fichiers compilés (noms avec empreinte)
 * et des ressources essentielles y est injectée, ainsi qu'un numéro de version qui change à chaque modification.
 */
const serviceWorker = (): Plugin => ({
  name: 'bethanie-service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const built = Object.keys(bundle).filter((file) => /\.(js|css)$/.test(file));
    const publicFiles = [
      ...PUBLIC_PRECACHE,
      ...PUBLIC_PRECACHE_DIRS.flatMap((dir) =>
        fs.readdirSync(path.join(PUBLIC_DIR, dir)).map((file) => `${dir}/${file}`)
      ),
    ].filter((file) => fs.existsSync(path.join(PUBLIC_DIR, file)));

    const urls = ['/', ...[...built, ...publicFiles].sort().map((file) => `/${file}`)];
    const template = fs.readFileSync(path.resolve(__dirname, 'src/pwa/service-worker.js'), 'utf8');
    const hash = crypto.createHash('sha256').update(template).update(urls.join('\n'));
    publicFiles.forEach((file) => hash.update(fs.readFileSync(path.join(PUBLIC_DIR, file))));

    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: template
        .replace("'__SW_VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace("'__SW_PRECACHE__'", JSON.stringify(urls)),
    });
  },
});

/**
 * Balise meta de la politique de sécurité (index.html) : remplie à la construction avec la politique du serveur ;
 * retirée en développement (Vite et le rechargement à chaud injectent des scripts que la politique refuserait).
 */
const CSP_META = /<meta http-equiv="Content-Security-Policy" content="__BETHANIE_CSP__" \/>/;
const contentSecurityPolicy = (): Plugin => ({
  name: 'bethanie-content-security-policy',
  transformIndexHtml: {
    order: 'pre',
    handler(html, context) {
      if (!CSP_META.test(html)) throw new Error('index.html : balise de la politique de sécurité introuvable.');
      return context.server
        ? html.replace(CSP_META, '')
        : html.replace(CSP_META, `<meta http-equiv="Content-Security-Policy" content="${META_CSP}" />`);
    },
  },
});

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // En développement, Vite relaie l'API et les photos importées vers le serveur Express.
    proxy: {
      '/api': API_URL,
      '/uploads': API_URL,
    },
    watch: { ignored: ['**/server/data/**'] },
  },
  plugins: [react(), tailwindcss(), serviceWorker(), contentSecurityPolicy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
