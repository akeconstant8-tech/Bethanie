---
name: assistant-vendeur-ia
description: Règles et méthode pour faire évoluer l'assistant vendeur de Béthanie (IA Claude dans l'espace vendeur) — compétences, outils de proposition, données transmises, coût, tests sans clé. À utiliser avant de modifier server/routes/assistant.ts ou src/components/SellerAssistant.tsx.
---

# Assistant vendeur (IA)

Spécification fonctionnelle : `docs/AGENT_VENDEUR.md` (AGV-01 à AGV-07, parcours AGV-R1 à R8).

## Architecture

- Serveur : `server/routes/assistant.ts`, monté sur `POST /api/seller/assistant` (connexion obligatoire, boutique
  obligatoire, 40 questions / 15 min / vendeur).
- Site : `src/components/SellerAssistant.tsx` (panneau de conversation), bouton flottant « Assistant » et entrée du
  menu dans `src/screens/SellerScreen.tsx` ; client `api.sellerAssistant(messages, lang)`.
- Appel à Claude : SDK officiel `@anthropic-ai/sdk`, `client.beta.messages.create` avec
  `model: 'claude-opus-5-5'`, `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'` (repli
  automatique si le modèle décline), `output_config: { effort: 'medium' }`, consignes fixes mises en cache
  (`cache_control`), boucle d'outils de 4 tours au plus et 50 s au plus (limite Vercel 60 s).
- Clé : `ANTHROPIC_API_KEY`, serveur uniquement. Sans clé : 503 « pas encore activé » et ligne de journal.

## Principe non négociable : l'IA propose, le vendeur décide

- Les outils de Claude (`proposer_fiche_produit`, `proposer_stock`, `proposer_avancement_commande`) **ne modifient
  rien** : ils vérifient la demande (produit / commande de la boutique, paiement non bloqué…) et renvoient une
  proposition au site.
- Le site affiche une carte avec « Confirmer » (ou « Remplir le formulaire ») qui appelle les **mêmes fonctions que
  l'espace vendeur** (`onUpdateProduct`, `onAdvanceOrder`, formulaire « Ajouter un produit » pré-rempli). Les règles
  du serveur s'appliquent donc toujours.
- Toute nouvelle compétence suit ce modèle. Pas d'action financière, d'annulation, de remboursement ni de contact
  client (hors périmètre, §5 de la spécification).

## Données envoyées à Claude

Instantané de LA boutique du vendeur : nom, ville et catégorie de la boutique ; produits (titre, catégorie, prix,
stock, état) ; commandes contenant ses articles (numéro, date, statut, paiement, articles, montant, étape suivante,
blocage) ; indicateurs. **Jamais** : nom, téléphone, e-mail ou adresse d'un acheteur, données d'une autre boutique.
Les conversations ne sont pas enregistrées par Béthanie (seulement envoyées à l'API Claude le temps de la réponse).

## Coût (ordre de grandeur)

Claude Opus 5.5 : 4 $ par million de jetons lus, 20 $ par million écrits. Une question ≈ 3 000 à 6 000 jetons lus et
500 à 1 500 écrits, soit environ 0,02 à 0,05 $ (15 à 30 FCFA). Les journaux du serveur affichent les jetons de chaque
appel (`[api] Assistant vendeur : … jetons lus …`). Pour réduire le coût : effort `low`, ou modèle plus petit — décision
du porteur de projet.

## Tester sans clé ni dépense

- `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` + `ANTHROPIC_API_KEY=cle-de-test` : une doublure HTTP répond comme
  l'API Messages (`{ id, type: 'message', role, model, content, stop_reason, usage }`), par exemple un `tool_use`
  puis un `end_turn` après réception des `tool_result`.
- Vérifier : modèle, en-tête `anthropic-beta`, `fallbacks`, outils, absence de données personnelles d'acheteur dans
  `system`, cartes affichées, effet réel des confirmations (stock, statut), refus d'un produit d'une autre boutique.
- Avec une vraie clé : quelques questions des parcours AGV-R1 à R8 (coût : quelques centimes), avec l'accord du
  porteur de projet.
