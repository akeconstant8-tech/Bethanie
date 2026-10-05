import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { loadUser, requireAuth, requireClientHeader } from './auth.ts';
import { CSP_DIRECTIVES, OPENER_POLICY } from './security-policy.js';
import { geniusPayWebhook, sweepUnpaidOrders } from './payments.ts';
import { config } from './config.ts';
import { errorHandler } from './http.ts';
import { adminRouter } from './routes/admin.ts';
import { assistantRouter } from './routes/assistant.ts';
import { authRouter } from './routes/auth.ts';
import { catalogRouter } from './routes/catalog.ts';
import { meRouter } from './routes/me.ts';
import { ordersRouter } from './routes/orders.ts';
import { prepareData } from './startup.ts';

/** Limite de requêtes par minute et par adresse IP (vraie adresse du visiteur sur Vercel : trust proxy). */
const limited = (perMinute: number, error: string): RequestHandler =>
  rateLimit({ windowMs: 60 * 1000, limit: perMinute, standardHeaders: 'draft-7', legacyHeaders: false, message: { error } });

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Règles communes avec la version Vercel : server/security-policy.js.
      contentSecurityPolicy: { directives: CSP_DIRECTIVES },
      crossOriginOpenerPolicy: { policy: OPENER_POLICY },
    })
  );
  app.use(cookieParser());

  /* ---------- API ---------- */
  // Données prêtes avant toute réponse de l'API (tables, données de démonstration si la base est vide). Déjà fait au
  // démarrage du serveur local ; sur Vercel, à la première requête d'une instance (et réessayé si la base était
  // injoignable).
  app.use('/api', async (_req, _res, next) => {
    await prepareData();
    next();
  });
  // Notifications de paiement GeniusPay : appelées par GeniusPay (signature vérifiée), avant l'exigence X-Bethanie.
  // Corps brut conservé : la signature porte sur le texte exact reçu.
  app.post(
    '/api/payments/webhook/geniuspay',
    limited(60, 'Trop de notifications.'),
    express.json({ limit: '64kb', verify: (req, _res, buf) => ((req as typeof req & { rawBody?: Buffer }).rawBody = buf) }),
    geniusPayWebhook
  );
  // Plafond général par adresse IP (le site en fait une poignée par écran) : coupe court aux rafales de requêtes.
  app.use('/api', limited(300, 'Trop de requêtes. Réessayez dans une minute.'), requireClientHeader, loadUser);
  // Corps des requêtes : 300 Ko suffisent partout ; seules les photos d'un produit (vendeur connecté) vont jusqu'à
  // 4 Mo. Un visiteur anonyme ne peut donc plus faire lire 4 Mo au serveur sur n'importe quelle adresse.
  const photoBody = express.json({ limit: '4mb' });
  app.use('/api/products', (req, res, next) => (req.user ? photoBody(req, res, next) : next()));
  app.use('/api', express.json({ limit: '300kb' }));
  // Commandes non payées depuis 2 h : annulées et stock remis en vente (au plus une vérification par minute).
  app.use('/api', sweepUnpaidOrders);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/config', (_req, res) =>
    res.json({ demoMode: config.demoMode, paymentProvider: config.paymentProvider })
  );
  app.use('/api/auth', authRouter);
  app.use('/api/me', requireAuth, meRouter);
  app.use('/api/seller/assistant', requireAuth, assistantRouter);
  app.use('/api/admin', requireAuth, adminRouter);
  app.use('/api', catalogRouter);
  app.use('/api', ordersRouter); // chaque route exige une session (currentUser)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Route API inconnue.' });
  });

  /* ---------- Fichiers ---------- */
  app.use('/uploads', express.static(config.uploadsDir, { maxAge: '30d', fallthrough: false }));

  // En production (après `npm run build`), le même serveur sert le frontend.
  if (fs.existsSync(path.join(config.distDir, 'index.html'))) {
    app.use(
      express.static(config.distDir, {
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          const file = path.basename(filePath);
          if (file === 'sw.js' || file === 'manifest.webmanifest' || file === 'index.html') {
            // Toujours revalidés : c'est ainsi que les nouvelles versions de l'application sont détectées.
            res.setHeader('Cache-Control', 'no-cache');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            // Fichiers compilés : leur nom change à chaque version, ils peuvent être gardés un an.
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('/', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.distDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
};
