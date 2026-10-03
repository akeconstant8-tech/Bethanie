import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { initPwa } from './pwa/pwa';
import './index.css';

// Avant le rendu : le navigateur peut proposer l'installation (beforeinstallprompt) dès le chargement.
initPwa();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
