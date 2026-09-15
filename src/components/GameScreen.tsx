import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import type { Difficulty, GameMode, Genre, GuessAttempt, GuessResult, Song } from '../types';
import { api } from '../services/api';

const TIMES = [0.1, 0.5, 2, 4, 8, 15];
const LABELS = ['0.1s', '0.5s', '2s', '4s', '8s', '15s'];
const FULL_LABELS = ['0.1 seconds', '0.5 seconds', '2 seconds', '4 seconds', '8 seconds', '15 seconds'];
const BASE = [1000, 800, 600, 400, 200, 100];
const MULT: Record<Difficulty, number> = { easy: 0.75, medium: 1, hard: 1.5 };
const MAX_CLIP_SECONDS = TIMES[TIMES.length - 1];
const GENRES: Genre[] = ['All', 'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical'];
const STAGE_MARKERS = [5, 14, 31, 48, 70, 100];
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Einfach',
  medium: 'Mittel',
  hard: 'Schwer',
};

function chooseClipStart(duration: number): number {
  if (!Number.isFinite(duration) || duration <= MAX_CLIP_SECONDS + 1) return 0;
  const earliest = Math.min(Math.max(duration * 0.15, 4), Math.max(0, duration - MAX_CLIP_SECONDS - 0.25));
  const latest = Math.max(earliest, Math.min(duration * 0.7, duration - MAX_CLIP_SECONDS - 0.5));
  if (latest <= earliest) return earliest;
  return earliest + Math.random() * (latest - earliest);
}

function waitForMetadata(element: HTMLAudioElement): Promise<void> {
  if (element.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(element.duration)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Audio metadata timeout'));
    }, 8000);
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Audio metadata failed'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener('loadedmetadata', onLoaded);
      element.removeEventListener('error', onError);
    };
    element.addEventListener('loadedmetadata', onLoaded, { once: true });
    element.addEventListener('error', onError, { once: true });
    element.load();
  });
}

function waitForCanPlay(element: HTMLAudioElement): Promise<void> {
  if (element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Audio buffer timeout'));
    }, 8000);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Audio buffer failed'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener('canplay', onReady);
      element.removeEventListener('canplaythrough', onReady);
      element.removeEventListener('error', onError);
    };
    element.addEventListener('canplay', onReady, { once: true });
    element.addEventListener('canplaythrough', onReady, { once: true });
    element.addEventListener('error', onError, { once: true });
  });
}

function seekTo(element: HTMLAudioElement, target: number): Promise<void> {
  const safeTarget = Math.max(0, target);
  if (Math.abs(element.currentTime - safeTarget) < 0.025 && element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      element.removeEventListener('seeked', onSeeked);
      resolve();
    };
    const onSeeked = () => finish();
    const timeout = window.setTimeout(finish, 2200);
    element.addEventListener('seeked', onSeeked, { once: true });
    try {
      element.currentTime = safeTarget;
    } catch {
      finish();
    }
  });
}

function readStoredVolume() {
  const stored = Number(localStorage.getItem('cliprush_volume'));
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.8;
}

function volumeIcon(volume: number) {
  if (volume <= 0.01) {
    return <path d="M16.5 12l4.5 4.5-1.5 1.5L15 13.5 10.5 18H7.5v-6H4.5V9h3V3h3L15 7.5 19.5 3 21 4.5 16.5 9l-1.5 1.5L16.5 12z" />;
  }
  return <path d="M14.5 3.5v17l-6-5H4v-7h4.5l6-5zm3.2 4.1a5.2 5.2 0 010 8.8l-1.2-1.7a3.15 3.15 0 000-5.4l1.2-1.7zm2.6-3.1a9 9 0 010 14l-1.3-1.6a6.95 6.95 0 000-10.8l1.3-1.6z" />;
}

