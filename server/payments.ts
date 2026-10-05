/* Paiements en ligne — GeniusPay (https://geniuspay.ci/docs/api).
 *
 * Fournisseurs :
 *  - « geniuspay » (dès que GENIUSPAY_SECRET_KEY est défini, sauf PAYMENT_PROVIDER=simulation) : Wave, Orange Money,
 *    MTN, Moov, cartes, sur la page sécurisée de GeniusPay ; aucune donnée de carte ne transite par Béthanie ;
 *  - « simulation » : démonstration, le client confirme lui-même (route POST /orders/:id/pay).
 *
 * Parcours : la commande est créée (paiement « en attente »), puis le paiement GeniusPay ; le client est envoyé sur
 * la page de paiement. Au retour (page de suivi) et à chaque notification signée de GeniusPay (webhook), le serveur
 * DEMANDE LE STATUT À GENIUSPAY (jamais au navigateur) : « completed » au bon montant → commande payée et commission
 * acquise (contrôleur des transactions) ; échec, annulation, expiration → commande annulée, stock remis en vente.
 *
 * Variables : GENIUSPAY_SECRET_KEY (sk_sandbox_… ou sk_live_…), GENIUSPAY_WEBHOOK_SECRET (whsec_…),
 * PUBLIC_URL (adresse du site pour le retour, facultative).
 */
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from './config.ts';
import { db, type Row } from './db.ts';
import { HttpError } from './http.ts';
import {
  TransactionRefused,
  acquireCommission,
  cancelOrder,
  cancelUnpaidOrders,
  expiredOrdersWithPayment,
  guarded,
  recordAnomaly,
} from './transactions.ts';

const GENIUSPAY_API = 'https://geniuspay.ci/api/v1/merchant';

export const isSimulation = () => config.paymentProvider === 'simulation';
export const isGeniusPay = () => config.paymentProvider === 'geniuspay';

/** Moyens de paiement de Béthanie → codes GeniusPay (« payment_method »). */
const METHOD_CODES: Record<string, string> = {
  'Orange Money': 'orange_money',
  'MTN MoMo': 'mtn_money',
  'Moov Money': 'moov_money',
  Wave: 'wave',
  'Carte bancaire': 'card',
};

interface GeniusPayment {
  reference: string;
  amount: number | string;
  currency?: string;
  status: string | null;
  checkout_url?: string;
  payment_url?: string;
  environment?: string;
  metadata?: { order_id?: string };
}

/**
 * GeniusPay a répondu et refusé la demande : rien n'a été créé chez eux, une nouvelle tentative est sans risque.
 * À l'inverse, sans réponse (délai dépassé, coupure) ou sur une erreur de leur serveur, le paiement a pu être créé :
 * on ne réessaie pas, pour ne jamais ouvrir deux paiements pour une même commande.
 */
class GeniusPayRefused extends HttpError {}

const secretKey = () => {
  const key = process.env.GENIUSPAY_SECRET_KEY?.trim();
  if (!key) {
    console.error('[api] Paiement GeniusPay : variable GENIUSPAY_SECRET_KEY manquante (voir .env.example).');
    throw new HttpError(503, 'Le paiement en ligne n’est pas encore configuré. Choisissez le paiement à la livraison.');
  }
  return key;
};

