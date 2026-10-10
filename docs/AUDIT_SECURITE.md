# Audit de sécurité — Béthanie

> Audit du 5 octobre 2026 — code de la branche de travail (après connexion Google, assistant vendeur et contrôleur
> des transactions) et site en ligne https://bethanie.vercel.app (lecture seule). Compléments : 5 octobre (§ 7) et
> 10 octobre 2026 (§ 8, rapport Herozion).
> Agent responsable : `.claude/agents/securite.md` ; méthode : `.claude/skills/audit-securite/SKILL.md`.

## Synthèse

État au 10 octobre 2026 (§ 1, 7 et 8) :

| | Nombre |
|---|---|
| Corrigés | 24 (S1 à S23, C1) |
| À traiter **avant d’encaisser de vrais paiements** | 2 (C2 base permanente, C3 reversements aux vendeurs) |
| Moyens | 4 (dont 1 conservé par décision) |
| Faibles | 5 |
| Points conformes vérifiés | 6 |
| Alertes de scanner vérifiées et sans danger | 9 |

**En une phrase** : les montants sont fiables et contrôlés à chaque transaction (commission de 5 % comprise) et seul
GeniusPay peut marquer une commande payée (simulation supprimée le 7 octobre), mais Béthanie ne doit pas encore
encaisser d’argent réel : en ligne, les données restent temporaires tant que la base Turso n’est pas branchée.

Gravité : **Critique** = perte d’argent ou de données certaine en usage réel ; **Élevée** = exploitable facilement ;
**Moyenne** = exploitable dans certaines conditions ; **Faible** = impact limité ; **Info** = constat.

## 1. Corrigés dans cette version

