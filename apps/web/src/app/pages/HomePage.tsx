import { useNavigate } from 'react-router';
import { useCallback, useEffect, useState } from 'react';
import { getModuleApi } from '../module-registry.ts';
import { BOARD_ACCESS_MODULE_ID } from '../../modules/board-access/index.ts';
import type { BoardAccessApi, BoardListEntry } from '../../modules/board-access/contracts.ts';
import { useAuth } from '../../modules/auth/ui/useAuth.ts';
import { v } from '../../shared/theme/theme-utils.ts';
import { ThemeToggle } from '../../shared/ui/ThemeToggle.tsx';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [creating, setCreating] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const [boards, setBoards] = useState<BoardListEntry[] | null>(null);
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null);

  const displayName = user?.displayName ?? user?.email ?? 'User';

  useEffect(() => {
    const api = getModuleApi<BoardAccessApi>(BOARD_ACCESS_MODULE_ID);
    const unsub = api.observeBoards((list) => {
      setBoards(list);
    });
    return unsub;
  }, []);

  const handleDeleteBoard = useCallback(
    async (e: React.MouseEvent, boardId: string) => {
      e.stopPropagation();
      const api = getModuleApi<BoardAccessApi>(BOARD_ACCESS_MODULE_ID);
      await api.deleteBoard(boardId);
    },
    [],
  );

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
    <div style={{ minHeight: '100vh', background: v('--cb-bg-page') }}>
      {/* Nav bar */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          background: v('--cb-bg-surface'),
          borderBottom: `1px solid ${v('--cb-border-subtle')}`,
          boxShadow: v('--cb-shadow-sm'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: v('--cb-text-primary'),
            letterSpacing: '-0.01em',
          }}
        >
          CollabBoard
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: v('--cb-text-secondary') }}>
            {displayName}
          </span>
          <button
            onClick={signOut}
            style={{
              background: 'none',
              border: 'none',
              color: v('--cb-text-secondary'),
              fontSize: 14,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Sign Out
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main content */}
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          paddingTop: 120,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: v('--cb-text-primary'),
            margin: '0 0 32px 0',
          }}
        >
          Welcome back, {displayName}
        </h1>

        {/* Create Board card */}
        <button
          onClick={handleCreateBoard}
          disabled={creating}
          onMouseEnter={() => setCardHovered(true)}
          onMouseLeave={() => setCardHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            width: '100%',
            padding: 24,
            background: v('--cb-bg-surface'),
            border: `1px solid ${v('--cb-border-default')}`,
            borderLeft: `4px solid ${v('--cb-primary')}`,
            borderRadius: 12,
            cursor: creating ? 'default' : 'pointer',
            boxShadow: cardHovered && !creating ? v('--cb-shadow-md') : v('--cb-shadow-sm'),
            transition: 'box-shadow 0.2s',
            textAlign: 'left',
          }}
        >
          {/* Plus icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: v('--cb-primary-light'),
              color: v('--cb-primary'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 300,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            +
          </div>

          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: v('--cb-text-primary'),
                marginBottom: 4,
              }}
            >
              {creating ? 'Creating...' : 'Create New Board'}
            </div>
            <div
              style={{
                fontSize: 14,
                color: v('--cb-text-secondary'),
              }}
            >
              Start a fresh collaborative whiteboard
            </div>
          </div>
        </button>

        {/* Your Boards section */}
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: v('--cb-text-primary'),
            margin: '40px 0 16px 0',
          }}
        >
          Your Boards
        </h2>

        {boards === null ? (
          <div
            role="status"
            style={{
              padding: 32,
              textAlign: 'center',
              color: v('--cb-text-secondary'),
              fontSize: 14,
            }}
          >
            Loading boards...
          </div>
        ) : boards.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: v('--cb-text-secondary'),
              fontSize: 14,
            }}
          >
            No boards yet. Create one to get started!
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {boards.map((board) => (
              <button
                key={board.id}
                data-testid="board-card"
                onClick={() => navigate(`/board/${board.id}`)}
                onMouseEnter={() => setHoveredBoardId(board.id)}
                onMouseLeave={() => setHoveredBoardId(null)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 20,
                  background: v('--cb-bg-surface'),
                  border: `1px solid ${v('--cb-border-default')}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  boxShadow: hoveredBoardId === board.id ? v('--cb-shadow-md') : v('--cb-shadow-sm'),
                  transition: 'box-shadow 0.2s',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {/* Delete button */}
                <span
                  role="button"
                  aria-label={`Delete ${board.title}`}
                  tabIndex={0}
                  onClick={(e) => handleDeleteBoard(e, board.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDeleteBoard(e as unknown as React.MouseEvent, board.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    fontSize: 14,
                    lineHeight: 1,
                    color: v('--cb-text-tertiary'),
                    cursor: 'pointer',
                    opacity: hoveredBoardId === board.id ? 1 : 0,
                    transition: 'opacity 0.15s, color 0.15s, background 0.15s',
                  }}
                >
                  ✕
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingRight: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: v('--cb-text-primary'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {board.title}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: board.role === 'owner' ? v('--cb-primary-light') : v('--cb-bg-surface-raised'),
                      color: board.role === 'owner' ? v('--cb-primary') : v('--cb-text-secondary'),
                      flexShrink: 0,
                    }}
                  >
                    {board.role === 'owner' ? 'Owner' : 'Collaborator'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: v('--cb-text-secondary'),
                  }}
                >
                  <span>{formatDate(board.createdAt)}</span>
                  <span>{board.memberCount} {board.memberCount === 1 ? 'member' : 'members'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
