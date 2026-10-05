import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AccountTab,
  ApiConfig,
  CartItem,
  CheckoutPayload,
  Me,
  NavigateParams,
  Order,
  Product,
  ProductDraft,
  ScreenType,
  SellerTab,
  ShopDraft,
} from './types';
import { api, errorMessage } from './api/client';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomNav, BottomNavItem } from './components/BottomNav';
import { ConnectionStatus } from './components/ConnectionStatus';
import { InstallBanner, IosInstallSheet } from './components/InstallPrompt';
import { Onboarding } from './components/Onboarding';
import { ToastMessage, ToastStack } from './components/Toast';
import { EmptyState, PageSkeleton, btnPrimary } from './components/ui';
import { HomeScreen } from './screens/HomeScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CartScreen } from './screens/CartScreen';
import type { PlaceOrderDetails } from './screens/CheckoutScreen';
import { AuthScreen } from './screens/AuthScreen';
import { usePersistentState } from './hooks/usePersistentState';
import { TranslationKey, useI18n } from './i18n';
import { acknowledgeInstall, applyUpdate, hideBootSplash, promptInstall, usePwa } from './pwa/pwa';
import { cartCount, findPromo, isSameCartLine } from './utils/commerce';
import { supportsViewTransitions, useMotionPreference, withViewTransition } from './utils/motion';

/* Écrans chargés à la demande (moins de JavaScript au démarrage), puis préchargés en arrière-plan. */
const loadCheckout = () => import('./screens/CheckoutScreen');
const loadTracking = () => import('./screens/TrackingScreen');
const loadAccount = () => import('./screens/AccountScreen');
const loadSeller = () => import('./screens/SellerScreen');
const CheckoutScreen = lazy(() => loadCheckout().then((m) => ({ default: m.CheckoutScreen })));
const TrackingScreen = lazy(() => loadTracking().then((m) => ({ default: m.TrackingScreen })));
const AccountScreen = lazy(() => loadAccount().then((m) => ({ default: m.AccountScreen })));
const SellerScreen = lazy(() => loadSeller().then((m) => ({ default: m.SellerScreen })));
const LAZY_SCREENS = [loadCheckout, loadTracking, loadAccount, loadSeller];

