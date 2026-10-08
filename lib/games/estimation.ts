import type { Round } from './types';

export type RoundKind = 'normal' | 'no-trump' | 'misere';
export type Suit = 'S' | 'H' | 'D' | 'C';

export interface RoundSpec {
  cards: number;
  kind: RoundKind;
}

// What an Estimation round stores in Round.inputs. `tricks` is null while the hand is being played.
export interface EstimationInputs {
  cards: number;
  kind: RoundKind;
  trump: Suit | null;
  bids: Record<string, number>;
  tricks: Record<string, number> | null;
}

export const SUITS: { suit: Suit; symbol: string; red: boolean }[] = [
  { suit: 'S', symbol: '♠', red: false },
  { suit: 'H', symbol: '♥', red: true },
  { suit: 'D', symbol: '♦', red: true },
  { suit: 'C', symbol: '♣', red: false },
];

// Everyone gets a full hand with one card left over to turn up for trump: at most 7, fewer with 8+ players.
export function maxCards(playerCount: number): number {
  return Math.max(1, Math.min(7, Math.floor(51 / playerCount)));
}

// 1 up to the max, the max again as No Trump and as Misère, then back down to 1.
export function roundSequence(playerCount: number): RoundSpec[] {
  const max = maxCards(playerCount);
  const up = Array.from({ length: max }, (_, i) => ({ cards: i + 1, kind: 'normal' as const }));
  const down = Array.from({ length: max - 1 }, (_, i) => ({ cards: max - 1 - i, kind: 'normal' as const }));
  return [...up, { cards: max, kind: 'no-trump' }, { cards: max, kind: 'misere' }, ...down];
}

// Exact bid: 10 plus 2 per trick. Missed: minus 2 per trick off.
export function roundScore(bid: number, took: number): number {
  return bid === took ? 10 + 2 * took : -2 * Math.abs(bid - took);
}

export function inputsOf(round: Round): EstimationInputs {
  return round.inputs as unknown as EstimationInputs;
}

export function isPending(round: Round): boolean {
  return inputsOf(round).tricks === null;
}

export function scoresFor(inputs: EstimationInputs): Record<string, number> {
  if (!inputs.tricks) return {};
  const tricks = inputs.tricks;
  return Object.fromEntries(Object.entries(inputs.bids).map(([pid, bid]) => [pid, roundScore(bid, tricks[pid] ?? 0)]));
}

// The first seated player deals round 1 and the deal passes along the seats.
export function dealerIndex(roundIndex: number, playerCount: number): number {
  return roundIndex % playerCount;
}

// Bidding starts left of the dealer and ends with the dealer.
export function bidOrder(playerIds: string[], roundIndex: number): string[] {
  const start = (dealerIndex(roundIndex, playerIds.length) + 1) % playerIds.length;
  return [...playerIds.slice(start), ...playerIds.slice(0, start)];
}

export function roundName(spec: RoundSpec): string {
  if (spec.kind === 'no-trump') return `${spec.cards} No Trump`;
  if (spec.kind === 'misere') return `${spec.cards} Misère`;
  return `${spec.cards} ${spec.cards === 1 ? 'card' : 'cards'}`;
}
