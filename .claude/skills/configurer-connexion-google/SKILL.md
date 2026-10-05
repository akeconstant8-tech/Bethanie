---
name: configurer-connexion-google
description: Configuration, dépannage et test de la connexion Google de Béthanie (Firebase Authentication côté site, firebase-admin côté serveur). À utiliser dès qu'un message parle de connexion Google, de Firebase ou de variables FIREBASE_*.
---

# Connexion Google (Firebase)

## Fonctionnement

1. Le site (`src/api/firebaseAuth.ts`) ouvre la fenêtre Google avec Firebase (`signInWithPopup`) et obtient un jeton
   d'identité. Variables publiques, intégrées à la compilation : `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Projet actuel : `bethanie-923fc`.
2. Le site envoie le jeton à `POST /api/auth/google` (`server/routes/auth.ts`).
3. Le serveur le vérifie (`server/firebase.ts`) :
   - **projet seul** — `FIREBASE_PROJECT_ID`, ou à défaut `VITE_FIREBASE_PROJECT_ID` : signature Google, projet,
     émetteur, expiration ; aucune clé secrète ;
   - **+ compte de service** — `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (secrets, serveur uniquement) :
     refus en plus des comptes désactivés ou révoqués.
4. Il retrouve le compte (uid Google, sinon même e-mail → liaison, sinon création) dans `linkGoogleAccount`, ouvre une
   session (cookie `bethanie_session`, HttpOnly, Secure sur Vercel) et renvoie l'utilisateur.

## Lire les journaux du serveur

| Ligne de journal | Signification | Correction |
|---|---|---|
| `Connexion Google désactivée : variable manquante FIREBASE_PROJECT_ID (ou VITE_FIREBASE_PROJECT_ID)` | Aucune variable de projet côté serveur | Ajouter `FIREBASE_PROJECT_ID` (Vercel : variables d'environnement, puis redéployer ; local : `.env.local`, puis redémarrer l'API) |
| `vérification de la signature Google (sans compte de service…)` | Fonctionne ; comptes désactivés non détectés | Facultatif : ajouter le compte de service |
| `Attention : compte de service incomplet : … manquante` | Une seule des deux variables secrètes | Ajouter l'autre, ou retirer les deux |
| `Jeton Google d’un autre projet Firebase` | `VITE_FIREBASE_PROJECT_ID` (site) ≠ `FIREBASE_PROJECT_ID` (serveur) | Mettre le même projet des deux côtés |
| `FIREBASE_PRIVATE_KEY ou FIREBASE_CLIENT_EMAIL illisible` | Clé mal collée | Garder les `\n` et les guillemets |

Côté site, sans les variables `VITE_FIREBASE_*`, le message est « configuration Firebase manquante » et la requête
n'atteint pas le serveur. Dans `.env.local`, le serveur lit aussi ce fichier (`server/config.ts`), mais **ne le relit
qu'au démarrage** : redémarrer l'API après modification.

## Domaines à autoriser (console Firebase → Authentication → Paramètres → Domaines autorisés)

`localhost` (présent par défaut), `bethanie.vercel.app`, et tout autre domaine qui affiche le site. L'adresse de
retour OAuth est gérée par Firebase : `https://bethanie-923fc.firebaseapp.com/__/auth/handler`.

## Tester sans compte Google réel

- Serveur isolé avec `VITE_FIREBASE_PROJECT_ID=bethanie-923fc` et `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` :
  firebase-admin accepte alors des jetons non signés (`alg: none`) et appelle `accounts:lookup` sur l'émulateur —
  une mini-doublure HTTP qui répond `{ users: [{ localId, disabled: false }] }` suffit.
- Jeton : `iss = https://securetoken.google.com/<projet>`, `aud = <projet>`, `sub`, `email`, `email_verified: true`,
  `firebase.sign_in_provider = 'google.com'`, `exp` dans le futur.
- Navigateur : intercepter `/assets/firebaseAuth-*.js` et répondre
  `export const signInWithGoogle = async () => '<jeton>';`.
- Sans émulateur, des jetons falsifiés doivent être refusés (401) : c'est le test de la vraie vérification.
- Ne jamais définir `FIREBASE_AUTH_EMULATOR_HOST` en production.
