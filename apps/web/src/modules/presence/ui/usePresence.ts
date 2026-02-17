import { useCallback, useRef, useSyncExternalStore } from 'react';
import { presenceEvents } from '../index.ts';
import type { PresenceUser } from '../contracts.ts';

const EMPTY: PresenceUser[] = [];

export function usePresence(): PresenceUser[] {
  const usersRef = useRef<PresenceUser[]>(EMPTY);

  const subscribe = useCallback((onStoreChange: () => void) => {
    return presenceEvents.on('onlineUsersChanged', (users) => {
      usersRef.current = users;
      onStoreChange();
    });
  }, []);

  const getSnapshot = useCallback(() => usersRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
