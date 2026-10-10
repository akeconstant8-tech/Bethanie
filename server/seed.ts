import crypto from 'node:crypto';
import { hashPassword } from './auth.ts';
import { db, transaction, type Row, type Statement } from './db.ts';
import { INITIAL_USER } from './seed-data.ts';

const isEmpty = async () => Number(((await db.get('SELECT COUNT(*) AS n FROM users')) as Row).n) === 0;

/**
 * Remplit une base vide avec le compte de démonstration. Les boutiques et produits d'exemple sont créés par
 * syncDemoCatalogue (demo-sync.ts) ; aucune commande ni aucun paiement fictif n'est ajouté.
 */
export const seedIfEmpty = async () => {
  if (!(await isEmpty())) return false;

  return transaction(async () => {
    // Revérifié dans la transaction : un autre serveur qui démarre en même temps a pu remplir la base juste avant.
    if (!(await isEmpty())) return false;
    // Toutes les insertions partent d'un seul envoi (un seul aller-retour avec la base hébergée).
    const statements: Statement[] = [];

    /* Compte de démonstration */
    const userId = crypto.randomUUID();
    statements.push([
      'INSERT INTO users (id, name, email, phone, password_hash, avatar, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        INITIAL_USER.name,
        INITIAL_USER.email,
        INITIAL_USER.phone,
        hashPassword(crypto.randomBytes(32).toString('base64url')),
        INITIAL_USER.avatar,
        INITIAL_USER.location,
      ],
    ]);

    for (const a of INITIAL_USER.addresses) {
      statements.push([
        'INSERT INTO addresses (id, user_id, title, address, is_default) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, a.title, a.address, a.default ? 1 : 0],
      ]);
    }
    for (const p of INITIAL_USER.paymentMethods) {
      statements.push([
        'INSERT INTO payment_methods (id, user_id, type, number, is_default) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, p.type, p.number, p.default ? 1 : 0],
      ]);
    }

    await db.batch(statements);
    return true;
  });
};
