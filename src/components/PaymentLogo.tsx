import React from 'react';

/** Pastilles aux couleurs des moyens de paiement (repères visuels, pas les logos officiels). */
const BADGES: Record<string, { bg: string; content: React.ReactNode }> = {
  'Orange Money': { bg: 'bg-[#FF7900] text-white', content: <span className="font-display font-bold text-[13px]">OM</span> },
  'MTN MoMo': { bg: 'bg-[#FFCC00] text-[#004F71]', content: <span className="font-display font-bold text-[11px]">MTN</span> },
  'Moov Money': { bg: 'bg-[#0066B3] text-white', content: <span className="font-display font-bold text-[11px]">moov</span> },
  Wave: { bg: 'bg-[#1DC8F2] text-white', content: <i className="fa-solid fa-water"></i> },
  'Carte bancaire': { bg: 'bg-slate-800 text-white', content: <i className="fa-solid fa-credit-card"></i> },
  Visa: { bg: 'bg-slate-800 text-white', content: <i className="fa-brands fa-cc-visa text-lg"></i> },
  'Paiement à la livraison': { bg: 'bg-emerald-600 text-white', content: <i className="fa-solid fa-money-bill-wave"></i> },
};

export const PaymentLogo: React.FC<{ method: string; className?: string }> = ({ method, className = 'w-10 h-10' }) => {
  const badge = BADGES[method] ?? BADGES['Carte bancaire'];
  return (
    <span className={`${className} rounded-xl ${badge.bg} flex items-center justify-center shrink-0`} aria-hidden="true">
      {badge.content}
    </span>
  );
};

/** Petit drapeau dessiné en CSS (les émojis drapeaux ne s'affichent pas sous Windows). */
export const PhoneFlag: React.FC<{ phone: string }> = ({ phone }) => {
  const digits = phone.replace(/[^\d+]/g, '');
  const stripes = digits.startsWith('+221')
    ? ['bg-[#00853F]', 'bg-[#FDEF42]', 'bg-[#E31B23]']
    : ['bg-[#F77F00]', 'bg-white', 'bg-[#009E60]'];
  return (
    <span className="flex w-6 h-4 rounded-[3px] overflow-hidden ring-1 ring-black/10 shrink-0" aria-hidden="true">
      {stripes.map((color) => (
        <span key={color} className={`flex-1 ${color}`}></span>
      ))}
    </span>
  );
};
