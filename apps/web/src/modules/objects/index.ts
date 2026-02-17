import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import type { ObjectsApi, ObjectsState, ObjectIntent } from './contracts.ts';
import { handleIntent } from './domain/intent-handler.ts';
import * as store from './domain/object-store.ts';

export const OBJECTS_MODULE_ID = 'objects';

type ObjectsEvents = {
  objectsChanged: ObjectsState;
};

export const objectsEvents = new EventBus<ObjectsEvents>();

let selectedId: string | null = null;

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
        const result = handleIntent(intent, 'local'); // actorId will come from auth later
        if (result.ok) emitChange();
        return result;
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
  },
};
