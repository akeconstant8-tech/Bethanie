import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../types';
import { useI18n } from '../i18n';
import { LOW_STOCK, formatPrice } from '../utils/commerce';
import { HeartBurst } from './ui';
import { flyToCart, isOnScreen, markSharedPhoto, tiltHandlers, useEntrance } from '../utils/motion';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onOpen: (product: Product) => void;
  /** Renvoie false quand le produit n'a pas été ajouté (taille à choisir sur la fiche). */
  onAddToCart: (product: Product) => boolean | void;
  onToggleWishlist: (productId: string) => void;
}

export type ProductBadge = { id: 'promo' | 'new' | 'lowStock'; className: string };

/** Pourcentage de la promotion fixée par le vendeur (0 sans promotion). */
export const discountPercent = (product: Product) =>
  product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

/**
 * Badges vrais uniquement : « Promotion » si le vendeur a fixé un ancien prix plus élevé, « Nouveau » si le produit
 * a été mis en vente il y a moins de 30 jours (calculé par le serveur), « Stock limité » à 5 pièces ou moins.
 */
export const productBadges = (product: Product): ProductBadge[] => {
  if (product.isDemo) return [];
  const badges: ProductBadge[] = [];
  if (discountPercent(product) > 0) badges.push({ id: 'promo', className: 'bg-red-600 text-white' });
  if (product.isNew) badges.push({ id: 'new', className: 'bg-brand-900 text-white' });
  if (product.stock > 0 && product.stock <= LOW_STOCK) badges.push({ id: 'lowStock', className: 'bg-amber-400 text-amber-950' });
  return badges;
};

/** Texte d'un badge (« Promo -20 % », « Nouveau », « Stock limité »). */
export const useBadgeLabel = () => {
  const { t } = useI18n();
  return (badge: ProductBadge, product: Product) =>
    badge.id === 'promo' ? t('badge.promo', { pct: discountPercent(product) }) : t(badge.id === 'new' ? 'badge.new' : 'badge.lowStock');
};

