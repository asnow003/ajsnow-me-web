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
