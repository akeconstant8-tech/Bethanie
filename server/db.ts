/* Base de données de Béthanie : même SQL (SQLite) et même interface, deux moteurs.
 *
 *  - Base hébergée Turso, permanente, dès que TURSO_DATABASE_URL est défini (avec TURSO_AUTH_TOKEN) : obligatoire en
 *    production sur Vercel, dont le disque est effacé à chaque redémarrage.
 *  - Sinon, fichier SQLite local : server/data/ en développement (ou DATA_DIR), /tmp/bethanie sur Vercel sans Turso.
 *
 * Toutes les requêtes sont asynchrones (une base hébergée répond par le réseau). Les transactions restent « tout ou
 * rien » (stock, commission de 5 %, journal scellé) : toute requête lancée pendant transaction(fn), même depuis une
 * fonction appelée par fn, passe par cette transaction.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createClient, type ResultSet, type Transaction } from '@libsql/client/http';
import { config } from './config.ts';

export type Row = Record<string, unknown>;
export type SqlValue = string | number | bigint | null | Uint8Array;
/** Requête et ses valeurs, pour un envoi groupé (db.batch). */
export type Statement = [sql: string, args?: SqlValue[]];

interface Engine {
  label: string;
  all(sql: string, args: SqlValue[]): Promise<Row[]>;
  run(sql: string, args: SqlValue[]): Promise<{ changes: number }>;
  script(sql: string): Promise<void>;
  batch(statements: Statement[]): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

/** Fichier SQLite local : une seule connexion, partagée par toutes les requêtes du serveur. */
const localEngine = (file: string): Engine => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new DatabaseSync(file);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const inTransaction = new AsyncLocalStorage<true>();
  let open = false;
  let idle: Promise<void> = Promise.resolve();
  // Pendant une transaction, les requêtes des autres demandes attendent qu'elle se termine : sinon, avec une seule
  // connexion, elles s'exécuteraient à l'intérieur (et seraient annulées avec elle). La vérification et l'exécution se
  // suivent sans pause, aucune autre demande ne peut s'intercaler entre les deux.
  const turn = async <T>(op: () => T): Promise<T> => {
    if (!inTransaction.getStore()) while (open) await idle;
    return op();
  };
  const transaction = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (inTransaction.getStore()) return fn();
    while (open) await idle;
    open = true;
    let release = () => {};
    idle = new Promise((resolve) => (release = resolve));
    try {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = await inTransaction.run(true, fn);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          sqlite.exec('ROLLBACK');
        } catch {
          // transaction déjà close par SQLite
        }
        throw error;
      }
    } finally {
      open = false;
      release();
    }
  };
  return {
    label: file,
    all: (sql, args) => turn(() => sqlite.prepare(sql).all(...args) as Row[]),
    run: (sql, args) => turn(() => ({ changes: Number(sqlite.prepare(sql).run(...args).changes) })),
    script: (sql) => turn(() => sqlite.exec(sql)),
    batch: (statements) =>
      transaction(async () => {
        for (const [sql, args = []] of statements) sqlite.prepare(sql).run(...args);
      }),
    transaction,
  };
};

/** Base hébergée Turso, par HTTPS (aucun module natif : adapté aux fonctions Vercel). */
const tursoEngine = (url: string, authToken: string | undefined): Engine => {
  const client = createClient({ url, authToken });
  const current = new AsyncLocalStorage<Transaction>();
  const target = () => current.getStore() ?? client;
  // Lignes en objets simples (colonne → valeur), comme le moteur local.
  const rows = (rs: ResultSet): Row[] => rs.rows.map((row) => Object.fromEntries(rs.columns.map((name, i) => [name, row[i]])));
  return {
    // Ni l'adresse de la base ni le jeton n'apparaissent dans les journaux.
    label: 'Turso (base hébergée)',
    all: async (sql, args) => rows(await target().execute({ sql, args })),
    run: async (sql, args) => ({ changes: (await target().execute({ sql, args })).rowsAffected }),
    script: (sql) => target().executeMultiple(sql),
    // Un seul aller-retour réseau pour toute la liste (dans la transaction en cours s'il y en a une).
    batch: async (statements) => {
      const list = statements.map(([sql, args = []]) => ({ sql, args }));
      const tx = current.getStore();
      if (tx) await tx.batch(list);
      else await client.batch(list, 'write');
    },
    transaction: async (fn) => {
      if (current.getStore()) return fn();
      const tx = await client.transaction('write');
      try {
        const result = await current.run(tx, fn);
        await tx.commit();
        return result;
      } catch (error) {
        await tx.rollback().catch(() => undefined);
        throw error;
      } finally {
        tx.close();
      }
    },
  };
};

