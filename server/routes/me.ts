import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { PAYMENT_OPTIONS } from '../../src/utils/commerce.ts';
import { currentUser } from '../auth.ts';
import { db, transaction, type Row, type Statement } from '../db.ts';
import { badRequest, notFound, parse } from '../http.ts';
import { loadMe } from '../serializers.ts';

/** Profil, adresses, moyens de paiement et favoris de l'utilisateur connecté. */
export const meRouter = Router();

const ProfileSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez votre nom complet.').max(80),
  // Lue seulement pour refuser un changement : l'adresse vient du compte Google (vérifiée), jamais d'une saisie.
  email: z.string().trim().toLowerCase().max(120).optional(),
  phone: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 8, 'Numéro de téléphone invalide.'),
  location: z.string().trim().max(120),
});

meRouter.patch('/', async (req, res) => {
  const user = currentUser(req);
  const data = parse(ProfileSchema, req.body);
  // Une adresse saisie librement permettrait de préparer un compte au nom de quelqu'un d'autre : à sa première
  // connexion Google, cette personne serait rattachée à ce compte (voir linkGoogleAccount).
  if (data.email && data.email !== user.email.toLowerCase()) {
    throw badRequest('L’adresse e-mail est celle de votre compte Google : elle ne peut pas être modifiée ici.');
  }
  await db.run('UPDATE users SET name = ?, phone = ?, location = ? WHERE id = ?', data.name, data.phone, data.location, user.id);
  res.json({ user: await loadMe(user.id) });
});

/* ---------- Adresses & moyens de paiement (même logique « par défaut ») ---------- */

type OwnedTable = 'addresses' | 'payment_methods';

const ensureOwned = async (table: OwnedTable, id: string, userId: string) => {
  const row = await db.get(`SELECT is_default FROM ${table} WHERE id = ? AND user_id = ?`, id, userId);
  if (!row) throw notFound();
  return row;
};

const setDefault = (table: OwnedTable, id: string, userId: string) =>
  transaction(async () => {
    await db.run(`UPDATE ${table} SET is_default = 0 WHERE user_id = ?`, userId);
    await db.run(`UPDATE ${table} SET is_default = 1 WHERE id = ? AND user_id = ?`, id, userId);
  });

const removeOwned = (table: OwnedTable, id: string, userId: string) =>
  transaction(async () => {
    const row = await ensureOwned(table, id, userId);
    await db.run(`DELETE FROM ${table} WHERE id = ?`, id);
    if (row.is_default) {
      // La plus ancienne entrée restante devient celle par défaut.
      await db.run(
        `UPDATE ${table} SET is_default = 1 WHERE id = (SELECT id FROM ${table} WHERE user_id = ? ORDER BY created_at LIMIT 1)`,
        userId
      );
    }
  });

const hasAny = async (table: OwnedTable, userId: string) => Boolean(await db.get(`SELECT 1 FROM ${table} WHERE user_id = ?`, userId));

const AddressSchema = z.object({
  title: z.string().trim().max(40).default('Adresse'),
  address: z.string().trim().min(8, 'Indiquez une adresse complète.').max(300, 'Adresse trop longue.'),
});

meRouter.post('/addresses', async (req, res) => {
  const user = currentUser(req);
  const data = parse(AddressSchema, req.body);
  const count = ((await db.get('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', user.id)) as Row).n;
  if (Number(count) >= 20) throw badRequest('Vous avez atteint le nombre maximum d’adresses.');
  await db.run(
    'INSERT INTO addresses (id, user_id, title, address, is_default) VALUES (?, ?, ?, ?, ?)',
    crypto.randomUUID(), user.id, data.title || 'Adresse', data.address, (await hasAny('addresses', user.id)) ? 0 : 1
  );
  res.status(201).json({ user: await loadMe(user.id) });
});

meRouter.post('/addresses/:id/default', async (req, res) => {
  const user = currentUser(req);
  await ensureOwned('addresses', String(req.params.id), user.id);
  await setDefault('addresses', String(req.params.id), user.id);
  res.json({ user: await loadMe(user.id) });
});

meRouter.delete('/addresses/:id', async (req, res) => {
  const user = currentUser(req);
  await removeOwned('addresses', String(req.params.id), user.id);
  res.json({ user: await loadMe(user.id) });
});

const SAVABLE_PAYMENTS = PAYMENT_OPTIONS.filter((o) => o.id !== 'Paiement à la livraison').map((o) => o.id);

const PaymentSchema = z.object({
  type: z.string().refine((v) => SAVABLE_PAYMENTS.includes(v), 'Moyen de paiement inconnu.'),
  number: z.string().trim().min(4, 'Numéro invalide.').max(30),
});

meRouter.post('/payment-methods', async (req, res) => {
  const user = currentUser(req);
  const data = parse(PaymentSchema, req.body);
  const digits = data.number.replace(/\D/g, '');
  let number: string;
  if (data.type === 'Carte bancaire') {
    // On ne conserve jamais un numéro de carte complet : seulement les 4 derniers chiffres.
    if (digits.length < 12) throw badRequest('Numéro de carte invalide.');
    number = `•••• •••• •••• ${digits.slice(-4)}`;
  } else {
    if (digits.length < 8) throw badRequest('Numéro de téléphone invalide.');
    number = data.number;
  }
  await db.run(
    'INSERT INTO payment_methods (id, user_id, type, number, is_default) VALUES (?, ?, ?, ?, ?)',
    crypto.randomUUID(), user.id, data.type, number, (await hasAny('payment_methods', user.id)) ? 0 : 1
  );
  res.status(201).json({ user: await loadMe(user.id) });
});

meRouter.post('/payment-methods/:id/default', async (req, res) => {
  const user = currentUser(req);
  await ensureOwned('payment_methods', String(req.params.id), user.id);
  await setDefault('payment_methods', String(req.params.id), user.id);
  res.json({ user: await loadMe(user.id) });
});

meRouter.delete('/payment-methods/:id', async (req, res) => {
  const user = currentUser(req);
  await removeOwned('payment_methods', String(req.params.id), user.id);
  res.json({ user: await loadMe(user.id) });
});

/* ---------- Favoris ---------- */

const WishlistSchema = z.object({ productIds: z.array(z.string().max(100)).max(500) });

meRouter.put('/wishlist', async (req, res) => {
  const user = currentUser(req);
  const { productIds } = parse(WishlistSchema, req.body);
  const insert = `INSERT OR IGNORE INTO wishlist (user_id, product_id)
     SELECT ?, id FROM products WHERE id = ? AND deleted_at IS NULL`;
  // Tout ou rien, en un seul envoi : jusqu'à 500 favoris sans 500 allers-retours avec la base hébergée.
  await db.batch([['DELETE FROM wishlist WHERE user_id = ?', [user.id]], ...productIds.map((id): Statement => [insert, [user.id, id]])]);
  res.json({ wishlist: (await loadMe(user.id)).wishlist });
});
