// Les commandes ci-dessous ne servent qu'à reconnaître et masquer les anciennes commandes de démonstration déjà
// présentes dans certaines bases (voir demo-sync.ts) ; seed.ts ne crée plus de commande ni de paiement fictif.
// Boutiques et produits de démonstration : catalogue-demo.ts.
import type { Order, Product } from '../src/types';
import { DEMO_PRODUCTS, DEMO_SHOPS } from './catalogue-demo.ts';
import { DEMO_PHOTOS } from './catalogue-demo-photos.ts';
import { PLACEHOLDER_IMAGE } from './uploads.ts';

/** Fiche du produit de démonstration telle qu'enregistrée dans la commande (copie figée). */
const snapshot = (id: string): Product => {
  const p = DEMO_PRODUCTS.find((x) => x.id === id)!;
  const s = DEMO_SHOPS.find((x) => x.id === p.shop)!;
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    category: p.category,
    subcategory: p.subcategory,
    brand: p.brand,
    rating: 0,
    reviewsCount: 0,
    location: p.location,
    stock: p.stock,
    condition: p.condition,
    reference: p.reference,
    createdAt: '2026-09-01T00:00:00.000Z',
    image: DEMO_PHOTOS[p.id]?.image ?? PLACEHOLDER_IMAGE,
    description: p.description,
    characteristics: p.characteristics,
    availableColors: p.colors,
    availableSizes: p.sizes,
    isDemo: true,
    vendor: { id: s.id, name: s.name, location: s.location, verified: false, rating: 0, reviewsCount: 0, isDemo: true },
  };
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'BTH-123456',
    date: '02 oct. 2026',
    status: 'expédition',
    items: [
      {
        product: snapshot('sac-cuir-anaya'),
        quantity: 1,
        selectedColor: 'Cognac',
      },
      {
        product: snapshot('robe-wax-afristyle'),
        quantity: 1,
        selectedSize: 'M',
        selectedColor: 'Bleu et or',
      },
      {
        product: snapshot('casque-bluetooth-tech'),
        quantity: 1,
        selectedColor: 'Noir',
      },
    ],
    subtotal: 49000,
    deliveryFee: 1500,
    discount: 0,
    total: 50500,
    paymentMethod: 'Orange Money',
    phoneNumber: '+225 07 07 07 07',
    shippingAddress: 'Abidjan, Cocody Deux-Plateaux Vallons, Rue J75, Villa 12',
    deliveryDriver: {
      name: 'Mamadou K.',
      phone: '+225 05 44 33 22',
      vehicle: 'Moto Express Béthanie #14',
      eta: 'Aujourd’hui entre 15h30 et 17h00',
    },
    steps: [
      { step: 'Commande confirmée', date: '02 oct. 2026', time: '10:15', completed: true },
      { step: 'Préparation', date: '02 oct. 2026', time: '14:30', completed: true },
      { step: 'Expédition', date: '03 oct. 2026', time: '09:20', completed: true, current: true },
      { step: 'En livraison', date: '03 oct. 2026', time: 'En attente', completed: false },
      { step: 'Livrée', date: '', time: 'En attente', completed: false },
    ],
  },
  {
    id: 'BTH-120894',
    date: '24 sept. 2026',
    status: 'livrée',
    items: [
      {
        product: snapshot('miel-pur-savane'),
        quantity: 2,
      },
    ],
    subtotal: 10000,
    deliveryFee: 1500,
    discount: 0,
    total: 11500,
    paymentMethod: 'Wave',
    phoneNumber: '+225 07 88 99 00',
    shippingAddress: 'Abidjan, Cocody Riviera 3',
    steps: [
      { step: 'Commande confirmée', date: '24 sept. 2026', completed: true },
      { step: 'Préparation', date: '24 sept. 2026', completed: true },
      { step: 'Expédition', date: '25 sept. 2026', completed: true },
      { step: 'En livraison', date: '25 sept. 2026', completed: true },
      { step: 'Livrée', date: '25 sept. 2026', completed: true },
    ],
  },
];

export const INITIAL_USER = {
  name: 'SHALOM PIERRE',
  email: 'pierre@gmail.com',
  phone: '+225 07 07 07 07',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  rating: 4.8,
  reviewsCount: 124,
  location: 'Abidjan, Côte d’Ivoire',
  stats: {
    commandes: 12,
    enCours: 3,
    favoris: 8,
    coupons: 5,
  },
  addresses: [
    { id: '1', title: 'Domicile', address: 'Cocody Deux-Plateaux Vallons, Rue J75, Villa 12, Abidjan', default: true },
    { id: '2', title: 'Bureau', address: 'Plateau, Immeuble CCIA, 4ème étage, Abidjan', default: false },
  ],
  paymentMethods: [
    { id: '1', type: 'Orange Money', number: '+225 07 07 07 07', default: true },
    { id: '2', type: 'Wave', number: '+225 07 07 07 07', default: false },
    { id: '3', type: 'Visa', number: '•••• •••• •••• 4289', default: false },
  ]
};
