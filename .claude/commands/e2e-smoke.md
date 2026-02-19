# CollabBoard E2E Smoke Test — Happy Path

You are running a local end-to-end smoke test of CollabBoard using browser
automation. Your goal is to spin up the local environment, open Chrome, and
verify the core happy-path features work. Report results as a summary table
at the end.

---

## Phase 0: Environment Bootstrap

### 0a. Pre-flight
Run these and confirm they succeed (stop and report if any fail):
```bash
cd /Users/jake/codebases/gauntlet/collabboard
bun --version   # >= 1.3
node --version  # >= 20
firebase --version
```

### 0b. Install Dependencies
```bash
bun install
```

### 0c. Ensure .env is Configured for Emulators
Check if `apps/web/.env` exists. If not, create it from `.env.example` with
emulator-friendly values:
```
VITE_FIREBASE_API_KEY=fake-api-key
VITE_FIREBASE_AUTH_DOMAIN=collabboard-dev-9f339.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=collabboard-dev-9f339
VITE_FIREBASE_DATABASE_URL=http://127.0.0.1:9000?ns=collabboard-dev-9f339-default-rtdb
VITE_FIREBASE_STORAGE_BUCKET=collabboard-dev-9f339.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
VITE_USE_EMULATORS=true
```

### 0d. Start Firebase Emulators (background)
```bash
bun run emulators
```
Wait until Auth (9099), Firestore (8080), and RTDB (9000) emulators are ready.
Verify by fetching `http://localhost:4000`.

### 0e. Start Vite Dev Server (background)
```bash
bun run dev
```
Wait until `http://localhost:5173` responds with HTML.

### 0f. Create Test User via Emulator REST API
```bash
curl -s -X POST \
  'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@test.com","password":"testpass123","displayName":"Alice Test","returnSecureToken":true}'
```
Save the returned `idToken` and `localId` for later use.

---

## Phase 1: Auth & Board Access (Browser Tests)

Open Chrome to `http://localhost:5173` using browser automation.

### Test 1: Unauthenticated State
- Verify the app shows a sign-in page/prompt
- No board content is visible

### Test 2: Sign In
The app uses Google OAuth, which can't be automated via button click. Instead,
sign in by executing JavaScript in the browser console:
```javascript
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
const auth = getAuth();
await signInWithEmailAndPassword(auth, 'alice@test.com', 'testpass123');
```
Wait for the UI to update (URL change, sign-in prompt disappears).

- Verify: user lands on a home/dashboard page
- Verify: a "Create New Board" button (or similar) is visible

### Test 3: Create a Board
Click the "Create New Board" button.

- Verify: URL changes to `/board/<some-id>`
- Verify: a canvas/board UI renders (no blank screen or error)
- Save the board URL for later tests

---

## Phase 2: Viewport Navigation

On the board page:

### Test 4: Canvas Renders
- Verify: a Konva canvas or similar board area fills the viewport
- Verify: a background grid is visible
- Verify: no console errors

### Test 5: Pan
Click and drag on empty canvas space ~200px in any direction.
- Verify: the canvas content moves with the drag

### Test 6: Zoom
Scroll the mouse wheel up (zoom in) a few notches over the canvas center.
- Verify: the canvas zooms in (grid lines get farther apart or elements scale up)

### Test 7: Reset View
If a "Reset View" button exists, click it.
- Verify: the view returns to default position/zoom

---

## Phase 3: Object CRUD

### Test 8: Create a Sticky Note
Use the toolbar or creation UI to create a sticky note.
- Verify: a colored note appears on the canvas

### Test 9: Edit Sticky Note Text
Double-click (or use the edit interaction) on the sticky note. Type "Hello CollabBoard". Confirm the edit.
- Verify: the note displays "Hello CollabBoard"

### Test 10: Move a Sticky Note
Drag the sticky note ~150px to the right.
- Verify: the note moves to the new position and stays there

### Test 11: Create a Rectangle
Use the toolbar to create a rectangle shape.
- Verify: a rectangle appears on the canvas, distinct from the sticky note

### Test 12: Object Selection
Click the sticky note — verify selection indicators appear.
Click the rectangle — verify selection transfers.
Click empty space — verify deselection.

---

## Phase 4: Persistence

### Test 13: Persistence After Reload
Note the current board URL and the positions/content of objects.
Reload the page (navigate to the same URL again).

- Verify: after reload, the user is still authenticated
- Verify: all objects (sticky note with "Hello CollabBoard", rectangle) are present
- Verify: positions and properties match pre-reload state

### Test 14: Sign Out
Navigate to home (`/`) and click "Sign Out".
- Verify: redirected to sign-in page
- Verify: navigating back to the board URL shows sign-in (not board content)

---

## Phase 5: Build Verification

Run these commands and confirm they pass:
```bash
bun run typecheck
bun run build
```
- Verify: both exit with code 0

---

## Cleanup

Stop the background Vite dev server and Firebase emulators.

---

## Reporting

Produce a final summary table:

```
## CollabBoard E2E Smoke Test Results

| #  | Test                        | Result | Notes |
|----|-----------------------------|--------|-------|
| 1  | Unauthenticated state       |        |       |
| 2  | Sign in                     |        |       |
| 3  | Create a board              |        |       |
| 4  | Canvas renders              |        |       |
| 5  | Pan                         |        |       |
| 6  | Zoom                        |        |       |
| 7  | Reset view                  |        |       |
| 8  | Create sticky note          |        |       |
| 9  | Edit sticky note text       |        |       |
| 10 | Move sticky note            |        |       |
| 11 | Create rectangle            |        |       |
| 12 | Object selection            |        |       |
| 13 | Persistence after reload    |        |       |
| 14 | Sign out                    |        |       |
| 15 | typecheck + build passes    |        |       |

**Overall: X/15 passed**
```

If any test fails, include the error details in the Notes column and continue
with remaining tests where possible.
