---
name: masterclass-motion
description: Système de motion design de Béthanie (animations, transitions, micro-interactions) et méthode pour en ajouter une sans dégrader la fluidité ni l'accessibilité. À utiliser avant toute création ou modification d'animation, de transition d'écran ou d'effet visuel.
---

# Master class motion design — Béthanie

Béthanie anime son interface sans bibliothèque : keyframes et classes dans `src/index.css`, fonctions dans
`src/utils/motion.ts`, composants dans `src/components/ui.tsx`. Toute nouvelle animation suit les règles ci-dessous.

## 1. Les règles d'or

1. **Seulement `transform` et `opacity`** (et les propriétés `translate`, `scale`, `rotate`). Jamais `width`, `height`,
   `top`, `left`, `margin` : elles recalculent la page et saccadent sur les téléphones modestes.
2. **Durées** : 150–250 ms pour un retour au toucher, 300–500 ms pour une entrée, 600 ms à 1,6 s seulement pour la
   bannière d'accueil. Courbes : `var(--ease-out-soft)` (entrées), `var(--ease-spring)` (rebonds), `ease-in` (sorties).
3. **Jamais bloquant** : l'utilisateur peut toujours toucher, faire défiler, revenir en arrière pendant une animation.
4. **Accessibilité** : le bloc « Accessibilité » en fin de `index.css` coupe toutes les animations CSS quand l'appareil
   demande moins d'animations, **sauf** si le Profil dit « Toujours activées » (`<html data-motion="on">`), et les coupe
   toujours avec « Réduites » (`data-motion="off"`). Une animation déclenchée en JavaScript doit tester
   `prefersReducedMotion()` (`src/pwa/pwa.ts`), qui tient compte de ce réglage.
5. **Pas d'effet persistant sur un conteneur** : une animation `both`/`forwards` sur `transform` ou `opacity` crée un
   contexte d'empilement durable ; les éléments `fixed` à l'intérieur (panneaux, barres) passent alors sous la barre
   d'onglets. Pour un conteneur, utiliser `backwards` (c'est le cas de `stagger` et de `screen-fade`).
6. **Les panneaux sont rendus à la racine** (`BottomSheet` utilise `createPortal`) : ne pas réintroduire de panneau
   `fixed` rendu à l'intérieur d'un écran animé.
7. **Une animation infinie doit rester discrète** (petite surface, `transform` seulement) : `truck-bob`, `ping-soft`,
   `shine-loop`, `skeleton`, `particle`.

## 2. Ce qui existe déjà (à réutiliser avant de créer)

| Besoin | Outil | Où |
|---|---|---|
| Entrée d'un élément | `animate-rise-in` (retard : style `--delay`), `animate-fade-in`, `animate-scale-in` | `index.css` (`@utility`) |
| Liste qui apparaît en cascade | classe `stagger` sur le parent | `index.css` |
| Section révélée au défilement | `useReveal()` → props à étaler sur la section | `ui.tsx` |
| Retour au toucher | règle globale `button:active` (scale 0,97) ; onde : classe `ripple` (déjà dans `btnPrimary`, `btnGold`) | `index.css`, `initRipples()` |
| Micro-interactions | `animate-pop`, `animate-bump` (pastilles, avec `key` qui change), `animate-wiggle`, `animate-shake` (erreurs) | `index.css` |
| Favori | `<HeartBurst key={compteur} />` dans un bouton `relative` | `ui.tsx` |
| Ajout au panier | `flyToCart(image, élémentDeDépart)` ; cibles marquées `data-cart-target` | `utils/motion.ts` |
| Carte inclinée (souris) | classe `tilt` + `{...tiltHandlers}` + enfant `tilt-glare` | `utils/motion.ts`, `index.css` |
| Chiffres | `<CountUp value format animateOnMount />` | `ui.tsx` |
| Chargement | `Skeleton`, `ProductGridSkeleton`, `PageSkeleton` (reflet `skeleton`) | `ui.tsx` |
| Célébration | `<Confetti className="absolute …" />`, coche `check-draw` (SVG cercle + chemin) | `ui.tsx`, `CheckoutScreen.tsx` |
| Changement d'écran | View Transitions : `withViewTransition()` ; sens posé par `App.tsx` dans `<html data-nav-direction>` (forward / back / tab) ; photo partagée `markSharedPhoto()` | `utils/motion.ts`, `App.tsx`, `index.css` |
| Indicateur qui glisse | élément absolu + `translate` en pourcentage + `transition-[translate] ease-spring` (barre d'onglets, sélecteur vendeur) | `BottomNav.tsx`, `SellerScreen.tsx` |
| Recherche animée | `useTypewriterPlaceholder(ref, base, exemples, modèle)` (aucun rendu React) | `utils/motion.ts` |
| Suivi de commande | `DeliveryRoute` (camion `truck-bob`, `ping-soft`, segments `grow-y`) | `TrackingScreen.tsx` |
| Bannière | `hero-photo` (zoom + parallaxe CSS `animation-timeline: view()`), `hero-word`, `hero-highlight`, `shine-loop` | `HomeScreen.tsx` |

## 3. Ajouter une animation, pas à pas

1. **Vérifier qu'elle sert** : guider l'œil, confirmer une action ou faire patienter. Sinon, ne pas l'ajouter.
2. **Réutiliser** un outil du tableau ; sinon écrire la keyframe dans `index.css` (bloc « Animations signature »,
   `@layer components`) avec un commentaire en français qui dit à quoi elle sert.
3. **JavaScript** : utiliser l'API Web Animations (`element.animate`) ou une classe CSS ; tester `prefersReducedMotion()`.
4. **Texte** : tout libellé passe par `src/i18n/fr.ts` et `en.ts` (voir la skill `ajouter-un-texte`).
5. **Vérifier** (voir la skill `verifier-avant-mise-en-ligne`) :
   - `npx tsc --noEmit` puis `npm run build` ;
   - navigateur de test avec `localStorage['bethanie.motion'] = '"on"'` (le PC du porteur de projet a les effets
     d'animation Windows coupés : sans ce réglage, aucune animation ne joue) ;
   - ralenti ×10 pour juger le mouvement : CDP `Animation.setPlaybackRate({ playbackRate: 0.1 })` puis captures ;
   - réglage « Réduites » ou appareil en mouvement réduit : rien de masqué, rien qui bouge ;
   - aucun défilement horizontal à 360, 768, 1024 et 1440 px ; aucun panneau sous la barre d'onglets.
6. **Documenter** : ligne dans `docs/ARCHITECTURE.md` §4.8 et exigence `MOT-xx` dans `docs/CAHIER_DES_CHARGES.md` §4.12.

## 4. Pièges déjà rencontrés

- Une animation `both` sur `transform` bloque toute autre transformation après coup (l'inclinaison des cartes ne
  marchait pas tant que `stagger` utilisait `both`).
- `prefers-reduced-motion` est vrai dans le navigateur de test sur ce PC : forcer `"on"` dans les tests.
- Le clic sur « Découvrir » dans un test change d'écran : revenir à l'accueil avant la suite.
- Les images `loading="lazy"` cachées sur mobile (`hidden lg:block`) ne se chargent jamais en largeur téléphone : ce
  n'est pas une image cassée.
