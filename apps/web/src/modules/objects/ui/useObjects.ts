import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getModuleApi } from '../../../app/module-registry.ts';
import { objectsEvents, OBJECTS_MODULE_ID } from '../index.ts';
import type { ObjectsApi, ObjectsState, StickyColor, ConnectorStyle } from '../contracts.ts';

function getApi(): ObjectsApi {
  return getModuleApi<ObjectsApi>(OBJECTS_MODULE_ID);
}

export function useObjects() {
  const stateRef = useRef<ObjectsState>(getApi().getSnapshot());

  const subscribe = useCallback((onStoreChange: () => void) => {
    return objectsEvents.on('objectsChanged', (state) => {
      stateRef.current = state;
      onStoreChange();
    });
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  const createSticky = useCallback((x: number, y: number, color?: StickyColor) => {
    return getApi().applyLocal({ kind: 'create-sticky', x, y, color });
  }, []);

  const createRectangle = useCallback((x: number, y: number, fill?: string) => {
    return getApi().applyLocal({ kind: 'create-rectangle', x, y, fill });
  }, []);

  const createCircle = useCallback((x: number, y: number, fill?: string) => {
    return getApi().applyLocal({ kind: 'create-circle', x, y, fill });
  }, []);

  const createLine = useCallback((x: number, y: number, x2?: number, y2?: number, stroke?: string) => {
    return getApi().applyLocal({ kind: 'create-line', x, y, x2, y2, stroke });
  }, []);

  const createText = useCallback((x: number, y: number, text?: string, fontSize?: number) => {
    return getApi().applyLocal({ kind: 'create-text', x, y, text, fontSize });
  }, []);

  const moveObject = useCallback((objectId: string, x: number, y: number) => {
    return getApi().applyLocal({ kind: 'move', objectId, x, y });
  }, []);

  const resizeObject = useCallback((objectId: string, width: number, height: number) => {
    return getApi().applyLocal({ kind: 'resize', objectId, width, height });
  }, []);

  const rotateObject = useCallback((objectId: string, rotation: number) => {
    return getApi().applyLocal({ kind: 'rotate', objectId, rotation });
  }, []);

  const updateText = useCallback((objectId: string, text: string) => {
    return getApi().applyLocal({ kind: 'update-text', objectId, text });
  }, []);

  const updateColor = useCallback((objectId: string, color: string) => {
    return getApi().applyLocal({ kind: 'update-color', objectId, color });
  }, []);

  const deleteObject = useCallback((objectId: string) => {
    return getApi().applyLocal({ kind: 'delete', objectId });
  }, []);

  const duplicateObjects = useCallback((objectIds: string[]) => {
    return getApi().applyLocal({ kind: 'duplicate', objectIds });
  }, []);

  const createConnector = useCallback((sourceId: string, targetId: string, style?: ConnectorStyle, stroke?: string) => {
    return getApi().applyLocal({ kind: 'create-connector', sourceId, targetId, style, stroke });
  }, []);

  const createFrame = useCallback((x: number, y: number, title?: string, fill?: string) => {
    return getApi().applyLocal({ kind: 'create-frame', x, y, title, fill });
  }, []);

  const updateFrameChildren = useCallback((objectId: string, children: string[]) => {
    return getApi().applyLocal({ kind: 'update-frame-children', objectId, children });
  }, []);

  const copyToClipboard = useCallback((objectIds: string[]) => {
    getApi().copyToClipboard(objectIds);
  }, []);

  const pasteFromClipboard = useCallback((centerX: number, centerY: number) => {
    return getApi().pasteFromClipboard(centerX, centerY);
  }, []);

  const selectObject = useCallback((objectId: string) => {
    getApi().select([objectId]);
  }, []);

  const toggleSelect = useCallback((objectId: string) => {
    getApi().toggleSelect(objectId);
  }, []);

  const selectAll = useCallback(() => {
    getApi().selectAll();
  }, []);

  const deselectAll = useCallback(() => {
    getApi().deselectAll();
  }, []);

  return {
    objects: state.objects,
    selectedIds: state.selectedIds,
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
  };
}
