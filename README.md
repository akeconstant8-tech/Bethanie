# Béthanie — Marketplace africaine

**« Achetez • Vendez • Bénissez »** — une place de marché en ligne qui relie artisans, créateurs, commerçants et
producteurs locaux aux acheteurs de Côte d’Ivoire et de la sous-région, avec paiement Mobile Money et suivi
de livraison.

| | |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite 6 · Tailwind CSS 4 |
| **Backend** | Node.js ≥ 22.13 · Express 5 · SQLite intégré à Node (`node:sqlite`) |
| **Services externes** | Aucun pour les données (pas de Firebase pour l’instant) |
| **État** | Lots 1 (frontend), 1 bis (refonte UX/UI) et 2 (backend) terminés · application installable (PWA) et hors ligne · paiements encore simulés |

📄 **Documentation** : [Cahier des charges](docs/CAHIER_DES_CHARGES.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Maquette UX/UI](docs/maquette/maquette-ux-ui.jpg)

---

## Démarrage rapide

Prérequis : **Node.js 22.13 ou plus récent** (`node -v`).

```bash
npm install
npm run dev
```

Ouvrez **http://localhost:3000**. Au premier démarrage, la base `server/data/bethanie.db` est créée et remplie
avec les données de démonstration (13 produits, 5 boutiques, 2 commandes).

| Pour tester | |
|---|---|
| Compte de démonstration | `pierre@gmail.com` / `bethanie123` |
| Codes promo | `BETHANIE10` (−10 %, max. 10 000 FCFA) · `BIENVENUE` (−2 000 FCFA) · `LIVRAISON` (livraison offerte) |
| Devenir vendeur | Connectez-vous puis ouvrez **Espace vendeur** |
| Suivre une commande | Le bouton « Simuler l’étape suivante » (mode démo) fait avancer la livraison |

---

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance l’API (port 4000, rechargée à chaque modification) **et** le site (port 3000) |
| `npm run dev:api` / `npm run dev:web` | Lance l’un des deux seulement |
| `npm run build` | Vérifie les types (site + serveur) et compile le site dans `dist/` |
| `npm start` | Production : Express sert l’API **et** le site compilé sur le port 4000 |
| `npm run typecheck` | Vérification TypeScript seule |
| `npm run db:reset` | Supprime la base locale (**serveur arrêté**) ; elle est recréée au démarrage suivant |

---

## Fonctionnalités

**Interface** — sur mobile, le site se présente comme une application (en-têtes d’écran, barre d’onglets
Accueil · Catégories · Panier · Commandes · Profil) ; à la première visite, écran de démarrage et présentation.
Sur ordinateur, en-tête vert et pages en colonnes. Pour revoir l’accueil de première visite : ouvrir le site en
largeur mobile après avoir supprimé la clé `bethanie.onboarded` du stockage local.

**Langues** — français et anglais, au choix par les drapeaux (en-tête, profil, écran de connexion) ; le choix est
mémorisé. Les textes sont dans `src/i18n/fr.ts` et `src/i18n/en.ts` ; une traduction manquante bloque la compilation.

**Application installable (PWA) et hors ligne** — bouton « Installer l’application » quand le navigateur le
permet (Android, Chrome, Edge), instructions sur iPhone / iPad ; consultation du catalogue sans connexion, avec
l’indication « Vous êtes actuellement hors connexion ». Le service worker n’existe que dans la version compilée :
pour l’essayer, `npm run build` puis `npm start`, et ouvrir **http://localhost:4000**.

**Motion design** — transitions entre écrans orientées comme dans une application (avancer à droite, revenir à
gauche), bannière animée, photo qui vole jusqu’au panier, cartes inclinées en 3D au survol, confettis au paiement,
apparitions en cascade, micro-interactions, squelettes de chargement. Tout est coupé si l’appareil demande de
réduire les animations : sous Windows, c’est le cas quand **Paramètres › Accessibilité › Effets visuels › Effets
d’animation** est désactivé. Polices **Poppins** (interface) et **Cinzel** (logo), hébergées avec les icônes par
le site lui-même.

