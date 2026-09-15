import type { ScoreEntry } from '../types';

export default function LeaderboardScreen({ rows, onBack }: { rows: ScoreEntry[]; onBack: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080B11] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-6 h-80 w-80 rounded-full bg-[#1DB954]/10 blur-3xl" />
        <div className="absolute right-[-100px] top-24 h-96 w-96 rounded-full bg-[#6D5CFF]/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#2C7EFF]/8 blur-3xl" />
        <span className="music-note left-[8%] top-[16%] text-6xl">♪</span>
        <span className="music-note right-[10%] top-[20%] text-5xl">♫</span>
        <span className="music-note right-[18%] bottom-[16%] text-4xl">♬</span>
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-7 flex items-center gap-4">
          <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-xl transition hover:bg-white/[0.09]">
            ←
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#788292]">ClipRush Rankings</p>
            <h2 className="text-3xl font-black">Rangliste</h2>
            <p className="text-sm text-[#7C8594]">Freunde & Spieler</p>
          </div>
        </div>

        {rows.length >= 3 && (
          <div className="mb-5 grid grid-cols-3 items-end gap-3">
            {[rows[1], rows[0], rows[2]].map((entry, visualIndex) => {
              const rank = visualIndex === 1 ? 1 : visualIndex === 0 ? 2 : 3;
              const tall = rank === 1 ? 'h-32' : rank === 2 ? 'h-24' : 'h-20';
              return (
                <div key={entry.username} className="text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.08] font-black backdrop-blur-xl">
                    {entry.username.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="mb-2 truncate text-xs text-[#B7BEC9]">{entry.username}</p>
                  <div className={`${tall} flex flex-col items-center justify-center rounded-t-3xl border border-white/10 bg-white/[0.055] backdrop-blur-xl`}>
                    <span className="text-2xl">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                    <b className="mt-1 text-lg">{entry.score.toLocaleString()}</b>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          {rows.map((entry, index) => (
            <div key={entry.username} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl transition hover:bg-white/[0.065]">
              <span className={`w-8 font-black ${index === 0 ? 'text-[#6FE148]' : 'text-[#7D8695]'}`}>#{index + 1}</span>
              <div className={`grid h-10 w-10 place-items-center rounded-full font-bold ${index === 0 ? 'bg-[#1DB954] text-black' : 'bg-white/10 text-white'}`}>
                {entry.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <b className="block truncate">{entry.username}</b>
                <p className="text-xs text-[#717B8B]">{entry.songsGuessed} Songs · 🔥 {entry.streak}</p>
              </div>
              <b className="text-lg">{entry.score.toLocaleString()}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
