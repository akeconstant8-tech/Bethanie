import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createSession, destroySession, hashPassword, verifyPasswordOrDummy } from '../auth.ts';
import { db, type Row } from '../db.ts';
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

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez votre nom complet.').max(80, 'Nom trop long.'),
  email,
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, '').length >= 8, 'Numéro de téléphone invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(200),
});

const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Indiquez votre mot de passe.').max(200),
});

authRouter.post('/register', limiter, (req, res) => {
  const data = parse(RegisterSchema, req.body);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
    throw conflict('Un compte existe déjà avec cette adresse e-mail.');
  }
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, name, email, phone, password_hash, location) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    data.name,
    data.email,
    data.phone,
    hashPassword(data.password),
    "Abidjan, Côte d'Ivoire"
  );
  createSession(res, id);
  res.status(201).json({ user: loadMe(id) });
});

authRouter.post('/login', limiter, (req, res) => {
  const data = parse(LoginSchema, req.body);
  const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(data.email) as Row | undefined;
  if (!verifyPasswordOrDummy(data.password, row ? String(row.password_hash) : undefined)) {
    throw new HttpError(401, 'E-mail ou mot de passe incorrect.');
  }
  const id = String(row!.id);
  createSession(res, id);
  res.json({ user: loadMe(id) });
});

authRouter.post('/logout', (req, res) => {
  destroySession(req, res);
  res.status(204).end();
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ? loadMe(req.user.id) : null });
});
