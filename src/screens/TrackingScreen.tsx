import React, { useEffect, useState } from 'react';
import { NavigateParams, Order, Product, ScreenType } from '../types';
import { EmptyState, HeaderIconButton, MobileHeader, PageTitle, StatusPill, btnOutline, btnPrimary, cardClass } from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import { ORDER_FLOW, formatPrice, nextStatus } from '../utils/commerce';

interface TrackingScreenProps {
  orders: Order[];
  orderId?: string;
  newOrderId: string | null;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
  onAdvanceOrder: (orderId: string) => Promise<void>;
  onPayOrder: (orderId: string) => Promise<void>;
  /** Mode démo du serveur : le client peut simuler l'avancement de sa commande. */
  demoMode: boolean;
}

const SUPPORT_EMAIL = 'mailto:contact@bethanie.ci';

export const TrackingScreen: React.FC<TrackingScreenProps> = ({
  orders,
  orderId,
  newOrderId,
  onNavigate,
  onBack,
  onOpenProduct,
  onAdvanceOrder,
  onPayOrder,
  demoMode,
}) => {
  const { t, stepLabel, paymentLabel, paymentStatusLabel } = useI18n();
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const order = orders.find((o) => o.id === orderId) ?? orders[0];

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase().replace(/^#/, '');
    const found = orders.find((o) => o.id === q || o.id === `BTH-${q}` || o.id.replace('-', '') === q);
    if (found) {
      setSearchError('');
      setQuery('');
      onNavigate('tracking', { orderId: found.id });
    } else {
      setSearchError(t('tracking.notFound', { q: query.trim() }));
    }
  };

  const header = (
    <MobileHeader
      title={t('common.orderTracking')}
      onBack={onBack}
      actions={
        <HeaderIconButton
          icon="fa-solid fa-clock-rotate-left"
          label={t('tracking.history')}
          onClick={() => onNavigate('account', { tab: 'orders' })}
        />
      }
    />
  );

  if (!order) {
    return (
      <div className="pb-6">
        {header}
        <div className="max-w-xl mx-auto px-4 pt-6 lg:pt-12">
          <EmptyState
            icon="fa-solid fa-truck-fast"
            title={t('tracking.emptyTitle')}
            text={t('tracking.emptyText')}
            action={
              <button onClick={() => onNavigate('categories')} className={`${btnPrimary} h-11 px-5 text-sm`}>
                {t('tracking.startShopping')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const paymentPending = order.paymentStatus === 'en_attente';
  const canAdvance = demoMode && !paymentPending && nextStatus(order.status) !== null;
  const delivered = order.status === 'livrée';
  const cancelled = order.status === 'annulée';

  return (
    <div className="pb-6 lg:pb-12">
      {header}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
        <PageTitle title={t('common.orderTracking')} subtitle={t('tracking.subtitle')} />

        {newOrderId === order.id && (
          <div className="animate-scale-in bg-brand-900 text-white rounded-2xl p-4 lg:p-5 flex items-center gap-4 mb-4 lg:mb-6">
            <span className="w-11 h-11 rounded-full bg-gold-500 text-brand-dark flex items-center justify-center text-xl shrink-0 animate-pop">
              <i className="fa-solid fa-check"></i>
            </span>
            <div>
              <p className="font-display font-semibold">{t('tracking.thanks')}</p>
              <p className="text-sm text-white/80">{t('tracking.thanksText')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 lg:gap-8 items-start">
          {/* Liste des commandes (ordinateur) */}
          <aside className={`hidden lg:block ${cardClass} overflow-hidden lg:sticky lg:top-36`}>
            <form onSubmit={search} className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-surface-light border border-slate-200 focus-within:border-brand-900">
                <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm"></i>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchError('');
                  }}
                  placeholder={t('tracking.orderNumber')}
                  aria-label={t('tracking.searchOrder')}
                  className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
                />
              </div>
              {searchError && <p className="text-xs text-red-600 font-semibold mt-2">{searchError}</p>}
            </form>
            <ul className="divide-y divide-slate-100 max-h-128 overflow-y-auto">
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => onNavigate('tracking', { orderId: o.id })}
                    aria-current={o.id === order.id ? 'true' : undefined}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                      o.id === order.id ? 'bg-brand-50' : 'hover:bg-surface-light'
                    }`}
                  >
                    <img src={o.items[0]?.product.image} alt="" className="w-11 h-11 rounded-xl object-cover bg-cream shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">#{o.id}</span>
                      <span className="block text-xs text-slate-500">{o.date}</span>
                    </span>
                    <StatusPill status={o.status} />
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-4 lg:space-y-6 min-w-0">
            <section className={`${cardClass} p-4 lg:p-6`}>
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base lg:text-xl font-semibold text-slate-900">{t('tracking.order', { id: order.id })}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('tracking.placedOn', { date: order.date })}</p>
                </div>
                <StatusPill status={order.status} />
              </div>

              {!cancelled && <DeliveryRoute steps={order.steps} delivered={delivered} />}

              <ol className="relative stagger">
                {order.steps.map((step, i) => {
                  const current = step.current && !delivered;
                  const done = step.completed && !current;
                  const nextDone = order.steps[i + 1]?.completed;
                  const status = ORDER_FLOW[i]?.status;
                  return (
                    <li key={step.step} className="flex gap-3.5">
                      <div className="flex flex-col items-center">
                        <span
                          className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                            done
                              ? 'bg-brand-900 text-white'
                              : current
                              ? 'bg-brand-900 text-white ring-4 ring-brand-100'
                              : 'bg-slate-200 text-white'
                          }`}
                        >
                          {current ? (
                            <>
                              <span className="ping-soft absolute inset-0 rounded-full bg-brand-900" aria-hidden="true"></span>
                              <span className="relative w-2 h-2 rounded-full bg-white"></span>
                            </>
                          ) : (
                            <i className="fa-solid fa-check"></i>
                          )}
                        </span>
                        {i < order.steps.length - 1 && (
                          <span
                            className={`w-0.5 flex-1 min-h-7 my-1 rounded-full ${nextDone ? 'bg-brand-900 grow-y' : 'bg-slate-200'}`}
                            style={{ '--delay': `${200 + i * 140}ms` } as React.CSSProperties}
                          ></span>
                        )}
                      </div>
                      <div className="pb-5 -mt-0.5">
                        <p className={`text-sm font-semibold ${step.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                          {status ? stepLabel(status) : step.step}
                        </p>
                        <p className={`text-xs ${current ? 'text-brand-700 font-medium' : 'text-slate-400'}`}>
                          {current
                            ? t('tracking.inProgress')
                            : step.completed
                            ? [step.date, step.time].filter(Boolean).join(' - ')
                            : t('tracking.pending')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {paymentPending ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm text-amber-900 flex-1">
                    <i className="fa-solid fa-hourglass-half mr-2"></i>
                    <strong>{t('tracking.paymentPending')}</strong> {t('tracking.paymentPendingText')}
                  </p>
                  <button
                    onClick={() => run(() => onPayOrder(order.id))}
                    disabled={busy}
                    className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold whitespace-nowrap disabled:opacity-60 cursor-pointer"
                  >
                    {t('tracking.finishPayment')}
                  </button>
                </div>
              ) : (
                <p className={`flex gap-3 rounded-2xl p-4 text-sm ${cancelled ? 'bg-slate-100 text-slate-700' : 'bg-brand-50 text-brand-900'}`}>
                  <i className={`fa-solid ${cancelled ? 'fa-ban' : delivered ? 'fa-circle-check' : 'fa-circle-info'} mt-0.5`}></i>
                  <span>{t(`tracking.msg.${order.status}` as TranslationKey)}</span>
                </p>
              )}

              {order.deliveryDriver && !delivered && (
                <div className="mt-4 rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
                  <span className="w-12 h-12 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center text-xl shrink-0">
                    <i className="fa-solid fa-motorcycle"></i>
                  </span>
                  <div className="flex-1 min-w-40">
                    <p className="text-xs text-slate-500">{t('tracking.driver')}</p>
                    <p className="font-semibold text-slate-900">{order.deliveryDriver.name}</p>
                    <p className="text-xs text-slate-500">
                      {order.deliveryDriver.vehicle} • <i className="fa-regular fa-clock"></i> {order.deliveryDriver.eta}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${order.deliveryDriver.phone.replace(/\s/g, '')}`}
                      className="w-11 h-11 rounded-full bg-brand-900 hover:bg-brand-dark text-white flex items-center justify-center"
                      aria-label={t('tracking.call', { name: order.deliveryDriver.name })}
                    >
                      <i className="fa-solid fa-phone"></i>
                    </a>
                    <a
                      href={`https://wa.me/${order.deliveryDriver.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center"
                      aria-label={t('tracking.message', { name: order.deliveryDriver.name })}
                    >
                      <i className="fa-brands fa-whatsapp text-lg"></i>
                    </a>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowDetails((v) => !v)}
                aria-expanded={showDetails}
                className="lg:hidden w-full h-12 mt-4 rounded-xl border border-brand-900 text-brand-900 text-sm font-semibold hover:bg-brand-50 cursor-pointer"
              >
                {showDetails ? t('tracking.hideDetails') : t('tracking.showDetails')}
              </button>

              {canAdvance && (
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    <i className="fa-solid fa-flask mr-1.5"></i>
                    {t('tracking.demoNote')}
                  </p>
                  <button
                    onClick={() => run(() => onAdvanceOrder(order.id))}
                    disabled={busy}
                    className="h-9 px-4 rounded-xl border border-slate-200 hover:border-brand-900 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {t('tracking.simulate')} <i className="fa-solid fa-forward ml-1"></i>
                  </button>
                </div>
              )}
            </section>

            <div className={`${showDetails ? 'grid animate-rise-in' : 'hidden'} lg:grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6`}>
              <section className={`md:col-span-3 ${cardClass} p-4 lg:p-5`}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">{t('tracking.items', { n: order.items.length })}</h3>
                <ul className="space-y-4">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <button
                        onClick={() => onOpenProduct(item.product)}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-cream shrink-0 cursor-pointer"
                        aria-label={item.product.title}
                      >
                        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => onOpenProduct(item.product)}
                          className="text-sm font-semibold text-slate-800 hover:text-brand-900 text-left line-clamp-1 cursor-pointer"
                        >
                          {item.product.title}
                        </button>
                        <p className="text-xs text-slate-500">
                          {item.product.vendor.name}
                          {[item.selectedColor, item.selectedSize].filter(Boolean).map((v) => ` • ${v}`)}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{t('tracking.qty', { n: item.quantity })}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`md:col-span-2 ${cardClass} p-4 lg:p-5 space-y-4 text-sm`}>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('common.delivery')}</h3>
                  <p className="text-slate-700">
                    <i className="fa-solid fa-location-dot text-brand-900 mr-1.5"></i>
                    {order.shippingAddress}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('common.payment')}</h3>
                  <p className="text-slate-700">
                    {paymentLabel(order.paymentMethod)}
                    {order.phoneNumber && <span className="text-slate-400"> • {order.phoneNumber}</span>}
                  </p>
                  {order.paymentStatus && (
                    <p className={`text-xs font-semibold mt-0.5 ${order.paymentStatus === 'payé' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {paymentStatusLabel(order.paymentStatus)}
                    </p>
                  )}
                </div>
                <dl className="space-y-1.5 pt-3 border-t border-slate-100">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t('common.subtotal')}</dt>
                    <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t('common.delivery')}</dt>
                    <dd className="tabular-nums">{order.deliveryFee === 0 ? t('common.free') : formatPrice(order.deliveryFee)}</dd>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <dt>{t('tracking.discount')}</dt>
                      <dd className="tabular-nums">-{formatPrice(order.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base pt-1.5">
                    <dt>{t('common.total')}</dt>
                    <dd className="font-display font-bold text-brand-900 tabular-nums">{formatPrice(order.total)}</dd>
                  </div>
                </dl>
                <a href={SUPPORT_EMAIL} className={`${btnOutline} w-full h-11 text-sm`}>
                  <i className="fa-solid fa-headset"></i>
                  {t('tracking.contactSupport')}
                </a>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Trajet de la commande : de la boutique à la maison, le camion avance jusqu'à l'étape en cours
 * (au chargement, puis à chaque nouvelle étape). Purement visuel : la liste des étapes reste la référence.
 */
const DeliveryRoute: React.FC<{ steps: Order['steps']; delivered: boolean }> = ({ steps, delivered }) => {
  const reached = steps.reduce((last, step, i) => (step.completed ? i : last), 0);
  const progress = delivered ? 1 : reached / Math.max(1, steps.length - 1);
  // Départ à 0 puis animation jusqu'à la position réelle.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(progress));
    return () => cancelAnimationFrame(frame);
  }, [progress]);

  const endpoint = 'absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs';
  return (
    <div className="relative h-12 mb-5" aria-hidden="true">
      <span className={`${endpoint} left-0 bg-brand-50 text-brand-900`}>
        <i className="fa-solid fa-store"></i>
      </span>
      <span
        className={`${endpoint} right-0 transition-colors duration-500 ${
          delivered ? 'bg-brand-900 text-white animate-pop' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <i className="fa-solid fa-house"></i>
      </span>
      <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-brand-700 to-gold-500 origin-left transition-transform duration-1200 ease-out-soft"
          style={{ transform: `scaleX(${shown})` }}
        ></div>
      </div>
      {/* La piste fait toute la largeur : la décaler de X % la fait avancer de X % du trajet. */}
      <div className="absolute left-10 right-10 inset-y-0 pointer-events-none">
        <div className="h-full transition-transform duration-1200 ease-out-soft" style={{ transform: `translateX(${shown * 100}%)` }}>
          <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span
              className={`flex w-9 h-9 rounded-full bg-white shadow-lift ring-2 ring-brand-900/10 text-brand-900 items-center justify-center ${
                delivered ? '' : 'truck-bob'
              }`}
            >
              <i className="fa-solid fa-truck-fast text-sm"></i>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
