export type GameStatus = 'in-progress' | 'completed';

export interface Player {
  id: string;
  name: string;
  color: string;
  hidden: boolean;
  createdAt: number;
}

// One round of a game. `scores` is the points each player earned that round, keyed by player id.
// `inputs` holds whatever the game's rules need to recompute those scores (bids, tricks, cards…).
export interface Round {
  scores: Record<string, number>;
  inputs?: Record<string, unknown>;
}

export interface Game {
  id: string;
  type: string;
  status: GameStatus;
  playerIds: string[]; // seat order
  rounds: Round[];
  winnerIds: string[]; // more than one on a tie
  settings?: Record<string, number>; // per-game options chosen at the start, e.g. { holes: 9 }
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export type NewPlayer = Omit<Player, 'id'>;
export type NewGame = Omit<Game, 'id'>;
