import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { GuessDistribution, GuessResult, Song } from '../types';

const LEVEL_LABELS = ['0.1s', '0.5s', '2s', '4s', '8s', '15s'];
const DISTRIBUTION_LABELS = ['1', '2', '3', '4', '5', '6', 'X'];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export default function ResultScreen({
  song,
  result,
  distribution,
  total,
  onNext,
  onBoard,
  onHome,
  nextLabel = 'Next',
  nextDisabled = false,
  contextLabel,
  titleOverride,
}: {
  song: Song;
  result: GuessResult;
  distribution?: GuessDistribution;
  total: number;
  onNext: () => void;
  onBoard: () => void;
  onHome: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  contextLabel?: string;
  titleOverride?: string;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const attempts = result.attempts || [];
  const counts = distribution?.counts?.length === 7 ? distribution.counts : [0, 0, 0, 0, 0, 0, 0];
  const maxCount = Math.max(1, ...counts);
  const userBucket = result.won ? Math.max(0, Math.min(5, result.timeLevel)) : 6;
  const titleText = titleOverride || (result.won ? 'You Won!' : 'Game Over');

  useEffect(() => {
    const audio = player.current;
    if (!audio) return;

    const stored = Number(localStorage.getItem('cliprush_volume'));
    if (Number.isFinite(stored) && stored >= 0 && stored <= 1) audio.volume = stored;

    const syncTime = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };
    const syncPlay = () => setPlaying(!audio.paused);

    audio.addEventListener('loadedmetadata', syncTime);
    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('play', syncPlay);
    audio.addEventListener('pause', syncPlay);
    audio.addEventListener('ended', syncPlay);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', syncTime);
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('play', syncPlay);
      audio.removeEventListener('pause', syncPlay);
      audio.removeEventListener('ended', syncPlay);
    };
  }, []);

  const topText = useMemo(() => {
    if (!distribution) return 'Noch keine Vergleichsdaten verfügbar.';
    return `Top ${distribution.topPercent.toFixed(1)}% der bisherigen Spieler`;
  }, [distribution]);

  const togglePlayback = async () => {
    const audio = player.current;
    if (!audio) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (error) {
      console.error('ClipRush full player failed:', error);
    }
  };

  const seek = (value: number) => {
    if (!player.current) return;
    player.current.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/72 p-3 backdrop-blur-[8px] animate-fade-in">
      <audio ref={player} src={song.audioUrl} preload="metadata" />

      <div className="w-full max-w-[640px] overflow-hidden rounded-[24px] border border-white/10 bg-[#11151D]/98 shadow-[0_28px_90px_rgba(0,0,0,.48)]">
        <div className={`px-5 py-3 text-center text-2xl font-black ${result.won ? 'bg-[#58CB2B] text-black' : 'bg-[#D92828] text-white'}`}>
          {titleText}
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {contextLabel && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7F899A]">{contextLabel}</p>}
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7F899A]">The song was</p>
              <h2 className="truncate text-xl font-bold text-white" title={`${song.title} - ${song.artist}`}>
                {song.title} - {song.artist}
              </h2>
              <p className="truncate text-xs text-[#737D8E]">{song.album} · {song.year || '?'} · {song.genre}</p>
            </div>
            <div className={`shrink-0 rounded-2xl border px-3 py-2 text-center ${result.won ? 'border-[#58CB2B]/30 bg-[#58CB2B]/10' : 'border-[#D92828]/30 bg-[#D92828]/10'}`}>
              <p className="text-[10px] uppercase tracking-wide text-[#8A94A5]">Punkte</p>
              <p className={`text-lg font-black ${result.won ? 'text-[#70E448]' : 'text-[#FF8C8C]'}`}>{result.won ? `+${result.points}` : '0'}</p>
            </div>
          </div>

          <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#818A99]">Guess Distribution</p>
              <span className="text-[11px] font-semibold text-white/80">{topText}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {DISTRIBUTION_LABELS.map((label, index) => (
                <div key={label} className="grid grid-cols-[12px_1fr_24px] items-center gap-2">
                  <span className={`text-[10px] font-semibold ${userBucket === index ? 'text-[#70E448]' : 'text-[#A3AAB6]'}`}>{label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${userBucket === index ? 'bg-[#62D73A]' : 'bg-[#555E6B]'}`}
                      style={{ width: `${counts[index] === 0 ? 0 : Math.max(5, (counts[index] / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-[9px] text-[#687181]">{counts[index]}</span>
                </div>
              ))}
            </div>
          </div>

          {attempts.length > 0 && (
            <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#818A99]">Your guesses</p>
                <span className="text-[10px] text-[#6E7888]">{result.won ? `Gelöst bei ${LEVEL_LABELS[result.timeLevel]}` : 'Nicht erraten'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {attempts.map((attempt, index) => {
                  const wrongGuess = attempt.kind === 'guess' && !attempt.correct;
                  const correctGuess = attempt.kind === 'guess' && attempt.correct;
                  const title = attempt.kind === 'skip' ? 'Skipped' : attempt.kind === 'giveup' ? 'Give up' : attempt.title;
                  return (
                    <div
                      key={`${attempt.kind}-${attempt.level}-${index}`}
                      className={`min-w-0 rounded-xl border px-2.5 py-2 ${correctGuess ? 'border-[#4EBC36]/30 bg-[#4EBC36]/8' : wrongGuess ? 'border-[#A6424D]/35 bg-[#A6424D]/8' : 'border-white/8 bg-white/[0.03]'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[11px] font-semibold ${correctGuess ? 'text-[#7BEA59]' : wrongGuess ? 'text-[#F2A8B0]' : 'text-white'}`}>{title}</span>
                        <span className="shrink-0 text-[9px] text-[#7F8998]">{LEVEL_LABELS[attempt.level]}</span>
                      </div>
                      {attempt.artist && <p className="truncate text-[9px] text-[#687181]">{attempt.artist}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center gap-2 rounded-full bg-white px-2.5 py-1.5">
            <button type="button" onClick={togglePlayback} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F97316] text-white" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <span className="flex gap-0.5"><i className="block h-3.5 w-1 rounded bg-white" /><i className="block h-3.5 w-1 rounded bg-white" /></span>
              ) : (
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <span className="w-8 text-center text-[9px] font-semibold text-[#333]">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(duration, 0.1)}
              step="0.01"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => seek(Number(event.target.value))}
              className="preview-progress"
              aria-label="Song position"
            />
            <span className="text-[9px] text-[#555]">{song.duration || formatTime(duration)}</span>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
            <button type="button" onClick={onHome} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#D8DCE4] hover:bg-white/[0.07]">
              Hauptmenü
            </button>
            <button type="button" onClick={onBoard} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#D8DCE4] hover:bg-white/[0.07]">
              Rangliste
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="rounded-xl bg-[#65D83B] px-3 py-2.5 text-xs font-black text-black transition hover:bg-[#75E34C] disabled:cursor-wait disabled:bg-[#24452D] disabled:text-[#809087]"
            >
              {nextLabel}
            </button>
          </div>

          <div className="mt-2 text-center text-[10px] text-[#687181]">Gesamt: {total.toLocaleString()} Punkte</div>
        </div>
      </div>
    </div>
  );
}
