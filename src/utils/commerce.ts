// Règles métier partagées par le frontend et le serveur (server/ importe ce fichier) :
// le serveur recalcule toujours prix, livraison et remises avec ces mêmes fonctions.
import type { CartItem, OrderStatus } from '../types';

const TIME_ZONE = 'Africa/Abidjan';

export const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Dakar'] as const;

export const formatPrice = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

export const formatDate = (date: Date = new Date()) =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TIME_ZONE });

export const formatTime = (date: Date = new Date()) =>
  date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

/* ---------- Livraison ---------- */

export type DeliveryMethodId = 'express' | 'standard' | 'relais';

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: string;
  description: string;
  icon: string;
}

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: 'express', label: 'Livraison express', description: 'Livré en 24h (Abidjan uniquement)', icon: 'fa-bolt' },
  { id: 'standard', label: 'Livraison standard', description: 'Livré en 48h à 72h à domicile', icon: 'fa-truck' },
  { id: 'relais', label: 'Point relais', description: 'Retrait dans un point Béthanie sous 48h', icon: 'fa-store' },
];

export const FREE_DELIVERY_THRESHOLD = 100000;

export const getDeliveryFee = (method: DeliveryMethodId, city: string, subtotal: number) => {
  if (subtotal === 0) return 0;
  if (method === 'relais') return 1000;
  if (method === 'express') return city === 'Abidjan' ? 2500 : 5000;
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  if (city === 'Abidjan') return 1500;
  if (city === 'Dakar') return 5000;
  return 3000;
};

/* ---------- Codes promo ---------- */

export interface PromoCode {
  code: string;
  label: string;
  compute: (subtotal: number, deliveryFee: number) => number;
}

export const PROMO_CODES: PromoCode[] = [
  {
    code: 'BETHANIE10',
    label: '-10% sur le panier (max. 10 000 FCFA)',
    compute: (subtotal) => Math.min(Math.round(subtotal * 0.1), 10000),
  },
  {
    code: 'BIENVENUE',
    label: '2 000 FCFA offerts sur votre commande',
    compute: (subtotal) => Math.min(2000, subtotal),
  },
  {
    code: 'LIVRAISON',
    label: 'Livraison offerte',
    compute: (_subtotal, deliveryFee) => deliveryFee,
  },
];

export const findPromo = (code: string) =>
  PROMO_CODES.find((p) => p.code === code.trim().toUpperCase());

/* ---------- Paiement ---------- */

export interface PaymentOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  needsPhone: boolean;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'Orange Money', label: 'Orange Money', icon: 'fa-mobile-screen', color: 'bg-orange-500', needsPhone: true },
  { id: 'MTN MoMo', label: 'MTN Mobile Money', icon: 'fa-mobile-screen-button', color: 'bg-yellow-400', needsPhone: true },
  { id: 'Moov Money', label: 'Moov Money', icon: 'fa-sim-card', color: 'bg-blue-600', needsPhone: true },
  { id: 'Wave', label: 'Wave', icon: 'fa-water', color: 'bg-sky-500', needsPhone: true },
  { id: 'Carte bancaire', label: 'Carte Visa / Mastercard', icon: 'fa-credit-card', color: 'bg-slate-800', needsPhone: false },
  { id: 'Paiement à la livraison', label: 'Paiement à la livraison', icon: 'fa-money-bill-wave', color: 'bg-emerald-600', needsPhone: false },
];

/* ---------- Commandes ---------- */

export const ORDER_FLOW: { status: OrderStatus; step: string }[] = [
  { status: 'confirmée', step: 'Commande confirmée' },
  { status: 'préparation', step: 'Préparation' },
  { status: 'expédition', step: 'Expédition' },
  { status: 'en_livraison', step: 'En livraison' },
  { status: 'livrée', step: 'Livrée' },
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmée: 'Confirmée',
  préparation: 'En préparation',
  expédition: 'Expédiée',
  en_livraison: 'En livraison',
  livrée: 'Livrée',
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  confirmée: 'bg-sky-50 text-sky-700',
  préparation: 'bg-amber-50 text-amber-800',
  expédition: 'bg-emerald-50 text-emerald-700',
  en_livraison: 'bg-orange-50 text-orange-700',
  livrée: 'bg-brand-100 text-brand-900',
};

export const DRIVERS = [
  { name: 'Mamadou K.', phone: '+225 05 44 33 22', vehicle: 'Moto Express Béthanie #14' },
  { name: 'Awa T.', phone: '+225 07 12 45 78', vehicle: 'Moto Express Béthanie #08' },
  { name: 'Yao B.', phone: '+225 01 98 76 54', vehicle: 'Tricycle Béthanie #21' },
];

export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

export const cartCount = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);

export const isSameCartLine = (a: CartItem, b: Pick<CartItem, 'product' | 'selectedColor' | 'selectedSize'>) =>
  a.product.id === b.product.id && a.selectedColor === b.selectedColor && a.selectedSize === b.selectedSize;

export const nextStatus = (status: OrderStatus): OrderStatus | null => {
  const index = ORDER_FLOW.findIndex((s) => s.status === status);
  return index >= 0 && index < ORDER_FLOW.length - 1 ? ORDER_FLOW[index + 1].status : null;
};
