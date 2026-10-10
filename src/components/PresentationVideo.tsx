import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { btnGold, useReveal } from './ui';

/**
 * Vidéo de présentation (motion design, marketing/video-pub) : la musique et la voix off française sont dans la
 * bande-son de la vidéo. L'aperçu démarre sans le son ; « Activer le son » le rétablit.
 */
const VIDEO = '/videos/bethanie-presentation.mp4';
const POSTER = '/videos/bethanie-presentation.webp';
const EXIT_MS = 200;

/** Active ou coupe le son de la vidéo (propriété `muted` : l'attribut React ne suit pas après le premier rendu). */
const setSound = async (video: HTMLVideoElement, on: boolean) => {
  if (!on) {
    video.muted = true;
    return;
  }
  if (video.ended) video.currentTime = 0;
  video.muted = false;
  if (video.paused) await video.play();
};

const IvorianFlag: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span
    className={`inline-flex h-7 w-10 overflow-hidden rounded-md border border-white/90 shadow-lg ${className}`}
    role="img"
    aria-label={label}
  >
    <span className="flex-1 bg-[#f77f00]" aria-hidden="true"></span>
    <span className="flex-1 bg-white" aria-hidden="true"></span>
    <span className="flex-1 bg-[#009a44]" aria-hidden="true"></span>
  </span>
);

/**
 * Lecteur plein écran rendu à la racine de la page. Échap, le fond ou la croix le ferment ; le bouton qui l'a
 * ouvert reprend la main au clavier.
 */
const VideoViewer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useI18n();
  // Le lecteur reste affiché le temps de son animation de fermeture.
  const [rendered, setRendered] = useState(open);
  // Ouvert d'un toucher, le lecteur démarre avec le son (le navigateur l'autorise après un geste).
  const [soundOn, setSoundOn] = useState(true);
  const [soundError, setSoundError] = useState('');
  const closing = rendered && !open;
  const closeButton = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setSoundOn(true);
      setSoundError('');
      return;
    }
    videoRef.current?.pause();
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

  const toggleSound = async () => {
    const video = videoRef.current;
    if (!video) return;
    setSoundError('');
    try {
      await setSound(video, !soundOn);
      setSoundOn(!soundOn);
    } catch {
      video.muted = true;
      setSoundOn(false);
      setSoundError(t('home.video.soundError'));
    }
  };

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
          ref={videoRef}
          src={VIDEO}
          poster={POSTER}
          controls
          autoPlay
          playsInline
          preload="auto"
          onPlay={(event) => {
            // Lecture lancée sans le son par le navigateur : le bouton permet de le rétablir.
            if (event.currentTarget.muted) setSoundOn(false);
          }}
          onVolumeChange={(event) => setSoundOn(!event.currentTarget.muted)}
          className="w-full h-full rounded-2xl bg-black object-contain shadow-lift"
        ></video>
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black/75 px-3 text-sm font-semibold text-white hover:bg-black"
          >
            <i className={`fa-solid ${soundOn ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true"></i>
            {t(soundOn ? 'home.video.disableSound' : 'home.video.enableSound')}
          </button>
          {soundError && <p role="alert" className="mt-2 max-w-56 rounded-lg bg-black/80 p-2 text-xs text-white">{soundError}</p>}
        </div>
        <IvorianFlag label={t('home.video.flagAlt')} className="absolute left-3 top-[3.75rem] z-10" />
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
  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState('');
  const previewVideo = useRef<HTMLVideoElement>(null);
  const reveal = useReveal<HTMLElement>();

  const togglePreviewSound = async () => {
    const video = previewVideo.current;
    if (!video) return;
    setSoundError('');
    try {
      await setSound(video, !soundOn);
      setSoundOn(!soundOn);
    } catch {
      video.muted = true;
      setSoundOn(false);
      setSoundError(t('home.video.soundError'));
    }
  };

  const openViewer = () => {
    const video = previewVideo.current;
    if (video) {
      video.muted = true;
      video.pause();
    }
    setSoundOn(false);
    setOpen(true);
  };

  const close = React.useCallback(() => {
    setOpen(false);
    const video = previewVideo.current;
    if (video && !video.ended) {
      void video.play().catch(() => setSoundError(t('home.video.playError')));
    }
  }, [t]);

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
        {/* Aperçu en lecture automatique et en boucle, sans le son tant qu'il n'est pas activé. */}
        <div className="group relative shrink-0 w-28 sm:w-32 lg:w-40 aspect-[9/16] overflow-hidden rounded-2xl bg-linear-to-br from-white/70 via-gold-400/80 to-white/20 p-[2px] shadow-2xl shadow-brand-950/35 ring-1 ring-white/35">
          <video
            ref={previewVideo}
            src={VIDEO}
            poster={POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onVolumeChange={(event) => setSoundOn(!event.currentTarget.muted)}
            className="h-full w-full rounded-[14px] bg-black object-cover"
          ></video>
          <button
            onClick={openViewer}
            className="absolute inset-[2px] z-10 flex items-center justify-center rounded-[14px] bg-linear-to-t from-black/50 via-transparent to-black/10 text-white transition-colors duration-200 hover:from-black/65"
            aria-label={t('home.video.watch')}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/20 shadow-xl backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 lg:h-14 lg:w-14">
              <i className="fa-solid fa-expand text-lg" aria-hidden="true"></i>
            </span>
          </button>
          <IvorianFlag label={t('home.video.flagAlt')} className="absolute left-3 top-3 z-20" />
          <span className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/55 px-2 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-md lg:text-xs">
            <i className="fa-solid fa-play text-[9px]" aria-hidden="true"></i>
            0:32
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-gold-400">{t('home.video.kicker')}</p>
          <h2 id="home-video" className="text-lg lg:text-3xl font-semibold mt-1 text-balance">
            {t('home.video.title')}
          </h2>
          <p className="text-xs lg:text-base text-white/75 mt-1.5 lg:mt-2 max-w-xl">{t('home.video.text')}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 lg:mt-5">
            <button onClick={openViewer} className={`${btnGold} h-10 lg:h-11 px-4 lg:px-6 text-sm whitespace-nowrap`}>
              <i className="fa-solid fa-play text-xs"></i>
              {/* Libellé court sur les petits écrans (le bouton tient sur une ligne). */}
              <span className="sm:hidden">{t('home.video.watchShort')}</span>
              <span className="hidden sm:inline">{t('home.video.watch')}</span>
            </button>
            <button
              onClick={togglePreviewSound}
              aria-pressed={soundOn}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-3 text-xs font-semibold text-white hover:bg-white/10"
            >
              <i className={`fa-solid ${soundOn ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true"></i>
              {t(soundOn ? 'home.video.disableSound' : 'home.video.enableSound')}
            </button>
          </div>
          <p className="mt-2 text-[11px] lg:text-xs text-white/55">{t('home.video.note')}</p>
          {soundError && <p role="alert" className="mt-1 text-xs text-amber-200">{soundError}</p>}
        </div>
      </div>
      <VideoViewer open={open} onClose={close} />
    </section>
  );
};
