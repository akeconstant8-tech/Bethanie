import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.ts';
import { db, type Row } from './db.ts';
import { HttpError } from './http.ts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const SESSION_COOKIE = 'bethanie_session';

/** Adresses Google vérifiées listées dans ADMIN_EMAILS (séparées par des virgules). */
export const isAdminEmail = (email: string) =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());

/** Domaine interne des profils d'achat sans compte : jamais montré, ne correspond à aucune adresse Google. */
const GUEST_EMAIL_DOMAIN = '@invite.bethanie.local';
export const isGuestEmail = (email: string) => email.endsWith(GUEST_EMAIL_DOMAIN);

/* Compatibilité avec la colonne password_hash du schéma SQLite existant. */

const SCRYPT_KEYLEN = 64;

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
};

/* ---------- Sessions ---------- */

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export const createSession = async (res: Response, userId: string) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + config.sessionDays * 24 * 3600 * 1000);
  await db.run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', sha256(token), userId, expires.toISOString());
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    expires,
    path: '/',
  });
};

export const destroySession = async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') await db.run('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
};

/** Charge l'utilisateur connecté (s'il y en a un) dans req.user. */
export const loadUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 20) {
    const row = await db.get(
      `SELECT u.id, u.name, u.email, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
      sha256(token)
    );

    if (row && String(row.expires_at) > new Date().toISOString()) {
      let role = row.role as AuthUser['role'];
      // Une adresse retirée de ADMIN_EMAILS perd le rôle tout de suite, sans attendre une nouvelle connexion.
      if (role === 'admin' && !isAdminEmail(String(row.email))) {
        await db.run(`UPDATE users SET role = 'customer' WHERE id = ?`, String(row.id));
        role = 'customer';
      }
      req.user = { id: String(row.id), name: String(row.name), email: String(row.email), role };
    } else if (row) {
      await destroySession(req, res);
    }
  }
  next();
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, 'Connectez-vous pour continuer.'));
  next();
};

export const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw new HttpError(401, 'Connectez-vous pour continuer.');
  return req.user;
};

/**
 * Protection CSRF : toute requête qui modifie des données doit porter l'en-tête X-Bethanie.
 * Un site tiers ne peut pas l'ajouter sans requête CORS préalable, que le serveur refuse.
 */
export const requireClientHeader = (req: Request, _res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Bethanie') !== '1') return next(new HttpError(403, 'Requête refusée.'));
  next();
};

/**
 * Achat sans compte : crée un profil minimal (aucun mot de passe utilisable, aucun Google lié) pour
 * que la commande, le paiement GeniusPay et le suivi réutilisent exactement le même mécanisme de
 * session que pour un compte normal. L'adresse e-mail générée est interne, jamais montrée au client.
 */
export const createGuestAccount = async (res: Response, name: string, phone: string): Promise<AuthUser> => {
  const id = crypto.randomUUID();
  const cleanName = name.trim().slice(0, 80);
  const email = `invite-${id}${GUEST_EMAIL_DOMAIN}`;
  await db.run(
    'INSERT INTO users (id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
    id,
    cleanName,
    email,
    phone.trim().slice(0, 30),
    hashPassword(crypto.randomBytes(32).toString('base64url'))
  );
  await createSession(res, id);
  return { id, name: cleanName, email, role: 'customer' };
};

export const purgeExpiredSessions = async () => {
  await db.run('DELETE FROM sessions WHERE expires_at < ?', new Date().toISOString());
};
