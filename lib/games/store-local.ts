import { deriveAdminPinKey, derivePinKey } from './pin';
import type { AuthApi, AuthUser, Backend, FamilyStore, Member } from './store';
import type { Game, NewGame, NewPlayer, Player } from './types';

// Development stand-in for Firestore. PIN is 0000, admin PIN is 9999. Changes sync live between tabs.
const KEY = 'games.local.v1';
export const LOCAL_PIN = '0000';
export const LOCAL_ADMIN_PIN = '9999';

interface Data {
  players: Record<string, NewPlayer>;
  games: Record<string, NewGame>;
}

const listeners = new Set<() => void>();

// Testing aid: with localStorage 'games.local.stall' set, listeners get nothing until reconnect() is
// called ('1'), or never ('forever'), the way a connection that died in the background behaves.
const STALL_KEY = 'games.local.stall';
let stalled = typeof window !== 'undefined' && Boolean(localStorage.getItem(STALL_KEY));
const stalledRuns = new Set<() => void>();

function load(): Data {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '') as Data;
  } catch {
    return { players: {}, games: {} };
  }
}

function change(fn: (data: Data) => void) {
  const data = load();
  fn(data);
  localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

function subscribe<T>(select: (data: Data) => T, cb: (value: T) => void) {
  const run = () => (stalled ? stalledRuns.add(run) : cb(select(load())));
  const onStorage = (e: StorageEvent) => e.key === KEY && run();
  queueMicrotask(run);
  listeners.add(run);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(run);
    window.removeEventListener('storage', onStorage);
  };
}

const store: FamilyStore = {
  subscribePlayers: (cb) =>
    subscribe((d) => Object.entries(d.players).map(([id, p]) => ({ ...p, id }) as Player), cb),
  subscribeGames: (cb) =>
    subscribe((d) => Object.entries(d.games).map(([id, g]) => ({ ...g, id }) as Game), cb),
  subscribeGame: (id, cb) =>
    subscribe((d) => (d.games[id] ? ({ ...d.games[id], id } as Game) : null), cb),
  async addPlayer(player) {
    const id = crypto.randomUUID();
    change((d) => void (d.players[id] = player));
    return id;
  },
  async updatePlayer(id, patch) {
    change((d) => void (d.players[id] = { ...d.players[id], ...patch }));
  },
  async deletePlayer(id) {
    change((d) => void delete d.players[id]);
  },
  async createGame(game) {
    const id = crypto.randomUUID();
    change((d) => void (d.games[id] = game));
    return id;
  },
  async updateGame(id, patch) {
    change((d) => void (d.games[id] = { ...d.games[id], ...patch }));
  },
  async deleteGame(id) {
    change((d) => void delete d.games[id]);
  },
};

// Fake sign-in for local mode. Accounts live in this browser; "Google" signs in as a fixed test account.
const ACCOUNTS_KEY = 'games.local.accounts';
const AUTH_KEY = 'games.local.auth';
const MEMBERS_KEY = 'games.local.members';
const authListeners = new Set<(user: AuthUser | null) => void>();
// Stand-in profile photo for the fake Google account, inline so local mode needs no network.
const TEST_PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#F5C4B3"/><circle cx="20" cy="16" r="7" fill="#712B13"/><rect x="8" y="26" width="24" height="16" rx="8" fill="#712B13"/></svg>',
  );

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? '') as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function setCurrentUser(user: AuthUser | null) {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_KEY);
  authListeners.forEach((l) => l(user));
}

function authFail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

const localAuth: AuthApi = {
  onChange(cb) {
    authListeners.add(cb);
    queueMicrotask(() => cb(readJson<AuthUser | null>(AUTH_KEY, null)));
    return () => void authListeners.delete(cb);
  },
  async signInWithGoogle() {
    setCurrentUser({ uid: 'local-google', email: 'tester@gmail.com', displayName: 'Google Tester', photoUrl: TEST_PHOTO });
  },
  async signInWithEmail(email, password) {
    const account = readJson<Record<string, { password: string; uid: string }>>(ACCOUNTS_KEY, {})[email.toLowerCase()];
    if (!account || account.password !== password) authFail('auth/invalid-credential');
    setCurrentUser({ uid: account.uid, email, displayName: null, photoUrl: null });
  },
  async createAccount(email, password) {
    if (!/^\S+@\S+\.\S+$/.test(email)) authFail('auth/invalid-email');
    if (password.length < 6) authFail('auth/weak-password');
    const accounts = readJson<Record<string, { password: string; uid: string }>>(ACCOUNTS_KEY, {});
    if (accounts[email.toLowerCase()]) authFail('auth/email-already-in-use');
    const uid = `local-${crypto.randomUUID()}`;
    accounts[email.toLowerCase()] = { password, uid };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    setCurrentUser({ uid, email, displayName: null, photoUrl: null });
  },
  async resetPassword(email) {
    if (!/^\S+@\S+\.\S+$/.test(email)) authFail('auth/invalid-email');
  },
  async signOut() {
    setCurrentUser(null);
  },
};

export const localBackend: Backend = {
  mode: 'local',
  async lookupPin(pinKey) {
    return pinKey === (await derivePinKey(LOCAL_PIN)) ? 'local' : null;
  },
  async lookupAdminPin(adminKey) {
    return adminKey === (await deriveAdminPinKey(LOCAL_ADMIN_PIN)) ? 'local' : null;
  },
  family: () => store,
  auth: localAuth,
  async getMember(uid) {
    return readJson<Record<string, Member>>(MEMBERS_KEY, {})[uid] ?? null;
  },
  async setMember(uid, member) {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify({ ...readJson<Record<string, Member>>(MEMBERS_KEY, {}), [uid]: member }));
  },
  async reconnect() {
    if (localStorage.getItem(STALL_KEY) === 'forever') return;
    stalled = false;
    stalledRuns.forEach((run) => run());
    stalledRuns.clear();
  },
};
