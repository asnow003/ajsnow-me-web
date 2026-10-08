import type { Game } from './types';

export function totals(game: Game): Record<string, number> {
  const result: Record<string, number> = Object.fromEntries(game.playerIds.map((id) => [id, 0]));
  for (const round of game.rounds) {
    for (const id of game.playerIds) result[id] += round.scores[id] ?? 0;
  }
  return result;
}

// Player ids with the best total under the game's win rule (several on a tie). Empty before any rounds.
export function leaders(game: Game, winRule: 'high' | 'low'): string[] {
  if (game.rounds.length === 0) return [];
  const t = totals(game);
  const values = game.playerIds.map((id) => t[id]);
  const best = winRule === 'high' ? Math.max(...values) : Math.min(...values);
  return game.playerIds.filter((id) => t[id] === best);
}
