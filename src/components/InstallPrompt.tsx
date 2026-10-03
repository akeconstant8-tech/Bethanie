import React from 'react';
import { useI18n } from '../i18n';
import { BethanieMark } from './BethanieLogo';
import { BottomSheet, btnPrimary } from './ui';

/**
 * Bannière « Installez Béthanie » : affichée seulement quand l'installation est possible
 * (Android / Chrome / Edge, ou iPhone / iPad avec les instructions manuelles).
 */
export const InstallBanner: React.FC<{ onInstall: () => void; onDismiss: () => void }> = ({ onInstall, onDismiss }) => {
  const { t } = useI18n();
  return (
    <section
      className="animate-rise-in relative overflow-hidden rounded-2xl bg-white border border-gold-100 shadow-soft p-3.5 lg:p-4 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-3 lg:gap-x-4"
      aria-label={t('pwa.install')}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-gold-400 to-gold-600" aria-hidden="true"></span>
      <span className="w-12 h-12 rounded-2xl bg-brand-900 flex items-center justify-center shrink-0 shadow-soft">
        <BethanieMark className="w-9 h-9" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{t('pwa.bannerTitle')}</span>
        <span className="block text-xs text-slate-500 leading-snug">{t('pwa.bannerText')}</span>
      </span>
      <button
        onClick={onInstall}
        className={`${btnPrimary} h-10 px-4 text-sm col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto sm:col-start-3`}
      >
        <i className="fa-solid fa-download text-xs"></i>
        {t('pwa.install')}
      </button>
      <button
        onClick={onDismiss}
        className="w-10 h-10 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer col-start-3 row-start-1 sm:col-start-4"
        aria-label={t('pwa.later')}
        title={t('pwa.later')}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </section>
  );
};

/** iPhone / iPad : Safari ne propose pas l'installation automatique, on explique la marche à suivre. */
export const IosInstallSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t, rich } = useI18n();
  const shareIcon = (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 text-sky-600 align-middle mx-0.5">
      <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
    </span>
  );
  const steps = [
    rich('pwa.iosStep1', { icon: shareIcon }),
    t('pwa.iosStep2'),
    t('pwa.iosStep3'),
  ];
  return (
    <BottomSheet
      open={open}
      title={t('pwa.iosTitle')}
      onClose={onClose}
      footer={
        <button onClick={onClose} className={`${btnPrimary} w-full h-12`}>
          {t('pwa.gotIt')}
        </button>
      }
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="w-14 h-14 rounded-2xl bg-brand-900 flex items-center justify-center shadow-soft">
          <BethanieMark className="w-10 h-10" />
        </span>
        <p className="text-sm text-slate-600">{t('pwa.iosNote')}</p>
      </div>
      <ol className="space-y-3 stagger">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl bg-surface-light p-3.5 text-sm text-slate-700">
            <span className="w-7 h-7 rounded-full bg-gold-500 text-brand-dark text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="pt-1 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </BottomSheet>
  );
};
