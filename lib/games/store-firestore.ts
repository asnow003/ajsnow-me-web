import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  addDoc, collection, deleteDoc, disableNetwork, doc, enableNetwork, getDoc, initializeFirestore, onSnapshot, setDoc,
  updateDoc, type Firestore,
} from 'firebase/firestore';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, getAuth, getRedirectResult, onAuthStateChanged,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut,
  type Auth,
} from 'firebase/auth';
import { firebaseConfig } from './firebase-config';
import type { AuthApi, Backend, FamilyStore, Member } from './store';
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
    async reconnect() {
      await disableNetwork(db);
      await enableNetwork(db);
    },
    auth: authApi(getAuth(app)),
    async getMember(uid) {
      const snap = await getDoc(doc(db, 'members', uid));
      return snap.exists() ? (snap.data() as Member) : null;
    },
    setMember: (uid, member) => setDoc(doc(db, 'members', uid), member),
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

// Home-screen apps (iPhone especially) can't use sign-in pop-ups, so they go to Google and back instead.
function isHomeScreenApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function authApi(auth: Auth): AuthApi {
  // Finishes a Google redirect sign-in. Success arrives through onAuthStateChanged; errors are dropped here
  // because there's no screen waiting on them after a redirect.
  getRedirectResult(auth).catch(() => {});
  const google = new GoogleAuthProvider();
  google.setCustomParameters({ prompt: 'select_account' });

  return {
    onChange: (cb) =>
      onAuthStateChanged(auth, (u) => cb(u && { uid: u.uid, email: u.email, displayName: u.displayName })),
    async signInWithGoogle() {
      if (isHomeScreenApp()) await signInWithRedirect(auth, google);
      else await signInWithPopup(auth, google);
    },
    signInWithEmail: async (email, password) => void (await signInWithEmailAndPassword(auth, email, password)),
    createAccount: async (email, password) => void (await createUserWithEmailAndPassword(auth, email, password)),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
  };
}