function formatAttempt(attempt: GuessAttempt) {
  if (attempt.kind === 'skip') return { title: 'Skipped', subtitle: '' };
  if (attempt.kind === 'giveup') return { title: 'Give up', subtitle: 'Runde beendet' };
  return {
    title: attempt.title,
    subtitle: attempt.artist || (attempt.correct ? 'Richtig erraten' : 'Falscher Versuch'),
  };
}

export default function GameScreen({
  song,
  mode,
  difficulty,
  genre,
  opponent,
  fixedClipStart,
  onEnd,
  onHome,
}: {
  song: Song;
  mode: GameMode;
  difficulty: Difficulty;
  genre: Genre;
  opponent?: string;
  fixedClipStart?: number;
  onEnd: (result: GuessResult) => void;
  onHome: () => void;
}) {
  const [level, setLevel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [notice, setNotice] = useState('');
  const [attempts, setAttempts] = useState<GuessAttempt[]>([]);
  const [volume, setVolume] = useState(readStoredVolume);
  const [showVolume, setShowVolume] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const audio = useRef<HTMLAudioElement>(null);
  const raf = useRef<number | undefined>(undefined);
  const hardStopTimer = useRef<number | undefined>(undefined);
  const mediaGuardCleanup = useRef<(() => void) | undefined>(undefined);
  const clipStart = useRef<number | null>(null);
  const primed = useRef(false);
  const volumeCloseTimer = useRef<number | undefined>(undefined);
  const playbackToken = useRef(0);
  const bars = useMemo(() => Array.from({ length: 24 }, () => 20 + Math.random() * 80), []);

  const cancelPlaybackLoop = () => {
    if (raf.current !== undefined) {
      cancelAnimationFrame(raf.current);
      raf.current = undefined;
    }
    if (hardStopTimer.current !== undefined) {
      window.clearTimeout(hardStopTimer.current);
      hardStopTimer.current = undefined;
    }
    mediaGuardCleanup.current?.();
    mediaGuardCleanup.current = undefined;
  };

  const invalidatePlayback = () => {
    playbackToken.current += 1;
    cancelPlaybackLoop();
  };

  const prepareAudioAtClipStart = async (element: HTMLAudioElement) => {
    await waitForMetadata(element);
    let start = clipStart.current;
    if (start === null) {
      start = Number.isFinite(fixedClipStart) ? Math.max(0, fixedClipStart ?? 0) : chooseClipStart(element.duration);
    }
    const latestSafeStart = Math.max(0, element.duration - MAX_CLIP_SECONDS - 0.05);
    start = Math.min(start, latestSafeStart);
    clipStart.current = start;
    await seekTo(element, start);
    await waitForCanPlay(element);
    setAudioReady(true);
  };

  const resetAudioToStart = () => {
    const element = audio.current;
    const start = clipStart.current;
    if (!element || start === null) return;
    void seekTo(element, start)
      .then(() => waitForCanPlay(element))
      .then(() => setAudioReady(true))
      .catch(() => setAudioReady(false));
  };

  const primeAudioOutput = async (element: HTMLAudioElement) => {
    const start = clipStart.current;
    if (primed.current || start === null) return;
    const previousMuted = element.muted;
    const previousVolume = element.volume;
    try {
      element.muted = true;
      element.volume = 0;
      await element.play();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 160));
      element.pause();
      await seekTo(element, start);
      await waitForCanPlay(element);
      primed.current = true;
    } finally {
      element.muted = previousMuted;
      element.volume = previousVolume;
    }
  };

  const openVolume = () => {
    if (volumeCloseTimer.current) window.clearTimeout(volumeCloseTimer.current);
    setShowVolume(true);
  };

  const closeVolumeSoon = () => {
    if (volumeCloseTimer.current) window.clearTimeout(volumeCloseTimer.current);
    volumeCloseTimer.current = window.setTimeout(() => setShowVolume(false), 260);
  };

  const pauseAndReset = () => {
    invalidatePlayback();
    audio.current?.pause();
    setPlaying(false);
    setPreparing(false);
    setPlayProgress(0);
    resetAudioToStart();
  };

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        setSuggestions(await api.search(trimmed));
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const element = audio.current;
    if (element) element.volume = volume;
    localStorage.setItem('cliprush_volume', String(volume));
  }, [volume]);

  useEffect(() => {
    clipStart.current = Number.isFinite(fixedClipStart) ? Math.max(0, fixedClipStart ?? 0) : null;
    primed.current = false;
    setLevel(0);
    setPlaying(false);
    setPreparing(false);
    setPlayProgress(0);
    setAudioReady(false);
    setQuery('');
    setSuggestions([]);
    setAttempts([]);
    setNotice('');
    invalidatePlayback();
    if (volumeCloseTimer.current) window.clearTimeout(volumeCloseTimer.current);

    const element = audio.current;
    if (!element) return;
    element.pause();
    element.preload = 'auto';
    element.load();

    prepareAudioAtClipStart(element)
      .then(() => primeAudioOutput(element))
      .then(() => {
        const start = clipStart.current;
        if (start !== null) return seekTo(element, start);
      })
      .then(() => setAudioReady(true))
      .catch((error) => {
        console.warn('ClipRush audio pre-buffer/prime failed:', error);
        setAudioReady(false);
      });
  }, [song.id, song.audioUrl, fixedClipStart]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (!document.hidden) return;
      pauseAndReset();
    };
    const onPageHide = () => pauseAndReset();
    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(
    () => () => {
      invalidatePlayback();
      if (volumeCloseTimer.current) window.clearTimeout(volumeCloseTimer.current);
      audio.current?.pause();
    },
    [],
  );

  const finishPlayback = (token: number, completed: boolean) => {
    if (token !== playbackToken.current) return;
    cancelPlaybackLoop();
    audio.current?.pause();
    setPlaying(false);
    setPreparing(false);
    setPlayProgress(completed ? 1 : 0);
    resetAudioToStart();
  };

  const play = async () => {
    if (playing) {
      pauseAndReset();
      return;
    }
    const element = audio.current;
    if (!element || preparing) return;

    const token = ++playbackToken.current;
    setPreparing(true);
    setNotice('');
    setPlayProgress(0);
    cancelPlaybackLoop();

    try {
      if (!audioReady) await prepareAudioAtClipStart(element);
      if (token !== playbackToken.current) return;
      if (!primed.current) await primeAudioOutput(element);
      if (token !== playbackToken.current) return;
      const start = clipStart.current;
      if (start !== null) {
        await seekTo(element, start);
        await waitForCanPlay(element);
      }
      if (token !== playbackToken.current) return;

      element.muted = false;
      element.volume = volume;
      await element.play();
      if (token !== playbackToken.current) {
        element.pause();
        return;
      }

      const wallStart = performance.now();
      const clipDurationMs = TIMES[level] * 1000;
      const mediaTarget = (clipStart.current ?? element.currentTime) + TIMES[level];
      setPlaying(true);
      setPreparing(false);

      const onTimeUpdate = () => {
        if (token !== playbackToken.current) return;
        if (element.currentTime >= mediaTarget - 0.015) finishPlayback(token, true);
      };
      element.addEventListener('timeupdate', onTimeUpdate);
      mediaGuardCleanup.current = () => element.removeEventListener('timeupdate', onTimeUpdate);

      hardStopTimer.current = window.setTimeout(() => finishPlayback(token, true), clipDurationMs + 220);

      const tick = (now: number) => {
        if (token !== playbackToken.current) return;
        const progress = Math.min(1, Math.max(0, now - wallStart) / clipDurationMs);
        setPlayProgress(progress);
        if (progress >= 0.999 || element.ended) {
          finishPlayback(token, true);
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch (error) {
      if (token !== playbackToken.current) return;
      console.error('ClipRush audio playback failed:', error);
      setNotice('Der Clip konnte gerade nicht abgespielt werden. Bitte erneut versuchen.');
      setPlaying(false);
      setPreparing(false);
      setAudioReady(false);
      setPlayProgress(0);
    }
  };

  const finishLostRound = (finalAttempts: GuessAttempt[]) => {
    invalidatePlayback();
    audio.current?.pause();
    setPlaying(false);
    setPreparing(false);
    onEnd({ won: false, timeLevel: level, points: 0, attempts: finalAttempts });
  };

  const advanceToNextLevel = (nextAttempts: GuessAttempt[]) => {
    invalidatePlayback();
    audio.current?.pause();
    setPlaying(false);
    setPreparing(false);
    setPlayProgress(0);
    setAttempts(nextAttempts);
    setLevel((current) => current + 1);
    resetAudioToStart();
  };

  const guess = (candidate: Song) => {
    setQuery('');
    setSuggestions([]);
    if (candidate.id === song.id) {
      invalidatePlayback();
      audio.current?.pause();
      setPlaying(false);
      const finalAttempts: GuessAttempt[] = [
        ...attempts,
        { kind: 'guess', level, title: candidate.title, artist: candidate.artist, correct: true },
      ];
      const points = Math.round(BASE[level] * MULT[difficulty]);
      onEnd({ won: true, timeLevel: level, points, attempts: finalAttempts });
      return;
    }

    const wrongAttempt: GuessAttempt = {
      kind: 'guess',
      level,
      title: candidate.title,
      artist: candidate.artist,
      correct: false,
    };
    const finalAttempts = [...attempts, wrongAttempt];
    if (level === TIMES.length - 1) {
      finishLostRound(finalAttempts);
      return;
    }
    advanceToNextLevel(finalAttempts);
  };

  const nextLevel = () => {
    if (level >= TIMES.length - 1) {
      finishLostRound([...attempts, { kind: 'giveup', level, title: 'Give up' }]);
      return;
    }
    advanceToNextLevel([...attempts, { kind: 'skip', level, title: 'Skipped' }]);
  };

  const endGame = () => finishLostRound([...attempts, { kind: 'giveup', level, title: 'Give up' }]);

  const isLastLevel = level >= TIMES.length - 1;
  const visibleAttempts = attempts.slice(-TIMES.length);
  const placeholders = Math.max(0, TIMES.length - visibleAttempts.length);
  const stageMarker = STAGE_MARKERS[level];
  const timelineProgress = stageMarker * playProgress;

  return (
    <div className="relative h-screen overflow-hidden bg-[#090B10] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(114,255,155,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(124,92,255,0.14),transparent_28%),radial-gradient(circle_at_bottom,rgba(25,88,255,0.08),transparent_34%)]" />
        <div className="absolute -left-8 top-16 h-52 w-52 rounded-full bg-[#1DB954]/8 blur-3xl" />
        <div className="absolute right-10 top-28 h-64 w-64 rounded-full bg-[#7357FF]/10 blur-3xl" />
        <span className="music-note left-[6%] top-[12%] text-[54px]">♪</span>
        <span className="music-note left-[12%] bottom-[16%] text-[34px]">♩</span>
        <span className="music-note right-[10%] top-[18%] text-[48px]">♫</span>
        <span className="music-note right-[16%] bottom-[22%] text-[40px]">♬</span>
      </div>

      <audio ref={audio} src={song.audioUrl} preload="auto" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1120px] flex-col px-4 py-4 sm:px-6">
        <header className="mb-3 shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={onHome} className="rounded-lg px-2 py-1.5 text-sm text-[#B7BAC2] transition hover:text-white">
              ← Hauptmenü
            </button>
            <span className="text-xs font-semibold tracking-[0.18em] text-[#7B8391]">ClipRush</span>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-1.5 backdrop-blur-sm">
            <div className="grid grid-cols-8 gap-1">
              {GENRES.map((entry) => (
                <div
                  key={entry}
                  className={`rounded-xl px-1 py-2 text-center text-[11px] font-medium transition-colors ${entry === genre ? 'bg-white/[0.09] text-white' : 'text-[#757C89]'}`}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="mb-3 flex shrink-0 items-center justify-between text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border px-3 py-1 ${mode === 'multiplayer' ? 'border-[#A855F7]/25 bg-[#A855F7]/10 text-[#D2A7FF]' : 'border-white/10 bg-white/[0.04] text-[#E1E5EA]'}`}>
              {mode === 'multiplayer' ? `Lobby${opponent ? ` · ${opponent}` : ''}` : 'Solo'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[#E1E5EA]">
              {DIFFICULTY_LABEL[difficulty]}
            </span>
          </div>
          <span className="text-[#8A92A1]">Stufe {level + 1}/{TIMES.length}</span>
        </div>

        <section className="mb-3 grid shrink-0 grid-rows-6 gap-2">
          {visibleAttempts.map((attempt, index) => {
            const view = formatAttempt(attempt);
            const isWrongGuess = attempt.kind === 'guess' && !attempt.correct;
            const isSkip = attempt.kind === 'skip';
            return (
              <div
                key={`${attempt.kind}-${attempt.level}-${attempt.title}-${index}`}
                className={`flex min-h-[50px] items-center justify-between gap-3 rounded-2xl border px-4 py-2 ${
                  isWrongGuess
                    ? 'border-[#6F2A34] bg-[#2A1218]/92'
                    : isSkip
                      ? 'border-white/10 bg-white/[0.06]'
                      : 'border-white/10 bg-white/[0.05]'
                }`}
              >
                <div className="min-w-0">
                  <p className={`truncate text-[15px] font-semibold ${isWrongGuess ? 'text-[#FFB3BC]' : 'text-white'}`}>{view.title}</p>
                  {view.subtitle && <p className="truncate text-[11px] text-[#79808D]">{view.subtitle}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-[#A8B0BF]">{LABELS[attempt.level]}</span>
              </div>
            );
          })}

          {Array.from({ length: placeholders }).map((_, index) => (
            <div key={`placeholder-${index}`} className="flex min-h-[50px] items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2">
              <span className="text-[15px] text-[#6A727E]">Noch kein Guess</span>
              <span className="text-[11px] text-[#58606D]">—</span>
            </div>
          ))}
        </section>

        <section className="mb-3 shrink-0">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-[#AAB1BC]">
            <span>Clip-Fortschritt</span>
            <span className="font-semibold text-white/85">{FULL_LABELS[level]}</span>
          </div>
          <div className="relative pt-3">
            <div className="relative h-3.5 overflow-hidden rounded-full border border-white/8 bg-white/[0.08]">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${timelineProgress}%` }} />
              {STAGE_MARKERS.slice(0, -1).map((marker) => (
                <div key={marker} className="absolute top-0 bottom-0 w-px bg-black/30" style={{ left: `${marker}%` }} />
              ))}
            </div>
            <div className="absolute top-0 -translate-x-1/2" style={{ left: `${stageMarker}%` }}>
              <div className="h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-white" />
            </div>
          </div>
        </section>

        <section className="mb-3 shrink-0 rounded-[28px] border border-white/8 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
          <div className="relative grid min-h-[130px] place-items-center">
            <div className="mb-2 flex h-10 w-full max-w-[270px] items-center justify-center gap-[3px]">
              {bars.map((height, index) => (
                <div
                  key={index}
                  className={`wave-bar w-[3px] rounded-full ${playing ? 'playing bg-[#7BEA4E]' : 'bg-white/15'}`}
                  style={{
                    height: `${height}%`,
                    '--bar-duration': `${0.45 + Math.random() * 0.5}s`,
                    '--bar-delay': `${index * 0.02}s`,
                  } as CSSProperties}
                />
              ))}
            </div>

            <button
              onClick={play}
              disabled={preparing}
              className={`grid h-16 w-16 place-items-center rounded-full transition-all duration-200 active:scale-95 ${
                preparing
                  ? 'cursor-wait border border-[#1DB954]/45 bg-[#1DB954]/18 text-[#1DB954]'
                  : playing
                    ? 'bg-white text-black hover:bg-[#ECECEC]'
                    : 'bg-[#6EE33E] text-black hover:bg-[#7aec55] shadow-[0_10px_26px_rgba(110,227,62,0.22)]'
              }`}
              aria-label={playing ? 'Clip pausieren und zurücksetzen' : 'Clip abspielen'}
            >
              {preparing ? (
                <span className="h-6 w-6 rounded-full border-2 border-[#1DB954]/30 border-t-[#1DB954] animate-spin" />
              ) : playing ? (
                <div className="flex gap-1.5">
                  <div className="h-6 w-1.5 rounded-sm bg-current" />
                  <div className="h-6 w-1.5 rounded-sm bg-current" />
                </div>
              ) : (
                <svg viewBox="0 0 24 24" className="ml-0.5 h-7 w-7 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="mt-1 text-[10px] text-[#8B92A1]">
              {audioReady ? (playing ? 'Pausieren = Reset zum gleichen Clip' : 'Audio bereit') : 'Audio wird vorbereitet …'}
            </div>

            <div className="absolute right-0 top-1" onMouseEnter={openVolume} onMouseLeave={closeVolumeSoon}>
              <button
                type="button"
                onClick={() => setShowVolume((current) => !current)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-white/20"
                aria-label="Lautstärke"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">{volumeIcon(volume)}</svg>
              </button>

              <div
                onMouseEnter={openVolume}
                onMouseLeave={closeVolumeSoon}
                className={`absolute bottom-[calc(100%_-_2px)] left-1/2 -translate-x-1/2 pb-2 transition-all duration-150 ${showVolume ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
              >
                <div className="tiktok-volume-popover">
                  <input
                    aria-label="Lautstärke"
                    className="tiktok-volume-slider"
                    style={{ '--progress': `${volume * 100}%` } as CSSProperties}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setVolume(Number(event.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {notice && <div className="mb-2 shrink-0 text-center text-xs text-[#F0B5B5]">{notice}</div>}

        <div className="mt-auto shrink-0">
          <div className="mb-2">
            <button
              onClick={nextLevel}
              className={`w-full rounded-2xl border py-3 text-sm font-medium transition-colors ${isLastLevel ? 'border-[#7A2E2E] bg-[#261414] text-[#F0A2A2] hover:bg-[#2B1717]' : 'border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]'}`}
            >
              {isLastLevel ? 'Finish' : `Skip → ${LABELS[level + 1]}`}
            </button>
          </div>

          <div className="relative">
            {suggestions.length > 0 && (
              <div className="absolute bottom-full z-20 mb-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#12161E]/96 shadow-2xl backdrop-blur-xl animate-slide-up">
                <div className="max-h-[280px] overflow-auto no-scrollbar">
                  {suggestions.map((candidate, index) => (
                    <button
                      key={candidate.id}
                      onMouseDown={() => guess(candidate)}
                      className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.05] ${index > 0 ? 'border-t border-white/6' : ''}`}
                    >
                      <img src={candidate.albumArt} alt={candidate.album} className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <b className="block truncate text-[14px] text-white">{candidate.title}</b>
                        <span className="block truncate text-xs text-[#8D96A6]">{candidate.artist}</span>
                      </div>
                      <span className="text-[10px] text-[#768093]">{candidate.genre}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Search a song or artist"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#7A8190] focus:border-[#1DB954]"
              />
              <button type="button" onClick={endGame} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-[#F2F2F2]">
                Give up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
