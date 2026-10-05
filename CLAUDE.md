# Béthanie — consignes pour les assistants de développement

Place de marché africaine (Côte d'Ivoire, Sénégal ; prix en FCFA). Site React 19 + TypeScript + Vite 6 + Tailwind
CSS 4 (`src/`), API Express 5 + SQLite intégré à Node (`server/`), connexion Google par Firebase, application
installable (PWA), assistant vendeur IA (Claude). Documentation : `docs/CAHIER_DES_CHARGES.md`,
`docs/ARCHITECTURE.md`, `docs/AGENT_VENDEUR.md`, `docs/AGENTS_ET_SKILLS.md`.

## Commandes

- `npm run dev` : API (4000) + site (3000) ; refuse un second lancement (`scripts/check-dev.mjs`).
- `npx tsc --noEmit` : types du site et du serveur.
- `npm run build` : site compilé dans `dist/` ; `npm run vercel-build` : site + API pour Vercel (`.vercel/output`).

## Règles du projet

- **Écrire au porteur de projet en français courant, sans jargon anglais** (skill `ecrire-au-porteur`).
- Ne jamais arrêter ses serveurs (3000/3001/4000) ni écrire dans `server/data/` (base réelle). Tests sur un serveur
  isolé : port 4100, `DATA_DIR` dans un dossier temporaire. Supprimer `dist/` et `.vercel/` après usage.
- Aucun envoi sur GitHub (= mise en ligne sur Vercel) sans accord explicite dans la conversation en cours.
- Tout texte visible passe par `src/i18n/fr.ts` et `en.ts` (skill `ajouter-un-texte`).
- Animations : skill `masterclass-motion` (transform/opacity, réglage « Animations », pas d'effet persistant sur un
  conteneur). Le PC du porteur a les effets d'animation Windows coupés : en test, forcer `bethanie.motion = "on"`.
- Commentaires du code en français, dans le style des fichiers voisins.
- Secrets (`FIREBASE_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `TRANSACTIONS_SECRET`…) : serveur uniquement, jamais de préfixe `VITE_`.
- Argent : tout calcul de prix, livraison, promo, paiement ou commission passe par le contrôleur `server/transactions.ts`
  (commission de 5 %) ; ne jamais le contourner ni désactiver un contrôle (skill `audit-securite`).

## Agents (`.claude/agents/`) et skills (`.claude/skills/`)

| Agent | Pour |
|---|---|
| `motion-designer` | animations, transitions, micro-interactions |
| `traducteur-fr-en` | textes français / anglais |
| `verificateur` | contrôles avant de déclarer un travail terminé |
| `deploiement-vercel` | mise en ligne et erreurs de production |
| `connexion-google` | connexion Google / Firebase |
| `assistant-vendeur-ia` | assistant vendeur (Claude) |
| `securite` | contrôle des transactions (commission 5 %), audit de sécurité |

Skills : `masterclass-motion`, `verifier-avant-mise-en-ligne`, `ajouter-un-texte`, `configurer-connexion-google`,
`deployer-sur-vercel`, `assistant-vendeur-ia`, `audit-securite`, `ecrire-au-porteur`. Détail des fonctionnalités de chacun :
`docs/AGENTS_ET_SKILLS.md`.
