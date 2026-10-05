import type {
  ApiConfig,
  AssistantProposal,
  TransactionReport,
  CheckoutPayload,
  Me,
  Order,
  Product,
  ProductDraft,
  Review,
  Shop,
  ShopDraft,
} from '../types';
import { fr } from '../i18n/fr';
import { en } from '../i18n/en';

/** Messages produits par le site lui-même (les erreurs de l'API arrivent déjà rédigées par le serveur). */
const localMessage = (key: 'api.unreachable' | 'api.error') =>
  (document.documentElement.lang === 'en' ? en : fr)[key];

/** Erreur renvoyée par l'API, avec un message prêt à afficher. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        // En-tête exigé par le serveur pour toute modification (protection CSRF).
        'X-Bethanie': '1',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, localMessage('api.unreachable'));
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? localMessage('api.error'));
  }
  return data as T;
};

export const api = {
  config: () => request<ApiConfig>('GET', '/config'),

  /* Compte */
  me: () => request<{ user: Me | null }>('GET', '/auth/me').then((r) => r.user),
  googleSignIn: (idToken: string) =>
    request<{ user: Me }>('POST', '/auth/google', { idToken }).then((r) => r.user),
  logout: () => request<void>('POST', '/auth/logout'),
  /** Administration : commissions de Béthanie et contrôle des transactions. */
  adminTransactions: () => request<{ report: TransactionReport }>('GET', '/admin/transactions').then((r) => r.report),
  /** Assistant vendeur (IA) : historique de la conversation → réponse et propositions à confirmer. */
  sellerAssistant: (messages: { role: 'user' | 'assistant'; text: string }[], lang: 'fr' | 'en') =>
    request<{ reply: string; proposals: AssistantProposal[] }>('POST', '/seller/assistant', { messages, lang }),
  updateProfile: (data: { name: string; email: string; phone: string; location: string }) =>
    request<{ user: Me }>('PATCH', '/me', data).then((r) => r.user),
  addAddress: (data: { title: string; address: string }) =>
    request<{ user: Me }>('POST', '/me/addresses', data).then((r) => r.user),
  removeAddress: (id: string) => request<{ user: Me }>('DELETE', `/me/addresses/${id}`).then((r) => r.user),
  setDefaultAddress: (id: string) =>
    request<{ user: Me }>('POST', `/me/addresses/${id}/default`).then((r) => r.user),
  addPaymentMethod: (data: { type: string; number: string }) =>
    request<{ user: Me }>('POST', '/me/payment-methods', data).then((r) => r.user),
  removePaymentMethod: (id: string) =>
    request<{ user: Me }>('DELETE', `/me/payment-methods/${id}`).then((r) => r.user),
  setDefaultPaymentMethod: (id: string) =>
    request<{ user: Me }>('POST', `/me/payment-methods/${id}/default`).then((r) => r.user),
  setWishlist: (productIds: string[]) =>
    request<{ wishlist: string[] }>('PUT', '/me/wishlist', { productIds }).then((r) => r.wishlist),

  /* Catalogue */
  products: () => request<{ products: Product[] }>('GET', '/products?limit=500').then((r) => r.products),
  shops: () => request<{ shops: Shop[] }>('GET', '/shops').then((r) => r.shops),
  reviews: (productId: string) =>
    request<{ reviews: Review[] }>('GET', `/products/${encodeURIComponent(productId)}/reviews`).then((r) => r.reviews),
  addReview: (productId: string, data: { rating: number; text: string }) =>
    request<{ review: Review; product: Product }>('POST', `/products/${encodeURIComponent(productId)}/reviews`, data),

  /* Commandes */
  orders: () => request<{ orders: Order[] }>('GET', '/orders').then((r) => r.orders),
  createOrder: (payload: CheckoutPayload) => request<{ order: Order }>('POST', '/orders', payload).then((r) => r.order),
  payOrder: (orderId: string) => request<{ order: Order }>('POST', `/orders/${orderId}/pay`).then((r) => r.order),
  advanceOrder: (orderId: string) =>
    request<{ order: Order; message: string }>('POST', `/orders/${orderId}/advance`),

  /* Vendeur */
  createShop: (draft: ShopDraft) => request<{ user: Me }>('POST', '/shops', draft).then((r) => r.user),
  createProduct: (draft: ProductDraft) =>
    request<{ product: Product }>('POST', '/products', draft).then((r) => r.product),
  updateProduct: (id: string, patch: { stock?: number; price?: number; title?: string; description?: string }) =>
    request<{ product: Product }>('PATCH', `/products/${encodeURIComponent(id)}`, patch).then((r) => r.product),
  deleteProduct: (id: string) => request<void>('DELETE', `/products/${encodeURIComponent(id)}`),
  sellerOrders: () => request<{ orders: Order[] }>('GET', '/seller/orders').then((r) => r.orders),
};

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : localMessage('api.error'));
