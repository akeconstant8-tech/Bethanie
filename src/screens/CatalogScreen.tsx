import React, { useMemo, useState } from 'react';
import { CatalogView, NavigateParams, Product, ProductCondition, ScreenType } from '../types';
import { INITIAL_CATEGORIES } from '../data/mockData';
import { ProductCard, discountPercent } from '../components/ProductCard';
import { BottomSheet, EmptyState, MobileHeader, btnOutline, btnPrimary, cardClass } from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import { CITIES, cityOf, formatPrice } from '../utils/commerce';

interface CatalogScreenProps {
  products: Product[];
  initialCategory?: string;
  initialVendor?: string;
  /** Sélection de l'accueil ouverte par « Voir tout ». */
  initialView?: CatalogView;
  /** Ville du filtre « Localisation » (sinon, pour « Près de chez vous », la ville du client). */
  initialCity?: string;
  /** Ville du client (choisie à l'accueil, sur une fiche ou au paiement). */
  userCity: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  wishlist: string[];
}

const SORTS = ['relevance', 'price-asc', 'price-desc', 'newest', 'popular', 'bestsellers', 'rating'] as const;
type Sort = (typeof SORTS)[number];

/** Tri de départ de chaque sélection de l'accueil. */
const VIEW_SORT: Partial<Record<CatalogView, Sort>> = {
  populaires: 'popular',
  nouveautes: 'newest',
  'meilleures-ventes': 'bestsellers',
};