| ID | Gravité | Constat | Correction |
|---|---|---|---|
| S1 | Élevée | La commission de 5 % (RG-09) était seulement **affichée** : ni calculée, ni enregistrée, ni contrôlée par le serveur ; rien ne permettait de savoir ce que Béthanie doit percevoir | **Contrôleur des transactions** (`server/transactions.ts`) : répartition par boutique à chaque commande (5 % pour Béthanie, 95 % pour le vendeur), contrôle des montants, transaction refusée en cas d’écart, journal scellé, rapport administrateur, `npm run controle` |
| S2 | Élevée | En ligne, les pages du site n’avaient **aucun en-tête de sécurité** : pas de politique de contenu, rien n’empêchait un autre site d’afficher Béthanie dans un cadre pour piéger un clic (« clickjacking »), pas de `nosniff` (constaté par `curl -I`) | Politique de contenu, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` ajoutés aux pages Vercel ; règles communes au serveur et à Vercel (`server/security-policy.js`) ; aucune erreur dans le navigateur |
| S3 | Moyenne | En mode « serveur unique » (`npm start`), la règle d’ouverture de fenêtre (`Cross-Origin-Opener-Policy: same-origin`) coupait le lien entre le site et la fenêtre Google ouverte par Firebase : connexion bloquée ou incertaine | `same-origin-allow-popups` |
| S4 | Moyenne | Le rôle administrateur existait sans aucun moyen de l’attribuer | Variable `ADMIN_EMAILS` : rôle admin à la connexion Google pour ces adresses vérifiées ; route `/api/admin/transactions` réservée |
| S5 | Moyenne | Commandes non payées : stock bloqué sans limite de temps, nombre de commandes illimité (ancien M2) | Commande non payée depuis **2 heures** : annulée automatiquement (statut « Annulée », paiement « échoué »), stock remis en vente, commission annulée et inscrite au journal ; **10 commandes par heure** et par compte (décision du 5 octobre 2026). Testé : stock 18 → 17 → 18, onzième commande refusée |
| S6 | Moyenne | En ligne, le serveur ne connaissait pas le projet Firebase : « La connexion Google n’est pas configurée sur le serveur » | L’identifiant du projet (public) est repris des réglages de Vercel à la construction et intégré au serveur ; vérifié : un faux jeton est refusé (401) au lieu de l’erreur de configuration (503) |
| S7 | Faible | Double bouton « Créer un compte avec Google » / « Continuer avec Google » (même action) | Un seul bouton ; le compte est créé automatiquement à la première connexion |

## 2. Critiques — à traiter avant tout paiement réel

| ID | Gravité | Constat | Conséquence | Correction proposée |
|---|---|---|---|---|
| C1 | Critique | En ligne, `PAYMENT_PROVIDER=simulation` et `DEMO_MODE=true` (réponse de `/api/config`) : tout client connecté peut déclarer **sa** commande « payée » (`POST /api/orders/:id/pay`) et, en mode démo, la faire avancer jusqu’à « livrée » | Les commissions « perçues » du rapport sont **fictives** tant que le paiement n’est pas réel ; un client pourrait obtenir une commande marquée payée sans payer | Lot 3 : agrégateur Mobile Money / carte (CinetPay, PayDunya…) avec confirmation signée par le prestataire (webhook) ; `DEMO_MODE=false` ; retirer la route de paiement simulé |
| C2 | Critique | Sur Vercel, la base est dans `/tmp` (limite L22) ; chaque instance a la sienne (cause des « 401 » sur `/api/orders` constatés en ligne : session ouverte sur une instance, inconnue d’une autre) | Commandes, répartitions et **journal des commissions effacés** à chaque redémarrage de l’instance | Base Turso : **code prêt** (7 octobre 2026), il reste à définir `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` sur Vercel ; stockage des photos (Vercel Blob) |
| C3 | Élevée | Pas d’encaissement centralisé ni de reversement aux vendeurs (VEN-08) | La commission n’est « perçue » que si l’argent des clients arrive sur le compte de Béthanie, qui reverse ensuite 95 % | Compte marchand Béthanie chez l’agrégateur ; reversements automatiques depuis la table `order_settlements` (part vendeur), relevé par vendeur |

## 3. Moyens

| ID | Constat | Conséquence | Correction proposée |
|---|---|---|---|
| M1 | Codes promo réutilisables sans limite (`BIENVENUE` à chaque commande, `BETHANIE10`…) | Les remises sont à la charge de Béthanie (la commission est calculée sur le prix des articles) : un client peut les cumuler commande après commande | **Conservé tel quel** par décision du porteur de projet (5 octobre 2026) ; à revoir si les remises coûtent trop |
| M3 | Sans compte de service Firebase, un compte Google désactivé dans la console peut encore se connecter pendant la durée de son jeton (1 h) | Accès d’un compte banni pendant une heure | Ajouter `FIREBASE_CLIENT_EMAIL` et `FIREBASE_PRIVATE_KEY` en production |
| M4 | Le journal des transactions est scellé par une simple empreinte tant que `TRANSACTIONS_SECRET` n’est pas défini | Quelqu’un ayant accès à la base pourrait réécrire tout le journal de façon cohérente | Définir `TRANSACTIONS_SECRET` (longue chaîne aléatoire, à garder et ne jamais retirer) ; sur une base qui a déjà des transactions, lancer une fois `npm run controle -- --sceller` ; à terme, copie du journal hors de la base. Testé : montant modifié, ligne recalculée sans la clé, journal entier converti, clé retirée → tous signalés |

## 4. Faibles

| ID | Constat | Correction proposée |
|---|---|---|
| F1 | Commande multi-vendeurs à statut unique (RG-10) : un vendeur peut faire avancer la commande d’un autre, jusqu’à « livrée » (qui déclenche l’encaissement en paiement à la livraison) | Sous-commandes par vendeur (déjà prévu P1) |
| F2 | Un vendeur peut acheter ses propres produits (statistiques gonflées) ; la commission reste due | Signaler ces commandes dans le rapport administrateur |
| F3 | En mode `npm start` derrière un proxy, l’adresse des visiteurs n’est pas lue (`trust proxy`) : la limitation des tentatives de connexion est commune à tous | Réglé sur Vercel ; à régler sur tout autre hébergeur |
| F4 | Assistant vendeur : les titres de produits sont transmis à l’IA ; un vendeur pourrait y glisser des consignes | Effet limité à sa propre boutique ; l’IA ne peut que proposer, le serveur vérifie chaque proposition |
| F5 | Données personnelles (adresses, téléphones) sans durée de conservation ni politique de confidentialité ; l’assistant IA utilise un service externe (Anthropic) | Lot 5 : mentions légales, politique de confidentialité, durée de conservation |

## 5. Points conformes vérifiés

| Domaine | Constat |
|---|---|
| Montants | Prix, frais de livraison et remises recalculés par le serveur à partir de la base ; le navigateur ne peut pas imposer un prix ; stock décrémenté de façon atomique |
| Sessions | Jeton aléatoire de 256 bits, seule son empreinte est en base ; cookie `HttpOnly`, `Secure` en ligne, `SameSite=Lax` ; expiration à 30 jours ; déconnexion effective |
| Requêtes forgées | Toute modification exige l’en-tête `X-Bethanie`, impossible à ajouter depuis un autre site sans autorisation (aucune n’est donnée) |
| Connexion Google | Signature, projet, émetteur et expiration du jeton vérifiés ; seules les adresses Google vérifiées sont acceptées ; tentatives limitées |
| Photos | Type vérifié sur le contenu (JPEG, PNG, WebP), SVG refusé, 2,5 Mo maximum, noms aléatoires |
| Secrets et bibliothèques | `npm audit` : 0 vulnérabilité connue ; aucun secret dans l’historique Git (seulement des exemples) ; seules les clés publiques `VITE_FIREBASE_*` vont dans le site |

## 6. Contrôle des transactions — fonctionnement

| À chaque… | Le contrôleur |
|---|---|
| Commande | Calcule par boutique : montant des articles, commission 5 % (arrondie au franc), part du vendeur (le reste) — statut « prévue » ; vérifie sous-total, total, remise et répartition ; refuse et annule tout en cas d’écart |
| Paiement en ligne | Passe la commission à « acquise » dans la même opération que le paiement |
| Livraison payée à la livraison | Passe la commission à « acquise » au moment où la commande est livrée et payée |
| Événement | Inscrit une ligne au journal scellé (empreinte de la ligne précédente ; HMAC avec `TRANSACTIONS_SECRET`) ; une fois la clé définie, toute ligne non scellée par elle est signalée (anciennes lignes à sceller avec `npm run controle -- --sceller`) |
| Demande de l’administrateur | Recontrôle toutes les commandes et le journal : `npm run controle`, carte « Commissions Béthanie » du Profil |

Tests réalisés (serveur isolé, données de test) : commande sur deux boutiques (2 500 + 900 FCFA de commission sur
50 000 + 18 000 FCFA), paiement en ligne, paiement à la livraison (commission acquise à la livraison seulement),
transaction faussée (refusée, aucune commande créée, stock inchangé, alerte au journal), total modifié dans la base
(écart détecté), ligne du journal modifiée (détectée, numéro de ligne donné), accès refusé (403) à une cliente.

## 7. Audit complémentaire — 5 octobre 2026 (achat sans compte, GeniusPay)

Contexte : achat sans compte (profil invité ouvert à la commande), paiement réel GeniusPay (bac à sable), scan Herozion
(22 alertes avant, 19 après). Chaque correction a été testée sur un serveur isolé (base temporaire).

### Corrigés

| ID | Gravité | Constat | Correction |
|---|---|---|---|
| S8 | Élevée | L’adresse e-mail du profil se modifiait librement, sans vérification, et la connexion Google rattache un compte existant par son adresse : n’importe qui (un invité suffit) pouvait préparer un compte au nom d’une victime et garder sa session ouverte quand celle-ci se connectait | E-mail non modifiable (`PATCH /api/me`, champ en lecture seule) ; quand le vrai titulaire se connecte, toutes les sessions ouvertes avant lui sont fermées. Testé : 400 sur changement d’e-mail, session de l’attaquant fermée |
| S9 | Élevée | Si `FIREBASE_AUTH_EMULATOR_HOST` (variable de test) se retrouvait sur Vercel, des jetons non signés seraient acceptés, y compris pour une adresse administrateur | Connexions Google refusées (503) quand cette variable est présente en production. Testé |
| S10 | Moyenne | Une adresse retirée de `ADMIN_EMAILS` gardait le rôle admin | Rôle revérifié à chaque requête et retiré en base. Testé : 403, rôle remis à « customer » |
| S11 | Moyenne | Tout visiteur anonyme pouvait faire lire 4 Mo au serveur sur n’importe quelle adresse ; aucune limite générale de requêtes | 300 Ko partout, 4 Mo seulement pour les photos d’un vendeur connecté ; 300 requêtes/minute par adresse IP ; 60/minute sur les notifications GeniusPay ; 30 vérifications de paiement/minute par compte ; liste publique des boutiques plafonnée à 200. Testé (413, 429) |
| S12 | Moyenne | Notification GeniusPay rejouable pendant 5 minutes (chacune déclenche un appel à GeniusPay) ; contenu illisible non géré | Chaque notification n’est traitée qu’une fois (identifiant GeniusPay, sinon empreinte de la signature ; table `payment_webhook_events`) ; libérée si le traitement échoue, pour le nouvel envoi de GeniusPay ; contenu illisible → 400. Testé |
| S13 | Moyenne | Après un délai dépassé chez GeniusPay, le serveur relançait la création du paiement : deux paiements possibles pour une commande | Nouvel essai seulement si GeniusPay a répondu par un refus clair (GeniusPay ne propose pas de clé d’idempotence, vérifié dans sa documentation) |
| S14 | Faible | Paiement reçu : seuls le montant et la devise étaient comparés | Référence du paiement et numéro de commande renvoyés par GeniusPay vérifiés aussi (anomalie au journal en cas d’écart). Vrai paiement bac à sable testé : « payé », sans fausse alerte |
| S15 | Faible | Erreurs GeniusPay journalisées en entier (peuvent reprendre nom, téléphone, e-mail du client) ; adresse interne des invités renvoyée au navigateur | Code et message d’erreur seulement ; adresse interne jamais renvoyée |
| S16 | Faible | Onde au toucher et vignette « vers le panier » : écouteur non retirable, minuteurs de secours jamais annulés ; noms réservés (`constructor`…) acceptés dans les caractéristiques d’un produit | Écouteur retirable, minuteurs annulés ; noms réservés refusés |

### Restent à traiter

| ID | Gravité | Constat | Correction proposée |
|---|---|---|---|
| C1 (suite) | ~~Critique~~ **Corrigé le 7 octobre 2026** | Le client pouvait faire avancer **sa propre** commande jusqu’à « livrée » (mode démo) et déclarer sa commande payée (route de paiement simulé) | Simulation et mode démo **supprimés** du code : seuls GeniusPay (statut revérifié auprès de GeniusPay) ou le vendeur à la livraison marquent une commande payée ; seul le vendeur ou l’administrateur fait avancer une commande |
| M5 | Moyenne | Achat sans compte : une commande « paiement à la livraison » ne s’annule jamais d’elle-même ; quelqu’un qui change d’adresse IP peut bloquer du stock (10 commandes/heure par adresse, jusqu’à 99 articles par ligne) | Décision du porteur : quantité maximale par commande invitée, confirmation par SMS/WhatsApp, ou annulation automatique si le vendeur ne confirme pas |
| F6 | ~~Faible~~ **Corrigé le 10 octobre 2026** (S21) | Commandes d’un client et d’une boutique renvoyées sans pagination (limitées à son propre compte) | Pagination plafonnée par le serveur |

### Alertes du scan vérifiées une à une (non modifiées)

| Emplacement | Pourquoi ce n’est pas une faille |
|---|---|
| `server/db.ts` 171-178 (« injection de commande », « requête non limitée ») | Mise à jour du schéma au démarrage : texte SQL fixe, aucune donnée saisie ; `PRAGMA table_info` renvoie quelques colonnes |
| `server/payments.ts`, `server/routes/assistant.ts`, `server/controle.ts` (« données sensibles dans les journaux ») | Ces lignes écrivent le **nom** d’une variable absente ou refusée, jamais sa valeur (vérifié dans les journaux de test) |
| `server/payments.ts` (« clé d’idempotence manquante ») | GeniusPay n’en propose pas ; unicité assurée côté Béthanie (S12, S13, S19 : un seul paiement par commande, clé `bethanie-<commande>`) |
| `server/transactions.ts` (5 « requêtes non limitées ») | Contrôle complet voulu (chaîne du journal) ; seulement administrateur, au démarrage ou en ligne de commande, avec cache de 15 s et 20 demandes/minute |
| `server/http.ts:52` (« informations de debug ») | Messages écrits à la main en français, plus le garde-fou contre toute trace technique (testé) |
| `src/api/firebaseAuth.ts:13` (« clé en dur ») | Clé web publique de Firebase (`VITE_`), faite pour être dans le site |

## 8. Audit complémentaire — 10 octobre 2026 (rapport Herozion)

Contexte : rapport Herozion du porteur de projet (note 24/100, F). Chaque alerte a été vérifiée dans le code ; les
corrections ont été testées sur un serveur isolé (base temporaire, faux GeniusPay pour ne consommer aucun jeton du bac
à sable), puis le scan a été relancé : **69/100 (C), 0 alerte critique, 0 alerte élevée**. Les alertes « critiques » du
rapport visaient des éléments déjà supprimés (paiement simulé, mode démo) ou mal interprétés par le scanner.

### Corrigés

| ID | Gravité | Constat | Correction |
|---|---|---|---|
| S17 | Faible | Le service de mise à jour de l’application installable (`src/pwa/service-worker.js`) traitait tout message reçu sans vérifier d’où il venait | Messages acceptés seulement depuis l’adresse du site (`event.origin`). Testé : mise à jour et fonctionnement hors ligne inchangés |
| S18 | Faible | La politique de sécurité du contenu n’existait que dans les en-têtes HTTP : une page servie sans eux (hébergeur mal réglé, cache, copie gardée par l’application installée) n’était plus protégée | Politique ajoutée aussi dans la page compilée (balise `meta`), générée depuis la même source (`server/security-policy.js`) à la compilation ; retirée en développement (rechargement instantané). `frame-ancestors` reste dans les en-têtes (le navigateur l’ignore dans une balise). Testé : aucune violation dans la console (accueil, catalogue, produit, panier, paiement sans compte, compte, espace vendeur), fenêtre Google toujours ouverte |
| S19 | Moyenne | La référence du paiement GeniusPay était enregistrée sans condition : deux créations simultanées pour une même commande auraient pu laisser deux paiements ouverts, le second écrasant le premier | `startPaymentOnce` : clé unique `bethanie-<commande>` envoyée à GeniusPay dans les métadonnées ; un paiement existant est réutilisé sans rappeler GeniusPay ; enregistrement conditionnel (le premier paiement l’emporte, le doublon est signalé dans les journaux). Testé : un seul appel par commande, réutilisation, course simulée |
| S20 | Faible | La réponse d’erreur reprenait `err.message`, que n’importe quel code peut modifier après coup (risque d’envoyer un détail interne au visiteur) | Message public figé à la création de l’erreur (`publicMessage`), seul envoyé ; le garde-fou contre les traces techniques reste en place. Testé : message modifié, requête SQL, trace d’appel, erreur inattendue → jamais envoyés |
| S21 | Faible | Listes sans plafond imposé par le serveur (ex-F6) | `limit` / `offset` contrôlés : catalogue 100 par défaut et 500 au plus (le site charge le catalogue en une fois), avis 50, « Mes commandes » 100, commandes d’une boutique 500 ; toute valeur hors limites → 400. Testé |
| S23 | Moyenne | Les anciennes commandes d’exemple, déjà marquées `is_demo`, pouvaient encore être consultées ou déclencher une vérification GeniusPay via `POST /orders/:id/payment/check` | Les commandes démo sont exclues de la liste client ; détail et vérification de paiement refusés ; aucune nouvelle commande ou aucun paiement démo n’est créé. Vérifié sur base isolée et par contrôle du code |
| S22 | Info | Journaux de démarrage citant le nom des variables secrètes absentes (signalé « données sensibles dans les journaux ») | Formulés sans nom de variable (renvoi à `.env.example`) ; aucune valeur n’y figurait déjà (vérifié) |

### Alertes Herozion restantes (vérifiées, non modifiées)

| Alerte | Pourquoi |
|---|---|
| 6 × « Endpoint list sans limite de pagination » (`catalog.ts` 24, 49, 60 ; `orders.ts` 73, 80, 275) | **Fausse alerte liée au nom** : le scanner signale toute route écrite `catalogRouter.get(…)` ou `ordersRouter.get(…)` sans lire son contenu. Preuve : la même route paginée est signalée sous le nom `catalogRouter` et ne l’est plus sous le nom `r`. Quatre de ces routes sont plafonnées (S21), les deux autres (`/products/:id`, `/orders/:id`) renvoient un seul élément |
| « Clé en dur » `src/api/firebaseAuth.ts:13` | Clé web publique de Firebase lue dans une variable `VITE_` : faite pour être dans le site, ne donne aucun droit (déjà vu au § 7) |
| « CSP sans Trusted Types » (faible) | L’activer bloquerait le chargement du module de connexion Google par Firebase (script ajouté dynamiquement) : la connexion des vendeurs ne marcherait plus. À reconsidérer si Firebase le prend en charge |

La note affichée sur la plateforme Herozion ne change qu’après envoi d’un nouveau scan (`herozion push`).

## 9. Variables à définir en production

| Variable | Rôle |
|---|---|
| `ADMIN_EMAILS` | Adresses Google des administrateurs (séparées par des virgules) |
| `TRANSACTIONS_SECRET` | Clé secrète du sceau du journal (longue chaîne aléatoire, à ne jamais changer ensuite) |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Refus des comptes Google désactivés (M3) |
| `GENIUSPAY_SECRET_KEY` (`sk_live_…`), `GENIUSPAY_WEBHOOK_SECRET` | Paiement réel (la clé `sk_sandbox_…` ne fait circuler aucun argent) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Données permanentes (sinon effacées à chaque redémarrage sur Vercel) |
