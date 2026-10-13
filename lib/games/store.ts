import { firebaseConfig } from './firebase-config';
import type { Game, NewGame, NewPlayer, Player } from './types';

// The current player list, read once.
export function loadPlayersOnce(store: FamilyStore): Promise<Player[]> {
  return new Promise((resolve, reject) => {
    let done = false;
    let off: Unsubscribe | undefined;
    const finish = () => {
      done = true;
      queueMicrotask(() => off?.());
    };
    off = store.subscribePlayers(
      (players) => {
        if (done) return;
        finish();
        resolve(players);
      },
      (error) => {
        if (done) return;
        finish();
        reject(error);
      },
    );
  });
}

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

// A signed-in account (Google or email and password). Signing in is optional; the family PIN still works.
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
}

// Which family and player an account belongs to. Written once, when the account is linked with the family PIN.
export interface Member {
  familyId: string;
  playerId: string;
  linkedAt: number;
}

export interface AuthApi {
  // Calls back with the current account (or null) right away and on every change.
  onChange(cb: (user: AuthUser | null) => void): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  createAccount(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
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
  auth: AuthApi;
  getMember(uid: string): Promise<Member | null>;
  setMember(uid: string, member: Member): Promise<void>;
}

// Friendly text for sign-in errors from either backend. Returns null for ones to ignore (closed pop-up).
export function authErrorMessage(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return "That email and password don't match.";
    case 'auth/email-already-in-use':
      return 'There\'s already an account with that email. Sign in instead.';
    case 'auth/weak-password':
      return 'Use a password with at least 6 characters.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute and try again.';
    case 'auth/network-request-failed':
      return "Couldn't connect. Check your connection and try again.";
    case 'auth/popup-blocked':
      return 'The sign-in window was blocked. Allow pop-ups for this site and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return "That sign-in method isn't turned on yet.";
    default:
      return "Couldn't sign in. Try again.";
  }
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
