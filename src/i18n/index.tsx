import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { OrderStatus, PaymentStatus } from '../types';
import { usePersistentState } from '../hooks/usePersistentState';
import { fr, type TranslationKey } from './fr';
import { en } from './en';

export type { TranslationKey };
export type Lang = 'fr' | 'en';

export const LANGUAGES: { id: Lang; name: string }[] = [
  { id: 'fr', name: 'Français' },
  { id: 'en', name: 'English' },
];

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { fr, en };

type Params = Record<string, string | number>;
/** Clés de pluriel sans leur suffixe : « common.items » pour common.items_one / common.items_other. */
type PluralKey = { [K in TranslationKey]: K extends `${infer Base}_one` ? Base : never }[TranslationKey];

const interpolate = (text: string, params?: Params) =>
  params ? text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match)) : text;

/** Première visite : anglais si le navigateur est en anglais, français sinon. */
const detectLanguage = (): Lang => {
  try {
    return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
};

const build = (lang: Lang, setLang: (lang: Lang) => void) => {
  const dict = DICTIONARIES[lang];
  const has = (key: string): key is TranslationKey => key in dict;

  /** Texte traduit, avec remplacement des {paramètres}. */
  const t = (key: TranslationKey, params?: Params) => interpolate(dict[key], params);

  /** Pluriel : en français 0 et 1 sont au singulier, en anglais seul 1 l'est. */
  const tn = (key: PluralKey, n: number, params?: Params) => {
    const singular = lang === 'fr' ? Math.abs(n) < 2 : n === 1;
    return t(`${key}_${singular ? 'one' : 'other'}` as TranslationKey, { n, ...params });
  };

  /** Comme t(), mais les {paramètres} peuvent être des éléments React (texte en gras, liens…). */
  const rich = (key: TranslationKey, nodes: Record<string, React.ReactNode>) =>
    dict[key].split(/(\{\w+\})/).map((part, i) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      return <React.Fragment key={i}>{name && name in nodes ? nodes[name] : part}</React.Fragment>;
    });

  return {
    lang,
    setLang,
    t,
    tn,
    rich,
    cityLabel: (city: string) => (city === 'Dakar' ? t('city.dakar') : t('city.ci', { city })),
    categoryName: (id: string) => {
      const key = `category.${id}.name`;
      return has(key) ? t(key) : id;
    },
    categoryDescription: (id: string) => {
      const key = `category.${id}.description`;
      return has(key) ? t(key) : '';
    },
    /** Libellé d'un moyen de paiement (identifiant venu du serveur, ex : « Carte bancaire »). */
    paymentLabel: (id: string) => {
      const key = `payment.${id}`;
      return has(key) ? t(key) : id;
    },
    /** Badge enregistré en base (« Promotion », « Nouveau »…) ; les remises « -20% » restent telles quelles. */
    badgeLabel: (badge: string) => {
      const key = `badge.${badge}`;
      return has(key) ? t(key) : badge;
    },
    statusLabel: (status: OrderStatus) => t(`status.${status}` as TranslationKey),
    stepLabel: (status: OrderStatus) => t(`step.${status}` as TranslationKey),
    paymentStatusLabel: (status: PaymentStatus) => t(`paymentStatus.${status}` as TranslationKey),
    promoLabel: (code: string) => {
      const key = `promo.${code}`;
      return has(key) ? t(key) : code;
    },
  };
};

export type I18n = ReturnType<typeof build>;

const I18nContext = createContext<I18n | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stored, setLang] = usePersistentState<Lang>('lang', detectLanguage);
  const lang: Lang = stored === 'en' ? 'en' : 'fr';

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => build(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n doit être utilisé dans <I18nProvider>.');
  return value;
};
