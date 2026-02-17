import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import type { CursorState, PresenceApi, PresenceUser } from './contracts.ts';
import {
  connectPresence,
  type RtdbPresenceHandle,
} from './infrastructure/rtdb-presence.ts';

export const PRESENCE_MODULE_ID = 'presence';

type PresenceEvents = {
  cursorsChanged: CursorState[];
  onlineUsersChanged: PresenceUser[];
};

export const presenceEvents = new EventBus<PresenceEvents>();

let handle: RtdbPresenceHandle | null = null;
let unsubCursors: (() => void) | null = null;
let unsubPresence: (() => void) | null = null;
let throttleTimer: ReturnType<typeof setInterval> | null = null;
let pendingCursor: { x: number; y: number } | null = null;

async function teardown(): Promise<void> {
  if (throttleTimer !== null) {
    clearInterval(throttleTimer);
    throttleTimer = null;
  }
  pendingCursor = null;
  unsubCursors?.();
  unsubCursors = null;
  unsubPresence?.();
  unsubPresence = null;
  if (handle) {
    await handle.cleanup();
    handle = null;
  }
}

export const presenceModule: AppModule<PresenceApi> = {
  id: PRESENCE_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<PresenceApi> {
    const api: PresenceApi = {
      async start(boardId, user) {
        await teardown();

        handle = await connectPresence(boardId, user);

        unsubCursors = handle.onCursors((cursors) => {
          presenceEvents.emit('cursorsChanged', cursors);
        });

        unsubPresence = handle.onPresence((users) => {
          presenceEvents.emit('onlineUsersChanged', users);
        });

        // Throttled cursor publishing: flush every 50ms
        throttleTimer = setInterval(() => {
          if (pendingCursor && handle) {
            handle.publishCursor(pendingCursor.x, pendingCursor.y);
            pendingCursor = null;
          }
        }, 50);
      },

      async stop() {
        await teardown();
      },

      publishCursor(worldPos) {
        pendingCursor = { x: worldPos.x, y: worldPos.y };
      },

      observeCursors(cb) {
        return presenceEvents.on('cursorsChanged', cb);
      },

      observeOnlineUsers(cb) {
        return presenceEvents.on('onlineUsersChanged', cb);
      },
    };

    return api;
  },

  async dispose() {
    await teardown();
  },
};
