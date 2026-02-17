import { useParams } from 'react-router';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { useEffect, useState } from 'react';
import { getModuleApi } from '../module-registry.ts';
import { BOARD_ACCESS_MODULE_ID } from '../../modules/board-access/index.ts';
import type { BoardAccessApi } from '../../modules/board-access/contracts.ts';
import { useAuth } from '../../modules/auth/ui/useAuth.ts';
import { useViewport } from '../../modules/viewport/ui/useViewport.ts';
import { BackgroundGrid } from '../../modules/viewport/ui/BackgroundGrid.tsx';

type BoardState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'not-found' }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [boardState, setBoardState] = useState<BoardState>({ status: 'loading' });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!id || !user) return;

    let cancelled = false;
    async function checkAccess() {
      try {
        const api = getModuleApi<BoardAccessApi>(BOARD_ACCESS_MODULE_ID);

        // canAccess reads the board doc and checks membership in one call
        const canRead = await api.canAccess(id!, 'board:read');
        if (cancelled) return;

        if (!canRead) {
          // Distinguish not-found from unauthorized
          const board = await api.getBoard(id!);
          if (cancelled) return;
          setBoardState(board ? { status: 'unauthorized' } : { status: 'not-found' });
          return;
        }

        setBoardState({ status: 'ready' });
      } catch (err) {
        if (cancelled) return;
        setBoardState({ status: 'error', message: String(err) });
      }
    }

    checkAccess();
    return () => { cancelled = true; };
  }, [id, user]);

  if (boardState.status === 'loading') {
    return <CenteredMessage>Loading board...</CenteredMessage>;
  }

  if (boardState.status === 'not-found') {
    return <CenteredMessage>Board not found</CenteredMessage>;
  }

  if (boardState.status === 'unauthorized') {
    return <CenteredMessage>You don&apos;t have access to this board</CenteredMessage>;
  }

  if (boardState.status === 'error') {
    return <CenteredMessage>Error: {boardState.message}</CenteredMessage>;
  }

  return <BoardCanvas boardId={id!} width={dimensions.width} height={dimensions.height} />;
}

function BoardCanvas({ boardId, width, height }: { boardId: string; width: number; height: number }) {
  const { camera, stageProps, resetView } = useViewport();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Stage width={width} height={height} {...stageProps}>
        <BackgroundGrid camera={camera} width={width} height={height} />
        <Layer>
          <Rect x={20} y={20} width={200} height={100} fill="#f0f0f0" stroke="#ccc" strokeWidth={1} cornerRadius={4} />
          <Text x={30} y={50} text={`Board: ${boardId}`} fontSize={16} fill="#333" />
        </Layer>
      </Stage>
      <button
        onClick={resetView}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          padding: '8px 16px',
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Reset View
      </button>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#666' }}>
      {children}
    </div>
  );
}
