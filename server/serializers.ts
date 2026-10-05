import type { Me, Order, OrderStatus, PaymentStatus, Product, Review, SellerShop, Shop } from '../src/types/index.ts';
import { ORDER_FLOW, formatDate, formatTime } from '../src/utils/commerce.ts';
import { db, type Row } from './db.ts';

const json = <T>(value: unknown): T | undefined =>
  typeof value === 'string' && value !== '' ? (JSON.parse(value) as T) : undefined;

const str = (value: unknown) => (value === null || value === undefined ? undefined : String(value));

/* ---------- Produits ---------- */

export const PRODUCT_SELECT = `
  SELECT p.*,
         s.name AS shop_name, s.location AS shop_location, s.verified AS shop_verified,
         s.rating AS shop_rating, s.reviews_count AS shop_reviews_count,
         (SELECT COUNT(*) FROM products p2 WHERE p2.shop_id = s.id AND p2.deleted_at IS NULL) AS shop_articles
  FROM products p
  JOIN shops s ON s.id = p.shop_id`;

export const toProduct = (row: Row): Product => {
  const product: Product = {
    id: String(row.id),
    title: String(row.title),
    price: Number(row.price),
    category: String(row.category),
    rating: Math.round(Number(row.rating) * 10) / 10,
    reviewsCount: Number(row.reviews_count),
    location: String(row.location),
    stock: Number(row.stock),
    image: String(row.image),
    description: String(row.description),
    vendor: {
      id: String(row.shop_id),
      name: String(row.shop_name),
      location: String(row.shop_location),
      verified: Boolean(row.shop_verified),
      rating: Number(row.shop_rating),
      reviewsCount: Number(row.shop_reviews_count),
      articlesCount: Number(row.shop_articles),
    },
  };
  if (row.original_price !== null) product.originalPrice = Number(row.original_price);
  if (row.discount_badge !== null) product.discountBadge = String(row.discount_badge);
  if (row.subcategory !== null) product.subcategory = String(row.subcategory);
  if (row.brand !== null) product.brand = String(row.brand);
  const additionalImages = json<string[]>(row.additional_images);
  if (additionalImages?.length) product.additionalImages = additionalImages;
  const characteristics = json<Record<string, string>>(row.characteristics);
  if (characteristics && Object.keys(characteristics).length) product.characteristics = characteristics;
  const colors = json<Product['availableColors']>(row.colors);
  if (colors?.length) product.availableColors = colors;
  const sizes = json<string[]>(row.sizes);
  if (sizes?.length) product.availableSizes = sizes;
  if (row.is_new) product.isNew = true;
  if (row.is_trending) product.isTrending = true;
  if (row.is_bio) product.isBio = true;
  if (row.is_promo) product.isPromo = true;
  return product;
};

