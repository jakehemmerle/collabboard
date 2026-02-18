export type AuthProvider = 'google';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

export interface AuthApi {
  readiness(): Promise<void>;
  observeSession(cb: (s: AuthSession | null) => void): () => void;
  signIn(provider: AuthProvider): Promise<AuthSession>;
  signInAnon(): Promise<AuthSession>;
  signOut(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  currentUser(): AuthUser | null;
}
