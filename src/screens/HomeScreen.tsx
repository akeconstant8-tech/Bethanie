import React, { useMemo, useRef, useState } from 'react';
import { CatalogView, NavigateParams, Product, ScreenType } from '../types';
import { INITIAL_CATEGORIES, artisanWoodworkerImg, homeBannerImg } from '../data/mockData';
import { BethanieLogo } from '../components/BethanieLogo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PresentationVideo } from '../components/PresentationVideo';
import { ProductCard, discountPercent } from '../components/ProductCard';
import { HeaderIconButton, MobileHeader, SectionHeader, btnGold, useReveal } from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import { CITIES, cityOf } from '../utils/commerce';
import { useTypewriterPlaceholder } from '../utils/motion';

interface HomeScreenProps {
  products: Product[];
  wishlist: string[];
  ongoingOrders: number;
  onSearch: (query: string) => void;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  /** Bannière « Installez Béthanie », quand l'installation est possible. */
  installBanner?: React.ReactNode;
  /** Ville du client : rangée « Près de chez vous » (même réglage qu'au paiement). */
  city: string;
  onCityChange: (city: string) => void;
}

/** Nombre de produits par rangée de l'accueil (tous visibles en faisant défiler sur téléphone). */
const SHELF_SIZE = 10;

interface ShelfProps {
  id: string;
  title: React.ReactNode;
  hint?: string;
  products: Product[];
  /** Produits affichés sur ordinateur (une rangée de 5 ou deux). */
  desktopCount?: 5 | 10;
  onSeeAll: () => void;
  wishlist: string[];
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  /** Texte affiché à la place des produits quand la rangée est vide. */
  empty?: string;
}

