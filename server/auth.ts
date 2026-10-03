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

/* ---------- Mots de passe (scrypt, sel aléatoire) ---------- */

const SCRYPT_KEYLEN = 64;

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
};

// Empreinte factice : on calcule toujours un scrypt, même si l'e-mail est inconnu,
// pour ne pas révéler par le temps de réponse quels comptes existent.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
export const verifyPasswordOrDummy = (password: string, stored: string | undefined) =>
  verifyPassword(password, stored ?? DUMMY_HASH) && stored !== undefined;

/* ---------- Sessions ---------- */

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export const createSession = (res: Response, userId: string) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + config.sessionDays * 24 * 3600 * 1000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    userId,
    expires.toISOString()
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    expires,
    path: '/',
  });
};

export const destroySession = (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
};

/** Charge l'utilisateur connecté (s'il y en a un) dans req.user. */
export const loadUser = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 20) {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(sha256(token)) as Row | undefined;

    if (row && String(row.expires_at) > new Date().toISOString()) {
      req.user = { id: String(row.id), name: String(row.name), email: String(row.email), role: row.role as AuthUser['role'] };
    } else if (row) {
      destroySession(req, res);
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

export const purgeExpiredSessions = () => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
};
