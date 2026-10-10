import { Category } from '../types';

// Les produits, boutiques, commandes et comptes viennent désormais de l'API (server/).
// Ce fichier ne garde que les données purement visuelles du frontend.

export const heroAfricanMarketImg = '/images/hero_african_market_1790991500113.jpg';
export const artisanWoodworkerImg = '/images/artisan_woodworker_1790991510122.jpg';
/** Bannière de l'accueil (texte retiré de l'image : il est affiché en HTML, traduit et cliquable). */
export const homeBannerImg = '/images/banner/banniere-accueil.webp';

/** Illustrations des catégories : public/images/categories/<id>.webp (voir public/images/CREDITS.md). */
export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'mode',
    image: '/images/categories/mode.webp',
    name: 'Mode',
    description: 'Vêtements, accessoires',
    icon: 'fa-shirt',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
  },
  {
    id: 'electronique',
    image: '/images/categories/electronique.webp',
    name: 'Électronique',
    description: 'Téléphones, ordinateurs',
    icon: 'fa-mobile-screen-button',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-600',
  },
  {
    id: 'maison',
    image: '/images/categories/maison.webp',
    name: 'Maison',
    description: 'Meubles, décoration',
    icon: 'fa-house-chimney',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    id: 'alimentation',
    image: '/images/categories/alimentation.webp',
    name: 'Alimentation',
    description: 'Produits locaux',
    icon: 'fa-basket-shopping',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  {
    id: 'beaute',
    image: '/images/categories/beaute.webp',
    name: 'Beauté',
    description: 'Soins, cosmétiques',
    icon: 'fa-spray-can-sparkles',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    id: 'enfants',
    image: '/images/categories/enfants.webp',
    name: 'Enfants & Bébé',
    description: 'Vêtements, jouets, puériculture',
    icon: 'fa-baby-carriage',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
  },
  {
    id: 'agriculture',
    image: '/images/categories/agriculture.webp',
    name: 'Agriculture',
    description: 'Produits agricoles',
    icon: 'fa-seedling',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  {
    id: 'services',
    image: '/images/categories/services.webp',
    name: 'Services',
    description: 'Formation, réparation',
    icon: 'fa-user-gear',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
];
