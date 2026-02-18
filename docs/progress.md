# E2E Browser Testing Progress & Workflow Notes

## Goal
Run Phase 4 (Realtime Sync) and Phase 5 (Presence) E2E tests using two browser tabs
in a single Chrome instance, with Tab A = Alice and Tab B = Bob, both on the same board.

## Problem: Two Firebase Auth Users in One Browser

Firebase Auth persists sessions to IndexedDB by default. Since both tabs share the same
origin (`localhost:5173`), they share the same IndexedDB — meaning signing in as Bob on
Tab B also signs in as Bob on Tab A (overwriting Alice).

### What Didn't Work

1. **Direct ESM import of `firebase/auth` functions** — Importing `signInWithEmailAndPassword`
   from `/node_modules/firebase/auth/dist/esm/index.esm.js` creates a **different module
   instance** than the one Vite pre-bundles for the app. Passing the app's `auth` object
   (from `getFirebaseAuth()`) to functions from a different module copy causes:
   - `FirebaseError: Expected first argument to doc()` (type mismatch across copies)
   - `auth/network-request-failed` (functions don't share emulator config)

2. **REST API to Firestore emulator** — Requires auth tokens; the emulator REST API
   at `http://localhost:8080/v1/projects/.../documents/...` enforces security rules and
   rejects unauthenticated or unauthorized writes.

3. **Calling `signOut()` before switching users** — Clears the shared IndexedDB session,
   logging Alice out on Tab A too. Each subsequent navigation/reload on Tab A picks up
   the wrong (or no) session.

4. **Auth emulator crash** — The auth emulator (port 9099) died at some point during
   testing, causing `auth/network-request-failed` errors for all sign-in attempts.

### What Worked

1. **Vite-resolved helper module** — Created `apps/web/src/_test-auth-helper.ts` that
   imports `signInWithEmailAndPassword`, `setPersistence`, and `inMemoryPersistence`
   from `firebase/auth` (bare specifier). When loaded via `import('/src/_test-auth-helper.ts')`,
   Vite resolves the `firebase/auth` import to the same pre-bundled chunk the app uses.
   This means the auth functions and the auth instance share the same module, so they're
   compatible.

   ```typescript
   // apps/web/src/_test-auth-helper.ts
   import { signInWithEmailAndPassword, setPersistence, inMemoryPersistence, signOut } from 'firebase/auth';
   import { getFirebaseAuth } from './core/firebase.ts';

   export async function testSignIn(email: string, password: string, useInMemory = false) {
     const auth = getFirebaseAuth();
     if (useInMemory) {
       await setPersistence(auth, inMemoryPersistence);
     }
     const cred = await signInWithEmailAndPassword(auth, email, password);
     return { uid: cred.user.uid, displayName: cred.user.displayName, email: cred.user.email };
   }
   ```

2. **`inMemoryPersistence` on Tab B** — Calling `setPersistence(auth, inMemoryPersistence)`
   before signing in as Bob ensures Bob's session is stored only in memory (not IndexedDB),
   leaving Alice's IndexedDB session intact for Tab A.

3. **`grantMembership` via app module** — Instead of hitting the Firestore REST API,
   use the app's own `board-access` module from the browser console:
   ```javascript
   const { getModuleApi } = await import('/src/app/module-registry.ts');
   const api = getModuleApi('board-access');
   await api.grantMembership(boardId, bobUid, 'editor');
   ```

4. **Test user password** — The preamble specifies `testpass123` (not `password123`).

## Workflow Procedure (for future E2E test runs)

### Prerequisites
- Firebase emulators running (Auth:9099, Firestore:8080, RTDB:9000)
- Vite dev server on port 5173
- Test users created: alice@test.com and bob@test.com (password: `testpass123`)
- Chrome with Claude-in-Chrome extension connected

### Step-by-step

1. **Get tab context** — `tabs_context_mcp` to discover existing tabs
2. **Create two tabs** — One for Alice (Tab A), one for Bob (Tab B)
3. **Sign in Alice on Tab A** (default IndexedDB persistence):
   ```javascript
   const helper = await import('/src/_test-auth-helper.ts');
   await helper.testSignIn('alice@test.com', 'testpass123', false);
   ```
4. **Sign in Bob on Tab B** (inMemoryPersistence to avoid clobbering Alice):
   ```javascript
   const helper = await import('/src/_test-auth-helper.ts');
   await helper.testSignIn('bob@test.com', 'testpass123', true);
   ```
5. **Create board** — Navigate Tab A to home page, click "Create New Board"
6. **Grant Bob access** — From Tab A's console:
   ```javascript
   const { getModuleApi } = await import('/src/app/module-registry.ts');
   const api = getModuleApi('board-access');
   await api.grantMembership(boardId, bobUid, 'editor');
   ```
7. **Navigate Bob to board** — Open the board URL on Tab B
8. **IMPORTANT: Re-sign Bob after any navigation/reload** — `inMemoryPersistence`
   sessions are lost on page refresh. After any Tab B navigation:
   ```javascript
   const helper = await import('/src/_test-auth-helper.ts');
   await helper.testSignIn('bob@test.com', 'testpass123', true);
   ```
   Then navigate to the board URL.

### Known Limitations
- **3-user tests (4.11, 5.10) require a separate browser** — Can't create a third
  isolated auth context in the same browser.
- **Bob's session is fragile** — Any Tab B navigation loses Bob's in-memory session.
  Must re-authenticate after each page load/navigation on Tab B.
- **Auth emulator can crash** — If sign-in fails with `network-request-failed`,
  check if port 9099 is still alive: `curl -s http://127.0.0.1:9099/`

## RTDB Rules Fix
During testing, discovered that the RTDB rules had `.read` only at the `$uid` level,
but the presence module reads the parent `cursors/` and `presence/` collections.
Firebase RTDB rules don't cascade upward. Fixed by moving `.read: "auth != null"` to
the collection level. (Note: the emulator was running with default wide-open rules, so
this didn't affect E2E testing, but it would affect production.)
