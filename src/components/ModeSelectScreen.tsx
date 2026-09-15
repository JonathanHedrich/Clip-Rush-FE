import { useState } from 'react';
import type { Difficulty, GameMode, Genre, ScoreEntry } from '../types';

const genres: Genre[] = ['All', 'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical'];
const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: 'easy', label: 'Einfach', description: 'Bekanntere Tracks · 0,75× Punkte' },
  { id: 'medium', label: 'Mittel', description: 'Gemischte Tracks · normale Punkte' },
  { id: 'hard', label: 'Schwer', description: 'Größerer Track-Pool · 1,5× Punkte' },
];

export default function ModeSelectScreen({
  username,
  leaders,
  notice,
  onStart,
  onJoinLobby,
  onBoard,
  onLogout,
}: {
  username: string;
  leaders: ScoreEntry[];
  notice?: string;
  onStart: (mode: GameMode, difficulty: Difficulty, genre: Genre) => Promise<void>;
  onJoinLobby: (code: string) => Promise<void>;
  onBoard: () => void;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<GameMode>('solo');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [genre, setGenre] = useState<Genre>('All');
  const [lobbyCode, setLobbyCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (busy || joining) return;
    setError('');
    setBusy(true);
    try {
      await onStart(mode, difficulty, genre);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Spiel konnte nicht gestartet werden.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const code = lobbyCode.trim().toUpperCase();
    if (!code || busy || joining) return;
    setError('');
    setJoining(true);
    try {
      await onJoinLobby(code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lobby konnte nicht betreten werden.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start gap-4 mb-8">
        <div>
          <p className="text-[#666] text-sm">Willkommen zurück</p>
          <h2 className="text-2xl font-bold">{username}</h2>
          <p className="text-[11px] text-[#4F4F4F] mt-1">Benutzername und Passwort sind dauerhaft an diesen Account gebunden.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBoard} className="rounded-lg px-3 py-2 text-[#1DB954] text-sm hover:bg-[#151515]">Rangliste</button>
          <button onClick={onLogout} className="rounded-lg border border-[#333] bg-[#151515] px-3 py-2 text-[#BEBEBE] text-sm hover:border-[#4A4A4A]">Abmelden</button>
        </div>
      </div>

      {(notice || error) && (
        <div className={`rounded-xl border px-4 py-3 mb-5 text-sm ${error ? 'border-[#613030] bg-[#291717] text-[#F0A9A9]' : 'border-[#665024] bg-[#2A2112] text-[#E8C67D]'}`}>
          {error || notice}
        </div>
      )}

      <section className="bg-[#151515] border border-[#262626] rounded-2xl p-4 mb-6">
        <p className="text-xs uppercase tracking-widest text-[#666] mb-3">Top Spieler</p>
        {leaders.slice(0, 3).map((entry, index) => (
          <div className="flex py-2" key={entry.username}>
            <span className="w-8 text-[#666]">#{index + 1}</span>
            <span className="flex-1">{entry.username}</span>
            <b>{entry.score.toLocaleString()}</b>
          </div>
        ))}
      </section>

      <p className="text-xs uppercase tracking-widest text-[#666] mb-3">Modus</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(['solo', 'multiplayer'] as GameMode[]).map((entry) => (
          <button
            key={entry}
            disabled={busy || joining}
            onClick={() => setMode(entry)}
            className={`p-5 rounded-2xl text-left border transition-all active:scale-[0.99] disabled:opacity-60 ${
              mode === entry ? 'border-[#1DB954] bg-[#1DB954]/10' : 'border-[#2A2A2A] bg-[#181818] hover:border-[#3A3A3A]'
            }`}
          >
            <b>{entry === 'solo' ? 'Solo' : 'Multiplayer'}</b>
            <p className="text-xs text-[#777] mt-2">
              {entry === 'solo' ? 'Genre und Schwierigkeit selbst bestimmen' : 'Private Lobby mit Code · mehrere Songs · kein Bot'}
            </p>
          </button>
        ))}
      </div>

      {mode === 'solo' ? (
        <>
          <p className="text-xs uppercase tracking-widest text-[#666] mb-3">Schwierigkeit</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            {difficulties.map((entry) => (
              <button
                key={entry.id}
                disabled={busy}
                onClick={() => setDifficulty(entry.id)}
                className={`p-3 rounded-xl border text-left transition-colors disabled:opacity-60 ${
                  difficulty === entry.id ? 'border-[#1DB954] bg-[#1DB954]/10 text-[#1DB954]' : 'border-[#2A2A2A] text-[#888] hover:border-[#3A3A3A]'
                }`}
              >
                <span className="font-semibold block">{entry.label}</span>
                <span className="text-[11px] text-[#666] block mt-1">{entry.description}</span>
              </button>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest text-[#666] mb-3">Genre</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {genres.map((entry) => (
              <button
                key={entry}
                disabled={busy}
                onClick={() => setGenre(entry)}
                className={`px-3 py-2 rounded-full text-sm transition-colors disabled:opacity-60 ${genre === entry ? 'bg-[#1DB954] text-black' : 'bg-[#1A1A1A] text-[#888] hover:text-white'}`}
              >
                {entry}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mb-8 space-y-4">
          <div className="rounded-2xl border border-[#A855F7]/30 bg-[#A855F7]/10 p-5">
            <p className="font-semibold text-white">Private Lobby</p>
            <p className="text-sm text-[#B5A4C7] leading-relaxed mt-2">
              Erstelle eine neue Lobby oder gib einen 6-stelligen Lobby-Code ein. Der Host legt vor dem Start die Anzahl der Songs fest.
            </p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#151515] p-4">
            <p className="text-xs uppercase tracking-widest text-[#666] mb-3">Lobby beitreten</p>
            <div className="flex gap-2">
              <input
                value={lobbyCode}
                onChange={(event) => setLobbyCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void join();
                }}
                placeholder="ABC123"
                className="flex-1 min-w-0 rounded-xl border border-[#303030] bg-[#101010] px-4 py-3 font-mono tracking-[0.22em] uppercase outline-none focus:border-[#1DB954]"
              />
              <button
                onClick={join}
                disabled={joining || busy || lobbyCode.trim().length < 6}
                className="rounded-xl border border-[#3A3A3A] bg-[#202020] px-4 py-3 text-sm font-semibold hover:border-[#555] disabled:opacity-40"
              >
                {joining ? 'Beitritt …' : 'Beitreten'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={start}
        disabled={busy || joining}
        className="w-full bg-[#1DB954] hover:bg-[#25c660] disabled:bg-[#18562d] disabled:text-[#7B9482] text-black font-bold py-4 rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-3"
      >
        {busy && <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
        {busy ? (mode === 'solo' ? 'Song wird geladen …' : 'Lobby wird erstellt …') : mode === 'solo' ? 'Solo starten' : 'Neue Lobby erstellen'}
      </button>
    </div>
  );
}
