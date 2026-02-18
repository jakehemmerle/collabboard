import { useParams } from 'react-router';
import { Stage, Layer } from 'react-konva';
import { useEffect, useState, useCallback, useRef } from 'react';
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
import type { BoardSessionApi } from '../../modules/board-session/contracts.ts';
import { BOARD_SESSION_MODULE_ID } from '../../modules/board-session/index.ts';
import type { PresenceApi } from '../../modules/presence/contracts.ts';
import { PRESENCE_MODULE_ID } from '../../modules/presence/index.ts';
import { CursorLayer } from '../../modules/presence/ui/CursorLayer.tsx';
import { PresenceRoster } from '../../modules/presence/ui/PresenceRoster.tsx';
import type Konva from 'konva';

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
          if (!board) {
            setBoardState({ status: 'not-found' });
            return;
          }
          // Auto-join: board exists but user isn't a member — link acts as invite
          await api.joinBoard(id!);
          if (cancelled) return;
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
  const { user } = useAuth();
  const { camera, stageProps, stageRef, resetView } = useViewport();
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
  const [sessionReady, setSessionReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const presenceRef = useRef<PresenceApi | null>(null);

  // Throttled drag-move: buffer latest position per objectId, flush every 100ms
  const dragBufferRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  useEffect(() => {
    const timer = setInterval(() => {
      const buf = dragBufferRef.current;
      if (buf.size === 0) return;
      for (const [objectId, pos] of buf) {
        moveObject(objectId, pos.x, pos.y);
      }
      buf.clear();
    }, 100);
    return () => clearInterval(timer);
  }, [moveObject]);

  const handleDragMove = useCallback((objectId: string, x: number, y: number) => {
    dragBufferRef.current.set(objectId, { x, y });
  }, []);

  // Board session lifecycle: enter on mount, leave on unmount
  useEffect(() => {
    let cancelled = false;

    async function enterSession() {
      try {
        const sessionApi = getModuleApi<BoardSessionApi>(BOARD_SESSION_MODULE_ID);
        await sessionApi.enter(boardId);
        if (cancelled) return;
        setSessionReady(true);
      } catch (err) {
        console.error('[BoardPage] Failed to enter board session:', err);
      }
    }

    enterSession();

    return () => {
      cancelled = true;
      const sessionApi = getModuleApi<BoardSessionApi>(BOARD_SESSION_MODULE_ID);
      sessionApi.leave().catch((err) => {
        console.error('[BoardPage] Failed to leave board session:', err);
      });
    };
  }, [boardId]);

  // Presence lifecycle: start after session is ready, stop on unmount
  useEffect(() => {
    if (!sessionReady || !user) return;

    let cancelled = false;
    const presenceApi = getModuleApi<PresenceApi>(PRESENCE_MODULE_ID);
    presenceRef.current = presenceApi;

    async function startPresence() {
      try {
        await presenceApi.start(boardId, {
          uid: user!.uid,
          displayName: user!.displayName ?? user!.email ?? 'Anonymous',
          photoURL: user!.photoURL ?? null,
        });
      } catch (err) {
        if (!cancelled) console.error('[BoardPage] Failed to start presence:', err);
      }
    }

    startPresence();

    return () => {
      cancelled = true;
      presenceRef.current = null;
      presenceApi.stop().catch((err) => {
        console.error('[BoardPage] Failed to stop presence:', err);
      });
    };
  }, [sessionReady, user, boardId]);

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

  const handleShare = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Publish cursor position on mouse move (world coordinates)
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const api = presenceRef.current;
      if (!api) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const vp = getModuleApi<ViewportApi>(VIEWPORT_MODULE_ID);
      const world = vp.screenToWorld({ x: pointer.x, y: pointer.y });
      api.publishCursor(world);
    },
    [],
  );

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        {...stageProps}
        onClick={(e) => { if (e.target === e.target.getStage()) deselectAll(); }}
        onMouseMove={handleMouseMove}
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
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
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
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                  onDragEnd={(x, y) => moveObject(obj.id, x, y)}
                />
              );
            }

            return null;
          })}
        </Layer>
        <CursorLayer />
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

      <PresenceRoster />

      <button
        onClick={handleShare}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '8px 16px',
          background: copied ? '#4CAF50' : '#fff',
          color: copied ? '#fff' : '#333',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
          zIndex: 10,
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {copied ? 'Link Copied!' : 'Share'}
      </button>

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
