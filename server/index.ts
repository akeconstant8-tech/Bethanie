import { createApp } from './app.ts';
import { purgeExpiredSessions } from './auth.ts';
import { config } from './config.ts';
import { seedIfEmpty } from './seed.ts';

const seeded = seedIfEmpty();
purgeExpiredSessions();

createApp().listen(config.port, () => {
  console.log(`[api] Béthanie prête sur http://localhost:${config.port}`);
  console.log(`[api] Base de données : ${config.dbPath}`);
  if (seeded) console.log('[api] Base de données initialisée avec les données de démonstration.');
  if (config.demoMode) console.log('[api] Mode démo actif (paiements simulés).');
});
