import React, { useMemo, useState } from 'react';
import { AssistantProposal, NavigateParams, Order, OrderStatus, Product, ProductDraft, ScreenType, SellerShop, SellerTab, ShopDraft } from '../types';
import { INITIAL_CATEGORIES } from '../data/mockData';
import { errorMessage } from '../api/client';
import { BottomNav } from '../components/BottomNav';
import { SellerAssistant } from '../components/SellerAssistant';
import {
  BottomSheet,
  CountUp,
  EmptyState,
  MobileHeader,
  StatusPill,
  btnGold,
  btnOutline,
  btnPrimary,
  cardClass,
  inputClass,
} from '../components/ui';
import { TranslationKey, useI18n } from '../i18n';
import { CITIES, ORDER_FLOW, formatPrice, nextStatus } from '../utils/commerce';

const COMMISSION_RATE = 0.05;
const MAX_PHOTOS = 3;

interface SellerScreenProps {
  shop: SellerShop | null;
  userName: string;
  products: Product[];
  orders: Order[];
  defaultPhone: string;
  activeTab: SellerTab;
  /** Lèvent une erreur (affichée dans le formulaire) si le serveur refuse. */
  onCreateShop: (draft: ShopDraft) => Promise<void>;
  onAddProduct: (draft: ProductDraft) => Promise<void>;
  onUpdateProduct: (id: string, patch: { stock?: number }) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAdvanceOrder: (orderId: string) => Promise<void>;
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
}

