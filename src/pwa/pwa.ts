import { useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ */
/* Installation, service worker et état de la connexion               */
/* Ce module est importé par main.tsx avant le rendu : l'événement     */
/* beforeinstallprompt peut arriver très tôt.                          */
/* ------------------------------------------------------------------ */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** Android / Chrome / Edge : le navigateur propose l'installation (beforeinstallprompt reçu). */
  canInstall: boolean;
  /** iPhone / iPad : installation manuelle par « Sur l'écran d'accueil ». */
  isIOS: boolean;
  /** L'application est déjà ouverte en mode installé. */
  isStandalone: boolean;
  /** L'installation vient d'avoir lieu (événement appinstalled). */
  justInstalled: boolean;
  /** Une nouvelle version est prête : le bouton « Mettre à jour » l'active. */
  updateReady: boolean;
}

const detectIOS = () => {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac avec écran tactile.
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const detectStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

let state: PwaState = {
  canInstall: false,
  isIOS: detectIOS(),
  isStandalone: detectStandalone(),
  justInstalled: false,
  updateReady: false,
};
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let updating = false;
const listeners = new Set<() => void>();

const setState = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Ouvre la fenêtre d'installation du navigateur. Renvoie true si l'utilisateur accepte. */
export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  setState({ canInstall: false });
  return outcome === 'accepted';
};

/** Active la version en attente ; la page se recharge quand le nouveau service worker prend la main. */
export const applyUpdate = () => {
  if (!waitingWorker) return;
  updating = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
};

export const acknowledgeInstall = () => setState({ justInstalled: false });

const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const markReady = (worker: ServiceWorker) => {
      waitingWorker = worker;
      setState({ updateReady: true });
    };
    // Une mise à jour n'est proposée que si une version précédente contrôle déjà la page.
    if (registration.waiting && navigator.serviceWorker.controller) markReady(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) markReady(worker);
      });
    });
    // Sessions longues : vérifie la présence d'une nouvelle version toutes les heures.
    window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
  } catch {
    // Service worker indisponible (navigation privée, navigateur ancien) : le site fonctionne normalement.
  }
};

export const initPwa = () => {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // on affiche notre propre bouton « Installer l'application »
    deferredPrompt = event as BeforeInstallPromptEvent;
    setState({ canInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canInstall: false, justInstalled: true });
  });

  window.matchMedia('(display-mode: standalone)').addEventListener('change', () =>
    setState({ isStandalone: detectStandalone() })
  );

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) window.location.reload();
  });

  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', () => registerServiceWorker(), { once: true });
};

export const usePwa = () => useSyncExternalStore(subscribe, () => state);

/* ---------- Connexion internet ---------- */

const subscribeOnline = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

export const useOnlineStatus = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);

/* ---------- Écran de démarrage (index.html) ---------- */

/** Fait disparaître l'écran de démarrage affiché par index.html pendant le chargement. */
export const hideBootSplash = () => {
  const splash = document.getElementById('boot-splash');
  if (!splash || splash.dataset.hiding) return;
  splash.dataset.hiding = '1';
  // Affichage minimal de 350 ms depuis l'ouverture de la page, pour éviter un simple clignotement.
  const delay = Math.max(0, 350 - performance.now());
  window.setTimeout(() => {
    splash.classList.add('is-hidden');
    window.setTimeout(() => splash.remove(), 450);
  }, delay);
};

/* ---------- Préférence « réduire les animations » ---------- */

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
