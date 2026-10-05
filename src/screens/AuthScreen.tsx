import React, { useState } from 'react';
import { BethanieLogo } from '../components/BethanieLogo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { btnPrimary } from '../components/ui';
import { useI18n } from '../i18n';
import { errorMessage } from '../api/client';

interface AuthScreenProps {
  /** Pourquoi on demande la connexion (ex : « pour finaliser votre commande »). */
  reason?: string;
  onGoogleAuth: () => Promise<void>;
  /** Fin de l'accueil : permet de visiter le site sans compte. */
  onSkip?: () => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ reason, onGoogleAuth, onSkip }) => {
  const { t, rich } = useI18n();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const authenticate = async () => {
    setBusy(true);
    setError('');
    try {
      await onGoogleAuth();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] lg:min-h-0 bg-white lg:bg-surface-light lg:py-14 flex">
      <div className="w-full max-w-md mx-auto px-6 py-10 lg:p-10 lg:bg-white lg:rounded-3xl lg:border lg:border-slate-200/70 lg:shadow-sm flex flex-col">
        <div className="flex-1 flex flex-col justify-center animate-fade-in">
          <div className="flex justify-end -mt-4 mb-4 lg:hidden">
            <LanguageSwitcher />
          </div>
          <div className="flex justify-center">
            <BethanieLogo size="lg" layout="stacked" className="animate-scale-in" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 text-center mt-10">{t('auth.title')}</h1>
          <p className="text-sm text-slate-500 text-center mt-2 max-w-xs mx-auto">{t('auth.subtitle')}</p>

          {reason && (
            <p className="text-sm text-brand-900 bg-brand-50 rounded-xl px-4 py-3 mt-6 text-center">
              <i className="fa-solid fa-lock mr-2"></i>
              {t('auth.reason', { reason })}
            </p>
          )}

          <div className="space-y-3 mt-8 stagger">
            <button type="button" disabled={busy} onClick={authenticate} className={`${btnPrimary} w-full h-12`}>
              {busy ? <i className="fa-solid fa-spinner animate-spin" aria-hidden="true"></i> : <GoogleIcon />}
              {t('auth.google')}
            </button>
            <p className="text-xs text-slate-500 text-center">{t('auth.autoAccount')}</p>
          </div>

          {error && (
            <p className="animate-shake text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mt-4" role="alert">
              {error}
            </p>
          )}

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="mt-6 text-sm font-semibold text-brand-900 hover:underline cursor-pointer self-center"
            >
              {t('auth.skip')}
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500 text-center mt-8">
            {rich('auth.legal', {
              terms: <strong className="font-semibold text-brand-900">{t('auth.terms')}</strong>,
              privacy: <strong className="font-semibold text-brand-900">{t('auth.privacy')}</strong>,
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
