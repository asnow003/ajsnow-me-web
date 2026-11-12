import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './games/firebase-config';

// One Firebase app and one Firestore client for the whole site, shared by the games and flashcards.
// Firestore can only be initialized once per app, so both go through here.
let db: Firestore | null = null;

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function firestore(): Firestore {
  db ??= initializeFirestore(firebaseApp(), { ignoreUndefinedProperties: true });
  return db;
}
