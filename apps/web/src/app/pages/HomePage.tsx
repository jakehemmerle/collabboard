import { useNavigate } from 'react-router';
import { useCallback, useState } from 'react';
import { getModuleApi } from '../module-registry.ts';
import { BOARD_ACCESS_MODULE_ID } from '../../modules/board-access/index.ts';
import type { BoardAccessApi } from '../../modules/board-access/contracts.ts';
import { useAuth } from '../../modules/auth/ui/useAuth.ts';

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [creating, setCreating] = useState(false);

  const handleCreateBoard = useCallback(async () => {
    setCreating(true);
    try {
      const api = getModuleApi<BoardAccessApi>(BOARD_ACCESS_MODULE_ID);
      const { boardId } = await api.createBoard({});
      navigate(`/board/${boardId}`);
    } finally {
      setCreating(false);
    }
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1>CollabBoard</h1>
      <p>Signed in as {user?.displayName ?? user?.email ?? 'User'}</p>
      <button
        onClick={handleCreateBoard}
        disabled={creating}
        style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer' }}
      >
        {creating ? 'Creating...' : 'Create New Board'}
      </button>
      <button
        onClick={signOut}
        style={{ padding: '8px 16px', fontSize: 14, cursor: 'pointer', background: 'none', border: '1px solid #ccc', borderRadius: 4 }}
      >
        Sign Out
      </button>
    </div>
  );
}
