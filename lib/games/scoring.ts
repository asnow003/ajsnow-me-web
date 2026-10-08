import type { Game } from './types';

export function totals(game: Game): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(game.playerIds.map((id) => [id, 0]));
  for (const round of game.rounds) {
    for (const id of game.playerIds) result[id] += round.scores[id] ?? 0;
  }
  return result;
}

// A round can be in play with bids only, so check for a scored round rather than any round.
export function hasScores(game: Game): boolean {
  return game.rounds.some((r) => Object.keys(r.scores).length > 0);
}

// Player ids with the best total under the game's win rule (several on a tie). Empty before any round is scored.
export function leaders(game: Game, winRule: 'high' | 'low'): string[] {
  if (!hasScores(game)) return [];
  const t = totals(game);
  const values = game.playerIds.map((id) => t[id]);
  const best = winRule === 'high' ? Math.max(...values) : Math.min(...values);
  return game.playerIds.filter((id) => t[id] === best);
}
