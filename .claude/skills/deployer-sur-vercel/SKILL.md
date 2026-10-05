---
name: deployer-sur-vercel
description: Mise en ligne de Béthanie sur Vercel (site + API Express en fonction), variables d'environnement de production et contrôles après déploiement. À utiliser pour toute question de déploiement, d'erreur 404 en production ou de variable Vercel.
---

# Déployer sur Vercel

## Architecture en ligne

- Projet Vercel relié au dépôt GitHub `akeconstant8-tech/Bethanie` : **chaque envoi sur `main` met en ligne**
  https://bethanie.vercel.app. Les autres branches créent des aperçus protégés (connexion Vercel requise).
- `vercel.json` → `npm run vercel-build` → `scripts/build-vercel.mjs` produit `.vercel/output` :
  - `static/` : le site compilé (`dist/`, avec toutes les images de `public/`) ;
  - `functions/api.func` : l'API (`server/vercel.ts`) regroupée par esbuild, Node 22, 60 s maximum ;
  - `config.json` : fichiers statiques d'abord, puis `/api/*` et `/uploads/*` vers la fonction.
- Base SQLite dans `/tmp/bethanie` : **temporaire** (données de démonstration recréées à chaque démarrage
  d'instance). Limite L22 de l'architecture.
- L'hébergement Firebase (`firebase.json`, site `bethanie-923fc.web.app`) ne sert que des fichiers : sans API, il ne
  peut pas faire fonctionner Béthanie (ses `/api/…` renvoient la page HTML).

## Variables d'environnement de production (Vercel → Settings → Environment Variables)

| Variable | Obligatoire | Rôle |
|---|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Oui (connexion Google) | Publiques ; lues à la compilation : redéployer après modification |
| `FIREBASE_PROJECT_ID` | Non (repli sur `VITE_FIREBASE_PROJECT_ID`) | Vérification des jetons Google |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Non | Secrets ; refus des comptes Google désactivés |
| `ANTHROPIC_API_KEY` | Non (sinon assistant « non activé ») | Secret ; assistant vendeur (Claude) |
| `DEMO_MODE`, `PAYMENT_PROVIDER` | Non | Paiements simulés par défaut |

`COOKIE_SECURE` et `DATA_DIR` sont posés automatiquement dans la fonction. Modèle complet : `.env.example`.

## Mettre en ligne

1. Skill `verifier-avant-mise-en-ligne` (dont `npm run vercel-build` et le test sous Node 22).
2. **Demander l'accord explicite du porteur de projet** avant tout envoi sur GitHub : c'est le site public.
3. Si la branche de travail descend de `origin/main` : `git push origin HEAD:main` (sans changer de branche, pour ne
   pas relancer les serveurs locaux), puis `git branch -f main HEAD`.
4. Suivre le déploiement : API GitHub `repos/akeconstant8-tech/Bethanie/deployments` puis `/statuses` (état `success`).
   Si la compilation Vercel échoue, l'ancienne version reste en ligne.

## Contrôler après déploiement

```bash
for p in /api/health /api/config "/api/products?limit=1" /api/auth/me /manifest.webmanifest; do
  curl -s -o /dev/null -w "$p %{http_code}\n" -H "X-Bethanie: 1" "https://bethanie.vercel.app$p"; done
```

Puis un parcours navigateur (accueil, catégories, catalogue, fiche produit) : aucune erreur rouge, aucune image
cassée, application installable. Si le porteur voit encore l'ancienne version : recharger ; le mode hors ligne
propose « Mettre à jour ».
