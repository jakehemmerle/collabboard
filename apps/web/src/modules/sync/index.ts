import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import type { SyncApi, SyncConnectionStatus, SyncEvent } from './contracts.ts';
import { createFirestoreSync } from './infrastructure/firestore-sync.ts';

export const SYNC_MODULE_ID = 'sync';

type SyncEvents = {
  statusChanged: SyncConnectionStatus;
  remoteChange: SyncEvent[];
};

export const syncEvents = new EventBus<SyncEvents>();

export const syncModule: AppModule<SyncApi> = {
  id: SYNC_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<SyncApi> {
    const firestore = createFirestoreSync();
    let currentStatus: SyncConnectionStatus = 'idle';
    let currentBoardId: string | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let actorId: string | null = null;

    function setStatus(s: SyncConnectionStatus): void {
      currentStatus = s;
      syncEvents.emit('statusChanged', s);
    }

    function handleError(err: Error): void {
      console.error('[Sync] Snapshot listener error:', err);

      if (!currentBoardId || !actorId) {
        setStatus('disconnected');
        return;
      }

      setStatus('reconnecting');
      reconnectAttempts++;
      const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
      reconnectTimer = setTimeout(() => {
        if (currentBoardId) {
          firestore.subscribe(
            currentBoardId,
            (events) => {
              reconnectAttempts = 0;
              if (currentStatus !== 'connected') setStatus('connected');
              syncEvents.emit('remoteChange', events);
            },
            handleError,
          );
        }
      }, delay);
    }

    return {
      async connect({ boardId, actorId: actor }) {
        if (currentBoardId === boardId && currentStatus === 'connected') return;

        currentBoardId = boardId;
        actorId = actor;
        setStatus('connecting');

        firestore.subscribe(
          boardId,
          (events) => {
            reconnectAttempts = 0;
            if (currentStatus !== 'connected') setStatus('connected');
            syncEvents.emit('remoteChange', events);
          },
          handleError,
        );
      },

      async disconnect() {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        firestore.unsubscribe();
        currentBoardId = null;
        actorId = null;
        reconnectAttempts = 0;
        setStatus('idle');
      },

      status() {
        return currentStatus;
      },

      observeStatus(cb) {
        return syncEvents.on('statusChanged', cb);
      },

      async publish(objectId, data) {
        if (!currentBoardId) {
          console.warn('[Sync] Cannot publish: not connected');
          return;
        }
        await firestore.write(currentBoardId, objectId, data);
      },

      onRemoteChange(cb) {
        return syncEvents.on('remoteChange', cb);
      },
    };
  },

  async dispose() {
    // The api.disconnect() should be called by board-session before dispose
  },
};

export type { SyncApi, SyncConnectionStatus, SyncEvent } from './contracts.ts';
