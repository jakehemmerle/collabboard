import {
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from '../../../core/firebase.ts';
import type { SyncEvent } from '../contracts.ts';

export interface FirestoreSyncHandle {
  subscribe(
    boardId: string,
    onChange: (events: SyncEvent[]) => void,
    onError: (err: Error) => void,
  ): void;
  unsubscribe(): void;
  write(boardId: string, objectId: string, data: Record<string, unknown> | null): Promise<void>;
}

/** Convert any Firestore Timestamp fields to epoch-ms numbers. */
function normalizeTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    out[key] = val instanceof Timestamp ? val.toMillis() : val;
  }
  return out;
}

export function createFirestoreSync(): FirestoreSyncHandle {
  let unsub: Unsubscribe | null = null;
  let isFirstSnapshot = true;

  return {
    subscribe(boardId, onChange, onError) {
      this.unsubscribe();
      isFirstSnapshot = true;
      const db = getFirebaseDb();
      const colRef = collection(db, 'boards', boardId, 'objects');

      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            const events: SyncEvent[] = snapshot.docs.map((d) => ({
              type: 'added' as const,
              objectId: d.id,
              data: normalizeTimestamps(d.data() as Record<string, unknown>),
            }));
            onChange(events);
            return;
          }

          const events: SyncEvent[] = snapshot.docChanges().map((change) => ({
            type: change.type === 'removed' ? 'removed' : change.type === 'added' ? 'added' : 'modified',
            objectId: change.doc.id,
            data: change.type === 'removed' ? null : normalizeTimestamps(change.doc.data() as Record<string, unknown>),
          }));

          if (events.length > 0) {
            onChange(events);
          }
        },
        (err) => {
          onError(err);
        },
      );
    },

    unsubscribe() {
      if (unsub) {
        unsub();
        unsub = null;
      }
    },

    async write(boardId, objectId, data) {
      const db = getFirebaseDb();
      const docRef = doc(db, 'boards', boardId, 'objects', objectId);

      if (data === null) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      }
    },
  };
}
