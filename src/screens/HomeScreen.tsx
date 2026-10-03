import React, { useMemo, useState } from 'react';
import { NavigateParams, Product, ScreenType } from '../types';
import { INITIAL_CATEGORIES, artisanWoodworkerImg, homeBannerImg } from '../data/mockData';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ProductCard } from '../components/ProductCard';
import { HeaderIconButton, MobileHeader, SectionHeader, btnGold, useReveal } from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import { CITIES } from '../utils/commerce';

interface HomeScreenProps {
  products: Product[];
  wishlist: string[];
  selectedCity: string;
  ongoingOrders: number;
  onCityChange: (city: string) => void;
  onSearch: (query: string) => void;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  /** Bannière « Installez Béthanie », quand l'installation est possible. */
  installBanner?: React.ReactNode;
}

const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as React.CSSProperties;

/**
 * Titre de la bannière, mot par mot : chaque mot monte à son tour, puis les mots mis en valeur (en or)
 * sont soulignés. `template` contient « {highlight} » à l'endroit des mots en or.
 */
const HeroTitle: React.FC<{ template: string; highlight: string }> = ({ template, highlight }) => {
  let index = 0;
  const words = (text: string) =>
    text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const i = index++;
        return (
          <React.Fragment key={i}>
            <span className="hero-word" style={{ '--i': i } as React.CSSProperties}>
              {word}
            </span>{' '}
          </React.Fragment>
        );
      });
  return (
    <>
      {template.split(/(\{highlight\})/).map((part, i) =>
        part === '{highlight}' ? (
          <span key={i} className="hero-highlight text-gold-400">
            {words(highlight)}
          </span>
        ) : (
          <React.Fragment key={i}>{words(part)}</React.Fragment>
        )
      )}
    </>
  );
};

