import {
  ref,
  set,
  onValue,
  onDisconnect,
  remove,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/database';
import { getFirebaseRtdb } from '../../../core/firebase.ts';
import type { CursorState, PresenceUser } from '../contracts.ts';
import { cursorColorForUid } from '../domain/cursor-color.ts';

export interface RtdbPresenceHandle {
  publishCursor(x: number, y: number): void;
  onCursors(cb: (cursors: CursorState[]) => void): Unsubscribe;
  onPresence(cb: (users: PresenceUser[]) => void): Unsubscribe;
  cleanup(): Promise<void>;
}

export async function connectPresence(
  boardId: string,
  user: { uid: string; displayName: string; photoURL: string | null },
): Promise<RtdbPresenceHandle> {
  const rtdb = getFirebaseRtdb();
  const color = cursorColorForUid(user.uid);

  const cursorRef = ref(rtdb, `boards/${boardId}/cursors/${user.uid}`);
  const presenceRef = ref(rtdb, `boards/${boardId}/presence/${user.uid}`);
  const allCursorsRef = ref(rtdb, `boards/${boardId}/cursors`);
  const allPresenceRef = ref(rtdb, `boards/${boardId}/presence`);

  // Write presence and set up disconnect cleanup
  await set(presenceRef, {
    displayName: user.displayName,
    photoURL: user.photoURL,
    color,
    online: true,
    lastSeen: serverTimestamp(),
  });
  await onDisconnect(presenceRef).remove();
  await onDisconnect(cursorRef).remove();

  return {
    publishCursor(x: number, y: number) {
      set(cursorRef, {
        displayName: user.displayName,
        color,
        x,
        y,
        lastUpdated: serverTimestamp(),
      });
    },

    onCursors(cb) {
      return onValue(allCursorsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          cb([]);
          return;
        }
        const cursors: CursorState[] = Object.entries(data)
          .filter(([uid]) => uid !== user.uid)
          .map(([uid, val]) => {
            const v = val as Record<string, unknown>;
            return {
              uid,
              displayName: (v.displayName as string) ?? '',
              color: (v.color as string) ?? '#999',
              x: (v.x as number) ?? 0,
              y: (v.y as number) ?? 0,
              lastUpdated: (v.lastUpdated as number) ?? 0,
            };
          });
        cb(cursors);
      });
    },

    onPresence(cb) {
      return onValue(allPresenceRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          cb([]);
          return;
        }
        const users: PresenceUser[] = Object.entries(data).map(
          ([uid, val]) => {
            const v = val as Record<string, unknown>;
            return {
              uid,
              displayName: (v.displayName as string) ?? '',
              photoURL: (v.photoURL as string) ?? null,
              color: (v.color as string) ?? '#999',
              online: (v.online as boolean) ?? false,
              lastSeen: (v.lastSeen as number) ?? 0,
            };
          },
        );
        cb(users);
      });
    },

    async cleanup() {
      await remove(cursorRef);
      await remove(presenceRef);
    },
  };
}
