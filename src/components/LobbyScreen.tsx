import { useEffect, useState } from 'react';
import type { LobbyState } from '../types';

const ROUND_OPTIONS = [3, 5, 10, 15, 20];

export default function LobbyScreen({
  lobby,
  username,
  notice,
  onKick,
  onSetRounds,
  onStart,
  onLeave,
}: {
  lobby: LobbyState;
  username: string;
  notice?: string;
  onKick: (username: string) => Promise<void>;
  onSetRounds: (rounds: number) => Promise<void>;
  onStart: () => Promise<void>;
  onLeave: () => Promise<void>;
}) {
  const [streamerMode, setStreamerMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [roundDraft, setRoundDraft] = useState(String(lobby.totalRounds));
  const isHost = lobby.host.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    setRoundDraft(String(lobby.totalRounds));
  }, [lobby.totalRounds]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onStart();
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onLeave();
    } finally {
      setBusy(false);
    }
  };

  const setRounds = async (rounds: number) => {
    if (!isHost || settingsBusy || rounds === lobby.totalRounds) return;
    setSettingsBusy(true);
    try {
      await onSetRounds(rounds);
    } finally {
      setSettingsBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080B11] text-white px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#1DB954]/10 blur-3xl" />
        <div className="absolute right-[-80px] top-36 h-96 w-96 rounded-full bg-[#7C5CFF]/12 blur-3xl" />
        <div className="absolute bottom-8 left-1/3 h-64 w-64 rounded-full bg-[#2B7FFF]/8 blur-3xl" />
        <span className="music-note left-[7%] top-[18%] text-6xl">♫</span>
        <span className="music-note right-[8%] top-[28%] text-5xl">♪</span>
        <span className="music-note left-[15%] bottom-[12%] text-4xl">♬</span>
      </div>
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-7">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#666]">Multiplayer Lobby</p>
            <h1 className="text-2xl font-bold mt-1">{isHost ? 'Deine Lobby' : `${lobby.host}s Lobby`}</h1>
          </div>
          <button
            onClick={leave}
            disabled={busy}
            className="rounded-xl border border-[#343434] bg-[#151515] px-4 py-2.5 text-sm text-[#D0D0D0] hover:border-[#4A4A4A] disabled:opacity-50"
          >
            {isHost ? 'Lobby schließen' : 'Lobby verlassen'}
          </button>
        </div>

        {notice && (
          <div className="mb-5 rounded-xl border border-[#6E5125] bg-[#2B2111] px-4 py-3 text-sm text-[#E9C986]">
            {notice}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl p-5 mb-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#717171]">Lobby-Code</p>
              <p className="text-sm text-[#A4A4A4] mt-1">Nur diesen Code an deine Mitspieler weitergeben.</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#A8A8A8] cursor-pointer select-none">
              <span>Streamer Mode</span>
              <button
                type="button"
                onClick={() => setStreamerMode((current) => !current)}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${streamerMode ? 'bg-[#1DB954]' : 'bg-[#333]'}`}
                aria-pressed={streamerMode}
              >
                <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${streamerMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </label>
          </div>

          <div className="rounded-2xl border border-[#303030] bg-[#101010] px-4 py-5 mb-3 text-center font-mono text-3xl font-bold tracking-[0.34em]">
            <span className={streamerMode ? 'blur-[8px] select-none' : ''}>{lobby.code}</span>
          </div>

          <button
            onClick={copyCode}
            className="w-full rounded-xl bg-[#1DB954] hover:bg-[#25c660] text-black font-bold py-3 transition-colors"
          >
            {copied ? 'Lobby-Code kopiert ✓' : 'Lobby-Code kopieren'}
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl p-5 mb-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#717171]">Match-Länge</p>
              <p className="text-sm text-[#999] mt-1">{lobby.totalRounds} Songs werden gespielt.</p>
            </div>
            {settingsBusy && <span className="w-4 h-4 rounded-full border-2 border-[#555] border-t-[#1DB954] animate-spin" />}
          </div>

          <div className="grid grid-cols-5 gap-2 mb-3">
            {ROUND_OPTIONS.map((rounds) => (
              <button
                key={rounds}
                disabled={!isHost || settingsBusy}
                onClick={() => void setRounds(rounds)}
                className={`rounded-xl border py-3 text-sm font-semibold transition-colors disabled:cursor-default ${
                  lobby.totalRounds === rounds
                    ? 'border-[#1DB954] bg-[#1DB954]/12 text-[#6DE18E]'
                    : 'border-[#303030] bg-[#101010] text-[#949494] hover:border-[#444]'
                } ${!isHost ? 'opacity-70' : ''}`}
              >
                {rounds}
              </button>
            ))}
          </div>

          {isHost ? (
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="20"
                value={roundDraft}
                onChange={(event) => setRoundDraft(event.target.value)}
                className="flex-1 rounded-xl border border-[#303030] bg-[#101010] px-4 py-3 outline-none focus:border-[#1DB954]"
                aria-label="Anzahl Songs"
              />
              <button
                type="button"
                disabled={settingsBusy}
                onClick={() => {
                  const parsed = Math.max(1, Math.min(20, Number(roundDraft) || lobby.totalRounds));
                  setRoundDraft(String(parsed));
                  void setRounds(parsed);
                }}
                className="rounded-xl border border-[#3A3A3A] bg-[#202020] px-4 py-3 text-sm font-semibold hover:border-[#555] disabled:opacity-50"
              >
                Übernehmen
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#666] mt-3 text-center">Nur der Host kann die Song-Anzahl ändern.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#717171]">Spieler</p>
              <p className="text-sm text-[#999] mt-1">{lobby.players.length} verbunden</p>
            </div>
            <span className="text-xs text-[#666]">Alle hören pro Runde denselben Song</span>
          </div>

          <div className="space-y-2">
            {lobby.players.map((player) => {
              const host = player.toLowerCase() === lobby.host.toLowerCase();
              const self = player.toLowerCase() === username.toLowerCase();
              return (
                <div key={player} className="flex items-center gap-3 rounded-xl border border-[#292929] bg-[#101010] px-4 py-3">
                  <div className={`w-9 h-9 rounded-full grid place-items-center text-xs font-bold ${host ? 'bg-[#1DB954] text-black' : 'bg-[#252525] text-white'}`}>
                    {player.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{player}{self ? ' (Du)' : ''}</p>
                    <p className="text-[11px] text-[#666]">{host ? 'Host' : 'Gast'}</p>
                  </div>
                  {isHost && !host && (
                    <button
                      onClick={() => onKick(player)}
                      className="rounded-lg border border-[#5A2A2A] bg-[#251414] px-3 py-2 text-xs text-[#F0A0A0] hover:bg-[#301818]"
                    >
                      Kicken
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-[#5F5F5F]">
            Gekickte Spieler sind nicht gebannt und können den Lobby-Code erneut eingeben, solange das Match noch nicht gestartet wurde.
          </p>
        </section>

        <section className="rounded-2xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/8 backdrop-blur-xl p-5 mb-6">
          <p className="font-semibold text-white mb-1">So läuft das Match</p>
          <p className="text-sm text-[#A493B7] leading-relaxed">
            Pro Runde wählt der Server genau einen Song, ein Genre und eine Schwierigkeit. Alle Spieler bekommen exakt diese Runde. Nach dem letzten Song gewinnt der Spieler mit den meisten Gesamtpunkten.
          </p>
        </section>

        {isHost ? (
          <button
            onClick={start}
            disabled={busy || lobby.players.length < 2}
            className="w-full rounded-2xl bg-[#1DB954] hover:bg-[#25c660] disabled:bg-[#173D24] disabled:text-[#637469] text-black font-bold py-4 transition-colors flex items-center justify-center gap-3"
          >
            {busy && <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
            {lobby.players.length < 2 ? 'Warte auf mindestens einen Gast …' : busy ? 'Match wird vorbereitet …' : `${lobby.totalRounds} Songs starten`}
          </button>
        ) : (
          <div className="w-full rounded-2xl border border-[#2B2B2B] bg-[#151515] py-4 px-5 flex items-center justify-center gap-3 text-[#BDBDBD]">
            <span className="w-4 h-4 rounded-full border-2 border-[#666] border-t-[#1DB954] animate-spin" />
            Warte auf den Host …
          </div>
        )}
      </div>
    </div>
  );
}
