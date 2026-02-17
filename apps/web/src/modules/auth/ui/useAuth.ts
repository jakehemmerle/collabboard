import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getModuleApi } from '../../../app/module-registry.ts';
import { AUTH_MODULE_ID } from '../index.ts';
import type { AuthApi, AuthSession } from '../contracts.ts';

function getApi(): AuthApi {
  return getModuleApi<AuthApi>(AUTH_MODULE_ID);
}

export function useAuth() {
  const sessionRef = useRef<AuthSession | null>(null);

  const subscribe = useCallback((onStoreChange: () => void) => {
    // observeSession delivers the current value synchronously on subscribe,
    // so sessionRef gets seeded before useSyncExternalStore's first getSnapshot
    return getApi().observeSession((session) => {
      sessionRef.current = session;
      onStoreChange();
    });
  }, []);

  const getSnapshot = useCallback(() => sessionRef.current, []);

  const session = useSyncExternalStore(subscribe, getSnapshot);

  const signIn = useCallback(async () => {
    await getApi().signIn('google');
  }, []);

  const signOut = useCallback(async () => {
    await getApi().signOut();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isSignedIn: session !== null,
    signIn,
    signOut,
  };
}
