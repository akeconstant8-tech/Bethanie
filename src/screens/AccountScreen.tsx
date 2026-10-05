import React, { useState } from 'react';
import { AccountTab, NavigateParams, Order, Product, ScreenType, User } from '../types';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { MotionSetting } from '../components/MotionSetting';
import { AdminCommissions } from '../components/AdminCommissions';
import { ProductCard } from '../components/ProductCard';
import { PaymentLogo } from '../components/PaymentLogo';
import { CountUp, EmptyState, MobileHeader, StatusPill, btnPrimary, cardClass, inputClass } from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import { errorMessage } from '../api/client';
import { PAYMENT_OPTIONS, PROMO_CODES, formatPrice } from '../utils/commerce';

interface AccountScreenProps {
  user: User & { role?: 'customer' | 'admin' };
  orders: Order[];
  products: Product[];
  wishlist: string[];
  activeTab: AccountTab;
  hasShop: boolean;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  /** Lève une erreur (affichée dans le formulaire) si le serveur refuse. */
  onSaveProfile: (data: { name: string; email: string; phone: string; location: string }) => Promise<void>;
  /** Les actions suivantes renvoient true si le serveur les a acceptées. */
  onAddAddress: (data: { title: string; address: string }) => Promise<boolean>;
  onRemoveAddress: (id: string) => Promise<boolean>;
  onSetDefaultAddress: (id: string) => Promise<boolean>;
  onAddPayment: (data: { type: string; number: string }) => Promise<boolean>;
  onRemovePayment: (id: string) => Promise<boolean>;
  onSetDefaultPayment: (id: string) => Promise<boolean>;
  onLogout: () => void;
  /** Présent quand l'application peut être installée (bouton du navigateur ou instructions iPhone). */
  onInstall?: () => void;
}

const TABS: { id: AccountTab; icon: string }[] = [
  { id: 'overview', icon: 'fa-gauge' },
  { id: 'orders', icon: 'fa-receipt' },
  { id: 'wishlist', icon: 'fa-heart' },
  { id: 'addresses', icon: 'fa-location-dot' },
  { id: 'payments', icon: 'fa-wallet' },
  { id: 'profile', icon: 'fa-gear' },
];

const SUPPORT_EMAIL = 'mailto:contact@bethanie.ci';

const Avatar: React.FC<{ user: User; className: string }> = ({ user, className }) =>
  user.avatar ? (
    <img src={user.avatar} alt="" className={`${className} rounded-full object-cover`} />
  ) : (
    <span className={`${className} rounded-full bg-gold-100 text-gold-700 flex items-center justify-center font-display font-bold`}>
      {user.name.charAt(0).toUpperCase()}
    </span>
  );

