import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { OrderStatus } from '../../src/types/index.ts';
import {
  CITIES,
  DRIVERS,
  PAYMENT_OPTIONS,
  STATUS_LABELS,
  findPromo,
  formatTime,
  getDeliveryFee,
  nextStatus,
} from '../../src/utils/commerce.ts';
import { createGuestAccount, currentUser } from '../auth.ts';
import { config } from '../config.ts';
import { db } from '../db.ts';
import { badRequest, conflict, forbidden, notFound, parse } from '../http.ts';
import { isGeniusPay, isSimulation, publicUrl, reconcileOrderPayment, startPayment } from '../payments.ts';
import { getProduct, loadOrders } from '../serializers.ts';
import { acquireCommission, cancelOrder, guarded, settleOrder } from '../transactions.ts';

export const ordersRouter = Router();

const phoneDigits = (v: string) => v.replace(/\D/g, '').length;

const CheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
        color: z.string().max(80).optional(),
        size: z.string().max(40).optional(),
      })
    )
    .min(1, 'Votre panier est vide.')
    .max(50, 'Trop d’articles dans une seule commande.'),
  deliveryMethod: z.enum(['express', 'standard', 'relais']),
  city: z.enum(CITIES),
  shippingAddress: z.string().trim().min(8, 'Indiquez une adresse de livraison complète.').max(300),
  contactPhone: z.string().trim().max(30).refine((v) => phoneDigits(v) >= 8, 'Numéro de contact invalide.'),
  paymentMethod: z.string().refine((v) => PAYMENT_OPTIONS.some((o) => o.id === v), 'Moyen de paiement inconnu.'),
  paymentPhone: z.string().trim().max(30).optional(),
  promoCode: z.string().trim().max(30).optional(),
  // Achat sans compte uniquement : nom complet du client, demandé à la livraison.
  customerName: z.string().trim().max(80).optional(),
});

const newOrderId = async () => {
  for (;;) {
    const id = `BTH-${crypto.randomInt(100000, 1000000)}`;
    if (!(await db.get('SELECT 1 FROM orders WHERE id = ?', id))) return id;
  }
};

const getOrderRow = async (id: string) => {
  const row = await db.get('SELECT * FROM orders WHERE id = ?', id);
  if (!row) throw notFound('Commande introuvable.');
  return row;
};

const shopOf = (userId: string) => db.get('SELECT id FROM shops WHERE owner_id = ?', userId);

const orderHasShop = async (orderId: string, shopId: string) =>
  Boolean(await db.get('SELECT 1 FROM order_items WHERE order_id = ? AND shop_id = ?', orderId, shopId));

/* ---------- Client ---------- */

ordersRouter.get('/orders', async (req, res) => {
  const user = currentUser(req);
  const rows = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', user.id);
  res.json({ orders: await loadOrders(rows) });
});

ordersRouter.get('/orders/:id', async (req, res) => {
  const user = currentUser(req);
  const row = await getOrderRow(String(req.params.id));
  if (row.user_id !== user.id && user.role !== 'admin') throw notFound('Commande introuvable.');
  res.json({ order: (await loadOrders([row]))[0] });
});

// Au plus 10 commandes par heure, par compte quand il y en a un, sinon par adresse IP (achat invité).
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonyme',
  message: { error: 'Trop de commandes en peu de temps. Réessayez dans une heure.' },
});

