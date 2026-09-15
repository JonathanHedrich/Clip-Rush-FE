import type {
  Difficulty,
  Genre,
  GuessDistribution,
  GuessResult,
  LobbyState,
  ScoreEntry,
  Song,
} from '../types';

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error((await response.text()) || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

function coreResult(result: GuessResult) {
  return {
    won: result.won,
    timeLevel: result.timeLevel,
    points: result.points,
  };
}

export const api = {
  login: (username: string, password: string) =>
    json<{ username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    json<{ username: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  randomSong: (genre: Genre, difficulty: Difficulty) =>
    json<Song>(`/api/tracks/random?genre=${encodeURIComponent(genre)}&difficulty=${difficulty}`),

  search: (q: string) => json<Song[]>(`/api/tracks/search?q=${encodeURIComponent(q)}`),

  leaderboard: () => json<ScoreEntry[]>('/api/leaderboard'),

  submitScore: (username: string, result: GuessResult) =>
    json<GuessDistribution>('/api/scores', {
      method: 'POST',
      body: JSON.stringify({ username, ...coreResult(result) }),
    }),

  createLobby: (username: string) =>
    json<LobbyState>('/api/multiplayer/lobbies', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  joinLobby: (code: string, username: string) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  lobby: (code: string, username: string) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}?username=${encodeURIComponent(username)}`),

  updateLobbySettings: (code: string, hostUsername: string, totalRounds: number) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}/settings`, {
      method: 'POST',
      body: JSON.stringify({ hostUsername, totalRounds }),
    }),

  kickLobbyPlayer: (code: string, hostUsername: string, username: string) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}/kick`, {
      method: 'POST',
      body: JSON.stringify({ hostUsername, username }),
    }),

  startLobby: (code: string, hostUsername: string) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}/start`, {
      method: 'POST',
      body: JSON.stringify({ hostUsername }),
    }),

  leaveLobby: (code: string, username: string) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}/leave`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  submitLobbyResult: (code: string, username: string, result: GuessResult) =>
    json<LobbyState>(`/api/multiplayer/lobbies/${encodeURIComponent(code)}/result`, {
      method: 'POST',
      body: JSON.stringify({ username, ...coreResult(result) }),
    }),
};
