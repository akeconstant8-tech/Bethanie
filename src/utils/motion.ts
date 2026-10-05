import type React from 'react';
import { useEffect, useSyncExternalStore } from 'react';
import { prefersReducedMotion } from '../pwa/pwa';

/* ------------------------------------------------------------------ */
/* Transitions entre écrans (API View Transitions)                    */
/* Chrome, Edge, Safari 18+ ; ailleurs, simple fondu (voir App.tsx).   */
/* ------------------------------------------------------------------ */

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

export const supportsViewTransitions = () =>
  typeof (document as ViewTransitionDocument).startViewTransition === 'function' && !prefersReducedMotion();

/** Applique un changement d'écran avec une transition animée quand le navigateur le permet. */
export const withViewTransition = (update: () => void) => {
  const doc = document as ViewTransitionDocument;
  if (!supportsViewTransitions() || !doc.startViewTransition) {
    update();
    return;
  }
  const transition = doc.startViewTransition(update);
  // Une transition interrompue (navigation rapide) n'est pas une erreur.
  transition.ready.catch(() => undefined);
  transition.finished.catch(() => undefined);
  transition.updateCallbackDone.catch(() => undefined);
};

/** Nom partagé par la photo de la carte cliquée et la grande photo de la fiche produit. */
export const SHARED_PHOTO = 'product-photo';

/**
 * Marque la photo d'une carte produit juste avant d'ouvrir la fiche : elle « s'agrandit » vers la fiche.
 * Un seul élément de la page peut porter ce nom, on le retire donc des autres.
 */
export const markSharedPhoto = (element: HTMLElement | null) => {
  document.querySelectorAll<HTMLElement>('[data-shared-photo]').forEach((el) => el.style.removeProperty('view-transition-name'));
  if (!element) return;
  element.dataset.sharedPhoto = '1';
  element.style.setProperty('view-transition-name', SHARED_PHOTO);
};

/* ------------------------------------------------------------------ */
/* Ajout au panier : la photo du produit vole jusqu'au panier          */
/* ------------------------------------------------------------------ */

/** Élément affiché et au moins en partie visible à l'écran. */
export const isOnScreen = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
};

/**
 * Fait voler une vignette du produit depuis `from` (sa photo ou le bouton touché) jusqu'à l'icône du panier visible
 * (`data-cart-target` : barre d'onglets ou barre d'achat sur mobile, en-tête sur ordinateur), qui rebondit à l'arrivée.
 */
