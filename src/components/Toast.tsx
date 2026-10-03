import React from 'react';
import { useI18n } from '../i18n';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'success' | 'info' | 'error';
  action?: { label: string; onClick: () => void };
  /** Durée d'affichage en millisecondes ; 0 = reste affiché jusqu'à fermeture. */
  duration?: number;
  /** En cours de disparition (animation de sortie). */
  leaving?: boolean;
}

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const toneIcons = {
  success: 'fa-circle-check text-emerald-400',
  info: 'fa-circle-info text-gold-400',
  error: 'fa-circle-exclamation text-red-400',
};

/** Notifications : au-dessus de la barre d'onglets sur mobile, en bas à droite sur ordinateur. */
export const ToastStack: React.FC<ToastStackProps> = ({ toasts, onDismiss }) => {
  const { t } = useI18n();
  return (
    <div
      className="fixed left-4 right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:left-auto lg:right-6 lg:bottom-6 z-100 flex flex-col gap-2 lg:w-96"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`relative overflow-hidden bg-brand-dark text-white rounded-2xl shadow-lift pl-4 pr-2 py-3 flex items-center gap-3 ${
            toast.leaving ? 'animate-toast-out' : 'animate-toast-in'
          }`}
        >
          <i className={`fa-solid ${toneIcons[toast.tone ?? 'success']} animate-pop`}></i>
          <p className="text-sm font-medium flex-1">{toast.text}</p>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="text-sm font-semibold text-gold-400 hover:text-gold-500 whitespace-nowrap px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-white/50 hover:text-white w-9 h-9 rounded-full hover:bg-white/5 cursor-pointer"
            aria-label={t('common.close')}
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
          {toast.duration !== 0 && (
            <span
              className="absolute bottom-0 left-0 h-0.5 w-full bg-gold-400/70 origin-left"
              style={{ animation: `shrink-x ${toast.duration ?? 4000}ms linear forwards` }}
              aria-hidden="true"
            ></span>
          )}
        </div>
      ))}
    </div>
  );
};
