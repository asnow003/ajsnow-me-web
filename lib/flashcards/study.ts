import type { Card, Group } from './types';

export interface StudyCard {
  // Unique across groups, so the same card can't be counted twice in a mixed session.
  key: string;
  card: Card;
  group: Pick<Group, 'id' | 'name' | 'color'>;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildDeck(groups: Group[]): StudyCard[] {
  return shuffle(
    groups.flatMap((g) =>
      g.cards.map((card) => ({ key: `${g.id}/${card.id}`, card, group: { id: g.id, name: g.name, color: g.color } })),
    ),
  );
}

// Where a missed card goes back into the queue: a few cards later, so it isn't asked again right away but
// comes back while it's still fresh. With few cards left it goes to the end.
export function requeuePosition(current: number, queueLength: number): number {
  const remaining = queueLength - current - 1;
  if (remaining <= 3) return queueLength;
  const gap = 3 + Math.floor(Math.random() * Math.min(4, remaining - 2));
  return current + 1 + gap;
}

// Short text gets big type; long answers get reading size and left alignment.
export function textSize(text: string): 'xl' | 'lg' | 'md' | 'sm' {
  const length = text.length;
  const lines = text.split('\n').length;
  if (length <= 40 && lines <= 2) return 'xl';
  if (length <= 120 && lines <= 3) return 'lg';
  if (length <= 360 && lines <= 8) return 'md';
  return 'sm';
}

// Picks the cards for a session of `size` (null for all). Cards due for review come first (ones you've seen
// before, then new ones), then the rest by how soon they're due. Ties are random, so a big group is worked
// through a different batch each time.
export function pickForSession(pool: StudyCard[], size: number | null, now = Date.now()): StudyCard[] {
  const tier = (c: StudyCard) => (!c.card.review ? 1 : c.card.review.due <= now ? 0 : 2);
  const ordered = shuffle(pool).sort(
    (a, b) => tier(a) - tier(b) || (tier(a) === 2 ? a.card.review!.due - b.card.review!.due : 0),
  );
  return size ? ordered.slice(0, size) : ordered;
}

export const SESSION_SIZES = [10, 20, 30] as const;
// Groups this small just start; bigger ones ask how many cards first.
export const ASK_SIZE_ABOVE = 10;

// "due" studies only the cards whose review is due (new cards included), "missed" only cards you've missed
// before, and "all" every card.
export type StudyMode = 'due' | 'missed' | 'all';

export function studyHref(groupIds: string[], mode: StudyMode = 'all'): string {
  return `/flashcards/study?g=${groupIds.map(encodeURIComponent).join(',')}${mode === 'all' ? '' : `&mode=${mode}`}`;
}
