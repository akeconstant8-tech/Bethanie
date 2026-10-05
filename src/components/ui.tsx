import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OrderStatus } from '../types';
import { useI18n } from '../i18n';
import { prefersReducedMotion } from '../pwa/pwa';
import { STATUS_STYLES } from '../utils/commerce';

/* ------------------------------------------------------------------ */
/* Styles partagés (boutons, champs) — repris de la maquette          */
/* ------------------------------------------------------------------ */

/** Transition commune : couleurs, ombre et léger enfoncement au clic (règle globale button:active, index.css). */
const press = 'transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out';

export const btnPrimary = `ripple inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 hover:bg-brand-dark hover:shadow-[0_10px_24px_-10px_rgba(15,81,50,0.6)] text-white font-semibold cursor-pointer disabled:bg-slate-300 disabled:text-white disabled:shadow-none ${press}`;
export const btnGold = `shine ripple inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-400 hover:shadow-glow text-brand-dark font-semibold cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${press}`;
export const btnOutline = `inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:border-brand-900 hover:shadow-soft text-slate-800 font-semibold cursor-pointer disabled:opacity-50 ${press}`;
export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm placeholder:text-slate-400 transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10';
export const cardClass = 'bg-white rounded-2xl border border-slate-200/70 shadow-soft';

/* ------------------------------------------------------------------ */
/* Animations : apparition au défilement, compteurs                    */
/* ------------------------------------------------------------------ */

/**
 * Fait apparaître un élément quand il entre dans l'écran (opacité + léger glissement, voir index.css).
 * Usage : const reveal = useReveal(); <section {...reveal}>…</section>
 */
export const useReveal = <T extends HTMLElement = HTMLElement>(delay = 0) => {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window) || prefersReducedMotion()) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    'data-reveal': shown ? 'shown' : '',
    style: { '--delay': `${delay}ms` } as React.CSSProperties,
  };
};

/** Nombre qui défile jusqu'à sa valeur (statistiques, tableaux de bord). */
export const CountUp: React.FC<{
  value: number;
  format?: (value: number) => string;
  duration?: number;
  /** false : affiche directement la valeur, puis anime seulement ses changements (total du panier…). */
  animateOnMount?: boolean;
}> = ({ value, format = (n) => Math.round(n).toLocaleString('fr-FR'), duration = 800, animateOnMount = true }) => {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() || !animateOnMount ? value : 0));
  const from = useRef(display);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = origin + (value - origin) * eased;
      from.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden="true">{format(display)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Éclats autour du cœur (ajout aux favoris)                           */
/* ------------------------------------------------------------------ */

const BURST_COLORS = ['#ef4444', '#e5a93c', '#f97316', '#ef4444', '#0f5132', '#e5a93c', '#f43f5e', '#f4cd6e'];

/** Anneau et 8 éclats qui partent du cœur ; à afficher avec une `key` nouvelle à chaque ajout. */
export const HeartBurst: React.FC = () =>
  prefersReducedMotion() ? null : (
    <span aria-hidden="true" className="heart-burst">
      {BURST_COLORS.map((color, i) => (
        <span key={i} style={{ '--a': `${i * 45}deg`, '--c': color } as React.CSSProperties}></span>
      ))}
    </span>
  );

/* ------------------------------------------------------------------ */
/* Confettis (paiement accepté)                                        */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = ['#0f5132', '#e5a93c', '#f4cd6e', '#10b981', '#a7f3d0', '#c2410c'];

/** Nombre pseudo-aléatoire stable (même dessin à chaque rendu). */
const noise = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const CONFETTI = Array.from({ length: 40 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 40 + (noise(i, 1) - 0.5) * 0.4;
  const power = 90 + noise(i, 2) * 90;
  const x1 = Math.cos(angle) * power;
  const y1 = Math.sin(angle) * power * 0.75 - 50;
  const round = noise(i, 6) > 0.7;
  return {
    '--x1': `${x1.toFixed(0)}px`,
    '--y1': `${y1.toFixed(0)}px`,
    '--x2': `${(x1 * 1.35 + (noise(i, 3) - 0.5) * 60).toFixed(0)}px`,
    '--y2': `${(y1 + 240 + noise(i, 4) * 200).toFixed(0)}px`,
    '--r': `${((noise(i, 5) - 0.5) * 1080).toFixed(0)}deg`,
    '--d': `${(1.4 + noise(i, 7) * 0.8).toFixed(2)}s`,
    '--delay': `${(noise(i, 8) * 120).toFixed(0)}ms`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: round ? 8 : 6 + Math.round(noise(i, 9) * 4),
    height: round ? 8 : 10 + Math.round(noise(i, 10) * 6),
    borderRadius: round ? 9999 : 2,
  } as React.CSSProperties;
});

/** Gerbe de confettis qui part du centre de l'élément (une seule fois). Rien si les animations sont réduites. */
export const Confetti: React.FC<{ className?: string }> = ({ className = '' }) =>
  prefersReducedMotion() ? null : (
    <div aria-hidden="true" className={`pointer-events-none h-0 ${className}`}>
      {CONFETTI.map((style, i) => (
        <span key={i} className="confetti-piece" style={style}></span>
      ))}
    </div>
  );

/* ------------------------------------------------------------------ */
/* Squelettes de chargement                                            */
/* ------------------------------------------------------------------ */

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`skeleton block rounded-xl ${className}`} aria-hidden="true"></span>
);

