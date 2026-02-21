import {
  collection,
  onSnapshot,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
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
  flushWrites(boardId: string): Promise<void>;
}

/** Convert any Firestore Timestamp fields to epoch-ms numbers. */
function normalizeTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    out[key] = val instanceof Timestamp ? val.toMillis() : val;
  }
  return out;
}

const FLUSH_INTERVAL_MS = 50;
const BATCH_LIMIT = 500;

export function createFirestoreSync(): FirestoreSyncHandle {
  let unsub: Unsubscribe | null = null;
  let isFirstSnapshot = true;

  // Write buffer: keyed by objectId, last-write-wins
  const writeBuffer = new Map<string, { objectId: string; data: Record<string, unknown> | null }>();
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let activeBoardId: string | null = null;

  async function flushBuffer(boardId: string): Promise<void> {
    if (writeBuffer.size === 0) return;

    const db = getFirebaseDb();
    // Snapshot current entries and clear them from the buffer.
    // New writes arriving during await go into a fresh buffer slot.
    const entries = [...writeBuffer.entries()];
    for (const [key] of entries) {
      writeBuffer.delete(key);
    }

    // Process in chunks of BATCH_LIMIT (Firestore batch limit is 500)
    for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
      const chunk = entries.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      for (const [, { objectId, data }] of chunk) {
        const docRef = doc(db, 'boards', boardId, 'objects', objectId);
        if (data === null) {
          batch.delete(docRef);
        } else {
          batch.set(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
        }
      }

      try {
        await batch.commit();
      } catch (err) {
        // Re-insert failed entries so the next flush retries them.
        // Only re-insert if no newer write superseded the entry.
        for (const [key, value] of chunk) {
          if (!writeBuffer.has(key)) {
            writeBuffer.set(key, value);
          }
        }
        throw err;
      }
    }
  }

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
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      // Clear any unflushed writes — callers should call flushWrites() before
      // unsubscribe() if they need to persist buffered data (disconnect() does this).
      writeBuffer.clear();
      if (unsub) {
        unsub();
        unsub = null;
      }
    },

    async write(boardId, objectId, data) {
      // Buffer the write — last-write-wins per objectId
      activeBoardId = boardId;
      writeBuffer.set(objectId, { objectId, data });

      // Start flush timer on first write
      if (!flushTimer) {
        flushTimer = setInterval(() => {
          if (activeBoardId) {
            flushBuffer(activeBoardId).catch((err) => {
              console.error('[FirestoreSync] Batch flush error:', err);
            });
          }
        }, FLUSH_INTERVAL_MS);
      }
    },

    async flushWrites(boardId) {
      await flushBuffer(boardId);
    },
  };
}
