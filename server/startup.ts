/* Préparation des données au démarrage du serveur (local comme sur Vercel), avant de répondre aux requêtes. */
import { purgeExpiredSessions } from './auth.ts';
import { seedIfEmpty } from './seed.ts';
import { backfillSettlements } from './transactions.ts';

let preparing: Promise<boolean> | null = null;

/**
 * Données de démonstration si la base est vide, répartition des commandes antérieures au contrôle des transactions,
 * sessions expirées supprimées. Une seule fois ; si la base était injoignable, la tentative suivante recommence.
 * Renvoie true si la base vient d'être remplie avec les données de démonstration.
 */
export const prepareData = () =>
  (preparing ??= (async () => {
    const seeded = await seedIfEmpty();
    await backfillSettlements();
    await purgeExpiredSessions();
    return seeded;
  })().catch((error) => {
    preparing = null;
    throw error;
  }));
