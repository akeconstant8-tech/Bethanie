import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = process.env.DATA_DIR ?? path.join(root, 'server', 'data');

/** Configuration du serveur, surchargeable par variables d'environnement. */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir,
  dbPath: process.env.DB_PATH ?? path.join(dataDir, 'bethanie.db'),
  uploadsDir: path.join(dataDir, 'uploads'),
  /** Frontend compilé (npm run build), servi par Express en production. */
  distDir: path.join(root, 'dist'),
  /** À mettre à "true" derrière HTTPS pour que le cookie de session ne circule qu'en chiffré. */
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  /** Mode démo : paiements simulés et avancement manuel des commandes par le client. */
  demoMode: process.env.DEMO_MODE !== 'false',
  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'simulation',
  sessionDays: 30,
  maxUploadBytes: 2.5 * 1024 * 1024,
};
