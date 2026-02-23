import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SyncApi, SyncConnectionStatus, SyncEvent } from '../contracts.ts';
import type { FirestoreSyncHandle } from '../infrastructure/firestore-sync.ts';
import type { ModuleContext } from '../../../core/module-system.ts';

// --- Mock firestore-sync infrastructure ---

let mockHandle: FirestoreSyncHandle;
let capturedOnChange: ((events: SyncEvent[]) => void) | null;
let capturedOnError: ((err: Error) => void) | null;

const mockSubscribe = vi.fn<FirestoreSyncHandle['subscribe']>((_, onChange, onError) => {
  capturedOnChange = onChange;
  capturedOnError = onError;
});
const mockUnsubscribe = vi.fn();
const mockWrite = vi.fn<FirestoreSyncHandle['write']>().mockResolvedValue(undefined);
const mockFlushWrites = vi.fn<FirestoreSyncHandle['flushWrites']>().mockResolvedValue(undefined);

vi.mock('../infrastructure/firestore-sync.ts', () => ({
  createFirestoreSync: () => {
    mockHandle = {
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
      write: mockWrite,
      flushWrites: mockFlushWrites,
    };
    return mockHandle;
  },
}));

// Import after mock so the module picks up the mock
const { syncModule, syncEvents } = await import('../index.ts');

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

