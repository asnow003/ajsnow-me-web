import { addDoc, collection, deleteDoc, doc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { planTransfer, type FlashcardStore } from './store';
import type { Card, Group, NewGroup } from './types';

// Groups live at users/{uid}/flashcardGroups/{groupId}; firestore.rules lets only that account read or write them.
export function firestoreFlashcardStore(uid: string): FlashcardStore {
  const db = firestore();
  const groups = collection(db, 'users', uid, 'flashcardGroups');

  return {
    subscribeGroups: (cb, onError) =>
      onSnapshot(groups, (s) => cb(s.docs.map((d) => ({ ...(d.data() as NewGroup), id: d.id }) as Group)), onError),
    async createGroup(name, color, cards = []) {
      const now = Date.now();
      const group: NewGroup = { name, color, cards, createdAt: now, updatedAt: now };
      return (await addDoc(groups, group)).id;
    },
    updateGroup: (id, patch) => updateDoc(doc(groups, id), { ...patch, updatedAt: Date.now() }),
    deleteGroup: (id) => deleteDoc(doc(groups, id)),
    changeCards: (id, change) =>
      runTransaction(db, async (tx) => {
        const ref = doc(groups, id);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('This group was deleted.');
        const cards = (snap.data().cards ?? []) as Card[];
        tx.update(ref, { cards: change(cards), updatedAt: Date.now() });
      }),
    transferCards: (fromId, toId, cardIds, mode) =>
      runTransaction(db, async (tx) => {
        const fromRef = doc(groups, fromId);
        const toRef = doc(groups, toId);
        const [fromSnap, toSnap] = [await tx.get(fromRef), await tx.get(toRef)];
        if (!fromSnap.exists() || !toSnap.exists()) throw new Error('This group was deleted.');
        const plan = planTransfer(fromSnap.data().cards ?? [], toSnap.data().cards ?? [], cardIds, mode);
        const now = Date.now();
        if (mode === 'move') tx.update(fromRef, { cards: plan.from, updatedAt: now });
        tx.update(toRef, { cards: plan.to, updatedAt: now });
        return plan.count;
      }),
  };
}
