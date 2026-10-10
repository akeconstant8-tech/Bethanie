import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TranslationKey, useI18n } from '../i18n';
import { btnGold, useReveal } from './ui';

/**
 * Vidéo de présentation (motion design, marketing/video-pub) : la musique et la voix off française sont dans la
 * bande-son. L'aperçu (version légère) démarre sans le son ; le lecteur plein écran joue la version HD 1080 × 1920,
 * téléchargée seulement à l'ouverture.
 */
const VIDEO_PREVIEW = '/videos/bethanie-presentation.mp4';
const VIDEO_HD = '/videos/bethanie-presentation-hd.mp4';
const POSTER = '/videos/bethanie-presentation.webp';
const EXIT_MS = 200;

/** Chapitres de la vidéo (début en secondes, calé sur les scènes). */
const CHAPTERS: { key: TranslationKey; start: number }[] = [
  { key: 'home.video.ch.discover', start: 7.5 },
  { key: 'home.video.ch.order', start: 11.25 },
  { key: 'home.video.ch.pay', start: 15 },
  { key: 'home.video.ch.receive', start: 18.75 },
  { key: 'home.video.ch.sell', start: 22.5 },
];
const clock = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

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

const HdBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useI18n();
  return (
    <span className={`rounded-md bg-gold-400 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-brand-dark shadow-lg ${className}`}>
      {t('home.video.hd')}
    </span>
  );
};

/**
 * Lecteur plein écran rendu à la racine de la page (version HD). Échap, le fond ou la croix le ferment ; le bouton
 * qui l'a ouvert reprend la main au clavier. `startAt` : chapitre choisi (secondes).
 */
const VideoViewer: React.FC<{ open: boolean; startAt: number; onClose: () => void }> = ({ open, startAt, onClose }) => {
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

  // Chapitre choisi : la lecture part de son début (tout de suite si la vidéo est déjà chargée).
  useEffect(() => {
    const video = videoRef.current;
    if (open && video && video.readyState >= 1) {
      video.currentTime = startAt;
      void video.play().catch(() => undefined);
    }
  }, [open, startAt]);

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
      <div className={`relative h-full max-h-[min(90vh,1280px)] aspect-[9/16] max-w-full ${closing ? 'animate-toast-out' : 'animate-scale-in'}`}>
        <video
          ref={videoRef}
          src={VIDEO_HD}
          poster={POSTER}
          controls
          autoPlay
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => {
            if (startAt) event.currentTarget.currentTime = startAt;
          }}
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
        <HdBadge className="absolute right-3 top-3 z-10" />
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

