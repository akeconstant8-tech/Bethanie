import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { CITIES } from '../../src/utils/commerce.ts';
import { currentUser, requireAuth } from '../auth.ts';
import { db, nowIso, transaction, type Row } from '../db.ts';
import { badRequest, conflict, forbidden, notFound, parse } from '../http.ts';
import { PRODUCT_SELECT, getProduct, loadMe, toProduct, toReview, toShop } from '../serializers.ts';
import { PLACEHOLDER_IMAGE, saveImageDataUrl } from '../uploads.ts';

export const catalogRouter = Router();

export const CATEGORY_IDS = ['mode', 'electronique', 'maison', 'beaute', 'alimentation', 'artisanat', 'agriculture', 'services'];

/* ---------- Produits (public) ---------- */

const ListQuery = z.object({
  category: z.string().max(40).optional(),
  vendor: z.string().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

catalogRouter.get('/products', async (req, res) => {
  const query = parse(ListQuery, req.query);
  const where = ['p.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (query.category && query.category !== 'all') {
    where.push('p.category = ?');
    params.push(query.category);
  }
  if (query.vendor) {
    where.push('p.shop_id = ?');
    params.push(query.vendor);
  }
  if (query.q) {
    where.push(`(p.title LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\' OR p.brand LIKE ? ESCAPE '\\')`);
    const like = `%${query.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like, like);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [count, rows] = await Promise.all([
    db.get(`SELECT COUNT(*) AS n FROM products p ${whereSql}`, ...params) as Promise<Row>,
    db.all(`${PRODUCT_SELECT} ${whereSql} ORDER BY p.position, p.created_at DESC LIMIT ? OFFSET ?`, ...params, query.limit, query.offset),
  ]);
  res.json({ products: rows.map(toProduct), total: Number(count.n) });
});

catalogRouter.get('/products/:id', async (req, res) => {
  const product = await getProduct(String(req.params.id));
  if (!product) throw notFound('Ce produit n’est plus disponible.');
  res.json({ product });
});

/* ---------- Avis ---------- */

catalogRouter.get('/products/:id/reviews', async (req, res) => {
  if (!(await getProduct(String(req.params.id)))) throw notFound('Ce produit n’est plus disponible.');
  const rows = await db.all('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50', String(req.params.id));
  res.json({ reviews: rows.map(toReview) });
});

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(3, 'Votre avis est trop court.').max(1000, 'Votre avis est trop long (1000 caractères max.).'),
});

catalogRouter.post('/products/:id/reviews', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const product = await getProduct(String(req.params.id));
  if (!product) throw notFound('Ce produit n’est plus disponible.');
  const data = parse(ReviewSchema, req.body);

  if (await db.get('SELECT 1 FROM reviews WHERE user_id = ? AND product_id = ?', user.id, product.id)) {
    throw conflict('Vous avez déjà donné votre avis sur ce produit.');
  }
  // « Achat vérifié » seulement si le client a réellement commandé ce produit.
  const verified = Boolean(
    await db.get('SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.user_id = ? AND i.product_id = ?', user.id, product.id)
  );
  const me = (await db.get('SELECT name, location FROM users WHERE id = ?', user.id)) as Row;
  const [firstName, lastName = ''] = String(me.name).split(' ');
  const author = `${firstName}${lastName ? ` ${lastName.charAt(0).toUpperCase()}.` : ''}`;
  const city = String(me.location).split(',')[0] ?? '';
  const id = crypto.randomUUID();

  await transaction(async () => {
    await db.run(
      'INSERT INTO reviews (id, product_id, user_id, author_name, city, rating, text, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, product.id, user.id, author, city, data.rating, data.text, verified ? 1 : 0
    );
    await db.run(
      `UPDATE products SET rating = (rating * reviews_count + ?) / (reviews_count + 1), reviews_count = reviews_count + 1
       WHERE id = ?`,
      data.rating, product.id
    );
  });

  res.status(201).json({
    review: toReview((await db.get('SELECT * FROM reviews WHERE id = ?', id)) as Row),
    product: await getProduct(product.id),
  });
});

/* ---------- Boutiques ---------- */

const SHOP_SELECT = `
  SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id AND p.deleted_at IS NULL) AS articles_count
  FROM shops s`;

// Liste publique, sans connexion : plafonnée pour qu'une seule requête ne puisse pas tout faire lire.
const MAX_SHOPS_LISTED = 200;

catalogRouter.get('/shops', async (_req, res) => {
  const rows = await db.all(`${SHOP_SELECT} WHERE s.verified = 1 ORDER BY s.rowid LIMIT ?`, MAX_SHOPS_LISTED);
  res.json({ shops: rows.map(toShop) });
});

catalogRouter.get('/shops/:id', async (req, res) => {
  const row = await db.get(`${SHOP_SELECT} WHERE s.id = ?`, String(req.params.id));
  if (!row) throw notFound('Boutique introuvable.');
  res.json({ shop: toShop(row) });
});

const ShopSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez le nom de votre boutique.').max(60, 'Nom de boutique trop long.'),
  location: z.enum(CITIES),
  category: z.enum(CATEGORY_IDS as [string, ...string[]]),
  phone: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 8, 'Numéro Mobile Money invalide.'),
  description: z.string().trim().max(500).default(''),
});

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'boutique';

catalogRouter.post('/shops', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const data = parse(ShopSchema, req.body);
  if (await db.get('SELECT 1 FROM shops WHERE owner_id = ?', user.id)) throw conflict('Vous avez déjà une boutique.');
  const id = `${slugify(data.name)}-${crypto.randomBytes(3).toString('hex')}`;
  await db.run(
    'INSERT INTO shops (id, owner_id, name, location, category, phone, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, user.id, data.name, data.location, data.category, data.phone, data.description
  );
  res.status(201).json({ user: await loadMe(user.id) });
});

/* ---------- Gestion des produits par le vendeur ---------- */

const myShop = async (userId: string) => {
  const shop = await db.get('SELECT * FROM shops WHERE owner_id = ?', userId);
  if (!shop) throw forbidden('Ouvrez d’abord votre boutique dans l’espace vendeur.');
  return shop;
};

const ownedProduct = async (productId: string, shopId: string) => {
  const row = await db.get('SELECT shop_id FROM products WHERE id = ? AND deleted_at IS NULL', productId);
  if (!row) throw notFound('Produit introuvable.');
  if (row.shop_id !== shopId) throw forbidden('Ce produit n’appartient pas à votre boutique.');
};

const price = z.number().int('Le prix doit être un nombre entier.').min(100, 'Prix minimum : 100 FCFA.').max(50_000_000);

const ProductSchema = z.object({
  title: z.string().trim().min(3, 'Le nom du produit est trop court.').max(120, 'Nom de produit trop long.'),
  category: z.enum(CATEGORY_IDS as [string, ...string[]]),
  subcategory: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(60).optional(),
  price,
  originalPrice: price.optional(),
  stock: z.number().int().min(0).max(100_000),
  description: z.string().trim().min(10, 'Décrivez votre produit en quelques mots (10 caractères min.).').max(3000),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
  characteristics: z
    .record(z.string().trim().max(60), z.string().trim().max(200))
    // Noms réservés de JavaScript : refusés pour qu'aucun objet ne puisse être détourné en les relisant.
    .refine((value) => !Object.keys(value).some((key) => ['__proto__', 'constructor', 'prototype'].includes(key)), 'Nom de caractéristique invalide.')
    .optional(),
  imageData: z.string().max(4_000_000).optional(),
  extraImagesData: z.array(z.string().max(4_000_000)).max(2, '3 photos maximum par produit.').optional(),
});

catalogRouter.post('/products', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const shop = await myShop(user.id);
  const data = parse(ProductSchema, req.body);
  if (data.characteristics && Object.keys(data.characteristics).length > 20) throw badRequest('20 caractéristiques maximum.');

  const image = data.imageData ? saveImageDataUrl(data.imageData) : PLACEHOLDER_IMAGE;
  const extraImages = data.imageData ? (data.extraImagesData ?? []).map(saveImageDataUrl) : [];
  const hasDiscount = data.originalPrice !== undefined && data.originalPrice > data.price;
  const id = `${slugify(data.title)}-${crypto.randomBytes(3).toString('hex')}`;

  await db.run(
    `INSERT INTO products (id, shop_id, title, description, price, original_price, discount_badge, category, subcategory,
       brand, location, stock, image, additional_images, characteristics, sizes, is_new, is_promo, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1000)`,
    id,
    String(shop.id),
    data.title,
    data.description,
    data.price,
    hasDiscount ? data.originalPrice! : null,
    hasDiscount ? `-${Math.round(((data.originalPrice! - data.price) / data.originalPrice!) * 100)}%` : 'Nouveau',
    data.category,
    data.subcategory || null,
    data.brand || String(shop.name),
    String(shop.location),
    data.stock,
    image,
    extraImages.length ? JSON.stringify(extraImages) : null,
    data.characteristics && Object.keys(data.characteristics).length ? JSON.stringify(data.characteristics) : null,
    data.sizes?.length ? JSON.stringify(data.sizes) : null,
    hasDiscount ? 1 : 0
  );
  res.status(201).json({ product: await getProduct(id) });
});

const ProductPatchSchema = z
  .object({
    title: ProductSchema.shape.title,
    description: ProductSchema.shape.description,
    price,
    stock: ProductSchema.shape.stock,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Aucune modification fournie.');

catalogRouter.patch('/products/:id', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const shop = await myShop(user.id);
  await ownedProduct(String(req.params.id), String(shop.id));
  const data = parse(ProductPatchSchema, req.body);
  const columns = { title: data.title, description: data.description, price: data.price, stock: data.stock };
  // Noms de colonnes fixés ci-dessus (jamais venus de la requête) ; les valeurs passent par « ? ».
  const entries = Object.entries(columns).filter(([, v]) => v !== undefined) as [string, string | number][];
  await db.run(
    `UPDATE products SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...entries.map(([, v]) => v),
    String(req.params.id)
  );
  res.json({ product: await getProduct(String(req.params.id)) });
});

catalogRouter.delete('/products/:id', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const shop = await myShop(user.id);
  await ownedProduct(String(req.params.id), String(shop.id));
  // Suppression « douce » : les commandes passées gardent leur historique.
  await db.run('UPDATE products SET deleted_at = ? WHERE id = ?', nowIso(), String(req.params.id));
  res.status(204).end();
});
