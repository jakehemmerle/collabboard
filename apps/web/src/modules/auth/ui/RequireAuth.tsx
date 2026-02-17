import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getModuleApi } from '../../../app/module-registry.ts';
import { AUTH_MODULE_ID } from '../index.ts';
import type { AuthApi } from '../contracts.ts';
import { useAuth } from './useAuth.ts';
import { SignInPage } from './SignInPage.tsx';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const [ready, setReady] = useState(false);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const api = getModuleApi<AuthApi>(AUTH_MODULE_ID);
    api.readiness().then(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  if (!isSignedIn) {
    return <SignInPage />;
  }

  return <>{children}</>;
}
