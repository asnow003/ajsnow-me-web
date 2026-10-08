import { Flag, Target, type LucideIcon } from 'lucide-react';

export interface GameDef {
  id: string;
  name: string;
  color: string;
  icon: LucideIcon;
  // Which end of the totals wins. The winner is only suggested; the scorekeeper confirms it.
  winRule: 'high' | 'low';
}

export const GAMES: GameDef[] = [
  { id: 'estimation', name: 'Estimation', color: '#D85A30', icon: Target, winRule: 'high' },
  { id: 'golf', name: 'Golf', color: '#1D9E75', icon: Flag, winRule: 'low' },
];

export function getGameDef(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
