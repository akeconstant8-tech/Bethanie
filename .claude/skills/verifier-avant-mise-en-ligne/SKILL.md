---
name: verifier-avant-mise-en-ligne
description: Liste de contrôle complète avant d'annoncer une modification de Béthanie comme terminée ou de la mettre en ligne (types, compilation, version Vercel, tests navigateur, nettoyage). À utiliser après toute modification du site ou du serveur.
---

# Vérifier avant mise en ligne

Règle : on ne dit « c'est fait » qu'après ces vérifications, et on donne le résultat réel (y compris les échecs).

## 1. Ne rien casser chez le porteur de projet

- Ses serveurs tournent souvent : site sur 3000 ou 3001, API sur 4000. **Ne jamais les arrêter ni les relancer.**
  Exception : des doublons démarrés par un assistant (lancements depuis Git Bash), à signaler avant.
- Sa base réelle est dans `server/data/` : **ne jamais l'ouvrir en écriture ni la supprimer.**
- Tests sur un serveur isolé : `PORT=4100`, `DATA_DIR` dans le dossier temporaire de la session, lancé avec
  `node --import tsx server/index.ts`. Attendre `/api/health` (le chargement de firebase-admin prend ~20 s).

## 2. Contrôles automatiques

```bash
npx tsc --noEmit            # types (site + serveur)
npm run build               # compilation du site (dist/)
npm run vercel-build        # site + API pour Vercel (.vercel/output) : doit afficher « .vercel/output prêt »
```

Pour Vercel, tester aussi la fonction compilée sous Node 22 (version de Vercel) :
`npx -y node@22 script.mjs` qui importe `.vercel/output/functions/api.func/index.mjs` et appelle `/api/health`.

## 3. Navigateur (puppeteer-core + Edge)

- Edge : `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, `headless: true`.
- Avant chargement : `localStorage` `bethanie.onboarded = 'true'`, `bethanie.lang = '"fr"'`, et
  `bethanie.motion = '"on"'` pour voir les animations (ce PC demande moins d'animations).
- Bloquer `beforeinstallprompt` si l'on teste des bannières (sinon la bannière d'installation s'affiche).
- Connexion : il n'y a plus de mot de passe, seulement Google. En test : serveur avec
  `VITE_FIREBASE_PROJECT_ID=bethanie-923fc` et `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, une mini-doublure
  qui répond à `accounts:lookup`, et la requête `/assets/firebaseAuth-*.js` remplacée par un module qui renvoie un
  jeton non signé (voir la skill `configurer-connexion-google`).
- À contrôler : aucune erreur rouge dans la console, aucune image cassée visible, aucun défilement horizontal
  (360, 768, 1024, 1440 px), panneaux au-dessus de la barre d'onglets, textes de boutons non coupés en FR et EN.
- Après `page.goto` vers la même adresse avec un autre `#…`, la page n'est pas rechargée : utiliser `page.reload()`
  quand l'état serveur a changé.

## 4. Nettoyer

- Supprimer `dist/` et `.vercel/` (ils n'existent pas dans le dépôt).
- Arrêter les serveurs de test (4100, 4199, 4300, 9099) et supprimer leurs bases temporaires.
- Vérifier avec `netstat -ano | grep LISTEN` que seuls les serveurs du porteur de projet restent.

## 5. Rendre compte

Compte rendu en français courant (skill `ecrire-au-porteur`) : ce qui a été vérifié, ce qui ne l'a pas été (par
exemple la vraie fenêtre Google ou une vraie clé Claude), et ce qui reste à faire de son côté.
