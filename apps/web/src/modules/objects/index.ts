import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import { getModuleApi } from '../../app/module-registry.ts';
import type { AuthApi } from '../auth/contracts.ts';
import type { SyncApi } from '../sync/contracts.ts';
import type { ObjectsApi, ObjectsState, ObjectIntent, BoardObject } from './contracts.ts';
import { handleIntent } from './domain/intent-handler.ts';
import * as store from './domain/object-store.ts';

export const OBJECTS_MODULE_ID = 'objects';

type ObjectsEvents = {
  objectsChanged: ObjectsState;
};

export const objectsEvents = new EventBus<ObjectsEvents>();

let selectedId: string | null = null;
// Track pending local writes per objectId (count-based so multiple writes each get their echo suppressed)
const pendingLocalOps = new Map<string, number>();

function getState(): ObjectsState {
  return { objects: store.getAllObjects(), selectedId };
}

function emitChange(): void {
  objectsEvents.emit('objectsChanged', getState());
}

export const objectsModule: AppModule<ObjectsApi> = {
  id: OBJECTS_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<ObjectsApi> {
    return {
      applyLocal(intent: ObjectIntent) {
        let authApi: AuthApi | null = null;
        try {
          authApi = getModuleApi<AuthApi>('auth');
        } catch {
          // auth not available yet
        }
        const actorId = authApi?.currentUser()?.uid ?? 'local';

        const result = handleIntent(intent, actorId);
        if (result.ok) {
          emitChange();

          // Publish to sync (fire-and-forget)
          if (result.objectId) {
            pendingLocalOps.set(result.objectId, (pendingLocalOps.get(result.objectId) ?? 0) + 1);

            let syncApi: SyncApi | null = null;
            try {
              syncApi = getModuleApi<SyncApi>('sync');
            } catch {
              // sync not available yet
            }

            if (syncApi) {
              if (intent.kind === 'delete') {
                syncApi.publish(result.objectId, null).catch((err) => {
                  console.error('[Objects] Sync publish failed:', err);
                });
              } else {
                const obj = store.getObject(result.objectId);
                if (obj) {
                  syncApi.publish(result.objectId, { ...obj } as unknown as Record<string, unknown>).catch((err) => {
                    console.error('[Objects] Sync publish failed:', err);
                  });
                }
              }
            }
          }
        }
        return result;
      },

      applyRemote(event) {
        // Local echo suppression (count-based: each local write consumes one echo)
        const pending = pendingLocalOps.get(event.objectId);
        if (pending && pending > 0) {
          if (pending === 1) {
            pendingLocalOps.delete(event.objectId);
          } else {
            pendingLocalOps.set(event.objectId, pending - 1);
          }
          return;
        }

        switch (event.type) {
          case 'added':
          case 'modified': {
            if (!event.data) return;
            const obj = event.data as unknown as BoardObject;
            store.setObject(obj);
            break;
          }
          case 'removed': {
            store.removeObject(event.objectId);
            if (selectedId === event.objectId) {
              selectedId = null;
            }
            break;
          }
        }
        emitChange();
      },

      hydrateFromSnapshot(objects: BoardObject[]) {
        store.hydrateFromSnapshot(objects);
        selectedId = null;
        emitChange();
      },

      select(objectId: string | null) {
        selectedId = objectId;
        emitChange();
      },

      getSnapshot() {
        return getState();
      },

      observeObjects(cb) {
        return objectsEvents.on('objectsChanged', cb);
      },
    };
  },

  async dispose() {
    store.clear();
    selectedId = null;
    pendingLocalOps.clear();
  },
};
