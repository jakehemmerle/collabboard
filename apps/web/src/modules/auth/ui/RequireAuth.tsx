import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
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
  const location = useLocation();
  const isBoardRoute = location.pathname.startsWith('/board/');

  useEffect(() => {
    const api = getModuleApi<AuthApi>(AUTH_MODULE_ID);
    api.readiness().then(() => setReady(true));
  }, []);

  // Auto-sign-in anonymously for board routes
  useEffect(() => {
    if (!ready || isSignedIn || !isBoardRoute) return;
    const api = getModuleApi<AuthApi>(AUTH_MODULE_ID);
    api.signInAnon().catch((err) => {
      console.error('[RequireAuth] Anonymous sign-in failed:', err);
    });
  }, [ready, isSignedIn, isBoardRoute]);

  if (!ready) {
    return null;
  }

  if (!isSignedIn && !isBoardRoute) {
    return <SignInPage />;
  }

  // For board routes, show loading while anonymous sign-in is in progress
  if (!isSignedIn && isBoardRoute) {
    return null;
  }

  return <>{children}</>;
}
