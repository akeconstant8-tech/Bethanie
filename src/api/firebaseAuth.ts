import { initializeApp, getApps } from '@firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from '@firebase/auth';
import { en } from '../i18n/en';
import { fr } from '../i18n/fr';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const message = (key: 'auth.firebaseConfigMissing' | 'auth.googleCancelled' | 'auth.googleDomain' | 'auth.googleFailed') =>
  (document.documentElement.lang === 'en' ? en : fr)[key];

export const signInWithGoogle = async () => {
  if (Object.values(config).some((value) => !value)) {
    throw new Error(message('auth.firebaseConfigMissing'));
  }

  const app = getApps().find((candidate) => candidate.name === 'bethanie-auth') ?? initializeApp(config, 'bethanie-auth');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(getAuth(app), provider);
    return result.user.getIdToken();
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error(message('auth.googleCancelled'));
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(message('auth.googleDomain'));
    }
    throw new Error(message('auth.googleFailed'));
  }
};
