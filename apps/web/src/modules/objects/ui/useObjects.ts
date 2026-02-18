import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getModuleApi } from '../../../app/module-registry.ts';
import { objectsEvents, OBJECTS_MODULE_ID } from '../index.ts';
import type { ObjectsApi, ObjectsState, StickyColor } from '../contracts.ts';

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

  const updateText = useCallback((objectId: string, text: string) => {
    return getApi().applyLocal({ kind: 'update-text', objectId, text });
  }, []);

  const updateColor = useCallback((objectId: string, color: string) => {
    return getApi().applyLocal({ kind: 'update-color', objectId, color });
  }, []);

  const deleteObject = useCallback((objectId: string) => {
    return getApi().applyLocal({ kind: 'delete', objectId });
  }, []);

  const selectObject = useCallback((objectId: string) => {
    getApi().select(objectId);
  }, []);

  const deselectAll = useCallback(() => {
    getApi().select(null);
  }, []);

  return {
    objects: state.objects,
    selectedId: state.selectedId,
    createSticky,
    createRectangle,
    createCircle,
    createLine,
    createText,
    moveObject,
    updateText,
    updateColor,
    deleteObject,
    selectObject,
    deselectAll,
  };
}
