import React, { useState } from 'react';
import { BethanieLogo } from '../components/BethanieLogo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { btnOutline, btnPrimary, inputClass } from '../components/ui';
import { useI18n } from '../i18n';
import { errorMessage } from '../api/client';

interface AuthScreenProps {
  /** Pourquoi on demande la connexion (ex : « pour finaliser votre commande »). */
  reason?: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  /** Fin de l'accueil : permet de visiter le site sans compte. */
  onSkip?: () => void;
}

type Step = 'choice' | 'login' | 'register';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ reason, onLogin, onRegister, onSkip }) => {
  const { t, rich } = useI18n();
  const [step, setStep] = useState<Step>('choice');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    setError('');
  };

  const goTo = (next: Step) => {
    setStep(next);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (step === 'login') await onLogin(form.email, form.password);
      else await onRegister(form);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const legal = (
    <p className="text-[11px] leading-relaxed text-slate-500 text-center mt-8">
      {rich('auth.legal', {
        terms: <strong className="font-semibold text-brand-900">{t('auth.terms')}</strong>,
        privacy: <strong className="font-semibold text-brand-900">{t('auth.privacy')}</strong>,
      })}
    </p>
  );

  return (
    <div className="min-h-[calc(100dvh-4rem)] lg:min-h-0 bg-white lg:bg-surface-light lg:py-14 flex">
      <div className="w-full max-w-md mx-auto px-6 py-10 lg:p-10 lg:bg-white lg:rounded-3xl lg:border lg:border-slate-200/70 lg:shadow-sm flex flex-col">
        {step === 'choice' ? (
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
              <button type="button" disabled className={`${btnOutline} w-full h-12`} title={t('auth.soonTitle')}>
                <GoogleIcon />
                {t('auth.google')}
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {t('auth.soon')}
                </span>
              </button>
              <button type="button" onClick={() => goTo('login')} className={`${btnPrimary} w-full h-12`}>
                <i className="fa-regular fa-envelope"></i>
                {t('auth.withEmail')}
              </button>
              <div className="flex items-center gap-3 py-1 text-xs text-slate-400" aria-hidden="true">
                <span className="flex-1 h-px bg-slate-200"></span>
                {t('auth.or')}
                <span className="flex-1 h-px bg-slate-200"></span>
              </div>
              <button type="button" onClick={() => goTo('register')} className={`${btnOutline} w-full h-12`}>
                {t('auth.createAccount')}
              </button>
            </div>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="mt-6 text-sm font-semibold text-brand-900 hover:underline cursor-pointer self-center"
              >
                {t('auth.skip')}
              </button>
            )}
            {legal}
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => goTo('choice')}
                className="-ml-2 w-10 h-10 rounded-full hover:bg-slate-100 cursor-pointer"
                aria-label={t('common.back')}
              >
                <i className="fa-solid fa-arrow-left text-lg"></i>
              </button>
              <BethanieLogo variant="icon" size="sm" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {step === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              {step === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {step === 'register' && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    {t('auth.fullName')}
                    <input value={form.name} onChange={set('name')} autoComplete="name" className={`${inputClass} mt-1.5`} required />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    {t('common.phone')}
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      autoComplete="tel"
                      placeholder="+225 07 00 00 00 00"
                      className={`${inputClass} mt-1.5`}
                      required
                    />
                  </label>
                </>
              )}
              <label className="block text-sm font-medium text-slate-700">
                {t('auth.email')}
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
                  className={`${inputClass} mt-1.5`}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t('auth.password')}
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    autoComplete={step === 'login' ? 'current-password' : 'new-password'}
                    minLength={step === 'register' ? 8 : undefined}
                    className={`${inputClass} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {step === 'register' && <span className="block text-xs text-slate-400 font-normal mt-1">{t('auth.passwordHint')}</span>}
              </label>

              {error && (
                <p key={error} className="animate-shake text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={`${btnPrimary} w-full h-12`}>
                {busy ? (
                  <i className="fa-solid fa-spinner animate-spin"></i>
                ) : step === 'login' ? (
                  t('common.signIn')
                ) : (
                  t('auth.signUp')
                )}
              </button>
            </form>

            <p className="text-sm text-slate-500 text-center mt-5">
              {step === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
              <button
                type="button"
                onClick={() => goTo(step === 'login' ? 'register' : 'login')}
                className="font-semibold text-brand-900 hover:underline cursor-pointer"
              >
                {step === 'login' ? t('auth.createAccount') : t('common.signIn')}
              </button>
            </p>

            {step === 'login' && (
              <div className="mt-6 rounded-2xl bg-gold-50 border border-gold-100 p-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">{t('auth.demoTitle')}</p>
                <p>
                  <code className="text-brand-900">pierre@gmail.com</code> • <code className="text-brand-900">bethanie123</code>
                </p>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, email: 'pierre@gmail.com', password: 'bethanie123' })}
                  className="mt-2 font-semibold text-brand-900 hover:underline cursor-pointer"
                >
                  {t('auth.demoFill')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
