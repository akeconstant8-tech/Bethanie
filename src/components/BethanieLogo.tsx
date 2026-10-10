import React, { useId } from 'react';
import { useI18n } from '../i18n';

interface BethanieLogoProps {
  className?: string;
  /** full : sur fond clair • white : sur fond vert • icon : pictogramme seul */
  variant?: 'full' | 'icon' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** stacked : pictogramme au-dessus du nom (écran d'accueil, connexion). */
  layout?: 'row' | 'stacked';
  /** Le chariot se dessine et ses roues apparaissent (en-tête, au chargement). */
  animated?: boolean;
}

/** Contour simplifié du continent africain (repère 100 × 100). */
const AFRICA_PATH =
  'M21.6 7.1 32.6 5.9 42.4 5.5 41.4 9.5 45.4 10.8 52.6 14 53.9 11.8 60.1 12.3 67.6 12.5 69.5 14.4 75.4 27.4 78.3 32.4 83 36.3 85.1 38.9 93 37.1 93.1 38.9 85.4 49.4 78.5 56.9 78 60.4 79.5 65.6 72.4 76.6 69.6 84.4 67.6 89.3 60.9 94.4 53.9 95.4 51.9 94.4 47 80.6 45.6 67.6 45.4 62.9 44.3 59.4 40.6 51.4 41 46.9 36.4 46.5 33.1 43.9 28.9 44.9 26.4 46 23.9 45.3 19.3 46.4 15.4 44 12.4 41.3 8.9 37.5 7 33.5 8.9 29.4 7.6 25.9 10.8 19.4 16.9 13.9 19.4 9.9Z';

const ICON_SIZES = { sm: 'w-9 h-9', md: 'w-11 h-11', lg: 'w-20 h-20', xl: 'w-32 h-32' };
const TITLE_SIZES = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl', xl: 'text-5xl' };
const SUB_SIZES = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-xs', xl: 'text-sm' };

/** Pictogramme : l'Afrique dorée et le chariot. animated : le chariot se dessine et les roues apparaissent. */
export const BethanieMark: React.FC<{ className?: string; animated?: boolean }> = ({ className = '', animated = false }) => {
  // Les identifiants de useId contiennent des caractères (« : », « « ») mal acceptés dans url(#…).
  const gradientId = `bth-gold-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const wheel = animated ? 'wheel-in' : undefined;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4CD6E" />
          <stop offset="55%" stopColor="#E5A93C" />
          <stop offset="100%" stopColor="#B87C17" />
        </linearGradient>
      </defs>
      <path d={AFRICA_PATH} fill={`url(#${gradientId})`} stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="88" cy="75" rx="2.6" ry="7.5" transform="rotate(18 88 75)" fill="#D19A2E" />
      {/* Chariot */}
      <g fill="none" stroke="#0F5132" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M31 24h7l7 22h22l6-15H42" className={animated ? 'draw-path' : undefined} />
        <path d="M50 31l2 15M60 31l-1 15" strokeWidth="3" className={animated ? 'draw-path' : undefined} />
      </g>
      <circle cx="49" cy="53" r="3.6" fill="#0F5132" className={wheel} />
      <circle cx="64" cy="53" r="3.6" fill="#0F5132" className={wheel} />
    </svg>
  );
};

export const BethanieLogo: React.FC<BethanieLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  layout = 'row',
  animated = false,
}) => {
  const { t } = useI18n();
  const onDark = variant === 'white';
  const mark = <BethanieMark className={`${ICON_SIZES[size]} shrink-0 drop-shadow-sm`} animated={animated} />;

  if (variant === 'icon') return <span className={`inline-flex ${className}`}>{mark}</span>;

  const stacked = layout === 'stacked';
  return (
    <span className={`inline-flex ${stacked ? 'flex-col items-center text-center gap-3' : 'items-center gap-2.5'} ${className}`}>
      {mark}
      <span className={`flex flex-col ${stacked ? 'items-center' : ''}`}>
        <span
          className={`font-brand font-bold tracking-[0.06em] leading-none ${TITLE_SIZES[size]} ${
            onDark ? 'text-gold-400' : 'text-gold-700'
          }`}
        >
          BÉTHANIE
        </span>
        <span
          className={`font-semibold mt-1 whitespace-nowrap ${SUB_SIZES[size]} ${onDark ? 'text-white/85' : 'text-brand-900'}`}
        >
          {t('common.slogan')}
        </span>
      </span>
    </span>
  );
};
