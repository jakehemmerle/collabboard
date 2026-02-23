import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CursorState, PresenceUser } from '../contracts.ts';

// ── Mock connectPresence ────────────────────────────────────────────────
let cursorCallback: ((cursors: CursorState[]) => void) | null = null;
let presenceCallback: ((users: PresenceUser[]) => void) | null = null;
const mockPublishCursor = vi.fn();
const mockCleanup = vi.fn().mockResolvedValue(undefined);

vi.mock('../infrastructure/rtdb-presence.ts', () => ({
  connectPresence: vi.fn().mockResolvedValue({
    onCursors: (cb: (cursors: CursorState[]) => void) => {
      cursorCallback = cb;
      return () => {
        cursorCallback = null;
      };
    },
    onPresence: (cb: (users: PresenceUser[]) => void) => {
      presenceCallback = cb;
      return () => {
        presenceCallback = null;
      };
    },
    publishCursor: mockPublishCursor,
    cleanup: mockCleanup,
  }),
}));

// Import after mock is declared so the mock is in effect
import { presenceModule, presenceEvents } from '../index.ts';
import { connectPresence } from '../infrastructure/rtdb-presence.ts';
import { cursorColorForUid } from '../domain/cursor-color.ts';
import type { ModuleContext } from '../../../core/module-system.ts';

const BOARD_ID = 'test-board-123';
const TEST_USER = { uid: 'user-abc', displayName: 'Alice', photoURL: null };

const CTX: ModuleContext = {
  env: {
    firebaseApiKey: '',
    firebaseAuthDomain: '',
    firebaseProjectId: '',
    firebaseDatabaseUrl: '',
    firebaseStorageBucket: '',
    firebaseMessagingSenderId: '',
    firebaseAppId: '',
    useEmulators: false,
  },
};

