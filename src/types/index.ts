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
  isNew?: boolean;
  isTrending?: boolean;
  isBio?: boolean;
  isPromo?: boolean;
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
  status: 'confirmée' | 'préparation' | 'expédition' | 'en_livraison' | 'livrée';
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  phoneNumber?: string;
  shippingAddress: string;
  paymentStatus?: PaymentStatus;
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

export interface NavigateParams {
  category?: string;
  vendor?: string;
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
}

export interface ApiConfig {
  demoMode: boolean;
  paymentProvider: string;
}
