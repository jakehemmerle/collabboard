import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import { getModuleApi } from '../../app/module-registry.ts';
import type { AuthApi } from '../auth/contracts.ts';
import type { SyncApi } from '../sync/contracts.ts';
import type { ObjectsApi, BoardObject } from '../objects/contracts.ts';
import type { BoardSessionApi, BoardSessionState } from './contracts.ts';

export const BOARD_SESSION_MODULE_ID = 'board-session';

type SessionEvents = {
  stateChanged: BoardSessionState;
};

export const boardSessionEvents = new EventBus<SessionEvents>();

export const boardSessionModule: AppModule<BoardSessionApi> = {
  id: BOARD_SESSION_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<BoardSessionApi> {
    let currentState: BoardSessionState = 'idle';
    let currentBoardId: string | null = null;
    let remoteUnsub: (() => void) | null = null;
    // Serialization guard: enter() awaits any in-flight leave() to prevent
    // the async disconnect from killing a newly-created onSnapshot listener.
    let pendingLeave: Promise<void> | null = null;

    function setState(s: BoardSessionState): void {
      currentState = s;
      boardSessionEvents.emit('stateChanged', s);
    }

    return {
      async enter(boardId: string) {
        // Wait for any in-flight leave() to finish before proceeding
        if (pendingLeave) await pendingLeave;

        if (currentBoardId === boardId && currentState === 'active') return;

        setState('entering');
        currentBoardId = boardId;

        const authApi = getModuleApi<AuthApi>('auth');
        const syncApi = getModuleApi<SyncApi>('sync');
        const objectsApi = getModuleApi<ObjectsApi>('objects');

        const user = authApi.currentUser();
        if (!user) throw new Error('Must be authenticated to enter a board');

        // Wait for the first snapshot to arrive (hydrate), then mark active
        let initialSnapshotResolved = false;
        const initialSnapshot = new Promise<void>((resolve) => {
          remoteUnsub = syncApi.onRemoteChange((events) => {
            if (!initialSnapshotResolved) {
              // First snapshot: hydrate objects store
              initialSnapshotResolved = true;
              const objects: BoardObject[] = events
                .filter((e) => e.type === 'added' && e.data)
                .map((e) => e.data as unknown as BoardObject);
              objectsApi.hydrateFromSnapshot(objects);
              resolve();
              return;
            }

            // Subsequent snapshots: apply remote changes
            for (const event of events) {
              objectsApi.applyRemote(event);
            }
          });
        });

        await syncApi.connect({ boardId, actorId: user.uid });
        await initialSnapshot;
        setState('active');
      },

      async leave() {
        if (currentState === 'idle') return;

        setState('leaving');

        if (remoteUnsub) {
          remoteUnsub();
          remoteUnsub = null;
        }

        const syncApi = getModuleApi<SyncApi>('sync');
        const objectsApi = getModuleApi<ObjectsApi>('objects');

        pendingLeave = syncApi.disconnect();
        await pendingLeave;
        pendingLeave = null;
        objectsApi.hydrateFromSnapshot([]);
        currentBoardId = null;
        setState('idle');
      },

      observeState(cb) {
        return boardSessionEvents.on('stateChanged', cb);
      },

      currentBoardId() {
        return currentBoardId;
      },
    };
  },

  async dispose() {
    // leave() should be called before dispose
  },
};

export type { BoardSessionApi, BoardSessionState } from './contracts.ts';
