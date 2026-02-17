# Phase 6 E2E Tests: MVP Hardening + Full Smoke Test

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 6 is the final validation. Run a comprehensive end-to-end smoke test that
exercises the ENTIRE user journey, plus hardening-specific checks.

---

## Part A: Full Smoke Test (Happy Path)

This is a sequential, narrated walkthrough of the complete MVP user journey.

### Smoke 1: Fresh User Sign-In
1. Open a fresh browser (clear cookies/storage or use incognito).
2. Navigate to `http://localhost:5173`.
3. Sign in as a new user (create User D via emulator REST API if needed).

**Pass criteria:** User lands on the home page, sees their name and "Create New Board".

### Smoke 2: Board Creation
4. Click "Create New Board".
5. Note the board URL.

**Pass criteria:** Board loads, canvas renders, background grid visible.

### Smoke 3: Object Creation and Editing
6. Create 3 sticky notes with different text: "Task A", "Task B", "Task C".
7. Create 2 rectangles.
8. Change colors on at least 2 objects.
9. Move all objects to arrange them on the canvas.

**Pass criteria:** All 5 objects visible with correct text/colors/positions.

### Smoke 4: Viewport Navigation
10. Pan the canvas to the right.
11. Zoom in to 2x.
12. Pan around while zoomed.
13. Click "Reset View".

**Pass criteria:** All operations smooth, objects maintain correct relative positions.

### Smoke 5: Second User Joins
14. Open **Window B**, sign in as User B.
15. Grant User B board membership (if not already granted).
16. Navigate User B to the same board URL.

**Pass criteria:** User B sees all 5 objects created by User D.

### Smoke 6: Real-Time Collaboration
17. In Window A, create a new sticky note "Collab Note".
18. In Window B, verify it appears.
19. In Window B, edit the note text to "Collab Note — edited by Bob".
20. In Window A, verify the edit appears.
21. In Window A, move the note.
22. In Window B, verify the move.

**Pass criteria:** All operations sync within 3 seconds. No data loss or duplication.

### Smoke 7: Cursors and Presence
23. In both windows, observe remote cursors with name labels.
24. Verify presence roster shows both users.

**Pass criteria:** Cursors track smoothly, labels are correct, roster is accurate.

### Smoke 8: Persistence
25. Close both browser windows.
26. Wait 5 seconds.
27. Open a new window, sign in as User D, navigate to the board.

**Pass criteria:** All objects are present and unchanged. Full state persisted.

### Smoke 9: Sign Out and Access Control
28. Sign out.
29. Verify redirect to sign-in page.
30. Sign in as a NEW user (User E) who is NOT a board member.
31. Navigate to the board URL.

**Pass criteria:** User E sees "unauthorized" or "no access" message.

---

## Part B: Hardening Checks

### Test 6.1: Error State — Invalid Board ID
Navigate to `/board/this-is-not-a-real-board-id`.

**Pass criteria:**
- The app shows a "Board not found" message (not a crash or blank screen)
- No unhandled exceptions in the console

### Test 6.2: Error State — Network Loss During Editing
On the board, create a sticky note. Then go offline (DevTools > Network > Offline).
Try to create another object and move the first one.

**Pass criteria:**
- Optimistic updates work locally (objects appear/move)
- A sync status indicator shows disconnected/degraded state
- After going back online, all changes sync correctly

### Test 6.3: Error State — Auth Token Expiry (Simulated)
In the browser console, force sign out the Firebase user while on a board:
```javascript
const { getAuth } = await import('firebase/auth');
await getAuth().signOut();
```

**Pass criteria:**
- The app detects the auth change and redirects to sign-in
- OR shows an appropriate "session expired" message
- No crash or data corruption

### Test 6.4: Security Rules — Firestore Direct Access Denied
Attempt to write a board object directly via the Firestore emulator REST API
using a token for a non-member user:

```bash
# Attempt to create an object on a board where this user is NOT a member
curl -s -X POST \
  "http://localhost:8080/v1/projects/collabboard-dev-9f339/databases/(default)/documents/boards/<BOARD_ID>/objects" \
  -H 'Authorization: Bearer <USER_E_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"fields": {"type": {"stringValue": "sticky"}, "text": {"stringValue": "hacked"}}}'
```

**Pass criteria:** The write is rejected by Firestore security rules.

### Test 6.5: Performance — Many Objects
On a board, create 50+ objects (mix of sticky notes and rectangles).
Pan and zoom around the board.

**Pass criteria:**
- The canvas remains interactive (no multi-second freezes)
- Pan/zoom is still responsive (even if slightly degraded)
- All objects render (none are invisible or missing)
- No console errors about memory or rendering

### Test 6.6: Performance — Rapid Sync Operations
In Window A, rapidly create 20 objects in quick succession.
Observe Window B.

**Pass criteria:**
- All 20 objects eventually appear in Window B
- No objects are lost or duplicated
- The UI remains responsive during the burst

### Test 6.7: CI Pipeline Verification
Run the full CI command sequence:
```bash
bun install && bun run typecheck && bun run lint && bun run build
```

**Pass criteria:** All commands pass with exit code 0.

### Test 6.8: Clean Emulator Restart
Stop and restart the Firebase emulators (without export).
Open the app and navigate to a board.

**Pass criteria:**
- The app handles a fresh emulator (empty database) gracefully
- If the board doesn't exist, it shows "not found" rather than crashing

---

## Final Summary

After completing all tests, produce the final report:

```
## CollabBoard MVP — Full E2E Test Report

### Environment
- Date: <date>
- Emulators: Firebase Auth, Firestore, RTDB (local)
- Dev server: Vite on localhost:5173
- Browser: <browser and version>

### Results by Phase Feature
| Feature Area           | Tests Run | Passed | Failed | Notes |
|------------------------|-----------|--------|--------|-------|
| Auth & Access Control  |           |        |        |       |
| Board CRUD             |           |        |        |       |
| Viewport (Pan/Zoom)    |           |        |        |       |
| Object CRUD            |           |        |        |       |
| Realtime Sync          |           |        |        |       |
| Cursors & Presence     |           |        |        |       |
| Error Handling         |           |        |        |       |
| Performance            |           |        |        |       |
| Security Rules         |           |        |        |       |
| CI / Build             |           |        |        |       |

### Overall Verdict: PASS / FAIL
```
