import type { Card, Review } from './types';

// Spaced repetition, Leitner style. Each card sits in a box; getting it right moves it up a box and pushes
// its next review further out, missing it sends it back to the first box and makes it due again right away.
// Only the first answer to a card in a study session counts.
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60, 120];

const DAY = 86_400_000;

// Reviews fall due at the start of a day, so "tomorrow" means any time tomorrow, not 24 hours from now.
function startOfDay(time: number): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(time: number, days: number): number {
  const d = new Date(startOfDay(time));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function nextReview(prev: Review | undefined, got: boolean, now = Date.now()): Review {
  const reps = (prev?.reps ?? 0) + 1;
  if (!got) return { box: 0, due: now, reps, lapses: (prev?.lapses ?? 0) + 1, last: now };
  const box = Math.min((prev?.box ?? 0) + 1, INTERVAL_DAYS.length - 1);
  return { box, due: addDays(now, INTERVAL_DAYS[box]), reps, lapses: prev?.lapses ?? 0, last: now };
}

// New cards (never studied) count as due.
export function isDue(card: Card, now = Date.now()): boolean {
  return !card.review || card.review.due <= now;
}

export function countDue(cards: Card[], now = Date.now()): number {
  return cards.reduce((n, c) => n + (isDue(c, now) ? 1 : 0), 0);
}

// When the next card in these comes due, or null if one is due already (or there are none).
export function nextDueAt(cards: Card[], now = Date.now()): number | null {
  let next: number | null = null;
  for (const c of cards) {
    if (isDue(c, now)) return null;
    next = next === null ? c.review!.due : Math.min(next, c.review!.due);
  }
  return next;
}

export function daysUntil(time: number, now = Date.now()): number {
  return Math.round((startOfDay(time) - startOfDay(now)) / DAY);
}

export function whenLabel(time: number, now = Date.now()): string {
  const days = daysUntil(time, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

export type CardStatus = { kind: 'new' } | { kind: 'due' } | { kind: 'later'; label: string; box: number };

export function cardStatus(card: Card, now = Date.now()): CardStatus {
  if (!card.review) return { kind: 'new' };
  if (card.review.due <= now) return { kind: 'due' };
  return { kind: 'later', label: whenLabel(card.review.due, now), box: card.review.box };
}

// Cards you've missed at least once, most-missed first (then by how often you miss them).
export function mostMissed(cards: Card[]): Card[] {
  const rate = (c: Card) => (c.review ? c.review.lapses / c.review.reps : 0);
  return cards
    .filter((c) => (c.review?.lapses ?? 0) > 0)
    .sort((a, b) => b.review!.lapses - a.review!.lapses || rate(b) - rate(a));
}
