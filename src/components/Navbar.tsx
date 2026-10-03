import React, { useEffect, useState } from 'react';
import { NavigateParams, ScreenType } from '../types';
import { useI18n } from '../i18n';
import { CITIES } from '../utils/commerce';
import { BethanieLogo } from './BethanieLogo';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  cartCount: number;
  wishlistCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  userName?: string;
  /** Présent quand le navigateur propose l'installation de l'application. */
  onInstall?: () => void;
}

/** En-tête des écrans larges. Sur mobile, chaque écran affiche son propre en-tête et la barre d'onglets. */
export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  cartCount,
  wishlistCount,
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  userName,
  onInstall,
}) => {
  const { t, cityLabel } = useI18n();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Garde le champ aligné quand la recherche est effacée ailleurs (catalogue, catégories).
  useEffect(() => setLocalSearch(searchQuery), [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch.trim());
    if (currentScreen !== 'catalog') onNavigate('catalog');
  };

  const links: { label: string; active: boolean; onClick: () => void }[] = [
    { label: t('nav.home'), active: currentScreen === 'home', onClick: () => onNavigate('home') },
    {
      label: t('nav.categories'),
      active: currentScreen === 'categories' || currentScreen === 'catalog',
      onClick: () => onNavigate('categories'),
    },
    { label: t('common.orderTracking'), active: currentScreen === 'tracking', onClick: () => onNavigate('tracking') },
  ];

  return (
    <header className="hidden lg:block sticky top-0 z-50 shadow-sm [view-transition-name:site-header]">
      <div className="bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-18 flex items-center gap-4 xl:gap-6">
          <button onClick={() => onNavigate('home')} className="shrink-0 cursor-pointer" aria-label={t('nav.homeLabel')}>
            <BethanieLogo variant="white" size="md" />
          </button>

          <label className="flex items-center gap-2 text-sm text-white/90 shrink min-w-0 max-w-40 xl:max-w-none cursor-pointer hover:text-white">
            <i className="fa-solid fa-location-dot text-gold-400"></i>
            <span className="sr-only">{t('common.yourCity')}</span>
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-transparent border-0 font-medium focus:outline-none cursor-pointer min-w-0 truncate"
            >
              {CITIES.map((city) => (
                <option key={city} value={city} className="text-slate-800">
                  {cityLabel(city)}
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0" role="search">
            <div className="flex items-center bg-white rounded-full pl-4 pr-1 h-11 shadow-sm focus-within:ring-2 focus-within:ring-gold-400">
              <i className="fa-solid fa-magnifying-glass text-slate-400"></i>
              <input
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={t('common.searchPlaceholder')}
                aria-label={t('common.searchProduct')}
                className="flex-1 min-w-0 border-0 bg-transparent px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="h-9 px-4 xl:px-5 rounded-full bg-gold-500 hover:bg-gold-400 text-brand-dark text-sm font-semibold cursor-pointer"
              >
                {t('nav.searchButton')}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 shrink-0">
            {onInstall && (
              <button
                onClick={onInstall}
                className="animate-fade-in mr-1 inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-gold-400/60 text-gold-400 hover:bg-gold-500 hover:text-brand-dark text-sm font-semibold cursor-pointer"
                title={t('pwa.install')}
              >
                <i className="fa-solid fa-download text-xs"></i>
                {t('pwa.installShort')}
              </button>
            )}
            <span className="xl:hidden mr-1">
              <LanguageSwitcher tone="brand" compact />
            </span>
            <span className="hidden xl:block mr-2">
              <LanguageSwitcher tone="brand" />
            </span>
            <button
              onClick={() => onNavigate('account', { tab: 'wishlist' })}
              className="relative w-11 h-11 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label={t('common.myFavorites')}
              title={t('common.myFavorites')}
            >
              <i className="fa-regular fa-heart text-xl"></i>
              {wishlistCount > 0 && (
                <span
                  key={wishlistCount}
                  className="animate-bump absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-gold-500 text-brand-dark text-[10px] font-bold flex items-center justify-center"
                >
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('cart')}
              data-cart-target=""
              className={`relative w-11 h-11 rounded-full cursor-pointer ${currentScreen === 'cart' ? 'bg-white/15' : 'hover:bg-white/10'}`}
              aria-label={t('common.myCart')}
              title={t('common.myCart')}
            >
              <i className="fa-solid fa-cart-shopping text-xl"></i>
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="animate-bump absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full bg-gold-500 text-brand-dark text-[10px] font-bold flex items-center justify-center"
                >
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('account')}
              className={`ml-1 xl:ml-2 inline-flex items-center gap-2 h-11 px-3 xl:px-4 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                currentScreen === 'account' ? 'bg-white text-brand-900' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <i className="fa-regular fa-user"></i>
              <span className="max-w-24 xl:max-w-32 truncate">{userName ? userName.split(' ')[0] : t('common.signIn')}</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="bg-white border-b border-slate-200/80" aria-label={t('nav.sections')}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-11 flex items-center gap-7 text-sm">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={link.onClick}
              aria-current={link.active ? 'page' : undefined}
              className={`h-full border-b-2 font-medium cursor-pointer transition-colors ${
                link.active ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-600 hover:text-brand-900'
              }`}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => onNavigate('seller')}
            className={`h-full border-b-2 font-semibold cursor-pointer inline-flex items-center gap-1.5 ${
              currentScreen === 'seller' ? 'border-gold-600 text-gold-700' : 'border-transparent text-gold-700 hover:text-gold-600'
            }`}
          >
            <i className="fa-solid fa-store text-xs"></i>
            {t('nav.sell')}
          </button>
          <span className="ml-auto text-xs text-slate-500">
            <i className="fa-solid fa-truck-fast text-brand-700 mr-1.5"></i>
            {t('nav.expressDelivery')}
          </span>
        </div>
      </nav>
    </header>
  );
};
