# Agents et skills de Béthanie — définition des fonctionnalités

> Version 1.0 — 5 octobre 2026

Béthanie utilise deux sortes d’« agents » :

1. **L’assistant vendeur**, dans l’application : une IA (Claude) que les vendeurs utilisent dans leur espace
   (§1). C’est une fonctionnalité de Béthanie.
2. **Les assistants de développement**, dans le projet : des spécialistes que Claude Code (l’outil qui développe
   Béthanie) peut appeler, chacun avec ses tâches, ses méthodes (skills) et ses limites (§2 et §3). Ils ne sont pas
   visibles par les utilisateurs de Béthanie.

## 1. Assistant vendeur (dans l’application)

| Élément | Définition |
|---|---|
| Accès | Espace vendeur : bouton flottant « Assistant » et entrée « Assistant vendeur » du menu |
| Utilisateurs | Vendeurs connectés ayant ouvert leur boutique |
| Moteur | Claude Opus 5.5 (Anthropic), clé `ANTHROPIC_API_KEY` sur le serveur |
| Langues | Français et anglais, selon la langue choisie dans Béthanie |
| Principe | L’assistant explique et **propose** ; le vendeur confirme chaque changement d’un clic |
| Spécification complète | [AGENT_VENDEUR.md](AGENT_VENDEUR.md) (exigences AGV-01 à AGV-07) |

### Compétences (skills) de l’assistant vendeur

| Compétence | Ce que fait l’assistant | Ce que fait le vendeur | État |
|---|---|---|---|
| Rédiger une fiche produit | Pose les questions manquantes, propose titre, catégorie, description (et prix / stock s’ils ont été donnés) sans rien inventer | Touche « Remplir le formulaire », relit, ajoute ses photos, publie | ✅ |
| Suivre le stock | Liste les produits épuisés ou en stock faible (seuil : 5, comme le tableau de bord) ; propose une nouvelle quantité demandée par le vendeur | Touche « Confirmer » (ou « Ignorer ») | ✅ |
| Traiter les commandes | Résume les commandes à traiter, explique le cycle, signale les commandes bloquées (paiement en attente), propose l’étape suivante | Touche « Confirmer » ; le serveur applique ses règles | ✅ |
| Comprendre l’activité | Résume produits, commandes, unités vendues, montant des articles vendus ; dit quand une donnée n’existe pas (pas d’historique mensuel) | Lit | ✅ |
| Guider dans l’espace vendeur | Explique les fonctions existantes ; renvoie vers le support pour ce qui n’existe pas | Suit les indications | ✅ |

**Garde-fous** : aucune donnée d’une autre boutique ni donnée personnelle d’acheteur envoyée à Claude ; aucune action
sans confirmation ; aucune action financière, annulation, remboursement ou contact client ; 40 questions par quart
d’heure et par vendeur ; message clair si l’assistant n’est pas activé (pas de clé).

**Coût** : environ 0,02 à 0,05 $ par question (15 à 30 FCFA), payé à Anthropic avec la clé du porteur de projet.

## 2. Agents de développement (dossier `.claude/agents/`)

| Agent | Fonctionnalités | Limites |
|---|---|---|
| **motion-designer** | Concevoir et réaliser animations, transitions d’écran et micro-interactions ; garantir fluidité (transform/opacity) et accessibilité (réglage « Animations ») ; vérifier au ralenti ; documenter | Ne change ni couleurs, ni navigation, ni fonctionnalités sans demande ; pas de nouvelle bibliothèque sans accord |
| **traducteur-fr-en** | Ajouter et relire les textes FR / EN ; remplacer les textes écrits en dur ; typographie française ; longueur des libellés sur petit écran | Ne traduit pas les données des vendeurs ni les messages du serveur |
| **verificateur** | Types, compilation, version Vercel, parcours navigateur (téléphone / ordinateur, FR / EN), console, images, débordements, animations ; rapport honnête | Ne modifie pas l’application ; n’arrête pas les serveurs du porteur ; ne publie rien |
| **deploiement-vercel** | Diagnostiquer la production (404, images, manifeste) ; préparer et vérifier la version Vercel ; lister les variables manquantes ; après accord, mettre en ligne et contrôler | Aucun envoi sur GitHub sans accord explicite ; ne modifie pas les réglages Vercel à la place du porteur |
| **connexion-google** | Diagnostiquer la connexion Google (site, serveur, console Firebase) ; corriger ; tester sans compte réel ; rédiger les étapes de configuration | Aucun secret dans le code ou le site ; Firebase reste la solution |
| **securite** | Contrôler les transactions et la commission de 5 % (`npm run controle`, rapport administrateur), enquêter sur les écarts et transactions refusées, vérifier le journal scellé ; auditer la sécurité (comptes, droits, entrées, en-têtes, secrets, dépendances, production, IA) ; relire toute modification touchant à l’argent ; appliquer les corrections sûres | Lecture seule sur la base réelle et le site en ligne ; ne désactive jamais un contrôle ; ne supprime pas de fonctionnalité sans accord |
| **assistant-vendeur-ia** | Faire évoluer les compétences de l’assistant vendeur, ses outils de proposition, ses consignes, son interface ; surveiller le coût | Modèle `claude-opus-5-5` sauf décision du porteur ; pas d’appel payant sans accord ; jamais d’action directe |

## 3. Skills de développement (dossier `.claude/skills/`)

| Skill | Contenu | Utilisée par |
|---|---|---|
| **masterclass-motion** | Règles d’or du mouvement, catalogue des animations existantes, méthode pas à pas, pièges déjà rencontrés | motion-designer |
| **verifier-avant-mise-en-ligne** | Contrôles automatiques, tests navigateur (connexion simulée, animations forcées), nettoyage, compte rendu | tous |
| **ajouter-un-texte** | Méthode pour les textes FR / EN (clés, paramètres, pluriels, typographie) | traducteur-fr-en, tous |
| **configurer-connexion-google** | Fonctionnement, lecture des journaux, domaines autorisés, tests en mode émulateur | connexion-google |
| **deployer-sur-vercel** | Architecture en ligne, variables de production, mise en ligne, contrôles | deploiement-vercel |
| **assistant-vendeur-ia** | Architecture, principe « l’IA propose, le vendeur décide », données transmises, coût, tests sans clé | assistant-vendeur-ia |
| **audit-securite** | Fonctionnement du contrôleur des transactions (règle des 5 %, contrôles, journal scellé, rapport) et méthode d’audit en 9 domaines, avec les tests à refaire | securite |
| **ecrire-au-porteur** | Français courant sans jargon, traduction des messages anglais, résultat d’abord, demander avant toute action publique | tous |

## 4. Comment s’en servir

Dans Claude Code, il suffit de décrire le besoin (« améliore l’animation du panier », « vérifie avant mise en ligne »,
« pourquoi la connexion Google échoue ? ») : l’agent ou la skill adaptés sont choisis d’après leur description. On
peut aussi les nommer : « utilise l’agent verificateur ». Pour en ajouter un, créer un fichier dans
`.claude/agents/` ou un dossier dans `.claude/skills/` sur le même modèle, puis l’ajouter à ce document et à
`CLAUDE.md`.