const TRUST: [string, TranslationKey, TranslationKey][] = [
  ['fa-circle-check', 'home.trust.verified', 'home.trust.verifiedText'],
  ['fa-lock', 'common.securePayment', 'home.trust.paymentText'],
  ['fa-truck-fast', 'home.trust.delivery', 'home.trust.deliveryText'],
  ['fa-headset', 'home.trust.support', 'home.trust.supportText'],
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  products,
  wishlist,
  selectedCity,
  ongoingOrders,
  onCityChange,
  onSearch,
  onNavigate,
  onOpenProduct,
  onAddToCart,
  onToggleWishlist,
  installBanner,
}) => {
  const { t, cityLabel, categoryName } = useI18n();
  const [query, setQuery] = useState('');
  // Sections qui apparaissent au défilement
  const categoriesReveal = useReveal<HTMLElement>();
  const popularReveal = useReveal<HTMLElement>();
  const sellReveal = useReveal<HTMLElement>();
  const trustReveal = useReveal<HTMLElement>();

  // « Populaires » : les produits les plus évalués d'abord.
  const popular = useMemo(
    () => [...products].sort((a, b) => b.reviewsCount - a.reviewsCount || b.rating - a.rating).slice(0, 10),
    [products]
  );

  return (
    <div className="pb-6 lg:pb-0">
      {/* En-tête mobile : ville, langue, notifications, recherche */}
      <MobileHeader tone="brand">
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 min-w-0 text-sm font-medium">
            <i className="fa-solid fa-location-dot text-gold-400"></i>
            <span className="sr-only">{t('common.yourCity')}</span>
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-transparent border-0 text-white font-medium focus:outline-none cursor-pointer truncate min-w-0"
            >
              {CITIES.map((city) => (
                <option key={city} value={city} className="text-slate-800">
                  {cityLabel(city)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1 shrink-0">
            <LanguageSwitcher tone="brand" compact />
            <HeaderIconButton
              tone="brand"
              icon="fa-regular fa-bell"
              label={t('home.bell')}
              badge={ongoingOrders}
              iconClassName={ongoingOrders > 0 ? 'inline-block animate-wiggle' : ''}
              onClick={() => onNavigate('account', { tab: 'orders' })}
            />
          </div>
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(query.trim());
          }}
          className="mt-3 flex items-center bg-white rounded-xl h-11 px-3.5 gap-2.5"
        >
          <i className="fa-solid fa-magnifying-glass text-slate-400"></i>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            aria-label={t('common.searchProduct')}
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </form>
      </MobileHeader>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8 space-y-7 lg:space-y-14">
        {/* Bannière : image de la maquette (texte retiré) + texte HTML traduit et boutons cliquables */}
        <section className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-brand-900 text-white lg:aspect-[1280/511]">
          <img
            src={homeBannerImg}
            alt={t('home.heroAlt')}
            fetchPriority="high"
            decoding="async"
            className="hero-photo absolute inset-0 w-full h-full object-cover object-[78%_center] lg:object-center"
          />
          <div
            className="absolute inset-0 bg-linear-to-r from-brand-900 via-brand-900/80 to-transparent lg:hidden"
            aria-hidden="true"
          ></div>
          {/* Sur ordinateur, le texte occupe exactement la zone verte de l'image d'origine (8 % à 70 % de la hauteur). */}
          <div className="relative min-h-52 sm:min-h-64 max-w-[64%] sm:max-w-[55%] flex flex-col justify-center gap-3 p-5 lg:absolute lg:min-h-0 lg:max-w-none lg:top-[6%] lg:bottom-[30%] lg:left-[2.9%] lg:w-[35%] lg:p-0 lg:gap-4">
            <h1 className="text-[1.375rem] leading-[1.12] sm:text-3xl lg:text-[clamp(2rem,3.5vw,3.1rem)] lg:leading-[1.06] font-bold tracking-[-0.01em] text-balance drop-shadow-sm">
              <HeroTitle template={t('home.heroTitle')} highlight={t('home.heroHighlight')} />
            </h1>
            <p
              className="animate-rise-in hidden sm:block lg:hidden xl:block text-sm xl:text-[1.05rem] leading-relaxed text-white/90 max-w-md xl:max-w-[86%]"
              style={delay(320)}
            >
              {t('home.heroText')}
            </p>
            <div className="animate-rise-in flex flex-wrap gap-3 pt-1" style={delay(420)}>
              <button
                onClick={() => onNavigate('categories')}
                className="group shine shine-loop inline-flex items-center gap-2 h-10 lg:h-11 px-5 lg:px-6 rounded-xl bg-linear-to-b from-gold-400 to-gold-500 hover:to-gold-600 hover:shadow-glow text-brand-dark text-sm lg:text-base font-bold shadow-lg shadow-black/20 cursor-pointer"
              >
                {t('home.discover')}
                <i className="fa-solid fa-chevron-right text-xs transition-transform duration-200 group-hover:translate-x-0.5"></i>
              </button>
              <button
                onClick={() => onNavigate('seller')}
                className="hidden sm:inline-flex items-center gap-2 h-10 lg:h-11 px-5 rounded-xl border border-white/70 bg-brand-900/60 backdrop-blur-sm hover:bg-brand-900/80 text-sm lg:text-base font-semibold cursor-pointer"
              >
                <i className="fa-solid fa-store"></i>
                {t('home.startSelling')}
              </button>
            </div>
          </div>
        </section>

        {installBanner}

        {/* Catégories */}
        <section aria-labelledby="home-categories" {...categoriesReveal}>
          <SectionHeader title={<span id="home-categories">{t('nav.categories')}</span>} onAction={() => onNavigate('categories')} />
          <ul className="stagger grid grid-cols-4 lg:grid-cols-8 gap-x-2 gap-y-4 lg:gap-6">
            {INITIAL_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => onNavigate('catalog', { category: cat.id })}
                  className="group w-full flex flex-col items-center gap-1.5 cursor-pointer"
                >
                  <img
                    src={cat.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={320}
                    height={320}
                    className="w-full max-w-28 aspect-square object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1"
                  />
                  <span className="text-[11px] lg:text-sm font-semibold text-slate-800 group-hover:text-brand-900 text-center leading-tight">
                    {categoryName(cat.id)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Produits populaires */}
        <section id="produits" aria-labelledby="home-popular" {...popularReveal}>
          <SectionHeader
            title={<span id="home-popular">{t('home.popular')}</span>}
            onAction={() => onNavigate('catalog', { category: 'all' })}
          />
          <div className="stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-5">
            {popular.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={wishlist.includes(product.id)}
                onOpen={onOpenProduct}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </section>

        {/* Vendre */}
        <section className="group relative overflow-hidden rounded-2xl lg:rounded-3xl bg-brand-900 text-white" {...sellReveal}>
          <div className="absolute inset-0 bg-pattern-kente opacity-[0.06]" aria-hidden="true"></div>
          <div
            className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-gold-500/20 blur-3xl animate-glow"
            aria-hidden="true"
          ></div>
          <div className="relative grid lg:grid-cols-[1fr_22rem] gap-6 p-5 lg:p-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-400">{t('common.sellerSpace')}</p>
              <h2 className="text-xl lg:text-4xl font-semibold mt-1.5 text-balance">{t('onb.slide2.title')}</h2>
              <p className="text-sm lg:text-base text-white/75 mt-2 max-w-xl">{t('home.sellText')}</p>
              <button onClick={() => onNavigate('seller')} className={`${btnGold} h-11 px-6 text-sm mt-5`}>
                <i className="fa-solid fa-store"></i>
                {t('common.openShop')}
              </button>
            </div>
            <img
              src={artisanWoodworkerImg}
              alt={t('home.workshopAlt')}
              loading="lazy"
              decoding="async"
              className="hidden lg:block w-full h-56 object-cover rounded-2xl ring-4 ring-white/10 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          </div>
        </section>

        {/* Engagements */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5" {...trustReveal}>
          {TRUST.map(([icon, title, text], i) => (
            <div
              key={title}
              className="group bg-white rounded-2xl border border-slate-200/70 shadow-soft p-3.5 lg:p-5 flex items-center gap-3"
              data-reveal={trustReveal['data-reveal']}
              style={delay(i * 70)}
            >
              <span className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <i className={`fa-solid ${icon}`}></i>
              </span>
              <span className="min-w-0">
                <span className="block text-xs lg:text-sm font-semibold text-slate-900">{t(title)}</span>
                <span className="block text-[11px] lg:text-xs text-slate-500">{t(text)}</span>
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
