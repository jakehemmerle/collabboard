/**
 * Feature 1 — clearChatMessages TDD tests
 *
 * These tests verify that clearChatMessages(boardId) queries all documents
 * in the boards/{boardId}/ai-messages Firestore subcollection and
 * batch-deletes them.
 *
 * EXPECTED TO FAIL until clearChatMessages is implemented in chat-sync.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../../../core/firebase.ts', () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

import { clearChatMessages } from '../infrastructure/chat-sync.ts';
import { getDocs, writeBatch, collection } from 'firebase/firestore';

describe('clearChatMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is exported as a function', () => {
    expect(typeof clearChatMessages).toBe('function');
  });

  it('queries the ai-messages subcollection for the given boardId', async () => {
    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: [] });
    (writeBatch as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);
    (collection as ReturnType<typeof vi.fn>).mockReturnValue('collection-ref');

    await clearChatMessages('board-123');

    expect(collection).toHaveBeenCalledWith(
      expect.anything(),
      'boards/board-123/ai-messages',
    );
  });

  it('batch-deletes all docs in the subcollection', async () => {
    const mockDocRefs = [
      { ref: { id: 'msg-1' } },
      { ref: { id: 'msg-2' } },
      { ref: { id: 'msg-3' } },
    ];
    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: mockDocRefs });
    (writeBatch as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);
    (collection as ReturnType<typeof vi.fn>).mockReturnValue('collection-ref');

    await clearChatMessages('board-123');

    expect(mockBatch.delete).toHaveBeenCalledTimes(3);
    expect(mockBatch.delete).toHaveBeenCalledWith(mockDocRefs[0].ref);
    expect(mockBatch.delete).toHaveBeenCalledWith(mockDocRefs[1].ref);
    expect(mockBatch.delete).toHaveBeenCalledWith(mockDocRefs[2].ref);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('handles empty collection gracefully', async () => {
    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (getDocs as ReturnType<typeof vi.fn>).mockResolvedValue({ docs: [] });
    (writeBatch as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

    await clearChatMessages('board-empty');

    expect(mockBatch.delete).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
  });
});
