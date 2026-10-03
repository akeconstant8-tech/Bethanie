import React, { useId } from 'react';
import { LANGUAGES, Lang, useI18n } from '../i18n';

/** Drapeaux dessinés en SVG (les émojis drapeaux ne s'affichent pas sous Windows). */
export const Flag: React.FC<{ lang: Lang; className?: string }> = ({ lang, className = 'w-5 h-3.5' }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const box = `${className} shrink-0 rounded-[2px] ring-1 ring-black/10`;

  if (lang === 'fr') {
    return (
      <svg viewBox="0 0 3 2" preserveAspectRatio="none" className={box} aria-hidden="true">
        <rect width="1" height="2" fill="#002654" />
        <rect x="1" width="1" height="2" fill="#FFFFFF" />
        <rect x="2" width="1" height="2" fill="#CE1126" />
      </svg>
    );
  }

  // Union Jack
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={box} aria-hidden="true">
      <clipPath id={`uk-a-${id}`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`uk-b-${id}`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#uk-a-${id})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#uk-b-${id})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
};

/** Sélecteur de langue FR / EN avec drapeaux. */
export const LanguageSwitcher: React.FC<{ tone?: 'light' | 'brand'; compact?: boolean; className?: string }> = ({
  tone = 'light',
  compact = false,
  className = '',
}) => {
  const { lang, setLang, t } = useI18n();
  const brand = tone === 'brand';
  return (
    <div
      role="group"
      aria-label={t('lang.choose')}
      className={`inline-flex items-center rounded-full p-0.5 shrink-0 ${brand ? 'bg-white/15' : 'bg-slate-100'} ${className}`}
    >
      {LANGUAGES.map(({ id, name }) => {
        const active = lang === id;
        return (
          <button
            key={id}
            type="button"
            lang={id}
            onClick={() => setLang(id)}
            aria-pressed={active}
            aria-label={name}
            title={name}
            className={`h-7 rounded-full flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              compact ? 'px-1.5' : 'px-2.5'
            } ${
              active
                ? 'bg-white text-brand-900 shadow-sm'
                : brand
                ? 'text-white/80 hover:text-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flag lang={id} />
            {!compact && id.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
};
