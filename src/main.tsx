import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { initPwa } from './pwa/pwa';
import { initMotionPreference, initRipples } from './utils/motion';
import './index.css';

// Avant le rendu : le navigateur peut proposer l'installation (beforeinstallprompt) dès le chargement.
initPwa();
// Réglage « Animations » du Profil, puis onde au toucher sur les boutons principaux.
initMotionPreference();
initRipples();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
