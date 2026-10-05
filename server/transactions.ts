/* Contrôleur des transactions — « agent de sécurité » du serveur (RG-09 du cahier des charges).
 *
 * Béthanie perçoit une commission de 5 % sur chaque vente : 5 % du prix des articles de chaque boutique (hors frais
 * de livraison et hors codes promo, financés par Béthanie) ; le vendeur garde 95 %, comme l'annonce l'espace vendeur.
 *
 * À chaque transaction (commande, paiement, livraison payée à la livraison), ce module :
 *  1. calcule la répartition par boutique (montant des articles, commission, part du vendeur) ;
 *  2. contrôle les montants (articles, total, remise, répartition) : en cas d'écart, la transaction est refusée et une
 *     alerte est inscrite au journal ;
 *  3. inscrit l'événement dans un journal scellé (chaque ligne contient l'empreinte de la précédente, HMAC si
 *     TRANSACTIONS_SECRET est défini) : une modification ultérieure de la base est détectable.
 *
 * Ce contrôle est du code ordinaire, exécuté à chaque requête : pas d'IA (trop lente et pas assez sûre pour de
 * l'argent). Vérification complète à la demande : `npm run controle` ou GET /api/admin/transactions.
 */
import crypto from 'node:crypto';
import { db, nowIso, transaction, type Row } from './db.ts';
import { HttpError } from './http.ts';

/** Commission de Béthanie, en points de base (500 = 5 %). Conservée commande par commande. */
export const COMMISSION_RATE_BP = 500;

/** Commission arrondie au franc CFA le plus proche ; la part du vendeur est le reste (les sommes tombent juste). */
export const commissionOn = (gross: number, rateBp = COMMISSION_RATE_BP) => Math.round((gross * rateBp) / 10_000);

export type TransactionEvent = 'commande' | 'paiement' | 'annulation' | 'reprise' | 'anomalie' | 'controle';

/** Délai après lequel une commande non payée est annulée et son stock remis en vente (décision du 5 octobre 2026). */
export const UNPAID_ORDER_TTL_MS = 2 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Journal scellé                                                      */
/* ------------------------------------------------------------------ */

const GENESIS = 'GENESE-BETHANIE';
const secret = () => process.env.TRANSACTIONS_SECRET?.trim() || '';

type LogRow = { at: string; order_id: string | null; event: string; amount: number; commission: number; details: string };

/** Sceau d'une ligne : HMAC avec la clé secrète (« m ») ou simple empreinte SHA-256 (« h »). */
const seal = (prevHash: string, row: LogRow, method: 'h' | 'm') => {
  const data = [prevHash, row.at, row.order_id ?? '', row.event, row.amount, row.commission, row.details].join('|');
  return method === 'm' ? crypto.createHmac('sha256', secret()).update(data).digest('hex') : crypto.createHash('sha256').update(data).digest('hex');
};

