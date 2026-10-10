// Catalogue de démonstration : boutiques fictives et produits d'exemple, marqués « Démonstration » dans le site.
// Prix indicatifs en FCFA (marché ivoirien, octobre 2026), sans fausse promotion, sans avis ni note inventés.
// Les photos (libres de droits, auteur et licence affichés sur la fiche) sont dans catalogue-demo-photos.ts.
// Mis à jour dans la base à chaque démarrage par syncDemoCatalogue (demo-sync.ts) ; CATALOGUE_DEMO=off les masque.

export interface DemoShop {
  id: string;
  name: string;
  location: string;
  category: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

export interface DemoProduct {
  id: string;
  /** Référence unique affichée sur la fiche (BTH-<catégorie>-<numéro>). */
  reference: string;
  title: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  condition: 'neuf' | 'occasion';
  stock: number;
  shop: string;
  /** Quartier et ville d'où part le produit. */
  location: string;
  /** Produit ou fabrication ivoirienne. */
  local?: boolean;
  description: string;
  characteristics: Record<string, string>;
  colors?: { name: string; hex: string }[];
  sizes?: string[];
  /** Indication de livraison propre au produit (sinon : « Expédié depuis <lieu>. »). */
  delivery?: string;
}

const BULKY = 'Article volumineux : le livreur vous appelle pour fixer le créneau de livraison.';
const SERVICE = 'Prestation : le prestataire vous appelle après la commande pour fixer le rendez-vous.';
const FRESH = 'Produit frais : à conserver au frais et à consommer rapidement après réception.';

export const DEMO_SHOPS: DemoShop[] = [
  { id: 'boutique-anaya', name: 'Boutique Anaya', location: 'Cocody, Abidjan', category: 'mode', description: 'Maroquinerie et accessoires de mode, dont des sacs en cuir façonnés à Abidjan.', icon: 'fa-bag-shopping', iconBg: 'bg-amber-100', iconColor: 'text-amber-800' },
  { id: 'afristyle', name: 'AfriStyle', location: 'Yopougon, Abidjan', category: 'mode', description: 'Atelier de couture : prêt-à-porter en pagne wax et tenues traditionnelles.', icon: 'fa-shirt', iconBg: 'bg-amber-100', iconColor: 'text-amber-800' },
  { id: 'bouake-mode', name: 'Bouaké Mode', location: 'Commerce, Bouaké', category: 'mode', description: 'Chaussures, jeans et vêtements du quotidien pour toute la famille.', icon: 'fa-shoe-prints', iconBg: 'bg-red-100', iconColor: 'text-red-700' },
  { id: 'tech-afrique', name: 'Tech Afrique', location: 'Marcory, Abidjan', category: 'electronique', description: 'Téléphones, tablettes, téléviseurs et accessoires.', icon: 'fa-bolt', iconBg: 'bg-blue-100', iconColor: 'text-blue-700' },
  { id: 'seconde-vie-informatique', name: 'Seconde Vie Informatique', location: 'Adjamé, Abidjan', category: 'electronique', description: 'Ordinateurs d’occasion contrôlés et petits accessoires informatiques.', icon: 'fa-laptop', iconBg: 'bg-sky-100', iconColor: 'text-sky-700' },
  { id: 'maison-deco', name: 'Maison Déco', location: 'Riviera, Cocody, Abidjan', category: 'maison', description: 'Mobilier en bois fabriqué par des menuisiers d’Abidjan.', icon: 'fa-couch', iconBg: 'bg-orange-100', iconColor: 'text-orange-700' },
  { id: 'electro-plateau', name: 'Électro Plateau', location: 'Plateau, Abidjan', category: 'maison', description: 'Électroménager et équipements pour la cuisine et la maison.', icon: 'fa-plug', iconBg: 'bg-slate-100', iconColor: 'text-slate-700' },
  { id: 'mobilier-yakro', name: 'Mobilier Yakro', location: 'Habitat, Yamoussoukro', category: 'maison', description: 'Lits, matelas et articles pour la maison à Yamoussoukro.', icon: 'fa-bed', iconBg: 'bg-orange-100', iconColor: 'text-orange-700' },
  { id: 'biofood-ci', name: 'BioFood CI', location: 'Korhogo', category: 'alimentation', description: 'Produits du terroir du nord ivoirien : miel, fruits, céréales.', icon: 'fa-leaf', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-800' },
  { id: 'epicerie-du-port', name: 'Épicerie du Port', location: 'Bardot, San-Pédro', category: 'alimentation', description: 'Épicerie : produits de base, boissons et produits frais.', icon: 'fa-basket-shopping', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-800' },
  { id: 'karite-beaute', name: 'Karité & Beauté', location: 'Dar-es-Salam, Bouaké', category: 'beaute', description: 'Soins naturels, maquillage et parfums.', icon: 'fa-spa', iconBg: 'bg-rose-100', iconColor: 'text-rose-700' },
  { id: 'bebe-cocon', name: 'Bébé Cocon', location: 'Angré, Cocody, Abidjan', category: 'enfants', description: 'Puériculture, vêtements et jouets pour les enfants de 0 à 10 ans.', icon: 'fa-baby-carriage', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-700' },
  { id: 'agroplus-yakro', name: 'AgroPlus', location: 'Morofé, Yamoussoukro', category: 'agriculture', description: 'Semences, engrais, outils et matériel d’irrigation.', icon: 'fa-seedling', iconBg: 'bg-green-100', iconColor: 'text-green-800' },
  { id: 'services-pro-abidjan', name: 'Abidjan Services Pro', location: 'Deux-Plateaux, Cocody, Abidjan', category: 'services', description: 'Réparations, dépannages, créations graphiques et prestations à domicile.', icon: 'fa-screwdriver-wrench', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-700' },
];

const WAX_COLORS = [
  { name: 'Bleu et or', hex: '#1E3A8A' },
  { name: 'Rouge et jaune', hex: '#B91C1C' },
  { name: 'Vert et orange', hex: '#15803D' },
];
const ADULT_SIZES = ['S', 'M', 'L', 'XL'];

export const DEMO_PRODUCTS: DemoProduct[] = [
  /* ---------- Mode ---------- */
  {
    id: 'sac-cuir-anaya', reference: 'BTH-MOD-001', title: 'Sac à main en cuir', category: 'mode', subcategory: 'Maroquinerie',
    brand: 'Fabrication artisanale', price: 25000, condition: 'neuf', stock: 12, shop: 'boutique-anaya', location: 'Cocody, Abidjan', local: true,
    description: 'Sac à main en cuir de vachette, cousu par un maroquinier d’Abidjan. Une grande poche principale fermée par zip, une poche intérieure et une bandoulière amovible.',
    characteristics: { Matière: 'Cuir de vachette', Dimensions: '32 × 24 × 12 cm', Fermeture: 'Fermeture éclair', Bandoulière: 'Amovible et réglable', Origine: 'Fabriqué en Côte d’Ivoire' },
    colors: [{ name: 'Cognac', hex: '#8B4513' }, { name: 'Noir', hex: '#1C1917' }],
  },
  {
    id: 'robe-wax-afristyle', reference: 'BTH-MOD-002', title: 'Robe longue en pagne wax', category: 'mode', subcategory: 'Vêtements femme',
    brand: 'AfriStyle', price: 12000, condition: 'neuf', stock: 20, shop: 'afristyle', location: 'Yopougon, Abidjan', local: true,
    description: 'Robe longue à manches courtes coupée dans un pagne wax 100 % coton à motifs de cauris, cousue dans notre atelier de Yopougon.',
    characteristics: { Tissu: 'Pagne wax 100 % coton', Longueur: 'Longue', Manches: 'Courtes', Entretien: 'Lavage à 30 °C, à l’envers', Origine: 'Cousue à Abidjan' },
    colors: [{ name: 'Rouge', hex: '#B91C1C' }, { name: 'Bleu et or', hex: '#1E3A8A' }], sizes: ADULT_SIZES,
  },
  {
    id: 'demo-mod-chemise-wax', reference: 'BTH-MOD-003', title: 'Chemise homme en wax, manches courtes', category: 'mode', subcategory: 'Vêtements homme',
    brand: 'AfriStyle', price: 9000, condition: 'neuf', stock: 15, shop: 'afristyle', location: 'Yopougon, Abidjan', local: true,
    description: 'Chemise ajustée à manches courtes en pagne wax, col classique et boutons nacrés. Se porte au bureau comme le week-end.',
    characteristics: { Tissu: 'Pagne wax 100 % coton', Coupe: 'Ajustée', Manches: 'Courtes', Origine: 'Cousue à Abidjan' },
    colors: WAX_COLORS, sizes: ['M', 'L', 'XL', 'XXL'],
  },
  {
    id: 'demo-mod-chino', reference: 'BTH-MOD-004', title: 'Pantalon chino homme', category: 'mode', subcategory: 'Vêtements homme',
    brand: 'Sans marque', price: 7500, condition: 'neuf', stock: 18, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Pantalon chino en coton légèrement extensible, coupe droite. Deux poches à l’avant, deux poches passepoilées à l’arrière.',
    characteristics: { Matière: '97 % coton, 3 % élasthanne', Coupe: 'Droite', Entretien: 'Lavage à 30 °C' },
    colors: [{ name: 'Beige', hex: '#D6C3A1' }, { name: 'Bleu marine', hex: '#1E293B' }, { name: 'Kaki', hex: '#6B6B3A' }], sizes: ['38', '40', '42', '44'],
  },
  {
    id: 'demo-mod-jean-femme', reference: 'BTH-MOD-005', title: 'Jean femme coupe droite', category: 'mode', subcategory: 'Vêtements femme',
    brand: 'Sans marque', price: 8000, condition: 'neuf', stock: 14, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Jean taille haute en denim souple, coupe droite. Cinq poches, fermeture à bouton et zip.',
    characteristics: { Matière: 'Denim coton et élasthanne', Taille: 'Haute', Coupe: 'Droite' },
    colors: [{ name: 'Bleu brut', hex: '#1E3A5F' }, { name: 'Bleu délavé', hex: '#6B8CAE' }], sizes: ['36', '38', '40', '42'],
  },
  {
    id: 'demo-mod-tshirts', reference: 'BTH-MOD-006', title: 'Lot de 3 t-shirts blancs en coton', category: 'mode', subcategory: 'Vêtements homme',
    brand: 'Sans marque', price: 6000, condition: 'neuf', stock: 30, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Trois t-shirts blancs col rond en coton. Coupe classique, agréables par temps chaud.',
    characteristics: { Contenu: '3 t-shirts blancs', Matière: '100 % coton', Col: 'Rond' },
    sizes: ADULT_SIZES,
  },
  {
    id: 'demo-mod-boubou', reference: 'BTH-MOD-007', title: 'Grand boubou homme brodé (3 pièces)', category: 'mode', subcategory: 'Tenues traditionnelles',
    brand: 'AfriStyle', price: 20000, condition: 'neuf', stock: 6, shop: 'afristyle', location: 'Yopougon, Abidjan', local: true,
    description: 'Ensemble boubou, tunique et pantalon en bazin, broderies au col et à la poitrine. Pour les cérémonies, mariages et fêtes.',
    characteristics: { Contenu: 'Boubou, tunique et pantalon', Tissu: 'Bazin', Finitions: 'Broderies faites à la machine', Origine: 'Cousu à Abidjan' },
    colors: [{ name: 'Bleu roi', hex: '#1D4ED8' }, { name: 'Blanc', hex: '#F8FAFC' }, { name: 'Bordeaux', hex: '#7F1D1D' }], sizes: ['L', 'XL', 'XXL'],
  },
  {
    id: 'demo-mod-ballerines', reference: 'BTH-MOD-008', title: 'Ballerines femme', category: 'mode', subcategory: 'Chaussures',
    brand: 'Sans marque', price: 6000, condition: 'neuf', stock: 16, shop: 'boutique-anaya', location: 'Cocody, Abidjan',
    description: 'Ballerines plates à bout rond, semelle souple antidérapante. Confortables pour la journée.',
    characteristics: { Dessus: 'Similicuir', Semelle: 'Caoutchouc antidérapant', Talon: 'Plat' },
    colors: [{ name: 'Rouge', hex: '#B91C1C' }, { name: 'Noir', hex: '#111827' }], sizes: ['37', '38', '39', '40', '41'],
  },
  {
    id: 'demo-mod-sandales-cuir', reference: 'BTH-MOD-009', title: 'Sandales homme en cuir', category: 'mode', subcategory: 'Chaussures',
    brand: 'Fabrication artisanale', price: 7000, condition: 'neuf', stock: 10, shop: 'boutique-anaya', location: 'Cocody, Abidjan', local: true,
    description: 'Sandales ouvertes en cuir, cousues à la main, semelle en caoutchouc. Un modèle solide pour tous les jours.',
    characteristics: { Dessus: 'Cuir', Semelle: 'Caoutchouc', Origine: 'Fabriquées en Côte d’Ivoire' },
    colors: [{ name: 'Marron', hex: '#5C3A21' }], sizes: ['40', '41', '42', '43', '44'],
  },
  {
    id: 'demo-mod-baskets', reference: 'BTH-MOD-010', title: 'Baskets blanches unisexes', category: 'mode', subcategory: 'Chaussures',
    brand: 'Sans marque', price: 15000, condition: 'neuf', stock: 4, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Baskets basses blanches, dessus en similicuir facile à nettoyer, semelle épaisse confortable.',
    characteristics: { Dessus: 'Similicuir', Semelle: 'Caoutchouc', Fermeture: 'Lacets' },
    sizes: ['38', '39', '40', '41', '42', '43', '44'],
  },
  {
    id: 'demo-mod-sac-femme', reference: 'BTH-MOD-011', title: 'Sac à main femme', category: 'mode', subcategory: 'Maroquinerie',
    brand: 'Sans marque', price: 8500, condition: 'neuf', stock: 9, shop: 'boutique-anaya', location: 'Cocody, Abidjan',
    description: 'Sac à main en similicuir avec deux anses et une bandoulière. Format pratique pour le travail ou les sorties.',
    characteristics: { Matière: 'Similicuir', Dimensions: '30 × 22 × 11 cm', Fermeture: 'Fermeture éclair' },
    colors: [{ name: 'Camel', hex: '#B07B4F' }, { name: 'Noir', hex: '#111827' }],
  },
  {
    id: 'demo-mod-montre-casio', reference: 'BTH-MOD-012', title: 'Montre digitale Casio W-96H', category: 'mode', subcategory: 'Montres',
    brand: 'Casio', price: 12000, condition: 'neuf', stock: 7, shop: 'boutique-anaya', location: 'Cocody, Abidjan',
    description: 'Montre digitale légère à bracelet en résine : chronomètre, alarme, éclairage de l’écran et pile longue durée.',
    characteristics: { Affichage: 'Digital', Bracelet: 'Résine', Fonctions: 'Chronomètre, alarme, éclairage', Étanchéité: '50 m', Pile: 'Fournie' },
    colors: [{ name: 'Orange et noir', hex: '#EA580C' }],
  },
  {
    id: 'demo-mod-lunettes', reference: 'BTH-MOD-013', title: 'Lunettes de soleil', category: 'mode', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 4500, condition: 'neuf', stock: 25, shop: 'boutique-anaya', location: 'Cocody, Abidjan',
    description: 'Lunettes de soleil à monture légère, verres teintés filtrant les UV. Livrées avec un étui.',
    characteristics: { Monture: 'Plastique', Verres: 'Teintés, filtre UV400', Accessoire: 'Étui souple' },
  },
  {
    id: 'demo-mod-pagne-wax', reference: 'BTH-MOD-014', title: 'Pagne wax 6 yards', category: 'mode', subcategory: 'Tissus',
    brand: 'Sans marque', price: 9500, condition: 'neuf', stock: 22, shop: 'afristyle', location: 'Yopougon, Abidjan',
    description: 'Pièce de pagne wax de 6 yards (environ 5,5 m), 100 % coton, pour faire coudre robes, chemises ou ensembles.',
    characteristics: { Longueur: '6 yards (≈ 5,5 m)', Largeur: '≈ 1,15 m', Matière: '100 % coton' },
    colors: WAX_COLORS,
  },
  {
    id: 'demo-mod-casquette', reference: 'BTH-MOD-015', title: 'Casquette en coton', category: 'mode', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 3000, condition: 'neuf', stock: 0, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Casquette à visière courbée en toile de coton, réglable à l’arrière.',
    characteristics: { Matière: 'Toile de coton', Réglage: 'Bande à boucle' },
    colors: [{ name: 'Bleu marine', hex: '#1E293B' }, { name: 'Noir', hex: '#111827' }],
  },

  /* ---------- Électronique ---------- */
  {
    id: 'casque-bluetooth-tech', reference: 'BTH-ELE-001', title: 'Casque Bluetooth sans fil', category: 'electronique', subcategory: 'Audio',
    brand: 'Sans marque', price: 12000, condition: 'neuf', stock: 14, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Casque arceau pliable, connexion Bluetooth et câble jack fourni. Micro intégré pour les appels.',
    characteristics: { Connexion: 'Bluetooth 5.0 et jack 3,5 mm', Autonomie: 'Environ 20 h', Recharge: 'USB-C', Micro: 'Intégré' },
    colors: [{ name: 'Noir', hex: '#0F172A' }],
  },
  {
    id: 'smartphone-4g-128go', reference: 'BTH-ELE-002', title: 'Smartphone Android 4G, 128 Go', category: 'electronique', subcategory: 'Téléphonie',
    brand: 'Sans marque', price: 85000, condition: 'neuf', stock: 8, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Smartphone double SIM avec grand écran de 6,6 pouces, 128 Go de stockage et une batterie de 5 000 mAh.',
    characteristics: { Écran: '6,6 pouces', Mémoire: '4 Go + 128 Go', 'Appareil photo': '50 Mpx', Batterie: '5 000 mAh', SIM: 'Double nano-SIM 4G' },
    colors: [{ name: 'Noir', hex: '#18181B' }, { name: 'Bleu', hex: '#0284C7' }],
  },
  {
    id: 'smart-tv-43', reference: 'BTH-ELE-003', title: 'Téléviseur LED 43 pouces Full HD', category: 'electronique', subcategory: 'Télévision',
    brand: 'Sans marque', price: 165000, condition: 'neuf', stock: 3, shop: 'tech-afrique', location: 'Marcory, Abidjan', delivery: BULKY,
    description: 'Téléviseur LED de 43 pouces (108 cm) en Full HD, avec récepteur TNT intégré et prises HDMI et USB.',
    characteristics: { Taille: '43 pouces (108 cm)', Définition: 'Full HD (1920 × 1080)', Connexions: '2 HDMI, 1 USB', Réception: 'TNT intégrée' },
  },
  {
    id: 'tablette-samsung-tab', reference: 'BTH-ELE-004', title: 'Tablette Samsung Galaxy Tab A9 (64 Go)', category: 'electronique', subcategory: 'Tablettes',
    brand: 'Samsung', price: 115000, condition: 'neuf', stock: 5, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Tablette compacte de 8,7 pouces pour les études, la lecture et les vidéos en famille.',
    characteristics: { Écran: '8,7 pouces', Mémoire: '4 Go + 64 Go (carte microSD possible)', Batterie: '5 100 mAh', Connexion: 'Wi-Fi' },
    colors: [{ name: 'Graphite', hex: '#374151' }],
  },
  {
    id: 'montre-connectee-fit', reference: 'BTH-ELE-005', title: 'Montre connectée sport', category: 'electronique', subcategory: 'Montres connectées',
    brand: 'Sans marque', price: 15000, condition: 'neuf', stock: 11, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Montre connectée qui compte les pas, mesure le rythme cardiaque et affiche les notifications du téléphone.',
    characteristics: { Écran: '1,8 pouce tactile', Autonomie: 'Environ 5 jours', Étanchéité: 'Résiste à la pluie et à la transpiration', Compatibilité: 'Android et iPhone' },
    colors: [{ name: 'Noir', hex: '#111827' }, { name: 'Rose', hex: '#F9A8D4' }],
  },
  {
    id: 'ecouteurs-sans-fil-tws', reference: 'BTH-ELE-006', title: 'Écouteurs sans fil avec boîtier', category: 'electronique', subcategory: 'Audio',
    brand: 'Sans marque', price: 7500, condition: 'neuf', stock: 26, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Écouteurs intra-auriculaires Bluetooth avec boîtier de recharge et commandes tactiles.',
    characteristics: { Connexion: 'Bluetooth 5.3', Autonomie: '4 h (16 h avec le boîtier)', Recharge: 'USB-C' },
    colors: [{ name: 'Blanc', hex: '#F8FAFC' }, { name: 'Noir', hex: '#111827' }],
  },
  {
    id: 'iphone-13-128', reference: 'BTH-ELE-007', title: 'Apple iPhone 13, 128 Go (occasion)', category: 'electronique', subcategory: 'Téléphonie',
    brand: 'Apple', price: 295000, condition: 'occasion', stock: 2, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'iPhone 13 d’occasion en bon état, débloqué, testé avant la vente. Batterie contrôlée, petites traces d’usage possibles sur la coque.',
    characteristics: { Capacité: '128 Go', Écran: '6,1 pouces', État: 'Bon état, testé', Accessoires: 'Câble de charge' },
  },
  {
    id: 'samsung-s23-ultra', reference: 'BTH-ELE-008', title: 'Samsung Galaxy S23, 256 Go', category: 'electronique', subcategory: 'Téléphonie',
    brand: 'Samsung', price: 495000, condition: 'neuf', stock: 2, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Smartphone haut de gamme compact : écran 6,1 pouces 120 Hz, triple appareil photo, 256 Go de stockage.',
    characteristics: { Capacité: '256 Go', Mémoire: '8 Go', Écran: '6,1 pouces, 120 Hz', 'Appareil photo': '50 + 12 + 10 Mpx' },
    colors: [{ name: 'Vert', hex: '#A3B19B' }, { name: 'Lavande', hex: '#D8C8E8' }, { name: 'Crème', hex: '#F1EADB' }],
  },
  {
    id: 'hp-laptop-pavilion', reference: 'BTH-ELE-009', title: 'Ordinateur portable HP Pavilion 15 (Core i5)', category: 'electronique', subcategory: 'Ordinateurs',
    brand: 'HP', price: 385000, condition: 'neuf', stock: 3, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Ordinateur portable 15,6 pouces pour les études et le bureau : processeur Intel Core i5, 16 Go de mémoire et disque SSD de 512 Go.',
    characteristics: { Processeur: 'Intel Core i5', Mémoire: '16 Go', Stockage: 'SSD 512 Go', Écran: '15,6 pouces Full HD' },
  },
  {
    id: 'demo-ele-galaxy-a15', reference: 'BTH-ELE-010', title: 'Samsung Galaxy A15, 128 Go', category: 'electronique', subcategory: 'Téléphonie',
    brand: 'Samsung', price: 95000, condition: 'neuf', stock: 9, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Smartphone double SIM avec écran 6,5 pouces, 128 Go de stockage et batterie de 5 000 mAh.',
    characteristics: { Écran: '6,5 pouces', Mémoire: '4 Go + 128 Go', 'Appareil photo': '50 Mpx', Batterie: '5 000 mAh' },
    colors: [{ name: 'Bleu nuit', hex: '#1E293B' }, { name: 'Jaune', hex: '#FDE68A' }],
  },
  {
    id: 'demo-ele-smartphone-entree', reference: 'BTH-ELE-011', title: 'Smartphone Tecno Camon 12 Air, 64 Go', category: 'electronique', subcategory: 'Téléphonie',
    brand: 'Tecno', price: 65000, condition: 'neuf', stock: 12, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Smartphone d’entrée de gamme pour les appels, WhatsApp et les réseaux sociaux : grand écran, triple appareil photo, double SIM.',
    characteristics: { Écran: '6,55 pouces', Mémoire: '4 Go + 64 Go', 'Appareil photo': 'Triple, 16 Mpx', Batterie: '4 000 mAh', SIM: 'Double SIM 4G' },
    colors: [{ name: 'Bleu', hex: '#2563EB' }],
  },
  {
    id: 'demo-ele-hp-elitebook', reference: 'BTH-ELE-012', title: 'Ordinateur portable HP EliteBook (occasion)', category: 'electronique', subcategory: 'Ordinateurs',
    brand: 'HP', price: 150000, condition: 'occasion', stock: 4, shop: 'seconde-vie-informatique', location: 'Adjamé, Abidjan',
    description: 'Ordinateur portable professionnel d’occasion, nettoyé et testé, Windows installé. Idéal pour la bureautique et internet.',
    characteristics: { Processeur: 'Intel Core i5', Mémoire: '8 Go', Stockage: 'SSD 256 Go', Système: 'Windows', État: 'Bon état, testé' },
  },
  {
    id: 'demo-ele-lenovo-ideapad', reference: 'BTH-ELE-013', title: 'Lenovo IdeaPad Slim 3 (Core i3, 8 Go)', category: 'electronique', subcategory: 'Ordinateurs',
    brand: 'Lenovo', price: 265000, condition: 'neuf', stock: 3, shop: 'seconde-vie-informatique', location: 'Adjamé, Abidjan',
    description: 'Ordinateur portable léger de 15,6 pouces pour les études et le télétravail.',
    characteristics: { Processeur: 'Intel Core i3 (12e génération)', Mémoire: '8 Go', Stockage: 'SSD 256 Go', Écran: '15,6 pouces Full HD' },
  },
  {
    id: 'demo-ele-chargeur', reference: 'BTH-ELE-014', title: 'Chargeur secteur USB avec câble', category: 'electronique', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 4000, condition: 'neuf', stock: 40, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Bloc secteur USB et câble de 1 m pour recharger un téléphone ou de petits appareils.',
    characteristics: { Sortie: 'USB-A', Câble: '1 m', Prise: 'Européenne (type C)' },
  },
  {
    id: 'demo-ele-powerbank', reference: 'BTH-ELE-015', title: 'Batterie externe 20 000 mAh', category: 'electronique', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 9000, condition: 'neuf', stock: 17, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Batterie de secours pour recharger un téléphone 3 à 4 fois. Deux sorties USB et une entrée USB-C.',
    characteristics: { Capacité: '20 000 mAh', Sorties: '2 × USB-A', Entrée: 'USB-C' },
  },
  {
    id: 'demo-ele-souris', reference: 'BTH-ELE-016', title: 'Souris sans fil', category: 'electronique', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 3500, condition: 'neuf', stock: 35, shop: 'seconde-vie-informatique', location: 'Adjamé, Abidjan',
    description: 'Souris sans fil avec récepteur USB, silencieuse, fonctionne avec une pile AA fournie.',
    characteristics: { Connexion: 'Récepteur USB 2,4 GHz', Alimentation: '1 pile AA (fournie)' },
  },
  {
    id: 'demo-ele-cle-usb', reference: 'BTH-ELE-017', title: 'Clé USB 64 Go', category: 'electronique', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 4500, condition: 'neuf', stock: 50, shop: 'seconde-vie-informatique', location: 'Adjamé, Abidjan',
    description: 'Clé USB 3.0 de 64 Go pour vos documents, photos et sauvegardes.',
    characteristics: { Capacité: '64 Go', Norme: 'USB 3.0' },
  },
  {
    id: 'demo-ele-enceinte', reference: 'BTH-ELE-018', title: 'Enceinte Bluetooth portable', category: 'electronique', subcategory: 'Audio',
    brand: 'Sans marque', price: 12500, condition: 'neuf', stock: 5, shop: 'tech-afrique', location: 'Marcory, Abidjan',
    description: 'Enceinte compacte avec dragonne tressée, son puissant pour la maison ou les sorties. Lecture par Bluetooth.',
    characteristics: { Connexion: 'Bluetooth', Autonomie: 'Environ 8 h', Recharge: 'USB-C' },
    colors: [{ name: 'Bleu', hex: '#2563EB' }],
  },

  /* ---------- Maison ---------- */
  {
    id: 'canape-velours-maison', reference: 'BTH-MAI-001', title: 'Canapé 3 places en tissu', category: 'maison', subcategory: 'Salon',
    brand: 'Maison Déco', price: 245000, condition: 'neuf', stock: 2, shop: 'maison-deco', location: 'Riviera, Cocody, Abidjan', local: true, delivery: BULKY,
    description: 'Canapé trois places recouvert d’un tissu doux, structure en bois massif fabriquée par nos menuisiers d’Abidjan.',
    characteristics: { Places: '3', Revêtement: 'Tissu', Structure: 'Bois massif', Dimensions: '210 × 85 × 80 cm', Origine: 'Fabriqué à Abidjan' },
    colors: [{ name: 'Beige', hex: '#D6CFC2' }, { name: 'Gris', hex: '#6B7280' }],
  },
  {
    id: 'demo-mai-fauteuil', reference: 'BTH-MAI-002', title: 'Fauteuil en bois avec coussins', category: 'maison', subcategory: 'Salon',
    brand: 'Maison Déco', price: 65000, condition: 'neuf', stock: 4, shop: 'maison-deco', location: 'Riviera, Cocody, Abidjan', local: true, delivery: BULKY,
    description: 'Fauteuil en bois massif avec assise et dossier rembourrés. Housses de coussin amovibles.',
    characteristics: { Structure: 'Bois massif', Coussins: 'Mousse, housses amovibles', Origine: 'Fabriqué à Abidjan' },
  },
  {
    id: 'demo-mai-table-basse', reference: 'BTH-MAI-003', title: 'Table basse en bois massif', category: 'maison', subcategory: 'Salon',
    brand: 'Maison Déco', price: 45000, condition: 'neuf', stock: 5, shop: 'maison-deco', location: 'Riviera, Cocody, Abidjan', local: true, delivery: BULKY,
    description: 'Table basse rectangulaire en bois massif verni, avec un plateau inférieur de rangement.',
    characteristics: { Matière: 'Bois massif verni', Dimensions: '100 × 55 × 45 cm', Origine: 'Fabriquée à Abidjan' },
  },
  {
    id: 'demo-mai-chaises', reference: 'BTH-MAI-004', title: 'Lot de 4 chaises en plastique', category: 'maison', subcategory: 'Mobilier',
    brand: 'Sans marque', price: 24000, condition: 'neuf', stock: 10, shop: 'electro-plateau', location: 'Plateau, Abidjan', delivery: BULKY,
    description: 'Quatre chaises empilables en plastique résistant, pour la maison, la terrasse ou les cérémonies.',
    characteristics: { Contenu: '4 chaises', Matière: 'Polypropylène', 'Charge maximale': '120 kg par chaise' },
    colors: [{ name: 'Bleu', hex: '#1D4ED8' }, { name: 'Blanc', hex: '#F8FAFC' }],
  },
  {
    id: 'demo-mai-table-manger', reference: 'BTH-MAI-005', title: 'Table à manger en bois et 4 chaises', category: 'maison', subcategory: 'Salle à manger',
    brand: 'Mobilier Yakro', price: 160000, condition: 'neuf', stock: 2, shop: 'mobilier-yakro', location: 'Habitat, Yamoussoukro', local: true, delivery: BULKY,
    description: 'Ensemble de salle à manger en bois massif : une table rectangulaire et quatre chaises assorties.',
    characteristics: { Contenu: 'Table et 4 chaises', Matière: 'Bois massif', 'Dimensions de la table': '150 × 90 × 76 cm', Origine: 'Fabriquée à Yamoussoukro' },
  },
  {
    id: 'demo-mai-lit', reference: 'BTH-MAI-006', title: 'Lit 2 places en bois (160 × 200)', category: 'maison', subcategory: 'Chambre',
    brand: 'Mobilier Yakro', price: 140000, condition: 'neuf', stock: 3, shop: 'mobilier-yakro', location: 'Habitat, Yamoussoukro', local: true, delivery: BULKY,
    description: 'Cadre de lit en bois massif avec tête de lit et sommier à lattes. Matelas non fourni.',
    characteristics: { Couchage: '160 × 200 cm', Matière: 'Bois massif', Sommier: 'À lattes, inclus', Origine: 'Fabriqué à Yamoussoukro' },
  },
  {
    id: 'demo-mai-matelas', reference: 'BTH-MAI-007', title: 'Matelas en mousse 2 places (160 × 200)', category: 'maison', subcategory: 'Chambre',
    brand: 'Sans marque', price: 85000, condition: 'neuf', stock: 6, shop: 'mobilier-yakro', location: 'Habitat, Yamoussoukro', delivery: BULKY,
    description: 'Matelas en mousse haute densité, épaisseur 20 cm, housse en tissu matelassé.',
    characteristics: { Dimensions: '160 × 200 × 20 cm', Garnissage: 'Mousse haute densité', Housse: 'Tissu matelassé' },
  },
  {
    id: 'demo-mai-ventilateur', reference: 'BTH-MAI-008', title: 'Ventilateur sur pied 16 pouces', category: 'maison', subcategory: 'Électroménager',
    brand: 'Sans marque', price: 18000, condition: 'neuf', stock: 15, shop: 'electro-plateau', location: 'Plateau, Abidjan',
    description: 'Ventilateur sur pied réglable en hauteur, trois vitesses et oscillation automatique.',
    characteristics: { Diamètre: '16 pouces (40 cm)', Vitesses: '3', Puissance: '45 W', Hauteur: 'Réglable' },
  },
  {
    id: 'demo-mai-mixeur', reference: 'BTH-MAI-009', title: 'Mixeur blender 1,5 L', category: 'maison', subcategory: 'Électroménager',
    brand: 'Sans marque', price: 16000, condition: 'neuf', stock: 8, shop: 'electro-plateau', location: 'Plateau, Abidjan',
    description: 'Blender avec bol de 1,5 L et moulin à épices, pour les jus, sauces et piments.',
    characteristics: { Capacité: '1,5 L', Puissance: '400 W', Accessoire: 'Moulin à épices' },
  },
  {
    id: 'demo-mai-refrigerateur', reference: 'BTH-MAI-010', title: 'Réfrigérateur combiné 2 portes', category: 'maison', subcategory: 'Électroménager',
    brand: 'Sans marque', price: 215000, condition: 'neuf', stock: 0, shop: 'electro-plateau', location: 'Plateau, Abidjan', delivery: BULKY,
    description: 'Réfrigérateur combiné avec compartiment congélateur, environ 300 litres au total, finition argentée.',
    characteristics: { Volume: 'Environ 300 L', Portes: '2', Finition: 'Argentée' },
  },
  {
    id: 'demo-mai-marmites', reference: 'BTH-MAI-011', title: 'Grande marmite en aluminium (20 L)', category: 'maison', subcategory: 'Cuisine',
    brand: 'Sans marque', price: 12000, condition: 'neuf', stock: 7, shop: 'electro-plateau', location: 'Plateau, Abidjan',
    description: 'Grande marmite familiale en aluminium à deux anses, pour le riz, les sauces et les grandes occasions.',
    characteristics: { Contenance: 'Environ 20 L', Matière: 'Aluminium', Poignées: '2 anses' },
  },
  {
    id: 'demo-mai-rechaud', reference: 'BTH-MAI-012', title: 'Réchaud à gaz 2 feux', category: 'maison', subcategory: 'Cuisine',
    brand: 'Sans marque', price: 15000, condition: 'neuf', stock: 9, shop: 'electro-plateau', location: 'Plateau, Abidjan',
    description: 'Réchaud de table à deux brûleurs avec plateau en verre trempé. Bouteille de gaz non fournie.',
    characteristics: { Brûleurs: '2', Plateau: 'Verre trempé', Allumage: 'Manuel' },
  },
  {
    id: 'demo-mai-moustiquaire', reference: 'BTH-MAI-013', title: 'Moustiquaire imprégnée 2 places', category: 'maison', subcategory: 'Chambre',
    brand: 'Sans marque', price: 4000, condition: 'neuf', stock: 40, shop: 'mobilier-yakro', location: 'Habitat, Yamoussoukro',
    description: 'Moustiquaire rectangulaire imprégnée d’insecticide longue durée, pour un lit de deux places.',
    characteristics: { Format: 'Rectangulaire, lit 2 places', Traitement: 'Imprégnée longue durée' },
  },
  {
    id: 'demo-mai-fer', reference: 'BTH-MAI-014', title: 'Fer à repasser à vapeur', category: 'maison', subcategory: 'Électroménager',
    brand: 'Sans marque', price: 7500, condition: 'neuf', stock: 12, shop: 'electro-plateau', location: 'Plateau, Abidjan',
    description: 'Fer à repasser à vapeur avec semelle antiadhésive et réservoir d’eau transparent.',
    characteristics: { Puissance: '1 200 W', Semelle: 'Antiadhésive', Vapeur: 'Réglable' },
  },

  /* ---------- Alimentation ---------- */
  {
    id: 'miel-pur-savane', reference: 'BTH-ALI-001', title: 'Miel de savane (pot de 1 kg)', category: 'alimentation', subcategory: 'Produits du terroir',
    brand: 'BioFood CI', price: 5000, condition: 'neuf', stock: 30, shop: 'biofood-ci', location: 'Korhogo', local: true,
    description: 'Miel récolté dans la région de Korhogo, filtré et mis en pot sans chauffage.',
    characteristics: { Poids: '1 kg', Origine: 'Région du Poro, Côte d’Ivoire', Conservation: 'À l’abri de la chaleur' },
  },
  {
    id: 'demo-ali-riz', reference: 'BTH-ALI-002', title: 'Riz parfumé, sac de 25 kg', category: 'alimentation', subcategory: 'Épicerie',
    brand: 'Sans marque', price: 15000, condition: 'neuf', stock: 20, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro', delivery: BULKY,
    description: 'Riz long grain parfumé en sac de 25 kg, pour les familles et les restaurants.',
    characteristics: { Poids: '25 kg', Type: 'Long grain parfumé' },
  },
  {
    id: 'demo-ali-huile', reference: 'BTH-ALI-003', title: 'Huile végétale raffinée (1 L)', category: 'alimentation', subcategory: 'Épicerie',
    brand: 'Sans marque', price: 1500, condition: 'neuf', stock: 24, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro',
    description: 'Bouteille d’un litre d’huile végétale raffinée pour la cuisine de tous les jours.',
    characteristics: { Contenance: '1 L', Type: 'Huile végétale raffinée' },
  },
  {
    id: 'demo-ali-lait', reference: 'BTH-ALI-004', title: 'Lait en poudre (400 g)', category: 'alimentation', subcategory: 'Épicerie',
    brand: 'Sans marque', price: 3500, condition: 'neuf', stock: 36, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro',
    description: 'Lait entier en poudre en sachet de 400 g, pour le petit-déjeuner et les desserts.',
    characteristics: { Poids: '400 g', Type: 'Lait entier en poudre' },
  },
  {
    id: 'demo-ali-sucre', reference: 'BTH-ALI-005', title: 'Sucre en morceaux (1 kg)', category: 'alimentation', subcategory: 'Épicerie',
    brand: 'Sans marque', price: 1000, condition: 'neuf', stock: 60, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro', local: true,
    description: 'Boîte d’un kilo de sucre blanc en morceaux, produit en Côte d’Ivoire.',
    characteristics: { Poids: '1 kg', Origine: 'Côte d’Ivoire' },
  },
  {
    id: 'demo-ali-pates', reference: 'BTH-ALI-006', title: 'Spaghetti, lot de 5 paquets de 500 g', category: 'alimentation', subcategory: 'Épicerie',
    brand: 'Sans marque', price: 2500, condition: 'neuf', stock: 45, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro',
    description: 'Cinq paquets de spaghetti de blé dur de 500 g.',
    characteristics: { Contenu: '5 × 500 g', Type: 'Spaghetti de blé dur' },
  },
  {
    id: 'demo-ali-bissap', reference: 'BTH-ALI-007', title: 'Jus de bissap artisanal, pack de 6 × 1 L', category: 'alimentation', subcategory: 'Boissons',
    brand: 'Fabrication artisanale', price: 6000, condition: 'neuf', stock: 10, shop: 'biofood-ci', location: 'Korhogo', local: true, delivery: FRESH,
    description: 'Jus de fleurs d’hibiscus (bissap) préparé artisanalement, légèrement sucré et parfumé à la menthe.',
    characteristics: { Contenu: '6 bouteilles de 1 L', Ingrédients: 'Fleurs d’hibiscus, sucre, menthe', Conservation: 'Au réfrigérateur, 5 jours' },
  },
  {
    id: 'demo-ali-jus-orange', reference: 'BTH-ALI-008', title: 'Jus d’orange (1 L)', category: 'alimentation', subcategory: 'Boissons',
    brand: 'Sans marque', price: 1500, condition: 'neuf', stock: 28, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro',
    description: 'Jus d’orange en brique d’un litre.',
    characteristics: { Contenance: '1 L', Conservation: 'Au frais après ouverture' },
  },
  {
    id: 'demo-ali-plantain', reference: 'BTH-ALI-009', title: 'Banane plantain (régime d’environ 8 kg)', category: 'alimentation', subcategory: 'Fruits et légumes',
    brand: 'Production locale', price: 3500, condition: 'neuf', stock: 12, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro', local: true, delivery: FRESH,
    description: 'Régime de banane plantain récolté dans la région de San-Pédro, pour l’aloco, le foutou ou le foufou.',
    characteristics: { Poids: 'Environ 8 kg', Origine: 'Région de San-Pédro' },
  },
  {
    id: 'demo-ali-igname', reference: 'BTH-ALI-010', title: 'Igname (5 kg)', category: 'alimentation', subcategory: 'Fruits et légumes',
    brand: 'Production locale', price: 4000, condition: 'neuf', stock: 15, shop: 'biofood-ci', location: 'Korhogo', local: true,
    description: 'Tubercules d’igname du nord ivoirien, pour le foutou ou les frites d’igname.',
    characteristics: { Poids: '5 kg', Origine: 'Nord de la Côte d’Ivoire' },
  },
  {
    id: 'demo-ali-manioc', reference: 'BTH-ALI-011', title: 'Manioc frais (5 kg)', category: 'alimentation', subcategory: 'Fruits et légumes',
    brand: 'Production locale', price: 2000, condition: 'neuf', stock: 0, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro', local: true, delivery: FRESH,
    description: 'Racines de manioc fraîches, à cuire ou à transformer.',
    characteristics: { Poids: '5 kg', Origine: 'Côte d’Ivoire' },
  },
  {
    id: 'demo-ali-attieke', reference: 'BTH-ALI-012', title: 'Attiéké frais (2 kg)', category: 'alimentation', subcategory: 'Produits du terroir',
    brand: 'Production locale', price: 1500, condition: 'neuf', stock: 18, shop: 'epicerie-du-port', location: 'Bardot, San-Pédro', local: true, delivery: FRESH,
    description: 'Attiéké frais préparé par des transformatrices de manioc, en sachets d’un kilo.',
    characteristics: { Poids: '2 × 1 kg', Ingrédient: 'Manioc', Conservation: 'Au frais, 3 jours' },
  },
  {
    id: 'demo-ali-mangues', reference: 'BTH-ALI-013', title: 'Mangues de Korhogo (cageot de 5 kg)', category: 'alimentation', subcategory: 'Fruits et légumes',
    brand: 'Production locale', price: 3000, condition: 'neuf', stock: 5, shop: 'biofood-ci', location: 'Korhogo', local: true, delivery: FRESH,
    description: 'Mangues récoltées dans les vergers de Korhogo, en saison.',
    characteristics: { Poids: '5 kg', Origine: 'Korhogo', Disponibilité: 'Selon la saison' },
  },
  {
    id: 'demo-ali-tomates', reference: 'BTH-ALI-014', title: 'Tomates fraîches (2 kg)', category: 'alimentation', subcategory: 'Fruits et légumes',
    brand: 'Production locale', price: 2000, condition: 'neuf', stock: 20, shop: 'biofood-ci', location: 'Korhogo', local: true, delivery: FRESH,
    description: 'Tomates fraîches de maraîchers de la région, pour les sauces et les salades.',
    characteristics: { Poids: '2 kg', Origine: 'Côte d’Ivoire' },
  },
  {
    id: 'demo-ali-chocolat', reference: 'BTH-ALI-015', title: 'Tablette de chocolat noir 70 % (100 g)', category: 'alimentation', subcategory: 'Épicerie fine',
    brand: 'Fabrication locale', price: 2000, condition: 'neuf', stock: 25, shop: 'biofood-ci', location: 'Korhogo', local: true,
    description: 'Chocolat noir à 70 % de cacao, fabriqué à partir de fèves de cacao ivoiriennes.',
    characteristics: { Poids: '100 g', Cacao: '70 %', Origine: 'Cacao de Côte d’Ivoire' },
  },

  /* ---------- Beauté ---------- */
  {
    id: 'demo-bea-parfum-femme', reference: 'BTH-BEA-001', title: 'Eau de parfum femme (100 ml)', category: 'beaute', subcategory: 'Parfums',
    brand: 'Sans marque', price: 18000, condition: 'neuf', stock: 8, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Eau de parfum aux notes florales et fruitées, flacon vaporisateur de 100 ml.',
    characteristics: { Contenance: '100 ml', Famille: 'Florale fruitée', Type: 'Eau de parfum' },
  },
  {
    id: 'demo-bea-parfum-homme', reference: 'BTH-BEA-002', title: 'Eau de toilette homme (100 ml)', category: 'beaute', subcategory: 'Parfums',
    brand: 'Sans marque', price: 20000, condition: 'neuf', stock: 6, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Eau de toilette aux notes boisées et épicées, flacon vaporisateur de 100 ml.',
    characteristics: { Contenance: '100 ml', Famille: 'Boisée épicée', Type: 'Eau de toilette' },
  },
  {
    id: 'demo-bea-karite', reference: 'BTH-BEA-003', title: 'Beurre de karité brut (500 g)', category: 'beaute', subcategory: 'Soins du corps',
    brand: 'Production locale', price: 3000, condition: 'neuf', stock: 30, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké', local: true,
    description: 'Beurre de karité non raffiné, préparé par une coopérative de femmes du nord ivoirien. Pour la peau et les cheveux.',
    characteristics: { Poids: '500 g', Type: 'Brut, non raffiné', Origine: 'Nord de la Côte d’Ivoire' },
  },
  {
    id: 'demo-bea-savon-noir', reference: 'BTH-BEA-004', title: 'Savon noir traditionnel (500 g)', category: 'beaute', subcategory: 'Soins du corps',
    brand: 'Fabrication artisanale', price: 1500, condition: 'neuf', stock: 40, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké', local: true,
    description: 'Savon noir fabriqué artisanalement à base de cendres végétales et d’huiles, pour le corps et le visage.',
    characteristics: { Poids: '500 g', Fabrication: 'Artisanale', Origine: 'Côte d’Ivoire' },
  },
  {
    id: 'demo-bea-lait-corps', reference: 'BTH-BEA-005', title: 'Lait hydratant pour le corps (400 ml)', category: 'beaute', subcategory: 'Soins du corps',
    brand: 'Sans marque', price: 4500, condition: 'neuf', stock: 22, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Lait corporel hydratant au beurre de karité, sans agent éclaircissant.',
    characteristics: { Contenance: '400 ml', 'Ingrédient principal': 'Beurre de karité', 'Agent éclaircissant': 'Aucun' },
  },
  {
    id: 'demo-bea-huile-coco', reference: 'BTH-BEA-006', title: 'Huile de coco vierge (250 ml)', category: 'beaute', subcategory: 'Soins des cheveux',
    brand: 'Production locale', price: 2500, condition: 'neuf', stock: 26, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké', local: true,
    description: 'Huile de coco pressée à froid, pour les cheveux et la peau.',
    characteristics: { Contenance: '250 ml', Extraction: 'Pression à froid', Origine: 'Côte d’Ivoire' },
  },
  {
    id: 'demo-bea-creme-cheveux', reference: 'BTH-BEA-007', title: 'Crème capillaire au karité (pot de 500 ml)', category: 'beaute', subcategory: 'Soins des cheveux',
    brand: 'Sans marque', price: 3500, condition: 'neuf', stock: 18, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Crème capillaire à base de beurre de karité, pour nourrir et assouplir les cheveux crépus et bouclés.',
    characteristics: { Contenance: '500 ml', 'Ingrédient principal': 'Beurre de karité', 'Type de cheveux': 'Crépus et bouclés' },
  },
  {
    id: 'demo-bea-meches', reference: 'BTH-BEA-008', title: 'Mèches ondulées synthétiques (lot de 3)', category: 'beaute', subcategory: 'Coiffure',
    brand: 'Sans marque', price: 3000, condition: 'neuf', stock: 50, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Mèches synthétiques ondulées pour tissages et coiffures volumineuses, lot de trois paquets de même couleur.',
    characteristics: { Contenu: '3 paquets', Matière: 'Fibre synthétique', Texture: 'Ondulée', Longueur: 'Environ 45 cm' },
    colors: [{ name: 'Brun doré', hex: '#9A6A2F' }, { name: 'Noir', hex: '#111111' }, { name: 'Brun', hex: '#4A2C17' }],
  },
  {
    id: 'demo-bea-rouge-levres', reference: 'BTH-BEA-009', title: 'Rouge à lèvres mat', category: 'beaute', subcategory: 'Maquillage',
    brand: 'Sans marque', price: 3000, condition: 'neuf', stock: 3, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Rouge à lèvres au fini mat et longue tenue.',
    characteristics: { Fini: 'Mat', Tenue: 'Longue tenue' },
    colors: [{ name: 'Rouge', hex: '#B91C1C' }, { name: 'Prune', hex: '#6B213F' }, { name: 'Nude', hex: '#B07A5B' }],
  },
  {
    id: 'demo-bea-fond-teint', reference: 'BTH-BEA-010', title: 'Fond de teint liquide (30 ml)', category: 'beaute', subcategory: 'Maquillage',
    brand: 'Sans marque', price: 8000, condition: 'neuf', stock: 10, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Fond de teint liquide couvrant, teintes pensées pour les peaux noires et métissées.',
    characteristics: { Contenance: '30 ml', Couvrance: 'Moyenne à forte' },
    colors: [{ name: 'Caramel', hex: '#9C6B43' }, { name: 'Cacao', hex: '#6B4226' }, { name: 'Ébène', hex: '#3D2817' }],
  },
  {
    id: 'demo-bea-vernis', reference: 'BTH-BEA-011', title: 'Vernis à ongles (lot de 3)', category: 'beaute', subcategory: 'Maquillage',
    brand: 'Sans marque', price: 2500, condition: 'neuf', stock: 24, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Trois flacons de vernis à ongles de couleurs assorties, séchage rapide.',
    characteristics: { Contenu: '3 flacons', Séchage: 'Rapide' },
  },
  {
    id: 'demo-bea-pinceaux', reference: 'BTH-BEA-012', title: 'Kit de 12 pinceaux de maquillage', category: 'beaute', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 6000, condition: 'neuf', stock: 12, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Douze pinceaux à poils synthétiques pour le teint, les yeux et les lèvres, avec trousse.',
    characteristics: { Contenu: '12 pinceaux et une trousse', Poils: 'Synthétiques' },
  },
  {
    id: 'demo-bea-tondeuse', reference: 'BTH-BEA-013', title: 'Tondeuse à cheveux rechargeable', category: 'beaute', subcategory: 'Accessoires',
    brand: 'Sans marque', price: 12000, condition: 'neuf', stock: 7, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké',
    description: 'Tondeuse sans fil avec quatre sabots, pour la coupe et l’entretien de la barbe.',
    characteristics: { Autonomie: 'Environ 90 min', Sabots: '4 (3 à 12 mm)', Recharge: 'USB' },
  },

  /* ---------- Enfants & Bébé ---------- */
  {
    id: 'demo-enf-bodies', reference: 'BTH-ENF-001', title: 'Bodies bébé en coton (lot de 5)', category: 'enfants', subcategory: 'Vêtements bébé',
    brand: 'Sans marque', price: 7500, condition: 'neuf', stock: 16, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Cinq bodies à manches courtes en coton doux, pressions à l’entrejambe.',
    characteristics: { Contenu: '5 bodies', Matière: '100 % coton' },
    sizes: ['0-3 mois', '3-6 mois', '6-12 mois'],
  },
  {
    id: 'demo-enf-ensemble', reference: 'BTH-ENF-002', title: 'Lot de 6 vêtements bébé (hauts et pantalons)', category: 'enfants', subcategory: 'Vêtements bébé',
    brand: 'Sans marque', price: 9000, condition: 'neuf', stock: 14, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Trois hauts et trois pantalons en coton doux pour bébé, couleurs et motifs assortis.',
    characteristics: { Contenu: '3 hauts et 3 pantalons', Matière: 'Coton' },
    sizes: ['0-3 mois', '3-6 mois'],
  },
  {
    id: 'demo-enf-robe-fille', reference: 'BTH-ENF-003', title: 'Robe fille en coton imprimé', category: 'enfants', subcategory: 'Vêtements enfant',
    brand: 'Fabrication artisanale', price: 7000, condition: 'neuf', stock: 9, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan', local: true,
    description: 'Robe tunique à manches courtes en coton imprimé, cousue à Abidjan. Se porte seule ou sur un pantalon.',
    characteristics: { Tissu: 'Coton imprimé', Manches: 'Courtes', Origine: 'Cousue à Abidjan' },
    sizes: ['2 ans', '3 ans', '4 ans'],
  },
  {
    id: 'demo-enf-couches', reference: 'BTH-ENF-004', title: 'Couches bébé taille 3 (paquet de 60)', category: 'enfants', subcategory: 'Puériculture',
    brand: 'Sans marque', price: 9500, condition: 'neuf', stock: 30, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Couches jetables taille 3 pour bébés de 6 à 10 kg, avec indicateur d’humidité.',
    characteristics: { Taille: '3 (6 à 10 kg)', Quantité: '60 couches' },
  },
  {
    id: 'demo-enf-biberons', reference: 'BTH-ENF-005', title: 'Biberons en silicone (lot de 2)', category: 'enfants', subcategory: 'Puériculture',
    brand: 'Sans marque', price: 6000, condition: 'neuf', stock: 20, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Deux biberons souples en silicone de 240 ml, sans BPA, avec tétines à débit lent.',
    characteristics: { Contenu: '2 biberons de 240 ml', Matière: 'Silicone sans BPA', Tétines: 'Débit lent' },
  },
  {
    id: 'demo-enf-poussette', reference: 'BTH-ENF-006', title: 'Poussette canne pliable', category: 'enfants', subcategory: 'Puériculture',
    brand: 'Sans marque', price: 55000, condition: 'neuf', stock: 3, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan', delivery: BULKY,
    description: 'Poussette canne légère qui se plie en un geste, avec harnais 5 points et pare-soleil.',
    characteristics: { Âge: 'De 6 mois à 3 ans', Poids: 'Environ 6 kg', Harnais: '5 points' },
    colors: [{ name: 'Vert anis', hex: '#A3E635' }],
  },
  {
    id: 'demo-enf-chaussures-bebe', reference: 'BTH-ENF-007', title: 'Chaussures bébé premiers pas', category: 'enfants', subcategory: 'Chaussures enfant',
    brand: 'Sans marque', price: 5000, condition: 'neuf', stock: 13, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Petites chaussures montantes et souples à lacets pour les premiers pas.',
    characteristics: { Fermeture: 'Lacets', Semelle: 'Souple antidérapante' },
    colors: [{ name: 'Bleu', hex: '#1E3A8A' }],
    sizes: ['19', '20', '21', '22', '23'],
  },
  {
    id: 'demo-enf-sandales', reference: 'BTH-ENF-008', title: 'Sandales enfant', category: 'enfants', subcategory: 'Chaussures enfant',
    brand: 'Sans marque', price: 4000, condition: 'neuf', stock: 15, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Sandales légères à bride réglable pour les enfants.',
    characteristics: { Matière: 'Plastique souple', Fermeture: 'Bride à scratch' },
    sizes: ['24', '26', '28', '30', '32'],
  },
  {
    id: 'demo-enf-peluche', reference: 'BTH-ENF-009', title: 'Ours en peluche avec pull (40 cm)', category: 'enfants', subcategory: 'Jouets',
    brand: 'Sans marque', price: 6500, condition: 'neuf', stock: 10, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Ours en peluche tout doux de 40 cm, habillé d’un petit pull, lavable en machine.',
    characteristics: { Taille: '40 cm', Entretien: 'Lavable à 30 °C', Âge: 'Dès la naissance' },
  },
  {
    id: 'demo-enf-cubes', reference: 'BTH-ENF-010', title: 'Cubes alphabet en bois (30 pièces)', category: 'enfants', subcategory: 'Jouets',
    brand: 'Sans marque', price: 8000, condition: 'neuf', stock: 8, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Trente cubes en bois imprimés de lettres et de chiffres, pour construire et apprendre l’alphabet.',
    characteristics: { Contenu: '30 cubes', Matière: 'Bois, peinture à l’eau', Âge: 'Dès 18 mois' },
  },
  {
    id: 'demo-enf-ballon', reference: 'BTH-ENF-011', title: 'Ballon de football taille 5', category: 'enfants', subcategory: 'Jouets',
    brand: 'Sans marque', price: 5500, condition: 'neuf', stock: 20, shop: 'bouake-mode', location: 'Commerce, Bouaké',
    description: 'Ballon de football cousu, taille 5, pour le terrain ou la cour.',
    characteristics: { Taille: '5', Matière: 'Cuir synthétique' },
  },
  {
    id: 'demo-enf-cartable', reference: 'BTH-ENF-012', title: 'Sac à dos scolaire', category: 'enfants', subcategory: 'Rentrée scolaire',
    brand: 'Sans marque', price: 9000, condition: 'neuf', stock: 2, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Sac à dos d’école avec deux compartiments, dos rembourré et bretelles réglables.',
    characteristics: { Compartiments: '2 et une poche avant', Dos: 'Rembourré', Âge: 'Primaire et collège' },
    colors: [{ name: 'Rose', hex: '#F9A8D4' }, { name: 'Beige', hex: '#E7D8C1' }, { name: 'Noir', hex: '#111827' }],
  },
  {
    id: 'demo-enf-porte-bebe', reference: 'BTH-ENF-013', title: 'Porte-bébé ergonomique', category: 'enfants', subcategory: 'Puériculture',
    brand: 'Sans marque', price: 15000, condition: 'neuf', stock: 6, shop: 'bebe-cocon', location: 'Angré, Cocody, Abidjan',
    description: 'Porte-bébé ventral et dorsal avec ceinture lombaire, pour bébés de 3,5 à 15 kg.',
    characteristics: { Portages: 'Ventral et dorsal', Poids: '3,5 à 15 kg' },
  },

  /* ---------- Agriculture ---------- */
  {
    id: 'demo-agr-semences-mais', reference: 'BTH-AGR-001', title: 'Semences de maïs (sac de 5 kg)', category: 'agriculture', subcategory: 'Semences',
    brand: 'Sans marque', price: 7500, condition: 'neuf', stock: 25, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Semences de maïs sélectionnées pour une parcelle d’environ un quart d’hectare.',
    characteristics: { Poids: '5 kg', Surface: 'Environ 0,25 ha', Cycle: '90 à 110 jours' },
  },
  {
    id: 'demo-agr-semences-tomate', reference: 'BTH-AGR-002', title: 'Semences de tomate (sachet de 10 g)', category: 'agriculture', subcategory: 'Semences',
    brand: 'Sans marque', price: 3500, condition: 'neuf', stock: 40, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Sachet de semences de tomate pour pépinière, adaptées au climat chaud.',
    characteristics: { Poids: '10 g (environ 3 000 graines)', Semis: 'En pépinière' },
  },
  {
    id: 'demo-agr-engrais-npk', reference: 'BTH-AGR-003', title: 'Engrais NPK 15-15-15 (sac de 50 kg)', category: 'agriculture', subcategory: 'Engrais',
    brand: 'Sans marque', price: 22000, condition: 'neuf', stock: 14, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', delivery: BULKY,
    description: 'Engrais complet pour le fond de culture : maïs, riz, cultures maraîchères.',
    characteristics: { Poids: '50 kg', Formule: 'NPK 15-15-15' },
  },
  {
    id: 'demo-agr-uree', reference: 'BTH-AGR-004', title: 'Urée 46 % (sac de 50 kg)', category: 'agriculture', subcategory: 'Engrais',
    brand: 'Sans marque', price: 20000, condition: 'neuf', stock: 10, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', delivery: BULKY,
    description: 'Engrais azoté en granulés pour la croissance des cultures.',
    characteristics: { Poids: '50 kg', Azote: '46 %' },
  },
  {
    id: 'demo-agr-machette', reference: 'BTH-AGR-005', title: 'Machette avec manche en bois', category: 'agriculture', subcategory: 'Outils',
    brand: 'Sans marque', price: 2500, condition: 'neuf', stock: 30, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Machette en acier pour le débroussaillage et l’entretien des parcelles.',
    characteristics: { Lame: 'Acier, environ 45 cm', Manche: 'Bois' },
  },
  {
    id: 'demo-agr-houe', reference: 'BTH-AGR-006', title: 'Houe (daba) forgée', category: 'agriculture', subcategory: 'Outils',
    brand: 'Fabrication artisanale', price: 3000, condition: 'neuf', stock: 20, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', local: true,
    description: 'Houe traditionnelle forgée à la main, avec manche en bois, pour le labour et le sarclage.',
    characteristics: { Lame: 'Fer forgé', Manche: 'Bois', Origine: 'Forgée en Côte d’Ivoire' },
  },
  {
    id: 'demo-agr-pulverisateur', reference: 'BTH-AGR-007', title: 'Pulvérisateur à dos (16 L)', category: 'agriculture', subcategory: 'Matériel',
    brand: 'Sans marque', price: 18000, condition: 'neuf', stock: 7, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Pulvérisateur manuel à dos avec lance réglable, pour les traitements des cultures.',
    characteristics: { Contenance: '16 L', Pompe: 'Manuelle à levier', Lance: 'Buse réglable' },
  },
  {
    id: 'demo-agr-arrosoir', reference: 'BTH-AGR-008', title: 'Arrosoir (10 L)', category: 'agriculture', subcategory: 'Arrosage',
    brand: 'Sans marque', price: 3000, condition: 'neuf', stock: 18, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Arrosoir en plastique résistant avec pomme amovible.',
    characteristics: { Contenance: '10 L', Matière: 'Plastique' },
  },
  {
    id: 'demo-agr-tuyau', reference: 'BTH-AGR-009', title: 'Tuyau d’arrosage (25 m)', category: 'agriculture', subcategory: 'Arrosage',
    brand: 'Sans marque', price: 8500, condition: 'neuf', stock: 11, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Tuyau d’arrosage souple de 25 mètres, diamètre 15 mm.',
    characteristics: { Longueur: '25 m', Diamètre: '15 mm' },
  },
  {
    id: 'demo-agr-goutte-a-goutte', reference: 'BTH-AGR-010', title: 'Kit d’irrigation goutte-à-goutte (500 m²)', category: 'agriculture', subcategory: 'Arrosage',
    brand: 'Sans marque', price: 45000, condition: 'neuf', stock: 4, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro',
    description: 'Kit complet de goutte-à-goutte pour une parcelle maraîchère de 500 m² : gaines, raccords et filtre.',
    characteristics: { Surface: '500 m²', Contenu: 'Gaines, raccords, filtre', Alimentation: 'Réservoir ou réseau' },
  },
  {
    id: 'demo-agr-brouette', reference: 'BTH-AGR-011', title: 'Brouette (90 L)', category: 'agriculture', subcategory: 'Matériel',
    brand: 'Sans marque', price: 28000, condition: 'neuf', stock: 5, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', delivery: BULKY,
    description: 'Brouette à cuve en acier peint et roue gonflable.',
    characteristics: { Contenance: '90 L', Cuve: 'Acier peint', Roue: 'Gonflable' },
  },
  {
    id: 'demo-agr-plants-cacao', reference: 'BTH-AGR-012', title: 'Plants de cacaoyer (lot de 50)', category: 'agriculture', subcategory: 'Plants',
    brand: 'Pépinière locale', price: 10000, condition: 'neuf', stock: 8, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', local: true,
    description: 'Cinquante plants de cacaoyer en sachets, élevés en pépinière, prêts à planter.',
    characteristics: { Quantité: '50 plants', Âge: '4 à 6 mois', Origine: 'Pépinière en Côte d’Ivoire' },
  },
  {
    id: 'demo-agr-aliment-volaille', reference: 'BTH-AGR-013', title: 'Aliment pour volaille (sac de 50 kg)', category: 'agriculture', subcategory: 'Élevage',
    brand: 'Fabrication locale', price: 17500, condition: 'neuf', stock: 12, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', local: true, delivery: BULKY,
    description: 'Aliment complet pour poulets de chair en croissance, fabriqué en Côte d’Ivoire.',
    characteristics: { Poids: '50 kg', Usage: 'Poulets de chair, croissance', Origine: 'Côte d’Ivoire' },
  },
  {
    id: 'demo-agr-motopompe', reference: 'BTH-AGR-014', title: 'Motopompe à essence 2 pouces', category: 'agriculture', subcategory: 'Matériel',
    brand: 'Sans marque', price: 120000, condition: 'neuf', stock: 2, shop: 'agroplus-yakro', location: 'Morofé, Yamoussoukro', delivery: BULKY,
    description: 'Motopompe pour l’irrigation et le transfert d’eau, moteur 4 temps à essence.',
    characteristics: { Raccords: '2 pouces (50 mm)', Moteur: '4 temps, essence', Débit: 'Environ 30 m³/h' },
  },

  /* ---------- Services ---------- */
  {
    id: 'demo-ser-livraison', reference: 'BTH-SER-001', title: 'Course de livraison à moto dans Abidjan', category: 'services', subcategory: 'Livraison',
    brand: 'Abidjan Services Pro', price: 2000, condition: 'neuf', stock: 50, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', local: true, delivery: SERVICE,
    description: 'Un livreur à moto récupère votre colis et le dépose dans une autre commune d’Abidjan, le jour même.',
    characteristics: { Zone: 'Abidjan', Délai: 'Le jour même', Colis: 'Jusqu’à 10 kg' },
  },
  {
    id: 'demo-ser-reparation-pc', reference: 'BTH-SER-002', title: 'Diagnostic et nettoyage d’ordinateur', category: 'services', subcategory: 'Réparation',
    brand: 'Abidjan Services Pro', price: 10000, condition: 'neuf', stock: 15, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Diagnostic complet, nettoyage intérieur et suppression des virus. Les pièces éventuelles sont chiffrées avant intervention.',
    characteristics: { Durée: '24 à 48 h', Inclus: 'Diagnostic, nettoyage, antivirus', Pièces: 'Sur devis' },
  },
  {
    id: 'demo-ser-ecran-telephone', reference: 'BTH-SER-003', title: 'Remplacement d’écran de téléphone (main-d’œuvre)', category: 'services', subcategory: 'Réparation',
    brand: 'Abidjan Services Pro', price: 5000, condition: 'neuf', stock: 20, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Pose d’un écran neuf sur votre téléphone. Le prix de l’écran dépend du modèle et vous est annoncé avant la réparation.',
    characteristics: { Durée: 'Environ 1 h', Écran: 'En supplément, selon le modèle' },
  },
  {
    id: 'demo-ser-photographie', reference: 'BTH-SER-004', title: 'Séance photo (1 heure)', category: 'services', subcategory: 'Événementiel',
    brand: 'Abidjan Services Pro', price: 25000, condition: 'neuf', stock: 8, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Une heure de prise de vue (portrait, famille, produits) et 20 photos retouchées envoyées par lien.',
    characteristics: { Durée: '1 heure', Livraison: '20 photos retouchées', Lieu: 'À Abidjan' },
  },
  {
    id: 'demo-ser-logo', reference: 'BTH-SER-005', title: 'Création de logo', category: 'services', subcategory: 'Graphisme',
    brand: 'Abidjan Services Pro', price: 30000, condition: 'neuf', stock: 10, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Trois propositions de logo pour votre activité, deux séries de corrections, fichiers pour l’impression et les réseaux sociaux.',
    characteristics: { Propositions: '3', Corrections: '2 séries', Délai: '5 jours ouvrés' },
  },
  {
    id: 'demo-ser-flyers', reference: 'BTH-SER-006', title: 'Impression de 500 flyers A5', category: 'services', subcategory: 'Impression',
    brand: 'Abidjan Services Pro', price: 25000, condition: 'neuf', stock: 12, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan',
    description: 'Impression en couleur recto verso de 500 flyers au format A5 à partir de votre fichier.',
    characteristics: { Quantité: '500', Format: 'A5, recto verso', Papier: '135 g' },
  },
  {
    id: 'demo-ser-nettoyage', reference: 'BTH-SER-007', title: 'Nettoyage d’appartement (3 pièces)', category: 'services', subcategory: 'Maison',
    brand: 'Abidjan Services Pro', price: 15000, condition: 'neuf', stock: 10, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Deux agents nettoient votre appartement : sols, cuisine, salle de bain et vitres intérieures.',
    characteristics: { Surface: 'Appartement de 3 pièces', Durée: 'Environ 4 h', Produits: 'Fournis' },
  },
  {
    id: 'demo-ser-couture', reference: 'BTH-SER-008', title: 'Couture sur mesure d’une robe (tissu fourni par vous)', category: 'services', subcategory: 'Couture',
    brand: 'AfriStyle', price: 7000, condition: 'neuf', stock: 10, shop: 'afristyle', location: 'Yopougon, Abidjan', local: true, delivery: SERVICE,
    description: 'Confection d’une robe à vos mesures à partir de votre tissu, modèle choisi ensemble.',
    characteristics: { Délai: '5 à 7 jours', Tissu: 'Fourni par le client', Essayage: '1 essayage inclus' },
  },
  {
    id: 'demo-ser-tresses', reference: 'BTH-SER-009', title: 'Tresses à domicile', category: 'services', subcategory: 'Coiffure',
    brand: 'Karité & Beauté', price: 6000, condition: 'neuf', stock: 6, shop: 'karite-beaute', location: 'Dar-es-Salam, Bouaké', delivery: SERVICE,
    description: 'Une coiffeuse se déplace chez vous à Bouaké pour des tresses ou des nattes. Mèches non comprises.',
    characteristics: { Zone: 'Bouaké', Durée: '3 à 5 h selon le modèle', Mèches: 'Non comprises' },
  },
  {
    id: 'demo-ser-cours-info', reference: 'BTH-SER-010', title: 'Cours d’informatique pour débutants (10 heures)', category: 'services', subcategory: 'Formation',
    brand: 'Abidjan Services Pro', price: 25000, condition: 'neuf', stock: 8, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Dix heures de cours en petit groupe : utiliser un ordinateur, Word, Excel, internet et la messagerie.',
    characteristics: { Durée: '10 heures', Groupe: '6 personnes au plus', Niveau: 'Débutant' },
  },
  {
    id: 'demo-ser-plomberie', reference: 'BTH-SER-011', title: 'Dépannage de plomberie', category: 'services', subcategory: 'Maison',
    brand: 'Abidjan Services Pro', price: 10000, condition: 'neuf', stock: 12, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Déplacement d’un plombier et première heure de travail : fuite, robinet, chasse d’eau. Pièces en supplément.',
    characteristics: { Inclus: 'Déplacement et 1 heure de travail', Pièces: 'En supplément', Zone: 'Abidjan' },
  },
  {
    id: 'demo-ser-electricite', reference: 'BTH-SER-012', title: 'Dépannage d’électricité', category: 'services', subcategory: 'Maison',
    brand: 'Abidjan Services Pro', price: 10000, condition: 'neuf', stock: 0, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', delivery: SERVICE,
    description: 'Déplacement d’un électricien et première heure de travail : prise, disjoncteur, éclairage. Matériel en supplément.',
    characteristics: { Inclus: 'Déplacement et 1 heure de travail', Matériel: 'En supplément', Zone: 'Abidjan' },
  },
  {
    id: 'demo-ser-traiteur', reference: 'BTH-SER-013', title: 'Buffet traiteur ivoirien (20 personnes)', category: 'services', subcategory: 'Événementiel',
    brand: 'Abidjan Services Pro', price: 150000, condition: 'neuf', stock: 3, shop: 'services-pro-abidjan', location: 'Deux-Plateaux, Cocody, Abidjan', local: true, delivery: SERVICE,
    description: 'Buffet pour 20 personnes : attiéké poisson, poulet braisé, alloco, garba, jus de bissap et de gingembre.',
    characteristics: { Personnes: '20', Menu: 'Attiéké poisson, poulet braisé, alloco, garba', Boissons: 'Bissap et gingembre', Commande: '72 h à l’avance' },
  },
];
