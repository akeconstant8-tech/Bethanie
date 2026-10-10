import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../types';
import { useI18n } from '../i18n';
import { formatPrice } from '../utils/commerce';
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

export const badgeColor = (badge: string) =>
  badge === 'Promotion' || badge.startsWith('-')
    ? 'bg-red-600 text-white'
    : badge === 'Bio'
    ? 'bg-gold-500 text-brand-dark'
    : 'bg-brand-900 text-white';

/** Carte produit commune à l'accueil, au catalogue, à la fiche produit, au panier et au compte. */
export const ProductCard: React.FC<ProductCardProps> = ({ product, isFavorite, onOpen, onAddToCart, onToggleWishlist }) => {
  const { t, badgeLabel } = useI18n();
  const [added, setAdded] = useState(false);
  const [heartPops, setHeartPops] = useState(0);
  const timer = useRef<number>(undefined);
  const photo = useRef<HTMLImageElement>(null);
  const card = useRef<HTMLElement>(null);
  const outOfStock = product.stock <= 0;
  // La carte monte quand elle entre dans l'écran (en cascade avec ses voisines).
  useEntrance(card);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = () => {
    markSharedPhoto(photo.current);
    onOpen(product);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
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
        {product.discountBadge && (
          <span
            className={`card-badge absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${badgeColor(
              product.discountBadge
            )}`}
          >
            {badgeLabel(product.discountBadge)}
          </span>
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
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full">{t('common.outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-sans text-sm font-medium text-slate-800 line-clamp-2 leading-snug min-h-10">{product.title}</h3>
        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold text-brand-900 tabular-nums leading-tight">{formatPrice(product.price)}</p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              {product.reviewsCount > 0 ? (
                <>
                  <i className="fa-solid fa-star text-gold-500"></i>
                  <span className="font-medium text-slate-700">{product.rating}</span>
                </>
              ) : (
                <span className="font-semibold text-brand-700">{t('common.new')}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={`group/add shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center cursor-pointer disabled:bg-slate-200 transition-[background-color,box-shadow,scale,transform] duration-200 ease-out ${
              added
                ? 'bg-emerald-600'
                : 'bg-brand-900 hover:bg-brand-dark hover:scale-[1.06] hover:shadow-[0_8px_18px_-8px_rgba(15,81,50,0.7)] disabled:hover:scale-100'
            }`}
            aria-label={t('product.addToCartNamed', { title: product.title })}
          >
            {/* Le « + » pivote au survol ; la coche apparaît d'un bond une fois le produit ajouté. */}
            <i
              key={added ? 'ok' : 'add'}
              className={`fa-solid ${
                added ? 'fa-check animate-pop' : 'fa-plus transition-transform duration-300 ease-spring group-hover/add:rotate-90'
              } text-sm`}
            ></i>
          </button>
        </div>
      </div>
    </article>
  );
};
