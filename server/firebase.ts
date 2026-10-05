/* Vérification des connexions Google (Firebase Authentication) côté serveur.
 *
 * Le site ouvre la fenêtre Google avec Firebase, puis envoie au serveur le jeton d'identité obtenu (ID token).
 * Le serveur vérifie ce jeton avec firebase-admin avant d'ouvrir une session Béthanie.
 *
 * Deux niveaux, selon les variables présentes :
 *  - projet seul (FIREBASE_PROJECT_ID, ou à défaut VITE_FIREBASE_PROJECT_ID, déjà utilisée par le site) :
 *    signature Google, projet, émetteur et date d'expiration du jeton sont vérifiés. Aucune clé secrète n'est
 *    nécessaire : les clés publiques de Google suffisent ;
 *  - projet + compte de service (FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY) : en plus, refus des comptes
 *    Google désactivés ou dont les sessions ont été révoquées dans la console Firebase.
 *
 * Les journaux du serveur indiquent la variable manquante ; le visiteur ne reçoit jamais de détail technique.
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import { HttpError } from './http.ts';

type FirebaseStatus =
  | { ready: false; missing: string[] }
  | { ready: true; projectId: string; serviceAccount: boolean; warnings: string[] };

/** État de la configuration, d'après les variables d'environnement (jamais leurs valeurs). */
export const firebaseStatus = (env: NodeJS.ProcessEnv = process.env): FirebaseStatus => {
  const projectId = env.FIREBASE_PROJECT_ID?.trim() || env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return { ready: false, missing: ['FIREBASE_PROJECT_ID (ou VITE_FIREBASE_PROJECT_ID)'] };

  const warnings: string[] = [];
  const hasEmail = Boolean(env.FIREBASE_CLIENT_EMAIL?.trim());
  const hasKey = Boolean(env.FIREBASE_PRIVATE_KEY?.trim());
  if (hasEmail !== hasKey) {
    warnings.push(`compte de service incomplet : ${hasEmail ? 'FIREBASE_PRIVATE_KEY' : 'FIREBASE_CLIENT_EMAIL'} manquante`);
  }
  if (env.FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID && env.FIREBASE_PROJECT_ID !== env.VITE_FIREBASE_PROJECT_ID) {
    warnings.push(
      `FIREBASE_PROJECT_ID (${env.FIREBASE_PROJECT_ID}) diffère de VITE_FIREBASE_PROJECT_ID (${env.VITE_FIREBASE_PROJECT_ID}) : ` +
        'les jetons du site seront refusés'
    );
  }
  return { ready: true, projectId, serviceAccount: hasEmail && hasKey, warnings };
};

/** Ligne de journal décrivant la configuration (affichée au démarrage du serveur). */
export const describeFirebaseStatus = (status = firebaseStatus()) => {
  if (status.ready === false) return `Connexion Google désactivée : variable manquante ${status.missing.join(', ')}.`;
  const level = status.serviceAccount
    ? 'vérification complète (compte de service)'
    : 'vérification de la signature Google (sans compte de service : FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY absentes, comptes désactivés non détectés)';
  return [`Connexion Google : projet Firebase « ${status.projectId} », ${level}.`, ...status.warnings.map((w) => `Attention : ${w}.`)].join(
    '\n[api] '
  );
};

let cached: { auth: Auth; checkRevoked: boolean; projectId: string } | undefined;

const firebaseAuth = () => {
  if (cached) return cached;
  const status = firebaseStatus();
  if (status.ready === false) {
    console.error(`[api] ${describeFirebaseStatus(status)}`);
    throw new HttpError(503, 'La connexion Google n’est pas configurée sur le serveur.');
  }

  let app: App | undefined = getApps().find((candidate) => candidate.name === 'bethanie-auth');
  let checkRevoked = false;
  if (!app && status.serviceAccount) {
    try {
      app = initializeApp(
        {
          credential: cert({
            projectId: status.projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!.trim(),
            // Sur Vercel comme dans .env.local, les retours à la ligne de la clé sont souvent écrits « \n ».
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          }),
          projectId: status.projectId,
        },
        'bethanie-auth'
      );
      checkRevoked = true;
    } catch (error) {
      console.error(
        '[api] FIREBASE_PRIVATE_KEY ou FIREBASE_CLIENT_EMAIL illisible ; vérification sans compte de service.',
        error instanceof Error ? error.message : ''
      );
    }
  }
  app ??= initializeApp({ projectId: status.projectId }, 'bethanie-auth');
  cached = { auth: getAuth(app), checkRevoked, projectId: status.projectId };
  return cached;
};

const errorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';

/** Vérifie le jeton envoyé par le site ; erreurs 401/503 lisibles pour le visiteur, détail dans les journaux. */
export const verifyGoogleIdToken = async (idToken: string): Promise<DecodedIdToken> => {
  const { auth, checkRevoked, projectId } = firebaseAuth();
  try {
    return await auth.verifyIdToken(idToken, checkRevoked);
  } catch (error) {
    const code = errorCode(error);
    const detail = error instanceof Error ? error.message : String(error);
    if (code === 'auth/id-token-expired' || code === 'auth/id-token-revoked') {
      throw new HttpError(401, 'La session Google a expiré. Reconnectez-vous.');
    }
    if (code === 'auth/user-disabled') {
      throw new HttpError(403, 'Ce compte Google a été désactivé.');
    }
    if (/"aud"|audience/i.test(detail)) {
      console.error(
        `[api] Jeton Google d’un autre projet Firebase : le serveur attend « ${projectId} ». ` +
          'Vérifiez que FIREBASE_PROJECT_ID et VITE_FIREBASE_PROJECT_ID désignent le même projet.'
      );
    } else {
      console.error(`[api] Jeton Google refusé (${code || 'erreur'}) : ${detail.split('\n')[0].slice(0, 200)}`);
    }
    if (code.startsWith('auth/')) throw new HttpError(401, 'La connexion Google a échoué. Réessayez.');
    throw new HttpError(502, 'Le service de connexion Google ne répond pas. Réessayez dans un instant.');
  }
};
