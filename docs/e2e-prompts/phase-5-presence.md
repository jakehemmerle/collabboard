# Phase 5 E2E Tests: Multiplayer Cursors + Presence

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 5 validates real-time cursor sharing and presence awareness.
Requires TWO browser windows with different users on the same board.

---

## Setup

- **Window A:** Signed in as Alice, on board `/board/<BOARD_ID>`
- **Window B:** Signed in as Bob, on the same board (with membership granted)

---

## Tests

### Test 5.1: Remote Cursor Visibility
In **Window A**, move the mouse cursor slowly across the canvas.

**Pass criteria:**
- **Window B** displays a remote cursor indicator following Alice's mouse position
- The cursor appears with low latency (< 500ms perceived delay)
- The cursor moves smoothly (not jumping between distant positions)

### Test 5.2: Cursor Label Shows User Name
Observe the remote cursor in **Window B**.

**Pass criteria:**
- The remote cursor has a label showing "Alice Test" (or Alice's display name)
- The label is legible and positioned near the cursor indicator
- The label does not overlap the cursor in a way that obscures it

### Test 5.3: Bidirectional Cursors
In **Window B**, also move the mouse cursor around the canvas.
Observe **Window A**.

**Pass criteria:**
- **Window A** sees Bob's remote cursor with label "Bob Test"
- Both windows simultaneously show each other's cursors
- Each cursor is visually distinct (different color or style)

### Test 5.4: Cursor Accuracy Across Zoom Levels
In **Window A**, zoom in to 2x. Move the cursor to a specific grid intersection.
Observe the cursor position in **Window B** (which may be at a different zoom level).

**Pass criteria:**
- The remote cursor in Window B points to the same world-space position
- Coordinate conversion between screen and world space is correct
- The cursor is accurate regardless of each window's zoom level

### Test 5.5: Presence Roster — Online Users
Look for a presence roster / online users indicator in the UI (could be an avatar
list, a sidebar panel, or a status bar).

**Pass criteria:**
- Both Alice and Bob appear in the online users list
- Each user is identified by name or avatar
- The count shows 2 online users

### Test 5.6: Presence Cleanup on Disconnect
Close **Window B** entirely (close the browser tab/window).
Wait 5-10 seconds for the disconnect to be detected.

**Pass criteria:**
- **Window A**'s presence roster updates to show only Alice (1 online user)
- Bob's remote cursor disappears from the canvas
- No stale cursor or presence entry remains

### Test 5.7: Presence Cleanup on Navigation Away
Reopen **Window B** and sign in as Bob. Navigate to the board.
Verify both users appear in the roster. Then in **Window B**, navigate to the
home page (`/`) — leaving the board but not closing the browser.

**Pass criteria:**
- Within a few seconds, Alice's window no longer shows Bob in the roster
- Bob's cursor disappears from Alice's canvas

### Test 5.8: Rejoin After Disconnect
After Test 5.7, navigate **Window B** back to the board.

**Pass criteria:**
- Bob reappears in the presence roster
- Bob's cursor is tracked again when moving the mouse
- No duplicate entries for Bob in the roster

### Test 5.9: Cursor Under Load — Rapid Movement
In **Window A**, move the mouse rapidly in circles for 5 seconds.

**Pass criteria:**
- The remote cursor in Window B follows the general trajectory
- Updates are throttled (not 1:1 with every mouse event) but still feel responsive
- No errors in the console related to write rate or quota

### Test 5.10: Three-User Presence
Open a third browser context (**Window C**), sign in as a third user, and join
the board.

**Pass criteria:**
- All three windows show all three users in the presence roster
- Each window displays two remote cursors (the other two users)
- Each cursor has a distinct label
- Closing Window C properly cleans up that user's cursor and presence

### Test 5.11: RTDB Security Rules
Using a REST call WITHOUT authentication, attempt to write to the cursor path:

```bash
curl -s -X PUT \
  'http://localhost:9000/boards/<BOARD_ID>/cursors/fake-uid.json' \
  -d '{"x": 100, "y": 100}'
```

**Pass criteria:**
- The write is rejected (emulator enforces auth rules)
- Only authenticated users can write to their own cursor path
