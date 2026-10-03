import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useOnlineStatus } from '../pwa/pwa';

type Phase = 'hidden' | 'offline' | 'restored' | 'leaving';

/**
 * Pastille en haut de l'écran : « Vous êtes actuellement hors connexion » tant que la connexion est coupée,
 * puis « Connexion rétablie » pendant 3 secondes.
 */
export const ConnectionStatus: React.FC = () => {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const [phase, setPhase] = useState<Phase>(online ? 'hidden' : 'offline');
  const wasOffline = useRef(!online);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setPhase('offline');
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setPhase('restored');
    const leave = window.setTimeout(() => setPhase('leaving'), 3000);
    const hide = window.setTimeout(() => setPhase('hidden'), 3300);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(hide);
    };
  }, [online]);

  if (phase === 'hidden') return null;
  const offline = phase === 'offline';
  return (
    <div
      className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-110 flex justify-center px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <p
        className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium shadow-lift ${
          offline ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'
        } ${phase === 'leaving' ? 'animate-slide-up-out' : 'animate-slide-down'}`}
      >
        <i className={`fa-solid ${offline ? 'fa-wifi text-amber-300' : 'fa-circle-check animate-pop'}`}></i>
        {offline ? t('net.offline') : t('net.online')}
        {offline && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" aria-hidden="true"></span>}
      </p>
    </div>
  );
};
