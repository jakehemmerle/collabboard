import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { Unsubscribe } from 'firebase/auth';
import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import { EventBus } from '../../core/events.ts';
import { getFirebaseAuth } from '../../core/firebase.ts';
import type { AuthApi, AuthSession } from './contracts.ts';
import { toAuthSession } from './domain/session.ts';

export const AUTH_MODULE_ID = 'auth';

export const authEvents = new EventBus<{
  sessionChanged: AuthSession | null;
}>();

let unsubAuth: Unsubscribe | null = null;

export const authModule: AppModule<AuthApi> = {
  id: AUTH_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<AuthApi> {
    unsubAuth?.(); // clean up any previous listener (HMR)
    const auth = getFirebaseAuth();
    let currentSession: AuthSession | null = null;
    let readyResolve: () => void;
    const readyPromise = new Promise<void>((resolve) => {
      readyResolve = resolve;
    });
    let isReady = false;

    unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      currentSession = firebaseUser ? toAuthSession(firebaseUser) : null;
      authEvents.emit('sessionChanged', currentSession);
      if (!isReady) {
        isReady = true;
        readyResolve();
      }
    });

    return {
      readiness() {
        return readyPromise;
      },

      observeSession(cb) {
        const unsub = authEvents.on('sessionChanged', cb);
        cb(currentSession);
        return unsub;
      },

      async signIn(_provider) {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        return toAuthSession(result.user);
      },

      async signOut() {
        await firebaseSignOut(auth);
      },

      async getIdToken(forceRefresh?: boolean) {
        const user = auth.currentUser;
        if (!user) return null;
        return user.getIdToken(forceRefresh);
      },

      currentUser() {
        return currentSession?.user ?? null;
      },
    };
  },

  async dispose() {
    unsubAuth?.();
    unsubAuth = null;
  },
};
