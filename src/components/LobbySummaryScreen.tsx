import type { LobbyState } from '../types';

export default function LobbySummaryScreen({
  lobby,
  username,
  onHome,
}: {
  lobby: LobbyState;
  username: string;
  onHome: () => void;
}) {
  const ranking = [...lobby.players].sort((a, b) => {
    const scoreDiff = (lobby.scores[b] || 0) - (lobby.scores[a] || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const solvedDiff = (lobby.correctAnswers[b] || 0) - (lobby.correctAnswers[a] || 0);
    if (solvedDiff !== 0) return solvedDiff;
    return a.localeCompare(b);
  });

  const winner = ranking[0];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl border border-[#2A2A2A] bg-[#151515] overflow-hidden shadow-2xl">
          <div className="bg-[#1DB954] text-black px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold">Lobby beendet</p>
            <h1 className="text-3xl font-black mt-1">{winner ? `${winner} gewinnt!` : 'Match beendet'}</h1>
            <p className="text-sm mt-1 opacity-80">{lobby.totalRounds} Songs gespielt</p>
          </div>

          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[#777] mb-4">Endauswertung</p>
            <div className="space-y-2">
              {ranking.map((player, index) => {
                const self = player.toLowerCase() === username.toLowerCase();
                return (
                  <div
                    key={player}
                    className={`grid grid-cols-[38px_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-4 ${
                      index === 0
                        ? 'border-[#1DB954]/40 bg-[#1DB954]/10'
                        : self
                          ? 'border-[#3A3A3A] bg-[#202020]'
                          : 'border-[#292929] bg-[#101010]'
                    }`}
                  >
                    <div className={`text-lg font-black ${index === 0 ? 'text-[#1DB954]' : 'text-[#777]'}`}>#{index + 1}</div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{player}{self ? ' (Du)' : ''}</p>
                      <p className="text-xs text-[#777]">{lobby.correctAnswers[player] || 0}/{lobby.totalRounds} Songs erraten</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{(lobby.scores[player] || 0).toLocaleString()}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#666]">Punkte</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onHome}
              className="w-full mt-6 rounded-2xl bg-[#1DB954] hover:bg-[#25c660] text-black font-bold py-4 transition-colors"
            >
              Zurück zum Hauptmenü
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
