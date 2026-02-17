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
    moveObject,
    updateText,
    updateColor,
    deleteObject,
    selectObject,
    deselectAll,
  };
}
