---
name: audit-securite
description: Méthode d'audit de sécurité de Béthanie et vérification de la commission de 5 % (contrôleur des transactions, journal scellé, rapport administrateur). À utiliser pour un audit, une revue de code touchant à l'argent, aux comptes ou aux données, ou une question sur les commissions.
---

# Audit de sécurité et contrôle des transactions

Dernier rapport : `docs/AUDIT_SECURITE.md` (à mettre à jour à chaque audit, constats numérotés et datés).

## 1. Le contrôleur des transactions (déjà en place)

- Code : `server/transactions.ts` ; branché dans `server/routes/orders.ts` (création, paiement, livraison payée à la
  livraison) et `server/seed.ts` (commandes de démonstration).
- Règle (RG-09) : commission de **5 %** (`COMMISSION_RATE_BP = 500`) sur le prix des articles de chaque boutique, hors
  livraison et hors codes promo (financés par Béthanie) ; le vendeur garde le reste. Arrondi au franc ; la part du
  vendeur est calculée par différence, les sommes tombent toujours juste.
- Statuts : « prévue » à la commande, « acquise » au paiement (ou à la livraison si paiement à la livraison).
- Contrôles (`checkOrder`) : somme des articles = sous-total ; total = sous-total + livraison − remise ; remise dans
  les limites ; une répartition par boutique ; commission = 5 % ; part vendeur + commission = montant ; statut de la
  commission cohérent avec le paiement. Un écart à la création ou au paiement **annule la transaction** (tout ou rien,
  `guarded`) et inscrit une alerte « anomalie ».
- Journal `transaction_log` : chaque ligne contient l'empreinte de la précédente ; colonne `seal` : `h` (SHA-256) ou
  `m` (HMAC avec `TRANSACTIONS_SECRET`). `verifyLog()` recalcule la chaîne, donne la première ligne non vérifiable et
  sa cause, et compte les lignes non scellées par la clé quand elle est définie. Pas d'ancrage automatique (il
  accepterait un journal réécrit) : les anciennes lignes se scellent par `npm run controle -- --sceller` (`sealLog`),
  qui refuse si la chaîne est déjà rompue. Ne jamais changer ni retirer la clé une fois utilisée.
- Consultation : `npm run controle` (code de sortie 1 si écart) ; `GET /api/admin/transactions` (rôle admin, attribué
  par `ADMIN_EMAILS`) ; carte « Commissions Béthanie » du Profil.
- Toute modification d'un calcul d'argent (prix, livraison, promo, commission) doit garder ces contrôles verts et être
  testée : commande deux boutiques, paiement, paiement à la livraison, transaction faussée (déclencheur SQLite qui
  altère la commission → refus, stock inchangé), base modifiée à la main (écart détecté), journal modifié (détecté).

## 2. Méthode d'audit

Pour chaque point, noter : gravité (Critique / Élevée / Moyenne / Faible / Info), preuve (fichier:ligne, commande,
réponse HTTP), conséquence concrète pour Béthanie, correction proposée, statut.

1. **Argent** : prix et montants recalculés côté serveur ; paiements (GeniusPay seul, aucune simulation ni mode démo ;
   statut toujours revérifié auprès de GeniusPay ; notifications signées) ; codes promo (réutilisation) ; stock réservé
   par des commandes non payées ; commission (§1).
2. **Comptes et sessions** : vérification des jetons Google (`server/firebase.ts`), liaison par e-mail, rôle admin
   (`ADMIN_EMAILS`), cookie `bethanie_session` (HttpOnly, Secure, SameSite), expiration, déconnexion.
3. **Droits** : chaque route vérifie le propriétaire (commande, produit, boutique) ; vendeurs multi-boutiques (RG-10) ;
   routes admin.
4. **Entrées** : schémas zod de chaque route ; photos (contenu vérifié, SVG refusé, taille) ; tailles des corps JSON.
5. **Navigateur** : politique de contenu et en-têtes (`server/security-policy.js`, communs à helmet et Vercel) ;
   protection contre les requêtes forgées (en-tête `X-Bethanie`) ; aucune donnée sensible dans `localStorage`.
6. **Secrets** : rien dans le code ni dans l'historique Git (`git log -p -S"<motif>"`) ; seules les variables `VITE_`
   publiques vont dans le site ; `.env.local` ignoré.
7. **Dépendances** : `npm audit` (0 vulnérabilité attendue) ; versions récentes.
8. **Production** : `curl -I` sur https://bethanie.vercel.app (en-têtes), `/api/config` (mode démo ?), persistance des
   données (base dans `/tmp` sur Vercel = temporaire).
9. **IA** : l'assistant vendeur ne voit que la boutique du vendeur, ne fait que proposer ; injection de consignes via
   les titres de produits → effet limité à la propre boutique.

## 3. Règles

- Ne jamais tester sur la base réelle (`server/data/`) ni sur le site en ligne autrement qu'en lecture (GET, `curl -I`).
- Ne jamais afficher un secret ; signaler seulement sa présence ou son absence.
- Corriger sans demander ce qui est sûr et sans effet sur les fonctionnalités (en-têtes, contrôles) ; demander avant
  ce qui change une règle de gestion (codes promo, délais, rôles) ou supprime une fonction.
