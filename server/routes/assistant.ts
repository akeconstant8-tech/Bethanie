/* Assistant vendeur (IA Claude) — spécification : docs/AGENT_VENDEUR.md (AGV-01 à AGV-07).
 *
 * POST /api/seller/assistant { messages: [{ role, text }], lang } → { reply, proposals }
 *
 * - Claude reçoit les règles de l'assistant et un instantané des données de LA boutique du vendeur connecté
 *   (produits, stocks, commandes de ses articles, indicateurs). Aucune donnée d'une autre boutique, aucune donnée
 *   personnelle d'acheteur (ni nom, ni téléphone, ni adresse).
 * - Claude ne modifie rien : ses outils « proposer_… » ne font que préparer une proposition. Le site l'affiche avec un
 *   bouton « Confirmer » qui appelle les routes existantes (stock, avancement de commande) ou pré-remplit le
 *   formulaire « Ajouter un produit ». Les règles du serveur s'appliquent donc toujours (paiement en attente…).
 * - Clé : ANTHROPIC_API_KEY (serveur uniquement). Sans clé, la route répond 503 et les journaux le disent.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { OrderStatus } from '../../src/types/index.ts';
import { STATUS_LABELS, nextStatus } from '../../src/utils/commerce.ts';
import { currentUser } from '../auth.ts';
import { db, type Row } from '../db.ts';
import { HttpError, forbidden, parse } from '../http.ts';
import { redact } from '../logs.ts';
import { CATEGORY_IDS } from './catalog.ts';

export const assistantRouter = Router();

/** Modèle Claude utilisé (le plus récent de la gamme Opus). */
const MODEL = 'claude-opus-5-5';
/** Même seuil que l'espace vendeur (SellerScreen). */
const LOW_STOCK = 5;
const MAX_TOOL_ROUNDS = 4;

const configured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
console.log(
  configured()
    ? `[api] Assistant vendeur : modèle ${MODEL}.`
    : '[api] Assistant vendeur désactivé : accès à l’API Claude non configuré (voir .env.example, rubrique 4).'
);

let client: Anthropic | undefined;
// Délai court : la réponse doit arriver avant la limite des fonctions Vercel (60 s, voir build-vercel.mjs).
const anthropic = () => (client ??= new Anthropic({ timeout: 50_000, maxRetries: 1 }));

// Chaque question a un coût : 40 questions par quart d'heure et par vendeur.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => currentUser(req).id,
  message: { error: 'Vous avez posé beaucoup de questions. Réessayez dans quelques minutes.' },
});

const ChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(30)
    .refine((list) => list[list.length - 1].role === 'user', 'Le dernier message doit venir du vendeur.'),
  lang: z.enum(['fr', 'en']).default('fr'),
});

/* ------------------------------------------------------------------ */
/* Données de la boutique transmises à Claude                          */
/* ------------------------------------------------------------------ */

const shopOf = (userId: string) => db.get('SELECT id, name, location, category FROM shops WHERE owner_id = ?', userId);

const productsOf = (shopId: string) =>
  db.all('SELECT id, title, category, price, stock FROM products WHERE shop_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', shopId);

const ordersOf = async (shopId: string) => {
  const [orders, items] = await Promise.all([
    db.all(
      `SELECT id, status, payment_status, created_at FROM orders
       WHERE id IN (SELECT order_id FROM order_items WHERE shop_id = ?) ORDER BY created_at DESC LIMIT 60`,
      shopId
    ),
    db.all('SELECT order_id, quantity, unit_price, product_snapshot FROM order_items WHERE shop_id = ?', shopId),
  ]);
  return orders.map((order) => {
    const lines = items.filter((item) => item.order_id === order.id);
    const status = order.status as OrderStatus;
    const next = nextStatus(status);
    const blocked =
      status === 'annulée' ? 'annulée (paiement non reçu)' : order.payment_status === 'en_attente' ? 'paiement en attente' : next ? null : 'déjà livrée';
    return {
      id: String(order.id),
      date: String(order.created_at).slice(0, 10),
      statut: STATUS_LABELS[status] ?? status,
      paiement: String(order.payment_status),
      articles: lines.map((line) => ({
        titre: String((JSON.parse(String(line.product_snapshot)) as { title?: string }).title ?? ''),
        quantite: Number(line.quantity),
      })),
      montantArticlesFcfa: lines.reduce((sum, line) => sum + Number(line.unit_price) * Number(line.quantity), 0),
      etapeSuivantePossible: blocked ? null : STATUS_LABELS[next!],
      bloquee: blocked,
      _status: status,
      _payment: String(order.payment_status),
    };
  });
};

