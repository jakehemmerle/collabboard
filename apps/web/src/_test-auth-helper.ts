// Temporary helper for E2E testing - uses same Vite-resolved firebase/auth
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from './core/firebase.ts';

export async function testSignIn(email: string, password: string) {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, displayName: cred.user.displayName, email: cred.user.email };
}

export async function testSignOut() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}
