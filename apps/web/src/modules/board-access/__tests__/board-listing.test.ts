// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const {
  mockDoc,
  mockGetDoc,
  mockSetDoc,
  mockUpdateDoc,
  mockOnSnapshot,
  mockServerTimestamp,
  mockCollection,
  mockQuery,
  mockWhere,
  mockOrderBy,
  mockGetDocs,
  mockArrayUnion,
  mockDeleteDoc,
} = vi.hoisted(() => ({
  mockDoc: vi.fn((_db: unknown, _col: string, _id?: string) => ({
    path: `${_col}/${_id ?? 'auto'}`,
  })),
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockServerTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockGetDocs: vi.fn(),
  mockArrayUnion: vi.fn((...values: unknown[]) => ({
    _type: 'arrayUnion',
    values,
  })),
  mockDeleteDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp,
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  getDocs: mockGetDocs,
  arrayUnion: mockArrayUnion,
}));

vi.mock('../../../core/firebase.ts', () => ({
  getFirebaseDb: vi.fn(() => ({ _db: true })),
}));

const { mockGetModuleApi } = vi.hoisted(() => ({
  mockGetModuleApi: vi.fn(),
}));
vi.mock('../../../app/module-registry.ts', () => ({
  getModuleApi: mockGetModuleApi,
}));

vi.mock('../../../core/ids.ts', () => ({
  generateId: vi.fn(() => 'test-board-id'),
}));

// --- Helpers ---

import { boardAccessModule } from '../index.ts';
import type { BoardAccessApi } from '../contracts.ts';

const TEST_UID = 'user-1';
const OTHER_UID = 'user-2';

