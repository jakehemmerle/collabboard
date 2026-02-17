# Phase 1 E2E Tests: Auth + Board Access

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 1 validates authentication flows, board creation/access, and permission enforcement.

---

## Tests

### Test 1.1: Unauthenticated Redirect
Open a browser to `http://localhost:5173`. Do NOT sign in.

**Pass criteria:** The app shows a sign-in page/prompt. No board content is visible.
The URL should not allow navigation to `/board/anything` without authentication.

### Test 1.2: Sign In Flow
Sign in as User A (alice@test.com). If the app only has a Google sign-in button,
use the browser console to call:
```javascript
// Find the Firebase auth instance on the page and sign in
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
const auth = getAuth();
await signInWithEmailAndPassword(auth, 'alice@test.com', 'testpass123');
```
Wait for the UI to update.

**Pass criteria:** After sign-in, the app navigates to the home page showing:
- The user's display name or email
- A "Create New Board" button
- A "Sign Out" button

### Test 1.3: Create a Board
Click the "Create New Board" button.

**Pass criteria:**
- The URL changes to `/board/<some-uuid>`
- The board page loads (shows a Konva canvas or board UI)
- No error messages are displayed
- Save the board ID from the URL for later tests

### Test 1.4: Board Persists After Reload
Note the current board URL. Reload the page (F5 / Ctrl+R).

**Pass criteria:**
- After reload, the same board loads successfully
- The user is still authenticated (no sign-in prompt)
- The board content is consistent with before reload

### Test 1.5: Sign Out
Navigate to the home page (`/`) and click "Sign Out".

**Pass criteria:**
- The user is redirected to the sign-in page
- Navigating to the board URL from Test 1.3 shows the sign-in page (not board content)

### Test 1.6: Unauthorized Access — Different User Cannot Access Board
Sign in as User B (bob@test.com) using the same console technique.
Navigate to the board URL from Test 1.3 (`/board/<saved-id>`).

**Pass criteria:** User B sees an "unauthorized" or "no access" message. The board
canvas is NOT rendered. User B cannot read board data.

### Test 1.7: Grant Membership and Verify Access
Sign out User B. Sign back in as User A.
Grant User B access to the board. This can be done via Firestore emulator directly:

```bash
# Use the Firestore REST API via the emulator to update the board document
# Add bob's UID to the members map with role "collaborator"
curl -s -X PATCH \
  "http://localhost:8080/v1/projects/collabboard-dev-9f339/databases/(default)/documents/boards/<BOARD_ID>?updateMask.fieldPaths=members" \
  -H 'Authorization: Bearer owner' \
  -H 'Content-Type: application/json' \
  -d '{
    "fields": {
      "members": {
        "mapValue": {
          "fields": {
            "<USER_A_UID>": { "mapValue": { "fields": { "role": { "stringValue": "owner" } } } },
            "<USER_B_UID>": { "mapValue": { "fields": { "role": { "stringValue": "collaborator" } } } }
          }
        }
      }
    }
  }'
```

Now sign in as User B and navigate to the same board URL.

**Pass criteria:** User B can now see and access the board. The canvas renders normally.

### Test 1.8: Session Persistence Across Tabs
With User A signed in, open a new browser tab to `http://localhost:5173`.

**Pass criteria:** User A is already authenticated in the new tab — no sign-in prompt.
The home page shows User A's identity.
