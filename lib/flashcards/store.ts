import { LOCAL_MODE } from '../games/store';
import { MAX_CARDS_PER_GROUP, type Card, type Group } from './types';

export type Unsubscribe = () => void;

// One signed-in person's flashcards. Groups are private to the account.
export interface FlashcardStore {
  subscribeGroups(cb: (groups: Group[]) => void, onError: (error: Error) => void): Unsubscribe;
  createGroup(name: string, color: string, cards?: Card[]): Promise<string>;
  updateGroup(id: string, patch: { name?: string; color?: string }): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  // Reads the group's latest cards, applies the change and saves, so edits from two devices don't overwrite
  // each other.
  changeCards(id: string, change: (cards: Card[]) => Card[]): Promise<void>;
  // Moves (or copies) cards to another group in one save, so a card is never lost or doubled halfway.
  // Copies get new ids and start fresh; moved cards keep their study progress.
  transferCards(fromId: string, toId: string, cardIds: string[], mode: 'move' | 'copy'): Promise<number>;
}

// The cards going into the target group, and what's left in the source. Shared by both stores.
export function planTransfer(
  from: Card[],
  to: Card[],
  cardIds: string[],
  mode: 'move' | 'copy',
): { from: Card[]; to: Card[]; count: number } {
  const ids = new Set(cardIds);
  const picked = from.filter((c) => ids.has(c.id));
  const room = MAX_CARDS_PER_GROUP - to.length;
  if (picked.length > room) throw new Error(`This group is full: only ${Math.max(room, 0)} more cards fit.`);
  const now = Date.now();
  const incoming =
    mode === 'copy'
      ? picked.map((c, i) => ({ id: crypto.randomUUID(), front: c.front, back: c.back, createdAt: now + i }))
      : picked;
  return {
    from: mode === 'move' ? from.filter((c) => !ids.has(c.id)) : from,
    to: [...to, ...incoming],
    count: picked.length,
  };
}

// Uses the same switch as the games: local mode keeps everything in this browser (development only).
export async function getFlashcardStore(uid: string): Promise<FlashcardStore> {
  return LOCAL_MODE
    ? (await import('./store-local')).localFlashcardStore(uid)
    : (await import('./store-firestore')).firestoreFlashcardStore(uid);
}
