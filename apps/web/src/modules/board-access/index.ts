import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { getFirebaseDb } from '../../core/firebase.ts';
import { getModuleApi } from '../../app/module-registry.ts';
import { generateId } from '../../core/ids.ts';
import { AUTH_MODULE_ID } from '../auth/index.ts';
import { PERMISSIONS_MODULE_ID } from '../permissions/index.ts';
import type { AuthApi } from '../auth/contracts.ts';
import type { PermissionsApi } from '../permissions/contracts.ts';
import type { BoardRole } from '../permissions/contracts.ts';
import type { BoardAccessApi, BoardMeta, Membership } from './contracts.ts';

export const BOARD_ACCESS_MODULE_ID = 'board-access';

export const boardAccessModule: AppModule<BoardAccessApi> = {
  id: BOARD_ACCESS_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<BoardAccessApi> {
    const db = getFirebaseDb();

    function getAuth(): AuthApi {
      return getModuleApi<AuthApi>(AUTH_MODULE_ID);
    }

    function getPermissions(): PermissionsApi {
      return getModuleApi<PermissionsApi>(PERMISSIONS_MODULE_ID);
    }

    function requireUid(): string {
      const user = getAuth().currentUser();
      if (!user) throw new Error('Not authenticated');
      return user.uid;
    }

    /** Read board doc and return the caller's role, or null if not a member. */
    async function getCallerRole(boardId: string): Promise<{ role: BoardRole; data: Record<string, unknown> } | null> {
      const uid = requireUid();
      const snap = await getDoc(doc(db, 'boards', boardId));
      if (!snap.exists()) return null;
      const data = snap.data();
      const memberEntry = data.members?.[uid];
      if (!memberEntry) return null;
      return { role: memberEntry.role as BoardRole, data };
    }

    return {
      async createBoard(input) {
        const uid = requireUid();
        const boardId = generateId();
        const boardRef = doc(db, 'boards', boardId);

        await setDoc(boardRef, {
          title: input.title ?? 'Untitled Board',
          ownerId: uid,
          createdAt: serverTimestamp(),
          members: {
            [uid]: { role: 'owner' as BoardRole, joinedAt: Date.now() },
          },
        });

        return { boardId };
      },

      async getBoard(boardId) {
        const boardRef = doc(db, 'boards', boardId);
        const snap = await getDoc(boardRef);
        if (!snap.exists()) return null;

        const data = snap.data();
        return {
          id: snap.id,
          title: data.title ?? 'Untitled Board',
          ownerId: data.ownerId,
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        } as BoardMeta;
      },

      async canAccess(boardId, capability) {
        const result = await getCallerRole(boardId);
        if (!result) return false;
        return getPermissions().can(capability, { role: result.role });
      },

      async joinBoard(boardId) {
        const uid = requireUid();
        const boardRef = doc(db, 'boards', boardId);
        await setDoc(
          boardRef,
          {
            members: {
              [uid]: { role: 'collaborator' as BoardRole, joinedAt: Date.now() },
            },
          },
          { merge: true },
        );
      },

      async grantMembership(boardId, userId, role) {
        const result = await getCallerRole(boardId);
        if (!result) throw new Error('Not a member of this board');
        if (!getPermissions().can('board:manage-members', { role: result.role })) {
          throw new Error('Not authorized to manage members');
        }

        const boardRef = doc(db, 'boards', boardId);
        await setDoc(
          boardRef,
          {
            members: {
              [userId]: { role, joinedAt: serverTimestamp() },
            },
          },
          { merge: true },
        );
      },

      observeMembership(boardId, cb) {
        const user = getAuth().currentUser();
        if (!user) {
          cb(null);
          return () => {};
        }

        const boardRef = doc(db, 'boards', boardId);
        return onSnapshot(boardRef, (snap) => {
          if (!snap.exists()) {
            cb(null);
            return;
          }
          const data = snap.data();
          const memberEntry = data.members?.[user.uid];
          if (!memberEntry) {
            cb(null);
            return;
          }
          cb({
            userId: user.uid,
            role: memberEntry.role as BoardRole,
            joinedAt: memberEntry.joinedAt ?? Date.now(),
          } as Membership);
        });
      },
    };
  },

  async dispose() {
    // nothing to clean up — snapshot listeners are per-call
  },
};
