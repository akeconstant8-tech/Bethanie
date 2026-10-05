# Assistant vendeur Béthanie — spécification fonctionnelle

> Version 1.0 — 5 octobre 2026
> Statut : périmètre fonctionnel proposé ; fonctionnalité non implémentée.
> Cette spécification ne choisit ni fournisseur d’IA, ni architecture, ni méthode d’intégration.

Le cahier des charges principal référence cette fonctionnalité en §4.13 sous les exigences AGV-01 à AGV-07.

## 1. Objectif

Donner aux vendeurs un assistant simple, utilisable sur téléphone, qui les aide à préparer leurs fiches produit,
surveiller leur stock, traiter leurs commandes et comprendre les indicateurs déjà présents dans leur espace.
L’assistant explique et prépare le travail ; le vendeur garde la décision et le contrôle de sa boutique.

## 2. Agent

| Élément | Définition |
|---|---|
| Nom fonctionnel | Assistant vendeur Béthanie |
| Utilisateurs | Vendeurs connectés ayant accès à l’espace vendeur |
| Point d’entrée | Espace vendeur, avec une entrée clairement nommée « Assistant vendeur » |
| Périmètre des données | Boutique du vendeur connecté, ses produits, ses stocks, ses commandes et ses indicateurs accessibles dans l’espace vendeur |
| Langues | Français et anglais, selon la langue choisie dans l’application |
| Rôle | Répondre aux demandes vendeur, fournir des explications contextualisées et préparer des actions pour validation |
| Autorité | Aucune décision commerciale ou action de gestion n’est prise à la place du vendeur |

## 3. Compétences (skills)

### Skill 1 — Rédiger une fiche produit

**But :** faciliter la création d’une fiche, notamment sur mobile.

- Recueillir les informations manquantes par questions courtes : nom, usage, matière ou ingrédients si connus,
  dimensions ou tailles, prix, catégorie et stock.
- Préparer un brouillon de titre, description et catégorie à partir des seuls faits donnés par le vendeur.
- Signaler les champs obligatoires manquants et distinguer clairement les suggestions des informations confirmées.
- Laisser le vendeur modifier ou rejeter le brouillon avant de le reporter dans le formulaire existant.
- L’ajout des photos et la publication restent effectués et confirmés par le vendeur.

**Limites :** ne pas inventer de matière, origine, certification, bénéfice santé, disponibilité ou autre caractéristique ;
ne pas fixer le prix et ne pas publier la fiche.

### Skill 2 — Suivre le stock

**But :** rendre les niveaux de stock compréhensibles et attirer l’attention sur les produits à surveiller.

- Répondre aux questions sur le stock actuel des produits de la boutique.
- Lister les produits que l’espace vendeur signale déjà comme ayant un stock faible.
- Expliquer qu’un produit épuisé ne peut pas être vendu tant que le stock n’est pas remis à jour.
- Si le vendeur demande une modification, préparer ou expliquer la valeur proposée, puis demander sa confirmation explicite.

**Limites :** ne pas inventer de seuil de stock faible ni de quantité à recommander ; ne jamais modifier le stock sans accord.

### Skill 3 — Traiter les commandes

**But :** aider le vendeur à repérer les commandes de sa boutique et à comprendre la prochaine étape autorisée.

- Résumer les commandes à traiter et leurs statuts avec les informations nécessaires à leur gestion.
- Expliquer le cycle existant : confirmée, en préparation, expédiée, en livraison, livrée.
- Indiquer si une commande peut avancer ou si elle est bloquée, notamment lorsque le paiement est en attente.
- Présenter l’étape suivante comme une proposition ; demander confirmation avant tout changement de statut.

**Limites :** ne pas contourner les droits du vendeur, les règles de paiement ou le cycle de commande ; ne pas annuler,
rembourser, promettre une date de livraison ni contacter un acheteur.

### Skill 4 — Comprendre l’activité

**But :** expliquer le tableau de bord et les statistiques existantes en termes simples.

- Résumer les ventes, revenus estimés, commandes, commandes à traiter, produits en ligne et stocks faibles disponibles.
- Répondre à une question sur les meilleures ventes ou les statuts à partir des données affichées.
- Préciser la période ou les données utilisées lorsque cette information est disponible.
- Dire explicitement lorsqu’un indicateur ou une comparaison n’est pas disponible.

**Limites :** ne pas présenter de prévision, de causalité ou d’évolution historique que les données enregistrées ne
permettent pas d’étayer ; ne pas présenter les revenus estimés comme des reversements effectués.

