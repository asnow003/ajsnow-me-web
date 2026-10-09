import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  addDoc, collection, deleteDoc, doc, getDoc, initializeFirestore, onSnapshot, updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import type { Backend, FamilyStore } from './store';
import type { Game, Player } from './types';

export function createFirestoreBackend(): Backend {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

  return {
    mode: 'firestore',
    async lookupPin(pinKey) {
      const snap = await getDoc(doc(db, 'pins', pinKey));
      const familyId = snap.exists() ? snap.data().familyId : null;
      return typeof familyId === 'string' ? familyId : null;
    },
    async lookupAdminPin(adminKey) {
      const snap = await getDoc(doc(db, 'adminPins', adminKey));
      const familyId = snap.exists() ? snap.data().familyId : null;
      return typeof familyId === 'string' ? familyId : null;
    },
    family: (familyId) => familyStore(db, familyId),
  };
}

function familyStore(db: Firestore, familyId: string): FamilyStore {
  const players = collection(db, 'families', familyId, 'players');
  const games = collection(db, 'families', familyId, 'games');

  return {
    subscribePlayers: (cb, onError) =>
      onSnapshot(players, (s) => cb(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Player)), onError),
    subscribeGames: (cb, onError) =>
      onSnapshot(games, (s) => cb(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Game)), onError),
    subscribeGame: (id, cb, onError) =>
      onSnapshot(
        doc(games, id),
        (d) => cb(d.exists() ? ({ ...d.data(), id: d.id } as Game) : null),
        onError,
      ),
    addPlayer: async (player) => (await addDoc(players, player)).id,
    updatePlayer: (id, patch) => updateDoc(doc(players, id), patch),
    deletePlayer: (id) => deleteDoc(doc(players, id)),
    createGame: async (game) => (await addDoc(games, game)).id,
    updateGame: (id, patch) => updateDoc(doc(games, id), patch),
    deleteGame: (id) => deleteDoc(doc(games, id)),
  };
}
