export default function WaitingScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full border-4 border-[#1DB954] border-t-transparent animate-spin mx-auto mb-5" />
        <h2 className="text-2xl font-bold">Gegner wird gesucht…</h2>
        <p className="text-[#777] mt-2">
          Genre und Schwierigkeit werden beim Matchstart zufällig gewählt. Nach einigen Sekunden startet automatisch ein Bot-Duell.
        </p>
        <button onClick={onCancel} className="mt-8 border border-[#333] px-5 py-3 rounded-xl">
          Abbrechen
        </button>
      </div>
    </div>
  );
}
