import type { AuthUser, AuthSession } from '../contracts.ts';

interface FirebaseUserLike {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function toAuthUser(firebaseUser: FirebaseUserLike): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}

export function toAuthSession(firebaseUser: FirebaseUserLike): AuthSession {
  return { user: toAuthUser(firebaseUser) };
}