/** Carte produit commune à l'accueil, au catalogue, à la fiche produit, au panier et au compte. */
export const ProductCard: React.FC<ProductCardProps> = ({ product, isFavorite, onOpen, onAddToCart, onToggleWishlist }) => {
  const { t, tn } = useI18n();
  const badgeLabel = useBadgeLabel();
  const [added, setAdded] = useState(false);
  const [heartPops, setHeartPops] = useState(0);
  const timer = useRef<number>(undefined);
  const photo = useRef<HTMLImageElement>(null);
  const card = useRef<HTMLElement>(null);
  const outOfStock = product.stock <= 0;
  const unavailable = outOfStock || Boolean(product.isDemo);
  const badges = productBadges(product);
  // La carte monte quand elle entre dans l'écran (en cascade avec ses voisines).
  useEntrance(card);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = () => {
    markSharedPhoto(photo.current);
    onOpen(product);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unavailable) return;
    if (onAddToCart(product) === false) return;
    // La photo s'envole vers le panier ; si elle est sortie de l'écran, la vignette part du bouton.
    flyToCart(product.image, photo.current && isOnScreen(photo.current) ? photo.current : e.currentTarget);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article
      ref={card}
      onClick={open}
      {...tiltHandlers}
      className="tilt group relative bg-white rounded-2xl border border-slate-200/70 shadow-soft overflow-hidden hover:shadow-lift hover:-translate-y-1 active:scale-[0.99] transition-[translate,scale,box-shadow,transform] duration-300 ease-out flex flex-col cursor-pointer"
    >
      <div
        aria-hidden="true"
        className="tilt-glare pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      ></div>
      <div className="relative aspect-square bg-cream overflow-hidden">
        <img
          ref={photo}
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {badges.map((badge) => (
              <span
                key={badge.id}
                className={`card-badge text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${badge.className}`}
              >
                {badgeLabel(badge, product)}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isFavorite) setHeartPops((n) => n + 1);
            onToggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center cursor-pointer"
          aria-label={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
          aria-pressed={isFavorite}
        >
          {isFavorite && heartPops > 0 && <HeartBurst key={heartPops} />}
          <i
            key={heartPops}
            className={`${isFavorite ? 'fa-solid text-red-500' : 'fa-regular text-slate-600'} fa-heart text-sm ${
              heartPops > 0 ? 'animate-pop' : ''
            }`}
          ></i>
        </button>
        {/* Produit d'exemple et produit d'occasion : signalés sur la photo. */}
        {(product.isDemo || product.condition === 'occasion') && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {product.isDemo && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/90 text-slate-600 ring-1 ring-slate-200">
                {t('badge.demo')}
              </span>
            )}
            {product.condition === 'occasion' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-600 text-white">{t('badge.used')}</span>
            )}
          </div>
        )}
        {outOfStock && !product.isDemo && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full">{t('common.outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-sans text-sm font-medium text-slate-800 line-clamp-2 leading-snug min-h-10">{product.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
          <p className="text-sm sm:text-base font-semibold text-brand-900 tabular-nums leading-tight">{formatPrice(product.price)}</p>
          {discountPercent(product) > 0 && (
            <s className="text-[11px] text-slate-400 tabular-nums">{formatPrice(product.originalPrice!)}</s>
          )}
        </div>
        {!product.isDemo && (product.reviewsCount > 0 || product.soldCount) && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            {product.reviewsCount > 0 && (
              <>
                <i className="fa-solid fa-star text-gold-500"></i>
                <span className="font-medium text-slate-700">{product.rating}</span>
              </>
            )}
            {product.reviewsCount > 0 && product.soldCount ? <span aria-hidden="true">·</span> : null}
            {product.soldCount ? <span>{tn('card.sold', product.soldCount)}</span> : null}
          </p>
        )}
        <p className="mt-1.5 text-[11px] text-slate-500 truncate" title={t('card.soldBy', { name: product.vendor.name })}>
          <i className="fa-solid fa-store w-3.5 text-slate-400" aria-hidden="true"></i>
          <span className="font-medium text-slate-600">{product.vendor.name}</span>
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          <i className="fa-solid fa-location-dot w-3.5 text-slate-400" aria-hidden="true"></i>
          {product.location}
        </p>

        <div className="mt-auto pt-3 grid gap-1.5">
          <button
            onClick={handleAdd}
            disabled={unavailable}
            className={`group/add h-9 px-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 transition-[background-color,box-shadow,scale] duration-200 ease-out ${
              added
                ? 'bg-emerald-600'
                : 'bg-brand-900 hover:bg-brand-dark hover:shadow-[0_8px_18px_-8px_rgba(15,81,50,0.7)] active:scale-[0.97]'
            }`}
            aria-label={
              unavailable
                ? `${product.isDemo ? t('card.demoOnly') : t('card.unavailable')} : ${product.title}`
                : t('product.addToCartNamed', { title: product.title })
            }
          >
            {/* Le panier pivote au survol ; la coche apparaît d'un bond une fois le produit ajouté. */}
            <i
              key={added ? 'ok' : 'add'}
              className={`fa-solid ${
                added ? 'fa-check animate-pop' : 'fa-cart-plus transition-transform duration-300 ease-spring group-hover/add:-rotate-12'
              }`}
              aria-hidden="true"
            ></i>
            <span className="truncate">
              {unavailable ? (product.isDemo ? t('card.demoOnly') : t('card.unavailable')) : added ? t('product.added') : t('card.addToCart')}
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="h-8 px-2 rounded-xl text-xs font-semibold text-brand-900 hover:bg-brand-50 cursor-pointer transition-colors"
            aria-label={t('card.viewProductNamed', { title: product.title })}
          >
            {t('card.viewProduct')}
          </button>
        </div>
      </div>
    </article>
  );
};
