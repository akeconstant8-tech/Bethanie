import { createApp } from './app.ts';
import { purgeExpiredSessions } from './auth.ts';
import { config } from './config.ts';
import { DEMO_EMAIL, DEMO_PASSWORD, seedIfEmpty } from './seed.ts';

const seeded = seedIfEmpty();
purgeExpiredSessions();

createApp().listen(config.port, () => {
  console.log(`[api] Béthanie prête sur http://localhost:${config.port}`);
  console.log(`[api] Base de données : ${config.dbPath}`);
  if (seeded) console.log(`[api] Base initialisée. Compte démo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  if (config.demoMode) console.log('[api] Mode démo actif (paiements simulés).');
});
