import { useParams } from 'react-router';
import { Stage, Layer } from 'react-konva';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useKeyboardShortcuts } from '../../shared/hooks/useKeyboardShortcuts.ts';
import { getModuleApi } from '../module-registry.ts';
import { BOARD_ACCESS_MODULE_ID } from '../../modules/board-access/index.ts';
import type { BoardAccessApi } from '../../modules/board-access/contracts.ts';
import { useAuth } from '../../modules/auth/ui/useAuth.ts';
import { useViewport } from '../../modules/viewport/ui/useViewport.ts';
import { BackgroundGrid } from '../../modules/viewport/ui/BackgroundGrid.tsx';
import { useObjects } from '../../modules/objects/ui/useObjects.ts';
import { StickyNoteShape } from '../../modules/objects/ui/StickyNoteShape.tsx';
import { RectangleShape } from '../../modules/objects/ui/RectangleShape.tsx';
import { CircleShape } from '../../modules/objects/ui/CircleShape.tsx';
import { LineShape } from '../../modules/objects/ui/LineShape.tsx';
import { TextShape } from '../../modules/objects/ui/TextShape.tsx';
import { ConnectorShape } from '../../modules/objects/ui/ConnectorShape.tsx';
import { FrameShape } from '../../modules/objects/ui/FrameShape.tsx';
import { TextEditor } from '../../modules/objects/ui/TextEditor.tsx';
import { Toolbar } from '../../modules/objects/ui/Toolbar.tsx';
import { SelectionBox } from '../../modules/objects/ui/SelectionBox.tsx';
import { getSelectionBoxBounds, isObjectInBounds, getBoundingBox } from '../../modules/objects/domain/geometry.ts';
import type { BoundingBox } from '../../modules/objects/domain/geometry.ts';
import { TransformHandles } from '../../modules/objects/ui/TransformHandles.tsx';
import { findObjectsInBounds } from '../../modules/objects/domain/frame-logic.ts';
import type { StickyNote, TextObject, FrameObject, ConnectorObject } from '../../modules/objects/contracts.ts';
import type { ViewportApi } from '../../modules/viewport/contracts.ts';
import { VIEWPORT_MODULE_ID } from '../../modules/viewport/index.ts';
import type { BoardSessionApi } from '../../modules/board-session/contracts.ts';
import { BOARD_SESSION_MODULE_ID } from '../../modules/board-session/index.ts';
import type { PresenceApi } from '../../modules/presence/contracts.ts';
import { PRESENCE_MODULE_ID } from '../../modules/presence/index.ts';
import { CursorLayer } from '../../modules/presence/ui/CursorLayer.tsx';
import { PresenceRoster } from '../../modules/presence/ui/PresenceRoster.tsx';
import { AiChatPanel } from '../../modules/ai-agent/ui/AiChatPanel.tsx';
import { subscribeToChatMessages, persistChatMessages } from '../../modules/ai-agent/infrastructure/chat-sync.ts';
import type { UIMessage } from 'ai';
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
    selectedIds,
    createSticky,
    createRectangle,
    createCircle,
    createLine,
    createText,
    moveObject,
    resizeObject,
    rotateObject,
    updateText,
    updateColor,
    deleteObject,
    duplicateObjects,
    copyToClipboard,
    pasteFromClipboard,
    selectObject,
    toggleSelect,
    selectAll,
    deselectAll,
    createConnector,
    createFrame,
    updateFrameChildren,
  } = useObjects();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const presenceRef = useRef<PresenceApi | null>(null);

  // AI chat: load persisted messages and subscribe to updates
  const [aiInitialMessages, setAiInitialMessages] = useState<UIMessage[] | undefined>(undefined);
  useEffect(() => {
    const unsub = subscribeToChatMessages(boardId, (msgs) => {
      // Only set initial messages on first load (before user starts chatting)
      setAiInitialMessages((prev) => prev === undefined ? msgs : prev);
    });
    return unsub;
  }, [boardId]);

  const handleAiNewMessages = useCallback((messages: UIMessage[]) => {
    persistChatMessages(boardId, messages).catch((err) => {
      console.error('[BoardPage] Failed to persist AI messages:', err);
    });
  }, [boardId]);

  // Connector creation mode: click source, then click target
  const [connectorMode, setConnectorMode] = useState(false);
  const [connectorSourceId, setConnectorSourceId] = useState<string | null>(null);

  // Rubber-band selection state
  const [rubberBand, setRubberBand] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isRubberBanding = useRef(false);

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

  useKeyboardShortcuts({
    onDelete: () => {
      for (const id of selectedIds) {
        deleteObject(id);
      }
      deselectAll();
    },
    onSelectAll: selectAll,
    onDuplicate: () => {
      if (selectedIds.length > 0) duplicateObjects(selectedIds);
    },
    onCopy: () => {
      if (selectedIds.length > 0) copyToClipboard(selectedIds);
    },
    onPaste: () => {
      const center = getViewportCenter();
      pasteFromClipboard(center.x, center.y);
    },
    onDeselect: () => {
      if (connectorMode) {
        setConnectorMode(false);
        setConnectorSourceId(null);
      }
      deselectAll();
    },
    isEditing: editingId !== null,
  });

  const selectedObjs = objects.filter((o) => selectedIds.includes(o.id));
  const firstSelected = selectedObjs[0] ?? null;
  const selectionBounds = getBoundingBox(selectedObjs);

  // Resize handler: applies new bounds to selected objects
  const handleObjectResize = useCallback((newBounds: BoundingBox) => {
    if (!selectionBounds || selectedObjs.length === 0) return;

    if (selectedObjs.length === 1) {
      const obj = selectedObjs[0];
      moveObject(obj.id, newBounds.x, newBounds.y);
      resizeObject(obj.id, newBounds.width, newBounds.height);
    } else {
      // Scale all objects proportionally
      const scaleX = selectionBounds.width > 0 ? newBounds.width / selectionBounds.width : 1;
      const scaleY = selectionBounds.height > 0 ? newBounds.height / selectionBounds.height : 1;
      for (const obj of selectedObjs) {
        const relX = obj.x - selectionBounds.x;
        const relY = obj.y - selectionBounds.y;
        moveObject(obj.id, newBounds.x + relX * scaleX, newBounds.y + relY * scaleY);
        resizeObject(obj.id, obj.width * scaleX, obj.height * scaleY);
      }
    }
  }, [selectedObjs, selectionBounds, moveObject, resizeObject]);

  // Rotation handler
  const handleObjectRotate = useCallback((rotation: number) => {
    for (const obj of selectedObjs) {
      rotateObject(obj.id, rotation);
    }
  }, [selectedObjs, rotateObject]);

  const editingObj = editingId !== null
    ? (objects.find((o) => o.id === editingId && (o.type === 'sticky' || o.type === 'text' || o.type === 'frame')) as StickyNote | TextObject | FrameObject | undefined)
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

  function handleCreateCircle() {
    const center = getViewportCenter();
    createCircle(center.x - 50, center.y - 50);
  }

  function handleCreateLine() {
    const center = getViewportCenter();
    createLine(center.x - 100, center.y, center.x + 100, center.y);
  }

  function handleCreateText() {
    const center = getViewportCenter();
    createText(center.x - 100, center.y - 20);
  }

  function handleToggleConnectorMode() {
    setConnectorMode((prev) => !prev);
    setConnectorSourceId(null);
    deselectAll();
  }

  function handleCreateFrame() {
    const center = getViewportCenter();
    createFrame(center.x - 200, center.y - 150);
  }

  function handleChangeColor(color: string) {
    for (const obj of selectedObjs) {
      updateColor(obj.id, color);
    }
  }

  function handleDuplicate() {
    if (selectedIds.length > 0) {
      duplicateObjects(selectedIds);
    }
  }

  function handleDelete() {
    for (const id of selectedIds) {
      deleteObject(id);
    }
    deselectAll();
  }

  function handleObjectSelect(objectId: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    // Connector creation mode: first click = source, second click = target
    if (connectorMode) {
      const clickedObj = objects.find((o) => o.id === objectId);
      if (!clickedObj || clickedObj.type === 'connector') return;

      if (!connectorSourceId) {
        setConnectorSourceId(objectId);
        selectObject(objectId);
      } else if (objectId !== connectorSourceId) {
        createConnector(connectorSourceId, objectId);
        setConnectorSourceId(null);
        setConnectorMode(false);
        deselectAll();
      }
      return;
    }

    const shiftKey = 'shiftKey' in e.evt ? e.evt.shiftKey : false;
    if (shiftKey) {
      toggleSelect(objectId);
    } else {
      selectObject(objectId);
    }
  }

  // Recompute children for all frames (called after any object or frame moves)
  function recomputeAllFrameChildren() {
    for (const obj of objects) {
      if (obj.type === 'frame') {
        const bounds = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
        const children = findObjectsInBounds(objects, bounds);
        updateFrameChildren(obj.id, children.map((c) => c.id));
      }
    }
  }

  // Recompute frame children after frame drag ends
  function handleFrameDragEnd(frameId: string, x: number, y: number) {
    moveObject(frameId, x, y);
    recomputeAllFrameChildren();
  }

  // Regular object drag end: move then recompute frame children
  function handleObjectDragEnd(objectId: string, x: number, y: number) {
    moveObject(objectId, x, y);
    recomputeAllFrameChildren();
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

      // Update rubber-band if active
      if (isRubberBanding.current) {
        setRubberBand((prev) => prev ? { ...prev, endX: world.x, endY: world.y } : null);
      }
    },
    [],
  );

  // Stage click: deselect or start rubber-band
  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target !== e.target.getStage()) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const vp = getModuleApi<ViewportApi>(VIEWPORT_MODULE_ID);
    const world = vp.screenToWorld({ x: pointer.x, y: pointer.y });

    // Start rubber-band on empty canvas
    isRubberBanding.current = true;
    setRubberBand({ startX: world.x, startY: world.y, endX: world.x, endY: world.y });
  }

  function handleStageMouseUp() {
    if (isRubberBanding.current && rubberBand) {
      const bounds = getSelectionBoxBounds(rubberBand.startX, rubberBand.startY, rubberBand.endX, rubberBand.endY);
      // Only select if the box is large enough (avoid accidental clicks)
      if (bounds.width > 5 || bounds.height > 5) {
        const ids = objects
          .filter((obj) => isObjectInBounds(obj, bounds))
          .map((obj) => obj.id);
        if (ids.length > 0) {
          const api = getModuleApi<import('../../modules/objects/contracts.ts').ObjectsApi>('objects');
          api.select(ids);
        } else {
          deselectAll();
        }
      } else {
        // Small drag = click on empty space = deselect
        deselectAll();
      }
    }
    isRubberBanding.current = false;
    setRubberBand(null);
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        {...stageProps}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onMouseMove={handleMouseMove}
      >
        <BackgroundGrid camera={camera} width={width} height={height} />
        <Layer>
          {/* Frames render first (behind everything) */}
          {objects.filter((o) => o.type === 'frame').map((obj) => {
            if (obj.type !== 'frame') return null;
            return (
              <FrameShape
                key={obj.id}
                obj={obj}
                isSelected={selectedIds.includes(obj.id)}
                onSelect={(e) => handleObjectSelect(obj.id, e)}
                onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                onDragEnd={(x, y) => handleFrameDragEnd(obj.id, x, y)}
                onDblClick={() => setEditingId(obj.id)}
              />
            );
          })}

          {/* Connectors render below regular objects */}
          {objects.filter((o) => o.type === 'connector').map((obj) => {
            if (obj.type !== 'connector') return null;
            const conn = obj as ConnectorObject;
            return (
              <ConnectorShape
                key={obj.id}
                obj={conn}
                source={objects.find((o) => o.id === conn.sourceId)}
                target={objects.find((o) => o.id === conn.targetId)}
                isSelected={selectedIds.includes(obj.id)}
                onSelect={(e) => handleObjectSelect(obj.id, e)}
              />
            );
          })}

          {/* Regular objects on top */}
          {objects.filter((o) => o.type !== 'frame' && o.type !== 'connector').map((obj) => {
            const isSelected = selectedIds.includes(obj.id);

            if (obj.type === 'sticky') {
              return (
                <StickyNoteShape
                  key={obj.id}
                  obj={obj}
                  isSelected={isSelected}
                  onSelect={(e) => handleObjectSelect(obj.id, e)}
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                  onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                  onDblClick={() => setEditingId(obj.id)}
                />
              );
            }

            if (obj.type === 'rectangle') {
              return (
                <RectangleShape
                  key={obj.id}
                  obj={obj}
                  isSelected={isSelected}
                  onSelect={(e) => handleObjectSelect(obj.id, e)}
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                  onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                />
              );
            }

            if (obj.type === 'circle') {
              return (
                <CircleShape
                  key={obj.id}
                  obj={obj}
                  isSelected={isSelected}
                  onSelect={(e) => handleObjectSelect(obj.id, e)}
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                  onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                />
              );
            }

            if (obj.type === 'line') {
              return (
                <LineShape
                  key={obj.id}
                  obj={obj}
                  isSelected={isSelected}
                  onSelect={(e) => handleObjectSelect(obj.id, e)}
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                  onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                />
              );
            }

            if (obj.type === 'text') {
              return (
                <TextShape
                  key={obj.id}
                  obj={obj}
                  isSelected={isSelected}
                  onSelect={(e) => handleObjectSelect(obj.id, e)}
                  onDragMove={(x, y) => handleDragMove(obj.id, x, y)}
                  onDragEnd={(x, y) => handleObjectDragEnd(obj.id, x, y)}
                  onDblClick={() => setEditingId(obj.id)}
                />
              );
            }

            return null;
          })}
          {rubberBand && (
            <SelectionBox
              startX={rubberBand.startX}
              startY={rubberBand.startY}
              endX={rubberBand.endX}
              endY={rubberBand.endY}
              visible={true}
            />
          )}
          {selectionBounds && selectedIds.length > 0 && (
            <TransformHandles
              bounds={selectionBounds}
              onResize={handleObjectResize}
              onResizeEnd={handleObjectResize}
              onRotate={handleObjectRotate}
              onRotateEnd={handleObjectRotate}
            />
          )}
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
        selectedType={firstSelected?.type ?? null}
        selectedColor={
          firstSelected
            ? firstSelected.type === 'sticky' ? firstSelected.color
              : firstSelected.type === 'line' ? firstSelected.stroke
              : firstSelected.type === 'connector' ? firstSelected.stroke
              : 'fill' in firstSelected ? firstSelected.fill
              : null
            : null
        }
        onCreateSticky={handleCreateSticky}
        onCreateRectangle={handleCreateRectangle}
        onCreateCircle={handleCreateCircle}
        onCreateLine={handleCreateLine}
        onCreateText={handleCreateText}
        onCreateConnector={handleToggleConnectorMode}
        onCreateFrame={handleCreateFrame}
        connectorMode={connectorMode}
        onChangeColor={handleChangeColor}
        onDelete={handleDelete}
        onDuplicate={selectedIds.length > 0 ? handleDuplicate : undefined}
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

      {connectorMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: '#E3F2FD',
            border: '1px solid #2196F3',
            borderRadius: 4,
            fontSize: 14,
            color: '#1565C0',
            zIndex: 10,
          }}
        >
          {connectorSourceId
            ? 'Click target object to complete connector'
            : 'Click source object to start connector'}
          <button
            onClick={() => { setConnectorMode(false); setConnectorSourceId(null); }}
            style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#D32F2F', fontSize: 14 }}
          >
            Cancel
          </button>
        </div>
      )}

      <AiChatPanel
        boardId={boardId}
        initialMessages={aiInitialMessages}
        onNewMessages={handleAiNewMessages}
      />
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
