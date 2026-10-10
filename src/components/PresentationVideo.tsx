import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { btnGold, useReveal } from './ui';

/** Vidéo de présentation, accompagnée d’une voix off française. */
const VIDEO = '/videos/bethanie-presentation.mp4';
const POSTER = '/videos/bethanie-presentation.webp';
const VOICEOVER = '/audio/bethanie-presentation-fr.wav';
const EXIT_MS = 200;

const syncVoiceover = (video: HTMLVideoElement, audio: HTMLAudioElement) => {
  const targetTime = Math.min(video.currentTime, Number.isFinite(audio.duration) ? audio.duration : video.currentTime);
  if (audio.ended ? targetTime < audio.duration : Math.abs(audio.currentTime - targetTime) > 0.5) {
    audio.currentTime = targetTime;
  }
};

const resumeVoiceover = (video: HTMLVideoElement, audio: HTMLAudioElement, onError: () => void) => {
  syncVoiceover(video, audio);
  if (audio.paused && video.currentTime < audio.duration) void audio.play().catch(onError);
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
  const [voiceoverOn, setVoiceoverOn] = useState(false);
  const [soundError, setSoundError] = useState('');
  const closing = rendered && !open;
  const closeButton = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVoiceoverOn(false);
      setSoundError('');
      return;
    }
    audioRef.current?.pause();
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

  const toggleVoiceover = async () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    if (voiceoverOn) {
      audio.pause();
      setVoiceoverOn(false);
      return;
    }

    setSoundError('');
    try {
      if (video.ended) video.currentTime = 0;
      if (video.paused) await video.play();
      audio.currentTime = Math.min(video.currentTime, Number.isFinite(audio.duration) ? audio.duration : video.currentTime);
      audio.playbackRate = video.playbackRate;
      await audio.play();
      setVoiceoverOn(true);
    } catch {
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
          muted
          playsInline
          preload="auto"
          onPause={() => audioRef.current?.pause()}
          onPlay={(event) => {
            const audio = audioRef.current;
            if (audio && voiceoverOn) {
              resumeVoiceover(event.currentTarget, audio, () => {
                setVoiceoverOn(false);
                setSoundError(t('home.video.soundError'));
              });
            }
          }}
          onSeeked={(event) => {
            const audio = audioRef.current;
            if (audio && voiceoverOn) {
              resumeVoiceover(event.currentTarget, audio, () => {
                setVoiceoverOn(false);
                setSoundError(t('home.video.soundError'));
              });
            }
          }}
          onTimeUpdate={(event) => {
            const audio = audioRef.current;
            if (audio && voiceoverOn) syncVoiceover(event.currentTarget, audio);
          }}
          onRateChange={(event) => {
            if (audioRef.current) audioRef.current.playbackRate = event.currentTarget.playbackRate;
          }}
          onEnded={() => {
            audioRef.current?.pause();
            setVoiceoverOn(false);
          }}
          className="w-full h-full rounded-2xl bg-black object-contain shadow-lift"
        ></video>
        <audio ref={audioRef} src={VOICEOVER} preload="metadata" aria-hidden="true" tabIndex={-1}></audio>
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={toggleVoiceover}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black/75 px-3 text-sm font-semibold text-white hover:bg-black"
          >
            <i className={`fa-solid ${voiceoverOn ? 'fa-volume-high' : 'fa-volume-low'}`} aria-hidden="true"></i>
            {t(voiceoverOn ? 'home.video.disableSound' : 'home.video.enableSound')}
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
  const [voiceoverOn, setVoiceoverOn] = useState(false);
  const [soundError, setSoundError] = useState('');
  const previewVideo = useRef<HTMLVideoElement>(null);
  const previewAudio = useRef<HTMLAudioElement>(null);
  const reveal = useReveal<HTMLElement>();

  const togglePreviewVoiceover = async () => {
    const video = previewVideo.current;
    const audio = previewAudio.current;
    if (!video || !audio) return;
    if (voiceoverOn) {
      audio.pause();
      setVoiceoverOn(false);
      return;
    }

    setSoundError('');
    try {
      if (video.ended) video.currentTime = 0;
      if (video.paused) await video.play();
      audio.currentTime = Math.min(video.currentTime, Number.isFinite(audio.duration) ? audio.duration : video.currentTime);
      audio.playbackRate = video.playbackRate;
      await audio.play();
      setVoiceoverOn(true);
    } catch {
      setSoundError(t('home.video.soundError'));
    }
  };

  const openViewer = () => {
    previewAudio.current?.pause();
    previewVideo.current?.pause();
    setVoiceoverOn(false);
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
        {/* Aperçu en lecture automatique, sans son tant que la voix off n’est pas activée. */}
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
            onPause={() => previewAudio.current?.pause()}
            onPlay={(event) => {
              const audio = previewAudio.current;
              if (audio && voiceoverOn) {
                resumeVoiceover(event.currentTarget, audio, () => {
                  setVoiceoverOn(false);
                  setSoundError(t('home.video.soundError'));
                });
              }
            }}
            onSeeked={(event) => {
              const audio = previewAudio.current;
              if (audio && voiceoverOn) {
                resumeVoiceover(event.currentTarget, audio, () => {
                  setVoiceoverOn(false);
                  setSoundError(t('home.video.soundError'));
                });
              }
            }}
            onTimeUpdate={(event) => {
              const audio = previewAudio.current;
              if (audio && voiceoverOn) {
                resumeVoiceover(event.currentTarget, audio, () => {
                  setVoiceoverOn(false);
                  setSoundError(t('home.video.soundError'));
                });
              }
            }}
            onRateChange={(event) => {
              if (previewAudio.current) previewAudio.current.playbackRate = event.currentTarget.playbackRate;
            }}
            onEnded={(event) => {
              const audio = previewAudio.current;
              if (event.currentTarget.loop) {
                if (audio && voiceoverOn) {
                  audio.currentTime = 0;
                  void audio.play().catch(() => {
                    setVoiceoverOn(false);
                    setSoundError(t('home.video.soundError'));
                  });
                }
                return;
              }
              audio?.pause();
              setVoiceoverOn(false);
            }}
            className="h-full w-full rounded-[14px] bg-black object-cover"
          ></video>
          <audio ref={previewAudio} src={VOICEOVER} preload="metadata" aria-hidden="true" tabIndex={-1}></audio>
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
            0:35
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
              onClick={togglePreviewVoiceover}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-3 text-xs font-semibold text-white hover:bg-white/10"
            >
              <i className={`fa-solid ${voiceoverOn ? 'fa-volume-high' : 'fa-volume-low'}`} aria-hidden="true"></i>
              {t(voiceoverOn ? 'home.video.disableSound' : 'home.video.enableSound')}
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