### Skill 5 — Guider dans l’espace vendeur

**But :** aider le vendeur à utiliser les fonctions déjà disponibles.

- Expliquer comment ouvrir une boutique, publier un produit, mettre à jour un stock, retrouver une commande ou lire les statistiques.
- Orienter vers l’écran ou le formulaire correspondant.
- Indiquer clairement lorsqu’une fonction demandée n’existe pas encore dans Béthanie et orienter vers le support si nécessaire.

**Limites :** ne pas présenter une fonction prévue ou simulée comme déjà opérationnelle ; ne pas inventer de politique
de retour, de paiement, de commission ou de livraison.

## 4. Règles communes de fonctionnement

1. **Validation humaine :** chaque brouillon est éditable ; publication, suppression, modification de stock et changement
   de statut exigent une confirmation distincte et explicite du vendeur.
2. **Données limitées :** l’assistant ne traite que les données que le vendeur est autorisé à consulter dans sa boutique.
   Il ne révèle pas les données d’une autre boutique ni les informations personnelles d’un acheteur qui ne sont pas
   nécessaires à la tâche.
3. **Transparence :** distinguer les données consultées, les faits fournis par le vendeur et les suggestions de l’assistant.
   En cas d’information absente ou ambiguë, poser une question ou signaler la limite.
4. **Actions réversibles et traçables :** avant toute action préparée, montrer ce qui va changer ; permettre au vendeur
   d’annuler avant validation. Ne pas exécuter d’action financière ou irréversible.
5. **Aucune promesse externe :** ne pas contacter clients, fournisseurs ou livreurs et ne pas engager Béthanie au nom
   du vendeur.
6. **Respect des règles existantes :** l’assistant ne modifie pas les règles de stock, les permissions ou le cycle des
   commandes définis dans le cahier des charges.

## 5. Hors périmètre

- Assistant d’achat pour les clients, agent de service client, agent administrateur ou essaim d’agents autonomes.
- Négociation de prix, tarification automatique, promotions et décisions d’approvisionnement.
- Création ou retouche d’images, certification de produits et vérification de conformité réglementaire.
- Paiements, reversements, remboursements, annulations, litiges, messagerie client et suivi GPS du livreur.
- Analyse prédictive ou tableaux de bord historiques tant que les données correspondantes ne sont pas disponibles.
- Choix du modèle, du fournisseur, de l’hébergement, des modalités de conservation des conversations ou de l’intégration technique.

## 6. Parcours d’acceptation proposés

| ID | Scénario | Résultat attendu |
|---|---|---|
| AGV-R1 | Le vendeur demande de rédiger une fiche à partir d’informations partielles | L’assistant demande les champs essentiels manquants, propose un brouillon éditable et n’invente aucun fait. Rien n’est publié sans validation du vendeur dans le formulaire. |
| AGV-R2 | Le vendeur demande le stock faible | Seuls les produits signalés comme faibles dans l’espace vendeur sont listés ; aucune quantité de réapprovisionnement arbitraire n’est affirmée. |
| AGV-R3 | Le vendeur demande d’avancer une commande au paiement en attente | L’assistant indique que l’action est bloquée selon les règles existantes et ne change pas le statut. |
| AGV-R4 | Le vendeur veut modifier le stock ou avancer une commande admissible | L’assistant présente l’action précise et attend une confirmation ; sans confirmation, aucune modification n’a lieu. |
| AGV-R5 | Le vendeur demande une évolution des ventes qui n’est pas disponible | L’assistant indique l’absence d’historique exploitable et ne fabrique ni pourcentage ni tendance. |
| AGV-R6 | Un vendeur demande des informations sur une autre boutique | L’assistant ne divulgue aucune donnée et rappelle la limite d’accès. |
| AGV-R7 | Le vendeur demande une politique de retour ou une fonction inexistante | L’assistant signale que l’information ou la fonction n’est pas disponible et oriente vers le support, sans inventer de règle. |
| AGV-R8 | Le vendeur utilise l’assistant en anglais | Les échanges et les libellés fonctionnels sont en anglais, conformément au choix de langue de l’application. |

## 7. Ordre de réalisation suggéré

1. **Premier incrément :** rédaction de fiche, suivi du stock, traitement guidé des commandes et règles de confirmation.
2. **Incrément suivant :** explication des statistiques et aide contextuelle dans l’espace vendeur.
3. **Avant toute intégration :** valider ce périmètre, choisir les comportements de conservation des conversations et définir
   les critères de sécurité, de coût et de qualité de réponse dans un document technique séparé.
