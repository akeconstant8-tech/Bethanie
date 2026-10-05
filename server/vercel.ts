/* Point d'entrée de l'API sur Vercel.
 *
 * Vercel n'héberge que des fichiers statiques et des fonctions : sans ce fichier, /api/* répond 404 et le site
 * affiche « Le serveur Béthanie est injoignable » (ni produits, ni photos). scripts/build-vercel.mjs compile ce
 * fichier en une fonction Vercel qui reçoit les adresses /api/* et /uploads/*.
 *
 * Les variables DATA_DIR (/tmp/bethanie, seul dossier modifiable sur Vercel) et COOKIE_SECURE (true, site en
 * HTTPS) sont posées par défaut en tête du fichier compilé, avant la lecture de server/config.ts.
 */
import { createApp } from './app.ts';
import { databaseLabel, hostedDatabase } from './db.ts';

console.log(
  hostedDatabase
    ? `[api] Base de données permanente : ${databaseLabel}.`
    : '[api] Attention : base de données TEMPORAIRE (/tmp, effacée au redémarrage) — définir TURSO_DATABASE_URL et TURSO_AUTH_TOKEN.'
);

// Les données sont préparées avant la première réponse de l'API (voir createApp et startup.ts).
const app = createApp();
// Derrière le proxy de Vercel : vraie adresse IP du visiteur (limitation des tentatives de connexion).
app.set('trust proxy', 1);

export default app;
