# CollabBoard E2E Test — Environment Bootstrap

You are a Claude Code instance with browser automation capabilities. Your job is to
start the local development environment and then run end-to-end tests against it.

## Step 0: Pre-flight Checks

Run each of these and confirm they succeed. If any fail, stop and report the failure.

```bash
cd /Users/jake/codebases/gauntlet/collabboard
bun --version        # expect >= 1.3
node --version       # expect >= 20
firebase --version   # expect firebase-tools installed
```

## Step 1: Install Dependencies

```bash
bun install
```

## Step 2: Ensure .env is Configured for Emulators

Verify `apps/web/.env` exists. If not, copy from `.env.example`:

```bash
cp apps/web/.env.example apps/web/.env
```

Then ensure these values are set in `apps/web/.env`:
- `VITE_FIREBASE_PROJECT_ID=collabboard-dev-9f339`
- `VITE_FIREBASE_DATABASE_URL=http://127.0.0.1:9000?ns=collabboard-dev-9f339-default-rtdb`
- `VITE_USE_EMULATORS=true`
- All other `VITE_FIREBASE_*` keys can be set to placeholder values (e.g., `fake-api-key`)
  since emulators don't validate them.

## Step 3: Start Firebase Emulators

In a background terminal:

```bash
bun run emulators
```

Wait until you see output confirming all emulators are running:
- Auth emulator on port 9099
- Firestore emulator on port 8080
- Database emulator on port 9000
- Emulator UI on port 4000

Verify by fetching `http://localhost:4000` — should return the Emulator Suite UI.

## Step 4: Start the Vite Dev Server

In a separate background terminal:

```bash
bun run dev
```

Wait until you see "Local: http://localhost:5173" in the output.

Verify by fetching `http://localhost:5173` — should return HTML.

## Step 5: Create Test Users via Emulator REST API

The app uses Google OAuth, but in the emulator we can create users programmatically.
Create two test users:

**User A (primary):**
```bash
curl -s -X POST 'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@test.com","password":"testpass123","displayName":"Alice Test","returnSecureToken":true}'
```
Save the returned `idToken` and `localId` (uid) as USER_A_TOKEN and USER_A_UID.

**User B (secondary, for multi-user tests):**
```bash
curl -s -X POST 'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@test.com","password":"testpass123","displayName":"Bob Test","returnSecureToken":true}'
```
Save the returned `idToken` and `localId` as USER_B_TOKEN and USER_B_UID.

## Emulator Auth Sign-In Helper

To sign in as a user in the browser, navigate to the app and use the browser console:

```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
const auth = getAuth();
await signInWithEmailAndPassword(auth, 'alice@test.com', 'testpass123');
```

Alternatively, if the app only exposes a "Sign in with Google" button, you can use the
Firebase Auth emulator's auto-sign-in: navigate to `http://localhost:9099` and add the
test users there, then trigger sign-in via the emulator UI. Or you may need to use the
Firebase emulator's `signInWithCredential` or modify the sign-in flow to accept
email/password in emulator mode.

**IMPORTANT:** If the sign-in button triggers a Google popup that can't be automated,
you will need to authenticate by executing JavaScript in the browser console using
the Firebase SDK directly. The app's Firebase instance is available on the page.

## Test Reporting

After running all tests, produce a summary in this format:

```
## E2E Test Results — Phase N

| # | Test Name                        | Result | Notes |
|---|----------------------------------|--------|-------|
| 1 | Description of test              | PASS   |       |
| 2 | Description of test              | FAIL   | Error detail |

**Overall: X/Y passed**
```