describe('sync module integration', () => {
  let api: SyncApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    capturedOnChange = null;
    capturedOnError = null;
    api = await syncModule.init(CTX);
  });

  afterEach(async () => {
    // Clean up any active connection
    await api.disconnect();
  });

  // --- 1. Connection lifecycle ---
  describe('connection lifecycle', () => {
    it('transitions idle → connecting → connected → disconnect → idle', async () => {
      expect(api.status()).toBe('idle');

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      expect(api.status()).toBe('connecting');
      expect(mockSubscribe).toHaveBeenCalledOnce();

      // Simulate Firestore subscriber callback firing → marks connected
      capturedOnChange!([{ type: 'added', objectId: 'obj-1', data: { x: 0 } }]);
      expect(api.status()).toBe('connected');

      await api.disconnect();
      expect(api.status()).toBe('idle');
      expect(mockFlushWrites).toHaveBeenCalledWith('board-1');
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  // --- 2. Status observer ---
  describe('status observer', () => {
    it('fires statusChanged event on every transition', async () => {
      const statuses: SyncConnectionStatus[] = [];
      const unsub = syncEvents.on('statusChanged', (s) => statuses.push(s));

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      // connecting
      capturedOnChange!([]);
      // connected

      await api.disconnect();
      // idle

      unsub();

      expect(statuses).toEqual(['connecting', 'connected', 'idle']);
    });

    it('observeStatus works identically to syncEvents.on', async () => {
      const statuses: SyncConnectionStatus[] = [];
      const unsub = api.observeStatus((s) => statuses.push(s));

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([]);
      await api.disconnect();

      unsub();

      expect(statuses).toEqual(['connecting', 'connected', 'idle']);
    });
  });

  // --- 3. Publish when connected ---
  describe('publish when connected', () => {
    it('calls firestore.write when connected', async () => {
      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([]);
      expect(api.status()).toBe('connected');

      await api.publish('obj-1', { x: 10, y: 20 });

      expect(mockWrite).toHaveBeenCalledWith('board-1', 'obj-1', { x: 10, y: 20 });
    });
  });

  // --- 4. Publish when disconnected ---
  describe('publish when disconnected', () => {
    it('is a no-op with console.warn before connect', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(api.status()).toBe('idle');
      await api.publish('obj-1', { x: 10 });

      expect(mockWrite).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[Sync] Cannot publish: not connected');

      warnSpy.mockRestore();
    });
  });

  // --- 5. Remote change events ---
  describe('remote change events', () => {
    it('emits remoteChange via syncEvents when subscriber fires', async () => {
      const received: SyncEvent[][] = [];
      const unsub = syncEvents.on('remoteChange', (events) => received.push(events));

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });

      const batch: SyncEvent[] = [
        { type: 'added', objectId: 'obj-1', data: { x: 0 } },
        { type: 'modified', objectId: 'obj-2', data: { x: 10 } },
      ];
      capturedOnChange!(batch);

      unsub();

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(batch);
    });

    it('onRemoteChange callback receives events', async () => {
      const received: SyncEvent[][] = [];
      const unsub = api.onRemoteChange((events) => received.push(events));

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([{ type: 'removed', objectId: 'obj-3', data: null }]);

      unsub();

      expect(received).toHaveLength(1);
      expect(received[0][0].type).toBe('removed');
    });
  });

  // --- 6. Reconnect on error with exponential backoff ---
  describe('reconnect on error', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('transitions to reconnecting and retries with exponential backoff', async () => {
      const statuses: SyncConnectionStatus[] = [];
      syncEvents.on('statusChanged', (s) => statuses.push(s));

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      // status: connecting
      capturedOnChange!([]);
      // status: connected

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // First error → reconnecting, delay = min(1000 * 2^1, 30000) = 2000ms
      capturedOnError!(new Error('snapshot error'));
      expect(api.status()).toBe('reconnecting');

      // Before the timer fires, subscribe should not be called again
      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      // Advance past the 2000ms backoff
      vi.advanceTimersByTime(2000);

      // subscribe should be called again for reconnect
      expect(mockSubscribe).toHaveBeenCalledTimes(2);

      // Simulate second error → delay = min(1000 * 2^2, 30000) = 4000ms
      capturedOnError!(new Error('snapshot error again'));
      expect(api.status()).toBe('reconnecting');

      vi.advanceTimersByTime(4000);
      expect(mockSubscribe).toHaveBeenCalledTimes(3);

      // Simulate successful reconnect
      capturedOnChange!([]);
      expect(api.status()).toBe('connected');

      errorSpy.mockRestore();
    });

    it('caps backoff delay at 30 seconds', async () => {
      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([]);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate many errors to push reconnectAttempts high
      for (let i = 0; i < 10; i++) {
        capturedOnError!(new Error('error'));
        // The delay should be capped at 30000ms regardless of attempts
        vi.advanceTimersByTime(30_000);
      }

      // After 10 reconnect cycles, subscribe should have been called 11 times total
      expect(mockSubscribe).toHaveBeenCalledTimes(11);

      errorSpy.mockRestore();
    });
  });

  // --- 7. Disconnect flushes writes before unsubscribing ---
  describe('disconnect flushes writes', () => {
    it('calls flushWrites before unsubscribe on disconnect', async () => {
      const callOrder: string[] = [];
      mockFlushWrites.mockImplementation(async () => {
        callOrder.push('flushWrites');
      });
      mockUnsubscribe.mockImplementation(() => {
        callOrder.push('unsubscribe');
      });

      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([]);

      await api.disconnect();

      expect(callOrder).toEqual(['flushWrites', 'unsubscribe']);
    });
  });

  // --- 8. Double connect is a no-op ---
  describe('double connect', () => {
    it('is a no-op when already connected to the same board', async () => {
      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([]);
      expect(api.status()).toBe('connected');
      expect(mockSubscribe).toHaveBeenCalledTimes(1);

      // Connect again to the same board while connected
      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });

      // Should not call subscribe again
      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(api.status()).toBe('connected');
    });

    it('allows connecting to a different board', async () => {
      await api.connect({ boardId: 'board-1', actorId: 'actor-1' });
      capturedOnChange!([]);
      expect(api.status()).toBe('connected');

      // Connect to a different board
      await api.connect({ boardId: 'board-2', actorId: 'actor-1' });

      // Should call subscribe again since it's a different board
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
      expect(api.status()).toBe('connecting');
    });
  });
});