/** Ajoute une ligne au journal. À appeler dans une transaction SQLite quand l'événement en fait partie. */
export const logEvent = (orderId: string | null, event: TransactionEvent, amount = 0, commission = 0, details: Record<string, unknown> = {}) => {
  const last = db.prepare('SELECT hash FROM transaction_log ORDER BY id DESC LIMIT 1').get() as Row | undefined;
  const prev = last ? String(last.hash) : GENESIS;
  const row = { at: nowIso(), order_id: orderId, event, amount, commission, details: JSON.stringify(details) };
  const method = secret() ? 'm' : 'h';
  db.prepare(
    'INSERT INTO transaction_log (at, order_id, event, amount, commission, details, prev_hash, hash, seal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(row.at, row.order_id, row.event, row.amount, row.commission, row.details, prev, seal(prev, row, method), method);
};

/**
 * Vérifie que le journal n'a pas été modifié : chaque sceau est recalculé.
 * - Une ligne à empreinte simple après une ligne scellée par la clé = journal modifié.
 * - Clé définie : toute ligne à empreinte simple est « non scellée » (ancienne ligne à sceller avec
 *   `npm run controle -- --sceller`, ou journal réécrit sans la clé) ; le rapport le signale.
 */
export const verifyLog = () => {
  const rows = db.prepare('SELECT * FROM transaction_log ORDER BY id').all() as Row[];
  let prev = GENESIS;
  let keyed = false;
  let unsealed = 0;
  for (const r of rows) {
    const method = r.seal === 'm' ? 'm' : 'h';
    const row: LogRow = { at: String(r.at), order_id: r.order_id === null ? null : String(r.order_id), event: String(r.event), amount: Number(r.amount), commission: Number(r.commission), details: String(r.details) };
    const cause =
      method === 'm' && !secret()
        ? 'clé TRANSACTIONS_SECRET absente du serveur : vérification impossible'
        : method === 'h' && keyed
          ? 'ligne à empreinte simple après des lignes scellées par la clé'
          : String(r.prev_hash) !== prev || String(r.hash) !== seal(prev, row, method)
            ? 'sceau ne correspondant pas au contenu'
            : null;
    if (cause) return { intact: false, lignes: rows.length, premiereLigneAlteree: Number(r.id) as number | null, nonScellees: unsealed, cause };
    keyed ||= method === 'm';
    if (method === 'h' && secret()) unsealed += 1;
    prev = String(r.hash);
  }
  return { intact: true, lignes: rows.length, premiereLigneAlteree: null as number | null, nonScellees: unsealed, cause: null as string | null };
};

/** Scelle avec TRANSACTIONS_SECRET les lignes antérieures à la clé, après avoir vérifié qu'elles sont intactes. */
export const sealLog = () => {
  if (!secret()) throw new Error('TRANSACTIONS_SECRET n’est pas défini.');
  const check = verifyLog();
  if (!check.intact) throw new Error(`Journal modifié à partir de la ligne ${check.premiereLigneAlteree} : scellement refusé.`);
  if (check.nonScellees === 0) return 0;
  transaction(() => {
    const rows = db.prepare('SELECT * FROM transaction_log ORDER BY id').all() as Row[];
    let prev = GENESIS;
    for (const r of rows) {
      const row: LogRow = { at: String(r.at), order_id: r.order_id === null ? null : String(r.order_id), event: String(r.event), amount: Number(r.amount), commission: Number(r.commission), details: String(r.details) };
      const hash = seal(prev, row, 'm');
      db.prepare(`UPDATE transaction_log SET prev_hash = ?, hash = ?, seal = 'm' WHERE id = ?`).run(prev, hash, Number(r.id));
      prev = hash;
    }
    logEvent(null, 'controle', 0, 0, { action: 'journal scellé par la clé', lignes: check.nonScellees });
  });
  return check.nonScellees;
};

/* ------------------------------------------------------------------ */
/* Répartition et contrôles                                            */
/* ------------------------------------------------------------------ */

const itemsByShop = (orderId: string) =>
  db
    .prepare('SELECT shop_id, SUM(unit_price * quantity) AS gross FROM order_items WHERE order_id = ? GROUP BY shop_id ORDER BY shop_id')
    .all(orderId) as Row[];

/** Contrôle une commande ; renvoie la liste des écarts (vide si tout est juste). */
export const checkOrder = (orderId: string): string[] => {
  const problems: string[] = [];
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Row | undefined;
  if (!order) return [`commande ${orderId} introuvable`];
  const subtotal = Number(order.subtotal);
  const fee = Number(order.delivery_fee);
  const discount = Number(order.discount);
  const total = Number(order.total);

  const shops = itemsByShop(orderId);
  const itemsTotal = shops.reduce((sum, s) => sum + Number(s.gross), 0);
  if (shops.length === 0) problems.push('aucun article');
  if (itemsTotal !== subtotal) problems.push(`sous-total ${subtotal} ≠ somme des articles ${itemsTotal}`);
  if (discount < 0 || discount > subtotal + fee) problems.push(`remise ${discount} hors limites`);
  if (fee < 0) problems.push(`frais de livraison négatifs (${fee})`);
  if (total !== subtotal + fee - discount) problems.push(`total ${total} ≠ ${subtotal} + ${fee} − ${discount}`);
  if (total < 0) problems.push(`total négatif (${total})`);

  const settlements = db.prepare('SELECT * FROM order_settlements WHERE order_id = ? ORDER BY shop_id').all(orderId) as Row[];
  if (settlements.length !== shops.length) problems.push(`répartition sur ${settlements.length} boutique(s) au lieu de ${shops.length}`);
  for (const shop of shops) {
    const s = settlements.find((x) => x.shop_id === shop.shop_id);
    if (!s) {
      problems.push(`boutique ${String(shop.shop_id)} sans répartition`);
      continue;
    }
    const gross = Number(shop.gross);
    const rate = Number(s.commission_rate_bp);
    if (Number(s.gross) !== gross) problems.push(`boutique ${String(shop.shop_id)} : montant ${String(s.gross)} ≠ articles ${gross}`);
    if (Number(s.commission) !== commissionOn(gross, rate)) {
      problems.push(`boutique ${String(shop.shop_id)} : commission ${String(s.commission)} ≠ ${commissionOn(gross, rate)} (${rate / 100} %)`);
    }
    if (Number(s.seller_net) + Number(s.commission) !== gross) problems.push(`boutique ${String(shop.shop_id)} : part vendeur + commission ≠ montant`);
  }
  const paid = order.payment_status === 'payé';
  const cancelled = order.status === 'annulée';
  const expected = cancelled ? 'annulée' : paid ? 'acquise' : 'prévue';
  if (cancelled && paid) problems.push('commande annulée alors qu’elle est payée');
  if (settlements.some((s) => s.status !== expected)) {
    problems.push(`commission « ${settlements.map((s) => String(s.status)).join(', ')} » au lieu de « ${expected} »`);
  }
  return problems;
};

/** Écrit la répartition d'une commande (dans la transaction de création) et la contrôle ; refuse si écart. */
export const settleOrder = (orderId: string, event: TransactionEvent = 'commande') => {
  const order = db.prepare('SELECT total, status, payment_status FROM orders WHERE id = ?').get(orderId) as Row;
  const status = order.status === 'annulée' ? 'annulée' : order.payment_status === 'payé' ? 'acquise' : 'prévue';
  let commission = 0;
  for (const shop of itemsByShop(orderId)) {
    const gross = Number(shop.gross);
    const c = commissionOn(gross);
    commission += c;
    db.prepare(
      `INSERT INTO order_settlements (order_id, shop_id, gross, commission_rate_bp, commission, seller_net, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(orderId, String(shop.shop_id), gross, COMMISSION_RATE_BP, c, gross - c, status);
  }
  const problems = checkOrder(orderId);
  if (problems.length) throw new TransactionRefused(orderId, problems);
  logEvent(orderId, event, Number(order.total), commission, { taux: `${COMMISSION_RATE_BP / 100} %`, statut: status });
};

/**
 * Paiement reçu (en ligne, ou à la livraison) : la commission devient acquise. À appeler dans la même transaction
 * SQLite que le passage de la commande à « payé » : tout ou rien.
 */
export const acquireCommission = (orderId: string, how: 'en ligne' | 'à la livraison') => {
  db.prepare(`UPDATE order_settlements SET status = 'acquise' WHERE order_id = ?`).run(orderId);
  const problems = checkOrder(orderId);
  if (problems.length) throw new TransactionRefused(orderId, problems);
  const order = db.prepare('SELECT total FROM orders WHERE id = ?').get(orderId) as Row;
  const commission = Number(
    (db.prepare('SELECT COALESCE(SUM(commission), 0) AS c FROM order_settlements WHERE order_id = ?').get(orderId) as Row).c
  );
  logEvent(orderId, 'paiement', Number(order.total), commission, { mode: how });
};

/**
 * Annule les commandes restées « en attente de paiement » plus de 2 heures : statut « annulée », paiement « échoué »,
 * stock remis en vente, commission annulée, événement inscrit au journal. Chaque commande est traitée en tout ou rien.
 */
export const cancelUnpaidOrders = (now = Date.now()) => {
  const limit = new Date(now - UNPAID_ORDER_TTL_MS).toISOString();
  const expired = db
    .prepare(`SELECT id FROM orders WHERE payment_status = 'en_attente' AND status = 'confirmée' AND created_at < ? ORDER BY created_at`)
    .all(limit) as Row[];
  let cancelled = 0;
  for (const { id } of expired) {
    const orderId = String(id);
    try {
      guarded(() => {
        const order = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(orderId) as Row;
        if (order.payment_status !== 'en_attente' || order.status !== 'confirmée') return; // payée entre-temps
        db.prepare(`UPDATE orders SET status = 'annulée', payment_status = 'échoué' WHERE id = ?`).run(orderId);
        db.prepare(`INSERT INTO order_events (order_id, status) VALUES (?, 'annulée')`).run(orderId);
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId) as Row[];
        for (const item of items) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(Number(item.quantity), String(item.product_id));
        }
        db.prepare(`UPDATE order_settlements SET status = 'annulée' WHERE order_id = ?`).run(orderId);
        const problems = checkOrder(orderId);
        if (problems.length) throw new TransactionRefused(orderId, problems);
        logEvent(orderId, 'annulation', 0, 0, {
          raison: 'paiement non reçu sous 2 heures',
          articlesRemisEnVente: items.reduce((sum, item) => sum + Number(item.quantity), 0),
        });
        cancelled += 1;
      });
    } catch (error) {
      if (!(error instanceof TransactionRefused)) throw error;
    }
  }
  if (cancelled) console.log(`[controle] ${cancelled} commande(s) non payée(s) depuis 2 h annulée(s), stock remis en vente.`);
  return cancelled;
};

let lastSweep = 0;
/** À chaque requête de l'API, au plus une fois par minute : fonctionne aussi sur Vercel (pas de tâche planifiée). */
export const sweepUnpaidOrders = (_req: unknown, _res: unknown, next: () => void) => {
  if (Date.now() - lastSweep > 60_000) {
    lastSweep = Date.now();
    try {
      cancelUnpaidOrders();
    } catch (error) {
      console.error('[controle] Annulation des commandes non payées impossible :', error);
    }
  }
  next();
};

/** Exécute une opération sur les commandes ; si le contrôle la refuse, l'alerte est inscrite au journal. */
export const guarded = <T>(operation: () => T): T => {
  try {
    return transaction(operation);
  } catch (error) {
    if (error instanceof TransactionRefused) recordAnomaly(error);
    throw error;
  }
};

/** Écart détecté : la transaction est annulée ; l'alerte est inscrite par recordAnomaly, hors de la transaction annulée. */
export class TransactionRefused extends HttpError {
  orderId: string;
  problems: string[];

  constructor(orderId: string, problems: string[]) {
    super(500, 'Transaction refusée par le contrôle de sécurité. Aucun montant n’a été enregistré.');
    this.orderId = orderId;
    this.problems = problems;
  }
}

export const recordAnomaly = (error: TransactionRefused) => {
  console.error(`[controle] Transaction ${error.orderId} refusée : ${error.problems.join(' ; ')}`);
  logEvent(error.orderId, 'anomalie', 0, 0, { ecarts: error.problems });
};

/**
 * Commandes antérieures au contrôle (base existante) : leur répartition est calculée une fois, au démarrage,
 * et inscrite au journal comme « reprise ».
 */
export const backfillSettlements = () => {
  const missing = db
    .prepare('SELECT id FROM orders WHERE id NOT IN (SELECT DISTINCT order_id FROM order_settlements) ORDER BY created_at')
    .all() as Row[];
  for (const { id } of missing) {
    try {
      transaction(() => settleOrder(String(id), 'reprise'));
    } catch (error) {
      if (error instanceof TransactionRefused) recordAnomaly(error);
      else throw error;
    }
  }
  if (missing.length) console.log(`[controle] Répartition calculée pour ${missing.length} commande(s) existante(s).`);
};

/* ------------------------------------------------------------------ */
/* Rapport                                                             */
/* ------------------------------------------------------------------ */

/** Contrôle complet : toutes les commandes et l'intégrité du journal, plus le total des commissions. */
export const auditReport = () => {
  const orders = db.prepare('SELECT id FROM orders ORDER BY created_at').all() as Row[];
  const anomalies = orders
    .map((o) => ({ commande: String(o.id), ecarts: checkOrder(String(o.id)) }))
    .filter((a) => a.ecarts.length > 0);
  const totals = db
    .prepare(
      `SELECT status, COALESCE(SUM(commission), 0) AS commission, COALESCE(SUM(gross), 0) AS gross, COUNT(DISTINCT order_id) AS orders
       FROM order_settlements GROUP BY status`
    )
    .all() as Row[];
  const pick = (status: string) => totals.find((t) => t.status === status);
  const byShop = db
    .prepare(
      `SELECT s.shop_id, COALESCE(sh.name, s.shop_id) AS name,
              SUM(CASE WHEN s.status = 'acquise' THEN s.commission ELSE 0 END) AS acquise,
              SUM(CASE WHEN s.status = 'prévue' THEN s.commission ELSE 0 END) AS prevue,
              SUM(s.seller_net) AS seller_net
       FROM order_settlements s LEFT JOIN shops sh ON sh.id = s.shop_id
       GROUP BY s.shop_id ORDER BY acquise DESC, prevue DESC`
    )
    .all() as Row[];
  const refused = Number((db.prepare(`SELECT COUNT(*) AS n FROM transaction_log WHERE event = 'anomalie'`).get() as Row).n);
  return {
    taux: COMMISSION_RATE_BP / 100,
    commandesControlees: orders.length,
    commissionAcquise: Number(pick('acquise')?.commission ?? 0),
    commissionPrevue: Number(pick('prévue')?.commission ?? 0),
    ventesPayees: Number(pick('acquise')?.gross ?? 0),
    ventesEnAttente: Number(pick('prévue')?.gross ?? 0),
    parBoutique: byShop.map((s) => ({
      boutique: String(s.name),
      commissionAcquise: Number(s.acquise),
      commissionPrevue: Number(s.prevue),
      partVendeurs: Number(s.seller_net),
    })),
    anomalies,
    transactionsRefusees: refused,
    journal: { ...verifyLog(), scelle: secret() ? 'HMAC (TRANSACTIONS_SECRET)' : 'empreinte simple (définir TRANSACTIONS_SECRET en production)' },
    verifieLe: nowIso(),
  };
};