const snapshot = async (shop: Row) => {
  const [products, orders] = await Promise.all([productsOf(String(shop.id)), ordersOf(String(shop.id))]);
  const sold = orders.flatMap((o) => o.articles).reduce((sum, a) => sum + a.quantite, 0);
  return {
    boutique: { nom: shop.name, ville: shop.location, categorie: shop.category },
    seuilStockFaible: LOW_STOCK,
    indicateurs: {
      produitsEnLigne: products.length,
      produitsStockFaible: products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= LOW_STOCK).length,
      produitsEpuises: products.filter((p) => Number(p.stock) === 0).length,
      commandes: orders.length,
      commandesATraiter: orders.filter((o) => o._status === 'confirmée' || o._status === 'préparation').length,
      unitesVendues: sold,
      montantDesArticlesVendusFcfa: orders.reduce((sum, o) => sum + o.montantArticlesFcfa, 0),
      remarque: 'Montant des articles commandés, avant commission : ce ne sont pas des reversements effectués. Aucun historique mensuel n’est enregistré.',
    },
    produits: products.map((p) => ({
      id: p.id,
      titre: p.title,
      categorie: p.category,
      prixFcfa: Number(p.price),
      stock: Number(p.stock),
      etat: Number(p.stock) === 0 ? 'épuisé' : Number(p.stock) <= LOW_STOCK ? 'stock faible' : 'en stock',
    })),
    commandes: orders.map(({ _status, _payment, ...rest }) => rest),
  };
};

/* ------------------------------------------------------------------ */
/* Consignes et outils                                                 */
/* ------------------------------------------------------------------ */

const RULES = `Tu es l’« Assistant vendeur » de Béthanie, une place de marché africaine (Côte d’Ivoire et Sénégal, prix en FCFA).
Tu aides UN vendeur à gérer SA boutique : rédiger des fiches produit, suivre son stock, traiter ses commandes, comprendre
ses indicateurs et utiliser l’espace vendeur. Les données de sa boutique te sont fournies plus bas ; ce sont les seules
que tu connais.

Règles :
- Le vendeur décide. Tu ne modifies rien toi-même : pour une fiche, un stock ou une commande, utilise l’outil
  « proposer_… » correspondant. Le site affiche alors ta proposition avec un bouton « Confirmer » ; rien ne change
  sans ce clic. Dis-le simplement au vendeur.
- Fiche produit : n’utilise que les faits donnés par le vendeur. N’invente jamais matière, origine, certification,
  bienfait pour la santé, dimensions, prix ou stock. S’il manque le nom, la catégorie ou de quoi décrire le produit,
  pose une ou deux questions courtes avant de proposer. Les photos et la publication restent faites par le vendeur.
- Stock : appuie-toi sur les quantités fournies et sur le seuil de stock faible indiqué. Ne recommande pas de quantité
  à commander. Un produit épuisé ne peut pas être vendu tant que son stock n’est pas remis à jour.
- Commandes : cycle confirmée → préparation → expédiée → en livraison → livrée. Une commande dont le paiement est en
  attente est bloquée : explique-le et ne propose pas de la faire avancer. Ne promets pas de date de livraison,
  n’annule rien, ne rembourse rien, ne contacte personne.
- Chiffres : n’invente ni tendance, ni pourcentage, ni prévision ; il n’existe pas d’historique mensuel. Le montant
  des articles vendus n’est pas un reversement.
- Ne parle jamais d’une autre boutique. Si on te le demande, dis que tu n’as accès qu’à celle du vendeur.
- Fonctions de l’espace vendeur : tableau de bord, liste des produits (stock modifiable, suppression), « Ajouter un
  produit » (1 à 3 photos), commandes reçues (bouton pour passer à l’étape suivante), statistiques. Si une fonction
  ou une règle demandée n’existe pas (retours, promotions, reversements…), dis-le et oriente vers le support
  (e-mail indiqué dans le Profil) sans rien inventer.
- Style : phrases courtes, ton chaleureux et professionnel, listes à puces quand c’est utile, pas de tableau.`;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'proposer_fiche_produit',
    description:
      'Présente au vendeur un brouillon de fiche produit, qu’il pourra reporter dans le formulaire « Ajouter un produit », ' +
      'compléter (photos) et publier lui-même. Uniquement avec des faits donnés par le vendeur.',
    input_schema: {
      type: 'object',
      properties: {
        titre: { type: 'string', description: 'Nom du produit, 3 à 120 caractères.' },
        categorie: { type: 'string', enum: CATEGORY_IDS },
        description: { type: 'string', description: 'Description de 10 à 1500 caractères, sans fait inventé.' },
        prix_fcfa: { type: 'integer', description: 'Prix en FCFA, seulement si le vendeur l’a donné.' },
        stock: { type: 'integer', description: 'Quantité disponible, seulement si le vendeur l’a donnée.' },
      },
      required: ['titre', 'categorie', 'description'],
    },
  },
  {
    name: 'proposer_stock',
    description: 'Propose de remplacer le stock d’un produit de la boutique par une nouvelle quantité. Le vendeur confirme ou non.',
    input_schema: {
      type: 'object',
      properties: {
        produit_id: { type: 'string', description: 'Identifiant « id » du produit, tel que fourni dans les données.' },
        nouveau_stock: { type: 'integer', minimum: 0, description: 'Quantité demandée par le vendeur.' },
      },
      required: ['produit_id', 'nouveau_stock'],
    },
  },
  {
    name: 'proposer_avancement_commande',
    description:
      'Propose de faire passer une commande de la boutique à l’étape suivante. Ne pas utiliser si la commande est bloquée.',
    input_schema: {
      type: 'object',
      properties: { commande_id: { type: 'string', description: 'Numéro de la commande, ex. BTH-123456.' } },
      required: ['commande_id'],
    },
  },
];