export const ProductGridSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 8,
  className = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}) => (
  <div className={`grid gap-3 lg:gap-5 ${className}`} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
        <Skeleton className="aspect-square rounded-none" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-2/3" />
          <div className="flex items-end justify-between pt-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Page en cours de chargement : en-tête, bannière, rangée de pastilles et grille de produits. */
export const PageSkeleton: React.FC = () => {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t('common.loading')} className="animate-fade-in">
      <div className="lg:hidden h-16 bg-white border-b border-slate-100 px-4 flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8 space-y-6">
        <Skeleton className="h-40 lg:h-64 rounded-2xl lg:rounded-3xl" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <ProductGridSkeleton count={8} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* En-tête des écrans sur mobile                                       */
/* ------------------------------------------------------------------ */

interface MobileHeaderProps {
  title?: React.ReactNode;
  onBack?: () => void;
  actions?: React.ReactNode;
  /** brand : bandeau vert (accueil, catégories) • light : fond blanc */
  tone?: 'light' | 'brand';
  children?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title, onBack, actions, tone = 'light', children }) => {
  const { t } = useI18n();
  const brand = tone === 'brand';
  return (
    <header
      className={`lg:hidden sticky top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 ${
        brand ? 'bg-brand-900 text-white' : 'bg-white/95 backdrop-blur border-b border-slate-100 text-slate-900'
      }`}
    >
      {(title || onBack || actions) && (
        <div className="flex items-center gap-2 min-h-10">
          {onBack && (
            <button
              onClick={onBack}
              className={`group -ml-2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                brand ? 'hover:bg-white/10' : 'hover:bg-slate-100'
              }`}
              aria-label={t('common.back')}
            >
              <i className="fa-solid fa-arrow-left text-lg transition-transform duration-200 group-hover:-translate-x-0.5"></i>
            </button>
          )}
          <div className={`flex-1 min-w-0 font-display font-semibold text-lg truncate animate-fade-in ${onBack ? '' : 'pl-0.5'}`}>
            {title}
          </div>
          {actions && <div className="flex items-center gap-1 -mr-2">{actions}</div>}
        </div>
      )}
      {children}
    </header>
  );
};