/** Recherche sans tenir compte des accents ni des majuscules (« telephone » trouve « Téléphone »). */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const chip = (active: boolean) =>
  `h-9 px-3.5 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
    active ? 'bg-brand-900 border-brand-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-brand-900'
  }`;

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  products,
  initialCategory = 'all',
  initialVendor,
  initialView,
  initialCity,
  userCity,
  searchQuery = '',
  onSearchChange,
  onNavigate,
  onBack,
  onOpenProduct,
  onAddToCart,
  onToggleWishlist,
  wishlist,
}) => {
  const { t, tn, lang, categoryName } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  // Le curseur couvre toujours le produit le plus cher (les vendeurs peuvent en ajouter).
  const priceCeiling = useMemo(
    () => Math.max(600000, Math.ceil(Math.max(0, ...products.map((p) => p.price)) / 5000) * 5000),
    [products]
  );
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number>(priceCeiling);
  const [minRating, setMinRating] = useState<number>(0);
  const [view, setView] = useState<CatalogView | undefined>(initialView);
  const [sortBy, setSortBy] = useState<Sort>((initialView && VIEW_SORT[initialView]) || 'relevance');
  const [city, setCity] = useState<string>(initialCity ?? (initialView === 'proches' ? userCity : 'all'));
  const [condition, setCondition] = useState<'all' | ProductCondition>('all');
  const [promoOnly, setPromoOnly] = useState(initialView === 'promotions');
  const [localOnly, setLocalOnly] = useState(initialView === 'locaux');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const [mobileSearch, setMobileSearch] = useState(searchQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const availableBrands = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.brand).filter((b): b is string => !!b))).sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [products]
  );
  // Villes où au moins un produit est en vente (plus la ville choisie, même sans produit).
  const availableCities = useMemo(() => {
    const present = new Set(products.map((p) => cityOf(p.location)).filter(Boolean));
    return CITIES.filter((c) => present.has(c) || c === city);
  }, [products, city]);
  const hasDemo = products.some((p) => p.isDemo);
  const vendorName = initialVendor ? products.find((p) => p.vendor.id === initialVendor)?.vendor.name : undefined;
  const priceFiltered = minPrice > 0 || maxPrice < priceCeiling;
  const activeFilters =
    selectedBrands.length +
    (priceFiltered ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (city !== 'all' ? 1 : 0) +
    (condition !== 'all' ? 1 : 0) +
    (promoOnly ? 1 : 0) +
    (localOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (showDemo ? 0 : 1);

  const toggleBrand = (brand: string) =>
    setSelectedBrands((list) => (list.includes(brand) ? list.filter((b) => b !== brand) : [...list, brand]));

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrands([]);
    setMinPrice(0);
    setMaxPrice(priceCeiling);
    setMinRating(0);
    setView(undefined);
    setSortBy('relevance');
    setCity('all');
    setCondition('all');
    setPromoOnly(false);
    setLocalOnly(false);
    setInStockOnly(false);
    setShowDemo(true);
  };

  const filteredProducts = useMemo(() => {
    const q = fold(searchQuery.trim());
    // Pertinence d'une recherche : nom d'abord, puis marque, puis le reste (vendeur, description…).
    const rank = (p: Product) =>
      !q ? 0 : fold(p.title).includes(q) ? 0 : fold(p.brand ?? '').includes(q) ? 1 : 2;
    return products
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (initialVendor && p.vendor.id !== initialVendor) return false;
        if (
          q &&
          ![p.title, p.brand ?? '', p.subcategory ?? '', p.vendor.name, p.description].some((text) => fold(text).includes(q))
        )
          return false;
        if (p.price < minPrice || p.price > maxPrice) return false;
        if (minRating > 0 && (p.reviewsCount === 0 || p.rating < minRating)) return false;
        if (selectedBrands.length > 0 && (!p.brand || !selectedBrands.includes(p.brand))) return false;
        if (city !== 'all' && cityOf(p.location) !== city) return false;
        if (condition !== 'all' && p.condition !== condition) return false;
        if (promoOnly && discountPercent(p) === 0) return false;
        if (localOnly && !p.isLocal) return false;
        if (inStockOnly && p.stock <= 0) return false;
        if (!showDemo && p.isDemo) return false;
        if (view === 'populaires' && (p.isDemo || (p.popularity ?? 0) <= 0)) return false;
        if (view === 'nouveautes' && (p.isDemo || !p.isNew)) return false;
        if (view === 'promotions' && (p.isDemo || discountPercent(p) === 0)) return false;
        if (view === 'proches' && p.isDemo) return false;
        if (view === 'locaux' && p.isDemo) return false;
        // « Meilleures ventes » : seulement les produits réellement vendus.
        if (view === 'meilleures-ventes' && (p.isDemo || !p.soldCount)) return false;
        if (sortBy === 'popular' && (p.isDemo || (p.popularity ?? 0) <= 0)) return false;
        if (sortBy === 'newest' && p.isDemo) return false;
        if (sortBy === 'bestsellers' && (p.isDemo || !p.soldCount)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
        if (sortBy === 'popular') return (b.popularity ?? 0) - (a.popularity ?? 0);
        if (sortBy === 'bestsellers') return (b.soldCount ?? 0) - (a.soldCount ?? 0);
        if (sortBy === 'rating') return b.rating - a.rating;
        return rank(a) - rank(b);
      });
  }, [
    products, selectedCategory, initialVendor, searchQuery, minPrice, maxPrice, minRating, selectedBrands, city, condition,
    promoOnly, localOnly, inStockOnly, showDemo, view, sortBy,
  ]);

  const viewTitle = view ? t(`catalog.view.${view}` as TranslationKey, { city: city === 'all' ? userCity : city }) : undefined;
  const title =
    vendorName ?? viewTitle ?? (selectedCategory === 'all' ? t('catalog.allProducts') : categoryName(selectedCategory));
  const count = tn('common.productCount', filteredProducts.length);

  const clearSearch = () => {
    onSearchChange?.('');
    setMobileSearch('');
  };

  const filterControls = (
    <div className="space-y-7">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-slate-900">{t('catalog.minPrice')}</span>
            <span className="font-bold text-brand-900 tabular-nums">{formatPrice(minPrice)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={priceCeiling}
            step="5000"
            value={minPrice}
            onChange={(e) => {
              const value = Number(e.target.value);
              setMinPrice(value);
              if (value > maxPrice) setMaxPrice(value);
            }}
            className="w-full cursor-pointer"
            aria-label={t('catalog.minPrice')}
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-slate-900">{t('catalog.maxPrice')}</span>
            <span className="font-bold text-brand-900 tabular-nums">{formatPrice(maxPrice)}</span>
          </div>
          <input
            type="range"
            min="5000"
            max={priceCeiling}
            step="5000"
            value={maxPrice}
            onChange={(e) => {
              const value = Number(e.target.value);
              setMaxPrice(value);
              if (value < minPrice) setMinPrice(value);
            }}
            className="w-full cursor-pointer"
            aria-label={t('catalog.maxPrice')}
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>{formatPrice(5000)}</span>
            <span>{formatPrice(priceCeiling)}</span>
          </div>
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-slate-900 mb-2">{t('catalog.location')}</span>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-brand-900 cursor-pointer"
        >
          <option value="all">{t('catalog.allCities')}</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">{t('catalog.condition')}</p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'neuf', 'occasion'] as const).map((id) => (
            <button key={id} onClick={() => setCondition(id)} aria-pressed={condition === id} className={chip(condition === id)}>
              {id === 'all' ? t('catalog.conditionAll') : t(`product.condition.${id}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900 mb-2">{t('catalog.options')}</p>
        <div className="space-y-1">
          {(
            [
              [promoOnly, setPromoOnly, 'catalog.promoOnly'],
              [localOnly, setLocalOnly, 'catalog.localOnly'],
              [inStockOnly, setInStockOnly, 'catalog.inStockOnly'],
              ...(hasDemo ? [[showDemo, setShowDemo, 'catalog.showDemo']] : []),
            ] as [boolean, (v: boolean) => void, TranslationKey][]
          ).map(([checked, set, label]) => (
            <label key={label} className="flex items-center gap-3 py-1.5 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="w-4 h-4" />
              {t(label)}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">{t('catalog.minRating')}</p>
        <div className="flex flex-wrap gap-2">
          {[4.5, 4, 3.5].map((stars) => (
            <button
              key={stars}
              onClick={() => setMinRating(minRating === stars ? 0 : stars)}
              aria-pressed={minRating === stars}
              className={chip(minRating === stars)}
            >
              <i className={`fa-solid fa-star mr-1.5 ${minRating === stars ? 'text-gold-400' : 'text-gold-500'}`}></i>
              {t('catalog.ratingAndUp', { n: stars.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') })}
            </button>
          ))}
        </div>
      </div>

      {availableBrands.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-3">{t('common.brand')}</p>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {availableBrands.map((brand) => (
              <label key={brand} className="flex items-center gap-3 py-1.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="w-4 h-4"
                />
                {brand}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const categoryChips = (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
      {[{ id: 'all', name: t('catalog.all') }, ...INITIAL_CATEGORIES.map((c) => ({ id: c.id, name: categoryName(c.id) }))].map(
        (cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            aria-pressed={selectedCategory === cat.id}
            className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              selectedCategory === cat.id
                ? 'bg-brand-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-900'
            }`}
          >
            {cat.name}
          </button>
        )
      )}
    </div>
  );

  return (
    <div className="pb-6 lg:pb-12">
      <MobileHeader title={title} onBack={onBack}>
        {onSearchChange && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchChange(mobileSearch.trim());
            }}
            className="mt-2 flex gap-2"
          >
            <div className="group flex-1 flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-surface-light border border-slate-200 ring-brand-900/10 transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-brand-900 focus-within:bg-white focus-within:ring-4">
              <i className="fa-solid fa-magnifying-glass text-slate-400 transition-colors duration-200 group-focus-within:text-brand-900"></i>
              <input
                type="search"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder={t('catalog.searchPlaceholder')}
                aria-label={t('common.searchProduct')}
                className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative w-11 h-11 rounded-xl bg-brand-900 text-white cursor-pointer shrink-0"
              aria-label={t('catalog.filters')}
            >
              <i className="fa-solid fa-sliders"></i>
              {activeFilters > 0 && (
                <span
                  key={activeFilters}
                  className="animate-bump absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-500 text-brand-dark text-[10px] font-bold flex items-center justify-center"
                >
                  {activeFilters}
                </span>
              )}
            </button>
          </form>
        )}
      </MobileHeader>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-3 lg:pt-8">
        <nav className="hidden lg:flex items-center gap-2 text-xs text-slate-500 mb-5" aria-label={t('catalog.breadcrumb')}>
          <button onClick={() => onNavigate('home')} className="hover:text-brand-900 cursor-pointer">
            {t('nav.home')}
          </button>
          <span>/</span>
          <button onClick={() => onNavigate('categories')} className="hover:text-brand-900 cursor-pointer">
            {t('nav.categories')}
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">{title}</span>
        </nav>

        <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-8 items-start">
          <aside className={`hidden lg:block ${cardClass} p-5 sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-slate-900">{t('catalog.filters')}</h2>
              <button onClick={resetFilters} className="text-xs font-semibold text-brand-900 hover:underline cursor-pointer">
                {t('catalog.reset')}
              </button>
            </div>
            {filterControls}
          </aside>

          <div className="space-y-4 lg:space-y-6 min-w-0">
            <div className="hidden lg:block">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {vendorName && <i className="fa-solid fa-store text-brand-900 text-2xl mr-3"></i>}
                {title}
              </h1>
            </div>

            {categoryChips}

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 min-w-0">
                {/* Le nombre de résultats « se pose » à chaque changement de filtre ou de recherche. */}
                <strong key={filteredProducts.length} className="animate-scale-in inline-block text-slate-900 tabular-nums">
                  {count}
                </strong>
                {searchQuery && (
                  <span
                    key={searchQuery}
                    className="animate-scale-in inline-flex items-center gap-1 bg-brand-50 text-brand-900 text-xs font-semibold pl-3 pr-1 h-7 rounded-full"
                  >
                    « {searchQuery} »
                    {onSearchChange && (
                      <button
                        onClick={clearSearch}
                        className="w-5 h-5 rounded-full hover:bg-brand-900 hover:text-white cursor-pointer"
                        aria-label={t('catalog.clearSearch')}
                      >
                        <i className="fa-solid fa-xmark text-[10px]"></i>
                      </button>
                    )}
                  </span>
                )}
                {(vendorName || view) && (
                  <button
                    onClick={() => onNavigate('catalog', { category: 'all' })}
                    className="text-xs font-semibold text-brand-900 hover:underline cursor-pointer"
                  >
                    {t('categories.seeCatalog')}
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm shrink-0">
                <span className="hidden sm:inline text-slate-500">{t('catalog.sortBy')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as Sort)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-brand-900 cursor-pointer"
                  aria-label={t('catalog.sortBy')}
                >
                  {SORTS.map((id) => (
                    <option key={id} value={id}>
                      {t(`catalog.sort.${id}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon="fa-solid fa-magnifying-glass"
                title={t('catalog.emptyTitle')}
                text={t('catalog.emptyText')}
                action={
                  <button
                    onClick={() => {
                      resetFilters();
                      clearSearch();
                    }}
                    className={`${btnPrimary} h-11 px-5 text-sm`}
                  >
                    {t('catalog.clearFilters')}
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-5">
                {filteredProducts.map((product) => (
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
            )}
          </div>
        </div>
      </div>

      <BottomSheet
        open={filtersOpen}
        title={t('catalog.filters')}
        onClose={() => setFiltersOpen(false)}
        footer={
          <div className="flex gap-3">
            <button onClick={resetFilters} className={`${btnOutline} h-12 px-5 text-sm`}>
              {t('catalog.reset')}
            </button>
            <button onClick={() => setFiltersOpen(false)} className={`${btnPrimary} h-12 flex-1 text-sm`}>
              {t('catalog.show', { count })}
            </button>
          </div>
        }
      >
        {filterControls}
      </BottomSheet>
    </div>
  );
};
