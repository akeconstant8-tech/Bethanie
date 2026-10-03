import { useEffect, useState } from 'react';

const PREFIX = 'bethanie.';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

/**
 * useState sauvegardé dans le navigateur (localStorage).
 * Sert au panier, aux favoris des visiteurs non connectés et aux préférences (ville, code promo).
 */
export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    return read(key, fallback);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Stockage plein ou indisponible (navigation privée) : on continue sans persistance.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
