// Supprime la base locale : elle sera recréée avec les données de démo au prochain démarrage.
import fs from 'node:fs';
import { config } from './config.ts';

for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(`${config.dbPath}${suffix}`, { force: true });
}
console.log(`Base supprimée (${config.dbPath}). Relancez « npm run dev » pour la recréer.`);