export const getProduct = (id: string): Product | undefined => {
  const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ? AND p.deleted_at IS NULL`).get(id) as Row | undefined;
  return row ? toProduct(row) : undefined;
};

/* ---------- Boutiques ---------- */

export const toShop = (row: Row): Shop => ({
  id: String(row.id),
  name: String(row.name),
  location: String(row.location),
  articlesCount: Number(row.articles_count ?? 0),
  rating: Number(row.rating),
  icon: String(row.icon),
  iconBg: String(row.icon_bg),
  iconColor: String(row.icon_color),
  description: String(row.description),
  verified: Boolean(row.verified),
});

export const toSellerShop = (row: Row): SellerShop => ({
  id: String(row.id),
  name: String(row.name),
  location: String(row.location),
  category: String(row.category),
  phone: String(row.phone),
  description: String(row.description),
  createdAt: formatDate(new Date(String(row.created_at))),
});

/* ---------- Utilisateur connecté ---------- */

export const loadMe = (userId: string): Me => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Row;
  const addresses = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at')
    .all(userId) as Row[];
  const payments = db
    .prepare('SELECT * FROM payment_methods WHERE user_id = ? ORDER BY created_at')
    .all(userId) as Row[];
  const shop = db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(userId) as Row | undefined;
  const wishlist = db
    .prepare(
      `SELECT w.product_id FROM wishlist w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ? AND p.deleted_at IS NULL ORDER BY w.created_at`
    )
    .all(userId) as Row[];

  return {
    id: String(user.id),
    name: String(user.name),
    email: String(user.email),
    phone: String(user.phone),
    avatar: String(user.avatar),
    location: String(user.location),
    role: user.role as Me['role'],
    addresses: addresses.map((a) => ({
      id: String(a.id),
      title: String(a.title),
      address: String(a.address),
      default: Boolean(a.is_default),
    })),
    paymentMethods: payments.map((p) => ({
      id: String(p.id),
      type: String(p.type),
      number: String(p.number),
      default: Boolean(p.is_default),
    })),
    shop: shop ? toSellerShop(shop) : null,
    wishlist: wishlist.map((w) => String(w.product_id)),
  };
};

/* ---------- Commandes ---------- */

const toOrder = (row: Row, items: Row[], events: Row[], forCustomer: boolean): Order => {
  const status = row.status as OrderStatus;
  const steps = ORDER_FLOW.map((flow) => {
    const event = events.find((e) => e.status === flow.status);
    const at = event ? new Date(String(event.created_at)) : null;
    return {
      step: flow.step,
      date: at ? formatDate(at) : '',
      time: at ? formatTime(at) : 'En attente',
      completed: Boolean(at),
      current: Boolean(at) && flow.status === status && status !== 'livrée',
    };
  });

  return {
    id: String(row.id),
    date: formatDate(new Date(String(row.created_at))),
    createdAt: String(row.created_at),
    status,
    paymentStatus: row.payment_status as PaymentStatus,
    // Page de paiement GeniusPay à reprendre : seulement pour le client, et tant que le paiement est attendu.
    paymentUrl: forCustomer && row.payment_status === 'en_attente' && row.payment_url ? String(row.payment_url) : undefined,
    // Pourquoi une commande a été annulée (pour afficher « Paiement échoué » plutôt qu'un message d'expiration).
    cancelReason: status === 'annulée' && row.cancel_reason ? (String(row.cancel_reason) as Order['cancelReason']) : undefined,
    items: items.map((item) => ({
      product: { ...(JSON.parse(String(item.product_snapshot)) as Product), price: Number(item.unit_price) },
      quantity: Number(item.quantity),
      selectedColor: str(item.color),
      selectedSize: str(item.size),
    })),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount),
    total: Number(row.total),
    paymentMethod: String(row.payment_method),
    phoneNumber: str(row.phone_number),
    contactPhone: str(row.contact_phone),
    shippingAddress: String(row.shipping_address),
    deliveryMethod: String(row.delivery_method),
    deliveryDriver: json<Order['deliveryDriver']>(row.driver),
    steps,
  };
};

/**
 * Charge des commandes avec leurs articles et leur historique.
 * `onlyShopId` limite les articles à ceux d'une boutique (vue vendeur).
 */
export const loadOrders = (orderRows: Row[], onlyShopId?: string): Order[] => {
  if (orderRows.length === 0) return [];
  const ids = orderRows.map((o) => String(o.id));
  const placeholders = ids.map(() => '?').join(',');
  const itemRows = db
    .prepare(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})${onlyShopId ? ' AND shop_id = ?' : ''} ORDER BY id`
    )
    .all(...ids, ...(onlyShopId ? [onlyShopId] : [])) as Row[];
  const eventRows = db
    .prepare(`SELECT * FROM order_events WHERE order_id IN (${placeholders}) ORDER BY id`)
    .all(...ids) as Row[];

  return orderRows.map((row) =>
    toOrder(
      row,
      itemRows.filter((i) => i.order_id === row.id),
      eventRows.filter((e) => e.order_id === row.id),
      !onlyShopId
    )
  );
};

/* ---------- Avis ---------- */

export const toReview = (row: Row): Review => ({
  id: String(row.id),
  author: String(row.author_name),
  city: String(row.city),
  rating: Number(row.rating),
  date: formatDate(new Date(String(row.created_at))),
  text: String(row.text),
  verified: Boolean(row.verified),
});