const INSTALL_BANNER_PAUSE_MS = 14 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Navigation par hash (#/panier, #/produit/:id…) : le bouton retour   */
/* du navigateur fonctionne et chaque écran a sa propre URL.           */
/* ------------------------------------------------------------------ */

interface Route {
  screen: ScreenType;
  params: NavigateParams;
}

const SCREEN_PATHS: Record<ScreenType, string> = {
  home: '',
  categories: 'categories',
  catalog: 'catalogue',
  'product-detail': 'produit',
  cart: 'panier',
  checkout: 'paiement',
  tracking: 'suivi',
  account: 'compte',
  seller: 'vendeur',
};

const ACCOUNT_TABS: AccountTab[] = ['orders', 'wishlist', 'addresses', 'payments', 'profile'];
const SELLER_TABS: SellerTab[] = ['products', 'orders', 'stats', 'new'];

/** Écrans réservés aux personnes connectées ; la raison affichée est la clé auth.reason.<écran>. */
const PROTECTED: ScreenType[] = ['checkout', 'tracking', 'account', 'seller'];

/** Écrans sans barre d'onglets sur mobile : ils ont leur propre barre d'action en bas. */
const FOCUSED_SCREENS: ScreenType[] = ['product-detail', 'checkout', 'tracking'];

/** Sens de la transition entre deux écrans (voir index.css). */
type NavDirection = 'forward' | 'back' | 'tab';

/** Écrans racines des onglets du bas : on y passe avec un fondu, pas un glissement. */
const isTabRoot = ({ screen, params }: Route) =>
  screen === 'home' ||
  screen === 'categories' ||
  screen === 'cart' ||
  (screen === 'account' && (!params.tab || params.tab === 'overview' || params.tab === 'orders'));


const buildHash = ({ screen, params }: Route) => {
  const base = `#/${SCREEN_PATHS[screen]}`;
  if (screen === 'product-detail' && params.productId) return `${base}/${encodeURIComponent(params.productId)}`;
  if (screen === 'tracking' && params.orderId) return `${base}/${params.orderId}`;
  if (screen === 'account' && params.tab && params.tab !== 'overview') return `${base}/${params.tab}`;
  if (screen === 'seller' && params.sellerTab && params.sellerTab !== 'dashboard') return `${base}/${params.sellerTab}`;
  if (screen === 'catalog') {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.set('categorie', params.category);
    if (params.vendor) query.set('boutique', params.vendor);
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  }
  return base;
};

const parseHash = (hash: string): Route | null => {
  if (!hash || hash === '#' || hash === '#/') return { screen: 'home', params: {} };
  if (!hash.startsWith('#/')) return null; // ancres internes : on reste sur l'écran courant
  const [path, query = ''] = hash.slice(2).split('?');
  const [segment, id] = path.split('/');
  const screen = (Object.keys(SCREEN_PATHS) as ScreenType[]).find((s) => SCREEN_PATHS[s] === segment);
  if (!screen) return { screen: 'home', params: {} };

  const params: NavigateParams = {};
  if (screen === 'product-detail' && id) params.productId = decodeURIComponent(id);
  if (screen === 'tracking' && id) params.orderId = id;
  if (screen === 'account' && ACCOUNT_TABS.includes(id as AccountTab)) params.tab = id as AccountTab;
  if (screen === 'seller' && SELLER_TABS.includes(id as SellerTab)) params.sellerTab = id as SellerTab;
  if (screen === 'catalog') {
    const q = new URLSearchParams(query);
    params.category = q.get('categorie') ?? 'all';
    const vendor = q.get('boutique');
    if (vendor) params.vendor = vendor;
  }
  return { screen, params };
};

/* ------------------------------------------------------------------ */

const App: React.FC = () => {
  const { t, promoLabel } = useI18n();
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash) ?? { screen: 'home', params: {} });
  const routeRef = useRef(route);
  routeRef.current = route;

  // Données du serveur
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [config, setConfig] = useState<ApiConfig>({ demoMode: true, paymentProvider: 'simulation' });
  const [me, setMe] = useState<Me | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);

  // Données gardées dans le navigateur (utilisables sans compte)
  const [rawCart, setRawCart] = usePersistentState<CartItem[]>('cart', []);
  const [guestWishlist, setGuestWishlist] = usePersistentState<string[]>('wishlist', []);
  const [selectedCity, setSelectedCity] = usePersistentState('city', 'Abidjan');
  const [promoCode, setPromoCode] = usePersistentState<string | null>('promo', null);
  const [onboarded, setOnboarded] = usePersistentState('onboarded', false);

  // Accueil de première visite : sur mobile, et seulement si l'on arrive par la page d'accueil
  // (un lien partagé vers un produit s'ouvre directement).
  const [showOnboarding, setShowOnboarding] = useState(
    () => !onboarded && route.screen === 'home' && window.matchMedia('(max-width: 1023px)').matches
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const selectedProductRef = useRef<string | null>(null);
  const toastCounter = useRef(0);

  // Application installable
  const pwa = usePwa();
  const [installDismissedAt, setInstallDismissedAt] = usePersistentState<number>('installDismissedAt', 0);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const installAvailable = !pwa.isStandalone && (pwa.canInstall || pwa.isIOS);
  const showInstallBanner = installAvailable && Date.now() - installDismissedAt > INSTALL_BANNER_PAUSE_MS;
  // Sans l'API View Transitions (Firefox…), simple fondu à chaque changement d'écran.
  const motionPreference = useMotionPreference();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculé quand le réglage « Animations » change
  const fadeBetweenScreens = useMemo(() => !supportsViewTransitions(), [motionPreference]);

  const wishlist = me ? me.wishlist : guestWishlist;
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Le panier pointe toujours vers la version à jour du produit (prix, stock, image).
  const cart = useMemo(
    () =>
      rawCart
        .filter((item) => productsById.has(item.product.id))
        .map((item) => ({ ...item, product: productsById.get(item.product.id)! })),
    [rawCart, productsById]
  );

  const promo = promoCode ? findPromo(promoCode) ?? null : null;

  /* ----- Notifications ----- */
  /** Ferme une notification après son animation de sortie. */
  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 220);
  }, []);

  const notify = useCallback(
    (text: string, options: Omit<ToastMessage, 'id' | 'text' | 'leaving'> = {}) => {
      const id = ++toastCounter.current;
      const duration = options.duration ?? 4000;
      setToasts((list) => [...list.slice(-2), { id, text, ...options, duration }]);
      if (duration > 0) window.setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  /** Exécute une action serveur ; en cas d'échec, affiche l'erreur et renvoie undefined. */
  const attempt = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await action();
      } catch (error) {
        notify(errorMessage(error), { tone: 'error' });
        return undefined;
      }
    },
    [notify]
  );

  /* ----- Chargement initial ----- */
  const loadCatalog = useCallback(async () => {
    try {
      setProducts(await api.products());
      setCatalogStatus('ready');
    } catch {
      setCatalogStatus((status) => (status === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    // Nettoie les données locales de la version sans serveur.
    try {
      ['sellerProducts', 'soldUnits', 'orders', 'user', 'shop'].forEach((k) => window.localStorage.removeItem(`bethanie.${k}`));
    } catch {
      // stockage indisponible
    }
    loadCatalog();
    api.config().then(setConfig).catch(() => undefined);
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setSessionReady(true));
  }, [loadCatalog]);

  const meId = me?.id;
  useEffect(() => {
    if (!meId) {
      setOrders([]);
      return;
    }
    api.orders().then(setOrders).catch(() => undefined);
  }, [meId]);

  const shopId = me?.shop?.id;
  const refreshSellerOrders = useCallback(() => {
    if (shopId) api.sellerOrders().then(setSellerOrders).catch(() => undefined);
  }, [shopId]);

  useEffect(() => {
    if (route.screen === 'seller') refreshSellerOrders();
  }, [route.screen, refreshSellerOrders]);

  /* ----- Démarrage, installation, mises à jour ----- */
  useEffect(() => {
    if (catalogStatus !== 'loading' || showOnboarding) hideBootSplash();
  }, [catalogStatus, showOnboarding]);

  useEffect(() => {
    const safety = window.setTimeout(hideBootSplash, 6000); // au pire, le squelette de chargement prend le relais
    return () => window.clearTimeout(safety);
  }, []);

  // Une fois le catalogue affiché, précharge les écrans chargés à la demande pendant que le navigateur est inactif.
  useEffect(() => {
    if (catalogStatus !== 'ready') return;
    const preload = () => LAZY_SCREENS.forEach((load) => load().catch(() => undefined));
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(preload, { timeout: 4000 });
    else setTimeout(preload, 2000);
  }, [catalogStatus]);

  useEffect(() => {
    if (!pwa.justInstalled) return;
    notify(t('pwa.installed'), { duration: 6000 });
    acknowledgeInstall();
  }, [pwa.justInstalled, notify, t]);

  useEffect(() => {
    if (pwa.updateReady) {
      notify(t('pwa.updateReady'), { tone: 'info', duration: 0, action: { label: t('pwa.update'), onClick: applyUpdate } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule annonce par nouvelle version
  }, [pwa.updateReady]);

  const requestInstall = async () => {
    if (pwa.canInstall) await promptInstall();
    else if (pwa.isIOS) setIosHelpOpen(true);
  };

  /* ----- Navigation ----- */

  // Pile des adresses visitées dans l'application : la flèche « retour » des en-têtes mobiles
  // revient à l'écran précédent s'il existe, sinon à un écran parent logique.
  const historyRef = useRef<string[]>([window.location.hash || '#/']);
  const replacingRef = useRef(false);
  const navDirectionRef = useRef<NavDirection>('tab');

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash || '#/';
      const stack = historyRef.current;
      let isBack = false;
      if (replacingRef.current) {
        stack[stack.length - 1] = hash;
        replacingRef.current = false;
      } else if (stack.length > 1 && stack[stack.length - 2] === hash) {
        stack.pop();
        isBack = true;
      } else if (stack[stack.length - 1] !== hash) {
        stack.push(hash);
      }
      const next = parseHash(window.location.hash);
      if (!next) return;
      // Sens de l'animation : retour, onglet de la barre du bas (fondu) ou écran plus profond (glissement).
      const sameScreen = next.screen === routeRef.current.screen && next.screen !== 'account';
      navDirectionRef.current = isBack ? 'back' : isTabRoot(next) || sameScreen ? 'tab' : 'forward';
      document.documentElement.dataset.navDirection = navDirectionRef.current;
      // Transition animée entre les deux écrans (le nouvel écran est rendu de façon synchrone).
      withViewTransition(() => flushSync(() => setRoute(next)));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const scrollKey = [
    route.screen,
    route.params.productId,
    route.params.orderId,
    route.params.tab,
    route.params.sellerTab,
  ].join('|');
  // Avant l'affichage : la transition capture le nouvel écran déjà remonté en haut.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [scrollKey]);

  useEffect(() => {
    const productTitle =
      route.screen === 'product-detail' && route.params.productId
        ? productsById.get(route.params.productId)?.title
        : undefined;
    document.title = `${productTitle ?? t(`title.${route.screen}` as TranslationKey)} — Béthanie`;
  }, [route, productsById, t]);

  const navigate = useCallback(
    (screen: ScreenType, params: NavigateParams = {}) => {
      const next: NavigateParams = { ...params };
      if (screen === 'product-detail' && !next.productId) {
        next.productId = selectedProductRef.current ?? products[0]?.id;
      }
      if (screen === 'catalog') {
        next.category ??= 'all';
        if (params.category || params.vendor) setSearchQuery('');
      }
      const hash = buildHash({ screen, params: next });
      if (window.location.hash === hash) {
        setRoute({ screen, params: next });
      } else if (routeRef.current.screen === 'checkout' && screen === 'tracking') {
        // Une fois payé, « retour » ne doit pas ramener sur le formulaire de paiement.
        replacingRef.current = true;
        window.location.replace(hash);
      } else {
        window.location.hash = hash;
      }
    },
    [products]
  );

  const goBack = useCallback(
    (fallback: ScreenType, params: NavigateParams = {}) => {
      if (historyRef.current.length > 1) window.history.back();
      else navigate(fallback, params);
    },
    [navigate]
  );

  const openProduct = useCallback(
    (product: Product) => {
      selectedProductRef.current = product.id;
      navigate('product-detail', { productId: product.id });
    },
    [navigate]
  );

  const searchCatalog = (query: string) => {
    setSearchQuery(query);
    navigate('catalog');
  };

  /* ----- Compte ----- */
  const welcome = async (user: Me) => {
    let next = user;
    // Les favoris choisis avant connexion rejoignent le compte.
    if (guestWishlist.length > 0) {
      try {
        const merged = Array.from(new Set([...user.wishlist, ...guestWishlist]));
        next = { ...user, wishlist: await api.setWishlist(merged) };
        setGuestWishlist([]);
      } catch {
        // on garde les favoris locaux pour une prochaine fois
      }
    }
    setMe(next);
    notify(t('toast.welcome', { name: next.name.split(' ')[0] }));
  };

  const googleAuth = async () => {
    const { signInWithGoogle } = await import('./api/firebaseAuth');
    welcome(await api.googleSignIn(await signInWithGoogle()));
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setMe(null);
    setSellerOrders([]);
    navigate('home');
    notify(t('toast.loggedOut'), { tone: 'info' });
  };

  const finishOnboarding = () => {
    setOnboarded(true);
    setShowOnboarding(false);
  };

  /** Met à jour le profil via une action serveur qui renvoie l'utilisateur à jour. */
  const updateMe = async (action: () => Promise<Me>, success?: string) => {
    const user = await attempt(action);
    if (!user) return false;
    setMe(user);
    if (success) notify(success);
    return true;
  };

  /* ----- Favoris ----- */
  const saveWishlist = useCallback(
    (next: string[]) => {
      if (!me) {
        setGuestWishlist(next);
        return;
      }
      const previous = me.wishlist;
      setMe({ ...me, wishlist: next });
      api.setWishlist(next).catch((error) => {
        setMe((current) => (current ? { ...current, wishlist: previous } : current));
        notify(errorMessage(error), { tone: 'error' });
      });
    },
    [me, notify, setGuestWishlist]
  );

  const toggleWishlist = useCallback(
    (productId: string) => {
      const has = wishlist.includes(productId);
      saveWishlist(has ? wishlist.filter((id) => id !== productId) : [...wishlist, productId]);
      notify(has ? t('toast.removedFav') : t('toast.addedFav'), { tone: has ? 'info' : 'success' });
    },
    [wishlist, saveWishlist, notify, t]
  );

  /* ----- Panier (dans le navigateur) ----- */
  const addToCart = useCallback(
    (product: Product, quantity = 1, color?: string, size?: string, silent = false) => {
      const sizes = product.availableSizes ?? [];
      if (!size && sizes.length > 1) {
        // Impossible de deviner la taille : on envoie le client sur la fiche produit.
        openProduct(product);
        notify(t('toast.chooseSize'), { tone: 'info' });
        return false;
      }
      const line: CartItem = {
        product,
        quantity,
        selectedColor: color ?? product.availableColors?.[0]?.name,
        selectedSize: size ?? (sizes.length === 1 ? sizes[0] : undefined),
      };
      setRawCart((current) => {
        const index = current.findIndex((item) => isSameCartLine(item, line));
        if (index === -1) return [...current, { ...line, quantity: Math.min(quantity, product.stock) }];
        return current.map((item, i) =>
          i === index ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) } : item
        );
      });
      if (!silent) {
        notify(t('toast.addedToCart', { title: product.title }), {
          action: { label: t('toast.viewCart'), onClick: () => navigate('cart') },
        });
      }
      return true;
    },
    [navigate, notify, openProduct, setRawCart, t]
  );

  const quickAdd = useCallback((product: Product) => addToCart(product), [addToCart]);

  const buyNow = (product: Product, quantity: number, color?: string, size?: string) => {
    addToCart(product, quantity, color, size, true);
    navigate('checkout');
  };

  const updateQuantity = (index: number, quantity: number) => {
    const item = cart[index];
    if (!item) return;
    const clamped = Math.max(1, Math.min(item.product.stock, quantity));
    setRawCart((current) => current.map((line) => (isSameCartLine(line, item) ? { ...line, quantity: clamped } : line)));
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    if (!item) return;
    setRawCart((current) => current.filter((line) => !isSameCartLine(line, item)));
    notify(t('toast.removedFromCart', { title: item.product.title }), {
      tone: 'info',
      action: { label: t('toast.undo'), onClick: () => setRawCart((current) => [...current, item]) },
    });
  };

  const clearCart = () => {
    const previous = rawCart;
    setRawCart([]);
    notify(t('toast.cartCleared'), { tone: 'info', action: { label: t('toast.undo'), onClick: () => setRawCart(previous) } });
  };

  const saveForLater = (index: number) => {
    const item = cart[index];
    if (!item) return;
    if (!wishlist.includes(item.product.id)) saveWishlist([...wishlist, item.product.id]);
    setRawCart((current) => current.filter((line) => !isSameCartLine(line, item)));
    notify(t('toast.movedToFav'));
  };

  const applyPromo = (code: string) => {
    const found = findPromo(code);
    if (!found) return false;
    setPromoCode(found.code);
    notify(t('toast.promoApplied', { code: found.code, label: promoLabel(found.code) }));
    return true;
  };

  /* ----- Commandes ----- */
  const placeOrder = async ({ saveAddress, ...details }: PlaceOrderDetails) => {
    const payload: CheckoutPayload = {
      ...details,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        color: item.selectedColor,
        size: item.selectedSize,
      })),
      promoCode: promo?.code,
    };
    const order = await api.createOrder(payload);
    setOrders((list) => [order, ...list]);
    setRawCart([]);
    setPromoCode(null);
    setNewOrderId(order.id);
    loadCatalog(); // stocks mis à jour
    if (saveAddress) api.addAddress(saveAddress).then(setMe).catch(() => undefined);
    return order;
  };

  const replaceOrder = (order: Order) => setOrders((list) => list.map((o) => (o.id === order.id ? order : o)));

  const payOrder = async (orderId: string) => {
    const order = await api.payOrder(orderId);
    replaceOrder(order);
    return order;
  };

  /** Retour de la page GeniusPay : vérification du paiement par le serveur. */
  const checkPayment = async (orderId: string) => {
    const order = await api.checkPayment(orderId);
    replaceOrder(order);
    if (order.paymentStatus === 'payé') notify(t('toast.paymentConfirmed'));
    return order;
  };

  const advance = async (orderId: string) => {
    const result = await attempt(() => api.advanceOrder(orderId));
    if (!result) return;
    notify(result.message);
    if (orders.some((o) => o.id === orderId)) api.orders().then(setOrders).catch(() => undefined);
    if (routeRef.current.screen === 'seller') refreshSellerOrders();
  };

  /* ----- Vendeur ----- */
  const createShop = async (draft: ShopDraft) => {
    const user = await api.createShop(draft);
    setMe(user);
    notify(t('toast.shopOpened', { name: draft.name }));
  };

  const addProduct = async (draft: ProductDraft) => {
    const product = await api.createProduct(draft);
    setProducts((list) => [...list, product]);
    notify(t('toast.productOnline', { title: product.title }), {
      action: { label: t('toast.view'), onClick: () => openProduct(product) },
    });
  };

  const updateProduct = async (id: string, patch: { stock?: number }) => {
    const product = await attempt(() => api.updateProduct(id, patch));
    if (product) setProducts((list) => list.map((p) => (p.id === id ? product : p)));
  };

  const deleteProduct = async (id: string) => {
    const done = await attempt(() => api.deleteProduct(id).then(() => true));
    if (done) {
      setProducts((list) => list.filter((p) => p.id !== id));
      notify(t('toast.productDeleted'), { tone: 'info' });
    }
  };

  /* ----- Barre d'onglets mobile ----- */
  const { screen, params } = route;
  const sellerHasOwnNav = screen === 'seller' && Boolean(me?.shop);
  const showClientNav = !FOCUSED_SCREENS.includes(screen) && !sellerHasOwnNav;
  const showSellerNav = sellerHasOwnNav && params.sellerTab !== 'new';
  const hasActionBar = screen === 'product-detail' || screen === 'checkout';

  const activeTab =
    screen === 'home'
      ? 'home'
      : screen === 'categories' || screen === 'catalog'
      ? 'categories'
      : screen === 'cart'
      ? 'cart'
      : (screen === 'account' && params.tab === 'orders') || screen === 'tracking'
      ? 'orders'
      : screen === 'account' || screen === 'seller'
      ? 'profile'
      : null;

  const clientNavItems: BottomNavItem[] = [
    { key: 'home', label: t('nav.home'), icon: 'fa-house', onClick: () => navigate('home') },
    { key: 'categories', label: t('nav.categories'), icon: 'fa-table-cells-large', onClick: () => navigate('categories') },
    {
      key: 'cart',
      label: t('nav.cart'),
      icon: 'fa-cart-shopping',
      badge: cartCount(cart),
      cartTarget: true,
      onClick: () => navigate('cart'),
    },
    { key: 'orders', label: t('nav.orders'), icon: 'fa-receipt', onClick: () => navigate('account', { tab: 'orders' }) },
    { key: 'profile', label: t('nav.profile'), icon: 'fa-user', onClick: () => navigate('account') },
  ];

  /* ----- Rendu ----- */
  const renderScreen = () => {
    if (catalogStatus === 'loading') return <PageSkeleton />;
    if (catalogStatus === 'error') {
      return (
        <div className="max-w-xl mx-auto px-4 py-16">
          <EmptyState
            icon="fa-solid fa-plug-circle-xmark"
            title={t('app.serverDown')}
            text={t('app.serverDownText')}
            action={
              <button
                onClick={() => {
                  setCatalogStatus('loading');
                  loadCatalog();
                }}
                className={`${btnPrimary} h-11 px-6 text-sm`}
              >
                {t('app.retry')}
              </button>
            }
          />
        </div>
      );
    }

    if (PROTECTED.includes(screen)) {
      if (!sessionReady) return <PageSkeleton />;
      if (!me) {
        return (
          <AuthScreen reason={t(`auth.reason.${screen}` as TranslationKey)} onGoogleAuth={googleAuth} />
        );
      }
    }

    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            products={products}
            wishlist={wishlist}
            ongoingOrders={orders.filter((o) => o.status !== 'livrée' && o.status !== 'annulée').length}
            installBanner={
              showInstallBanner && (
                <InstallBanner onInstall={requestInstall} onDismiss={() => setInstallDismissedAt(Date.now())} />
              )
            }
            onSearch={searchCatalog}
            onNavigate={navigate}
            onOpenProduct={openProduct}
            onAddToCart={quickAdd}
            onToggleWishlist={toggleWishlist}
          />
        );

      case 'categories':
        return <CategoriesScreen products={products} onNavigate={navigate} />;

      case 'catalog':
        return (
          <CatalogScreen
            key={`${params.category}|${params.vendor ?? ''}`}
            products={products}
            initialCategory={params.category ?? 'all'}
            initialVendor={params.vendor}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNavigate={navigate}
            onBack={() => goBack('categories')}
            onOpenProduct={openProduct}
            onAddToCart={quickAdd}
            onToggleWishlist={toggleWishlist}
            wishlist={wishlist}
          />
        );

      case 'product-detail': {
        const product = params.productId ? productsById.get(params.productId) : undefined;
        if (!product) {
          return (
            <div className="max-w-xl mx-auto px-4 py-16">
              <EmptyState
                icon="fa-solid fa-box-open"
                title={t('app.productUnavailable')}
                action={
                  <button onClick={() => navigate('categories')} className={`${btnPrimary} h-11 px-6 text-sm`}>
                    {t('app.seeCategories')}
                  </button>
                }
              />
            </div>
          );
        }
        return (
          <ProductDetailScreen
            key={product.id}
            product={product}
            products={products}
            wishlist={wishlist}
            cartCount={cartCount(cart)}
            isLoggedIn={Boolean(me)}
            onNavigate={navigate}
            onBack={() => goBack('catalog', { category: product.category })}
            onOpenProduct={openProduct}
            onAddToCart={(p, quantity, color, size) => addToCart(p, quantity, color, size)}
            onBuyNow={buyNow}
            onToggleWishlist={toggleWishlist}
            onNotify={(text) => notify(text, { tone: 'info' })}
            onProductUpdated={(updated) => setProducts((list) => list.map((p) => (p.id === updated.id ? updated : p)))}
          />
        );
      }

      case 'cart':
        return (
          <CartScreen
            cart={cart}
            products={products}
            wishlist={wishlist}
            promo={promo}
            selectedCity={selectedCity}
            onNavigate={navigate}
            onOpenProduct={openProduct}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onSaveForLater={saveForLater}
            onClear={clearCart}
            onApplyPromo={applyPromo}
            onRemovePromo={() => setPromoCode(null)}
            onAddToCart={quickAdd}
            onToggleWishlist={toggleWishlist}
          />
        );

      case 'checkout':
        return (
          <CheckoutScreen
            cart={cart}
            user={me!}
            promo={promo}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onNavigate={navigate}
            onBack={() => goBack('cart')}
            onPlaceOrder={placeOrder}
            onPayOrder={payOrder}
          />
        );

      case 'tracking':
        return (
          <TrackingScreen
            orders={orders}
            orderId={params.orderId}
            newOrderId={newOrderId}
            demoMode={config.demoMode}
            onNavigate={navigate}
            onBack={() => goBack('account', { tab: 'orders' })}
            onOpenProduct={openProduct}
            onAdvanceOrder={advance}
            onPayOrder={(id) => attempt(() => payOrder(id)).then(() => undefined)}
            onCheckPayment={checkPayment}
          />
        );

      case 'account':
        return (
          <AccountScreen
            user={me!}
            orders={orders}
            products={products}
            wishlist={wishlist}
            activeTab={params.tab ?? 'overview'}
            hasShop={Boolean(me!.shop)}
            onNavigate={navigate}
            onOpenProduct={openProduct}
            onAddToCart={quickAdd}
            onToggleWishlist={toggleWishlist}
            onSaveProfile={async (data) => setMe(await api.updateProfile(data))}
            onAddAddress={(data) => updateMe(() => api.addAddress(data), t('toast.addressAdded'))}
            onRemoveAddress={(id) => updateMe(() => api.removeAddress(id))}
            onSetDefaultAddress={(id) => updateMe(() => api.setDefaultAddress(id))}
            onAddPayment={(data) => updateMe(() => api.addPaymentMethod(data), t('toast.paymentAdded'))}
            onRemovePayment={(id) => updateMe(() => api.removePaymentMethod(id))}
            onSetDefaultPayment={(id) => updateMe(() => api.setDefaultPaymentMethod(id))}
            onLogout={logout}
            onInstall={installAvailable ? requestInstall : undefined}
          />
        );

      case 'seller':
        return (
          <SellerScreen
            shop={me!.shop}
            userName={me!.name}
            products={products}
            orders={sellerOrders}
            defaultPhone={me!.phone}
            activeTab={params.sellerTab ?? 'dashboard'}
            onCreateShop={createShop}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
            onAdvanceOrder={advance}
            onNavigate={navigate}
            onBack={() => goBack('seller')}
            onOpenProduct={openProduct}
          />
        );
    }
  };

  const mainPadding = hasActionBar
    ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]'
    : showClientNav || showSellerNav
    ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]'
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-surface-light">
      <Navbar
        currentScreen={screen}
        onNavigate={navigate}
        cartCount={cartCount(cart)}
        wishlistCount={wishlist.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        userName={me?.name}
        onInstall={pwa.canInstall && !pwa.isStandalone ? requestInstall : undefined}
      />
      <main className={`flex-1 overflow-x-clip ${mainPadding} lg:pb-0`}>
        <div key={screen} className={fadeBetweenScreens ? 'screen-fade' : undefined}>
          <Suspense fallback={<PageSkeleton />}>{renderScreen()}</Suspense>
        </div>
      </main>
      <Footer onNavigate={navigate} />
      {showClientNav && <BottomNav label={t('nav.main')} items={clientNavItems} active={activeTab} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConnectionStatus />
      <IosInstallSheet open={iosHelpOpen} onClose={() => setIosHelpOpen(false)} />
      {showOnboarding && (
        <Onboarding isLoggedIn={Boolean(me)} onGoogleAuth={googleAuth} onFinish={finishOnboarding} />
      )}
    </div>
  );
};

export default App;
