import React, { useEffect, useState } from 'react';
import { CartItem, CheckoutPayload, NavigateParams, Order, ScreenType, User } from '../types';
import { errorMessage } from '../api/client';
import { PaymentLogo, PhoneFlag } from '../components/PaymentLogo';
import { Confetti, EmptyState, MobileHeader, PageTitle, btnPrimary, cardClass, inputClass } from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import {
  CITIES,
  DELIVERY_METHODS,
  DeliveryMethodId,
  PAYMENT_OPTIONS,
  PromoCode,
  cartCount,
  cartSubtotal,
  formatPrice,
  getDeliveryFee,
} from '../utils/commerce';

/** Ce que l'écran transmet pour créer la commande (les articles viennent du panier). */
export type PlaceOrderDetails = Omit<CheckoutPayload, 'items' | 'promoCode'> & {
  saveAddress?: { title: string; address: string };
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

interface CheckoutScreenProps {
  cart: CartItem[];
  user: User;
  promo: PromoCode | null;
  selectedCity: string;
  onCityChange: (city: string) => void;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onBack: () => void;
  onPlaceOrder: (details: PlaceOrderDetails) => Promise<Order>;
  onPayOrder: (orderId: string) => Promise<Order>;
}

type PaymentStage = 'idle' | 'waiting' | 'success' | 'redirect';

/** Ligne à choix unique de la maquette : pastille, libellé, bouton radio à droite. */
const ChoiceRow: React.FC<{
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
}> = ({ name, checked, disabled, onChange, children }) => (
  <label
    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${checked ? 'border-brand-900 bg-brand-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
  >
    <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="sr-only peer" />
    {children}
    <span
      className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500 ${
        checked ? 'border-brand-900' : 'border-slate-300'
      }`}
      aria-hidden="true"
    >
      {checked && <span className="w-2.5 h-2.5 rounded-full bg-brand-900 animate-pop"></span>}
    </span>
  </label>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className={`${cardClass} p-4 lg:p-6`}>
    <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-3.5">{title}</h2>
    {children}
  </section>
);

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart,
  user,
  promo,
  selectedCity,
  onCityChange,
  onNavigate,
  onBack,
  onPlaceOrder,
  onPayOrder,
}) => {
  const { t, tn, rich, paymentLabel } = useI18n();
  const defaultAddress = user.addresses.find((a) => a.default) ?? user.addresses[0];
  const defaultPayment = user.paymentMethods.find((p) => p.default);

  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? 'new');
  const [newAddress, setNewAddress] = useState({ title: 'Domicile', address: '' });
  const [saveAddress, setSaveAddress] = useState(true);
  const [contactPhone, setContactPhone] = useState(user.phone);
  const [delivery, setDelivery] = useState<DeliveryMethodId>(selectedCity === 'Abidjan' ? 'express' : 'standard');
  const [payment, setPayment] = useState<string>(
    PAYMENT_OPTIONS.some((o) => o.id === defaultPayment?.type) ? defaultPayment!.type : 'Orange Money'
  );
  const [paymentPhone, setPaymentPhone] = useState(
    defaultPayment && defaultPayment.number.startsWith('+') ? defaultPayment.number : user.phone
  );
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: user.name });
  const [errors, setErrors] = useState<string[]>([]);
  const [stage, setStage] = useState<PaymentStage>('idle');
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    if (selectedCity !== 'Abidjan' && delivery === 'express') setDelivery('standard');
  }, [selectedCity, delivery]);

  const subtotal = cartSubtotal(cart);
  const deliveryFee = getDeliveryFee(delivery, selectedCity, subtotal);
  const discount = promo ? promo.compute(subtotal, deliveryFee) : 0;
  const total = subtotal + deliveryFee - discount;
  const paymentOption = PAYMENT_OPTIONS.find((o) => o.id === payment)!;
  const cashOnDelivery = payment === 'Paiement à la livraison';
  const methodLabel = paymentLabel(payment);
  const payLabel = cashOnDelivery ? t('checkout.confirm') : t('checkout.pay', { amount: formatPrice(total) });

  const header = <MobileHeader title={t('common.payment')} onBack={onBack} />;

  if (cart.length === 0 && stage === 'idle') {
    return (
      <div className="pb-6">
        {header}
        <div className="max-w-xl mx-auto px-4 pt-6 lg:pt-12">
          <EmptyState
            icon="fa-solid fa-cart-shopping"
            title={t('checkout.emptyTitle')}
            text={t('checkout.emptyText')}
            action={
              <button onClick={() => onNavigate('categories')} className={`${btnPrimary} h-11 px-5 text-sm`}>
                {t('common.discoverProducts')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const shippingAddress = () => {
    if (addressId === 'new') return `${newAddress.address.trim()}, ${selectedCity}`;
    return user.addresses.find((x) => x.id === addressId)!.address;
  };

  const validate = () => {
    const list: string[] = [];
    if (addressId === 'new' && newAddress.address.trim().length < 8) list.push(t('checkout.err.address'));
    if (contactPhone.replace(/\D/g, '').length < 8) list.push(t('checkout.err.phone'));
    if (paymentOption.needsPhone && paymentPhone.replace(/\D/g, '').length < 8)
      list.push(t('checkout.err.paymentPhone', { method: methodLabel }));
    if (payment === 'Carte bancaire') {
      if (card.number.replace(/\s/g, '').length < 16) list.push(t('checkout.err.cardNumber'));
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) list.push(t('checkout.err.cardExpiry'));
      if (!/^\d{3}$/.test(card.cvc)) list.push(t('checkout.err.cvc'));
    }
    setErrors(list);
    return list.length === 0;
  };

  const confirm = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStage('waiting');
    setPlacedTotal(total);
    try {
      // 1. Le serveur crée la commande (prix, stock et remises recalculés de son côté).
      const order = await onPlaceOrder({
        deliveryMethod: delivery,
        city: selectedCity,
        shippingAddress: shippingAddress(),
        contactPhone,
        paymentMethod: payment,
        paymentPhone: paymentOption.needsPhone ? paymentPhone : undefined,
        saveAddress:
          addressId === 'new' && saveAddress ? { title: newAddress.title || 'Adresse', address: shippingAddress() } : undefined,
      });
      setPlacedTotal(order.total);
      // 2a. Paiement en ligne (GeniusPay) : page de paiement sécurisée ; le retour se fait sur le suivi de la commande.
      if (order.paymentUrl) {
        setStage('redirect');
        await wait(900);
        window.location.assign(order.paymentUrl);
        return;
      }
      // 2b. Démonstration : paiement simulé (voir server/payments.ts).
      if (order.paymentStatus === 'en_attente') {
        await wait(2500);
        await onPayOrder(order.id);
      }
      setStage('success');
      await wait(1700);
      onNavigate('tracking', { orderId: order.id });
    } catch (error) {
      setStage('idle');
      setErrors([errorMessage(error)]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="pb-6 lg:pb-12">
      {header}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
        <button
          onClick={() => onNavigate('cart')}
          className="hidden lg:inline-block text-sm font-semibold text-slate-500 hover:text-brand-900 mb-3 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left mr-1.5"></i>
          {t('checkout.backToCart')}
        </button>
        <PageTitle title={t('common.payment')} subtitle={t('checkout.subtitle')} />

        {errors.length > 0 && (
          <div key={errors.join()} className="animate-shake bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-4 text-sm" role="alert">
            <p className="font-semibold mb-1">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {t('checkout.fixErrors')}
            </p>
            <ul className="list-disc pl-6 space-y-0.5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-4 lg:gap-8 items-start">
          <div className="space-y-4 stagger">
            <Section title={t('checkout.choosePayment')}>
              <div className="space-y-2.5">
                {PAYMENT_OPTIONS.map((o) => (
                  <ChoiceRow key={o.id} name="payment" checked={payment === o.id} onChange={() => setPayment(o.id)}>
                    <PaymentLogo method={o.id} />
                    <span className="text-sm font-medium text-slate-800">{paymentLabel(o.id)}</span>
                    {o.id === 'Carte bancaire' && (
                      <span className="hidden sm:flex items-center gap-1.5 text-xl text-slate-500" aria-hidden="true">
                        <i className="fa-brands fa-cc-visa"></i>
                        <i className="fa-brands fa-cc-mastercard"></i>
                      </span>
                    )}
                  </ChoiceRow>
                ))}
              </div>

              <div className="mt-5">
                {paymentOption.needsPhone && (
                  <label className="block text-sm font-medium text-slate-700">
                    {t('common.paymentNumber', { method: methodLabel })}
                    <span className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-brand-900 focus-within:ring-2 focus-within:ring-brand-900/10">
                      <PhoneFlag phone={paymentPhone} />
                      <input
                        type="tel"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        autoComplete="tel"
                        className="flex-1 min-w-0 py-3 text-sm bg-transparent focus:outline-none tabular-nums"
                      />
                    </span>
                    <span className="block text-xs text-slate-400 font-normal mt-1.5">
                      {t('checkout.paymentNumberHint')}
                    </span>
                  </label>
                )}

                {payment === 'Carte bancaire' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      placeholder={t('checkout.cardName')}
                      autoComplete="cc-name"
                      className={`${inputClass} col-span-2`}
                    />
                    <input
                      value={card.number}
                      onChange={(e) =>
                        setCard({
                          ...card,
                          number: e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 16)
                            .replace(/(.{4})/g, '$1 ')
                            .trim(),
                        })
                      }
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder={t('common.cardNumber')}
                      className={`${inputClass} col-span-2 tabular-nums`}
                    />
                    <input
                      value={card.expiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCard({ ...card, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits });
                      }}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder={t('checkout.cardExpiry')}
                      className={inputClass}
                    />
                    <input
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="CVC"
                      className={inputClass}
                    />
                  </div>
                )}

                {cashOnDelivery && (
                  <p className="text-sm text-slate-600 bg-surface-light rounded-xl p-4">
                    <i className="fa-solid fa-circle-info text-brand-900 mr-2"></i>
                    {rich('checkout.cashNote', { amount: <strong>{formatPrice(total)}</strong> })}
                  </p>
                )}
              </div>
            </Section>

            <Section title={t('checkout.address')}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="text-sm font-medium text-slate-700">
                  {t('common.city')}
                  <select value={selectedCity} onChange={(e) => onCityChange(e.target.value)} className={`${inputClass} mt-1.5`}>
                    {CITIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('common.phone')}
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    autoComplete="tel"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
              </div>
              <div className="space-y-2.5">
                {user.addresses.map((a) => (
                  <ChoiceRow key={a.id} name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)}>
                    <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-location-dot"></i>
                    </span>
                    <span className="text-sm min-w-0">
                      <strong className="font-semibold text-slate-900 block">
                        {a.title}
                        {a.default && <span className="ml-2 text-[10px] font-semibold text-brand-700 uppercase">{t('common.default')}</span>}
                      </strong>
                      <span className="text-slate-500 line-clamp-2">{a.address}</span>
                    </span>
                  </ChoiceRow>
                ))}
                <ChoiceRow name="address" checked={addressId === 'new'} onChange={() => setAddressId('new')}>
                  <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-plus"></i>
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{t('checkout.newAddress')}</span>
                </ChoiceRow>
                {addressId === 'new' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <input
                      value={newAddress.title}
                      onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
                      placeholder={t('checkout.addressName')}
                      className={inputClass}
                    />
                    <input
                      value={newAddress.address}
                      onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                      placeholder={t('checkout.addressPlaceholder')}
                      autoComplete="street-address"
                      className={`${inputClass} sm:col-span-2`}
                    />
                    <label className="sm:col-span-3 flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                      {t('checkout.saveAddress')}
                    </label>
                  </div>
                )}
              </div>
            </Section>

            <Section title={t('checkout.deliveryMethod')}>
              <div className="space-y-2.5">
                {DELIVERY_METHODS.map((m) => {
                  const disabled = m.id === 'express' && selectedCity !== 'Abidjan';
                  const fee = getDeliveryFee(m.id, selectedCity, subtotal);
                  return (
                    <ChoiceRow
                      key={m.id}
                      name="delivery"
                      checked={delivery === m.id}
                      disabled={disabled}
                      onChange={() => setDelivery(m.id)}
                    >
                      <span className="w-10 h-10 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center shrink-0">
                        <i className={`fa-solid ${m.icon}`}></i>
                      </span>
                      <span className="text-sm min-w-0 flex-1">
                        <strong className="font-semibold text-slate-900 block">{t(`delivery.${m.id}.label` as TranslationKey)}</strong>
                        <span className="text-xs text-slate-500">{t(`delivery.${m.id}.description` as TranslationKey)}</span>
                      </span>
                      <span className="text-sm font-semibold text-brand-900 tabular-nums whitespace-nowrap">
                        {fee === 0 ? t('common.free') : formatPrice(fee)}
                      </span>
                    </ChoiceRow>
                  );
                })}
              </div>
            </Section>
          </div>

          <aside className={`${cardClass} p-4 lg:p-5 lg:sticky lg:top-36`}>
            <button
              onClick={() => setShowItems((v) => !v)}
              className="w-full flex items-center justify-between text-left lg:cursor-default cursor-pointer"
              aria-expanded={showItems}
            >
              <h2 className="text-base lg:text-lg font-semibold text-slate-900">{t('checkout.yourOrder')}</h2>
              <span className="text-sm text-slate-500 lg:hidden">
                {tn('common.items', cartCount(cart))}
                <i className={`fa-solid fa-chevron-down ml-2 text-xs transition-transform ${showItems ? 'rotate-180' : ''}`}></i>
              </span>
            </button>
            <ul className={`${showItems ? 'block' : 'hidden'} lg:block space-y-3 max-h-64 overflow-y-auto mt-4 pr-1`}>
              {cart.map((item) => (
                <li key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-3">
                  <span className="relative w-14 h-14 rounded-lg bg-cream overflow-hidden shrink-0">
                    <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-0 right-0 bg-brand-900 text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-bl-lg flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-slate-800 line-clamp-2">{item.product.title}</span>
                    <span className="block text-[11px] text-slate-400">
                      {[item.selectedColor, item.selectedSize].filter(Boolean).join(' • ')}
                    </span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 text-sm border-t border-slate-100 pt-4 mt-4">
              <div className="flex justify-between">
                <dt className="text-slate-600">{t('common.subtotal')}</dt>
                <dd className="font-medium tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">{t('common.delivery')}</dt>
                <dd className="font-medium tabular-nums">{deliveryFee === 0 ? t('common.free') : formatPrice(deliveryFee)}</dd>
              </div>
              {promo && discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>{t('cart.code', { code: promo.code })}</dt>
                  <dd className="font-medium tabular-nums">-{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-slate-100">
                <dt className="font-semibold">{t('checkout.totalToPay')}</dt>
                <dd className="text-xl font-display font-bold text-brand-900 tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>
            <div className="hidden lg:block mt-5">
              <button onClick={confirm} disabled={stage !== 'idle'} className={`${btnPrimary} w-full h-12`}>
                <i className="fa-solid fa-lock"></i>
                {payLabel}
              </button>
              <p className="text-xs text-slate-400 text-center mt-3">
                <i className="fa-solid fa-shield-halved mr-1"></i>
                {t('common.securePayment')}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Bouton de paiement fixé en bas (mobile) */}
      <div className="animate-sheet-in lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-8px_24px_-12px_rgba(16,24,20,0.15)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button onClick={confirm} disabled={stage !== 'idle'} className={`${btnPrimary} w-full h-12`}>
          <i className="fa-solid fa-lock"></i>
          {payLabel}
        </button>
        <p className="text-[11px] text-slate-400 text-center mt-1.5">
          <i className="fa-solid fa-shield-halved mr-1"></i>
          {t('common.securePayment')}
        </p>
      </div>

      {/* Fenêtre de paiement */}
      {stage !== 'idle' && (
        <div className="animate-fade-in fixed inset-0 z-90 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lift animate-scale-in" aria-live="assertive">
            {stage === 'redirect' ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-brand-50 text-brand-900 flex items-center justify-center text-2xl mb-5 animate-pop">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t('checkout.toGeniusPay')}</h3>
                <p className="text-sm text-slate-500 mt-2">{t('checkout.toGeniusPayText')}</p>
              </>
            ) : stage === 'waiting' ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-brand-100 border-t-brand-900 animate-spin mb-5"></div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {paymentOption.needsPhone ? t('checkout.confirmOnPhone') : t('checkout.processing')}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {paymentOption.needsPhone
                    ? t('checkout.requestSent', { amount: formatPrice(placedTotal ?? total), phone: paymentPhone, method: methodLabel })
                    : t('checkout.wait')}
                </p>
              </>
            ) : (
              <>
                <Confetti className="absolute inset-x-0 top-[4.5rem]" />
                <svg viewBox="0 0 80 80" className="check-draw w-20 h-20 mx-auto mb-4 animate-pop text-emerald-600" aria-hidden="true">
                  <circle cx="40" cy="40" r="36" fill="#ecfdf5" stroke="currentColor" strokeWidth="4" />
                  <path d="M24 41l10 10 23-22" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900">
                  {cashOnDelivery ? t('checkout.orderConfirmed') : t('checkout.paymentAccepted')}
                </h3>
                <p className="text-sm text-slate-500 mt-2">{t('checkout.redirecting')}</p>
              </>
            )}
            {stage !== 'redirect' && (
              <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold mt-6">{t('common.demoMode')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
