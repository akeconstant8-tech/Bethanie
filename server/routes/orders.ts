import crypto from 'node:crypto';
import { Router } from 'express';
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
import { currentUser } from '../auth.ts';
import { config } from '../config.ts';
import { db, transaction, type Row } from '../db.ts';
import { badRequest, conflict, forbidden, notFound, parse } from '../http.ts';
import { isSimulation, startPayment } from '../payments.ts';
import { getProduct, loadOrders } from '../serializers.ts';

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
});

const newOrderId = () => {
  for (;;) {
    const id = `BTH-${crypto.randomInt(100000, 1000000)}`;
    if (!db.prepare('SELECT 1 FROM orders WHERE id = ?').get(id)) return id;
  }
};

const getOrderRow = (id: string) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Row | undefined;
  if (!row) throw notFound('Commande introuvable.');
  return row;
};

const shopOf = (userId: string) =>
  db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(userId) as Row | undefined;

const orderHasShop = (orderId: string, shopId: string) =>
  Boolean(db.prepare('SELECT 1 FROM order_items WHERE order_id = ? AND shop_id = ?').get(orderId, shopId));

/* ---------- Client ---------- */

ordersRouter.get('/orders', (req, res) => {
  const user = currentUser(req);
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(user.id) as Row[];
  res.json({ orders: loadOrders(rows) });
});

ordersRouter.get('/orders/:id', (req, res) => {
  const user = currentUser(req);
  const row = getOrderRow(req.params.id);
  if (row.user_id !== user.id && user.role !== 'admin') throw notFound('Commande introuvable.');
  res.json({ order: loadOrders([row])[0] });
});

ordersRouter.post('/orders', (req, res) => {
  const user = currentUser(req);
  const data = parse(CheckoutSchema, req.body);
  const payment = PAYMENT_OPTIONS.find((o) => o.id === data.paymentMethod)!;

  if (data.deliveryMethod === 'express' && data.city !== 'Abidjan') {
    throw badRequest('La livraison express est réservée à Abidjan.');
  }
  if (payment.needsPhone && phoneDigits(data.paymentPhone ?? '') < 8) {
    throw badRequest(`Indiquez le numéro ${payment.label} à débiter.`);
  }

  // Les prix viennent toujours de la base, jamais du navigateur.
  const lines = data.items.map((item) => {
    const product = getProduct(item.productId);
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
  const id = newOrderId();
  if (!cashOnDelivery) startPayment(id, total, data.paymentMethod);

  transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, user_id, status, payment_status, payment_method, phone_number, contact_phone, delivery_method,
         city, shipping_address, subtotal, delivery_fee, discount, total, promo_code)
       VALUES (?, ?, 'confirmée', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, user.id, cashOnDelivery ? 'à_la_livraison' : 'en_attente', data.paymentMethod,
      payment.needsPhone ? data.paymentPhone! : data.contactPhone, data.contactPhone, data.deliveryMethod, data.city,
      data.shippingAddress, subtotal, deliveryFee, discount, total, promoCode
    );
    for (const line of lines) {
      db.prepare(
        `INSERT INTO order_items (order_id, product_id, shop_id, quantity, unit_price, color, size, product_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, line.product.id, line.product.vendor.id, line.quantity, line.product.price,
        line.color ?? null, line.size ?? null, JSON.stringify(line.product)
      );
      // Réservation du stock ; la condition protège contre deux achats simultanés du dernier article.
      const { changes } = db
        .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .run(line.quantity, line.product.id, line.quantity);
      if (changes !== 1) throw conflict(`« ${line.product.title} » vient d’être épuisé.`);
    }
    db.prepare(`INSERT INTO order_events (order_id, status) VALUES (?, 'confirmée')`).run(id);
  });

  res.status(201).json({ order: loadOrders([getOrderRow(id)])[0] });
});

/** Paiement simulé : remplacé par le webhook de l'agrégateur en production (voir payments.ts). */
ordersRouter.post('/orders/:id/pay', (req, res) => {
  const user = currentUser(req);
  if (!isSimulation()) throw notFound();
  const row = getOrderRow(req.params.id);
  if (row.user_id !== user.id) throw notFound('Commande introuvable.');
  if (row.payment_status === 'en_attente') {
    db.prepare(`UPDATE orders SET payment_status = 'payé' WHERE id = ?`).run(String(row.id));
  }
  res.json({ order: loadOrders([getOrderRow(String(row.id))])[0] });
});

/**
 * Fait avancer une commande d'une étape. Autorisé pour : un vendeur dont un produit figure
 * dans la commande, un administrateur, ou le client lui-même en mode démo.
 */
ordersRouter.post('/orders/:id/advance', (req, res) => {
  const user = currentUser(req);
  const row = getOrderRow(req.params.id);
  const shop = shopOf(user.id);
  const isSeller = shop ? orderHasShop(String(row.id), String(shop.id)) : false;
  const isOwner = row.user_id === user.id;
  if (!isSeller && user.role !== 'admin' && !(config.demoMode && isOwner)) {
    throw isOwner ? forbidden('Seul le vendeur peut faire avancer la commande.') : notFound('Commande introuvable.');
  }
  if (row.payment_status === 'en_attente') {
    throw conflict('Paiement en attente : la commande ne peut pas encore être préparée.');
  }
  const target = nextStatus(row.status as OrderStatus);
  if (!target) throw conflict('Cette commande est déjà livrée.');

  transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(target, String(row.id));
    db.prepare('INSERT INTO order_events (order_id, status) VALUES (?, ?)').run(String(row.id), target);
    if (target === 'en_livraison' && !row.driver) {
      const driver = DRIVERS[crypto.randomInt(DRIVERS.length)];
      const eta = `Aujourd’hui avant ${formatTime(new Date(Date.now() + 90 * 60 * 1000))}`;
      db.prepare('UPDATE orders SET driver = ? WHERE id = ?').run(JSON.stringify({ ...driver, eta }), String(row.id));
    }
    if (target === 'livrée' && row.payment_status === 'à_la_livraison') {
      db.prepare(`UPDATE orders SET payment_status = 'payé' WHERE id = ?`).run(String(row.id));
    }
  });

  const updated = getOrderRow(String(row.id));
  const order = isOwner || user.role === 'admin' ? loadOrders([updated])[0] : loadOrders([updated], String(shop!.id))[0];
  res.json({ order, message: `Commande ${row.id} : ${STATUS_LABELS[target]}` });
});

/* ---------- Vendeur ---------- */

ordersRouter.get('/seller/orders', (req, res) => {
  const user = currentUser(req);
  const shop = shopOf(user.id);
  if (!shop) throw forbidden('Ouvrez d’abord votre boutique dans l’espace vendeur.');
  const rows = db
    .prepare(
      `SELECT * FROM orders WHERE id IN (SELECT order_id FROM order_items WHERE shop_id = ?)
       ORDER BY created_at DESC`
    )
    .all(String(shop.id)) as Row[];
  res.json({ orders: loadOrders(rows, String(shop.id)) });
});
