import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createSession, destroySession, hashPassword } from '../auth.ts';
import { db, transaction, type Row } from '../db.ts';
import { describeFirebaseStatus, verifyGoogleIdToken } from '../firebase.ts';
import { HttpError, conflict, parse } from '../http.ts';
import { loadMe } from '../serializers.ts';

export const authRouter = Router();

// Limite les tentatives de connexion (robots, abus).
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

const email = z.string().trim().toLowerCase().email('Adresse e-mail invalide.').max(120);
const GoogleSchema = z.object({ idToken: z.string().min(100).max(10_000) });

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

// Au démarrage : état de la connexion Google dans les journaux (noms des variables manquantes, jamais leurs valeurs).
console.log(`[api] ${describeFirebaseStatus()}`);

/**
 * Retrouve le compte Béthanie d'un utilisateur Google, ou le crée :
 *  1. compte déjà lié à cet identifiant Google (uid Firebase) ;
 *  2. sinon, compte existant avec la même adresse e-mail : on le lie à Google ;
 *  3. sinon, nouveau compte (nom Google, ville par défaut Abidjan).
 */
export const linkGoogleAccount = (profile: { uid: string; email: string; name?: string }) =>
  transaction(() => {
    const linkedUser = db.prepare('SELECT id FROM users WHERE firebase_uid = ?').get(profile.uid) as Row | undefined;
    if (linkedUser) return String(linkedUser.id);

    const existingUser = db.prepare('SELECT id, firebase_uid FROM users WHERE email = ?').get(profile.email) as Row | undefined;
    if (existingUser) {
      if (existingUser.firebase_uid && existingUser.firebase_uid !== profile.uid) {
        throw conflict('Cette adresse e-mail est déjà liée à un autre compte Google.');
      }
      db.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?').run(profile.uid, String(existingUser.id));
      return String(existingUser.id);
    }

    const id = crypto.randomUUID();
    const name = profile.name?.trim().slice(0, 80) || profile.email.split('@')[0].slice(0, 80);
    db.prepare(
      `INSERT INTO users (id, name, email, phone, password_hash, location, firebase_uid)
       VALUES (?, ?, ?, '', ?, ?, ?)`
    ).run(id, name, profile.email, hashPassword(crypto.randomBytes(32).toString('base64url')), "Abidjan, Côte d'Ivoire", profile.uid);
    return id;
  });

authRouter.post('/google', limiter, async (req, res) => {
  const { idToken } = parse(GoogleSchema, req.body);
  const decoded = await verifyGoogleIdToken(idToken);
  if (
    decoded.firebase?.sign_in_provider !== 'google.com' ||
    decoded.email_verified !== true ||
    typeof decoded.email !== 'string'
  ) {
    throw new HttpError(401, 'Connectez-vous avec une adresse Google vérifiée.');
  }

  const verifiedEmail = email.parse(decoded.email);
  const userId = linkGoogleAccount({
    uid: decoded.uid,
    email: verifiedEmail,
    name: typeof decoded.name === 'string' ? decoded.name : undefined,
  });
  // Administration : adresses Google vérifiées listées dans ADMIN_EMAILS (séparées par des virgules).
  if (adminEmails().includes(verifiedEmail)) {
    db.prepare(`UPDATE users SET role = 'admin' WHERE id = ? AND role <> 'admin'`).run(userId);
  }
  createSession(res, userId);
  res.json({ user: loadMe(userId) });
});

authRouter.post('/logout', (req, res) => {
  destroySession(req, res);
  res.status(204).end();
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ? loadMe(req.user.id) : null });
});