ordersRouter.post('/orders', orderLimiter, async (req, res) => {
  const data = parse(CheckoutSchema, req.body);
  const payment = PAYMENT_OPTIONS.find((o) => o.id === data.paymentMethod)!;

  // Achat sans compte : le nom est validé tout de suite, mais le profil n'est créé qu'une fois la
  // commande elle-même validée (stock, prix…), pour ne pas laisser de profil invité orphelin.
  const guestName = req.user ? undefined : data.customerName?.trim();
  if (!req.user && (!guestName || guestName.length < 2)) throw badRequest('Indiquez votre nom complet.');

  if (data.deliveryMethod === 'express' && data.city !== 'Abidjan') {
    throw badRequest('La livraison express est réservée à Abidjan.');
  }
  if (payment.needsPhone && phoneDigits(data.paymentPhone ?? '') < 8) {
    throw badRequest(`Indiquez le numéro ${payment.label} à débiter.`);
  }

  // Les prix viennent toujours de la base, jamais du navigateur.
  const products = await Promise.all(data.items.map((item) => getProduct(item.productId)));
  const lines = data.items.map((item, index) => {
    const product = products[index];
    if (!product) throw conflict('Un produit de votre panier n’est plus disponible. Mettez votre panier à jour.');
    const sizes = product.availableSizes ?? [];
    if (sizes.length > 1 && !item.size) throw badRequest(`Choisissez une taille pour « ${product.title} ».`);
    if (item.size && !sizes.includes(item.size)) throw badRequest(`Taille indisponible pour « ${product.title} ».`);
    if (item.color && !(product.availableColors ?? []).some((c) => c.name === item.color)) {
      throw badRequest(`Couleur indisponible pour « ${product.title} ».`);
    }
    return { ...item, size: item.size ?? (sizes.length === 1 ? sizes[0] : undefined), product };
  });

  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.product.id, (quantities.get(line.product.id) ?? 0) + line.quantity);
  for (const line of lines) {
    const wanted = quantities.get(line.product.id)!;
    if (wanted > line.product.stock) {
      throw conflict(
        line.product.stock === 0
          ? `« ${line.product.title} » est en rupture de stock.`
          : `Stock insuffisant pour « ${line.product.title} » : ${line.product.stock} disponible(s).`
      );
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const deliveryFee = getDeliveryFee(data.deliveryMethod, data.city, subtotal);
  let discount = 0;
  let promoCode: string | null = null;
  if (data.promoCode) {
    const promo = findPromo(data.promoCode);
    if (!promo) throw badRequest('Ce code promo n’est pas valide.');
    discount = promo.compute(subtotal, deliveryFee);
    promoCode = promo.code;
  }
  const total = subtotal + deliveryFee - discount;
  const cashOnDelivery = data.paymentMethod === 'Paiement à la livraison';
  const id = await newOrderId();
  // La commande est désormais certaine d'être créée : on peut ouvrir la session invitée sans risque
  // de profil orphelin. Jamais de connexion Google demandée ici.
  const user = req.user ?? (await createGuestAccount(res, guestName!, data.contactPhone));

  await guarded(async () => {
    await db.run(
      `INSERT INTO orders (id, user_id, status, payment_status, payment_method, phone_number, contact_phone, delivery_method,
         city, shipping_address, subtotal, delivery_fee, discount, total, promo_code, customer_name)
       VALUES (?, ?, 'confirmée', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, user.id, cashOnDelivery ? 'à_la_livraison' : 'en_attente', data.paymentMethod,
      payment.needsPhone ? data.paymentPhone! : data.contactPhone, data.contactPhone, data.deliveryMethod, data.city,
      data.shippingAddress, subtotal, deliveryFee, discount, total, promoCode, user.name
    );
    for (const line of lines) {
      await db.run(
        `INSERT INTO order_items (order_id, product_id, shop_id, quantity, unit_price, color, size, product_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, line.product.id, line.product.vendor.id, line.quantity, line.product.price,
        line.color ?? null, line.size ?? null, JSON.stringify(line.product)
      );
      // Réservation du stock ; la condition protège contre deux achats simultanés du dernier article.
      const { changes } = await db.run('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', line.quantity, line.product.id, line.quantity);
      if (changes !== 1) throw conflict(`« ${line.product.title} » vient d’être épuisé.`);
    }
    await db.run(`INSERT INTO order_events (order_id, status) VALUES (?, 'confirmée')`, id);
    // Contrôle des transactions : commission de 5 % par boutique, vérification des montants, journal scellé.
    await settleOrder(id);
  });

  // Paiement en ligne : création du paiement GeniusPay ; en cas d'échec, la commande est annulée (stock rendu).
  if (!cashOnDelivery && isGeniusPay()) {
    try {
      const started = await startPayment({
        orderId: id,
        amount: total,
        method: data.paymentMethod,
        customer: {
          name: user.name,
          email: user.email,
          phone: payment.needsPhone ? data.paymentPhone : data.contactPhone,
          country: data.city === 'Dakar' ? 'SN' : 'CI',
        },
        returnUrl: `${publicUrl(req)}/#/suivi/${encodeURIComponent(id)}`,
      });
      await db.run('UPDATE orders SET payment_reference = ?, payment_url = ? WHERE id = ?', started.reference, started.url, id);
    } catch (error) {
      await cancelOrder(id, 'paiement en ligne impossible à démarrer');
      throw error;
    }
  }

  res.status(201).json({ order: (await loadOrders([await getOrderRow(id)]))[0] });
});

/** Paiement simulé : remplacé par le webhook de l'agrégateur en production (voir payments.ts). */
ordersRouter.post('/orders/:id/pay', async (req, res) => {
  const user = currentUser(req);
  if (!isSimulation()) throw notFound();
  const row = await getOrderRow(String(req.params.id));
  if (row.user_id !== user.id) throw notFound('Commande introuvable.');
  if (row.payment_status === 'en_attente') {
    await guarded(async () => {
      await db.run(`UPDATE orders SET payment_status = 'payé' WHERE id = ?`, String(row.id));
      await acquireCommission(String(row.id), 'en ligne');
    });
  }
  res.json({ order: (await loadOrders([await getOrderRow(String(row.id))]))[0] });
});

// Chaque vérification interroge GeniusPay : le suivi en fait au plus 9 par commande ; 30 par minute et par compte
// laissent de la marge sans permettre de saturer GeniusPay (qui pourrait alors bloquer Béthanie).
const paymentCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => currentUser(req).id,
  message: { error: 'Trop de vérifications de paiement. Réessayez dans une minute.' },
});

