/* Service worker de Béthanie.
 * Ce fichier est un modèle : vite.config.ts le copie dans dist/sw.js en remplaçant la version et la liste des
 * fichiers à mettre en cache. Il n'est pas utilisé pendant le développement (npm run dev).
 *
 * Stratégies :
 *  - pages (navigation)          : réseau d'abord, sinon la page d'accueil en cache (l'application est une page unique) ;
 *  - JS, CSS, polices, icônes    : cache d'abord (fichiers versionnés, mis en cache à l'installation) ;
 *  - photos (/images, /uploads)  : cache d'abord, ajoutées au cache à la première consultation ;
 *  - vidéos (/videos)            : réseau uniquement (lecture par morceaux, fichiers lourds) ;
 *  - API publique du catalogue   : réseau d'abord (4 s maximum), sinon la dernière réponse connue ;
 *  - reste de l'API              : réseau uniquement (comptes, commandes, paiements : jamais en cache).
 */

const VERSION = '__SW_VERSION__';
const PRECACHE_URLS = '__SW_PRECACHE__';

const PRECACHE = `bethanie-precache-${VERSION}`;
const RUNTIME = 'bethanie-runtime-v1';
const API_CACHE = 'bethanie-api-v1';
const RUNTIME_MAX_ENTRIES = 150;
const API_TIMEOUT_MS = 4000;

/** Réponses de l'API gardées pour la consultation hors connexion : données publiques uniquement. */
const CACHEABLE_API = [/^\/api\/products(\?.*)?$/, /^\/api\/products\/[^/]+\/reviews$/, /^\/api\/config$/];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('bethanie-precache-') && key !== PRECACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// La page demande l'activation d'une nouvelle version (bouton « Mettre à jour »). Seules les pages de Béthanie
// (même origine) sont écoutées ; tout autre message est ignoré.
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) return;
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)));
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Seulement les réponses complètes (200) : une réponse partielle (206) ne peut pas être mise en cache.
  if (response.status === 200) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, response.clone());
    trimCache(RUNTIME, RUNTIME_MAX_ENTRIES);
  }
  return response;
};

/** Réseau d'abord ; au-delà de API_TIMEOUT_MS ou en cas d'échec, la dernière réponse connue. */
const networkFirstApi = async (event) => {
  const { request } = event;
  const cache = await caches.open(API_CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  // La mise à jour du cache continue même si l'on a déjà répondu avec l'ancienne version.
  event.waitUntil(network.catch(() => undefined));

  const timeout = new Promise((resolve) => setTimeout(resolve, API_TIMEOUT_MS));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
    return (await cache.match(request)) || (await network);
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
};

const navigation = async (request) => {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match('/', { ignoreSearch: true });
    return cached || Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (CACHEABLE_API.some((pattern) => pattern.test(url.pathname + url.search))) {
      event.respondWith(networkFirstApi(event));
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
    return;
  }

  if (url.pathname === '/sw.js') return;
  // Vidéos : lues morceau par morceau (requêtes « Range ») et trop lourdes pour le cache : toujours le réseau.
  if (url.pathname.startsWith('/videos/') || request.headers.has('range')) return;
  event.respondWith(cacheFirst(request));
});
