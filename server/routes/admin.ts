/* Administration (porteur de projet) : contrôle des transactions et commissions de Béthanie.
 * Rôle « admin » attribué à la connexion Google pour les adresses listées dans ADMIN_EMAILS.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { currentUser } from '../auth.ts';
import { forbidden } from '../http.ts';
import { auditReport } from '../transactions.ts';

export const adminRouter = Router();

adminRouter.use((req, _res, next) => {
  if (currentUser(req).role !== 'admin') return next(forbidden('Réservé à l’administration de Béthanie.'));
  next();
});

// Le rapport est coûteux à recalculer (toutes les commandes + tout le journal) : le cache côté serveur
// (transactions.ts) absorbe l'essentiel, cette limite couvre le reste (compte compromis, script qui boucle).
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => currentUser(req).id,
  message: { error: 'Trop de demandes de rapport. Réessayez dans une minute.' },
});

/** Rapport complet : commissions perçues et à percevoir, anomalies, intégrité du journal. */
adminRouter.get('/transactions', reportLimiter, async (_req, res) => {
  res.json({ report: await auditReport() });
});
