import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.ts';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    firebase_uid  TEXT,
    avatar        TEXT NOT NULL DEFAULT '',
    location      TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS addresses (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    address    TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    number     TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS shops (
    id            TEXT PRIMARY KEY,
    owner_id      TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    location      TEXT NOT NULL,
    category      TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    verified      INTEGER NOT NULL DEFAULT 0,
    rating        REAL NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    icon          TEXT NOT NULL DEFAULT 'fa-store',
    icon_bg       TEXT NOT NULL DEFAULT 'bg-brand-50',
    icon_color    TEXT NOT NULL DEFAULT 'text-brand-900',
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE IF NOT EXISTS products (
    id                TEXT PRIMARY KEY,
    shop_id           TEXT NOT NULL REFERENCES shops(id),
    title             TEXT NOT NULL,
    description       TEXT NOT NULL,
    price             INTEGER NOT NULL CHECK (price > 0),
    original_price    INTEGER,
    discount_badge    TEXT,
    category          TEXT NOT NULL,
    subcategory       TEXT,
    brand             TEXT,
    location          TEXT NOT NULL,
    rating            REAL NOT NULL DEFAULT 0,
    reviews_count     INTEGER NOT NULL DEFAULT 0,
    stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image             TEXT NOT NULL,
    additional_images TEXT,
    characteristics   TEXT,
    colors            TEXT,
    sizes             TEXT,
    is_new            INTEGER NOT NULL DEFAULT 0,
    is_trending       INTEGER NOT NULL DEFAULT 0,
    is_bio            INTEGER NOT NULL DEFAULT 0,
    is_promo          INTEGER NOT NULL DEFAULT 0,
    position          INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT ${NOW},
    deleted_at        TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

  CREATE TABLE IF NOT EXISTS wishlist (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    created_at TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id),
    status           TEXT NOT NULL,
    payment_status   TEXT NOT NULL,
    payment_method   TEXT NOT NULL,
    phone_number     TEXT,
    contact_phone    TEXT,
    delivery_method  TEXT NOT NULL,
    city             TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    subtotal         INTEGER NOT NULL,
    delivery_fee     INTEGER NOT NULL,
    discount         INTEGER NOT NULL,
    total            INTEGER NOT NULL,
    promo_code       TEXT,
    driver           TEXT,
    created_at       TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

  CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id       TEXT NOT NULL,
    shop_id          TEXT NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price       INTEGER NOT NULL,
    color            TEXT,
    size             TEXT,
    product_snapshot TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_shop ON order_items(shop_id);

  CREATE TABLE IF NOT EXISTS order_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);

  CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    product_id  TEXT NOT NULL REFERENCES products(id),
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    city        TEXT NOT NULL DEFAULT '',
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text        TEXT NOT NULL,
    verified    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product ON reviews(user_id, product_id) WHERE user_id IS NOT NULL;
`);

const userColumns = db.prepare('PRAGMA table_info(users)').all() as Row[];
if (!userColumns.some((column) => column.name === 'firebase_uid')) {
  db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)');

// Paiement en ligne (GeniusPay) : référence du paiement et adresse de la page de paiement.
const orderColumns = db.prepare('PRAGMA table_info(orders)').all() as Row[];
if (!orderColumns.some((column) => column.name === 'payment_reference')) {
  db.exec('ALTER TABLE orders ADD COLUMN payment_reference TEXT');
  db.exec('ALTER TABLE orders ADD COLUMN payment_url TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference)');
// Catégorie d'annulation : distingue un refus explicite de GeniusPay (message « Paiement échoué ») d'une
// simple expiration à 2 h, pour que le suivi affiche le bon message (voir cancelOrder, transactions.ts).
if (!orderColumns.some((column) => column.name === 'cancel_reason')) {
  db.exec('ALTER TABLE orders ADD COLUMN cancel_reason TEXT');
}
// Nom du client au moment de la commande (achat invité ou compte) : indépendant du profil, qui peut changer.
if (!orderColumns.some((column) => column.name === 'customer_name')) {
  db.exec('ALTER TABLE orders ADD COLUMN customer_name TEXT');
}

/* Contrôle des transactions et commission de Béthanie (RG-09, voir transactions.ts). */
db.exec(`
  -- Répartition de chaque commande par boutique : commission de Béthanie et part du vendeur.
  CREATE TABLE IF NOT EXISTS order_settlements (
    order_id            TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id             TEXT NOT NULL,
    gross               INTEGER NOT NULL CHECK (gross >= 0),
    commission_rate_bp  INTEGER NOT NULL CHECK (commission_rate_bp >= 0),
    commission          INTEGER NOT NULL CHECK (commission >= 0),
    seller_net          INTEGER NOT NULL CHECK (seller_net >= 0),
    status              TEXT NOT NULL DEFAULT 'prévue' CHECK (status IN ('prévue', 'acquise', 'annulée')),
    created_at          TEXT NOT NULL DEFAULT ${NOW},
    PRIMARY KEY (order_id, shop_id)
  );

  -- Journal scellé : chaque ligne contient l'empreinte de la précédente (toute modification est détectable).
  CREATE TABLE IF NOT EXISTS transaction_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    at          TEXT NOT NULL,
    order_id    TEXT,
    event       TEXT NOT NULL,
    amount      INTEGER NOT NULL DEFAULT 0,
    commission  INTEGER NOT NULL DEFAULT 0,
    details     TEXT NOT NULL DEFAULT '{}',
    prev_hash   TEXT NOT NULL,
    hash        TEXT NOT NULL,
    seal        TEXT NOT NULL DEFAULT 'h' CHECK (seal IN ('h', 'm'))  -- h : empreinte simple ; m : HMAC (TRANSACTIONS_SECRET)
  );
  CREATE INDEX IF NOT EXISTS idx_transaction_log_order ON transaction_log(order_id);
`);

/** Exécute `fn` dans une transaction SQLite (tout ou rien). */
export const transaction = <T>(fn: () => T): T => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

export type Row = Record<string, unknown>;

export const nowIso = () => new Date().toISOString();
