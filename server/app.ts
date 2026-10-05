import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { loadUser, requireAuth, requireClientHeader } from './auth.ts';
import { CSP_DIRECTIVES, OPENER_POLICY } from './security-policy.js';
import { sweepUnpaidOrders } from './transactions.ts';
import { config } from './config.ts';
import { errorHandler } from './http.ts';
import { adminRouter } from './routes/admin.ts';
import { assistantRouter } from './routes/assistant.ts';
import { authRouter } from './routes/auth.ts';
import { catalogRouter } from './routes/catalog.ts';
import { meRouter } from './routes/me.ts';
import { ordersRouter } from './routes/orders.ts';

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
  app.use(express.json({ limit: '4mb' }));
  app.use(cookieParser());

  /* ---------- API ---------- */
  app.use('/api', requireClientHeader, loadUser);
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
