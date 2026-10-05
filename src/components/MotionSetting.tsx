import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { MotionPreference, setMotionPreference, useMotionPreference } from '../utils/motion';
import { BottomSheet } from './ui';

const CHOICES: { id: MotionPreference; icon: string }[] = [
  { id: 'auto', icon: 'fa-wand-magic-sparkles' },
  { id: 'on', icon: 'fa-play' },
  { id: 'off', icon: 'fa-pause' },
];

/**
 * Ligne « Animations » du Profil et son panneau de choix.
 * « Automatique » suit le réglage de l'appareil ; « Toujours » montre les animations même si l'appareil
 * demande de les réduire (Windows : Effets d'animation désactivés) ; « Réduites » les coupe.
 */
export const MotionSetting: React.FC = () => {
  const { t } = useI18n();
  const preference = useMotionPreference();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full flex items-center gap-3.5 px-4 py-3 text-left hover:bg-surface-light transition-colors cursor-pointer"
      >
        <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
          <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
        </span>
        <span className="flex-1 text-sm font-medium text-slate-800">{t('motion.label')}</span>
        <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">{t(`motion.${preference}`)}</span>
        <i className="fa-solid fa-chevron-right text-xs text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5"></i>
      </button>

      <BottomSheet open={open} title={t('motion.label')} onClose={() => setOpen(false)}>
        <div role="radiogroup" aria-label={t('motion.label')} className="space-y-2.5">
          {CHOICES.map(({ id, icon }) => {
            const selected = preference === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setMotionPreference(id);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                  selected ? 'border-brand-900 bg-brand-50' : 'border-slate-200 hover:border-brand-700'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selected ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <i className={`fa-solid ${icon} text-sm`}></i>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{t(`motion.${id}`)}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{t(`motion.${id}.hint`)}</span>
                </span>
                {selected && <i className="fa-solid fa-circle-check text-brand-900 mt-1 animate-pop"></i>}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
};
