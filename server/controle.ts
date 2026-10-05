/* Contrôle complet des transactions, à la demande : « npm run controle ».
 *
 * Utilise la même base que le serveur (DATA_DIR / DB_PATH, .env.local), calcule la répartition des commandes
 * antérieures au contrôle si besoin, vérifie chaque commande et l'intégrité du journal scellé, puis affiche les
 * commissions de Béthanie. Code de sortie 1 en cas d'écart (utilisable dans une tâche automatique).
 */
import { formatPrice } from '../src/utils/commerce.ts';
import { databaseLabel } from './db.ts';
import { auditReport, backfillSettlements, sealLog } from './transactions.ts';

await backfillSettlements();
if (process.argv.includes('--sceller')) {
  const sealed = await sealLog();
  console.log(sealed ? `Journal : ${sealed} ligne(s) ancienne(s) scellée(s) par TRANSACTIONS_SECRET.` : 'Journal : déjà entièrement scellé.');
}
const r = await auditReport();

console.log(`\nContrôle des transactions — base : ${databaseLabel}`);
console.log(`Commission de Béthanie : ${r.taux} % du prix des articles`);
console.log(`  Perçue (commandes payées)      : ${formatPrice(r.commissionAcquise)} sur ${formatPrice(r.ventesPayees)} de ventes`);
console.log(`  À percevoir (non encore payées) : ${formatPrice(r.commissionPrevue)} sur ${formatPrice(r.ventesEnAttente)} de ventes`);
for (const shop of r.parBoutique) {
  console.log(`    · ${shop.boutique} : ${formatPrice(shop.commissionAcquise)} perçue, ${formatPrice(shop.commissionPrevue)} à percevoir`);
}
console.log(`Commandes vérifiées : ${r.commandesControlees} ; transactions refusées : ${r.transactionsRefusees}`);
if (r.anomalies.length === 0) console.log('Écarts : aucun');
for (const a of r.anomalies) console.log(`  ✖ ${a.commande} : ${a.ecarts.join(' ; ')}`);
console.log(
  r.journal.intact
    ? `Journal : intact (${r.journal.lignes} lignes, sceau : ${r.journal.scelle})`
    : `  ✖ Journal NON VÉRIFIABLE à partir de la ligne ${r.journal.premiereLigneAlteree} (${r.journal.lignes} lignes) : ${r.journal.cause}`
);
if (r.journal.intact && r.journal.nonScellees > 0) {
  console.log(
    `  ⚠ ${r.journal.nonScellees} ligne(s) non scellée(s) par la clé : anciennes lignes à sceller avec « npm run controle -- --sceller »,` +
      ' ou journal réécrit sans la clé si vous l’aviez déjà scellé.'
  );
}
process.exitCode = r.anomalies.length > 0 || !r.journal.intact || r.journal.nonScellees > 0 ? 1 : 0;