/** Appel à l'API GeniusPay ; les erreurs détaillées vont dans les journaux, le client reçoit un message simple. */
const geniusPay = async <T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
  let response: globalThis.Response;
  try {
    response = await fetch(GENIUSPAY_API + path, {
      method,
      headers: { Authorization: `Bearer ${secretKey()}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error(`[api] GeniusPay injoignable (${method} ${path}) :`, error instanceof Error ? error.message : error);
    throw new HttpError(502, 'Le service de paiement ne répond pas. Réessayez dans un instant.');
  }
  const json = (await response.json().catch(() => null)) as { success?: boolean; data?: T; error?: unknown } | null;
  if (!response.ok || !json?.success || json.data === undefined) {
    // Code et message d'erreur seulement : la réponse complète peut reprendre nom, téléphone et e-mail du client.
    const error = json?.error as { code?: unknown; message?: unknown } | string | undefined;
    const detail = typeof error === 'string' ? error : [error?.code, error?.message].filter(Boolean).map(String).join(' — ');
    console.error(`[api] GeniusPay ${method} ${path} : ${response.status} ${detail.slice(0, 200) || 'réponse inattendue'}`);
    const Refusal = response.status < 500 ? GeniusPayRefused : HttpError;
    throw new Refusal(response.status === 404 ? 404 : 502, 'Le service de paiement a refusé la demande. Réessayez ou choisissez le paiement à la livraison.');
  }
  return json.data;
};

/* ------------------------------------------------------------------ */
/* Démarrer un paiement                                                */
/* ------------------------------------------------------------------ */

/** Adresse publique du site, pour le retour du client après paiement. */
export const publicUrl = (req: Request) => {
  const fromEnv = process.env.PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const origin = req.get('origin');
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  return `${req.protocol}://${req.get('host')}`;
};

export interface PaymentStart {
  reference: string;
  url: string;
}

/**
 * Crée le paiement GeniusPay d'une commande. Essaie d'abord le moyen choisi par le client (paiement direct) ;
 * si GeniusPay le refuse explicitement, repasse par sa page de paiement où le client choisit lui-même.
 * GeniusPay ne propose pas de clé d'idempotence (documentation de l'API) : l'unicité est garantie de notre côté
 * (un seul appel par commande, pas de nouvel essai sans réponse claire, référence unique en base).
 */
export const startPayment = async (params: {
  orderId: string;
  amount: number;
  method: string;
  customer: { name: string; email: string; phone?: string; country: 'CI' | 'SN' };
  returnUrl: string;
}): Promise<PaymentStart> => {
  const base = {
    amount: params.amount,
    currency: 'XOF',
    description: `Commande Béthanie ${params.orderId}`,
    customer: { name: params.customer.name, email: params.customer.email, phone: params.customer.phone, country: params.customer.country },
    success_url: params.returnUrl,
    error_url: params.returnUrl,
    metadata: { order_id: params.orderId, source: 'bethanie' },
  };
  const code = METHOD_CODES[params.method];
  let payment: GeniusPayment;
  try {
    payment = await geniusPay<GeniusPayment>('POST', '/payments', code ? { ...base, payment_method: code } : base);
  } catch (error) {
    if (!code || !(error instanceof GeniusPayRefused)) throw error;
    payment = await geniusPay<GeniusPayment>('POST', '/payments', base);
  }
  const url = payment.payment_url || payment.checkout_url;
  if (!payment.reference || !url) {
    console.error('[api] GeniusPay : réponse sans référence ni adresse de paiement.');
    throw new HttpError(502, 'Le service de paiement a refusé la demande. Réessayez ou choisissez le paiement à la livraison.');
  }
  return { reference: payment.reference, url };
};

/* ------------------------------------------------------------------ */
/* Rapprocher une commande de son paiement                             */
/* ------------------------------------------------------------------ */

const FAILED = new Set(['failed', 'cancelled', 'expired', 'refunded']);

/**
 * Demande à GeniusPay le statut du paiement d'une commande et met la commande à jour (tout ou rien, contrôlé).
 * cancelIfPending : commande non payée depuis 2 h → annulée même si GeniusPay attend encore.
 */
export const reconcileOrderPayment = async (orderId: string, options: { cancelIfPending?: boolean } = {}) => {
  const order = db.prepare('SELECT id, status, payment_status, payment_reference, total FROM orders WHERE id = ?').get(orderId) as Row | undefined;
  if (!order?.payment_reference) return 'sans paiement en ligne';
  const reference = String(order.payment_reference);
  const payment = await geniusPay<GeniusPayment>('GET', `/payments/${encodeURIComponent(reference)}`);
  const status = String(payment.status ?? 'pending');

  if (status === 'completed') {
    if (order.payment_status === 'payé') return 'payée';
    const problems: string[] = [];
    if (Number(payment.amount) !== Number(order.total)) problems.push(`montant GeniusPay ${String(payment.amount)} ≠ total ${String(order.total)}`);
    if ((payment.currency ?? 'XOF') !== 'XOF') problems.push(`devise ${payment.currency}`);
    // Ce paiement doit être exactement celui créé pour cette commande (contrôlé quand GeniusPay renvoie ces champs).
    if (payment.reference && payment.reference !== reference) problems.push(`référence GeniusPay ${payment.reference} ≠ ${reference}`);
    if (payment.metadata?.order_id && payment.metadata.order_id !== orderId) {
      problems.push(`paiement émis pour la commande ${payment.metadata.order_id}`);
    }
    if (order.status === 'annulée') problems.push('paiement reçu pour une commande déjà annulée : à rembourser ou à honorer');
    if (problems.length) {
      recordAnomaly(new TransactionRefused(orderId, [...problems, `référence ${reference}`]));
      return 'anomalie';
    }
    guarded(() => {
      const { changes } = db.prepare(`UPDATE orders SET payment_status = 'payé' WHERE id = ? AND payment_status = 'en_attente'`).run(orderId);
      if (changes === 1) acquireCommission(orderId, 'en ligne', { reference, fournisseur: 'GeniusPay' });
    });
    return 'payée';
  }

  if (order.payment_status === 'en_attente' && order.status === 'confirmée' && (FAILED.has(status) || options.cancelIfPending)) {
    // Distingue un refus explicite de GeniusPay (le client a vu l'échec sur leur page) d'une simple expiration :
    // le suivi de commande affiche un message différent dans chaque cas.
    cancelOrder(
      orderId,
      FAILED.has(status) ? `paiement ${status} chez GeniusPay` : 'paiement non reçu sous 2 heures',
      { reference },
      FAILED.has(status) ? 'paiement_echoue' : 'paiement_expire'
    );
    return 'annulée';
  }
  return status;
};

/* ------------------------------------------------------------------ */
/* Notifications de GeniusPay (webhook)                                */
/* ------------------------------------------------------------------ */

/** Signature GeniusPay : HMAC-SHA256(« horodatage.corps brut », secret whsec), en hexadécimal ; 5 minutes au plus. */
export const verifyWebhookSignature = (rawBody: string, signature: string, timestamp: string, secret: string, now = Date.now()) => {
  const age = Math.abs(now / 1000 - Number.parseInt(timestamp, 10));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/** POST /api/payments/webhook/geniuspay — appelée par GeniusPay, sans session ni en-tête X-Bethanie. */
export const geniusPayWebhook = async (req: Request, res: Response) => {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[api] Notification GeniusPay ignorée : variable GENIUSPAY_WEBHOOK_SECRET manquante.');
    res.status(503).json({ error: 'Notifications non configurées.' });
    return;
  }
  const raw = (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '';
  const signature = req.get('x-webhook-signature') ?? '';
  const timestamp = req.get('x-webhook-timestamp') ?? '';
  if (!raw || !verifyWebhookSignature(raw, signature, timestamp, secret)) {
    console.error('[api] Notification GeniusPay refusée : signature absente, invalide ou trop ancienne.');
    res.status(401).json({ error: 'Signature invalide.' });
    return;
  }
  let event: { id?: unknown; event?: string; data?: { reference?: string; metadata?: { order_id?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    res.status(400).json({ error: 'Notification illisible.' });
    return;
  }

  // Anti-rejeu : chaque notification n'est traitée qu'une fois. Identifiant fourni par GeniusPay (« id »), sinon
  // empreinte de la signature (unique pour un horodatage et un contenu donnés).
  const eventId =
    typeof event.id === 'string' && event.id.length > 0 && event.id.length <= 100
      ? `id:${event.id}`
      : `sig:${crypto.createHash('sha256').update(`${timestamp}.${signature}`).digest('hex')}`;
  // Au-delà de 7 jours, GeniusPay ne renvoie plus une notification (et l'horodatage la refuserait déjà).
  db.prepare('DELETE FROM payment_webhook_events WHERE received_at < ?').run(new Date(Date.now() - 7 * 86_400_000).toISOString());
  if (db.prepare('INSERT OR IGNORE INTO payment_webhook_events (event_id) VALUES (?)').run(eventId).changes === 0) {
    console.warn(`[api] Notification GeniusPay déjà traitée, ignorée (${eventId.slice(0, 24)}…).`);
    res.json({ received: true, duplicate: true });
    return;
  }

  const reference = event.data?.reference;
  const orderId = event.data?.metadata?.order_id;
  // La commande doit correspondre à la fois au numéro et à la référence du paiement créé par Béthanie.
  const order = reference && orderId
    ? (db.prepare('SELECT id FROM orders WHERE id = ? AND payment_reference = ?').get(String(orderId), String(reference)) as Row | undefined)
    : undefined;
  if (!order) {
    res.json({ received: true, ignored: true });
    return;
  }
  try {
    // Le contenu de la notification n'est pas cru sur parole : le statut est redemandé à GeniusPay.
    const result = await reconcileOrderPayment(String(order.id));
    console.log(`[api] Notification GeniusPay ${event.event ?? ''} pour ${String(order.id)} : ${result}.`);
    res.json({ received: true });
  } catch (error) {
    // Traitement impossible (GeniusPay injoignable…) : la notification redevient acceptable pour leur nouvel envoi.
    db.prepare('DELETE FROM payment_webhook_events WHERE event_id = ?').run(eventId);
    throw error;
  }
};

/* ------------------------------------------------------------------ */
/* Commandes non payées depuis 2 heures                                */
/* ------------------------------------------------------------------ */

let lastSweep = 0;
/** À chaque requête de l'API, au plus une fois par minute (fonctionne aussi sur Vercel, sans tâche planifiée). */
export const sweepUnpaidOrders = (_req: unknown, _res: unknown, next: () => void) => {
  if (Date.now() - lastSweep > 60_000) {
    lastSweep = Date.now();
    try {
      cancelUnpaidOrders(); // commandes sans paiement en ligne
      for (const id of expiredOrdersWithPayment()) {
        // Paiement GeniusPay : on demande d'abord à GeniusPay (le client a peut-être payé).
        reconcileOrderPayment(id, { cancelIfPending: true }).catch((error) =>
          console.error(`[controle] Vérification du paiement de ${id} impossible :`, error instanceof Error ? error.message : error)
        );
      }
    } catch (error) {
      console.error('[controle] Annulation des commandes non payées impossible :', error);
    }
  }
  next();
};
