import React, { useState } from 'react';
import { CartItem, NavigateParams, Product, ScreenType } from '../types';
import { ProductCard } from '../components/ProductCard';
import {
  CountUp,
  EmptyState,
  HeaderIconButton,
  MobileHeader,
  PageTitle,
  QuantityStepper,
  SectionHeader,
  btnOutline,
  btnPrimary,
  cardClass,
  inputClass,
} from '../components/ui';
import { useI18n } from '../i18n';
import {
  FREE_DELIVERY_THRESHOLD,
  PROMO_CODES,
  PromoCode,
  cartCount,
  cartSubtotal,
  formatPrice,
  getDeliveryFee,
} from '../utils/commerce';

interface CartScreenProps {
  cart: CartItem[];
  products: Product[];
  wishlist: string[];
  promo: PromoCode | null;
  selectedCity: string;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onOpenProduct: (product: Product) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onSaveForLater: (index: number) => void;
  onClear: () => void;
  onApplyPromo: (code: string) => boolean;
  onRemovePromo: () => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  cart,
  products,
  wishlist,
  promo,
  selectedCity,
  onNavigate,
  onOpenProduct,
  onUpdateQuantity,
  onRemove,
  onSaveForLater,
  onClear,
  onApplyPromo,
  onRemovePromo,
  onAddToCart,
  onToggleWishlist,
}) => {
  const { t, tn, rich, promoLabel } = useI18n();
  const [code, setCode] = useState('');
  const [promoError, setPromoError] = useState('');

  /** « M » devient « Taille M » ; « Taille unique » reste tel quel. */
  const sizeLabel = (size: string) => (/^taille/i.test(size) ? size : t('cart.size', { size }));

  const subtotal = cartSubtotal(cart);
  const deliveryFee = getDeliveryFee('standard', selectedCity, subtotal);
  const discount = promo ? promo.compute(subtotal, deliveryFee) : 0;
  const total = subtotal + deliveryFee - discount;
  const itemCount = cartCount(cart);
  const savings = cart.reduce(
    (sum, item) => sum + ((item.product.originalPrice ?? item.product.price) - item.product.price) * item.quantity,
    0
  );

  // Regroupe les lignes par vendeur en conservant l'index d'origine dans le panier.
  const groups = cart.reduce<Record<string, { vendorName: string; lines: { item: CartItem; index: number }[] }>>(
    (acc, item, index) => {
      const key = item.product.vendor.id;
      acc[key] ??= { vendorName: item.product.vendor.name, lines: [] };
      acc[key].lines.push({ item, index });
      return acc;
    },
    {}
  );

  const cartIds = new Set(cart.map((i) => i.product.id));
  const suggestions = products.filter((p) => !cartIds.has(p.id) && p.stock > 0).slice(0, 4);

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (onApplyPromo(code)) {
      setCode('');
      setPromoError('');
    } else {
      setPromoError(t('cart.promoInvalid'));
    }
  };

  const header = (
    <MobileHeader
      title={t('common.myCart')}
      actions={cart.length > 0 && <HeaderIconButton icon="fa-regular fa-trash-can" label={t('cart.clear')} onClick={onClear} />}
    />
  );

  if (cart.length === 0) {
    return (
      <div className="pb-6 lg:pb-12">
        {header}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
          <PageTitle title={t('common.myCart')} />
          <EmptyState
            icon="fa-solid fa-cart-shopping"
            title={t('cart.emptyTitle')}
            text={t('cart.emptyText')}
            action={
              <>
                <button onClick={() => onNavigate('categories')} className={`${btnPrimary} h-11 px-5 text-sm`}>
                  {t('common.discoverProducts')}
                </button>
                {wishlist.length > 0 && (
                  <button onClick={() => onNavigate('account', { tab: 'wishlist' })} className={`${btnOutline} h-11 px-5 text-sm`}>
                    {t('cart.favoritesCount', { n: wishlist.length })}
                  </button>
                )}
              </>
            }
          />
          {suggestions.length > 0 && (
            <section className="mt-8 lg:mt-12">
              <SectionHeader title={t('cart.suggestions')} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-5">
                {suggestions.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isFavorite={wishlist.includes(p.id)}
                    onOpen={onOpenProduct}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 lg:pb-12">
      {header}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
        <PageTitle
          title={t('common.myCart')}
          subtitle={t('cart.itemsFrom', {
            items: tn('common.items', itemCount),
            vendors: tn('cart.vendors', Object.keys(groups).length),
          })}
          action={
            <div className="flex items-center gap-5">
              <button onClick={onClear} className="text-sm font-semibold text-slate-500 hover:text-red-600 cursor-pointer">
                <i className="fa-regular fa-trash-can mr-1.5"></i>
                {t('cart.clear')}
              </button>
              <button
                onClick={() => onNavigate('catalog', { category: 'all' })}
                className="text-sm font-semibold text-brand-900 hover:text-brand-700 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left mr-1.5 text-xs"></i>
                {t('cart.continue')}
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-4 lg:gap-8 items-start">
          <div className="space-y-4 stagger">
            {subtotal < FREE_DELIVERY_THRESHOLD ? (
              <div className={`${cardClass} p-4`}>
                <p className="text-xs text-slate-600">
                  <i className="fa-solid fa-truck-fast text-brand-900 mr-2"></i>
                  {rich('cart.freeDeliveryLeft', {
                    amount: <strong className="text-brand-900">{formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)}</strong>,
                  })}
                </p>
                <div className="h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-gold-400 to-gold-500 rounded-full transition-[width] duration-500 ease-out animate-grow-x"
                    style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-semibold">
                <i className="fa-solid fa-gift mr-2"></i>
                {t('cart.freeDelivery')}
              </p>
            )}

            {Object.entries(groups).map(([vendorId, group]) => (
              <section key={vendorId} className={`${cardClass} overflow-hidden`}>
                <button
                  onClick={() => onNavigate('catalog', { vendor: vendorId, category: 'all' })}
                  className="w-full px-4 pt-3.5 pb-1 text-left text-xs font-semibold text-slate-500 hover:text-brand-900 cursor-pointer"
                >
                  <i className="fa-solid fa-store text-brand-700 mr-1.5"></i>
                  {group.vendorName}
                </button>
                <ul className="divide-y divide-slate-100">
                  {group.lines.map(({ item, index }) => (
                    <li key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}`} className="p-4 flex gap-3.5">
                      <button
                        onClick={() => onOpenProduct(item.product)}
                        className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-cream overflow-hidden shrink-0 cursor-pointer"
                        aria-label={item.product.title}
                      >
                        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                      </button>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => onOpenProduct(item.product)}
                              className="text-sm font-semibold text-slate-900 hover:text-brand-900 text-left line-clamp-2 cursor-pointer"
                            >
                              {item.product.title}
                            </button>
                            {(item.selectedColor || item.selectedSize) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {[item.selectedColor, item.selectedSize && sizeLabel(item.selectedSize)].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                          <div className="flex -mr-2 -mt-1.5 shrink-0">
                            <button
                              onClick={() => onSaveForLater(index)}
                              className="w-9 h-9 rounded-full text-slate-400 hover:text-brand-900 hover:bg-slate-50 cursor-pointer"
                              aria-label={t('cart.saveForLater')}
                              title={t('cart.saveForLater')}
                            >
                              <i className="fa-regular fa-heart"></i>
                            </button>
                            <button
                              onClick={() => onRemove(index)}
                              className="w-9 h-9 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              aria-label={t('common.delete')}
                              title={t('common.delete')}
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                          <QuantityStepper
                            size="sm"
                            value={item.quantity}
                            max={item.product.stock}
                            onChange={(q) => onUpdateQuantity(index, q)}
                          />
                          <div className="text-right">
                            <p className="text-sm lg:text-base font-bold text-brand-900 tabular-nums">
                              {formatPrice(item.product.price * item.quantity)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-[11px] text-slate-400 tabular-nums">
                                {t('cart.perUnit', { price: formatPrice(item.product.price) })}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.product.stock <= 5 && (
                          <p className="text-[11px] text-amber-700 font-semibold mt-1">
                            {t('common.lowStock', { n: item.product.stock })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-36 animate-rise-in" style={{ '--delay': '120ms' } as React.CSSProperties}>
            <form onSubmit={applyPromo} className={`${cardClass} p-4`}>
              <label htmlFor="promo" className="text-sm font-semibold text-slate-900 block mb-2">
                {t('cart.promo')}
              </label>
              {promo ? (
                <div className="flex items-center justify-between gap-3 bg-emerald-50 text-emerald-800 rounded-xl px-3.5 py-2.5 text-sm">
                  <span>
                    <i className="fa-solid fa-ticket mr-2"></i>
                    <strong>{promo.code}</strong> • {promoLabel(promo.code)}
                  </span>
                  <button
                    type="button"
                    onClick={onRemovePromo}
                    className="text-emerald-700 hover:text-red-600 cursor-pointer"
                    aria-label={t('cart.removePromo')}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      id="promo"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setPromoError('');
                      }}
                      placeholder={t('cart.promoPlaceholder')}
                      className={`${inputClass} uppercase placeholder:normal-case`}
                    />
                    <button type="submit" className={`${btnPrimary} px-4 text-sm shrink-0`}>
                      {t('cart.apply')}
                    </button>
                  </div>
                  {promoError && (
                    <p key={promoError} className="animate-shake text-xs text-red-600 font-semibold mt-2" role="alert">
                      {promoError}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t('cart.demoCodes', { codes: PROMO_CODES.map((p) => p.code).join(', ') })}
                  </p>
                </>
              )}
            </form>

            <div className={`${cardClass} p-4 lg:p-5`}>
              <h2 className="hidden lg:block text-lg font-semibold text-slate-900 mb-4">{t('cart.summary')}</h2>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">{t('common.subtotal')}</dt>
                  <dd className="font-medium tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">
                    {t('common.delivery')} <span className="text-xs text-slate-400">({selectedCity})</span>
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {deliveryFee === 0 ? <span className="text-emerald-700">{t('common.free')}</span> : formatPrice(deliveryFee)}
                  </dd>
                </div>
                {promo && discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>{t('cart.code', { code: promo.code })}</dt>
                    <dd className="font-medium tabular-nums">-{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-3 border-t border-slate-100">
                  <dt className="font-semibold text-slate-900">{t('common.total')}</dt>
                  <dd className="text-xl font-display font-bold text-brand-900 tabular-nums">
                    <CountUp value={total} format={formatPrice} duration={450} animateOnMount={false} />
                  </dd>
                </div>
              </dl>
              {savings + discount > 0 && (
                <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 font-semibold mt-3">
                  <i className="fa-solid fa-piggy-bank mr-1.5"></i>
                  {t('cart.savings', { amount: formatPrice(savings + discount) })}
                </p>
              )}
              <button onClick={() => onNavigate('checkout')} className={`${btnPrimary} w-full h-12 mt-4`}>
                {t('cart.checkout')}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2.5">
                <i className="fa-solid fa-lock mr-1"></i>
                {t('cart.securePayments')}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