/** Redimensionne la photo avant envoi au serveur (plus rapide sur les connexions mobiles). */
const readImage = (file: File, maxSize = 800): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const KpiCard: React.FC<{
  label: string;
  value: number;
  format?: (value: number) => string;
  note?: string;
  icon: string;
  iconClass: string;
}> = ({
  label,
  value,
  format,
  note,
  icon,
  iconClass,
}) => (
  <div className={`group ${cardClass} p-3.5 lg:p-5 hover:shadow-lift hover:-translate-y-0.5 transition-[translate,box-shadow] duration-300`}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs lg:text-sm text-slate-500">{label}</p>
      <span
        className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${iconClass}`}
      >
        <i className={`fa-solid ${icon} text-sm`}></i>
      </span>
    </div>
    <p className="text-lg lg:text-2xl font-display font-bold text-slate-900 tabular-nums -mt-1">
      <CountUp value={value} format={format} />
    </p>
    {note && <p className="text-[11px] lg:text-xs text-slate-500 mt-0.5">{note}</p>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Ouverture de boutique                                               */
/* ------------------------------------------------------------------ */

const ONBOARDING_STEPS: [TranslationKey, TranslationKey][] = [
  ['seller.onb.step1.title', 'seller.onb.step1.text'],
  ['seller.onb.step2.title', 'seller.onb.step2.text'],
  ['seller.onb.step3.title', 'seller.onb.step3.text'],
  ['seller.onb.step4.title', 'seller.onb.step4.text'],
];

const SellerOnboarding: React.FC<{ defaultPhone: string; onCreateShop: (draft: ShopDraft) => Promise<void> }> = ({
  defaultPhone,
  onCreateShop,
}) => {
  const { t, rich, categoryName } = useI18n();
  const [form, setForm] = useState({ name: '', location: 'Abidjan', category: 'mode', phone: defaultPhone, description: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !accepted) return;
    setBusy(true);
    setError('');
    try {
      await onCreateShop({ ...form, name: form.name.trim(), description: form.description.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
      <section className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-brand-900 text-white p-5 lg:p-10">
        <div className="absolute inset-0 bg-pattern-kente opacity-[0.06]" aria-hidden="true"></div>
        <div className="relative space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-gold-400 bg-white/10 px-3 py-1.5 rounded-full">
            <i className="fa-solid fa-store"></i>
            {t('common.sellerSpace')}
          </span>
          <h1 className="text-2xl lg:text-4xl font-semibold text-balance">
            {rich('seller.onb.title', { free: <span className="text-gold-400">{t('seller.onb.free')}</span> })}
          </h1>
          <p className="text-white/75 text-sm lg:text-base">{t('seller.onb.text')}</p>
          <ol className="space-y-3 pt-2 stagger">
            {ONBOARDING_STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-gold-500 text-brand-dark text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm">
                  <strong className="font-semibold">{t(title)}</strong>
                  <span className="block text-white/65">{t(text)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <form onSubmit={submit} className={`${cardClass} p-5 lg:p-8 space-y-4`}>
        <h2 className="text-xl font-semibold text-slate-900">{t('seller.onb.formTitle')}</h2>
        <label className="block text-sm font-medium text-slate-700">
          {t('seller.onb.shopName')}
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('seller.onb.shopNamePlaceholder')}
            className={`${inputClass} mt-1.5`}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            {t('common.city')}
            <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={`${inputClass} mt-1.5`}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('common.category')}
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${inputClass} mt-1.5`}>
              {INITIAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryName(c.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          {t('seller.onb.momo')}
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
            className={`${inputClass} mt-1.5`}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t('seller.onb.about')}
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder={t('seller.onb.aboutPlaceholder')}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
          {t('seller.onb.charter')}
        </label>
        {error && (
          <p key={error} className="animate-shake text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={!form.name.trim() || !accepted || busy} className={`${btnGold} w-full h-12`}>
          {busy ? <i className="fa-solid fa-spinner animate-spin"></i> : t('common.openShop')}
        </button>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Ajout de produit (maquette « Ajouter un produit »)                  */
/* ------------------------------------------------------------------ */

const emptyDraft = {
  title: '',
  category: 'mode',
  subcategory: '',
  brand: '',
  price: '',
  originalPrice: '',
  stock: '10',
  description: '',
  sizes: '',
  characteristics: '',
};

const NewProductForm: React.FC<{
  shop: SellerShop;
  onSubmit: (draft: ProductDraft) => Promise<void>;
  /** Brouillon préparé par l'assistant vendeur : le vendeur le relit, ajoute ses photos et publie. */
  initial?: Extract<AssistantProposal, { kind: 'product' }> | null;
}> = ({ shop, onSubmit, initial }) => {
  const { t, categoryName } = useI18n();
  const [draft, setDraft] = useState(() => ({
    ...emptyDraft,
    category: shop.category,
    ...(initial
      ? {
          title: initial.title,
          category: initial.category,
          description: initial.description,
          price: initial.price !== undefined ? String(initial.price) : '',
          stock: initial.stock !== undefined ? String(initial.stock) : emptyDraft.stock,
        }
      : {}),
  }));
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageError, setImageError] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof emptyDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft({ ...draft, [key]: e.target.value });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(t('seller.form.imageType'));
      return;
    }
    setLoadingImage(true);
    try {
      const dataUrl = await readImage(file);
      setPhotos((list) => [...list, dataUrl].slice(0, MAX_PHOTOS));
      setImageError('');
    } catch {
      setImageError(t('seller.form.imageRead'));
    } finally {
      setLoadingImage(false);
    }
  };

  const price = Number(draft.price);
  const originalPrice = Number(draft.originalPrice);
  const valid = draft.title.trim() && price > 0 && Number(draft.stock) >= 0 && draft.description.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const characteristics = Object.fromEntries(
      draft.characteristics
        .split('\n')
        .map((line) => line.split(':'))
        .filter((parts) => parts.length >= 2 && parts[0].trim())
        .map(([key, ...rest]) => [key.trim(), rest.join(':').trim()])
    );
    const sizes = draft.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    setError('');
    try {
      await onSubmit({
        title: draft.title.trim(),
        category: draft.category,
        subcategory: draft.subcategory.trim() || undefined,
        brand: draft.brand.trim() || undefined,
        price,
        originalPrice: originalPrice > price ? originalPrice : undefined,
        stock: Number(draft.stock),
        description: draft.description.trim(),
        sizes: sizes.length ? sizes : undefined,
        characteristics: Object.keys(characteristics).length ? characteristics : undefined,
        imageData: photos[0],
        extraImagesData: photos.length > 1 ? photos.slice(1) : undefined,
      });
      setDraft({ ...emptyDraft, category: shop.category });
      setPhotos([]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">{t('seller.form.photos')}</p>
        <div className="grid grid-cols-3 gap-3">
          {photos.map((src, i) => (
            <div key={src.slice(-24)} className="relative aspect-square rounded-2xl overflow-hidden bg-cream animate-scale-in">
              <img src={src} alt={t('product.photo', { n: i + 1 })} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold bg-brand-900 text-white px-2 py-0.5 rounded-full">
                  {t('seller.form.main')}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-slate-700 hover:text-red-600 cursor-pointer"
                aria-label={t('seller.form.removePhoto', { n: i + 1 })}
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          ))}
          {Array.from({ length: MAX_PHOTOS - photos.length }).map((_, i) => (
            <label
              key={`empty-${i}`}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand-900 bg-white flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-brand-900 cursor-pointer transition-colors"
            >
              {loadingImage && i === 0 ? (
                <i className="fa-solid fa-spinner animate-spin text-xl"></i>
              ) : (
                <>
                  <i className="fa-solid fa-camera text-xl"></i>
                  <span className="text-[11px] font-medium">
                    {photos.length === 0 && i === 0 ? t('common.add') : t('seller.form.addPhoto')}
                  </span>
                </>
              )}
              <input type="file" accept="image/*" onChange={onFile} className="sr-only" disabled={loadingImage} />
            </label>
          ))}
        </div>
        {imageError && <p className="text-xs text-red-600 font-semibold mt-2">{imageError}</p>}
        <p className="text-xs text-slate-400 mt-2">{t('seller.form.photosHint')}</p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        {t('seller.form.name')}
        <input value={draft.title} onChange={set('title')} placeholder={t('seller.form.namePlaceholder')} className={`${inputClass} mt-1.5`} required />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {t('seller.form.description')}
        <textarea
          value={draft.description}
          onChange={set('description')}
          rows={4}
          placeholder={t('seller.form.descriptionPlaceholder')}
          className={`${inputClass} mt-1.5`}
          required
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          {t('seller.form.price')}
          <input
            type="number"
            min="0"
            step="100"
            inputMode="numeric"
            value={draft.price}
            onChange={set('price')}
            placeholder={t('seller.form.pricePlaceholder')}
            className={`${inputClass} mt-1.5`}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          {t('common.stock')}
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={draft.stock}
            onChange={set('stock')}
            placeholder={t('seller.form.stockPlaceholder')}
            className={`${inputClass} mt-1.5`}
            required
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        {t('common.category')}
        <select value={draft.category} onChange={set('category')} className={`${inputClass} mt-1.5`}>
          {INITIAL_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryName(c.id)}
            </option>
          ))}
        </select>
      </label>

      <div className={`${cardClass} overflow-hidden`}>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-slate-800 cursor-pointer"
        >
          {t('seller.form.more')}
          <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform ${moreOpen ? 'rotate-180' : ''}`}></i>
        </button>
        {moreOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
            <label className="text-sm font-medium text-slate-700">
              {t('seller.form.originalPrice')}
              <input type="number" min="0" step="100" value={draft.originalPrice} onChange={set('originalPrice')} className={`${inputClass} mt-1.5`} />
              <span className="block text-xs text-slate-400 font-normal mt-1">{t('seller.form.originalPriceHint')}</span>
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('common.brand')}
              <input value={draft.brand} onChange={set('brand')} placeholder={shop.name} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('seller.form.subcategory')}
              <input
                value={draft.subcategory}
                onChange={set('subcategory')}
                placeholder={t('seller.form.subcategoryPlaceholder')}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('seller.form.sizes')}
              <input value={draft.sizes} onChange={set('sizes')} placeholder={t('seller.form.sizesPlaceholder')} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              {t('seller.form.characteristics')}
              <textarea
                value={draft.characteristics}
                onChange={set('characteristics')}
                rows={3}
                placeholder={t('seller.form.characteristicsPlaceholder')}
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <p key={error} className="animate-shake text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5" role="alert">
          {error}
        </p>
      )}
      {price > 0 && (
        <p className="text-sm text-slate-600 bg-brand-50 rounded-xl px-4 py-3">
          {t('seller.form.youReceive', { amount: formatPrice(price * (1 - COMMISSION_RATE)) })}
        </p>
      )}
      <button type="submit" disabled={!valid || busy} className={`${btnPrimary} w-full h-12`}>
        {busy ? <i className="fa-solid fa-spinner animate-spin"></i> : t('seller.form.publish')}
      </button>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/* Espace vendeur                                                      */
/* ------------------------------------------------------------------ */

const TAB_TITLES: Record<SellerTab, TranslationKey> = {
  dashboard: 'common.sellerSpace',
  products: 'seller.tab.products',
  orders: 'seller.tab.orders',
  stats: 'common.statistics',
  new: 'common.addProduct',
};

export const SellerScreen: React.FC<SellerScreenProps> = ({
  shop,
  userName,
  products,
  orders,
  defaultPhone,
  activeTab,
  onCreateShop,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdvanceOrder,
  onNavigate,
  onBack,
  onOpenProduct,
}) => {
  const { t, tn, categoryName, statusLabel, paymentLabel } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState<Extract<AssistantProposal, { kind: 'product' }> | null>(null);
  const setTab = (sellerTab: SellerTab) => onNavigate('seller', { sellerTab });

  const myProducts = useMemo(() => (shop ? products.filter((p) => p.vendor.id === shop.id) : []), [products, shop]);
  const myOrders = useMemo(
    () =>
      shop
        ? orders
            .map((o) => {
              const lines = o.items.filter((i) => i.product.vendor.id === shop.id);
              return { order: o, lines, amount: lines.reduce((s, l) => s + l.product.price * l.quantity, 0) };
            })
            .filter((x) => x.lines.length > 0)
        : [],
    [orders, shop]
  );

  if (!shop) {
    return (
      <div className="pb-6 lg:pb-12">
        <MobileHeader title={t('common.sellerSpace')} onBack={onBack} />
        <SellerOnboarding defaultPhone={defaultPhone} onCreateShop={onCreateShop} />
      </div>
    );
  }

  // Les commandes annulées (paiement non reçu) restent dans la liste mais ne comptent pas comme des ventes.
  const soldOrders = myOrders.filter(({ order }) => order.status !== 'annulée');
  const revenue = soldOrders.reduce((sum, x) => sum + x.amount, 0);
  const unitsSold = soldOrders.reduce((sum, x) => sum + x.lines.reduce((s, l) => s + l.quantity, 0), 0);
  const toProcess = myOrders.filter(({ order }) => order.status === 'confirmée' || order.status === 'préparation').length;
  const lowStock = myProducts.filter((p) => p.stock <= 5).length;
  const firstName = userName.split(' ')[0];
  const firstNameDisplay = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const kpis = (
    <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
      <KpiCard
        label={t('seller.kpi.sales')}
        value={unitsSold}
        note={t('seller.kpi.salesNote')}
        icon="fa-bag-shopping"
        iconClass="bg-orange-50 text-orange-600"
      />
      <KpiCard
        label={t('seller.kpi.revenue')}
        value={revenue}
        format={formatPrice}
        note={t('seller.kpi.revenueNote', { amount: formatPrice(revenue * (1 - COMMISSION_RATE)) })}
        icon="fa-coins"
        iconClass="bg-gold-50 text-gold-700"
      />
      <KpiCard
        label={t('common.orders')}
        value={soldOrders.length}
        note={t('seller.kpi.ordersNote', { n: toProcess })}
        icon="fa-box"
        iconClass="bg-emerald-50 text-emerald-700"
      />
      <KpiCard
        label={t('common.products')}
        value={myProducts.length}
        note={lowStock > 0 ? t('seller.kpi.lowStock', { n: lowStock }) : t('seller.kpi.online')}
        icon="fa-tags"
        iconClass="bg-amber-50 text-amber-700"
      />
    </div>
  );

  const ordersList = (list: typeof myOrders, withActions: boolean) => (
    <ul className="stagger divide-y divide-slate-100">
      {list.map(({ order, lines, amount }) => {
        const next = nextStatus(order.status);
        return (
          <li key={order.id} className="p-3.5 lg:p-4">
            <div className="flex items-center gap-3">
              <img src={lines[0].product.image} alt="" className="w-12 h-12 rounded-xl object-cover bg-cream shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">#{order.id}</p>
                <p className="text-xs text-slate-500 truncate">
                  {order.date} • {lines.map((l) => `${l.quantity} × ${l.product.title}`).join(', ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900 tabular-nums">{formatPrice(amount)}</p>
                <StatusPill status={order.status} className="mt-1" />
              </div>
            </div>
            {withActions && (
              <div className="mt-3 pl-15 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs text-slate-600 truncate">
                    <i className="fa-solid fa-user mr-1"></i>
                    {order.customerName ?? t('seller.unknownCustomer')} • {order.contactPhone}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    <i className="fa-solid fa-location-dot mr-1"></i>
                    {order.shippingAddress} • {paymentLabel(order.paymentMethod)}
                  </p>
                </div>
                {order.paymentStatus === 'en_attente' ? (
                  <span className="text-xs font-semibold text-amber-700">
                    <i className="fa-solid fa-hourglass-half mr-1"></i>
                    {t('paymentStatus.en_attente')}
                  </span>
                ) : next ? (
                  <button onClick={() => onAdvanceOrder(order.id)} className={`${btnPrimary} h-9 px-3.5 text-xs`}>
                    {t('seller.moveTo', { status: statusLabel(next) })}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700">
                    <i className="fa-solid fa-circle-check mr-1"></i>
                    {t('seller.done')}
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const noOrders = (
    <EmptyState
      icon="fa-solid fa-receipt"
      title={t('seller.noOrders')}
      text={myProducts.length === 0 ? t('seller.noOrdersFirst') : t('seller.noOrdersTip')}
      action={
        myProducts.length === 0 && (
          <button onClick={() => setTab('new')} className={`${btnPrimary} h-11 px-5 text-sm`}>
            {t('common.addProduct')}
          </button>
        )
      }
    />
  );

  /* ---------- Statistiques (calculées à partir des commandes reçues) ---------- */
  const bestSellers = Array.from(
    soldOrders
      .flatMap((x) => x.lines)
      .reduce((map, l) => {
        const entry = map.get(l.product.id) ?? { product: l.product, units: 0, amount: 0 };
        entry.units += l.quantity;
        entry.amount += l.product.price * l.quantity;
        return map.set(l.product.id, entry);
      }, new Map<string, { product: Product; units: number; amount: number }>())
      .values()
  )
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);
  const byStatus = ORDER_FLOW.map(({ status }) => ({
    status,
    count: myOrders.filter((x) => x.order.status === status).length,
  })) as { status: OrderStatus; count: number }[];
  const maxStatus = Math.max(1, ...byStatus.map((s) => s.count));
  const averageBasket = soldOrders.length ? revenue / soldOrders.length : 0;

  const content = () => {
    switch (activeTab) {
      case 'new':
        return (
          <NewProductForm
            key={assistantDraft?.id ?? 'vide'}
            shop={shop}
            initial={assistantDraft}
            onSubmit={async (draft) => {
              await onAddProduct(draft);
              setAssistantDraft(null);
              setTab('products');
            }}
          />
        );

      case 'orders':
        return myOrders.length === 0 ? noOrders : <section className={`${cardClass} overflow-hidden`}>{ordersList(myOrders, true)}</section>;

      case 'products':
        return myProducts.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-tags"
            title={t('seller.noProducts')}
            action={
              <button onClick={() => setTab('new')} className={`${btnPrimary} h-11 px-5 text-sm`}>
                {t('seller.publishFirst')}
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            <button onClick={() => setTab('new')} className={`${btnPrimary} w-full lg:w-auto h-12 px-6`}>
              <i className="fa-solid fa-plus"></i>
              {t('common.addProduct')}
            </button>
            <section className={`${cardClass} overflow-hidden`}>
              <ul className="stagger divide-y divide-slate-100">
                {myProducts.map((p) => (
                  <li key={p.id} className="p-3.5 lg:p-4 flex flex-wrap items-center gap-3">
                    <button onClick={() => onOpenProduct(p)} className="flex items-center gap-3 flex-1 min-w-48 text-left cursor-pointer">
                      <img src={p.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-cream shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 line-clamp-1">{p.title}</span>
                        <span className="block text-xs text-slate-500">
                          {categoryName(p.category)}
                          {p.subcategory && ` • ${p.subcategory}`}
                        </span>
                        <span className="block text-sm font-bold text-brand-900 tabular-nums">{formatPrice(p.price)}</span>
                      </span>
                    </button>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-slate-500">{t('common.stock')}</span>
                      <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                        <button
                          onClick={() => onUpdateProduct(p.id, { stock: Math.max(0, p.stock - 1) })}
                          disabled={p.stock <= 0}
                          className="w-8 h-8 text-slate-600 hover:bg-slate-50 rounded-l-xl disabled:text-slate-300 cursor-pointer"
                          aria-label={t('seller.stockMinus')}
                        >
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <span
                          className={`w-9 text-center text-sm font-semibold tabular-nums ${
                            p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-700' : 'text-slate-800'
                          }`}
                        >
                          {p.stock}
                        </span>
                        <button
                          onClick={() => onUpdateProduct(p.id, { stock: p.stock + 1 })}
                          className="w-8 h-8 text-slate-600 hover:bg-slate-50 rounded-r-xl cursor-pointer"
                          aria-label={t('seller.stockPlus')}
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(t('seller.confirmDelete', { title: p.title }))) onDeleteProduct(p.id);
                        }}
                        className="w-9 h-9 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        aria-label={t('seller.deleteProduct', { title: p.title })}
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-4 lg:space-y-6">
            {kpis}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <section className={`${cardClass} p-4 lg:p-5`}>
                <h2 className="text-base font-semibold text-slate-900 mb-4">{t('seller.stats.byStep')}</h2>
                <ul className="space-y-3">
                  {byStatus.map(({ status, count }, i) => (
                    <li key={status} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="text-slate-600">{statusLabel(status)}</span>
                      <span className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-linear-to-r from-brand-700 to-brand-900 animate-grow-x"
                          style={{ width: `${(count / maxStatus) * 100}%`, '--delay': `${i * 90}ms` } as React.CSSProperties}
                        ></span>
                      </span>
                      <span className="text-right font-semibold tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className={`${cardClass} p-4 lg:p-5`}>
                <h2 className="text-base font-semibold text-slate-900 mb-4">{t('seller.stats.bestSellers')}</h2>
                {bestSellers.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('seller.stats.noSales')}</p>
                ) : (
                  <ol className="space-y-3 stagger">
                    {bestSellers.map(({ product, units, amount }, i) => (
                      <li key={product.id} className="flex items-center gap-3">
                        <span className="w-6 text-sm font-bold text-gold-700 tabular-nums">{i + 1}</span>
                        <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-cream" />
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">{product.title}</span>
                        <span className="text-right text-xs text-slate-500 tabular-nums">
                          <strong className="block text-sm text-slate-900">{tn('seller.stats.sold', units)}</strong>
                          {formatPrice(amount)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
            <section className={`${cardClass} p-4 lg:p-5 grid grid-cols-3 gap-3 text-center`}>
              <div>
                <p className="text-xs text-slate-500">{t('seller.stats.avgBasket')}</p>
                <p className="font-display font-bold text-slate-900 tabular-nums">{formatPrice(averageBasket)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t('seller.stats.commission')}</p>
                <p className="font-display font-bold text-slate-900 tabular-nums">{formatPrice(revenue * COMMISSION_RATE)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t('seller.stats.net')}</p>
                <p className="font-display font-bold text-brand-900 tabular-nums">{formatPrice(revenue * (1 - COMMISSION_RATE))}</p>
              </div>
            </section>
          </div>
        );

      default:
        return (
          <div className="space-y-4 lg:space-y-6">
            <button
              onClick={() => setTab('stats')}
              className="relative w-full overflow-hidden rounded-2xl bg-brand-900 text-white p-4 lg:p-6 flex items-center gap-4 text-left cursor-pointer"
            >
              <span className="absolute inset-y-0 right-0 w-1/3 bg-pattern-kente opacity-[0.07]" aria-hidden="true"></span>
              <span className="relative flex-1">
                <span className="block font-display text-lg lg:text-2xl font-semibold">{t('seller.hello', { name: firstNameDisplay })}</span>
                <span className="block text-sm text-white/75 mt-0.5">{t('seller.performance', { shop: shop.name })}</span>
              </span>
              <i className="relative fa-solid fa-chevron-right text-white/70"></i>
            </button>
            {kpis}
            <section className={`${cardClass} overflow-hidden`}>
              <div className="px-4 lg:px-5 py-3.5 flex items-center justify-between border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">{t('common.recentOrders')}</h2>
                {myOrders.length > 0 && (
                  <button onClick={() => setTab('orders')} className="text-sm font-semibold text-brand-900 cursor-pointer">
                    {t('common.seeAll')}
                  </button>
                )}
              </div>
              {myOrders.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  {myProducts.length === 0 ? t('seller.publishToReceive') : t('seller.noOrdersYet')}
                </p>
              ) : (
                ordersList(myOrders.slice(0, 4), false)
              )}
            </section>
            <button onClick={() => setTab('new')} className={`${btnPrimary} w-full h-12`}>
              <i className="fa-solid fa-plus"></i>
              {t('common.addProduct')}
            </button>
          </div>
        );
    }
  };

  const desktopTabs: [SellerTab, string, string][] = [
    ['dashboard', t('common.dashboard'), 'fa-gauge'],
    ['products', t('seller.tabCount', { label: t('common.products'), n: myProducts.length }), 'fa-tags'],
    ['orders', t('seller.tabCount', { label: t('common.orders'), n: myOrders.length }), 'fa-receipt'],
    ['stats', t('common.statistics'), 'fa-chart-simple'],
  ];

  const menuItems: [string, string, () => void][] = [
    ['fa-plus', t('common.addProduct'), () => setTab('new')],
    ['fa-wand-magic-sparkles', t('assistant.title'), () => setAssistantOpen(true)],
    ['fa-eye', t('seller.menu.viewShop'), () => onNavigate('catalog', { vendor: shop.id, category: 'all' })],
    ['fa-bag-shopping', t('seller.menu.backToShopping'), () => onNavigate('home')],
    ['fa-user', t('seller.menu.myAccount'), () => onNavigate('account')],
  ];

  return (
    <div className="pb-6 lg:pb-12">
      <MobileHeader title={t(TAB_TITLES[activeTab])} onBack={activeTab === 'new' ? onBack : () => onNavigate('account')} />

      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
        {/* Ordinateur : en-tête de la boutique et onglets */}
        <div className="hidden lg:flex items-center gap-5 mb-6">
          <span className="w-16 h-16 rounded-2xl bg-brand-900 text-gold-400 flex items-center justify-center text-2xl font-display font-bold shrink-0">
            {shop.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 truncate">{shop.name}</h1>
              <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full whitespace-nowrap">
                <i className="fa-solid fa-hourglass-half mr-1"></i>
                {t('seller.verifying')}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              <i className="fa-solid fa-location-dot mr-1"></i>
              {shop.location} • {categoryName(shop.category)} • {t('seller.memberSince', { date: shop.createdAt })}
            </p>
          </div>
          <button onClick={() => onNavigate('catalog', { vendor: shop.id, category: 'all' })} className={`${btnOutline} h-11 px-4 text-sm`}>
            <i className="fa-regular fa-eye"></i>
            {t('seller.viewShop')}
          </button>
          <button onClick={() => setTab('new')} className={`${btnPrimary} h-11 px-4 text-sm`}>
            <i className="fa-solid fa-plus"></i>
            {t('seller.newProduct')}
          </button>
        </div>
        <nav className="hidden lg:flex gap-2 mb-6" aria-label={t('common.sellerSpace')}>
          {desktopTabs.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`h-10 px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === id ? 'bg-brand-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-900'
              }`}
            >
              <i className={`fa-solid ${icon} mr-2`}></i>
              {label}
            </button>
          ))}
        </nav>

        {/* Mobile : sélecteur Tableau de bord / Produits (maquette) */}
        {(activeTab === 'dashboard' || activeTab === 'products') && (
          <div className="lg:hidden relative grid grid-cols-2 bg-white border border-slate-200 rounded-xl p-1 mb-4" role="tablist">
            <span
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-brand-900 shadow-sm transition-[translate] duration-500 ease-spring"
              style={{ translate: activeTab === 'products' ? '100% 0' : '0 0' }}
            ></span>
            {(
              [
                ['dashboard', t('common.dashboard')],
                ['products', t('common.products')],
              ] as [SellerTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setTab(id)}
                className={`relative h-10 rounded-lg text-sm font-semibold transition-colors duration-300 cursor-pointer ${
                  activeTab === id ? 'text-white' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {content()}
      </div>

      {activeTab !== 'new' && (
        <BottomNav
          label={t('nav.main')}
          active={menuOpen ? 'menu' : activeTab}
          items={[
            { key: 'dashboard', label: t('nav.home'), icon: 'fa-house', onClick: () => setTab('dashboard') },
            { key: 'products', label: t('common.products'), icon: 'fa-tags', onClick: () => setTab('products') },
            { key: 'orders', label: t('common.orders'), icon: 'fa-receipt', badge: toProcess, onClick: () => setTab('orders') },
            { key: 'stats', label: t('common.statistics'), icon: 'fa-chart-simple', onClick: () => setTab('stats') },
            { key: 'menu', label: t('nav.menu'), icon: 'fa-bars', onClick: () => setMenuOpen(true) },
          ]}
        />
      )}

      {/* Assistant vendeur (IA) : bouton flottant et panneau de conversation */}
      <button
        onClick={() => setAssistantOpen(true)}
        aria-label={t('assistant.open')}
        className={`animate-scale-in ripple fixed right-4 lg:right-8 ${
          activeTab === 'new' ? 'bottom-6' : 'bottom-24'
        } lg:bottom-8 z-40 h-12 pl-4 pr-5 rounded-full bg-linear-to-br from-brand-700 to-brand-900 text-white font-semibold text-sm shadow-lift hover:shadow-glow flex items-center gap-2 cursor-pointer mb-[env(safe-area-inset-bottom)]`}
      >
        <i className="fa-solid fa-wand-magic-sparkles text-gold-400"></i>
        {t('assistant.fab')}
      </button>
      <SellerAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        firstName={firstNameDisplay}
        onUpdateStock={(productId, stock) => onUpdateProduct(productId, { stock })}
        onAdvanceOrder={onAdvanceOrder}
        onUseDraft={(draft) => {
          setAssistantDraft(draft);
          setTab('new');
        }}
      />

      <BottomSheet open={menuOpen} title={shop.name} onClose={() => setMenuOpen(false)}>
        <ul className="-mx-2 space-y-1">
          {menuItems.map(([icon, label, action]) => (
            <li key={label}>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  action();
                }}
                className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left text-sm font-medium text-slate-800 hover:bg-surface-light cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center">
                  <i className={`fa-solid ${icon} text-sm`}></i>
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
};
