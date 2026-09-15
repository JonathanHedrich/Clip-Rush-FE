import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

export default function LoginScreen({
  onAuth,
}: {
  onAuth: (name: string, password: string, register: boolean) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2 || password.length < 4) {
      setError('Username mindestens 2 Zeichen, Passwort mindestens 4 Zeichen.');
      return;
    }

    setBusy(true);
    try {
      await onAuth(name.trim(), password, register);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#1DB954] text-black grid place-items-center text-3xl mb-4">▶</div>
          <h1 className="text-4xl font-bold font-[Space_Grotesk]">ClipRush</h1>
          <p className="text-[#777] mt-2">Erkenne den Track, bevor die Zeit länger wird.</p>
        </div>

        <div className="flex bg-[#191919] rounded-xl p-1 mb-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRegister(false);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg ${!register ? 'bg-[#1DB954] text-black' : 'text-[#777]'}`}
          >
            Anmelden
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRegister(true);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg ${register ? 'bg-[#1DB954] text-black' : 'text-[#777]'}`}
          >
            Registrieren
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full bg-[#191919] border border-[#2A2A2A] rounded-xl px-4 py-3 outline-none focus:border-[#1DB954]"
          />
          <input
            type="password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            placeholder="Passwort"
            autoComplete={register ? 'new-password' : 'current-password'}
            className="w-full bg-[#191919] border border-[#2A2A2A] rounded-xl px-4 py-3 outline-none focus:border-[#1DB954]"
          />

          {register && (
            <p className="rounded-xl border border-[#2D2D2D] bg-[#151515] px-4 py-3 text-xs leading-relaxed text-[#8B8B8B]">
              Jeder Username ist eindeutig. Ist er bereits vergeben, musst du einen anderen wählen. Username und Passwort können nach der Registrierung nicht geändert werden.
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            disabled={busy}
            className="w-full bg-[#1DB954] disabled:bg-[#18562d] disabled:text-[#7B9482] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-3"
          >
            {busy && <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
            {busy ? 'Bitte warten …' : register ? 'Account erstellen' : 'Einloggen'}
          </button>
        </form>

        <p className="text-xs text-[#555] text-center mt-6">Musikdaten und Streams: Audius</p>
      </div>
    </div>
  );
}
