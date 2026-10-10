import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { btnGold, useReveal } from './ui';

/** Vidéo de présentation (motion design, marketing/video-pub) : version légère pour le site, 720 × 1280, sans son. */
const VIDEO = '/videos/bethanie-presentation.mp4';
const POSTER = '/videos/bethanie-presentation.webp';
const EXIT_MS = 200;

/**
 * Lecteur plein écran, rendu à la racine de la page (comme les panneaux) : la vidéo n'est téléchargée qu'à
 * l'ouverture. Échap, le fond ou la croix le ferment ; le bouton qui l'a ouvert reprend la main au clavier.
 */
const VideoViewer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useI18n();
  // Le lecteur reste affiché le temps de son animation de fermeture.
  const [rendered, setRendered] = useState(open);
  const closing = rendered && !open;
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    const timer = window.setTimeout(() => setRendered(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  // Affiché dès l'ouverture (la croix peut recevoir le focus tout de suite), et pendant l'animation de fermeture.
  if (!open && !rendered) return null;
  return createPortal(
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4 lg:p-8" role="dialog" aria-modal="true" aria-label={t('home.video.dialog')}>
      <div
        className={`absolute inset-0 bg-black/85 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={onClose}
      ></div>
      <div className={`relative h-full max-h-[min(88vh,1280px)] aspect-[9/16] max-w-full ${closing ? 'animate-toast-out' : 'animate-scale-in'}`}>
        <video
          src={VIDEO}
          poster={POSTER}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="w-full h-full rounded-2xl bg-black object-contain shadow-lift"
        ></video>
        <button
          ref={closeButton}
          onClick={onClose}
          className="absolute -top-3 -right-3 lg:top-0 lg:-right-16 w-11 h-11 rounded-full bg-white text-slate-900 shadow-lift hover:bg-gold-400 cursor-pointer"
          aria-label={t('common.close')}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>,
    document.body
  );
};

/** Encart de l'accueil : aperçu de la vidéo de présentation ; un toucher l'ouvre en grand. */
export const PresentationVideo: React.FC = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const reveal = useReveal<HTMLElement>();
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <section
      {...reveal}
      aria-labelledby="home-video"
      className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-brand-900 text-white"
    >
      <div className="absolute inset-0 bg-pattern-kente opacity-[0.06]" aria-hidden="true"></div>
      <div
        className="absolute -left-20 -bottom-24 w-72 h-72 rounded-full bg-gold-500/20 blur-3xl"
        aria-hidden="true"
      ></div>
      <div className="relative flex items-center gap-4 lg:gap-10 p-4 lg:p-8">
        {/* Aperçu : l'image se rapproche au survol, le bouton lecture « émet » doucement. */}
        <button
          onClick={() => setOpen(true)}
          className="group relative shrink-0 w-28 sm:w-32 lg:w-40 aspect-[9/16] rounded-xl lg:rounded-2xl overflow-hidden ring-2 ring-gold-400/70 shadow-lift cursor-pointer"
          aria-label={t('home.video.watch')}
        >
          <img
            src={POSTER}
            alt=""
            loading="lazy"
            decoding="async"
            width={360}
            height={640}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-300 group-hover:bg-black/25">
            <span className="relative w-12 h-12 lg:w-16 lg:h-16">
              <span className="ping-soft absolute inset-0 rounded-full bg-gold-400/60" aria-hidden="true"></span>
              <span className="relative w-full h-full rounded-full bg-gold-500 text-brand-dark flex items-center justify-center shadow-glow transition-transform duration-300 ease-spring group-hover:scale-110">
                <i className="fa-solid fa-play ml-0.5 lg:text-xl"></i>
              </span>
            </span>
          </span>
          <span className="absolute bottom-1.5 right-1.5 text-[10px] lg:text-xs font-semibold bg-black/60 rounded-md px-1.5 py-0.5 tabular-nums">
            0:35
          </span>
        </button>

        <div className="min-w-0">
          <p className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-gold-400">{t('home.video.kicker')}</p>
          <h2 id="home-video" className="text-lg lg:text-3xl font-semibold mt-1 text-balance">
            {t('home.video.title')}
          </h2>
          <p className="text-xs lg:text-base text-white/75 mt-1.5 lg:mt-2 max-w-xl">{t('home.video.text')}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 lg:mt-5">
            <button onClick={() => setOpen(true)} className={`${btnGold} h-10 lg:h-11 px-4 lg:px-6 text-sm whitespace-nowrap`}>
              <i className="fa-solid fa-play text-xs"></i>
              {/* Libellé court sur les petits écrans (le bouton tient sur une ligne). */}
              <span className="sm:hidden">{t('home.video.watchShort')}</span>
              <span className="hidden sm:inline">{t('home.video.watch')}</span>
            </button>
            <span className="text-[11px] lg:text-xs text-white/55">
              <i className="fa-solid fa-volume-xmark mr-1.5"></i>
              {t('home.video.note')}
            </span>
          </div>
        </div>
      </div>
      <VideoViewer open={open} onClose={close} />
    </section>
  );
};