export const flyToCart = (image: string, from: Element | null) => {
  // Lecture seule (navigateur sans Web Animations) : aucun objet n'est modifié ici.
  if (!from || prefersReducedMotion() || typeof from.animate !== 'function') return;
  const target = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find(isOnScreen);
  if (!target) return;

  const start = from.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const size = Math.max(44, Math.min(start.width, start.height, 128));
  const x = start.left + start.width / 2 - size / 2;
  const y = start.top + start.height / 2 - size / 2;
  const dx = end.left + end.width / 2 - size / 2 - x;
  const dy = end.top + end.height / 2 - size / 2 - y;
  const duration = Math.round(Math.min(900, Math.max(560, Math.hypot(dx, dy) * 0.9)));

  // Trois niveaux : horizontal, vertical et taille, animés séparément pour obtenir une trajectoire en arc.
  const flyer = document.createElement('div');
  flyer.className = 'fly-to-cart';
  flyer.setAttribute('aria-hidden', 'true');
  flyer.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
  const vertical = document.createElement('div');
  const photo = document.createElement('img');
  photo.src = image;
  photo.alt = '';
  vertical.appendChild(photo);
  flyer.appendChild(vertical);
  document.body.appendChild(flyer);

  const timing = { duration, fill: 'forwards' } as const;
  flyer.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], {
    ...timing,
    easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
  });
  // Vers le bas (barre d'onglets), la vignette est d'abord « lancée » vers le haut ; vers le haut (en-tête), elle file.
  vertical.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${dy}px)` }], {
    ...timing,
    easing: dy > 0 ? 'cubic-bezier(0.5, -0.5, 0.75, 1)' : 'cubic-bezier(0.25, 0.6, 0.4, 1)',
  });
  const shrink = photo.animate(
    [
      { transform: 'scale(1) rotate(0deg)', opacity: 1, borderRadius: '16px' },
      { transform: 'scale(0.6) rotate(-8deg)', opacity: 1, borderRadius: '50%', offset: 0.5 },
      { transform: 'scale(0.16) rotate(0deg)', opacity: 0.5, borderRadius: '50%' },
    ],
    { ...timing, easing: 'ease-in' }
  );

  let done = false;
  // Sécurité : onglet passé en arrière-plan, animation annulée… Annulée dès que la vignette est arrivée.
  let fallback = 0;
  const land = () => {
    if (done) return;
    done = true;
    window.clearTimeout(fallback);
    shrink.onfinish = null;
    flyer.remove();
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'ease-out' }
    );
  };
  shrink.onfinish = land;
  fallback = window.setTimeout(land, duration + 300);
};

/* ------------------------------------------------------------------ */
/* Cartes produit : inclinaison 3D qui suit la souris (ordinateur)     */
/* ------------------------------------------------------------------ */

const TILT_PROPERTIES = ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y'];

/** À poser sur un élément portant la classe `tilt` (et éventuellement un enfant `tilt-glare`). */
export const tiltHandlers = {
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    element.style.setProperty('--tilt-x', `${((0.5 - py) * 8).toFixed(2)}deg`);
    element.style.setProperty('--tilt-y', `${((px - 0.5) * 10).toFixed(2)}deg`);
    element.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
    element.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
  },
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
    TILT_PROPERTIES.forEach((name) => event.currentTarget.style.removeProperty(name));
  },
};

/* ------------------------------------------------------------------ */
/* Préférence « Animations » (Profil) : auto, toujours, réduites       */
/* ------------------------------------------------------------------ */

/**
 * auto : suit le réglage de l'appareil (prefers-reduced-motion) ; on : animations même si l'appareil demande moins
 * d'animations (Windows « Effets d'animation » désactivés…) ; off : animations réduites. Posée sur <html data-motion>,
 * lue par index.css et par prefersReducedMotion().
 */
export type MotionPreference = 'auto' | 'on' | 'off';

const MOTION_KEY = 'bethanie.motion';
const motionListeners = new Set<() => void>();
let motionPreference: MotionPreference = 'auto';

const applyMotionPreference = (preference: MotionPreference) => {
  motionPreference = preference;
  if (preference === 'auto') delete document.documentElement.dataset.motion;
  else document.documentElement.dataset.motion = preference;
};

/** À appeler une fois, avant le premier rendu (main.tsx). */
export const initMotionPreference = () => {
  let stored: unknown = 'auto';
  try {
    stored = JSON.parse(window.localStorage.getItem(MOTION_KEY) ?? '"auto"');
  } catch {
    // stockage indisponible : réglage de l'appareil
  }
  applyMotionPreference(stored === 'on' || stored === 'off' ? stored : 'auto');
};

export const setMotionPreference = (preference: MotionPreference) => {
  applyMotionPreference(preference);
  try {
    window.localStorage.setItem(MOTION_KEY, JSON.stringify(preference));
  } catch {
    // le choix vaut au moins pour cette visite
  }
  motionListeners.forEach((listener) => listener());
};

export const useMotionPreference = () =>
  useSyncExternalStore(
    (listener) => {
      motionListeners.add(listener);
      return () => motionListeners.delete(listener);
    },
    () => motionPreference
  );

/* ------------------------------------------------------------------ */
/* Onde au toucher sur les boutons (classe « ripple »)                 */
/* ------------------------------------------------------------------ */

/** Arrête les ondes (retire l'écouteur) ; `null` tant que `initRipples()` n'a pas été appelée. */
let stopRipples: (() => void) | null = null;

const startRipple = (event: PointerEvent) => {
  const host = (event.target as Element | null)?.closest?.<HTMLElement>('.ripple');
  if (!host || host.matches(':disabled') || prefersReducedMotion()) return;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;
  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.setAttribute('aria-hidden', 'true');
  wave.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
  host.appendChild(wave);
  // Filet de sécurité si « animationend » ne se déclenche jamais (onglet en arrière-plan, animation coupée).
  const fallback = window.setTimeout(() => wave.remove(), 1000);
  // { once: true } : l'écouteur se retire de lui-même ; le filet de sécurité devenu inutile est annulé.
  wave.addEventListener(
    'animationend',
    () => {
      window.clearTimeout(fallback);
      wave.remove();
    },
    { once: true }
  );
};

/**
 * Un seul écouteur pour toute l'application : une onde part du point touché sur tout élément `.ripple`.
 * Appelée une fois depuis `main.tsx` ; un nouvel appel ne rajoute pas d'écouteur. Renvoie la fonction qui le retire.
 */
export const initRipples = () => {
  if (stopRipples) return stopRipples;
  document.addEventListener('pointerdown', startRipple, { passive: true });
  stopRipples = () => {
    document.removeEventListener('pointerdown', startRipple);
    stopRipples = null;
  };
  return stopRipples;
};

/* ------------------------------------------------------------------ */
/* Champ de recherche qui « tape » des exemples                        */
/* ------------------------------------------------------------------ */

/**
 * Fait défiler des exemples de recherche dans le texte d'aide du champ (« Essayez « sac en cuir » »), lettre par
 * lettre. Le texte d'aide est modifié directement (aucun rendu React), et seulement quand le champ est vide et
 * inactif. `examples` : exemples séparés par « | » ; `template` : texte contenant « {q} ».
 */
export const useTypewriterPlaceholder = (
  input: React.RefObject<HTMLInputElement | null>,
  base: string,
  examples: string,
  template: string
) => {
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    field.placeholder = base;
    const words = examples.split('|').map((w) => w.trim()).filter(Boolean);
    if (words.length === 0 || prefersReducedMotion()) return;

    let index = 0;
    let length = 0;
    let erasing = false;
    let timer = 0;
    const tick = () => {
      if (document.activeElement === field || field.value) {
        field.placeholder = base;
        length = 0;
        erasing = false;
        timer = window.setTimeout(tick, 1500);
        return;
      }
      const word = words[index % words.length];
      length += erasing ? -1 : 1;
      field.placeholder = length > 0 ? template.replace('{q}', word.slice(0, length)) : base;
      let delay = erasing ? 35 : 75;
      if (!erasing && length >= word.length) {
        erasing = true;
        delay = 1700;
      } else if (erasing && length <= 0) {
        erasing = false;
        index += 1;
        delay = 900;
      }
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 2200);
    return () => {
      window.clearTimeout(timer);
      field.placeholder = base;
    };
  }, [input, base, examples, template]);
};
