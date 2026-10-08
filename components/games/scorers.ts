import type { ComponentType, ReactNode } from 'react';
import type { GameDef } from '@/lib/games/registry';
import type { Game, Player, Round } from '@/lib/games/types';
import { estimationScorer } from './estimation/EstimationScorer';

export interface ScorerPanelProps {
  game: Game;
  def: GameDef;
  players: Map<string, Player>;
  // Index of a round the scorekeeper tapped to correct, or null.
  editRound: number | null;
  onDoneEditing: () => void;
  saveRounds: (rounds: Round[]) => Promise<void>;
  // Called after the final round is saved, to offer finishing the game.
  onAllRoundsDone: () => void;
}

// A game's round entry and how its rounds read on the scoreboard. Games without one show "coming soon".
export interface GameScorer {
  Panel: ComponentType<ScorerPanelProps>;
  progress(game: Game): { current: number; total: number; done: boolean };
  roundLabel(round: Round, index: number): ReactNode;
  // Short detail beside a player's score in a round (e.g. "2/2"), or the whole cell while a round is in play.
  cell(round: Round, playerId: string): { score: number | null; detail: string | null };
  // A completed round that can be corrected by tapping it.
  canEdit(round: Round): boolean;
}

export const SCORERS: Record<string, GameScorer> = {
  estimation: estimationScorer,
};
