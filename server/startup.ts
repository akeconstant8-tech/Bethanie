/* Préparation des données au démarrage du serveur (local comme sur Vercel), avant de répondre aux requêtes. */
import { purgeExpiredSessions } from './auth.ts';
import { syncDemoCatalogue } from './demo-sync.ts';
import { seedIfEmpty } from './seed.ts';
import { backfillSettlements } from './transactions.ts';

let preparing: Promise<boolean> | null = null;

/**
 * Catalogue de démonstration à jour, compte de démonstration si la base est vide, répartition des commandes
 * antérieures au contrôle des transactions, sessions expirées supprimées. Aucune commande fictive n'est créée.
 * Une seule fois ; si la base était injoignable, la tentative suivante recommence.
 * Renvoie true si la base vient d'être remplie avec le compte de démonstration.
 */
export const prepareData = () =>
  (preparing ??= (async () => {
    await syncDemoCatalogue();
    const seeded = await seedIfEmpty();
    await backfillSettlements();
    await purgeExpiredSessions();
    return seeded;
  })().catch((error) => {
    preparing = null;
    throw error;
  }));