function makeMockAuth(uid: string | null = TEST_UID) {
  return {
    currentUser: () => (uid ? { uid, displayName: 'Test', email: 'test@test.com' } : null),
    observeAuth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
}

function makeMockPermissions() {
  return {
    can: vi.fn(() => true),
    listCapabilities: vi.fn(() => []),
  };
}

function makeBoardDoc(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  const members = (overrides.members as Record<string, unknown>) ?? {
    [TEST_UID]: { role: 'owner', joinedAt: 1000 },
  };
  const memberUids = (overrides.memberUids as string[]) ??
    Object.keys(members);

  return {
    id,
    exists: () => true,
    data: () => ({
      title: `Board ${id}`,
      ownerId: TEST_UID,
      createdAt: { toMillis: () => overrides.createdAt ?? 1000 },
      members,
      memberUids,
      ...overrides,
    }),
  };
}

async function initApi(): Promise<BoardAccessApi> {
  mockGetModuleApi.mockImplementation((moduleId: string) => {
    if (moduleId === 'auth') return makeMockAuth();
    if (moduleId === 'permissions') return makeMockPermissions();
    throw new Error(`Unknown module: ${moduleId}`);
  });
  return boardAccessModule.init({} as never);
}

// --- Tests ---

describe('board-access listing', () => {
  let api: BoardAccessApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    api = await initApi();
  });

  // ---------- listBoards ----------

  describe('listBoards', () => {
    it('returns empty array when user has no boards', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await api.listBoards();

      expect(result).toEqual([]);
      expect(mockWhere).toHaveBeenCalledWith(
        'memberUids',
        'array-contains',
        TEST_UID,
      );
    });

    it('returns boards where user is a member', async () => {
      const boardA = makeBoardDoc('board-a');
      const boardB = makeBoardDoc('board-b', {
        members: {
          [TEST_UID]: { role: 'collaborator', joinedAt: 2000 },
          [OTHER_UID]: { role: 'owner', joinedAt: 1000 },
        },
        memberUids: [TEST_UID, OTHER_UID],
      });
      mockGetDocs.mockResolvedValue({ docs: [boardA, boardB] });

      const result = await api.listBoards();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('board-a');
      expect(result[1].id).toBe('board-b');
    });

    it('includes correct role for each board', async () => {
      const ownedBoard = makeBoardDoc('owned', {
        members: { [TEST_UID]: { role: 'owner', joinedAt: 1000 } },
      });
      const collabBoard = makeBoardDoc('collab', {
        members: { [TEST_UID]: { role: 'collaborator', joinedAt: 2000 } },
      });
      mockGetDocs.mockResolvedValue({ docs: [ownedBoard, collabBoard] });

      const result = await api.listBoards();

      expect(result[0].role).toBe('owner');
      expect(result[1].role).toBe('collaborator');
    });

    it('sorts by createdAt descending', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await api.listBoards();

      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('includes correct memberCount for each board', async () => {
      const soloBoard = makeBoardDoc('solo', {
        members: { [TEST_UID]: { role: 'owner', joinedAt: 1000 } },
        memberUids: [TEST_UID],
      });
      const teamBoard = makeBoardDoc('team', {
        members: {
          [TEST_UID]: { role: 'owner', joinedAt: 1000 },
          [OTHER_UID]: { role: 'collaborator', joinedAt: 2000 },
          'user-3': { role: 'collaborator', joinedAt: 3000 },
        },
        memberUids: [TEST_UID, OTHER_UID, 'user-3'],
      });
      mockGetDocs.mockResolvedValue({ docs: [soloBoard, teamBoard] });

      const result = await api.listBoards();

      expect(result[0].memberCount).toBe(1);
      expect(result[1].memberCount).toBe(3);
    });
  });

  // ---------- createBoard with memberUids ----------

  describe('createBoard memberUids', () => {
    it('includes memberUids array in the Firestore document', async () => {
      await api.createBoard({ title: 'Test' });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          memberUids: [TEST_UID],
        }),
      );
    });
  });

  // ---------- joinBoard with memberUids ----------

  describe('joinBoard memberUids', () => {
    it('adds uid to memberUids array', async () => {
      await api.joinBoard('board-1');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          memberUids: mockArrayUnion(TEST_UID),
        }),
      );
    });
  });

  // ---------- grantMembership with memberUids ----------

  describe('grantMembership memberUids', () => {
    it('adds userId to memberUids array', async () => {
      // Mock getCallerRole to succeed (user is owner)
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          members: { [TEST_UID]: { role: 'owner', joinedAt: 1000 } },
        }),
      });

      await api.grantMembership('board-1', OTHER_UID, 'collaborator');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          memberUids: mockArrayUnion(OTHER_UID),
        }),
        expect.objectContaining({ merge: true }),
      );
    });
  });

  // ---------- observeBoards ----------

  describe('observeBoards', () => {
    it('calls callback with board list on snapshot', () => {
      const boardDoc = makeBoardDoc('board-x', {
        createdAt: 5000,
      });

      // When onSnapshot is called, capture the callback and invoke it
      mockOnSnapshot.mockImplementation((_query: unknown, cb: (snap: unknown) => void) => {
        cb({ docs: [boardDoc] });
        return vi.fn(); // unsubscribe
      });

      const callback = vi.fn();
      api.observeBoards(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      const boards = callback.mock.calls[0][0];
      expect(boards).toHaveLength(1);
      expect(boards[0].id).toBe('board-x');
      expect(boards[0].title).toBe('Board board-x');
      expect(boards[0].memberCount).toBe(1);
      expect(boards[0].role).toBe('owner');
    });

    it('returns unsubscribe function', () => {
      const mockUnsub = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsub);

      const unsub = api.observeBoards(vi.fn());

      expect(typeof unsub).toBe('function');
      unsub();
      expect(mockUnsub).toHaveBeenCalled();
    });
  });

  // ---------- deleteBoard ----------

  describe('deleteBoard', () => {
    it('calls deleteDoc with the correct board path', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          members: { [TEST_UID]: { role: 'owner', joinedAt: 1000 } },
        }),
      });
      mockDeleteDoc.mockResolvedValue(undefined);

      await api.deleteBoard('board-42');

      expect(mockDoc).toHaveBeenCalledWith({ _db: true }, 'boards', 'board-42');
      expect(mockDeleteDoc).toHaveBeenCalledWith({ path: 'boards/board-42' });
    });

    it('throws when user is not a member', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ members: {} }),
      });

      await expect(api.deleteBoard('board-42')).rejects.toThrow('Not a member');
    });

    it('throws when user lacks board:delete permission', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          members: { [TEST_UID]: { role: 'collaborator', joinedAt: 1000 } },
        }),
      });
      // Override permissions mock to deny board:delete
      mockGetModuleApi.mockImplementation((moduleId: string) => {
        if (moduleId === 'auth') return makeMockAuth();
        if (moduleId === 'permissions')
          return {
            can: vi.fn((cap: string) => cap !== 'board:delete'),
            listCapabilities: vi.fn(() => []),
          };
        throw new Error(`Unknown module: ${moduleId}`);
      });
      // Re-init with updated permissions
      api = await boardAccessModule.init({} as never);

      await expect(api.deleteBoard('board-42')).rejects.toThrow('Not authorized');
    });
  });
});
