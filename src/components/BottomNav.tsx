import React from 'react';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
  /** Icône vers laquelle « vole » un produit ajouté au panier. */
  cartTarget?: boolean;
  onClick: () => void;
}

/** Barre d'onglets fixée en bas de l'écran sur mobile (masquée sur ordinateur). */
export const BottomNav: React.FC<{ items: BottomNavItem[]; active: string | null; label: string }> = ({ items, active, label }) => {
  const activeIndex = items.findIndex((item) => item.key === active);
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200/80 pb-safe [view-transition-name:bottom-nav]"
      aria-label={label}
    >
      {/* Indicateur de l'onglet actif : il glisse d'un onglet à l'autre (trait en haut + pastille derrière l'icône). */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 h-16 pointer-events-none transition-[translate,opacity] duration-500 ease-spring"
        style={{
          width: `${100 / items.length}%`,
          translate: `${Math.max(activeIndex, 0) * 100}% 0`,
          opacity: activeIndex === -1 ? 0 : 1,
        }}
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-900"></span>
        <span className="absolute top-1.75 left-1/2 -translate-x-1/2 w-14 h-7.5 rounded-full bg-brand-50"></span>
      </span>
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <button
                onClick={item.onClick}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  isActive ? 'text-brand-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="relative" data-cart-target={item.cartTarget ? '' : undefined}>
                  <i key={isActive ? 'on' : 'off'} className={`fa-solid ${item.icon} text-lg inline-block ${isActive ? 'animate-pop' : ''}`}></i>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      key={item.badge}
                      className="animate-bump absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-gold-500 text-brand-dark text-[10px] font-bold flex items-center justify-center"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
