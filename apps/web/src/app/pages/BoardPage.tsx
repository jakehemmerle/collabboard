import { useParams } from 'react-router';
import { Stage, Layer } from 'react-konva';
import { useEffect, useState, useCallback } from 'react';
import { getModuleApi } from '../module-registry.ts';
import { BOARD_ACCESS_MODULE_ID } from '../../modules/board-access/index.ts';
import type { BoardAccessApi } from '../../modules/board-access/contracts.ts';
import { useAuth } from '../../modules/auth/ui/useAuth.ts';
import { useViewport } from '../../modules/viewport/ui/useViewport.ts';
import { BackgroundGrid } from '../../modules/viewport/ui/BackgroundGrid.tsx';
import { useObjects } from '../../modules/objects/ui/useObjects.ts';
import { StickyNoteShape } from '../../modules/objects/ui/StickyNoteShape.tsx';
import { RectangleShape } from '../../modules/objects/ui/RectangleShape.tsx';
import { TextEditor } from '../../modules/objects/ui/TextEditor.tsx';
import { Toolbar } from '../../modules/objects/ui/Toolbar.tsx';
import type { StickyNote } from '../../modules/objects/contracts.ts';
import type { ViewportApi } from '../../modules/viewport/contracts.ts';
import { VIEWPORT_MODULE_ID } from '../../modules/viewport/index.ts';

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

        const canRead = await api.canAccess(id!, 'board:read');
        if (cancelled) return;

        if (!canRead) {
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

  return <BoardCanvas width={dimensions.width} height={dimensions.height} />;
}

function BoardCanvas({ width, height }: { width: number; height: number }) {
  const { camera, stageProps, resetView } = useViewport();
  const {
    objects,
    selectedId,
    createSticky,
    createRectangle,
    moveObject,
    updateText,
    updateColor,
    deleteObject,
    selectObject,
    deselectAll,
  } = useObjects();

  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedObj = selectedId !== null
    ? objects.find((o) => o.id === selectedId) ?? null
    : null;

  const editingObj = editingId !== null
    ? (objects.find((o) => o.id === editingId && o.type === 'sticky') as StickyNote | undefined)
    : undefined;

  function getViewportCenter() {
    const vp = getModuleApi<ViewportApi>(VIEWPORT_MODULE_ID);
    return vp.screenToWorld({ x: width / 2, y: height / 2 });
  }

  function handleCreateSticky() {
    const center = getViewportCenter();
    createSticky(center.x - 100, center.y - 75);
  }

  function handleCreateRectangle() {
    const center = getViewportCenter();
    createRectangle(center.x - 100, center.y - 75);
  }

  function handleChangeColor(color: string) {
    if (selectedObj) updateColor(selectedObj.id, color);
  }

  function handleDelete() {
    if (selectedObj) deleteObject(selectedObj.id);
  }

  const handleTextSave = useCallback(
    (text: string) => {
      if (editingId) updateText(editingId, text);
      setEditingId(null);
    },
    [editingId, updateText],
  );

  const handleTextCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Stage
        width={width}
        height={height}
        {...stageProps}
        onClick={(e) => { if (e.target === e.target.getStage()) deselectAll(); }}
      >
        <BackgroundGrid camera={camera} width={width} height={height} />
        <Layer>
          {objects.map((obj) => {
            if (obj.type === 'sticky') {
              return (
                <StickyNoteShape
                  key={obj.id}
                  obj={obj}
                  isSelected={obj.id === selectedId}
                  onSelect={() => selectObject(obj.id)}
                  onDragEnd={(x, y) => moveObject(obj.id, x, y)}
                  onDblClick={() => setEditingId(obj.id)}
                />
              );
            }

            if (obj.type === 'rectangle') {
              return (
                <RectangleShape
                  key={obj.id}
                  obj={obj}
                  isSelected={obj.id === selectedId}
                  onSelect={() => selectObject(obj.id)}
                  onDragEnd={(x, y) => moveObject(obj.id, x, y)}
                />
              );
            }

            return null;
          })}
        </Layer>
      </Stage>

      {editingObj && (
        <TextEditor
          obj={editingObj}
          camera={camera}
          onSave={handleTextSave}
          onCancel={handleTextCancel}
        />
      )}

      <Toolbar
        selectedType={selectedObj?.type ?? null}
        selectedColor={
          selectedObj
            ? selectedObj.type === 'sticky' ? selectedObj.color : selectedObj.fill
            : null
        }
        onCreateSticky={handleCreateSticky}
        onCreateRectangle={handleCreateRectangle}
        onChangeColor={handleChangeColor}
        onDelete={handleDelete}
      />

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