/** Encart de l'accueil (2e position) : grand aperçu en boucle, chapitres sur ordinateur, lecture HD au toucher. */
export const PresentationVideo: React.FC = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState(0);
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

  const openViewer = (from = 0) => {
    const video = previewVideo.current;
    if (video) {
      video.muted = true;
      video.pause();
    }
    setSoundOn(false);
    setStartAt(from);
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
      className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-brand-900 text-white shadow-[0_30px_80px_-30px_rgba(10,54,34,0.75)]"
    >
      <div className="absolute inset-0 bg-pattern-kente opacity-[0.06]" aria-hidden="true"></div>
      <div className="absolute -left-20 -bottom-24 w-80 h-80 rounded-full bg-gold-500/20 blur-3xl" aria-hidden="true"></div>
      <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true"></div>
      <div className="relative flex items-center gap-4 sm:gap-6 lg:gap-12 p-4 sm:p-6 lg:p-10">
        {/* Grand aperçu en lecture automatique et en boucle, sans le son tant qu'il n'est pas activé. */}
        <div className="group relative shrink-0 w-[52%] max-w-52 sm:w-44 sm:max-w-none lg:w-64 aspect-[9/16] overflow-hidden rounded-2xl lg:rounded-3xl bg-linear-to-br from-white/70 via-gold-400/80 to-white/20 p-[2px] shadow-2xl shadow-brand-950/40 ring-1 ring-white/35">
          <video
            ref={previewVideo}
            src={VIDEO_PREVIEW}
            poster={POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onVolumeChange={(event) => setSoundOn(!event.currentTarget.muted)}
            className="h-full w-full rounded-[14px] lg:rounded-[22px] bg-black object-cover"
          ></video>
          <button
            onClick={() => openViewer(0)}
            className="absolute inset-[2px] z-10 flex items-center justify-center rounded-[14px] lg:rounded-[22px] bg-linear-to-t from-black/50 via-transparent to-black/10 text-white transition-colors duration-200 hover:from-black/65"
            aria-label={t('home.video.watch')}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/20 shadow-xl backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 lg:h-16 lg:w-16">
              <i className="fa-solid fa-play ml-0.5 text-lg lg:text-2xl" aria-hidden="true"></i>
            </span>
          </button>
          <IvorianFlag label={t('home.video.flagAlt')} className="absolute left-3 top-3 z-20" />
          <HdBadge className="pointer-events-none absolute right-3 top-3 z-20" />
          <span className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/55 px-2 py-1 text-[10px] font-semibold text-white shadow-lg backdrop-blur-md lg:text-xs">
            <i className="fa-solid fa-play text-[9px]" aria-hidden="true"></i>
            0:32
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] lg:text-sm font-semibold uppercase tracking-wider text-gold-400">{t('home.video.kicker')}</p>
          <h2 id="home-video" className="text-xl sm:text-2xl lg:text-4xl font-bold mt-1 lg:mt-2 tracking-[-0.02em] text-balance">
            {t('home.video.title')}
          </h2>
          <p className="hidden sm:block text-sm lg:text-lg text-white/75 mt-1.5 lg:mt-3 max-w-2xl">{t('home.video.text')}</p>
          <div className="flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-2 mt-3 lg:mt-6">
            <button onClick={() => openViewer(0)} className={`${btnGold} h-10 lg:h-12 px-4 lg:px-7 text-sm lg:text-base whitespace-nowrap`}>
              <i className="fa-solid fa-play text-xs"></i>
              {/* Libellé court sur les petits écrans (le bouton tient sur une ligne). */}
              <span className="sm:hidden">{t('home.video.watchShort')}</span>
              <span className="hidden sm:inline">{t('home.video.watch')}</span>
            </button>
            <button
              onClick={togglePreviewSound}
              aria-pressed={soundOn}
              className="inline-flex min-h-10 lg:min-h-12 items-center gap-2 rounded-xl border border-white/25 px-3 lg:px-4 text-xs lg:text-sm font-semibold text-white hover:bg-white/10"
            >
              <i className={`fa-solid ${soundOn ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true"></i>
              {t(soundOn ? 'home.video.disableSound' : 'home.video.enableSound')}
            </button>
          </div>
          <p className="hidden sm:block mt-2 lg:mt-3 text-[11px] lg:text-xs text-white/55">{t('home.video.note')}</p>
          {soundError && <p role="alert" className="mt-1 text-xs text-amber-200">{soundError}</p>}

          {/* Chapitres (ordinateur) : ouvrent la vidéo HD au bon moment. */}
          <div className="hidden lg:block mt-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{t('home.video.chapters')}</p>
            <ol className="mt-3 grid grid-cols-2 xl:grid-cols-3 gap-2.5">
              {CHAPTERS.map((chapter, i) => (
                <li key={chapter.key}>
                  <button
                    onClick={() => openViewer(chapter.start)}
                    aria-label={t('home.video.chapterLabel', { time: clock(chapter.start), title: t(chapter.key) })}
                    className="group/ch w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-[background-color,border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-gold-400/50 hover:bg-white/10 cursor-pointer"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-sm font-bold text-gold-400 transition-colors duration-200 group-hover/ch:bg-gold-400 group-hover/ch:text-brand-dark">
                      {i < 4 ? `0${i + 1}` : <i className="fa-solid fa-store text-xs"></i>}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{t(chapter.key)}</span>
                      <span className="block text-xs text-white/55 tabular-nums">{clock(chapter.start)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      <div className="relative sm:hidden px-4 pb-4 -mt-1">
        <p className="text-sm text-white/80">{t('home.video.text')}</p>
        <p className="mt-1.5 text-[11px] text-white/55">{t('home.video.note')}</p>
      </div>
      <VideoViewer open={open} startAt={startAt} onClose={close} />
    </section>
  );
};
