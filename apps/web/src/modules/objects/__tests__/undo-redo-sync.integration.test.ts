import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObjectsApi } from '../contracts.ts';
import type { ModuleContext } from '../../../core/module-system.ts';

const mocks = vi.hoisted(() => ({
  publish: vi.fn(async () => undefined),
  currentUser: vi.fn(() => ({ uid: 'test-user' })),
}));

vi.mock('../../../app/module-registry.ts', () => ({
  getModuleApi: (id: string) => {
    if (id === 'auth') {
      return { currentUser: mocks.currentUser };
    }
    if (id === 'sync') {
      return { publish: mocks.publish };
    }
    throw new Error(`Unexpected module id: ${id}`);
  },
}));

const { objectsModule } = await import('../index.ts');

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

describe('objects undo/redo sync regression', () => {
  let api: ObjectsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.currentUser.mockReturnValue({ uid: 'test-user' });
    api = await objectsModule.init(CTX);
  });

  afterEach(async () => {
    await objectsModule.dispose();
  });

  it('undo after move should publish reverted object state', () => {
    const created = api.applyLocal({ kind: 'create-sticky', x: 10, y: 20 });
    const objectId = created.objectId!;

    api.applyLocal({ kind: 'move', objectId, x: 200, y: 300 });
    const beforeUndoPublishCount = mocks.publish.mock.calls.length;

    api.undo();

    const reverted = api.getSnapshot().objects.find((o) => o.id === objectId);
    expect(reverted?.x).toBe(10);
    expect(reverted?.y).toBe(20);

    expect(mocks.publish.mock.calls.length).toBeGreaterThan(beforeUndoPublishCount);
    expect(mocks.publish).toHaveBeenLastCalledWith(
      objectId,
      expect.objectContaining({ id: objectId, x: 10, y: 20 }),
    );
  });

  it('redo after undo should publish restored object state', () => {
    const created = api.applyLocal({ kind: 'create-sticky', x: 10, y: 20 });
    const objectId = created.objectId!;

    api.applyLocal({ kind: 'move', objectId, x: 200, y: 300 });
    api.undo();
    const beforeRedoPublishCount = mocks.publish.mock.calls.length;

    api.redo();

    const redone = api.getSnapshot().objects.find((o) => o.id === objectId);
    expect(redone?.x).toBe(200);
    expect(redone?.y).toBe(300);

    expect(mocks.publish.mock.calls.length).toBeGreaterThan(beforeRedoPublishCount);
    expect(mocks.publish).toHaveBeenLastCalledWith(
      objectId,
      expect.objectContaining({ id: objectId, x: 200, y: 300 }),
    );
  });

  it('undo of create should publish a delete event', () => {
    const created = api.applyLocal({ kind: 'create-sticky', x: 50, y: 60 });
    const objectId = created.objectId!;
    const beforeUndoPublishCount = mocks.publish.mock.calls.length;

    api.undo();

    expect(api.getSnapshot().objects.find((o) => o.id === objectId)).toBeUndefined();
    expect(mocks.publish.mock.calls.length).toBeGreaterThan(beforeUndoPublishCount);
    expect(mocks.publish).toHaveBeenLastCalledWith(objectId, null);
  });
});
