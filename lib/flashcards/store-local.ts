import { planTransfer, type FlashcardStore } from './store';
import type { Group, NewGroup } from './types';

// Development stand-in for Firestore, kept in this browser per test account. Changes sync live between tabs.
const KEY = 'flashcards.local.v1';

type Data = Record<string, Record<string, NewGroup>>;

const listeners = new Set<() => void>();

function load(): Data {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '') as Data) ?? {};
  } catch {
    return {};
  }
}

export function localFlashcardStore(uid: string): FlashcardStore {
  const change = (fn: (groups: Record<string, NewGroup>) => void) => {
    const data = load();
    data[uid] ??= {};
    fn(data[uid]);
    localStorage.setItem(KEY, JSON.stringify(data));
    listeners.forEach((l) => l());
  };

  return {
    subscribeGroups(cb) {
      const run = () => cb(Object.entries(load()[uid] ?? {}).map(([id, g]) => ({ ...g, id }) as Group));
      const onStorage = (e: StorageEvent) => e.key === KEY && run();
      queueMicrotask(run);
      listeners.add(run);
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(run);
        window.removeEventListener('storage', onStorage);
      };
    },
    async createGroup(name, color, cards = []) {
      const id = crypto.randomUUID();
      const now = Date.now();
      change((g) => void (g[id] = { name, color, cards, createdAt: now, updatedAt: now }));
      return id;
    },
    async updateGroup(id, patch) {
      change((g) => void (g[id] = { ...g[id], ...patch, updatedAt: Date.now() }));
    },
    async deleteGroup(id) {
      change((g) => void delete g[id]);
    },
    async changeCards(id, fn) {
      change((g) => {
        if (!g[id]) throw new Error('This group was deleted.');
        g[id] = { ...g[id], cards: fn(g[id].cards), updatedAt: Date.now() };
      });
    },
    async transferCards(fromId, toId, cardIds, mode) {
      let count = 0;
      change((g) => {
        if (!g[fromId] || !g[toId]) throw new Error('This group was deleted.');
        const plan = planTransfer(g[fromId].cards, g[toId].cards, cardIds, mode);
        const now = Date.now();
        g[fromId] = { ...g[fromId], cards: plan.from, updatedAt: now };
        g[toId] = { ...g[toId], cards: plan.to, updatedAt: now };
        count = plan.count;
      });
      return count;
    },
  };
}
