import { useEffect, useState } from 'react';
import type {
  Difficulty,
  GameMode,
  Genre,
  GuessDistribution,
  GuessResult,
  LobbyState,
  ScoreEntry,
  Screen,
  Song,
} from './types';
import { api } from './services/api';
import LoginScreen from './components/LoginScreen';
import ModeSelectScreen from './components/ModeSelectScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import LobbySummaryScreen from './components/LobbySummaryScreen';
import LeaderboardScreen from './components/LeaderboardScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState(localStorage.getItem('cliprush_user') || '');
  const [leaders, setLeaders] = useState<ScoreEntry[]>([]);
  const [mode, setMode] = useState<GameMode>('solo');
  const [diff, setDiff] = useState<Difficulty>('medium');
  const [genre, setGenre] = useState<Genre>('All');
  const [song, setSong] = useState<Song>();
  const [result, setResult] = useState<GuessResult>();
  const [distribution, setDistribution] = useState<GuessDistribution>();
  const [total, setTotal] = useState(0);
  const [lobby, setLobby] = useState<LobbyState>();
  const [completedLobbyRound, setCompletedLobbyRound] = useState(0);
  const [notice, setNotice] = useState('');

  const loadBoard = async (forUser = user) => {
    try {
      const rows = await api.leaderboard();
      setLeaders(rows);
      setTotal(rows.find((row) => row.username.toLowerCase() === forUser.toLowerCase())?.score || 0);
    } catch {
      // Rangliste ist nicht kritisch für den Spielstart.
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadBoard(user);
    setScreen('mode');
  }, []);

  const applyActiveLobbyRound = (state: LobbyState) => {
    if (!state.song) return false;
    if (state.genre) setGenre(state.genre);
    if (state.difficulty) setDiff(state.difficulty);
    setSong(state.song);
    setMode('multiplayer');
    setLobby(state);
    setScreen('game');
    return true;
  };

  const enterLobby = (state: LobbyState) => {
    setMode('multiplayer');
    setLobby(state);
    setNotice('');

    if (state.status === 'FINISHED') {
      setScreen('multiplayer-summary');
      return;
    }

    if (state.status === 'ACTIVE' && state.song) {
      applyActiveLobbyRound(state);
      return;
    }

    setScreen('lobby');
  };

  // Waiting-room polling: all clients receive the same server-selected song when the host starts.
  useEffect(() => {
    if (screen !== 'lobby' || !lobby?.code || !user) return;

    let active = true;
    const poll = async () => {
      try {
        const next = await api.lobby(lobby.code, user);
        if (!active) return;
        setLobby(next);

        if (next.status === 'ACTIVE' && next.song) {
          applyActiveLobbyRound(next);
        } else if (next.status === 'FINISHED') {
          setScreen('multiplayer-summary');
        }
      } catch (cause) {
        if (!active) return;
        setLobby(undefined);
        setNotice(cause instanceof Error ? cause.message : 'Du bist nicht mehr in der Lobby. Du kannst den Code erneut eingeben.');
        setScreen('mode');
      }
    };

    void poll();
    const id = window.setInterval(poll, 900);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [screen, lobby?.code, user]);

  // After a multiplayer song, remain on the song result until every active player has submitted.
  // Then the server advances the shared lobby to the next song, or marks the full match as finished.
  useEffect(() => {
    if (screen !== 'game' || !result || mode !== 'multiplayer' || !lobby?.code || !user) return;

    let active = true;
    const poll = async () => {
      try {
        const next = await api.lobby(lobby.code, user);
        if (!active) return;
        setLobby(next);
      } catch (cause) {
        if (!active) return;
        setNotice(cause instanceof Error ? cause.message : 'Lobby-Verbindung verloren.');
      }
    };

    void poll();
    const id = window.setInterval(poll, 800);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [screen, !!result, mode, lobby?.code, user]);

  const auth = async (name: string, password: string, register: boolean) => {
    const response = await (register ? api.register(name, password) : api.login(name, password));
    const canonicalName = response.username;
    localStorage.setItem('cliprush_user', canonicalName);
    setUser(canonicalName);
    await loadBoard(canonicalName);
    setScreen('mode');
  };

  const start = async (nextMode: GameMode, difficulty: Difficulty, selectedGenre: Genre) => {
    setMode(nextMode);
    setResult(undefined);
    setDistribution(undefined);
    setNotice('');

    if (nextMode === 'solo') {
      setDiff(difficulty);
      setGenre(selectedGenre);
      const nextSong = await api.randomSong(selectedGenre, difficulty);
      setSong(nextSong);
      setLobby(undefined);
      setScreen('game');
      return;
    }

    const state = await api.createLobby(user);
    setCompletedLobbyRound(0);
    enterLobby(state);
  };

  const joinLobby = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    const state = await api.joinLobby(code, user);
    setCompletedLobbyRound(0);
    enterLobby(state);
  };

  const kickLobbyPlayer = async (target: string) => {
    if (!lobby) return;
    const next = await api.kickLobbyPlayer(lobby.code, user, target);
    setLobby(next);
  };

  const setLobbyRounds = async (rounds: number) => {
    if (!lobby) return;
    const next = await api.updateLobbySettings(lobby.code, user, rounds);
    setLobby(next);
  };

  const startLobby = async () => {
    if (!lobby) return;
    const next = await api.startLobby(lobby.code, user);
    setCompletedLobbyRound(0);
    enterLobby(next);
  };

  const leaveLobby = async () => {
    const current = lobby;
    setLobby(undefined);
    setCompletedLobbyRound(0);
    setNotice('');
    setScreen('mode');

    if (current) {
      try {
        await api.leaveLobby(current.code, user);
      } catch {
        // Lokales Verlassen soll auch funktionieren, wenn die Lobby bereits geschlossen wurde.
      }
    }
  };

  const end = async (roundResult: GuessResult) => {
    setResult(roundResult);
    setTotal((current) => current + roundResult.points);

    try {
      const stats = await api.submitScore(user, roundResult);
      setDistribution(stats);
    } catch {
      // Lokale Auflösung bleibt verfügbar, wenn globale Statistik kurz nicht erreichbar ist.
    }

    if (mode === 'multiplayer' && lobby?.code) {
      const playedRound = lobby.currentRound;
      setCompletedLobbyRound(playedRound);
      try {
        const nextLobby = await api.submitLobbyResult(lobby.code, user, roundResult);
        setLobby(nextLobby);
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : 'Lobby-Ergebnis konnte nicht gespeichert werden.');
      }
    }

    // Das Spiel bleibt im Hintergrund gemountet; der ResultScreen erscheint als Modal.
  };

  const next = async () => {
    if (mode === 'solo') {
      setResult(undefined);
      setDistribution(undefined);
      const nextSong = await api.randomSong(genre, diff);
      setSong(nextSong);
      setScreen('game');
      return;
    }

    if (!lobby) return;

    if (lobby.status === 'FINISHED') {
      setScreen('multiplayer-summary');
      return;
    }

    if (lobby.status === 'ACTIVE' && lobby.currentRound > completedLobbyRound && lobby.song) {
      setResult(undefined);
      setDistribution(undefined);
      applyActiveLobbyRound(lobby);
    }
  };

  const goHome = () => {
    const currentLobby = lobby;
    setResult(undefined);
    setDistribution(undefined);
    setLobby(undefined);
    setCompletedLobbyRound(0);
    setScreen('mode');

    if (mode === 'multiplayer' && currentLobby) {
      void api.leaveLobby(currentLobby.code, user).catch(() => undefined);
    }
  };

  const logout = () => {
    const currentLobby = lobby;
    if (currentLobby && user) {
      void api.leaveLobby(currentLobby.code, user).catch(() => undefined);
    }

    localStorage.removeItem('cliprush_user');
    setUser('');
    setLobby(undefined);
    setSong(undefined);
    setResult(undefined);
    setDistribution(undefined);
    setCompletedLobbyRound(0);
    setNotice('');
    setScreen('login');
  };

  const multiplayerOpponents = lobby?.players
    .filter((player) => player.toLowerCase() !== user.toLowerCase())
    .join(', ');

  const multiplayerNextReady =
    mode === 'multiplayer' &&
    !!lobby &&
    lobby.status === 'ACTIVE' &&
    lobby.currentRound > completedLobbyRound &&
    !!lobby.song;

  const multiplayerFinished = mode === 'multiplayer' && lobby?.status === 'FINISHED';
  const submittedCount = lobby ? Object.keys(lobby.roundResults || {}).length : 0;
  const nextLabel =
    mode !== 'multiplayer'
      ? 'Next'
      : multiplayerFinished
        ? 'Endauswertung anzeigen'
        : multiplayerNextReady
          ? `Song ${lobby?.currentRound}/${lobby?.totalRounds} starten`
          : `Warte auf Mitspieler … ${submittedCount}/${lobby?.players.length || 0}`;

  return (
    <>
      {screen === 'login' && <LoginScreen onAuth={auth} />}

      {screen === 'mode' && (
        <ModeSelectScreen
          username={user}
          leaders={leaders}
          notice={notice}
          onStart={start}
          onJoinLobby={joinLobby}
          onLogout={logout}
          onBoard={async () => {
            await loadBoard();
            setScreen('leaderboard');
          }}
        />
      )}

      {screen === 'lobby' && lobby && (
        <LobbyScreen
          lobby={lobby}
          username={user}
          notice={notice}
          onKick={kickLobbyPlayer}
          onSetRounds={setLobbyRounds}
          onStart={startLobby}
          onLeave={leaveLobby}
        />
      )}

      {screen === 'game' && song && (
        <GameScreen
          song={song}
          mode={mode}
          difficulty={diff}
          genre={genre}
          opponent={multiplayerOpponents}
          fixedClipStart={mode === 'multiplayer' ? lobby?.clipStartSeconds : undefined}
          onEnd={end}
          onHome={goHome}
        />
      )}

      {screen === 'game' && song && result && (
        <ResultScreen
          song={song}
          result={result}
          distribution={distribution}
          total={total}
          onNext={next}
          nextLabel={nextLabel}
          nextDisabled={mode === 'multiplayer' && !multiplayerNextReady && !multiplayerFinished}
          contextLabel={mode === 'multiplayer' && lobby ? `Lobby ${lobby.code} · Runde ${completedLobbyRound}/${lobby.totalRounds}` : undefined}
          titleOverride={mode === 'multiplayer' ? (result.won ? 'Runde gewonnen' : 'Runde vorbei') : undefined}
          onHome={goHome}
          onBoard={async () => {
            await loadBoard();
            setScreen('leaderboard');
          }}
        />
      )}

      {screen === 'multiplayer-summary' && lobby && (
        <LobbySummaryScreen lobby={lobby} username={user} onHome={goHome} />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen rows={leaders} onBack={() => setScreen('mode')} />
      )}
    </>
  );
}
