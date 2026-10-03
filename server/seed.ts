import crypto from 'node:crypto';
import { hashPassword } from './auth.ts';
import { db, transaction, type Row } from './db.ts';
import { INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_SHOPS, INITIAL_USER } from './seed-data.ts';

export const DEMO_EMAIL = INITIAL_USER.email;
export const DEMO_PASSWORD = 'bethanie123';

const SAMPLE_REVIEWS = [
  { author: 'Adjoua K.', city: 'Cocody', rating: 5, at: '2026-09-28T10:00:00Z', text: 'Produit conforme à la description, très bonne qualité. Livraison rapide, le livreur était très courtois.' },
  { author: 'Ibrahim S.', city: 'Yopougon', rating: 4, at: '2026-09-21T15:30:00Z', text: 'Bon rapport qualité-prix. Le vendeur a répondu rapidement à mes questions sur WhatsApp.' },
  { author: 'Marie-Laure D.', city: 'Bouaké', rating: 5, at: '2026-09-15T09:10:00Z', text: 'Je recommande ! Emballage soigné et produit reçu en parfait état à Bouaké.' },
];

const MONTHS: Record<string, string> = {
  'janv.': '01', 'févr.': '02', mars: '03', 'avr.': '04', mai: '05', juin: '06',
  'juil.': '07', août: '08', 'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12',
};

/** « 02 oct. 2026 » + « 10:15 » → ISO (Abidjan est à UTC+0). */
const toIso = (date: string, time?: string) => {
  const [day, month, year] = date.split(' ');
  const hhmm = time && /^\d{2}:\d{2}$/.test(time) ? time : '12:00';
  return `${year}-${MONTHS[month]}-${day.padStart(2, '0')}T${hhmm}:00.000Z`;
};

const STEP_TO_STATUS: Record<string, string> = {
  'Commande confirmée': 'confirmée',
  Préparation: 'préparation',
  Expédition: 'expédition',
  'En livraison': 'en_livraison',
  Livrée: 'livrée',
};

const toJson = (value: unknown) => (value === undefined ? null : JSON.stringify(value));

/** Remplit une base vide avec les données de démonstration. Renvoie true si elle l'a fait. */
export const seedIfEmpty = () => {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as Row;
  if (Number(n) > 0) return false;

  transaction(() => {
    /* Compte de démonstration */
    const userId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, name, email, phone, password_hash, avatar, location) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, INITIAL_USER.name, INITIAL_USER.email, INITIAL_USER.phone, hashPassword(DEMO_PASSWORD), INITIAL_USER.avatar, INITIAL_USER.location);

    for (const a of INITIAL_USER.addresses) {
      db.prepare('INSERT INTO addresses (id, user_id, title, address, is_default) VALUES (?, ?, ?, ?, ?)').run(
        crypto.randomUUID(), userId, a.title, a.address, a.default ? 1 : 0
      );
    }
    for (const p of INITIAL_USER.paymentMethods) {
      db.prepare('INSERT INTO payment_methods (id, user_id, type, number, is_default) VALUES (?, ?, ?, ?, ?)').run(
        crypto.randomUUID(), userId, p.type, p.number, p.default ? 1 : 0
      );
    }

    /* Boutiques : celles de la page d'accueil + les vendeurs cités par les produits */
    const vendorOf = new Map(INITIAL_PRODUCTS.map((p) => [p.vendor.id, p]));
    const insertShop = db.prepare(
      `INSERT INTO shops (id, name, location, category, description, verified, rating, reviews_count, icon, icon_bg, icon_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const s of INITIAL_SHOPS) {
      const sample = vendorOf.get(s.id);
      insertShop.run(
        s.id, s.name, sample?.vendor.location ?? s.location, sample?.category ?? '', s.description,
        s.verified ? 1 : 0, s.rating, sample?.vendor.reviewsCount ?? 0, s.icon, s.iconBg, s.iconColor
      );
    }
    for (const [id, p] of vendorOf) {
      if (INITIAL_SHOPS.some((s) => s.id === id)) continue;
      insertShop.run(
        id, p.vendor.name, p.vendor.location, p.category, '', p.vendor.verified ? 1 : 0, p.vendor.rating,
        p.vendor.reviewsCount, 'fa-bag-shopping', 'bg-amber-100', 'text-amber-800'
      );
    }

    /* Produits */
    const insertProduct = db.prepare(
      `INSERT INTO products (id, shop_id, title, description, price, original_price, discount_badge, category, subcategory,
         brand, location, rating, reviews_count, stock, image, additional_images, characteristics, colors, sizes,
         is_new, is_trending, is_bio, is_promo, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    INITIAL_PRODUCTS.forEach((p, position) => {
      insertProduct.run(
        p.id, p.vendor.id, p.title, p.description, p.price, p.originalPrice ?? null, p.discountBadge ?? null, p.category,
        p.subcategory ?? null, p.brand ?? null, p.location, p.rating, p.reviewsCount, p.stock, p.image,
        toJson(p.additionalImages), toJson(p.characteristics), toJson(p.availableColors), toJson(p.availableSizes),
        p.isNew ? 1 : 0, p.isTrending ? 1 : 0, p.isBio ? 1 : 0, p.isPromo ? 1 : 0, position
      );
      for (const r of SAMPLE_REVIEWS) {
        db.prepare(
          'INSERT INTO reviews (id, product_id, author_name, city, rating, text, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
        ).run(crypto.randomUUID(), p.id, r.author, r.city, r.rating, r.text, r.at);
      }
    });

    /* Commandes de démonstration */
    for (const o of INITIAL_ORDERS) {
      const events = o.steps
        .filter((s) => s.completed && s.date)
        .map((s) => ({ status: STEP_TO_STATUS[s.step], at: toIso(s.date!, s.time) }));
      db.prepare(
        `INSERT INTO orders (id, user_id, status, payment_status, payment_method, phone_number, delivery_method, city,
           shipping_address, subtotal, delivery_fee, discount, total, driver, created_at)
         VALUES (?, ?, ?, 'payé', ?, ?, 'standard', 'Abidjan', ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        o.id, userId, o.status, o.paymentMethod, o.phoneNumber ?? null, o.shippingAddress, o.subtotal, o.deliveryFee,
        o.discount, o.total, toJson(o.deliveryDriver), events[0]?.at ?? new Date().toISOString()
      );
      for (const item of o.items) {
        db.prepare(
          `INSERT INTO order_items (order_id, product_id, shop_id, quantity, unit_price, color, size, product_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          o.id, item.product.id, item.product.vendor.id, item.quantity, item.product.price,
          item.selectedColor ?? null, item.selectedSize ?? null, JSON.stringify(item.product)
        );
      }
      for (const e of events) {
        db.prepare('INSERT INTO order_events (order_id, status, created_at) VALUES (?, ?, ?)').run(o.id, e.status, e.at);
      }
    }
  });

  return true;
};
