import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigateParams, Product, Review, ScreenType } from '../types';
import { api, errorMessage } from '../api/client';
import { ProductCard, badgeColor } from '../components/ProductCard';
import {
  HeartBurst,
  QuantityStepper,
  SectionHeader,
  Skeleton,
  Stars,
  btnGold,
  btnPrimary,
  cardClass,
  inputClass,
} from '../components/ui';
import { useI18n } from '../i18n';
import { formatPrice } from '../utils/commerce';
import { SHARED_PHOTO, flyToCart, isOnScreen, supportsViewTransitions } from '../utils/motion';

interface ProductDetailScreenProps {
  product: Product;
  products: Product[];
  wishlist: string[];
  cartCount: number;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number, color?: string, size?: string) => void;
  onBuyNow: (product: Product, quantity: number, color?: string, size?: string) => void;
  onToggleWishlist: (productId: string) => void;
  onNotify: (text: string) => void;
  isLoggedIn: boolean;
  /** Appelé quand la note du produit change (nouvel avis). */
  onProductUpdated: (product: Product) => void;
}

type Tab = 'caracteristiques' | 'avis';

const overlayButton =
  'w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-slate-800 hover:bg-white cursor-pointer';

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  products,
  wishlist,
  cartCount,
  onNavigate,
  onBack,
  onOpenProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onNotify,
  isLoggedIn,
  onProductUpdated,
}) => {
  const { t, tn, categoryName, badgeLabel } = useI18n();
  const gallery = useMemo(() => Array.from(new Set([product.image, ...(product.additionalImages ?? [])])), [product]);
  const hasCharacteristics = !!product.characteristics && Object.keys(product.characteristics).length > 0;

  const [activeImage, setActiveImage] = useState(gallery[0]);
  const [color, setColor] = useState(product.availableColors?.[0]?.name);
  const [size, setSize] = useState(product.availableSizes?.length === 1 ? product.availableSizes[0] : undefined);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>(hasCharacteristics ? 'caracteristiques' : 'avis');
  const [expanded, setExpanded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsError, setReviewsError] = useState('');
  const [draft, setDraft] = useState({ rating: 5, text: '' });
  const [reviewError, setReviewError] = useState('');
  const [posting, setPosting] = useState(false);
  const tabsRef = useRef<HTMLElement>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const mainPhoto = useRef<HTMLImageElement>(null);
  // Bouton « Ajouter au panier » qui devient « Ajouté ! » pendant un instant.
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    api
      .reviews(product.id)
      .then((list) => !cancelled && setReviews(list))
      .catch((error) => !cancelled && setReviewsError(errorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const isFavorite = wishlist.includes(product.id);
  const [heartPops, setHeartPops] = useState(0);
  // Avec les View Transitions, la photo arrive déjà animée depuis la carte ; sinon, léger zoom d'entrée.
  const [photoAnimation] = useState(() => (supportsViewTransitions() ? '' : 'animate-scale-in'));
  const outOfStock = product.stock <= 0;
  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const similar = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const needsSize = !!product.availableSizes && product.availableSizes.length > 1;
  const stockLabel = outOfStock
    ? t('common.outOfStock')
    : product.stock <= 5
    ? t('common.lowStock', { n: product.stock })
    : t('product.inStock');
  const stockStyle = outOfStock
    ? 'bg-slate-100 text-slate-600'
    : product.stock <= 5
    ? 'bg-amber-50 text-amber-800'
    : 'bg-emerald-50 text-emerald-700';

  const validate = () => {
    if (needsSize && !size) {
      setSizeError(true);
      sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const addToCart = (event: React.MouseEvent<HTMLElement>) => {
    if (!validate()) return;
    onAddToCart(product, quantity, color, size);
    setJustAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(false), 1600);
    // La photo s'envole vers le panier ; si elle n'est plus à l'écran, la vignette part du bouton.
    const photo = mainPhoto.current;
    flyToCart(gallery[0] ?? product.image, photo && isOnScreen(photo) ? photo : event.currentTarget);
  };
  const buyNow = () => validate() && onBuyNow(product, quantity, color, size);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, text: t('product.shareText', { title: product.title, price: formatPrice(product.price) }), url });
      } else {
        await navigator.clipboard.writeText(url);
        onNotify(t('toast.linkCopied'));
      }
    } catch {
      // partage annulé par l'utilisateur
    }
  };

  const showReviews = () => {
    setTab('avis');
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.text.trim()) return;
    setPosting(true);
    setReviewError('');
    try {
      const result = await api.addReview(product.id, { rating: draft.rating, text: draft.text.trim() });
      setReviews((list) => [result.review, ...(list ?? [])]);
      setDraft({ rating: 5, text: '' });
      onProductUpdated(result.product);
    } catch (error) {
      setReviewError(errorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="pb-6 lg:pb-12">
      <div className="max-w-7xl mx-auto lg:px-8 lg:pt-8 space-y-6 lg:space-y-8">
        <nav className="hidden lg:flex items-center gap-2 text-xs text-slate-500" aria-label={t('catalog.breadcrumb')}>
          <button onClick={() => onNavigate('home')} className="hover:text-brand-900 cursor-pointer">
            {t('nav.home')}
          </button>
          <span>/</span>
          <button onClick={() => onNavigate('catalog', { category: product.category })} className="hover:text-brand-900 cursor-pointer">
            {categoryName(product.category)}
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate">{product.title}</span>
        </nav>

        <section className="lg:bg-white lg:rounded-3xl lg:border lg:border-slate-200/70 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-12">
          {/* Galerie */}
          <div className="space-y-3">
            <div className="relative aspect-square lg:rounded-2xl bg-cream overflow-hidden">
              <img
                key={activeImage}
                ref={mainPhoto}
                src={activeImage}
                alt={product.title}
                data-shared-photo=""
                style={activeImage === gallery[0] ? ({ viewTransitionName: SHARED_PHOTO } as React.CSSProperties) : undefined}
                className={`w-full h-full object-cover ${activeImage === gallery[0] ? photoAnimation : 'animate-fade-in'}`}
              />
              <div className="absolute top-0 inset-x-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:pt-4 flex items-center justify-between">
                <button onClick={onBack} className={`${overlayButton} lg:invisible`} aria-label={t('common.back')}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!isFavorite) setHeartPops((n) => n + 1);
                      onToggleWishlist(product.id);
                    }}
                    className={`relative ${overlayButton}`}
                    aria-label={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
                    aria-pressed={isFavorite}
                  >
                    {isFavorite && heartPops > 0 && <HeartBurst key={heartPops} />}
                    <i
                      key={heartPops}
                      className={`${isFavorite ? 'fa-solid text-red-500' : 'fa-regular'} fa-heart ${heartPops > 0 ? 'animate-pop' : ''}`}
                    ></i>
                  </button>
                  <button onClick={share} className={overlayButton} aria-label={t('product.share')}>
                    <i className="fa-solid fa-arrow-up-from-bracket"></i>
                  </button>
                </div>
              </div>
              {product.discountBadge && (
                <span className={`absolute bottom-4 left-4 text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${badgeColor(product.discountBadge)}`}>
                  {badgeLabel(product.discountBadge)}
                </span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="stagger flex gap-2.5 px-4 lg:px-0 overflow-x-auto no-scrollbar">
                {gallery.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(img)}
                    aria-label={t('product.photo', { n: i + 1 })}
                    aria-pressed={activeImage === img}
                    className={`w-16 h-16 lg:w-20 lg:h-20 shrink-0 rounded-xl overflow-hidden border-2 bg-cream cursor-pointer transition-colors ${
                      activeImage === img ? 'border-brand-900' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="px-4 lg:px-0 space-y-5 animate-rise-in" style={{ '--delay': '80ms' } as React.CSSProperties}>
            <div>
              {(product.brand || product.subcategory) && (
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-1.5">
                  {[product.brand, product.subcategory].filter(Boolean).join(' • ')}
                </p>
              )}
              <h1 className="text-xl lg:text-3xl font-semibold text-slate-900 text-balance">{product.title}</h1>
              <button onClick={showReviews} className="mt-2 flex items-center gap-2 text-sm cursor-pointer group">
                <Stars rating={product.rating} />
                <span className="font-semibold text-slate-800">{product.rating}</span>
                <span className="text-slate-500 group-hover:text-brand-900 group-hover:underline">
                  {tn('product.reviews', product.reviewsCount)}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-2xl lg:text-3xl font-display font-bold text-brand-900 tabular-nums">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-md">-{discountPercent}%</span>
              )}
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${stockStyle}`}>{stockLabel}</span>
            </div>

            <div>
              <p className={`text-sm text-slate-600 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>{product.description}</p>
              {product.description.length > 160 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-sm font-semibold text-brand-900 mt-1 cursor-pointer"
                >
                  {expanded ? t('product.readLess') : t('product.readMore')}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-5">
              {product.availableColors && product.availableColors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">
                    {t('product.colors')} <span className="font-normal text-slate-500">• {color}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {product.availableColors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setColor(c.name)}
                        aria-label={c.name}
                        aria-pressed={color === c.name}
                        title={c.name}
                        className={`w-9 h-9 rounded-full p-0.5 border-2 cursor-pointer transition-colors ${
                          color === c.name ? 'border-brand-900' : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        <span className="block w-full h-full rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }}></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!outOfStock && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">{t('product.quantity')}</p>
                  <QuantityStepper
                    value={quantity}
                    max={product.stock}
                    onChange={(q) => setQuantity(Math.max(1, Math.min(product.stock, q)))}
                  />
                </div>
              )}
            </div>

            {product.availableSizes && product.availableSizes.length > 0 && (
              <div ref={sizesRef}>
                <p className="text-sm font-semibold text-slate-900 mb-2">{t('product.size')}</p>
                <div className="flex flex-wrap gap-2">
                  {product.availableSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSize(s);
                        setSizeError(false);
                      }}
                      aria-pressed={size === s}
                      className={`min-w-12 h-10 px-3 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
                        size === s ? 'bg-brand-900 border-brand-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-brand-900'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <p className="text-xs text-red-600 font-semibold mt-2" role="alert">
                    {t('product.chooseSize')}
                  </p>
                )}
              </div>
            )}

            {/* Boutons (ordinateur) — sur mobile, ils sont dans la barre fixée en bas */}
            <div className="hidden lg:flex gap-3 pt-1">
              <button
                onClick={addToCart}
                disabled={outOfStock}
                className={`${btnPrimary} flex-1 h-12 ${justAdded ? 'bg-emerald-600! hover:bg-emerald-600!' : ''}`}
              >
                <i key={justAdded ? 'ok' : 'add'} className={`fa-solid ${justAdded ? 'fa-check animate-pop' : 'fa-cart-plus'}`}></i>
                {justAdded ? t('product.added') : t('product.addToCart')}
              </button>
              <button onClick={buyNow} disabled={outOfStock} className={`${btnGold} flex-1 h-12`}>
                {t('product.buyNow')}
              </button>
            </div>

            {/* Vendeur */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3.5">
              <span className="w-11 h-11 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center font-display font-bold shrink-0">
                {product.vendor.avatarText ?? product.vendor.name.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{product.vendor.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {product.vendor.verified && (
                    <span className="text-brand-700 font-medium">
                      <i className="fa-solid fa-circle-check mr-1"></i>
                      {t('product.verifiedSeller')} •{' '}
                    </span>
                  )}
                  {product.vendor.location}
                </p>
              </div>
              <button
                onClick={() => onNavigate('catalog', { vendor: product.vendor.id, category: 'all' })}
                className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-brand-900 text-xs font-semibold text-slate-800 whitespace-nowrap cursor-pointer"
              >
                {t('product.seeShop')}
              </button>
            </div>

            <ul className="grid grid-cols-3 gap-2 text-[11px] lg:text-xs text-slate-600">
              {[
                ['fa-truck-fast', t('product.perk.delivery')],
                ['fa-rotate-left', t('product.perk.returns')],
                ['fa-shield-halved', t('common.securePayment')],
              ].map(([icon, label]) => (
                <li key={label} className="flex flex-col lg:flex-row items-center gap-1.5 lg:gap-2 bg-brand-50/60 rounded-xl p-2.5 text-center lg:text-left">
                  <i className={`fa-solid ${icon} text-brand-900`}></i>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Caractéristiques & avis */}
        <section ref={tabsRef} className={`mx-4 lg:mx-0 ${cardClass} scroll-mt-4 lg:scroll-mt-36`}>
          <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar" role="tablist">
            {(
              [
                ['caracteristiques', t('product.characteristics')],
                ['avis', t('product.customerReviews', { n: product.reviewsCount })],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
                  tab === id ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 lg:p-8">
            {tab === 'caracteristiques' &&
              (hasCharacteristics ? (
                <dl className="max-w-3xl divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {Object.entries(product.characteristics!).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[40%_1fr] gap-4 px-4 py-3 text-sm even:bg-surface-light">
                      <dt className="font-medium text-slate-800">{key}</dt>
                      <dd className="text-slate-600">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">{t('product.noCharacteristics')}</p>
              ))}

            {tab === 'avis' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-3 stagger">
                  {reviewsError && <p className="text-sm text-red-600">{reviewsError}</p>}
                  {!reviews && !reviewsError && (
                    <div role="status" aria-label={t('product.loadingReviews')} className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-9 h-9 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-2.5 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      ))}
                    </div>
                  )}
                  {reviews?.length === 0 && (
                    <p className="text-sm text-slate-500">{t('product.noReviews')}</p>
                  )}
                  {reviews?.map((review) => (
                    <article key={review.id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-full bg-gold-100 text-gold-700 font-semibold flex items-center justify-center text-sm shrink-0">
                            {review.author.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{review.author}</p>
                            <p className="text-[11px] text-slate-400">
                              {review.city} • {review.date}
                            </p>
                          </div>
                        </div>
                        <Stars rating={review.rating} />
                      </div>
                      <p className="text-sm text-slate-600 mt-3">{review.text}</p>
                      {review.verified && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                          <i className="fa-solid fa-circle-check mr-1"></i>
                          {t('product.verifiedPurchase')}
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                {!isLoggedIn ? (
                  <div className="bg-surface-light rounded-2xl p-5 space-y-3 self-start text-sm">
                    <h3 className="font-semibold text-slate-900">{t('product.writeReview')}</h3>
                    <p className="text-slate-500">{t('product.loginToReview')}</p>
                    <button onClick={() => onNavigate('account')} className={`${btnPrimary} w-full h-11 text-sm`}>
                      {t('common.signIn')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitReview} className="bg-surface-light rounded-2xl p-5 space-y-4 self-start">
                    <h3 className="font-semibold text-slate-900">{t('product.writeReview')}</h3>
                    <div className="flex gap-1 text-2xl">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setDraft({ ...draft, rating: s + 1 })}
                          className={`cursor-pointer ${s < draft.rating ? 'text-gold-500' : 'text-slate-300'}`}
                          aria-label={tn('product.stars', s + 1)}
                        >
                          <i className="fa-solid fa-star"></i>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={draft.text}
                      onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                      rows={4}
                      placeholder={t('product.reviewPlaceholder')}
                      className={inputClass}
                    />
                    {reviewError && (
                      <p key={reviewError} className="animate-shake text-xs text-red-600 font-semibold" role="alert">
                        {reviewError}
                      </p>
                    )}
                    <button type="submit" disabled={!draft.text.trim() || posting} className={`${btnPrimary} w-full h-11 text-sm`}>
                      {posting ? <i className="fa-solid fa-spinner animate-spin"></i> : t('product.publishReview')}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>

        {similar.length > 0 && (
          <section className="px-4 lg:px-0">
            <SectionHeader
              title={t('product.similar')}
              actionLabel={t('product.seeMore')}
              onAction={() => onNavigate('catalog', { category: product.category })}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-5">
              {similar.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isFavorite={wishlist.includes(p.id)}
                  onOpen={onOpenProduct}
                  onAddToCart={(prod) => onAddToCart(prod)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Barre d'achat fixée en bas (mobile) */}
      <div className="animate-sheet-in lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-8px_24px_-12px_rgba(16,24,20,0.15)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2.5">
        <button
          onClick={() => onNavigate('cart')}
          data-cart-target=""
          className="relative w-12 h-12 shrink-0 rounded-xl border border-slate-200 text-brand-900 cursor-pointer"
          aria-label={t('product.viewCart')}
        >
          <i className="fa-solid fa-cart-shopping"></i>
          {cartCount > 0 && (
            <span
              key={cartCount}
              className="animate-bump absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gold-500 text-brand-dark text-[10px] font-bold flex items-center justify-center"
            >
              {cartCount}
            </span>
          )}
        </button>
        <button
          onClick={addToCart}
          disabled={outOfStock}
          className={`${btnPrimary} flex-1 min-w-0 h-12 px-2 text-[13px] min-[400px]:text-sm leading-tight text-center ${
            justAdded ? 'bg-emerald-600! hover:bg-emerald-600!' : ''
          }`}
        >
          {justAdded ? (
            <>
              <i className="fa-solid fa-check animate-pop"></i>
              {t('product.added')}
            </>
          ) : (
            t('product.addToCart')
          )}
        </button>
        <button
          onClick={buyNow}
          disabled={outOfStock}
          className={`${btnGold} flex-1 min-w-0 h-12 px-2 text-[13px] min-[400px]:text-sm leading-tight text-center`}
        >
          {t('product.buyNow')}
        </button>
      </div>
    </div>
  );
};
