import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import { getModuleApi } from '../../app/module-registry.ts';
import type { AuthApi } from '../auth/contracts.ts';
import type { SyncApi } from '../sync/contracts.ts';
import type { ObjectsApi, ObjectsState, ObjectIntent, BoardObject } from './contracts.ts';
import { handleIntent } from './domain/intent-handler.ts';
import * as store from './domain/object-store.ts';
import * as clipboard from './domain/clipboard.ts';
import { undoManager } from './domain/undo-manager.ts';

export const OBJECTS_MODULE_ID = 'objects';

type ObjectsEvents = {
  objectsChanged: ObjectsState;
};

export const objectsEvents = new EventBus<ObjectsEvents>();

let selectedIds: string[] = [];
// Track pending local writes per objectId (count-based so multiple writes each get their echo suppressed)
const pendingLocalOps = new Map<string, number>();

function getState(): ObjectsState {
  return { objects: store.getAllObjects(), selectedIds };
}

function emitChange(): void {
  objectsEvents.emit('objectsChanged', getState());
}

export const objectsModule: AppModule<ObjectsApi> = {
  id: OBJECTS_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<ObjectsApi> {
    const api: ObjectsApi = {
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

          // Collect all object IDs that need syncing
          const idsToSync = result.objectIds ?? (result.objectId ? [result.objectId] : []);

          if (idsToSync.length > 0) {
            let syncApi: SyncApi | null = null;
            try {
              syncApi = getModuleApi<SyncApi>('sync');
            } catch {
              // sync not available yet
            }

            for (const oid of idsToSync) {
              pendingLocalOps.set(oid, (pendingLocalOps.get(oid) ?? 0) + 1);

              if (syncApi) {
                if (intent.kind === 'delete') {
                  syncApi.publish(oid, null).catch((err) => {
                    console.error('[Objects] Sync publish failed:', err);
                  });
                } else {
                  const obj = store.getObject(oid);
                  if (obj) {
                    syncApi.publish(oid, { ...obj } as unknown as Record<string, unknown>).catch((err) => {
                      console.error('[Objects] Sync publish failed:', err);
                    });
                  }
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
            if (selectedIds.includes(event.objectId)) {
              selectedIds = selectedIds.filter((id) => id !== event.objectId);
            }
            break;
          }
        }
        emitChange();
      },

      copyToClipboard(objectIds: string[]) {
        clipboard.copy(objectIds);
      },

      pasteFromClipboard(centerX: number, centerY: number): string[] {
        let authApi: AuthApi | null = null;
        try {
          authApi = getModuleApi<AuthApi>('auth');
        } catch {
          // auth not available yet
        }
        const actorId = authApi?.currentUser()?.uid ?? 'local';
        const created = clipboard.paste(centerX, centerY, actorId);

        if (created.length > 0) {
          emitChange();

          let syncApi: SyncApi | null = null;
          try {
            syncApi = getModuleApi<SyncApi>('sync');
          } catch {
            // sync not available yet
          }

          for (const obj of created) {
            pendingLocalOps.set(obj.id, (pendingLocalOps.get(obj.id) ?? 0) + 1);
            if (syncApi) {
              syncApi.publish(obj.id, { ...obj } as unknown as Record<string, unknown>).catch((err) => {
                console.error('[Objects] Sync publish failed:', err);
              });
            }
          }
        }

        return created.map((o) => o.id);
      },

      undo() {
        const result = undoManager.undo(store.getAllObjects());
        if (result) {
          store.hydrateFromSnapshot(result);
          emitChange();
        }
      },

      redo() {
        const result = undoManager.redo(store.getAllObjects());
        if (result) {
          store.hydrateFromSnapshot(result);
          emitChange();
        }
      },

      hydrateFromSnapshot(objects: BoardObject[]) {
        store.hydrateFromSnapshot(objects);
        selectedIds = [];
        emitChange();
      },

      select(ids: string[]) {
        selectedIds = ids;
        emitChange();
      },

      toggleSelect(id: string) {
        if (selectedIds.includes(id)) {
          selectedIds = selectedIds.filter((sid) => sid !== id);
        } else {
          selectedIds = [...selectedIds, id];
        }
        emitChange();
      },

      selectAll() {
        selectedIds = store.getAllObjects().map((o) => o.id);
        emitChange();
      },

      deselectAll() {
        selectedIds = [];
        emitChange();
      },

      getSnapshot() {
        return getState();
      },

      observeObjects(cb) {
        return objectsEvents.on('objectsChanged', cb);
      },

      toggleReaction(objectId: string, emoji: string) {
        api.applyLocal({ kind: 'toggle-reaction', objectId, emoji });
      },
    };
    return api;
  },

  async dispose() {
    store.clear();
    selectedIds = [];
    pendingLocalOps.clear();
  },
};