/** Retour de la page de paiement : le serveur demande le statut à GeniusPay et met la commande à jour. */
ordersRouter.post('/orders/:id/payment/check', paymentCheckLimiter, async (req, res) => {
  const user = currentUser(req);
  const row = await getOrderRow(String(req.params.id));
  if (row.user_id !== user.id) throw notFound('Commande introuvable.');
  if (row.payment_reference && row.payment_status === 'en_attente') await reconcileOrderPayment(String(row.id));
  res.json({ order: (await loadOrders([await getOrderRow(String(row.id))]))[0] });
});

/**
 * Fait avancer une commande d'une étape. Autorisé pour : un vendeur dont un produit figure
 * dans la commande, un administrateur, ou le client lui-même en mode démo.
 */
ordersRouter.post('/orders/:id/advance', async (req, res) => {
  const user = currentUser(req);
  const row = await getOrderRow(String(req.params.id));
  const shop = await shopOf(user.id);
  const isSeller = shop ? await orderHasShop(String(row.id), String(shop.id)) : false;
  const isOwner = row.user_id === user.id;
  if (!isSeller && user.role !== 'admin' && !(config.demoMode && isOwner)) {
    throw isOwner ? forbidden('Seul le vendeur peut faire avancer la commande.') : notFound('Commande introuvable.');
  }
  if (row.status === 'annulée') throw conflict('Cette commande a été annulée.');
  if (row.payment_status === 'en_attente') {
    throw conflict('Paiement en attente : la commande ne peut pas encore être préparée.');
  }
  const target = nextStatus(row.status as OrderStatus);
  if (!target) throw conflict('Cette commande est déjà livrée.');

  await guarded(async () => {
    await db.run('UPDATE orders SET status = ? WHERE id = ?', target, String(row.id));
    await db.run('INSERT INTO order_events (order_id, status) VALUES (?, ?)', String(row.id), target);
    if (target === 'en_livraison' && !row.driver) {
      const driver = DRIVERS[crypto.randomInt(DRIVERS.length)];
      const eta = `Aujourd’hui avant ${formatTime(new Date(Date.now() + 90 * 60 * 1000))}`;
      await db.run('UPDATE orders SET driver = ? WHERE id = ?', JSON.stringify({ ...driver, eta }), String(row.id));
    }
    if (target === 'livrée' && row.payment_status === 'à_la_livraison') {
      await db.run(`UPDATE orders SET payment_status = 'payé' WHERE id = ?`, String(row.id));
      await acquireCommission(String(row.id), 'à la livraison');
    }
  });

  const updated = await getOrderRow(String(row.id));
  const order = isOwner || user.role === 'admin' ? (await loadOrders([updated]))[0] : (await loadOrders([updated], String(shop!.id)))[0];
  res.json({ order, message: `Commande ${row.id} : ${STATUS_LABELS[target]}` });
});

/* ---------- Vendeur ---------- */

ordersRouter.get('/seller/orders', async (req, res) => {
  const user = currentUser(req);
  const shop = await shopOf(user.id);
  if (!shop) throw forbidden('Ouvrez d’abord votre boutique dans l’espace vendeur.');
  const rows = await db.all(
    `SELECT * FROM orders WHERE id IN (SELECT order_id FROM order_items WHERE shop_id = ?)
     ORDER BY created_at DESC`,
    String(shop.id)
  );
  res.json({ orders: await loadOrders(rows, String(shop.id)) });
});
