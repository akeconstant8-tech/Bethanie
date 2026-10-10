export type ScreenType =
  | 'home'
  | 'categories'
  | 'catalog'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'tracking'
  | 'account'
  | 'seller';

export interface Vendor {
  id: string;
  name: string;
  location: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  avatarText?: string;
  articlesCount?: number;
  /** Boutique fictive du catalogue de démonstration. */
  isDemo?: boolean;
}

export type ProductCondition = 'neuf' | 'occasion';

/** Auteur et licence d'une photo libre de droits (produits de démonstration). */
export interface PhotoCredit {
  author: string;
  licence: string;
  licenceUrl?: string;
  source: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  discountBadge?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  rating: number;
  reviewsCount: number;
  location: string;
  vendor: Vendor;
  image: string;
  additionalImages?: string[];
  description: string;
  characteristics?: Record<string, string>;
  stock: number;
  /** Neuf ou d'occasion. */
  condition: ProductCondition;
  /** Référence unique affichée sur la fiche. */
  reference: string;
  /** Date de mise en vente (ISO). */
  createdAt: string;
  /** Mis en vente il y a moins de 30 jours par un vrai vendeur. */
  isNew?: boolean;
  isTrending?: boolean;
  isBio?: boolean;
  /** Promotion fixée par le vendeur : ancien prix (originalPrice) supérieur au prix. */
  isPromo?: boolean;
  /** Produit d'exemple du catalogue de démonstration (boutique fictive). */
  isDemo?: boolean;
  /** Produit ou fabrication ivoirienne. */
  isLocal?: boolean;
  /** Indication de livraison donnée par le vendeur. */
  deliveryNote?: string;
  photoCredit?: PhotoCredit;
  /** Articles vendus et payés (vraies commandes seulement). */
  soldCount?: number;
  /** Ventes, favoris et avis réels réunis : sert à classer les « Populaires ». */
  popularity?: number;
  availableColors?: { name: string; hex: string }[];
  availableSizes?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface OrderTrackingStep {
  step: string;
  date?: string;
  time?: string;
  completed: boolean;
  current?: boolean;
}

export interface Order {
  id: string;
  date: string;
  /** « annulée » : paiement non reçu sous 2 heures, stock remis en vente (hors du cycle de livraison). */
  status: 'confirmée' | 'préparation' | 'expédition' | 'en_livraison' | 'livrée' | 'annulée';
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  /** Nom du client au moment de la commande (achat invité ou compte). */
  customerName?: string;
  phoneNumber?: string;
  shippingAddress: string;
  paymentStatus?: PaymentStatus;
  /** Page de paiement GeniusPay (paiement en ligne en attente) : y envoyer le client pour payer. */
  paymentUrl?: string;
  /** Pourquoi une commande « annulée » l'a été : paiement refusé, expiré (2 h), ou autre. */
  cancelReason?: 'paiement_echoue' | 'paiement_expire' | 'autre';
  contactPhone?: string;
  deliveryMethod?: string;
  createdAt?: string;
  deliveryDriver?: {
    name: string;
    phone: string;
    vehicle: string;
    eta: string;
  };
  steps: OrderTrackingStep[];
}

export interface Category {
  id: string;
  name: string;
  /** Sous-titre de la carte de l'écran Catégories (ex : « Vêtements, accessoires »). */
  description: string;
  icon: string;
  /** Illustration de la catégorie (accueil, écran Catégories). */
  image?: string;
  bgColor: string;
  textColor: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  articlesCount: number;
  rating: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  description: string;
  verified: boolean;
}

export type OrderStatus = Order['status'];

export type PaymentStatus = 'en_attente' | 'payé' | 'à_la_livraison' | 'échoué';

export interface Address {
  id: string;
  title: string;
  address: string;
  default: boolean;
}

export interface PaymentMethod {
  id: string;
  type: string;
  number: string;
  default: boolean;
}

export interface User {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  location: string;
  rating?: number;
  reviewsCount?: number;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
}

export interface SellerShop {
  id: string;
  name: string;
  location: string;
  category: string;
  phone: string;
  description: string;
  createdAt: string;
}

export type AccountTab = 'overview' | 'orders' | 'wishlist' | 'addresses' | 'payments' | 'profile';

export type SellerTab = 'dashboard' | 'products' | 'orders' | 'stats' | 'new';

/** Sélections de l'accueil ouvertes en entier dans le catalogue (« Voir tout »). */
export type CatalogView = 'populaires' | 'nouveautes' | 'meilleures-ventes' | 'promotions' | 'proches' | 'locaux';

export interface NavigateParams {
  category?: string;
  vendor?: string;
  view?: CatalogView;
  /** Ville (filtre « Localisation » du catalogue). */
  city?: string;
  productId?: string;
  orderId?: string;
  tab?: AccountTab;
  sellerTab?: SellerTab;
}

/* ---------- Échanges avec l'API (server/) ---------- */

/** Utilisateur connecté, tel que renvoyé par GET /api/auth/me. */
export interface Me extends User {
  id: string;
  role: 'customer' | 'admin';
  shop: SellerShop | null;
  wishlist: string[];
}

export interface Review {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
}

export interface ShopDraft {
  name: string;
  location: string;
  category: string;
  phone: string;
  description: string;
}

export interface ProductDraft {
  title: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  description: string;
  sizes?: string[];
  characteristics?: Record<string, string>;
  /** Photo principale encodée en data URL (JPEG/PNG/WebP), enregistrée par le serveur. */
  imageData?: string;
  /** Photos supplémentaires (2 au maximum), même format. */
  extraImagesData?: string[];
  condition?: ProductCondition;
  deliveryNote?: string;
}

/** Modification d'un produit par son vendeur (champs fournis seulement). */
export interface ProductPatch {
  title?: string;
  description?: string;
  price?: number;
  /** Ancien prix barré ; null retire la promotion. */
  originalPrice?: number | null;
  stock?: number;
  condition?: ProductCondition;
  deliveryNote?: string;
}

export interface CheckoutPayload {
  items: { productId: string; quantity: number; color?: string; size?: string }[];
  deliveryMethod: 'express' | 'standard' | 'relais';
  city: string;
  shippingAddress: string;
  contactPhone: string;
  paymentMethod: string;
  paymentPhone?: string;
  promoCode?: string;
  /** Achat sans compte uniquement : nom complet saisi à la livraison. */
  customerName?: string;
}

export interface ApiConfig {
  /** Paiement en ligne GeniusPay disponible ; sinon, seul le paiement à la livraison est proposé. */
  onlinePayment: boolean;
}

/** Proposition de l'assistant vendeur, à confirmer par le vendeur (voir server/routes/assistant.ts). */
export type AssistantProposal =
  | { kind: 'product'; id: string; title: string; category: string; description: string; price?: number; stock?: number }
  | { kind: 'stock'; id: string; productId: string; title: string; from: number; to: number }
  | { kind: 'order'; id: string; orderId: string; from: OrderStatus; to: OrderStatus };

/** Rapport du contrôle des transactions (GET /api/admin/transactions, administrateurs). */
export interface TransactionReport {
  taux: number;
  commandesControlees: number;
  commissionAcquise: number;
  commissionPrevue: number;
  ventesPayees: number;
  ventesEnAttente: number;
  parBoutique: { boutique: string; commissionAcquise: number; commissionPrevue: number; partVendeurs: number }[];
  anomalies: { commande: string; ecarts: string[] }[];
  transactionsRefusees: number;
  journal: { intact: boolean; lignes: number; premiereLigneAlteree: number | null; nonScellees: number; cause: string | null; scelle: string };
  verifieLe: string;
}
