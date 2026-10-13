import type { Player } from './types';

export const MAX_NAME_LENGTH = 40;

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

export function findByName(players: Player[], name: string): Player | undefined {
  const key = cleanName(name).toLowerCase();
  return players.find((p) => p.name.toLowerCase() === key);
}

// Players linked to a different account can't be picked when linking (one account per player).
export function linkedToSomeoneElse(player: Player, uid: string): boolean {
  return Boolean(player.linkedUid) && player.linkedUid !== uid;
}
