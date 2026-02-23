import { useNavigate } from 'react-router';
import { useCallback, useState } from 'react';
import { getModuleApi } from '../module-registry.ts';
import { BOARD_ACCESS_MODULE_ID } from '../../modules/board-access/index.ts';
import type { BoardAccessApi } from '../../modules/board-access/contracts.ts';
import { useAuth } from '../../modules/auth/ui/useAuth.ts';
import { v } from '../../shared/theme/theme-utils.ts';
import { ThemeToggle } from '../../shared/ui/ThemeToggle.tsx';

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [creating, setCreating] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  const displayName = user?.displayName ?? user?.email ?? 'User';

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
          maxWidth: 600,
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
      </main>
    </div>
  );
}
