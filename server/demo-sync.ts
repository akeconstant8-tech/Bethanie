/* Catalogue de démonstration : boutiques et produits d'exemple tenus à jour dans la base au démarrage. */
import crypto from 'node:crypto';
import { db, nowIso, type Statement } from './db.ts';
import { DEMO_PRODUCTS, DEMO_SHOPS, type DemoProduct } from './catalogue-demo.ts';
import { DEMO_PHOTOS } from './catalogue-demo-photos.ts';
import { INITIAL_ORDERS, INITIAL_USER } from './seed-data.ts';
import { PLACEHOLDER_IMAGE } from './uploads.ts';

const VERSION_KEY = 'catalogue_demo_version';

// Avis d'exemple insérés sans compte par les premières versions (mêmes trois textes sur chaque produit) : retirés.
const SAMPLE_REVIEW_AUTHORS = ['Adjoua K.', 'Ibrahim S.', 'Marie-Laure D.'];

/** Les produits de démonstration passent après ceux des vrais vendeurs (position 1000) dans l'ordre par défaut. */
const DEMO_POSITION = 2000;

/** Ordre d'affichage : un produit de chaque catégorie à tour de rôle, pour une vitrine variée. */
const interleaved = (): DemoProduct[] => {
  const byCategory = new Map<string, DemoProduct[]>();
  for (const p of DEMO_PRODUCTS) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  const queues = [...byCategory.values()];
  const out: DemoProduct[] = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out;
};

const json = (value: unknown) => (value === undefined ? null : JSON.stringify(value));

/**
 * Insère ou met à jour les boutiques et produits de démonstration, une fois par version du catalogue. Ne touche jamais
 * une boutique qui a un propriétaire (vrai vendeur) ni ses produits ; garde le stock déjà en base (commandes passées).
 * Retire aussi les avis d'exemple sans compte et marque les commandes de démonstration (exclues des ventes réelles).
 */
export const syncDemoCatalogue = async () => {
  const version = crypto
    .createHash('sha256')
    .update(JSON.stringify([DEMO_SHOPS, DEMO_PRODUCTS, DEMO_PHOTOS, SAMPLE_REVIEW_AUTHORS, DEMO_POSITION]))
    .digest('hex')
    .slice(0, 16);
  if ((await db.get('SELECT value FROM app_meta WHERE key = ?', VERSION_KEY))?.value === version) return false;

  const statements: Statement[] = [];
  for (const s of DEMO_SHOPS) {
    statements.push([
      `INSERT INTO shops (id, name, location, category, description, verified, rating, reviews_count, icon, icon_bg, icon_color, is_demo)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, location = excluded.location, category = excluded.category,
         description = excluded.description, verified = 0, rating = 0, reviews_count = 0, icon = excluded.icon,
         icon_bg = excluded.icon_bg, icon_color = excluded.icon_color, is_demo = 1
       WHERE shops.owner_id IS NULL`,
      [s.id, s.name, s.location, s.category, s.description, s.icon, s.iconBg, s.iconColor],
    ]);
  }

  interleaved().forEach((p, i) => {
    const photo = DEMO_PHOTOS[p.id];
    const credit = photo ? { author: photo.author, licence: photo.licence, licenceUrl: photo.licenceUrl, source: photo.source } : undefined;
    statements.push([
      `INSERT INTO products (id, shop_id, title, description, price, category, subcategory, brand, location, stock, image,
         characteristics, colors, sizes, position, item_condition, reference, delivery_note, photo_credit, is_local, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET shop_id = excluded.shop_id, title = excluded.title, description = excluded.description,
         price = excluded.price, original_price = NULL, discount_badge = NULL, category = excluded.category,
         subcategory = excluded.subcategory, brand = excluded.brand, location = excluded.location,
         stock = CASE WHEN products.is_demo = 0 THEN excluded.stock ELSE products.stock END,
         image = excluded.image, additional_images = NULL, characteristics = excluded.characteristics,
         colors = excluded.colors, sizes = excluded.sizes, is_new = 0, is_trending = 0, is_bio = 0, is_promo = 0,
         position = excluded.position, item_condition = excluded.item_condition, reference = excluded.reference,
         delivery_note = excluded.delivery_note, photo_credit = excluded.photo_credit, is_local = excluded.is_local,
         is_demo = 1, deleted_at = NULL
       WHERE products.shop_id IN (SELECT id FROM shops WHERE owner_id IS NULL)`,
      [
        p.id, p.shop, p.title, p.description, p.price, p.category, p.subcategory, p.brand, p.location, p.stock,
        photo?.image ?? PLACEHOLDER_IMAGE, json(p.characteristics), json(p.colors), json(p.sizes), DEMO_POSITION + i,
        p.condition, p.reference, p.delivery ?? `Expédié depuis ${p.location}.`, json(credit), p.local ? 1 : 0,
      ],
    ]);
  });

  // Produits retirés du catalogue de démonstration : retirés de la vente (l'historique des commandes reste).
  const ids = DEMO_PRODUCTS.map((p) => p.id);
  statements.push([
    `UPDATE products SET deleted_at = ? WHERE is_demo = 1 AND deleted_at IS NULL AND id NOT IN (${ids.map(() => '?').join(', ')})`,
    [nowIso(), ...ids],
  ]);

  // Avis d'exemple retirés ; notes recalculées sur les seuls vrais avis.
  statements.push([
    `DELETE FROM reviews WHERE user_id IS NULL AND verified = 0 AND author_name IN (${SAMPLE_REVIEW_AUTHORS.map(() => '?').join(', ')})`,
    SAMPLE_REVIEW_AUTHORS,
  ]);
  statements.push([
    `UPDATE products SET
       reviews_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id),
       rating = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = products.id), 0)`,
  ]);

  // Commandes d'exemple du compte de démonstration : exclues des « meilleures ventes ».
  statements.push([
    `UPDATE orders SET is_demo = 1 WHERE id IN (${INITIAL_ORDERS.map(() => '?').join(', ')})
       AND user_id IN (SELECT id FROM users WHERE email = ?)`,
    [...INITIAL_ORDERS.map((o) => o.id), INITIAL_USER.email],
  ]);

  statements.push([
    `INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [VERSION_KEY, version],
  ]);

  await db.batch(statements); // tout ou rien
  return true;
};
