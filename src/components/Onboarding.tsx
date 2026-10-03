import React, { useEffect, useState } from 'react';
import { artisanWoodworkerImg, heroAfricanMarketImg } from '../data/mockData';
import { TranslationKey, useI18n } from '../i18n';
import { AuthScreen } from '../screens/AuthScreen';
import { BethanieMark } from './BethanieLogo';
import { LanguageSwitcher } from './LanguageSwitcher';

interface OnboardingProps {
  isLoggedIn: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  onFinish: () => void;
}

const SLIDES: { image: string; title: TranslationKey; text: TranslationKey }[] = [
  { image: heroAfricanMarketImg, title: 'onb.slide1.title', text: 'onb.slide1.text' },
  { image: artisanWoodworkerImg, title: 'onb.slide2.title', text: 'onb.slide2.text' },
];

type Stage = 'splash' | 'slides' | 'auth';

/** Accueil de la première visite sur mobile : écran de démarrage, deux écrans de présentation, connexion. */
export const Onboarding: React.FC<OnboardingProps> = ({ isLoggedIn, onLogin, onRegister, onFinish }) => {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>('splash');
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    if (stage !== 'splash') return;
    const timer = window.setTimeout(() => setStage('slides'), 1900);
    return () => window.clearTimeout(timer);
  }, [stage]);

  const next = () => {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else if (isLoggedIn) onFinish();
    else setStage('auth');
  };

  if (stage === 'splash') {
    return (
      <div
        className="fixed inset-0 z-90 bg-[radial-gradient(circle_at_50%_30%,#17784a_0%,#0f5132_45%,#0a3622_100%)] text-white flex flex-col items-center justify-center px-8 text-center overflow-hidden cursor-pointer"
        onClick={() => setStage('slides')}
        role="dialog"
        aria-label={t('onb.welcome')}
      >
        <div className="relative z-10 -mt-24 flex flex-col items-center">
          <div className="relative animate-scale-in">
            <span
              className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(240,192,96,0.45)_0%,rgba(240,192,96,0)_65%)] animate-glow"
              aria-hidden="true"
            ></span>
            {[18, 42, 68, 84].map((left, i) => (
              <span
                key={left}
                className="particle"
                style={{ left: `${left}%`, bottom: `${10 + (i % 2) * 18}%`, '--delay': `${i * 650}ms` } as React.CSSProperties}
                aria-hidden="true"
              ></span>
            ))}
            <BethanieMark animated className="relative w-36 h-36 drop-shadow-xl" />
          </div>
          <p className="font-brand font-bold text-5xl tracking-[0.06em] text-gold-400 mt-6 animate-rise-in" style={{ '--delay': '200ms' } as React.CSSProperties}>
            BÉTHANIE
          </p>
          <p className="text-sm text-white/90 mt-2 font-medium animate-rise-in" style={{ '--delay': '320ms' } as React.CSSProperties}>
            {t('common.slogan')}
          </p>
          <p
            className="text-[15px] leading-relaxed text-white/85 mt-10 max-w-xs animate-rise-in"
            style={{ '--delay': '450ms' } as React.CSSProperties}
          >
            {t('common.tagline')}
          </p>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-[34%] bg-pattern-kente opacity-70"
          style={{ maskImage: 'linear-gradient(to top, black 35%, transparent)', WebkitMaskImage: 'linear-gradient(to top, black 35%, transparent)' }}
          aria-hidden="true"
        ></div>
        <div className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] w-28 h-1 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-white animate-splash-bar"></div>
        </div>
      </div>
    );
  }

  if (stage === 'auth') {
    return (
      <div className="fixed inset-0 z-90 bg-white overflow-y-auto">
        <AuthScreen
          onSkip={onFinish}
          onLogin={async (email, password) => {
            await onLogin(email, password);
            onFinish();
          }}
          onRegister={async (data) => {
            await onRegister(data);
            onFinish();
          }}
        />
      </div>
    );
  }

  const current = SLIDES[slide];
  const total = SLIDES.length + (isLoggedIn ? 0 : 1);
  return (
    <div className="fixed inset-0 z-90 bg-white flex flex-col overflow-y-auto" role="dialog" aria-label={t('onb.about')}>
      <div key={slide} className="relative h-[56vh] min-h-72 shrink-0 animate-fade-in">
        <img src={current.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-black/25 via-transparent to-white"></div>
        <div className="absolute top-0 inset-x-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between">
          <LanguageSwitcher className="bg-white/90! shadow-sm" />
          <button
            onClick={() => (isLoggedIn ? onFinish() : setStage('auth'))}
            className="text-sm font-semibold text-white bg-black/30 backdrop-blur px-4 py-2 rounded-full cursor-pointer"
          >
            {t('onb.skip')}
          </button>
        </div>
      </div>

      <div key={`text-${slide}`} className="flex-1 px-8 pt-4 text-center">
        <h1 className="text-2xl font-semibold text-brand-900 text-balance animate-rise-in">{t(current.title)}</h1>
        <p
          className="text-[15px] text-slate-500 leading-relaxed mt-3 max-w-xs mx-auto animate-rise-in"
          style={{ '--delay': '90ms' } as React.CSSProperties}
        >
          {t(current.text)}
        </p>
      </div>

      <div className="px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 flex items-end justify-between">
        <div className="flex gap-1.5 mb-6" aria-label={t('onb.step', { n: slide + 1, total })}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-gold-500' : 'w-2 bg-slate-200'}`}
            ></span>
          ))}
        </div>
        <button onClick={next} className="flex flex-col items-center gap-1.5 cursor-pointer group">
          <span className="w-16 h-16 rounded-full bg-brand-900 group-hover:bg-brand-dark text-white flex items-center justify-center shadow-lg shadow-brand-900/30 transition-colors">
            <i className="fa-solid fa-arrow-right text-xl transition-transform duration-200 group-hover:translate-x-0.5"></i>
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {slide === SLIDES.length - 1 && isLoggedIn ? t('onb.start') : t('onb.next')}
          </span>
        </button>
      </div>
    </div>
  );
};
