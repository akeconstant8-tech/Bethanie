import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createSession, destroySession, hashPassword } from '../auth.ts';
import { db, transaction, type Row } from '../db.ts';
import { HttpError, conflict, parse } from '../http.ts';
import { loadMe } from '../serializers.ts';

export const authRouter = Router();

// Limite les tentatives pour freiner le devinage de mots de passe.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

const email = z.string().trim().toLowerCase().email('Adresse e-mail invalide.').max(120);
const GoogleSchema = z.object({ idToken: z.string().min(100).max(10_000) });

const getFirebaseAuth = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    throw new HttpError(503, 'La connexion Google n’est pas configurée sur le serveur.');
  }

  const app =
    getApps().find((candidate) => candidate.name === 'bethanie-auth') ??
    initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
        projectId,
      },
      'bethanie-auth'
    );
  return getAuth(app);
};

authRouter.post('/google', limiter, async (req, res) => {
  const { idToken } = parse(GoogleSchema, req.body);
  const decoded = await getFirebaseAuth().verifyIdToken(idToken, true).catch((error: unknown) => {
    const code =
      typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (
      ['auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled'].includes(
        code
      )
    ) {
      throw new HttpError(401, 'La session Google a expiré. Reconnectez-vous.');
    }
    throw error;
  });
  if (
    decoded.firebase?.sign_in_provider !== 'google.com' ||
    decoded.email_verified !== true ||
    typeof decoded.email !== 'string'
  ) {
    throw new HttpError(401, 'Connectez-vous avec une adresse Google vérifiée.');
  }

  const normalizedEmail = email.parse(decoded.email);
  const userId = transaction(() => {
    const linkedUser = db.prepare('SELECT id FROM users WHERE firebase_uid = ?').get(decoded.uid) as Row | undefined;
    if (linkedUser) return String(linkedUser.id);

    const existingUser = db
      .prepare('SELECT id, firebase_uid FROM users WHERE email = ?')
      .get(normalizedEmail) as Row | undefined;
    if (existingUser) {
      if (existingUser.firebase_uid && existingUser.firebase_uid !== decoded.uid) {
        throw conflict('Cette adresse e-mail est déjà liée à un autre compte Google.');
      }
      db.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?').run(decoded.uid, String(existingUser.id));
      return String(existingUser.id);
    }

    const id = crypto.randomUUID();
    const displayName = typeof decoded.name === 'string' ? decoded.name.trim().slice(0, 80) : '';
    const name = displayName || normalizedEmail.split('@')[0].slice(0, 80);
    db.prepare(
      `INSERT INTO users (id, name, email, phone, password_hash, location, firebase_uid)
       VALUES (?, ?, ?, '', ?, ?, ?)`
    ).run(
      id,
      name,
      normalizedEmail,
      hashPassword(crypto.randomBytes(32).toString('base64url')),
      "Abidjan, Côte d'Ivoire",
      decoded.uid
    );
    return id;
  });

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
