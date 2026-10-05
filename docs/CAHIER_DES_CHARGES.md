# Cahier des charges — Béthanie

> Marketplace africaine « Achetez • Vendez • Bénissez »
> Version 1.10 — 5 octobre 2026 — document de travail, à valider par le porteur de projet

| Version | Date | Changements |
|---|---|---|
| 1.0 | 3 octobre 2026 | Première version (lots 1 et 2) |
| 1.1 | 3 octobre 2026 | Refonte UX/UI d’après la maquette de 13 écrans : nouvelle section 4.9 « Interface et parcours » et 6.6 « Charte graphique » ; exigences CAT, PAN, CPT, SUI, VEN mises à jour ; lot 1 bis ; décisions D8 à D10 ; scénarios de recette R12 à R16 |
| 1.2 | 3 octobre 2026 | Interface en français et en anglais (LNG-01 à LNG-05, D12) ; bannière d’accueil fournie (UX-18) ; polices Plus Jakarta Sans et Cinzel (6.6) ; cartes produit sans ville ni prix barré (UX-19) ; numéro WhatsApp retiré, support par e-mail (D11) ; recette R17 et R18 |
| 1.3 | 3 octobre 2026 | Application installable et hors ligne (4.11, PWA-01 à PWA-10) ; motion design (4.12, MOT-01 à MOT-10) ; typographie Poppins et Cinzel (6.6) ; performance (PERF-04 à PERF-07) ; lot 6 en partie réalisé ; recette R19 à R26 |
| 1.4 | 3 octobre 2026 | Section « Boutiques certifiées » retirée de l’accueil, ainsi que le lien « Boutiques » de l’en-tête (CAT-01, RG-07) |
| 1.5 | 3 octobre 2026 | Motion design renforcé (MOT-11 à MOT-16) ; réglage « Effets d’animation » de Windows expliqué ; recette R27 à R31 |
| 1.6 | 5 octobre 2026 | Définition fonctionnelle d’un assistant vendeur et de ses compétences (AGV-01 à AGV-07) ; intégration technique hors périmètre de cette version |
| 1.7 | 5 octobre 2026 | Connexion et création de compte Google via Firebase Authentication ; retrait du parcours e-mail/mot de passe ; données métier conservées dans SQLite |
| 1.8 | 5 octobre 2026 | Assistant vendeur réalisé (AGV-01 à AGV-07, à valider avec une clé Claude) ; master class motion design (MOT-17 à MOT-22) ; vérification Google simplifiée ; recette R32 à R38 |
| 1.9 | 5 octobre 2026 | Commission de 5 % calculée, contrôlée et journalisée à chaque transaction (RG-09 validée, 4.14, TRX-01 à TRX-07) ; audit de sécurité (`docs/AUDIT_SECURITE.md`) ; agent de sécurité ; recette R39 à R44 |
| 1.10 | 5 octobre 2026 | Commandes non payées annulées après 2 heures et limite de 10 commandes par heure (TRX-08, TRX-09) ; statut « Annulée » ; codes promo conservés illimités (décision) ; connexion Google configurée côté serveur, un seul bouton « Continuer avec Google » ; logo et devise à la place de la ville dans l’en-tête mobile de l’accueil |

**Légende des statuts** : ✅ réalisé · 🟡 partiel ou dépend d’une configuration externe · ⬜ à faire
**Priorités** : **P1** indispensable au lancement · **P2** important · **P3** souhaitable

Les points marqués **[À valider]** sont des hypothèses reprises de l’interface actuelle ; ils doivent être
confirmés par le porteur de projet avant la mise en production.

---

## Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Périmètre](#2-périmètre)
3. [Acteurs et rôles](#3-acteurs-et-rôles)
4. [Exigences fonctionnelles](#4-exigences-fonctionnelles)
5. [Règles de gestion](#5-règles-de-gestion)
6. [Exigences non fonctionnelles](#6-exigences-non-fonctionnelles)
7. [Contraintes techniques](#7-contraintes-techniques)
8. [Interfaces externes](#8-interfaces-externes)
9. [Découpage en lots et avancement](#9-découpage-en-lots-et-avancement)
10. [Décisions à prendre](#10-décisions-à-prendre)
11. [Recette : critères d’acceptation](#11-recette--critères-dacceptation)
12. [Livrables](#12-livrables)
13. [Glossaire](#13-glossaire)

---

## 1. Présentation du projet

### 1.1 Contexte

Béthanie est une place de marché en ligne (marketplace) qui met en relation des **vendeurs locaux**
(artisans, créateurs, commerçants, producteurs agricoles) et des **acheteurs** en Côte d’Ivoire, avec une
ouverture vers la sous-région (Dakar est déjà proposée comme ville de livraison).

Le marché visé utilise massivement le **Mobile Money** (Orange Money, Wave, MTN, Moov) et le smartphone :
le site doit donc être pensé d’abord pour le mobile et pour ces moyens de paiement.

### 1.2 Objectifs

| # | Objectif | Indicateur proposé |
|---|---|---|
| O1 | Permettre à un vendeur d’ouvrir sa boutique et de publier un produit en quelques minutes, depuis son téléphone | Temps entre inscription et premier produit publié |
| O2 | Permettre à un acheteur de trouver, commander et payer un produit simplement | Taux de conversion panier → commande |
| O3 | Inspirer confiance : vendeurs vérifiés, avis authentiques, paiement sécurisé, suivi de commande | Part d’avis « achat vérifié », taux de litiges |
| O4 | Reverser l’essentiel du prix au vendeur **[À valider : 95 %, commission de 5 %]** | Délai et montant des reversements |

### 1.3 Public cible

- **Acheteurs** : particuliers et familles, principalement à Abidjan puis dans les villes de l’intérieur.
- **Vendeurs** : petites boutiques, artisans, coopératives agricoles, créateurs de mode.
- **Équipe Béthanie** : service client, modération, logistique.

---

## 2. Périmètre

### 2.1 Inclus dans la version actuelle

- Site web responsive (ordinateur, tablette, mobile) en français et en anglais. Sur mobile, il se présente comme une
  application (en-têtes d’écran, barre d’onglets en bas), conformément à la maquette
  [docs/maquette/maquette-ux-ui.jpg](maquette/maquette-ux-ui.jpg).
- Catalogue multi-vendeurs, panier, commande, paiement (simulé), suivi de commande.
- Comptes clients, espace vendeur, avis clients.
- API et base de données hébergées par l’équipe ; Firebase Authentication utilisé uniquement pour la connexion Google.

### 2.2 Hors périmètre à ce stade

- Applications mobiles natives Android / iOS (lot 6 ; l’application installable, ou PWA, est réalisée).
- Paiements réels (prévus au lot 3), reversements aux vendeurs, facturation.
- Espace d’administration, application livreur, points relais réels.
- Autres langues que le français et l’anglais ; traduction des fiches produit saisies par les vendeurs ; multi-devise (FCFA uniquement).
- Assistant vendeur et compétences assistées : périmètre fonctionnel défini au §4.13, mais non inclus dans la version actuelle tant que les choix de réalisation n’ont pas été cadrés.

---

## 3. Acteurs et rôles

| Acteur | Description | Peut | Statut |
|---|---|---|---|
| **Visiteur** | Personne non connectée | Parcourir, rechercher, lire les avis, remplir un panier, mettre en favori (dans son navigateur) | ✅ |
| **Client** | Compte connecté | Tout ce que fait le visiteur + commander, payer, suivre ses commandes, gérer profil / adresses / moyens de paiement, laisser un avis | ✅ |
| **Vendeur** | Client ayant ouvert une boutique (une par compte) | Publier et gérer ses produits, voir et traiter les commandes qui le concernent | ✅ |
| **Administrateur** | Équipe Béthanie | Vérifier les boutiques, modérer, gérer les litiges et les codes promo | ⬜ (le rôle existe en base, sans interface) |
| **Livreur** | Partenaire logistique | Récupérer et livrer les colis, mettre à jour le statut | ⬜ (attribution automatique fictive) |

---

## 4. Exigences fonctionnelles

### 4.1 Catalogue et découverte (CAT)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| CAT-01 | Page d’accueil : ville de livraison, recherche, bannière, catégories illustrées, produits populaires (les plus évalués), espace vendeur, engagements (paiement, livraison, support) | P1 | ✅ |
| CAT-10 | Écran « Catégories » : les 8 catégories avec illustration, sous-titre et nombre de produits ; un toucher ouvre le catalogue filtré | P1 | ✅ |
| CAT-02 | Catalogue avec filtres (catégorie, prix maximum, marque, note minimale) et tri (pertinence, prix, note) | P1 | ✅ |
| CAT-03 | Recherche plein texte sur le titre, la description et la marque | P1 | ✅ |
| CAT-04 | Page boutique : produits d’un vendeur | P1 | ✅ |
| CAT-05 | Fiche produit : galerie, prix (sans prix barré), badge de réduction, stock, couleurs, tailles, quantité, caractéristiques, vendeur, produits similaires, partage du lien | P1 | ✅ |
| CAT-06 | Avis clients : lecture publique ; dépôt par un client connecté ; un avis par produit et par client ; mention « Achat vérifié » si le client a commandé le produit | P1 | ✅ |
| CAT-07 | Choix de la ville de livraison (Abidjan, Bouaké, Yamoussoukro, San-Pédro, Korhogo, Dakar) | P1 | ✅ |
| CAT-08 | Pagination du catalogue dans l’interface (aujourd’hui : 500 produits chargés au maximum) | P2 | 🟡 API prête, interface à faire |
| CAT-09 | Recherche tolérante aux fautes, suggestions | P3 | ⬜ |

### 4.2 Panier (PAN)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| PAN-01 | Ajouter un produit ; taille obligatoire si plusieurs tailles existent ; quantité limitée au stock | P1 | ✅ |
| PAN-02 | Modifier la quantité, supprimer un article ou vider le panier (avec annulation possible), déplacer dans les favoris | P1 | ✅ |
| PAN-03 | Panier utilisable sans compte et conservé dans le navigateur | P1 | ✅ |
| PAN-04 | Articles regroupés par vendeur | P2 | ✅ |
| PAN-05 | Code promo et estimation des frais de livraison, avec seuil de livraison offerte | P2 | ✅ |
| PAN-06 | Panier synchronisé entre plusieurs appareils d’un même compte | P3 | ⬜ |

### 4.3 Compte client (CPT)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| CPT-01 | Création de compte avec Google : nom et e-mail vérifiés ; téléphone complété ultérieurement dans le profil | P1 | ✅ |
| CPT-02 | Connexion Google, déconnexion ; session Béthanie valable 30 jours | P1 | ✅ |
| CPT-03 | Modification du profil (nom, e-mail, téléphone, ville) | P1 | ✅ |
| CPT-04 | Carnet d’adresses (20 maximum, une par défaut) | P1 | ✅ |
| CPT-05 | Moyens de paiement enregistrés ; pour une carte, seuls les 4 derniers chiffres sont conservés | P2 | ✅ |
| CPT-06 | Favoris enregistrés sur le compte ; les favoris choisis avant connexion sont fusionnés | P2 | ✅ |
| CPT-07 | Récupération de compte gérée par Google ; aucun mot de passe Béthanie à réinitialiser | P1 | ✅ |
| CPT-08 | Vérification du numéro de téléphone par code (OTP) | P2 | ⬜ |
| CPT-09 | Suppression du compte et export des données personnelles | P2 | ⬜ |
| CPT-10 | « Continuer avec Google » et création de compte Google ; jeton vérifié par le serveur Firebase Admin, session Béthanie conservée | P1 | 🟡 code intégré, configuration Firebase requise dans chaque environnement |
| CPT-11 | « Continuer avec téléphone » : connexion par code SMS ; suppose un numéro unique et vérifié par compte (CPT-08) | P2 | ⬜ non implémenté |

### 4.4 Commande et paiement (CMD)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| CMD-01 | Tunnel de commande : adresse (enregistrée ou nouvelle), téléphone de contact, mode de livraison, moyen de paiement | P1 | ✅ |
| CMD-02 | Prix, remises et frais de livraison recalculés par le serveur (jamais repris du navigateur) | P1 | ✅ |
| CMD-03 | Réservation du stock au moment de la commande, sans risque de survente | P1 | ✅ |
| CMD-04 | Paiement Orange Money, Wave, MTN MoMo, Moov Money et carte via un agrégateur | P1 | 🟡 simulé |
| CMD-05 | Paiement à la livraison | P1 | ✅ |
| CMD-06 | Paiement échoué ou abandonné : annulation de la commande et remise en stock | P1 | ⬜ |
| CMD-07 | Annulation par le client avant expédition ; demande de retour sous 7 jours **[À valider]** | P2 | ⬜ |
| CMD-08 | Reçu / facture téléchargeable | P2 | ⬜ |
| CMD-09 | Notifications (SMS, WhatsApp ou e-mail) à chaque étape | P2 | ⬜ |

### 4.5 Suivi de commande (SUI)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| SUI-01 | Liste de ses commandes ; chronologie verticale en 5 étapes avec date et heure, étape en cours signalée, message expliquant l’étape | P1 | ✅ |
| SUI-02 | Statut du paiement visible ; possibilité de finaliser un paiement en attente | P1 | ✅ |
| SUI-03 | Recherche d’une de ses commandes par numéro (BTH-XXXXXX) | P2 | ✅ |
| SUI-04 | Livreur affiché à l’étape « En livraison » (nom, téléphone, véhicule, heure estimée), contact par appel ou WhatsApp | P2 | 🟡 livreur attribué au hasard |
| SUI-05 | Position du livreur en temps réel | P3 | ⬜ |

### 4.6 Espace vendeur (VEN)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| VEN-01 | Ouverture de boutique : nom, ville, catégorie principale, téléphone Mobile Money, description, acceptation de la charte | P1 | ✅ |
| VEN-02 | Publication d’un produit avec 1 à 3 photos (JPEG, PNG ou WebP, 2,5 Mo maximum chacune ; la première est la photo principale) ; champs essentiels d’abord (nom, description, prix, stock, catégorie), puis détails facultatifs (prix avant réduction, qui affiche un badge « -X % », marque, sous-catégorie, tailles, caractéristiques) | P1 | ✅ |
| VEN-03 | Gestion du stock et suppression d’un produit | P1 | ✅ |
| VEN-04 | Modification complète d’un produit (titre, description, prix, photos) | P1 | 🟡 API : titre, description, prix, stock ; interface : stock seulement |
| VEN-05 | Commandes reçues : uniquement les articles de sa boutique ; passage à l’étape suivante ; bloqué tant que le paiement est en attente | P1 | ✅ |
| VEN-06 | Tableau de bord : ventes (articles vendus), revenus et net estimé, commandes et commandes à traiter, produits en ligne et stock faible, commandes récentes | P2 | ✅ |
| VEN-07 | Plusieurs photos et variantes de couleur par produit | P2 | 🟡 3 photos ✅ ; variantes de couleur à faire |
| VEN-09 | Statistiques : commandes par étape, meilleures ventes, panier moyen, commission et net à recevoir | P2 | ✅ (calculées sur les commandes reçues) |
| VEN-10 | Évolution des indicateurs dans le temps (« +20 % » de la maquette) | P3 | ⬜ nécessite un historique daté des ventes |
| VEN-08 | Reversements au vendeur sur son Mobile Money, relevé des ventes et commissions | P1 | 🟡 part vendeur calculée et contrôlée à chaque commande (TRX-01) ; reversement réel avec le lot 3 |

### 4.7 Administration (ADM)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| ADM-01 | Vérifier une boutique (badge « vérifiée », visibilité sur l’accueil) | P1 | ⬜ |
| ADM-02 | Modérer produits et avis (masquer, supprimer) | P1 | ⬜ |
| ADM-03 | Gérer les litiges, annulations et remboursements | P1 | ⬜ |
| ADM-04 | Créer et désactiver des codes promo (aujourd’hui inscrits dans le code) | P2 | ⬜ |
| ADM-05 | Statistiques globales (ventes, vendeurs actifs, commandes) | P2 | ⬜ |

### 4.8 Livraison (LIV)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| LIV-01 | Frais calculés selon le mode et la ville (voir RG-01) | P1 | ✅ |
| LIV-02 | Application ou interface livreur (prise en charge, livraison, encaissement à la livraison) | P2 | ⬜ |
| LIV-03 | Réseau de points relais réels | P3 | ⬜ |

### 4.9 Interface et parcours (UX)

Référence : maquette de 13 écrans [docs/maquette/maquette-ux-ui.jpg](maquette/maquette-ux-ui.jpg) et planche
d’illustrations des catégories [docs/maquette/illustrations-categories.jpg](maquette/illustrations-categories.jpg).
La maquette décrit le mobile ; sur ordinateur, les mêmes écrans s’affichent en colonnes avec un en-tête vert et
un pied de page.

| ID | Exigence | Écran(s) de la maquette | Priorité | Statut |
|---|---|---|---|---|
| UX-01 | Écran de démarrage : fond vert, logo, slogan, phrase de présentation, motif africain | 1 | P2 | ✅ |
| UX-02 | Deux écrans de présentation (« Découvrez des produits uniques », « Vendez et développez votre activité ») avec indicateur d’étape, bouton « Suivant » et lien « Passer » | 2, 3 | P2 | ✅ photos provisoires |
| UX-03 | Accueil de première visite affiché une seule fois, sur mobile, uniquement quand on arrive par l’accueil (un lien partagé s’ouvre directement) | 1 à 4 | P2 | ✅ |
| UX-04 | Écran de connexion et création de compte via Google ; mentions légales ; « Continuer sans compte » pour visiter librement | 4 | P1 | 🟡 interface et API intégrées, configuration Firebase requise |
| UX-05 | Barre d’onglets mobile : Accueil, Catégories, Panier (nombre d’articles), Commandes, Profil | 5, 6, 8, 11 | P1 | ✅ |
| UX-06 | Accueil : ville de livraison et cloche dans un bandeau vert, recherche, bannière « Des produits locaux pour un avenir meilleur », grille de 8 catégories illustrées, produits populaires | 5 | P1 | ✅ la cloche mène au suivi des commandes |
| UX-07 | Écran Catégories en grille de cartes illustrées, avec sous-titre | 6 | P1 | ✅ |
| UX-08 | Fiche produit : grande photo avec boutons retour, favori et partage ; vignettes ; note et nombre d’avis ; prix et « En stock » ; couleurs et quantité côte à côte ; vendeur vérifié ; barre fixe « Ajouter au panier » / « Acheter maintenant » | 7 | P1 | ✅ |
| UX-09 | Panier : vignette, prix, sélecteur de quantité et corbeille par article ; code promo ; sous-total, livraison, total ; « Passer la commande » | 8 | P1 | ✅ |
| UX-10 | Paiement : liste des moyens (Orange Money, MTN, Moov, Wave, carte) en boutons radio ; numéro Mobile Money avec drapeau ; bouton « Payer … FCFA » ; mention « Paiement sécurisé » | 9 | P1 | ✅ adresse et mode de livraison ajoutés sur le même écran |
| UX-11 | Suivi : numéro et date de commande, chronologie verticale, message d’information, « Voir les détails de la commande » | 10 | P1 | ✅ |
| UX-12 | Profil : photo, nom, e-mail ; menu Mes commandes, Mes favoris, Mes adresses, Mes moyens de paiement, Notifications, Paramètres, Aide et support ; « Se déconnecter » | 11 | P1 | 🟡 « Notifications » non affiché (CMD-09) ; « Espace vendeur » ajouté au menu |
| UX-13 | Espace vendeur : sélecteur « Tableau de bord / Produits », carte de bienvenue, 4 indicateurs, commandes récentes, « Ajouter un produit », barre d’onglets vendeur (Accueil, Produits, Commandes, Statistiques, Menu) | 12 | P1 | ✅ indicateurs sans évolution en % (VEN-10) |
| UX-14 | Ajouter un produit : 3 emplacements photo, nom, description, prix, catégorie, stock, « Publier le produit » | 13 | P1 | ✅ |
| UX-15 | Flèche « retour » de chaque en-tête : revient à l’écran précédent, ou à un écran parent logique si la page a été ouverte directement | toutes | P1 | ✅ |
| UX-16 | Filtres du catalogue dans un panneau qui monte du bas de l’écran sur mobile ; catégories en pastilles défilantes | — | P2 | ✅ |
| UX-17 | Choix de la langue par drapeaux (français, anglais) | — | P1 | ✅ (voir 4.10) |
| UX-18 | Bannière d’accueil fournie par le porteur de projet ([docs/maquette/banniere-accueil-originale.jpg](maquette/banniere-accueil-originale.jpg)) : image de produits, titre « Des produits locaux pour un avenir meilleur », texte, boutons « Découvrir » et « Commencer à vendre » ; le texte est affiché par le site pour être traduit et cliquable | 5 | P1 | ✅ |
| UX-19 | Carte produit épurée : photo, badge, favori, nom, prix et note ; ni ville ni prix barré | 5, 6 | P1 | ✅ |

### 4.10 Langues (LNG)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| LNG-01 | Interface disponible en français et en anglais : textes, boutons, messages, notifications, titres des onglets du navigateur | P1 | ✅ |
| LNG-02 | Sélecteur avec drapeaux : en-tête (ordinateur), en-tête de l’accueil (mobile), écrans de présentation, écran de connexion, menu du profil | P1 | ✅ |
| LNG-03 | Langue mémorisée sur l’appareil ; à la première visite, langue du navigateur (anglais si le navigateur est en anglais, sinon français) | P1 | ✅ |
| LNG-04 | Catégories, statuts de commande, étapes du suivi, moyens de paiement, modes de livraison, codes promo et badges traduits | P1 | ✅ |
| LNG-05 | Messages d’erreur de l’API, dates des commandes et fiches produit (titres, descriptions) également traduits | P2 | ⬜ restent en français (voir D12) |

### 4.11 Application installable et hors ligne (PWA)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| PWA-01 | Manifeste : nom complet « Béthanie — Marketplace africaine », nom court « Béthanie », mode `standalone`, orientation portrait, couleur principale vert `#0F5132`, fond crème `#F8F5EF` | P1 | ✅ |
| PWA-02 | Icônes 192 × 192 et 512 × 512 (normales et adaptatives « maskable »), icône Apple, favicon | P1 | ✅ |
| PWA-03 | Écran de démarrage : celui d’Android (fond, icône, nom) puis logo animé pendant le chargement | P2 | ✅ |
| PWA-04 | Bouton et bannière « Installer l’application » visibles seulement quand l’installation est possible (`beforeinstallprompt`), qui disparaissent après installation, avec message de confirmation | P1 | ✅ |
| PWA-05 | Instructions d’installation pour iPhone / iPad (Partager → « Sur l’écran d’accueil ») | P1 | ✅ |
| PWA-06 | Fonctionnement hors ligne : pages, CSS, JavaScript, polices, icônes, illustrations et dernier catalogue consulté | P1 | ✅ |
| PWA-07 | Indication « Vous êtes actuellement hors connexion », puis « Connexion rétablie » au retour du réseau | P1 | ✅ |
| PWA-08 | Proposition de mise à jour quand une nouvelle version est publiée (« Mettre à jour ») | P2 | ✅ |
| PWA-09 | Raccourcis depuis l’icône (panier, catégories, suivi) et captures dans la fenêtre d’installation Android | P3 | ✅ |
| PWA-10 | Commandes et paiements préparés hors ligne puis envoyés au retour du réseau | P3 | ⬜ (lot 6) |

### 4.12 Motion design (MOT)

Règles : animations rapides (150 à 500 ms), uniquement sur `transform` et `opacity`, jamais bloquantes, et
toutes désactivées quand le téléphone ou l’ordinateur demande de réduire les animations.

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| MOT-01 | Transitions fluides entre les écrans ; la photo d’un produit s’agrandit de la carte vers la fiche (navigateurs compatibles, simple fondu ailleurs) | P2 | ✅ |
| MOT-02 | Apparition progressive des cartes et des listes ; sections de l’accueil révélées au défilement | P2 | ✅ |
| MOT-03 | Survol des cartes et boutons (élévation, ombre, reflet doré) ; léger enfoncement au clic | P2 | ✅ |
| MOT-04 | Micro-interactions : favori, ajout au panier, pastilles de nombre, cloche, chevrons, sélecteurs | P3 | ✅ |
| MOT-05 | Ouverture et fermeture animées des panneaux, menus et fenêtres | P2 | ✅ |
| MOT-06 | Notifications animées (entrée, sortie, barre de temps restant) | P3 | ✅ |
| MOT-07 | Compteurs et barres de statistiques animés | P3 | ✅ |
| MOT-08 | Squelettes de chargement à la place des roues de chargement | P2 | ✅ |
| MOT-09 | Logo animé au démarrage (dessin du chariot, halo, particules discrètes) | P3 | ✅ |
| MOT-10 | États visibles : chargement, succès, erreur (message qui tremble légèrement) | P2 | ✅ |
| MOT-11 | Transitions orientées sur mobile : l’écran suivant arrive de la droite, le retour de la gauche, les onglets en fondu | P2 | ✅ |
| MOT-12 | Bannière d’accueil animée : photo qui se pose puis effet de profondeur au défilement (mobile), titre mot par mot, soulignement doré, reflet régulier sur « Découvrir » | P2 | ✅ |
| MOT-13 | Ajout au panier : la photo du produit vole jusqu’à l’icône du panier, qui rebondit | P2 | ✅ |
| MOT-14 | Indicateurs qui glissent : onglet actif de la barre du bas, sélecteur de l’espace vendeur | P3 | ✅ |
| MOT-15 | Cartes produit inclinées en 3D au survol de la souris, avec reflet lumineux (ordinateur uniquement) | P3 | ✅ |
| MOT-16 | Paiement accepté : coche dessinée et confettis ; total du panier qui défile quand une quantité change | P3 | ✅ |
| MOT-17 | Réglage « Animations » dans le Profil : Automatique (réglage de l’appareil), Toujours activées, Réduites | P1 | ✅ |
| MOT-18 | Onde au toucher sur les boutons principaux | P3 | ✅ |
| MOT-19 | Favori : anneau et éclats autour du cœur | P3 | ✅ |
| MOT-20 | Champ de recherche qui propose des exemples en les « tapant » | P3 | ✅ |
| MOT-21 | Suivi de commande : camion qui roule jusqu’à l’étape en cours, étape en cours qui « émet » | P2 | ✅ |
| MOT-22 | Bouton « Ajouter au panier » de la fiche qui devient « Ajouté ! » ; panneaux toujours au-dessus de la barre d’onglets | P2 | ✅ |

> **Réduire les animations** : sous Windows, ce réglage est activé quand **Paramètres › Accessibilité › Effets
> visuels › Effets d’animation** est désactivé. Le navigateur le transmet au site, qui coupe alors toutes les
> animations (R24). Pour voir le motion design sur un PC, ce réglage doit être activé.

### 4.13 Assistant vendeur et compétences (AGV)

Cette fonctionnalité est **définie fonctionnellement, mais pas encore implémentée**. Elle propose un assistant
unique dans l’espace vendeur, doté de compétences spécialisées. Le détail des parcours, limites et critères de
recette figure dans [la spécification fonctionnelle de l’assistant vendeur](AGENT_VENDEUR.md). Aucun fournisseur
ni choix d’intégration technique n’est défini à ce stade.

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| AGV-01 | L’assistant aide le vendeur à préparer et gérer les tâches de sa propre boutique ; il ne remplace pas le vendeur et n’agit jamais sans validation explicite | P1 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |
| AGV-02 | Compétence « Rédiger une fiche produit » : proposer un brouillon structuré à partir des informations fournies, sans inventer de caractéristiques ; le vendeur relit et publie lui-même | P1 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |
| AGV-03 | Compétence « Suivre le stock » : expliquer les niveaux de stock et repérer les produits signalés comme faibles ; toute modification reste soumise à confirmation | P1 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |
| AGV-04 | Compétence « Traiter les commandes » : résumer les commandes de la boutique, expliquer leur statut et guider vers l’étape disponible ; toute avancée de statut reste confirmée par le vendeur et soumise aux règles existantes | P1 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |
| AGV-05 | Compétence « Comprendre l’activité » : résumer les indicateurs vendeur disponibles, sans présenter comme certaines des tendances que les données ne permettent pas d’établir | P2 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |
| AGV-06 | Compétence « Être guidé dans l’espace vendeur » : expliquer les fonctions existantes et orienter vers le bon écran ; signaler les sujets non couverts plutôt que d’inventer une règle | P2 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |
| AGV-07 | L’assistant répond en français et en anglais, respecte l’accès du vendeur à ses seules données et n’exécute aucune action irréversible sans confirmation | P1 | 🟡 réalisé, à valider avec une clé Claude (AGV-R1 à R8) |

### 4.14 Contrôle des transactions et commission (TRX)

| ID | Exigence | Priorité | Statut |
|---|---|---|---|
| TRX-01 | À chaque commande, calcul par boutique de la commission de Béthanie (5 % du prix des articles) et de la part du vendeur (95 %), enregistrés avec le taux | P1 | ✅ |
| TRX-02 | Contrôle des montants à chaque transaction (articles, total, remise, répartition) ; transaction refusée et annulée en cas d’écart | P1 | ✅ |
| TRX-03 | Commission « prévue » à la commande, « acquise » au paiement (ou à la livraison si paiement à la livraison), dans la même opération que le paiement | P1 | ✅ |
| TRX-04 | Journal des transactions scellé (chaque ligne liée à la précédente) ; toute modification détectée | P1 | ✅ (sceau HMAC avec `TRANSACTIONS_SECRET`) |
| TRX-05 | Rapport administrateur : commission perçue et à percevoir, par boutique, écarts, intégrité du journal (Profil et `npm run controle`) | P1 | ✅ |
| TRX-06 | Rôle administrateur attribué par adresse Google vérifiée (`ADMIN_EMAILS`) | P1 | ✅ |
| TRX-07 | Encaissement réel sur le compte de Béthanie et reversement de la part des vendeurs (VEN-08) | P1 | ⬜ lot 3 (paiement réel) |
| TRX-08 | Commande non payée depuis 2 heures : annulée automatiquement, stock remis en vente, commission annulée et journalisée ; le client voit « Annulée » et l’explication dans le suivi | P1 | ✅ |
| TRX-09 | Au plus 10 commandes par heure et par compte | P2 | ✅ |

---

## 5. Règles de gestion

Les règles RG-01 à RG-03 sont codées une seule fois dans `src/utils/commerce.ts`, utilisé à la fois par le
site et par le serveur.

### RG-01 — Frais de livraison

| Mode | Abidjan | Autres villes de Côte d’Ivoire | Dakar |
|---|---|---|---|
| Express (24 h) | 2 500 FCFA | non proposé | non proposé |
| Standard (48–72 h) | 1 500 FCFA | 3 000 FCFA | 5 000 FCFA |
| Point relais (48 h) | 1 000 FCFA | 1 000 FCFA | 1 000 FCFA |

- La livraison **standard** est offerte à partir de **100 000 FCFA** de sous-total.
- La livraison **express** est réservée à Abidjan (contrôlé par le serveur).

### RG-02 — Codes promo

Un seul code par commande, calculé sur le sous-total :

| Code | Effet |
|---|---|
| `BETHANIE10` | −10 % du sous-total, plafonné à 10 000 FCFA |
| `BIENVENUE` | −2 000 FCFA (sans dépasser le sous-total) |
| `LIVRAISON` | Frais de livraison offerts |

### RG-03 — Cycle de vie d’une commande

`Confirmée → En préparation → Expédiée → En livraison → Livrée`

- Peuvent faire avancer une commande : le **vendeur** dont un article figure dans la commande, un
  **administrateur**, ou le **client lui-même en mode démonstration** uniquement.
- Une commande dont le paiement est **en attente** ne peut pas avancer.
- Un livreur est attribué au passage à « En livraison ».
- Une commande réglée à la livraison passe en « payée » lorsqu’elle est livrée.

### RG-04 — Statuts de paiement

| Statut | Signification |
|---|---|
| `en_attente` | Paiement Mobile Money / carte lancé, pas encore confirmé |
| `payé` | Paiement confirmé (ou encaissé à la livraison) |
| `à_la_livraison` | Le client paiera au livreur |
| `échoué` | Prévu pour le lot 3 (paiement refusé ou expiré) |

### RG-05 — Stock

- Le stock est décrémenté à la création de la commande, dans une transaction.
- Si deux clients achètent le dernier article en même temps, un seul obtient la commande ; l’autre reçoit
  « vient d’être épuisé ».
- Remise en stock en cas d’échec de paiement ou d’annulation : **⬜ lot 3**.

### RG-06 — Prix et historique

- Le prix payé est figé dans la commande : une baisse ou une hausse ultérieure ne modifie pas les commandes passées.
- Un produit supprimé par son vendeur disparaît du catalogue mais reste visible dans les commandes existantes.

### RG-07 — Boutiques

- Une seule boutique par compte.
- Une nouvelle boutique est « en cours de vérification » ; le badge « vendeur vérifié » n’apparaît que pour les
  boutiques vérifiées. Depuis la v1.4, l’accueil ne présente plus de liste de boutiques ; chaque boutique reste
  accessible par « Voir la boutique » sur ses fiches produit.

### RG-08 — Avis

- Note de 1 à 5 et texte de 3 à 1 000 caractères ; un avis par client et par produit.
- « Achat vérifié » uniquement si le client a une commande contenant ce produit.
- La note moyenne du produit est recalculée à chaque nouvel avis.

### RG-09 — Commission de 5 % (validée le 5 octobre 2026)

Béthanie perçoit **5 % du prix des articles** de chaque vente ; le vendeur garde 95 %. La commission est calculée par
boutique et par commande, arrondie au franc CFA ; la part du vendeur est le reste. Les frais de livraison et les codes
promo (financés par Béthanie) n’entrent pas dans le calcul. Le contrôleur des transactions (4.14) calcule, vérifie et
journalise la commission à chaque transaction. **Reste à faire** : encaissement réel et reversement des 95 % aux
vendeurs (VEN-08, « sous 48 h » annoncé), avec le paiement réel (lot 3).

### RG-10 — Commandes multi-vendeurs

Une commande peut contenir des articles de plusieurs boutiques. Dans la version actuelle elle a **un seul
statut** : si deux vendeurs sont concernés, le premier qui fait avancer la commande la fait avancer pour tous.
**À faire avant le lancement (P1)** : découper chaque commande en sous-commandes par vendeur, chacune avec
son propre statut et son propre livreur.

---

## 6. Exigences non fonctionnelles

### 6.1 Sécurité

| ID | Exigence | Statut |
|---|---|---|
| SEC-01 | Mots de passe hachés (scrypt avec sel), jamais stockés en clair | ✅ |
| SEC-02 | Sessions côté serveur, cookie inaccessible au JavaScript (`HttpOnly`), `SameSite=Lax` ; `Secure` en HTTPS | ✅ (`COOKIE_SECURE=true` à activer en production) |
| SEC-03 | Protection contre les requêtes intersites (CSRF) | ✅ |
| SEC-04 | Limitation des tentatives de connexion et d’inscription | ✅ (20 par 15 minutes et par adresse IP) |
| SEC-05 | Contrôle des droits sur chaque ressource (commandes, produits, adresses…) | ✅ |
| SEC-06 | Validation de toutes les entrées ; requêtes SQL paramétrées | ✅ |
| SEC-07 | Photos : formats contrôlés par leur contenu réel, taille limitée, SVG refusé | ✅ |
| SEC-08 | Aucune donnée de carte bancaire ne transite par nos serveurs (page de paiement de l’agrégateur) | 🟡 à garantir lors du lot 3 |
| SEC-09 | En-têtes de sécurité et politique de contenu (CSP) | ✅ |
| SEC-10 | Site servi uniquement en HTTPS | ⬜ mise en production |

### 6.2 Données personnelles

- Respect de la **loi ivoirienne n° 2013-450** relative à la protection des données à caractère personnel
  (autorité : ARTCI) et, pour les clients sénégalais, de la **loi n° 2008-12** (autorité : CDP).
  **[À valider par un juriste]** : déclarations, mentions légales, politique de confidentialité, durée de conservation.
- Données collectées : nom, e-mail, téléphone, adresses, historique de commandes. Aucune donnée de carte complète.
- Droits des personnes (accès, rectification, suppression) : rectification ✅, suppression et export ⬜ (CPT-09).

### 6.3 Ergonomie et accessibilité

| ID | Exigence | Statut |
|---|---|---|
| ERG-01 | Conception « mobile d’abord », sans défilement horizontal à partir de 360 px de large | ✅ (vérifié à 360 px sur 11 écrans) |
| ERG-02 | Interface en français et en anglais (section 4.10) ; montants en FCFA ; heures au fuseau d’Abidjan | ✅ |
| ERG-03 | Messages d’erreur compréhensibles, en français, affichés près du champ concerné | ✅ |
| ERG-04 | Formulaires utilisables au clavier, champs étiquetés, boutons-icônes nommés, focus visible, notifications annoncées aux lecteurs d’écran | 🟡 mis en place, audit à faire |
| ERG-05 | Contrastes conformes au niveau AA des WCAG | 🟡 à auditer (le doré sur fond clair est réservé aux grands textes) |
| ERG-06 | Zones tactiles d’au moins 40 px ; actions principales à portée de pouce (barres fixées en bas) | ✅ |
| ERG-07 | Animations désactivées si le téléphone le demande (réduction des animations) | ✅ |
| ERG-08 | Prise en compte de l’encoche et de la barre système des téléphones récents | ✅ |

### 6.4 Performance (objectifs proposés)

| ID | Objectif | Statut |
|---|---|---|
| PERF-01 | Première page affichée en moins de 3 s sur une connexion 4G moyenne | ⬜ à mesurer |
| PERF-02 | Réponse de l’API en moins de 300 ms pour 95 % des requêtes | ⬜ à mesurer |
| PERF-03 | Photos redimensionnées avant envoi (800 px) pour économiser les données mobiles | ✅ |
| PERF-04 | Écrans peu fréquents chargés à la demande (paiement, suivi, compte, espace vendeur) | ✅ (fichier principal : 116 Ko compressé) |
| PERF-05 | Polices et icônes servies par le site, sous-ensembles utiles seulement, polices principales préchargées | ✅ |
| PERF-06 | Fichiers compilés en cache longue durée ; visites suivantes servies par le service worker | ✅ |
| PERF-07 | Animations sans effet sur la fluidité (transform et opacity uniquement) | ✅ |

### 6.5 Exploitation

| ID | Exigence | Statut |
|---|---|---|
| EXP-01 | Sauvegarde quotidienne de la base et des photos, avec test de restauration | ⬜ |
| EXP-02 | Journalisation des erreurs et alertes | 🟡 erreurs écrites dans la console |
| EXP-03 | Tests automatisés (API et parcours d’achat) exécutés avant chaque mise en ligne | ⬜ |
| EXP-04 | Compatibilité : navigateurs récents (Chrome, Edge, Firefox, Safari), Android 9 et plus | 🟡 testé sur Edge |

### 6.6 Charte graphique

| Élément | Règle |
|---|---|
| Logo | Silhouette de l’Afrique dorée contenant un chariot vert ; nom « BÉTHANIE » en doré ; slogan « Achetez • Vendez • Bénissez » |
| Couleur principale | Vert Béthanie `#0F5132` : en-têtes, boutons principaux, prix, éléments actifs |
| Couleur d’accent | Or `#E5A93C` : « Acheter maintenant », « Découvrir », badges, indicateurs d’étape |
| Fonds | Crème `#F8F5EF` pour les pages, blanc pour les cartes |
| Typographie | **Poppins** pour toute l’interface : 400 texte, 500 éléments secondaires, 600 boutons et sous-titres, 700 grands titres ; **Cinzel** 700 pour le nom « BÉTHANIE » (capitales élégantes, doré) |
| Motif | Losanges dorés inspirés du kente et du bogolan (écran de démarrage, bannières, pied de page) |
| Formes | Coins arrondis (cartes 16 px, boutons 12 px), ombres légères |
| Catégories | Une illustration par catégorie (objets sur fond de cercle pastel et socle doré), toujours accompagnée de son nom |
| Moyens de paiement | Pastilles aux couleurs de chaque opérateur ; les logos officiels ne sont utilisés qu’avec l’accord des opérateurs **[À valider]** |
| Bannière d’accueil | Photo de produits (mode, électroménager, high-tech, épices) sur fond vert ; titre blanc et or, bouton or « Découvrir », bouton contour « Commencer à vendre » |
| Contact affiché | E-mail `contact@bethanie.ci` et téléphone dans le pied de page ; aucun numéro WhatsApp (voir D11) |

---

## 7. Contraintes techniques

| Sujet | Choix actuel |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Node.js 22.13+ (testé avec 26), Express 5, validation zod |
| Base de données | SQLite intégré à Node (`node:sqlite`), un fichier `server/data/bethanie.db` |
| Photos | Fichiers sur le disque du serveur (`server/data/uploads/`) |
| Services tiers | Firebase Authentication uniquement pour Google ; comptes applicatifs et données Béthanie restent dans SQLite ; polices et icônes hébergées par le site |
| Hébergement | À définir (voir section 10) ; un seul processus sert le site et l’API |

Le détail technique est dans [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 8. Interfaces externes

| Service | Usage | Statut |
|---|---|---|
| Agrégateur Mobile Money / carte (CinetPay, PayDunya ou équivalent) | Encaissement, confirmation par webhook, remboursements | ⬜ lot 3 |
| SMS / WhatsApp Business / e-mail | Codes de vérification, notifications de commande | ⬜ lot 3 |
| Partenaire de livraison | Prise en charge des colis, statut de livraison | ⬜ lot 4 |
| Google Fonts, cdnjs (Font Awesome) | Polices et icônes | Retirés en v1.3 : fichiers hébergés par le site (hors ligne, rapidité) |

---

## 9. Découpage en lots et avancement

| Lot | Contenu | Statut |
|---|---|---|
| **1. Frontend** | Les 8 écrans, parcours d’achat et espace vendeur avec données de démonstration | ✅ terminé |
| **2. Backend** | API, base de données, comptes, commandes, stock, avis, photos, sécurité | ✅ terminé |
| **1 bis. Refonte UX/UI** | Maquette de 13 écrans (section 4.9) : présentation mobile, accueil de première visite, écran Catégories illustré, espace vendeur à onglets et statistiques, 3 photos par produit | ✅ terminé (restent CPT-10, CPT-11, VEN-10) |
| **3. Paiements et notifications** | Agrégateur Mobile Money / carte, webhook, échecs et remises en stock, OTP téléphonique si retenu, SMS / WhatsApp | ⬜ |
| **4. Opérations** | Espace administrateur, vérification des boutiques, modération, litiges, sous-commandes par vendeur, reversements, codes promo administrables | ⬜ |
| **5. Mise en production** | Hébergement, nom de domaine, HTTPS, sauvegardes, supervision, tests automatisés, mentions légales et CGV | ⬜ |
| **6. Mobile** | Application installable (PWA) puis, si besoin, applications Android / iOS | 🟡 PWA réalisée (4.11) ; applications natives à décider |
| **7. Assistant vendeur** | Assistant unique et compétences AGV-01 à AGV-07 | 🟡 réalisé (Claude Opus 5.5) ; à activer avec `ANTHROPIC_API_KEY` et à valider (AGV-R1 à R8) |

Les durées de chaque lot sont à estimer une fois les décisions de la section 10 prises.

---

## 10. Décisions à prendre

| # | Question | Impact |
|---|---|---|
| D1 | Quel agrégateur de paiement ? (frais, moyens couverts, délais de reversement) | Lot 3 |
| D2 | Taux de commission et délai de reversement aux vendeurs (5 % et 48 h affichés aujourd’hui) | RG-09, VEN-08 |
| D3 | Hébergement : serveur dédié / VPS, ou passage à Firebase plus tard ? | Lot 5, architecture |
| D4 | Partenaire de livraison et grille tarifaire définitive | RG-01, lot 4 |
| D5 | Politique de retour et de remboursement (7 jours annoncés) | CMD-07, CGV |
| D6 | Critères de vérification des vendeurs (pièces demandées, contrôle) | ADM-01 |
| D7 | Contenus juridiques : CGU, CGV, politique de confidentialité, mentions légales | Lot 5 |
| D8 | Décision : Google uniquement pour la connexion et la création de compte de cette version ; la connexion par téléphone/SMS est reportée | CPT-10 réalisé sous réserve de configuration, CPT-11 reporté |
| D9 | Photos et illustrations définitives : droits d’utilisation des illustrations de catégories et de la bannière fournies, photos officielles pour l’accueil et les écrans de présentation, versions haute définition | UX-02, UX-06, UX-07 |
| D10 | Contenu de l’entrée « Notifications » du profil (commandes, promotions, messages des vendeurs) et canal (SMS, WhatsApp, notification du téléphone) | UX-12, CMD-09 |
| D11 | Numéro de contact officiel : le numéro WhatsApp a été retiré de l’interface ; faut-il un numéro WhatsApp Business, et le téléphone du pied de page est-il le bon ? | UX-12, pied de page |
| D12 | Traduction des fiches produit : saisie bilingue par le vendeur, traduction automatique proposée, ou français seulement | LNG-05 |

---

## 11. Recette : critères d’acceptation

Chaque lot est accepté lorsque ses scénarios passent sur l’environnement de recette.

| # | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| R1 | Un visiteur ajoute un produit au panier puis clique sur « Passer la commande » | L’écran de connexion s’affiche ; après connexion, le paiement reprend avec le panier intact | ✅ |
| R2 | Le client paie par Wave une commande avec un code promo | Montants identiques entre le panier et la commande enregistrée ; stock diminué ; commande visible dans le suivi | ✅ (paiement simulé) |
| R3 | Un client modifie le prix dans son navigateur avant de commander | Le serveur ignore le prix envoyé et applique le prix en base | ✅ |
| R4 | Deux clients commandent le dernier article en même temps | Une seule commande aboutit | ✅ |
| R5 | Un client tente d’ouvrir la commande d’un autre client | Réponse « commande introuvable » | ✅ |
| R6 | Un vendeur ouvre sa boutique et publie un produit avec photo | Le produit apparaît dans le catalogue et sur la page boutique | ✅ |
| R7 | Un nouveau client achète ce produit ; le vendeur traite la commande | La commande apparaît chez le vendeur (ses articles seulement) et avance jusqu’à « Livrée » | ✅ |
| R8 | Un vendeur tente de modifier le produit d’une autre boutique | Refus « Ce produit n’appartient pas à votre boutique » | ✅ |
| R9 | Envoi d’un fichier texte déguisé en photo | Refus « Le fichier ne correspond pas à une image valide » | ✅ |
| R10 | Paiement Mobile Money refusé chez l’agrégateur | Commande annulée, stock rétabli, client informé | ⬜ lot 3 |
| R11 | Affichage sur un téléphone de 360 px de large | Aucun défilement horizontal ; menu et panier accessibles | ✅ (vérifié à 360 px) |
| R12 | Première visite sur mobile par l’accueil | Démarrage, deux écrans de présentation, puis « Connectez-vous » ; « Continuer sans compte » mène à l’accueil ; rien ne s’affiche à la visite suivante | ✅ |
| R13 | Accueil → catégorie Mode → produit → flèche retour → flèche retour | Retour au catalogue Mode, puis à l’accueil | ✅ |
| R14 | Un vendeur publie un produit avec 3 photos | La fiche produit affiche les 3 photos en vignettes, la première en grand | ✅ |
| R15 | Le client vide son panier puis touche « Annuler » | Le panier est rétabli à l’identique | ✅ |
| R16 | Navigation par la barre d’onglets vendeur (Accueil, Produits, Commandes, Statistiques, Menu) | Chaque onglet a sa propre adresse ; le bouton retour du téléphone revient à l’onglet précédent | ✅ |
| R17 | Sur l’accueil en français, toucher le drapeau anglais puis recharger la page | Bannière, barre d’onglets et titre de l’onglet du navigateur passent en anglais ; l’anglais est conservé après rechargement | ✅ |
| R18 | Parcourir les écrans en anglais sur un téléphone de 360 px | Aucun défilement horizontal (12 écrans vérifiés) | ✅ |
| R19 | Contrôle d’installabilité du navigateur sur la version compilée | Aucune erreur de manifeste ni d’installabilité ; service worker actif ; 34 fichiers en pré-cache | ✅ |
| R20 | Ordinateur ou Android : le navigateur propose l’installation | Bouton « Installer » dans l’en-tête et bannière sur l’accueil ; après installation, ils disparaissent et « Application installée ! » s’affiche | ✅ bouton vérifié ; fenêtre native à tester sur un vrai appareil |
| R21 | iPhone : toucher « Installer l’application » | Instructions Partager → « Sur l’écran d’accueil » → « Ajouter » | ✅ |
| R22 | Serveur arrêté et réseau coupé, recharger l’accueil puis ouvrir Catégories | L’application s’affiche avec la bannière, les produits et les 8 catégories ; pastille « Vous êtes actuellement hors connexion » | ✅ |
| R23 | Retour du réseau | « Connexion rétablie » pendant 3 secondes | ✅ |
| R24 | « Réduire les animations » activé sur l’appareil | Aucun contenu masqué, aucune animation | ✅ |
| R25 | 360, 768, 1024 et 1440 px, en français et en anglais | Aucun défilement horizontal, aucun texte de bouton coupé | ✅ |
| R26 | Publication d’une nouvelle version alors que l’application est ouverte | Notification « Une nouvelle version de Béthanie est disponible » → « Mettre à jour » recharge la nouvelle version | ⬜ à tester lors du premier déploiement |
| R27 | Mobile : Accueil → une catégorie → flèche retour → onglet Catégories | Le catalogue arrive de la droite, le retour arrive de la gauche, l’onglet passe en fondu ; la pastille de la barre du bas glisse jusqu’à l’onglet | ✅ |
| R28 | Toucher « + » sur une carte produit (mobile et ordinateur) | La photo vole jusqu’au panier (barre du bas ou en-tête), qui rebondit ; le nombre d’articles augmente | ✅ |
| R29 | Ordinateur : passer la souris sur une carte produit | La carte s’incline légèrement vers le pointeur avec un reflet ; elle se redresse quand la souris sort | ✅ |
| R30 | Payer une commande (compte de démonstration) | Coche dessinée, confettis, puis ouverture du suivi de la commande | ✅ |
| R31 | Accueil au chargement | Photo de la bannière qui se pose, titre mot par mot, soulignement doré ; aucun défilement horizontal à 360, 768, 1024 et 1440 px | ✅ |
| R32 | Profil → Animations → « Toujours activées » sur un PC Windows aux effets d’animation coupés | Les animations jouent ; « Réduites » les coupe ; le choix est gardé | ✅ |
| R33 | Toucher un bouton principal ; ajouter un favori | Onde au point touché ; éclats autour du cœur | ✅ |
| R34 | Suivi d’une commande expédiée | Le camion avance jusqu’à mi-parcours, l’étape en cours émet | ✅ |
| R35 | Ouvrir les filtres du catalogue ou le réglage Animations sur téléphone | Le panneau est au-dessus de la barre d’onglets | ✅ |
| R36 | « Continuer avec Google » (compte nouveau, compte existant, adresse déjà liée à un autre compte Google) | Compte créé / lié / refusé ; session ouverte et conservée après rechargement | ✅ en mode test Firebase ; vraie fenêtre Google à tester après configuration |
| R37 | Assistant vendeur sans clé | Message « pas encore activé » ; journal du serveur qui nomme `ANTHROPIC_API_KEY` | ✅ |
| R38 | Assistant vendeur : stock faible, commandes, fiche produit | Propositions avec « Confirmer » ; rien ne change sans clic ; produit d’une autre boutique refusé ; formulaire pré-rempli | ✅ avec une doublure de l’API ; à refaire avec une vraie clé |
| R39 | Commande de produits de deux boutiques, paiement Mobile Money | Commission de 5 % par boutique (ex. 2 500 FCFA sur 50 000, 900 FCFA sur 18 000), « prévue » puis « acquise » après paiement | ✅ |
| R40 | Commande payée à la livraison | Commission « prévue » jusqu’à la livraison, « acquise » à la livraison | ✅ |
| R41 | Transaction dont un montant est faussé | Refusée, aucune commande créée, stock inchangé, alerte au journal | ✅ (simulé par un déclencheur de base de données) |
| R42 | Total d’une commande ou ligne du journal modifié directement dans la base | Écart et ligne modifiée signalés par le rapport et `npm run controle` (code de sortie 1) | ✅ |
| R43 | Profil d’un administrateur (`ADMIN_EMAILS`) / d’un client | Carte « Commissions Béthanie » visible / absente ; rapport refusé au client (403) | ✅ |
| R44 | Pages du site en ligne | En-têtes de sécurité présents (politique de contenu, protection contre l’affichage dans un cadre), aucune erreur dans le navigateur | ✅ sur la version Vercel simulée ; à revérifier après mise en ligne |

---

## 12. Livrables

| Livrable | Emplacement | Statut |
|---|---|---|
| Code source du site | `src/` | ✅ |
| Code source de l’API | `server/` | ✅ |
| Documentation d’installation | [README.md](../README.md) | ✅ |
| Dossier d’architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | ✅ |
| Cahier des charges | ce document | ✅ |
| Jeu de données de démonstration | `server/seed-data.ts` | ✅ |
| Crédits des photos provisoires | `public/images/CREDITS.md` | ✅ |
| Maquette UX/UI de référence et planche des catégories | `docs/maquette/` | ✅ |
| Illustrations des catégories | `public/images/categories/` | ✅ (320 px, voir D9) |
| Bannière d’accueil (texte retiré) | `public/images/banner/` | ✅ (voir D9) |
| Dictionnaires de traduction français / anglais | `src/i18n/` | ✅ |
| Manifeste, icônes, captures et service worker | `public/manifest.webmanifest`, `public/icons/`, `public/screenshots/`, `src/pwa/` | ✅ |
| Polices et icônes hébergées | `public/fonts/`, `public/vendor/fontawesome/` | ✅ |
| Tests automatisés | — | ⬜ |
| Procédure de déploiement et de sauvegarde | — | ⬜ lot 5 |

---

## 13. Glossaire

| Terme | Définition |
|---|---|
| **Agrégateur de paiement** | Prestataire qui encaisse les paiements Mobile Money et carte pour le compte de la plateforme |
| **CSRF** | Attaque qui fait exécuter une action à un utilisateur connecté depuis un autre site |
| **FCFA** | Franc CFA (XOF), monnaie de la Côte d’Ivoire et du Sénégal |
| **Marketplace** | Plateforme où plusieurs vendeurs indépendants vendent à des acheteurs |
| **Mobile Money** | Porte-monnaie électronique lié à un numéro de téléphone (Orange Money, Wave, MTN MoMo, Moov Money) |
| **OTP** | Code à usage unique envoyé par SMS pour vérifier un numéro |
| **Point relais** | Commerce partenaire où le client retire son colis |
| **Reversement** | Paiement au vendeur du montant de ses ventes, commission déduite |
| **Sous-commande** | Partie d’une commande qui concerne un seul vendeur |
| **Webhook** | Appel envoyé par l’agrégateur au serveur pour confirmer un paiement |