export type AssistantProposal =
  | { kind: 'product'; id: string; title: string; category: string; description: string; price?: number; stock?: number }
  | { kind: 'stock'; id: string; productId: string; title: string; from: number; to: number }
  | { kind: 'order'; id: string; orderId: string; from: OrderStatus; to: OrderStatus };

const DraftInput = z.object({
  titre: z.string().trim().min(3).max(120),
  categorie: z.enum(CATEGORY_IDS as [string, ...string[]]),
  description: z.string().trim().min(10).max(3000),
  prix_fcfa: z.number().int().min(100).max(50_000_000).optional(),
  stock: z.number().int().min(0).max(100_000).optional(),
});
const StockInput = z.object({ produit_id: z.string().min(1), nouveau_stock: z.number().int().min(0).max(100_000) });
const OrderInput = z.object({ commande_id: z.string().trim().min(1) });

/** Exécute un outil : vérifie la demande et prépare une proposition, sans rien modifier. */
const runTool = async (
  shopId: string,
  block: Anthropic.Beta.BetaToolUseBlock
): Promise<{ result: string; isError?: boolean; proposal?: AssistantProposal }> => {
  if (block.name === 'proposer_fiche_produit') {
    const input = DraftInput.safeParse(block.input);
    if (!input.success) return { result: `Brouillon invalide : ${input.error.issues[0].message}`, isError: true };
    const d = input.data;
    return {
      result: 'Brouillon affiché au vendeur avec le bouton « Remplir le formulaire ». Rien n’est publié.',
      proposal: { kind: 'product', id: block.id, title: d.titre, category: d.categorie, description: d.description, price: d.prix_fcfa, stock: d.stock },
    };
  }
  if (block.name === 'proposer_stock') {
    const input = StockInput.safeParse(block.input);
    if (!input.success) return { result: 'Demande de stock invalide.', isError: true };
    const product = await db.get('SELECT id, title, stock FROM products WHERE id = ? AND shop_id = ? AND deleted_at IS NULL', input.data.produit_id, shopId);
    if (!product) return { result: 'Ce produit n’appartient pas à la boutique du vendeur.', isError: true };
    if (Number(product.stock) === input.data.nouveau_stock) return { result: `Le stock est déjà de ${product.stock}.`, isError: true };
    return {
      result: 'Proposition affichée au vendeur avec un bouton « Confirmer ». Le stock ne change pas tant qu’il ne confirme pas.',
      proposal: { kind: 'stock', id: block.id, productId: String(product.id), title: String(product.title), from: Number(product.stock), to: input.data.nouveau_stock },
    };
  }
  if (block.name === 'proposer_avancement_commande') {
    const input = OrderInput.safeParse(block.input);
    if (!input.success) return { result: 'Numéro de commande invalide.', isError: true };
    const order = await db.get(
      'SELECT id, status, payment_status FROM orders WHERE id = ? AND id IN (SELECT order_id FROM order_items WHERE shop_id = ?)',
      input.data.commande_id.replace(/^#/, ''),
      shopId
    );
    if (!order) return { result: 'Cette commande ne contient aucun article de la boutique.', isError: true };
    if (order.payment_status === 'en_attente') {
      return { result: 'Bloqué : le paiement est en attente, la commande ne peut pas avancer (règle de Béthanie). Aucune proposition.', isError: true };
    }
    const next = nextStatus(order.status as OrderStatus);
    if (!next) return { result: 'Cette commande est déjà livrée.', isError: true };
    return {
      result: 'Proposition affichée au vendeur avec un bouton « Confirmer ». Le statut ne change pas tant qu’il ne confirme pas.',
      proposal: { kind: 'order', id: block.id, orderId: String(order.id), from: order.status as OrderStatus, to: next },
    };
  }
  return { result: `Outil inconnu : ${block.name}.`, isError: true };
};

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

assistantRouter.post('/', limiter, async (req, res) => {
  const user = currentUser(req);
  const shop = await shopOf(user.id);
  if (!shop) throw forbidden('Ouvrez d’abord votre boutique dans l’espace vendeur.');
  if (!configured()) {
    console.error('[api] Assistant vendeur : accès à l’API Claude non configuré (voir .env.example, rubrique 4).');
    throw new HttpError(503, 'L’assistant vendeur n’est pas encore activé sur ce serveur.');
  }
  const { messages: history, lang } = parse(ChatSchema, req.body);

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    // Consignes fixes : mises en cache d'une question à l'autre.
    { type: 'text', text: RULES, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text:
        `Langue de réponse : ${lang === 'en' ? 'anglais (English)' : 'français'}.\n` +
        `Date du jour : ${new Date().toISOString().slice(0, 10)}.\n` +
        `Données de la boutique du vendeur (JSON) :\n${JSON.stringify(await snapshot(shop))}`,
    },
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.text }));
  const texts: string[] = [];
  const proposals: AssistantProposal[] = [];
  const started = Date.now();
  let refused = false;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        // Si Claude Opus 5.5 décline, l'API relance la même demande sur le modèle de repli recommandé.
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        tools: TOOLS,
        messages,
      });
      console.log(
        `[api] Assistant vendeur : ${response.usage.input_tokens} jetons lus (+${response.usage.cache_read_input_tokens ?? 0} en cache), ` +
          `${response.usage.output_tokens} écrits.`
      );
      if (response.stop_reason === 'refusal') {
        refused = true;
        break;
      }
      for (const block of response.content) if (block.type === 'text' && block.text.trim()) texts.push(block.text.trim());
      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'pause_turn') continue;
      if (response.stop_reason !== 'tool_use') break;
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')) {
        const outcome = await runTool(String(shop.id), block);
        if (outcome.proposal) proposals.push(outcome.proposal);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: outcome.result, is_error: outcome.isError });
      }
      messages.push({ role: 'user', content: results });
      if (Date.now() - started > 40_000) break;
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error('[api] Assistant vendeur : accès refusé par l’API Claude (vérifier la configuration, voir .env.example).');
      throw new HttpError(503, 'L’assistant vendeur n’est pas encore activé sur ce serveur.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, 'L’assistant est très sollicité. Réessayez dans une minute.');
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[api] Assistant vendeur : erreur de l’API Claude (${error.status ?? 'réseau'}) : ${redact(error.message.slice(0, 200))}`);
      throw new HttpError(502, 'L’assistant ne répond pas pour le moment. Réessayez dans un instant.');
    }
    throw error;
  }

  const fallbackReply =
    lang === 'en'
      ? refused
        ? 'I can’t help with that request. Ask me about your listings, stock or orders.'
        : 'Here is my proposal.'
      : refused
        ? 'Je ne peux pas répondre à cette demande. Posez-moi une question sur vos fiches, votre stock ou vos commandes.'
        : 'Voici ma proposition.';
  res.json({ reply: texts.join('\n\n') || fallbackReply, proposals });
});