**Clients**
- Écran Catégories illustré ; catalogue avec recherche, filtres (catégorie, prix, marque, note) et tri ; pages boutiques.
- Fiche produit : galerie, couleurs, tailles, stock, caractéristiques, avis (« achat vérifié »), produits similaires.
- Panier utilisable sans compte, regroupé par vendeur, avec codes promo et estimation de la livraison.
- Commande : adresse, livraison express / standard / point relais, Orange Money, Wave, MTN, Moov, carte
  ou paiement à la livraison.
- Suivi en 5 étapes, livreur, historique horodaté.
- Compte : profil, adresses, moyens de paiement, favoris.

**Vendeurs**
- Ouverture de boutique, publication de produits avec 1 à 3 photos, gestion du stock.
- Commandes reçues (uniquement leurs articles) et passage d’étape ; tableau de bord et statistiques des ventes.

Le détail, les règles de gestion et ce qui reste à faire sont dans le [cahier des charges](docs/CAHIER_DES_CHARGES.md).

---

## Structure du projet

```
src/            site React (écrans, composants, client API, règles métier partagées)
server/         API Express (routes, base SQLite, sessions, photos, paiements)
public/images/  photos de démonstration et illustrations des catégories (crédits : public/images/CREDITS.md)
docs/           cahier des charges, architecture, maquette UX/UI de référence
```

Les frais de livraison, les codes promo et les étapes de commande sont définis une seule fois dans
`src/utils/commerce.ts`, utilisé par le site **et** par le serveur ; le serveur recalcule toujours les montants
à partir des prix en base. Schémas, modèle de données et flux : voir [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Configuration du serveur

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `4000` | Port d’écoute |
| `DATA_DIR` | `server/data` | Dossier de la base et des photos importées |
| `COOKIE_SECURE` | `false` | À mettre à `true` derrière HTTPS |
| `DEMO_MODE` | `true` | `false` interdit au client de faire avancer lui-même sa commande |
| `PAYMENT_PROVIDER` | `simulation` | Fournisseur de paiement (voir `server/payments.ts`) |

`server/data/` contient les données réelles : il est exclu de git et doit être sauvegardé.

---

## Mise en production

```bash
npm install
npm run build
COOKIE_SECURE=true DEMO_MODE=false npm start
```

Sous Windows PowerShell : `$env:COOKIE_SECURE='true'; $env:DEMO_MODE='false'; npm start`.

Placez un proxy HTTPS (Nginx, Caddy…) devant le port 4000. Avant d’ouvrir au public, traitez les points de la
section « Limites connues » de l’[architecture](docs/ARCHITECTURE.md#12-limites-connues-et-actions-avant-la-mise-en-production),
en particulier :

- `npm start` utilise `tsx`, installé comme dépendance de développement : ne pas installer avec `--omit=dev`
  (ou compiler le serveur) ;
- activer `trust proxy` dans Express derrière un proxy, sinon la limitation des tentatives de connexion
  s’applique à tous les visiteurs à la fois ;
- mettre en place les sauvegardes de `server/data/` (base + photos).

---

## Sécurité

Mots de passe hachés (scrypt), sessions côté serveur en cookie `HttpOnly`, protection CSRF, limitation des
tentatives de connexion, validation de toutes les entrées, droits vérifiés sur chaque ressource, prix et stock
recalculés côté serveur, contrôle du contenu des photos, en-têtes de sécurité avec CSP.
Détail menace par menace : [ARCHITECTURE.md § 9](docs/ARCHITECTURE.md#9-sécurité).

---

## Ce qui reste à faire

| Lot | Contenu |
|---|---|
| 3 — Paiements et notifications | Agrégateur Mobile Money / carte (CinetPay, PayDunya…), mot de passe oublié, vérification par SMS, notifications |
| 4 — Opérations | Espace administrateur, vérification des boutiques, sous-commandes par vendeur, reversements |
| 5 — Mise en production | Hébergement, HTTPS, sauvegardes, supervision, tests automatisés, mentions légales et CGV |
| 6 — Mobile | ~~Application installable (PWA)~~ réalisée ; applications natives si besoin ; commandes préparées hors ligne |

---

## Crédits

Photos de démonstration libres de droits (CC0 / licence Unsplash), listées dans
[`public/images/CREDITS.md`](public/images/CREDITS.md). À remplacer par les photos officielles de Béthanie.
