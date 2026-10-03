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
import { seedIfEmpty } from './seed.ts';

// Base vide au démarrage d'une instance : on la remplit avec les données de démonstration.
seedIfEmpty();

const app = createApp();
// Derrière le proxy de Vercel : vraie adresse IP du visiteur (limitation des tentatives de connexion).
app.set('trust proxy', 1);

export default app;
