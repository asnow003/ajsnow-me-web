import { deriveAdminPinKey, derivePinKey } from './pin';
import type { Backend, FamilyStore } from './store';
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
  const run = () => cb(select(load()));
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

export const localBackend: Backend = {
  mode: 'local',
  async lookupPin(pinKey) {
    return pinKey === (await derivePinKey(LOCAL_PIN)) ? 'local' : null;
  },
  async lookupAdminPin(adminKey) {
    return adminKey === (await deriveAdminPinKey(LOCAL_ADMIN_PIN)) ? 'local' : null;
  },
  family: () => store,
};
