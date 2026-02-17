import { useCallback, useRef, useSyncExternalStore } from 'react';
import { presenceEvents } from '../index.ts';
import type { CursorState } from '../contracts.ts';

const EMPTY: CursorState[] = [];

export function useCursors(): CursorState[] {
  const cursorsRef = useRef<CursorState[]>(EMPTY);

  const subscribe = useCallback((onStoreChange: () => void) => {
    return presenceEvents.on('cursorsChanged', (cursors) => {
      cursorsRef.current = cursors;
      onStoreChange();
    });
  }, []);

  const getSnapshot = useCallback(() => cursorsRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
