import { LOCAL_MODE } from '../games/store';
import type { Card, Group } from './types';

export type Unsubscribe = () => void;

// One signed-in person's flashcards. Groups are private to the account.
export interface FlashcardStore {
  subscribeGroups(cb: (groups: Group[]) => void, onError: (error: Error) => void): Unsubscribe;
  createGroup(name: string, color: string): Promise<string>;
  updateGroup(id: string, patch: { name?: string; color?: string }): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  // Reads the group's latest cards, applies the change and saves, so edits from two devices don't overwrite
  // each other.
  changeCards(id: string, change: (cards: Card[]) => Card[]): Promise<void>;
}

// Uses the same switch as the games: local mode keeps everything in this browser (development only).
export async function getFlashcardStore(uid: string): Promise<FlashcardStore> {
  return LOCAL_MODE
    ? (await import('./store-local')).localFlashcardStore(uid)
    : (await import('./store-firestore')).firestoreFlashcardStore(uid);
}