describe('presence module integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    cursorCallback = null;
    presenceCallback = null;
  });

  afterEach(async () => {
    await presenceModule.dispose();
    vi.useRealTimers();
  });

  // ── 1. Start connects and subscribes ─────────────────────────────────
  describe('start connects and subscribes', () => {
    it('calls connectPresence with correct boardId and user', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      expect(connectPresence).toHaveBeenCalledWith(BOARD_ID, TEST_USER);
    });

    it('registers cursor and presence listeners', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      expect(cursorCallback).toBeTypeOf('function');
      expect(presenceCallback).toBeTypeOf('function');
    });
  });

  // ── 2. Cursor throttling ─────────────────────────────────────────────
  describe('cursor throttling', () => {
    it('does not publish immediately on publishCursor call', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      api.publishCursor({ x: 10, y: 20 });
      expect(mockPublishCursor).not.toHaveBeenCalled();
    });

    it('publishes once after 50ms even with multiple calls', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      api.publishCursor({ x: 10, y: 20 });
      api.publishCursor({ x: 30, y: 40 });
      api.publishCursor({ x: 50, y: 60 });

      vi.advanceTimersByTime(50);

      // Only the last cursor position should be published (one call per interval)
      expect(mockPublishCursor).toHaveBeenCalledTimes(1);
      expect(mockPublishCursor).toHaveBeenCalledWith(50, 60);
    });

    it('publishes again after another 50ms interval', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      api.publishCursor({ x: 10, y: 20 });
      vi.advanceTimersByTime(50);
      expect(mockPublishCursor).toHaveBeenCalledTimes(1);

      api.publishCursor({ x: 100, y: 200 });
      vi.advanceTimersByTime(50);
      expect(mockPublishCursor).toHaveBeenCalledTimes(2);
      expect(mockPublishCursor).toHaveBeenLastCalledWith(100, 200);
    });

    it('does not publish if no cursor was set during interval', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      // Advance time without publishing any cursor
      vi.advanceTimersByTime(200);
      expect(mockPublishCursor).not.toHaveBeenCalled();
    });
  });

  // ── 3. Stop tears down ───────────────────────────────────────────────
  describe('stop tears down', () => {
    it('calls cleanup on the handle', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);
      await api.stop();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('clears cursor and presence subscriptions', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);
      expect(cursorCallback).not.toBeNull();
      expect(presenceCallback).not.toBeNull();

      await api.stop();
      expect(cursorCallback).toBeNull();
      expect(presenceCallback).toBeNull();
    });

    it('stops the throttle interval so no more publishes occur', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      api.publishCursor({ x: 1, y: 2 });
      await api.stop();

      vi.advanceTimersByTime(200);
      expect(mockPublishCursor).not.toHaveBeenCalled();
    });
  });

  // ── 4. EventBus cursorsChanged ───────────────────────────────────────
  describe('EventBus cursorsChanged', () => {
    it('emits cursorsChanged when mock cursor callback fires', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      const received: CursorState[][] = [];
      const unsub = presenceEvents.on('cursorsChanged', (c) => received.push(c));

      const fakeCursors: CursorState[] = [
        { uid: 'u1', displayName: 'Bob', color: '#F00', x: 10, y: 20, lastUpdated: 1 },
      ];
      cursorCallback!(fakeCursors);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(fakeCursors);

      unsub();
    });
  });

  // ── 5. EventBus onlineUsersChanged ───────────────────────────────────
  describe('EventBus onlineUsersChanged', () => {
    it('emits onlineUsersChanged when mock presence callback fires', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);

      const received: PresenceUser[][] = [];
      const unsub = presenceEvents.on('onlineUsersChanged', (u) => received.push(u));

      const fakeUsers: PresenceUser[] = [
        { uid: 'u2', displayName: 'Carol', photoURL: null, color: '#0F0', online: true, lastSeen: 99 },
      ];
      presenceCallback!(fakeUsers);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(fakeUsers);

      unsub();
    });
  });

  // ── 6. Restart tears down first ──────────────────────────────────────
  describe('restart tears down first', () => {
    it('calls cleanup before reconnecting on second start', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);
      expect(mockCleanup).not.toHaveBeenCalled();

      await api.start(BOARD_ID, TEST_USER);
      expect(mockCleanup).toHaveBeenCalledTimes(1);
      expect(connectPresence).toHaveBeenCalledTimes(2);
    });

    it('clears old subscriptions before creating new ones', async () => {
      const api = await presenceModule.init(CTX);
      await api.start(BOARD_ID, TEST_USER);
      const firstCursorCb = cursorCallback;
      const firstPresenceCb = presenceCallback;

      await api.start(BOARD_ID, TEST_USER);

      // Old callbacks were nulled out by unsub, new ones are set
      expect(cursorCallback).not.toBe(firstCursorCb);
      expect(presenceCallback).not.toBe(firstPresenceCb);
      expect(cursorCallback).toBeTypeOf('function');
      expect(presenceCallback).toBeTypeOf('function');
    });
  });

  // ── 7. cursorColorForUid determinism ─────────────────────────────────
  describe('cursorColorForUid determinism', () => {
    it('returns the same color for the same uid across multiple calls', () => {
      const color1 = cursorColorForUid('alice-uid-123');
      const color2 = cursorColorForUid('alice-uid-123');
      const color3 = cursorColorForUid('alice-uid-123');

      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });

    it('can return different colors for different uids', () => {
      const uids = ['uid-a', 'uid-b', 'uid-c', 'uid-d', 'uid-e', 'uid-f'];
      const colors = uids.map(cursorColorForUid);

      // With 6 different UIDs over 10 possible colors, we should get at least 2 distinct colors
      const unique = new Set(colors);
      expect(unique.size).toBeGreaterThanOrEqual(2);
    });

    it('is deterministic across a batch of known uids', () => {
      const batch = ['test-1', 'test-2', 'test-3', 'test-4', 'test-5'];
      const run1 = batch.map(cursorColorForUid);
      const run2 = batch.map(cursorColorForUid);

      expect(run1).toEqual(run2);
    });
  });

  // ── 8. cursorColorForUid returns valid color ─────────────────────────
  describe('cursorColorForUid returns valid color', () => {
    const CURSOR_COLORS = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800',
    ];

    it('always returns a color from the palette', () => {
      const uids = [
        'user-1', 'user-2', 'user-3', 'another-user', 'z', '',
        'a-very-long-uid-that-keeps-going', '12345', 'UPPERCASE',
      ];
      for (const uid of uids) {
        const color = cursorColorForUid(uid);
        expect(CURSOR_COLORS).toContain(color);
      }
    });

    it('output starts with # and is valid hex', () => {
      const uids = ['abc', 'def', 'ghi', '123'];
      for (const uid of uids) {
        const color = cursorColorForUid(uid);
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });
});
