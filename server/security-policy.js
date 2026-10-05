/* Règles de sécurité du site (politique de contenu et en-têtes), communes à :
 *  - server/app.ts : helmet, pour les réponses de l'API et le site servi par « npm start » ;
 *  - scripts/build-vercel.mjs : pages et fichiers du site sur Vercel.
 * Fichier JavaScript (pas TypeScript) pour être lu tel quel par le script de construction Vercel.
 */

/** Politique de sécurité du contenu (CSP) : d'où le navigateur peut charger scripts, images, cadres… */
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  formAction: ["'self'"],
  // Aucun autre site ne peut afficher Béthanie dans un cadre (protection contre le « clickjacking »).
  frameAncestors: ["'self'"],
  // apis.google.com : script chargé par Firebase pour la fenêtre de connexion Google.
  scriptSrc: ["'self'", 'https://apis.google.com'],
  scriptSrcAttr: ["'none'"],
  // Polices et icônes sont servies par le site lui-même (public/fonts, public/vendor).
  styleSrc: ["'self'", "'unsafe-inline'"],
  fontSrc: ["'self'", 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
  connectSrc: ["'self'", 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://www.googleapis.com'],
  frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://*.web.app', 'https://accounts.google.com'],
  workerSrc: ["'self'"],
  manifestSrc: ["'self'"],
};

/** La fenêtre Google (Firebase) doit pouvoir répondre à la page qui l'a ouverte. */
export const OPENER_POLICY = 'same-origin-allow-popups';

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** En-têtes ajoutés aux pages et fichiers du site sur Vercel (l'API a déjà les siens, via helmet). */
export const SITE_SECURITY_HEADERS = {
  'content-security-policy': [
    ...Object.entries(CSP_DIRECTIVES).map(([name, values]) => [kebab(name), ...values].join(' ')),
    'upgrade-insecure-requests',
  ].join('; '),
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': OPENER_POLICY,
};
