import React from 'react';
import { NavigateParams, ScreenType } from '../types';
import { useI18n } from '../i18n';
import { BethanieLogo } from './BethanieLogo';
import { useReveal } from './ui';

interface FooterProps {
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
}

/** Pied de page des écrans larges (sur mobile, la barre d'onglets le remplace). */
export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  // Colonnes qui apparaissent l'une après l'autre quand le pied de page entre dans l'écran.
  const reveal = useReveal<HTMLDivElement>();
  const column = (i: number) => ({ 'data-reveal': reveal['data-reveal'], style: { '--delay': `${i * 90}ms` } as React.CSSProperties });
  // Liens : couleur dorée et léger glissement vers la droite au survol.
  const linkClass = 'hover:text-gold-400 hover:translate-x-0.5 transition-[color,translate] duration-200 text-left cursor-pointer';
  return (
    <footer className="hidden lg:block bg-brand-dark text-white/70 text-sm" id="a-propos">
      <div className="h-3 bg-pattern-kente opacity-60" aria-hidden="true"></div>
      <div className="max-w-7xl mx-auto px-8 pt-14 pb-8">
        <div ref={reveal.ref} className="grid grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 space-y-4" {...column(0)}>
            <BethanieLogo variant="white" size="md" />
            <p className="text-sm leading-relaxed max-w-sm">{t('common.tagline')}</p>
            <div className="flex gap-2 pt-1">
              <a
                href="mailto:contact@bethanie.ci"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-gold-500 hover:text-brand-dark hover:-translate-y-0.5 text-white flex items-center justify-center transition-[color,background-color,translate] duration-200"
                aria-label={t('footer.email')}
              >
                <i className="fa-solid fa-envelope text-sm"></i>
              </a>
            </div>
          </div>

          <div {...column(1)}>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">{t('footer.shop')}</h4>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => onNavigate('categories')} className={linkClass}>
                  {t('footer.allCategories')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog', { category: 'all' })} className={linkClass}>
                  {t('footer.fullCatalog')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('tracking')} className={linkClass}>
                  {t('footer.trackOrder')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account', { tab: 'wishlist' })} className={linkClass}>
                  {t('common.myFavorites')}
                </button>
              </li>
            </ul>
          </div>

          <div {...column(2)}>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">{t('footer.sell')}</h4>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => onNavigate('seller')} className={linkClass}>
                  {t('common.openShop')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('seller', { sellerTab: 'new' })} className={linkClass}>
                  {t('common.addProduct')}
                </button>
              </li>
              <li>{t('footer.commission')}</li>
              <li>{t('footer.payout')}</li>
            </ul>
          </div>

          <div {...column(3)}>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex gap-2.5">
                <i className="fa-solid fa-phone text-gold-400 mt-1 text-xs"></i>+225 07 07 07 07
              </li>
              <li className="flex gap-2.5">
                <i className="fa-solid fa-envelope text-gold-400 mt-1 text-xs"></i>contact@bethanie.ci
              </li>
              <li className="flex gap-2.5">
                <i className="fa-solid fa-location-dot text-gold-400 mt-1 text-xs"></i>Abidjan, Cocody Riviera Palmeraie
              </li>
              <li className="flex gap-2.5">
                <i className="fa-regular fa-clock text-gold-400 mt-1 text-xs"></i>
                {t('footer.hours')}
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
          <p>{t('footer.rights')}</p>
          <p className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-gold-400"></i>
            {t('footer.payments')}
          </p>
        </div>
      </div>
    </footer>
  );
};
