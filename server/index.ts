import { createApp } from './app.ts';
import { config } from './config.ts';
import { databaseLabel } from './db.ts';
import { describePaymentSetup } from './payments.ts';
import { prepareData } from './startup.ts';

const seeded = await prepareData();

createApp().listen(config.port, () => {
  console.log(`[api] Béthanie prête sur http://localhost:${config.port}`);
  console.log(`[api] Base de données : ${databaseLabel}`);
  if (seeded) console.log('[api] Base de données initialisée avec les données de démonstration.');
  console.log(`[api] ${describePaymentSetup()}`);
});