const MenuRow: React.FC<{ icon: string; label: string; onClick?: () => void; href?: string; badge?: number; tone?: 'gold' }> = ({
  icon,
  label,
  onClick,
  href,
  badge,
  tone,
}) => {
  const content = (
    <>
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
          tone === 'gold' ? 'bg-gold-100 text-gold-700' : 'bg-brand-50 text-brand-900'
        }`}
      >
        <i className={`fa-solid ${icon} text-sm`}></i>
      </span>
      <span className={`flex-1 text-sm font-medium ${tone === 'gold' ? 'text-gold-700' : 'text-slate-800'}`}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{badge}</span>
      )}
      <i className="fa-solid fa-chevron-right text-xs text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400"></i>
    </>
  );
  const className = 'group w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-surface-light transition-colors cursor-pointer';
  return href ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export const OrderRow: React.FC<{ order: Order; onOpen: () => void }> = ({ order, onOpen }) => {
  const { tn } = useI18n();
  return (
    <li>
      <button onClick={onOpen} className="w-full flex items-center gap-3 p-3.5 lg:p-4 text-left hover:bg-surface-light cursor-pointer">
        <span className="flex -space-x-3 shrink-0">
          {order.items.slice(0, 2).map((item, i) => (
            <img key={i} src={item.product.image} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white bg-cream" />
          ))}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-900">#{order.id}</span>
          <span className="block text-xs text-slate-500 truncate">
            {order.date} • {tn('common.items', order.items.length)}
          </span>
        </span>
        <span className="text-right shrink-0">
          <span className="block text-sm font-bold text-slate-900 tabular-nums">{formatPrice(order.total)}</span>
          <StatusPill status={order.status} className="mt-1" />
        </span>
      </button>
    </li>
  );
};

export const AccountScreen: React.FC<AccountScreenProps> = ({
  user,
  orders,
  products,
  wishlist,
  activeTab,
  hasShop,
  onNavigate,
  onOpenProduct,
  onAddToCart,
  onToggleWishlist,
  onSaveProfile,
  onAddAddress,
  onRemoveAddress,
  onSetDefaultAddress,
  onAddPayment,
  onRemovePayment,
  onSetDefaultPayment,
  onLogout,
  onInstall,
}) => {
  const { t, paymentLabel, promoLabel } = useI18n();
  const [addressDraft, setAddressDraft] = useState({ title: '', address: '' });
  const [paymentDraft, setPaymentDraft] = useState({ type: 'Orange Money', number: '' });
  const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: user.phone, location: user.location });
  const [profileStatus, setProfileStatus] = useState<{ saving: boolean; saved: boolean; error: string }>({
    saving: false,
    saved: false,
    error: '',
  });

  const setTab = (tab: AccountTab) => onNavigate('account', { tab });
  const tabLabel = (tab: AccountTab) => t(`account.tab.${tab}` as TranslationKey);
  const ongoing = orders.filter((o) => o.status !== 'livrée' && o.status !== 'annulée');
  const favorites = products.filter((p) => wishlist.includes(p.id));
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const shopLabel = hasShop ? t('common.sellerSpace') : t('common.openShop');

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressDraft.address.trim()) return;
    const ok = await onAddAddress({ title: addressDraft.title.trim() || 'Adresse', address: addressDraft.address.trim() });
    if (ok) setAddressDraft({ title: '', address: '' });
  };

  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDraft.number.trim()) return;
    const ok = await onAddPayment({ type: paymentDraft.type, number: paymentDraft.number.trim() });
    if (ok) setPaymentDraft({ type: 'Orange Money', number: '' });
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus({ saving: true, saved: false, error: '' });
    try {
      await onSaveProfile(profile);
      setProfileStatus({ saving: false, saved: true, error: '' });
      setTimeout(() => setProfileStatus((st) => ({ ...st, saved: false })), 2500);
    } catch (error) {
      setProfileStatus({ saving: false, saved: false, error: errorMessage(error) });
    }
  };

  const ordersList = (list: Order[]) => (
    <ul className="stagger divide-y divide-slate-100">
      {list.map((o) => (
        <OrderRow key={o.id} order={o} onOpen={() => onNavigate('tracking', { orderId: o.id })} />
      ))}
    </ul>
  );

  const logoutButton = (
    <button onClick={onLogout} className="w-full h-12 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer">
      <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i>
      {t('common.signOut')}
    </button>
  );

  /* ---------------- Contenu de chaque onglet ---------------- */

  const tabContent = () => {
    switch (activeTab) {
      case 'orders':
        return orders.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-receipt"
            title={t('account.noOrders')}
            action={
              <button onClick={() => onNavigate('categories')} className={`${btnPrimary} h-11 px-5 text-sm`}>
                {t('common.discoverProducts')}
              </button>
            }
          />
        ) : (
          <section className={`${cardClass} overflow-hidden`}>{ordersList(orders)}</section>
        );

      case 'wishlist':
        return favorites.length === 0 ? (
          <EmptyState icon="fa-regular fa-heart" title={t('account.noFavorites')} text={t('account.noFavoritesText')} />
        ) : (
          <div className="stagger grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
            {favorites.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isFavorite
                onOpen={onOpenProduct}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        );

      case 'addresses':
        return (
          <div className="space-y-3">
            <ul className="stagger grid grid-cols-1 md:grid-cols-2 gap-3">
              {user.addresses.map((a) => (
                <li key={a.id} className={`${cardClass} p-4 ${a.default ? 'ring-2 ring-brand-900' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-location-dot text-sm"></i>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {a.title}
                        {a.default && (
                          <span className="ml-2 text-[10px] font-semibold text-brand-700 uppercase">{t('common.default')}</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">{a.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 pl-12 text-xs font-semibold">
                    {!a.default && (
                      <button onClick={() => onSetDefaultAddress(a.id)} className="text-brand-900 hover:underline cursor-pointer">
                        {t('common.setDefault')}
                      </button>
                    )}
                    <button onClick={() => onRemoveAddress(a.id)} className="text-red-600 hover:underline cursor-pointer">
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={addAddress} className={`${cardClass} p-4 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3`}>
              <input
                value={addressDraft.title}
                onChange={(e) => setAddressDraft({ ...addressDraft, title: e.target.value })}
                placeholder={t('account.addressName')}
                className={inputClass}
              />
              <input
                value={addressDraft.address}
                onChange={(e) => setAddressDraft({ ...addressDraft, address: e.target.value })}
                placeholder={t('account.addressFull')}
                autoComplete="street-address"
                className={inputClass}
              />
              <button type="submit" className={`${btnPrimary} h-12 px-5 text-sm`}>
                <i className="fa-solid fa-plus"></i>
                {t('common.add')}
              </button>
            </form>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-3">
            <ul className="stagger grid grid-cols-1 md:grid-cols-2 gap-3">
              {user.paymentMethods.map((p) => (
                <li key={p.id} className={`${cardClass} p-4 ${p.default ? 'ring-2 ring-brand-900' : ''}`}>
                  <div className="flex items-center gap-3">
                    <PaymentLogo method={p.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {paymentLabel(p.type)}
                        {p.default && (
                          <span className="ml-2 text-[10px] font-semibold text-brand-700 uppercase">{t('common.default')}</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500 tabular-nums">{p.number}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 pl-13 text-xs font-semibold">
                    {!p.default && (
                      <button onClick={() => onSetDefaultPayment(p.id)} className="text-brand-900 hover:underline cursor-pointer">
                        {t('common.setDefault')}
                      </button>
                    )}
                    <button onClick={() => onRemovePayment(p.id)} className="text-red-600 hover:underline cursor-pointer">
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={addPayment} className={`${cardClass} p-4 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3`}>
              <select
                value={paymentDraft.type}
                onChange={(e) => setPaymentDraft({ ...paymentDraft, type: e.target.value })}
                className={inputClass}
                aria-label={t('account.paymentType')}
              >
                {PAYMENT_OPTIONS.filter((o) => o.id !== 'Paiement à la livraison').map((o) => (
                  <option key={o.id} value={o.id}>
                    {paymentLabel(o.id)}
                  </option>
                ))}
              </select>
              <input
                value={paymentDraft.number}
                onChange={(e) => setPaymentDraft({ ...paymentDraft, number: e.target.value })}
                placeholder={paymentDraft.type === 'Carte bancaire' ? t('common.cardNumber') : t('account.phoneNumber')}
                className={inputClass}
              />
              <button type="submit" className={`${btnPrimary} h-12 px-5 text-sm`}>
                <i className="fa-solid fa-plus"></i>
                {t('common.add')}
              </button>
            </form>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-4">
            <form onSubmit={saveProfile} className={`${cardClass} p-4 lg:p-6 space-y-4`}>
              <h2 className="text-base font-semibold text-slate-900">{t('account.personalInfo')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    ['name', 'account.field.name', 'text', 'name'],
                    ['email', 'account.field.email', 'email', 'email'],
                    ['phone', 'account.field.phone', 'tel', 'tel'],
                    ['location', 'account.field.location', 'text', 'address-level2'],
                  ] as const
                ).map(([key, label, type, autoComplete]) => (
                  <label key={key} className="text-sm font-medium text-slate-700">
                    {t(label)}
                    <input
                      type={type}
                      value={profile[key]}
                      onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                      autoComplete={autoComplete}
                      className={`${inputClass} mt-1.5`}
                      required
                    />
                  </label>
                ))}
              </div>
              {profileStatus.error && (
                <p
                  key={profileStatus.error}
                  className="animate-shake text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
                  role="alert"
                >
                  {profileStatus.error}
                </p>
              )}
              <div className="flex items-center gap-4">
                <button type="submit" disabled={profileStatus.saving} className={`${btnPrimary} h-11 px-6 text-sm`}>
                  {profileStatus.saving ? <i className="fa-solid fa-spinner animate-spin"></i> : t('common.save')}
                </button>
                {profileStatus.saved && (
                  <span className="animate-fade-in text-sm text-emerald-700 font-semibold" role="status">
                    <i className="fa-solid fa-circle-check mr-1 inline-block animate-pop"></i>
                    {t('account.profileSaved')}
                  </span>
                )}
              </div>
            </form>
            <div className={`${cardClass} p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t('account.session')}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{t('account.signedInAs', { email: user.email })}</p>
              </div>
              <div className="sm:w-48">{logoutButton}</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ---------------- Mise en page ---------------- */

  return (
    <div className="pb-6 lg:pb-12">
      {activeTab === 'overview' ? (
        <MobileHeader title={t('account.title')} />
      ) : (
        <MobileHeader title={tabLabel(activeTab)} onBack={() => setTab('overview')} />
      )}

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
        {/* Ordinateur : bandeau de bienvenue */}
        <section className="hidden lg:flex relative overflow-hidden rounded-3xl bg-brand-900 text-white p-8 items-center gap-6 mb-8">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-pattern-kente opacity-[0.07]" aria-hidden="true"></div>
          <Avatar user={user} className="relative w-20 h-20 ring-4 ring-white/20 text-3xl" />
          <div className="relative flex-1">
            <p className="text-sm text-gold-400 font-semibold">{t('account.hello')}</p>
            <h1 className="text-3xl font-semibold">{user.name}</h1>
            <p className="text-sm text-white/70 mt-1">
              <i className="fa-solid fa-location-dot mr-1.5"></i>
              {user.location} • {user.email}
            </p>
          </div>
          <div className="relative text-right">
            <p className="text-sm text-white/70">{t('account.totalSpent')}</p>
            <p className="text-2xl font-display font-bold tabular-nums">
              <CountUp value={totalSpent} format={formatPrice} />
            </p>
          </div>
        </section>

        {/* Mobile : profil et menu (maquette) */}
        {activeTab === 'overview' && (
          <div className="lg:hidden pt-2 space-y-5">
            <div className="text-center animate-rise-in">
              <Avatar user={user} className="w-24 h-24 mx-auto ring-4 ring-white shadow-md text-3xl animate-scale-in" />
              <h1 className="text-lg font-semibold text-slate-900 mt-3 uppercase">{t('account.greeting', { name: user.name })}</h1>
              <button onClick={() => setTab('profile')} className="text-sm text-slate-500 hover:text-brand-900 cursor-pointer">
                {user.email} <i className="fa-solid fa-chevron-right text-[10px] ml-0.5"></i>
              </button>
            </div>

            <div className="stagger grid grid-cols-3 gap-2 text-center">
              {(
                [
                  [orders.length, 'account.stat.orders', 'orders'],
                  [ongoing.length, 'account.stat.inProgress', 'orders'],
                  [wishlist.length, 'account.stat.favorites', 'wishlist'],
                ] as const
              ).map(([value, label, tab]) => (
                <button key={label} onClick={() => setTab(tab)} className={`${cardClass} py-3 cursor-pointer hover:border-brand-900`}>
                  <span className="block font-display text-lg font-bold text-brand-900 tabular-nums">
                    <CountUp value={value} />
                  </span>
                  <span className="block text-[11px] text-slate-500">{t(label)}</span>
                </button>
              ))}
            </div>

            {user.role === 'admin' && <AdminCommissions />}

            <nav className={`stagger ${cardClass} overflow-hidden divide-y divide-slate-100`} aria-label={t('account.menu')}>
              <MenuRow icon="fa-receipt" label={tabLabel('orders')} badge={ongoing.length} onClick={() => setTab('orders')} />
              <MenuRow icon="fa-heart" label={tabLabel('wishlist')} badge={wishlist.length} onClick={() => setTab('wishlist')} />
              <MenuRow icon="fa-location-dot" label={tabLabel('addresses')} onClick={() => setTab('addresses')} />
              <MenuRow icon="fa-wallet" label={tabLabel('payments')} onClick={() => setTab('payments')} />
              <MenuRow icon="fa-gear" label={tabLabel('profile')} onClick={() => setTab('profile')} />
              <div className="flex items-center gap-3.5 px-4 py-3">
                <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-language text-sm"></i>
                </span>
                <span className="flex-1 text-sm font-medium text-slate-800">{t('lang.label')}</span>
                <LanguageSwitcher />
              </div>
              <MotionSetting />
              <MenuRow icon="fa-headset" label={t('account.support')} href={SUPPORT_EMAIL} />
              {onInstall && <MenuRow icon="fa-mobile-screen-button" tone="gold" label={t('pwa.install')} onClick={onInstall} />}
            </nav>

            <nav className={`${cardClass} overflow-hidden animate-rise-in`} aria-label={t('account.sellNav')}>
              <MenuRow icon="fa-store" tone="gold" label={shopLabel} onClick={() => onNavigate('seller')} />
            </nav>

            {logoutButton}
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8 items-start">
          {/* Ordinateur : menu latéral */}
          <nav className={`hidden lg:block ${cardClass} p-2 sticky top-36`} aria-label={t('account.menu')}>
            {TABS.map(({ id, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === id ? 'bg-brand-900 text-white' : 'text-slate-600 hover:bg-surface-light'
                }`}
              >
                <i className={`fa-solid ${icon} w-4 text-center`}></i>
                {tabLabel(id)}
                {id === 'wishlist' && wishlist.length > 0 && (
                  <span
                    className={`ml-auto text-[10px] font-semibold px-1.5 rounded-full ${
                      activeTab === id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {wishlist.length}
                  </span>
                )}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button
                onClick={() => onNavigate('seller')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gold-700 hover:bg-gold-50 cursor-pointer"
              >
                <i className="fa-solid fa-store w-4 text-center"></i>
                {shopLabel}
              </button>
              <a
                href={SUPPORT_EMAIL}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-surface-light"
              >
                <i className="fa-solid fa-headset w-4 text-center"></i>
                {t('account.support')}
              </a>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i>
                {t('common.signOut')}
              </button>
            </div>
          </nav>

          <div className={`min-w-0 space-y-6 ${activeTab === 'overview' ? 'hidden lg:block' : ''}`}>
            {activeTab === 'overview' ? (
              <>
                <div className="stagger grid grid-cols-4 gap-4">
                  {(
                    [
                      ['account.dash.ordersPlaced', orders.length, 'fa-receipt', 'bg-brand-50 text-brand-900', () => setTab('orders')],
                      ['account.dash.ordersInProgress', ongoing.length, 'fa-truck-fast', 'bg-orange-50 text-orange-600', () => setTab('orders')],
                      ['account.dash.favorites', wishlist.length, 'fa-heart', 'bg-rose-50 text-rose-600', () => setTab('wishlist')],
                      ['account.dash.promoCodes', PROMO_CODES.length, 'fa-ticket', 'bg-gold-50 text-gold-700', () => onNavigate('cart')],
                    ] as const
                  ).map(([label, value, icon, iconClass, onClick]) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className={`group ${cardClass} p-4 text-left hover:border-brand-900/40 hover:shadow-lift hover:-translate-y-0.5 transition-[translate,box-shadow,border-color,transform] duration-300 cursor-pointer`}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${iconClass}`}
                      >
                        <i className={`fa-solid ${icon}`}></i>
                      </span>
                      <span className="block text-2xl font-display font-bold text-slate-900 tabular-nums">
                        <CountUp value={value} />
                      </span>
                      <span className="block text-xs text-slate-500">{t(label)}</span>
                    </button>
                  ))}
                </div>

                <section className={`${cardClass} overflow-hidden`}>
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">{t('common.recentOrders')}</h2>
                    <button onClick={() => setTab('orders')} className="text-sm font-semibold text-brand-900 cursor-pointer">
                      {t('common.seeAll')}
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <p className="p-6 text-sm text-slate-500">{t('account.noOrdersYet')}</p>
                  ) : (
                    ordersList(orders.slice(0, 3))
                  )}
                </section>

                <section className="bg-gold-50 border border-gold-100 rounded-2xl p-5">
                  <h2 className="text-base font-semibold text-slate-900 mb-3">
                    <i className="fa-solid fa-ticket text-gold-600 mr-2"></i>
                    {t('account.yourPromoCodes')}
                  </h2>
                  <ul className="stagger grid grid-cols-3 gap-3">
                    {PROMO_CODES.map((p) => (
                      <li key={p.code} className="bg-white rounded-xl border border-dashed border-gold-500 p-3">
                        <p className="font-mono font-bold text-gold-700">{p.code}</p>
                        <p className="text-xs text-slate-600">{promoLabel(p.code)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : (
              <>
                <h2 className="hidden lg:block text-xl font-semibold text-slate-900">
                  {tabLabel(activeTab)}
                  {activeTab === 'orders' && ` (${orders.length})`}
                  {activeTab === 'wishlist' && ` (${favorites.length})`}
                </h2>
                {tabContent()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
