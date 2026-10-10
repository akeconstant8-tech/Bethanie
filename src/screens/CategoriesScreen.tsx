import React, { useMemo } from 'react';
import { NavigateParams, Product, ScreenType } from '../types';
import { INITIAL_CATEGORIES } from '../data/mockData';
import { HeaderIconButton, MobileHeader, PageTitle } from '../components/ui';
import { useI18n } from '../i18n';

interface CategoriesScreenProps {
  products: Product[];
  onNavigate: (screen: ScreenType, params?: NavigateParams) => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ products, onNavigate }) => {
  const { t, tn, categoryName, categoryDescription } = useI18n();
  const byCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((p) => map.set(p.category, [...(map.get(p.category) ?? []), p]));
    return map;
  }, [products]);

  return (
    <div className="pb-6 lg:pb-12">
      <MobileHeader
        tone="brand"
        title={t('nav.categories')}
        actions={
          <HeaderIconButton
            tone="brand"
            icon="fa-solid fa-magnifying-glass"
            label={t('categories.searchCatalog')}
            onClick={() => onNavigate('catalog', { category: 'all' })}
          />
        }
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-10">
        <PageTitle
          title={t('nav.categories')}
          subtitle={t('categories.subtitle')}
          action={
            <button
              onClick={() => onNavigate('catalog', { category: 'all' })}
              className="text-sm font-semibold text-brand-900 hover:text-brand-700 cursor-pointer"
            >
              {t('categories.seeCatalog')} <i className="fa-solid fa-arrow-right ml-1 text-xs"></i>
            </button>
          }
        />

        <ul className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {INITIAL_CATEGORIES.map((cat) => {
            const items = byCategory.get(cat.id) ?? [];
            return (
              <li key={cat.id}>
                <button
                  onClick={() => onNavigate('catalog', { category: cat.id })}
                  className="group w-full h-full bg-white rounded-2xl border border-slate-200/70 shadow-soft overflow-hidden text-left hover:shadow-lift hover:-translate-y-1 transition-[translate,box-shadow,transform] duration-300 ease-out cursor-pointer flex flex-col"
                >
                  <span className="relative block aspect-square overflow-hidden p-2">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className={`absolute inset-2 rounded-full ${cat.bgColor} ${cat.textColor} flex items-center justify-center text-5xl`}>
                        <i className={`fa-solid ${cat.icon}`}></i>
                      </span>
                    )}
                  </span>
                  <span className="p-3 lg:p-4 flex-1 flex flex-col">
                    <span className="block font-display text-sm lg:text-base font-semibold text-slate-900 transition-colors duration-200 group-hover:text-brand-900">{categoryName(cat.id)}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{categoryDescription(cat.id)}</span>
                    <span className="mt-auto pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {items.length > 0 ? tn('common.productCount', items.length) : t('categories.soon')}
                      </span>
                      <i className="fa-solid fa-arrow-right text-brand-900 group-hover:translate-x-0.5 transition-transform"></i>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
