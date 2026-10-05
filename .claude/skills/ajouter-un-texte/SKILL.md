---
name: ajouter-un-texte
description: Ajouter ou modifier un texte affiché dans Béthanie, en français ET en anglais, sans casser la compilation ni le sélecteur de langue. À utiliser pour tout libellé, message, bouton ou aide visible par les utilisateurs.
---

# Ajouter un texte (français / anglais)

## Où sont les textes

- `src/i18n/fr.ts` : dictionnaire de référence ; ses clés définissent le type `TranslationKey`.
- `src/i18n/en.ts` : `Record<TranslationKey, string>` → **une clé absente en anglais bloque la compilation.**
- `src/i18n/index.tsx` : `useI18n()` donne `t`, `tn` (pluriels), `rich` (éléments React dans le texte), `lang`,
  `cityLabel`, `categoryName`, `paymentLabel`, `statusLabel`, `stepLabel`, `badgeLabel`, `promoLabel`.

## Méthode

1. Choisir une clé par écran ou par fonction : `seller.kpi.sales`, `assistant.confirm`, `motion.on.hint`…
2. L'ajouter dans `fr.ts` **et** `en.ts`, au même endroit (à côté des clés voisines).
3. Paramètres : `{name}` → `t('cle', { name })`. Sans paramètre, `t()` laisse `{name}` tel quel (utile pour un modèle).
4. Pluriels : clés `xxx_one` et `xxx_other`, appel `tn('xxx', n)` (en français, 0 et 1 sont au singulier).
5. Texte avec gras ou lien : `rich('cle', { lien: <a …>…</a> })` avec `{lien}` dans le texte.
6. Typographie française : espace insécable avant `%` (`5 %`), guillemets « … », apostrophe typographique ’.
7. `npx tsc --noEmit` pour vérifier que les deux langues sont complètes.

## À ne pas traduire ici

- Messages d'erreur du serveur : rédigés en français dans `server/` (limite connue L17 de l'architecture).
- Données des produits (titres, descriptions) : saisies par les vendeurs.
- L'assistant vendeur reçoit `lang` et répond dans la langue choisie.

## Vérifier

Changer de langue avec les drapeaux (en-tête, Profil, écran de connexion) et contrôler à 360 px que les boutons ne
sont pas coupés (l'anglais est souvent plus court, mais pas toujours).
