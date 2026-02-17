# Phase 4 E2E Tests: Realtime Sync + Persistence

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 4 validates real-time synchronization between multiple users, data persistence,
and conflict resolution. These tests require TWO browser windows/contexts.

---

## Setup: Two Browser Contexts

Open two separate browser windows (or use two browser contexts/profiles):
- **Window A:** Sign in as User A (alice@test.com)
- **Window B:** Sign in as User B (bob@test.com)

Ensure User B has been granted membership to the test board (see Phase 1, Test 1.7).
Navigate BOTH windows to the same board URL: `/board/<BOARD_ID>`.

---

## Tests

### Test 4.1: Object Creation Syncs in Real Time
In **Window A**, create a new sticky note with text "Sync Test".

**Pass criteria:**
- Within 2-3 seconds, **Window B** shows the same sticky note with text "Sync Test"
- The note appears at approximately the same position in both windows

### Test 4.2: Object Move Syncs in Real Time
In **Window A**, drag the "Sync Test" sticky note to a new position.

**Pass criteria:**
- **Window B** shows the sticky note moving to the new position
- Final positions match in both windows (within a few pixels)

### Test 4.3: Object Edit Syncs in Real Time
In **Window B**, edit the sticky note text to "Updated by Bob".

**Pass criteria:**
- **Window A** shows the updated text "Updated by Bob" within 2-3 seconds

### Test 4.4: Color Change Syncs
In **Window A**, change the sticky note's color.

**Pass criteria:**
- **Window B** reflects the color change within 2-3 seconds

### Test 4.5: Multiple Rapid Operations
In **Window A**, quickly create 5 sticky notes in succession.

**Pass criteria:**
- All 5 notes appear in **Window B**
- No notes are missing or duplicated
- Each note has correct content and position

### Test 4.6: Persistence After All Users Leave
In both windows, navigate away from the board (go to home page `/`).
Wait 3 seconds. Then navigate **Window A** back to the board.

**Pass criteria:**
- All objects (sticky notes, rectangles) created in previous tests are still present
- Positions, text, and colors are all preserved
- No data was lost when all users left

### Test 4.7: Persistence After Page Refresh
In **Window A** on the board, press F5 to hard-refresh the page.

**Pass criteria:**
- After reload, all board objects are restored from Firestore
- The board is in the same state as before the refresh
- No objects are duplicated or missing

### Test 4.8: Simultaneous Edits (Conflict Resolution)
In **Window A** AND **Window B** simultaneously, move the SAME sticky note to
different positions (A moves it left, B moves it right). Do this as close to the
same time as possible.

**Pass criteria:**
- After both operations resolve (within 3-5 seconds), both windows show the sticky
  note at the SAME final position
- The conflict is resolved deterministically (last-write-wins by timestamp)
- No error messages appear in either window
- The object is not corrupted or duplicated

### Test 4.9: Offline Recovery
In **Window A**, simulate network disruption:
- Open DevTools > Network tab > set to "Offline"
- Create a new sticky note (should work locally via optimistic update)
- Re-enable network

**Pass criteria:**
- While offline, the sticky note appears locally in Window A
- After reconnecting, the note appears in **Window B**
- No duplicate notes are created
- The sync status indicator (if present) shows disconnected/reconnected states

### Test 4.10: Idempotent Operation Replay
Using the browser console in **Window A**, manually publish the same operation
payload twice (same `opId`). You can observe this via the Firestore emulator UI
at `http://localhost:4000/firestore`.

**Pass criteria:**
- The operation is applied only once
- No duplicate objects or double-moves result from the replay

### Test 4.11: New User Joins Mid-Session
With Window A having several objects on the board, open a **new** browser window
(Window C) and sign in as a new user (create User C if needed and grant board access).
Navigate to the same board.

**Pass criteria:**
- Window C loads the full current state of the board
- All existing objects are visible with correct properties
- New operations from Window C sync to A and B
