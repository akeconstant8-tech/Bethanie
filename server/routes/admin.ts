/* Administration (porteur de projet) : contrôle des transactions et commissions de Béthanie.
 * Rôle « admin » attribué à la connexion Google pour les adresses listées dans ADMIN_EMAILS.
 */
import { Router } from 'express';
import { currentUser } from '../auth.ts';
import { forbidden } from '../http.ts';
import { auditReport } from '../transactions.ts';

export const adminRouter = Router();

adminRouter.use((req, _res, next) => {
  if (currentUser(req).role !== 'admin') return next(forbidden('Réservé à l’administration de Béthanie.'));
  next();
});

/** Rapport complet : commissions perçues et à percevoir, anomalies, intégrité du journal. */
adminRouter.get('/transactions', (_req, res) => {
  res.json({ report: auditReport() });
});