/** Rangée de produits : défilement horizontal sur téléphone, grille sur ordinateur, « Voir tout » vers le catalogue. */
const ProductShelf: React.FC<ShelfProps> = ({
  id,
  title,
  hint,
  products,
  desktopCount = 5,
  onSeeAll,
  wishlist,
  onOpenProduct,
  onAddToCart,
  onToggleWishlist,
  empty,
}) => {
  const reveal = useReveal<HTMLElement>();
  return (
    <section aria-labelledby={id} {...reveal}>
      <SectionHeader
        title={
          <span id={id} className="block">
            {title}
            {hint && <span className="block text-xs lg:text-sm font-normal text-slate-500 mt-0.5">{hint}</span>}
          </span>
        }
        onAction={products.length > 0 ? onSeeAll : undefined}
      />
      {products.length === 0 && empty ? (
        <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200/70 p-4">{empty}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-1 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
          {products.map((product, i) => (
            <div
              key={product.id}
              className={`w-[46%] sm:w-[31%] shrink-0 snap-start flex lg:w-auto ${i >= desktopCount ? 'lg:hidden' : ''}`}
            >
              <div className="w-full flex flex-col [&>article]:flex-1">
                <ProductCard
                  product={product}
                  isFavorite={wishlist.includes(product.id)}
                  onOpen={onOpenProduct}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

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
  ongoingOrders,
  onSearch,
  onNavigate,
  onOpenProduct,
  onAddToCart,
  onToggleWishlist,
  installBanner,
  city,
  onCityChange,
}) => {
  const { t, categoryName } = useI18n();
  const [query, setQuery] = useState('');
  const searchField = useRef<HTMLInputElement>(null);
  useTypewriterPlaceholder(searchField, t('common.searchPlaceholder'), t('search.examples'), t('search.try'));
  // Sections qui apparaissent au défilement
  const categoriesReveal = useReveal<HTMLElement>();
  const sellReveal = useReveal<HTMLElement>();
  const trustReveal = useReveal<HTMLElement>();

  // Rangées construites sur des données réelles : ventes payées, favoris et avis (popularité), date de mise en vente,
  // promotions fixées par les vendeurs, ville du produit, produits locaux. Sans donnée, la rangée n'apparaît pas.
  const shelves = useMemo(() => {
    const realProducts = products.filter((product) => !product.isDemo);
    const newest = [...realProducts].filter((product) => product.isNew).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      popular: realProducts
        .filter((product) => (product.popularity ?? 0) > 0)
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, SHELF_SIZE),
      newest: newest.slice(0, SHELF_SIZE),
      bestSellers: realProducts
        .filter((p) => (p.soldCount ?? 0) > 0)
        .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
        .slice(0, SHELF_SIZE),
      promotions: realProducts
        .filter((p) => discountPercent(p) > 0)
        .sort((a, b) => discountPercent(b) - discountPercent(a))
        .slice(0, SHELF_SIZE),
      nearby: realProducts.filter((p) => cityOf(p.location) === city && p.stock > 0).slice(0, SHELF_SIZE),
      local: realProducts.filter((p) => p.isLocal).slice(0, SHELF_SIZE),
    };
  }, [products, city]);
  const hasDemo = products.some((p) => p.isDemo);
  const shelfProps = { wishlist, onOpenProduct, onAddToCart, onToggleWishlist };
  const seeAll = (view: CatalogView, params: NavigateParams = {}) => () =>
    onNavigate('catalog', { category: 'all', view, ...params });

  return (
    <div className="pb-6 lg:pb-0">
      {/* En-tête mobile : ville, langue, notifications, recherche */}
      <MobileHeader tone="brand">
        <div className="flex items-center justify-between gap-2">
          {/* Logo et devise de Béthanie ; la ville de livraison se choisit au moment du paiement. */}
          <BethanieLogo variant="white" size="md" className="min-w-0" />
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
          className="group mt-3 flex items-center bg-white rounded-xl h-11 px-3.5 gap-2.5 ring-gold-400 transition-shadow duration-200 focus-within:ring-2"
        >
          <i className="fa-solid fa-magnifying-glass text-slate-400 transition-colors duration-200 group-focus-within:text-brand-900"></i>
          <input
            ref={searchField}
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
                className="group shine shine-loop ripple inline-flex items-center gap-2 h-10 lg:h-11 px-5 lg:px-6 rounded-xl bg-linear-to-b from-gold-400 to-gold-500 hover:to-gold-600 hover:shadow-glow text-brand-dark text-sm lg:text-base font-bold shadow-lg shadow-black/20 cursor-pointer"
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

        {/* Vidéo de présentation (motion design, musique, voix off) : en 2e position, aperçu en grand, lecture HD au toucher */}
        <PresentationVideo />

        {installBanner}

        <section className="group relative overflow-hidden rounded-[28px] bg-gradient-to-r from-brand-900 via-brand-800 to-[#2f5c45] text-white shadow-[0_30px_80px_-28px_rgba(15,23,42,0.7)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,205,102,0.35),transparent_32%)]" aria-hidden="true" />
          <div className="absolute -right-12 top-12 h-32 w-32 rounded-full bg-gold-400/30 blur-3xl transition-transform duration-700 group-hover:scale-125" aria-hidden="true" />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-balance sm:text-3xl lg:text-4xl">
                {t('home.promoTitle')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/75 lg:text-base">
                {t('home.promoText')}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('catalog', { category: 'all' })}
                  className="group/cta inline-flex items-center gap-2 rounded-xl bg-linear-to-b from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-bold text-brand-dark shadow-lg shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {t('home.promoCta')}
                  <i className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover/cta:translate-x-0.5"></i>
                </button>
                <button
                  onClick={() => onNavigate('seller')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <i className="fa-solid fa-store"></i>
                  {t('home.promoSecondary')}
                </button>
              </div>
            </div>
          </div>
        </section>

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
                  <span className="relative w-full max-w-28">
                    {/* Au survol, l'illustration se soulève et une ombre douce apparaît sous son socle. */}
                    <span
                      aria-hidden="true"
                      className="absolute left-[16%] right-[16%] bottom-[1%] h-[10%] rounded-full bg-slate-900/25 blur-md opacity-0 scale-x-75 transition-[opacity,scale] duration-300 ease-out group-hover:opacity-100 group-hover:scale-x-100 group-focus-visible:opacity-100 group-focus-visible:scale-x-100"
                    ></span>
                    <img
                      src={cat.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={320}
                      height={320}
                      className="relative w-full aspect-square object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1 group-focus-visible:scale-110 group-focus-visible:-translate-y-1"
                    />
                  </span>
                  <span className="relative text-[11px] lg:text-sm font-semibold text-slate-800 transition-colors duration-200 group-hover:text-brand-900 text-center leading-tight">
                    {categoryName(cat.id)}
                    {/* Trait doré qui se déploie sous le nom. */}
                    <span
                      aria-hidden="true"
                      className="absolute left-1/2 -bottom-1.5 h-0.5 w-6 -ml-3 rounded-full bg-gold-500 scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                    ></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Produits : populaires, nouveautés, meilleures ventes et promotions (si des données existent) */}
        <div id="produits" className="space-y-7 lg:space-y-14 scroll-mt-24">
          {hasDemo && (
            <p className="flex items-start gap-2 text-xs text-slate-500 -mb-3 lg:-mb-8">
              <i className="fa-solid fa-circle-info mt-0.5" aria-hidden="true"></i>
              {t('home.demoNotice')}
            </p>
          )}
          {shelves.popular.length > 0 && (
            <ProductShelf
              id="home-popular"
              title={t('home.popular')}
              products={shelves.popular}
              desktopCount={10}
              onSeeAll={seeAll('populaires')}
              {...shelfProps}
            />
          )}
          {shelves.newest.length > 0 && (
            <ProductShelf
              id="home-new"
              title={t('home.newArrivals')}
              products={shelves.newest}
              onSeeAll={seeAll('nouveautes')}
              {...shelfProps}
            />
          )}
          {shelves.bestSellers.length > 0 && (
            <ProductShelf
              id="home-bestsellers"
              title={t('home.bestSellers')}
              products={shelves.bestSellers}
              onSeeAll={seeAll('meilleures-ventes')}
              {...shelfProps}
            />
          )}
          {shelves.promotions.length > 0 && (
            <ProductShelf
              id="home-promotions"
              title={t('home.promotions')}
              hint={t('home.promotionsHint')}
              products={shelves.promotions}
              onSeeAll={seeAll('promotions')}
              {...shelfProps}
            />
          )}
        </div>

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

        {/* Près de chez vous : la ville se change ici (elle sert aussi au paiement) */}
        <ProductShelf
          id="home-nearby"
          title={
            <span className="inline-flex flex-wrap items-center gap-x-2">
              {t('home.nearby')}
              <select
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                aria-label={t('home.nearbyCity')}
                className="h-8 lg:h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm lg:text-base font-semibold text-brand-900 focus:outline-none focus:border-brand-900 cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </span>
          }
          products={shelves.nearby}
          onSeeAll={seeAll('proches', { city })}
          empty={t('home.nearbyEmpty', { city })}
          {...shelfProps}
        />

        {shelves.local.length > 0 && (
          <ProductShelf
            id="home-local"
            title={t('home.local')}
            hint={t('home.localHint')}
            products={shelves.local}
            onSeeAll={seeAll('locaux')}
            {...shelfProps}
          />
        )}

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
