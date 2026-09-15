export type Genre = 'All' | 'Pop' | 'Rock' | 'Hip-Hop' | 'R&B' | 'Electronic' | 'Jazz' | 'Classical';
export type GameMode = 'solo' | 'multiplayer';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Screen = 'login' | 'mode' | 'lobby' | 'game' | 'result' | 'multiplayer-summary' | 'leaderboard';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  genre: Genre;
  albumArt: string;
  duration: string;
  audioUrl: string;
}

export interface ScoreEntry {
  username: string;
  score: number;
  songsGuessed: number;
  streak: number;
}

export interface GuessAttempt {
  kind: 'guess' | 'skip' | 'giveup';
  level: number;
  title: string;
  artist?: string;
  correct?: boolean;
}

export interface GuessResult {
  won: boolean;
  timeLevel: number;
  points: number;
  attempts?: GuessAttempt[];
}

export interface GuessDistribution {
  counts: number[];
  topPercent: number;
  total: number;
}

export interface LobbyState {
  code: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'CLOSED';
  host: string;
  players: string[];
  song?: Song;
  genre?: Genre;
  difficulty?: Difficulty;
  clipStartSeconds: number;
  currentRound: number;
  totalRounds: number;
  roundResults: Record<string, GuessResult>;
  scores: Record<string, number>;
  correctAnswers: Record<string, number>;
}