// En local, la base en ligne n'est utilisée que sur demande (USE_TURSO=1) : sinon, des identifiants Turso posés dans
// .env.local feraient écrire les essais de développement dans la base de production.
const tursoUrl = process.env.VERCEL || process.env.USE_TURSO === '1' ? process.env.TURSO_DATABASE_URL?.trim() : undefined;
if (!tursoUrl && process.env.TURSO_DATABASE_URL?.trim()) {
  console.log('[api] TURSO_DATABASE_URL ignorée en local : base de développement (fichier). USE_TURSO=1 pour utiliser la base en ligne.');
}
const engine = tursoUrl ? tursoEngine(tursoUrl, process.env.TURSO_AUTH_TOKEN?.trim() || undefined) : localEngine(config.dbPath);

/** Où sont les données (pour les journaux de démarrage) ; jamais le jeton d'accès. */
export const databaseLabel = engine.label;
/** true si les données sont dans la base hébergée (permanente). */
export const hostedDatabase = Boolean(tursoUrl);

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/** Ajoute une colonne si elle manque ; un autre serveur qui démarre en même temps a pu l'ajouter juste avant. */
const addColumn = async (table: string, column: string, definition: string) => {
  const columns = await engine.all(`PRAGMA table_info(${table})`, []);
  if (columns.some((c) => c.name === column)) return;
  try {
    await engine.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, []);
  } catch (error) {
    if (!/duplicate column/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
};

const createSchema = async () => {
await engine.script(`
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

await addColumn('users', 'firebase_uid', 'TEXT');
await engine.script('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid)');

// Paiement en ligne (GeniusPay) : référence du paiement et adresse de la page de paiement.
await addColumn('orders', 'payment_reference', 'TEXT');
await addColumn('orders', 'payment_url', 'TEXT');
await engine.script('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference)');
// Catégorie d'annulation : distingue un refus explicite de GeniusPay (message « Paiement échoué ») d'une
// simple expiration à 2 h, pour que le suivi affiche le bon message (voir cancelOrder, transactions.ts).
await addColumn('orders', 'cancel_reason', 'TEXT');
// Nom du client au moment de la commande (achat invité ou compte) : indépendant du profil, qui peut changer.
await addColumn('orders', 'customer_name', 'TEXT');

// Catégorie « Artisanat » remplacée par « Enfants & Bébé » (10 octobre 2026) : les objets d'art et créations déjà en
// vente, et leurs boutiques, passent dans « Maison » (décoration), la catégorie la plus proche.
await engine.script(`
  UPDATE products SET category = 'maison' WHERE category = 'artisanat';
  UPDATE shops SET category = 'maison' WHERE category = 'artisanat';
`);

// Notifications GeniusPay déjà traitées : une notification rejouée (même identifiant) est ignorée.
await engine.script(`
  CREATE TABLE IF NOT EXISTS payment_webhook_events (
    event_id    TEXT PRIMARY KEY,
    received_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_received ON payment_webhook_events(received_at);
`);

/* Contrôle des transactions et commission de Béthanie (RG-09, voir transactions.ts). */
await engine.script(`
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
};

let schema: Promise<void> | null = null;
/**
 * Tables créées et mises à jour une fois par démarrage, avant la première requête. Si la base hébergée était
 * injoignable, la tentative suivante recommence (au lieu de laisser le serveur bloqué sur l'échec).
 */
export const ensureSchema = () =>
  (schema ??= createSchema().catch((error) => {
    schema = null;
    throw error;
  }));

/** Requêtes : « ? » dans le SQL, valeurs à la suite (jamais de valeur collée dans le texte SQL). */
export const db = {
  /** Première ligne du résultat, ou undefined. */
  get: async (sql: string, ...args: SqlValue[]): Promise<Row | undefined> => {
    await ensureSchema();
    return (await engine.all(sql, args))[0];
  },
  all: async (sql: string, ...args: SqlValue[]): Promise<Row[]> => {
    await ensureSchema();
    return engine.all(sql, args);
  },
  /** INSERT, UPDATE, DELETE : renvoie le nombre de lignes modifiées. */
  run: async (sql: string, ...args: SqlValue[]): Promise<{ changes: number }> => {
    await ensureSchema();
    return engine.run(sql, args);
  },
  /** Plusieurs instructions sans valeurs (création de tables…). */
  exec: async (sql: string): Promise<void> => {
    await ensureSchema();
    return engine.script(sql);
  },
  /** Liste d'écritures envoyée d'un seul coup, tout ou rien (un seul aller-retour avec la base hébergée). */
  batch: async (statements: Statement[]): Promise<void> => {
    await ensureSchema();
    if (statements.length) await engine.batch(statements);
  },
};

/** Exécute `fn` dans une transaction (tout ou rien) ; une transaction déjà ouverte est réutilisée. */
export const transaction = async <T>(fn: () => Promise<T>): Promise<T> => {
  await ensureSchema();
  return engine.transaction(fn);
};

export const nowIso = () => new Date().toISOString();