export const HeaderIconButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  badge?: number;
  tone?: 'light' | 'brand';
  /** Animation de l'icône (ex : la cloche qui s'agite quand une commande est en cours). */
  iconClassName?: string;
}> = ({ icon, label, onClick, badge, tone = 'light', iconClassName = '' }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
      tone === 'brand' ? 'hover:bg-white/10' : 'hover:bg-slate-100 text-slate-700'
    }`}
  >
    <i className={`${icon} text-lg ${iconClassName}`}></i>
    {badge !== undefined && badge > 0 && (
      <span
        key={badge}
        className="animate-bump absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-gold-500 text-brand-dark text-[10px] font-bold flex items-center justify-center"
      >
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

/* ------------------------------------------------------------------ */
/* Titre de page (ordinateur)                                          */
/* ------------------------------------------------------------------ */

export const PageTitle: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="hidden lg:flex items-end justify-between gap-4 mb-6 animate-rise-in">
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const SectionHeader: React.FC<{ title: React.ReactNode; actionLabel?: string; onAction?: () => void }> = ({
  title,
  actionLabel,
  onAction,
}) => {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4 mb-3 lg:mb-5">
      <h2 className="text-base lg:text-2xl font-semibold text-slate-900">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-900 hover:text-brand-700 cursor-pointer"
        >
          {actionLabel ?? t('common.seeAll')}
          <i className="fa-solid fa-chevron-right text-[10px] transition-transform duration-200 group-hover:translate-x-0.5"></i>
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Petits éléments                                                     */
/* ------------------------------------------------------------------ */

export const QuantityStepper: React.FC<{
  value: number;
  max: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
}> = ({ value, max, onChange, size = 'md' }) => {
  const { t } = useI18n();
  const box = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className={`${box} flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-l-xl disabled:text-slate-300 cursor-pointer`}
        aria-label={t('common.decreaseQty')}
      >
        <i className="fa-solid fa-minus text-[10px]"></i>
      </button>
      <span
        key={value}
        className={`${size === 'sm' ? 'w-7 text-sm' : 'w-9'} text-center font-semibold tabular-nums animate-pop`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={`${box} flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded-r-xl disabled:text-slate-300 cursor-pointer`}
        aria-label={t('common.increaseQty')}
      >
        <i className="fa-solid fa-plus text-[10px]"></i>
      </button>
    </div>
  );
};

export const Stars: React.FC<{ rating: number; className?: string }> = ({ rating, className = 'text-xs' }) => {
  const { t } = useI18n();
  return (
    <span className={`inline-flex gap-0.5 text-gold-500 ${className}`} role="img" aria-label={t('common.rating', { rating })}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={`fa-solid fa-star ${i < Math.round(rating) ? '' : 'text-slate-200'}`}></i>
      ))}
    </span>
  );
};

export const StatusPill: React.FC<{ status: OrderStatus; className?: string }> = ({ status, className = '' }) => {
  const { statusLabel } = useI18n();
  return (
    <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[status]} ${className}`}>
      {statusLabel(status)}
    </span>
  );
};

export const EmptyState: React.FC<{
  icon: string;
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, text, action, className = '' }) => (
  <div className={`${cardClass} px-6 py-12 text-center animate-rise-in ${className}`}>
    <div className="relative w-16 h-16 mx-auto mb-4">
      <span className="absolute -inset-2 rounded-full bg-brand-50/70" aria-hidden="true"></span>
      <span className="relative w-16 h-16 rounded-full bg-brand-50 text-brand-900 flex items-center justify-center text-2xl animate-pop">
        <i className={icon}></i>
      </span>
    </div>
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    {text && <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Panneau qui monte du bas de l'écran (filtres, menus)                */
/* ------------------------------------------------------------------ */

const SHEET_EXIT_MS = 220;

export const BottomSheet: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, title, onClose, children, footer }) => {
  const { t } = useI18n();
  // Le panneau reste affiché le temps de son animation de fermeture.
  const [rendered, setRendered] = useState(open);
  const closing = rendered && !open;

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    const timer = window.setTimeout(() => setRendered(false), SHEET_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!rendered) return null;
  // Rendu à la racine de la page : un écran animé ne peut pas faire passer le panneau sous la barre d'onglets.
  return createPortal(
    <div className="fixed inset-0 z-80 flex items-end lg:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={onClose}
      ></div>
      <div
        className={`relative w-full lg:max-w-lg max-h-[85vh] bg-white rounded-t-3xl lg:rounded-3xl flex flex-col shadow-lift ${
          closing ? 'animate-sheet-out lg:animate-toast-out' : 'animate-sheet-in lg:animate-scale-in'
        }`}
      >
        <div className="lg:hidden mx-auto mt-2.5 w-10 h-1.5 rounded-full bg-slate-200"></div>
        <div className="flex items-center justify-between px-5 pt-3 pb-3 lg:pt-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 cursor-pointer" aria-label={t('common.close')}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
