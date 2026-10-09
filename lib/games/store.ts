import { firebaseConfig } from './firebase-config';
import type { Game, NewGame, NewPlayer, Player } from './types';

export type Unsubscribe = () => void;
export type OnError = (error: Error) => void;

export interface FamilyStore {
  subscribePlayers(cb: (players: Player[]) => void, onError: OnError): Unsubscribe;
  subscribeGames(cb: (games: Game[]) => void, onError: OnError): Unsubscribe;
  subscribeGame(id: string, cb: (game: Game | null) => void, onError: OnError): Unsubscribe;
  addPlayer(player: NewPlayer): Promise<string>;
  updatePlayer(id: string, patch: Partial<NewPlayer>): Promise<void>;
  deletePlayer(id: string): Promise<void>;
  createGame(game: NewGame): Promise<string>;
  updateGame(id: string, patch: Partial<NewGame>): Promise<void>;
  deleteGame(id: string): Promise<void>;
}

export interface Backend {
  mode: 'firestore' | 'local';
  // Returns the family id the PIN key unlocks, or null for a wrong PIN.
  lookupPin(pinKey: string): Promise<string | null>;
  // Same for the admin PIN, which unlocks deleting, reopening, past-round edits and player management.
  lookupAdminPin(adminKey: string): Promise<string | null>;
  family(familyId: string): FamilyStore;
  // Drops and reopens the database connection. Used when a phone wakes up or loading stalls, since a
  // connection that died in the background can leave listeners waiting forever.
  reconnect(): Promise<void>;
}

// Local mode keeps everything in this browser's storage. It's for development only
// (`npm run dev`, or NEXT_PUBLIC_GAMES_LOCAL=1) and never used by a production build.
export const LOCAL_MODE =
  process.env.NEXT_PUBLIC_GAMES_LOCAL === '1' ||
  (process.env.NODE_ENV === 'development' && !firebaseConfig.apiKey);

export const BACKEND_CONFIGURED = LOCAL_MODE || Boolean(firebaseConfig.apiKey);

let backend: Promise<Backend> | null = null;

export function getBackend(): Promise<Backend> {
  backend ??= LOCAL_MODE
    ? import('./store-local').then((m) => m.localBackend)
    : import('./store-firestore').then((m) => m.createFirestoreBackend());
  return backend;
}
