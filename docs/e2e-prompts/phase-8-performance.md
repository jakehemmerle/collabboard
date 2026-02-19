# Phase 8 E2E Tests: Performance & Polish

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 8 validates viewport culling, cursor optimization under load, batch write
performance, and cross-module integration. These tests exercise the system at scale
(500+ objects, 5+ users) and verify the optimizations from Epic 6.

**Prerequisites:**
- All prior epics (0-5) are complete and passing
- The AI agent is functional (used in some tests to bulk-create objects)

---

## Setup

- **Window A:** Signed in as Alice, on board `/board/<BOARD_ID>` (empty board)
- **Window B:** Signed in as Bob, on the same board
- Chrome DevTools available in all windows (Performance tab, FPS meter)

---

## Part A: Viewport Culling (Story 6.1)

### Test 8.1: Seed Board with 500+ Objects

Use the AI agent or the browser console to bulk-create objects. In **Window A**,
open the AI chat and issue commands such as:

> Create a 25x20 grid of sticky notes starting at position 0,0 with 150px spacing

Or, if faster, use the browser console to programmatically create objects via the
app's module API. The goal is to have **500+ objects** spread across a large area
of the board.

**Pass criteria:**
- 500+ objects exist on the board (verify via `getBoardState` AI command or Firestore emulator UI at `http://localhost:4000/firestore`)
- Objects are spread across a large area (not all stacked on top of each other)
- The board does not crash during creation

### Test 8.2: FPS During Pan/Zoom with 500+ Objects

With 500+ objects on the board, open Chrome DevTools in **Window A**:
- Cmd+Shift+P → "Show FPS meter" (or Performance tab → record)
- Pan the canvas by click-dragging on empty space for 10 seconds
- Zoom in and out using scroll wheel for 10 seconds

**Pass criteria:**
- FPS stays above 30fps during pan (target: 60fps)
- No multi-second freezes or frame drops below 15fps
- The canvas remains interactive (objects are clickable after pan/zoom)
- Zoom in/out is smooth without visible stutter

### Test 8.3: Viewport Culling Reduces Rendered Nodes

With 500+ objects on the board, zoom into a corner so only ~20-30 objects are visible.
Open the browser console and check the number of rendered Konva nodes:

```javascript
// Inspect the Konva stage to count rendered shapes
document.querySelector('canvas').__konvaNode?.getStage()?.find('Group').length
```

Or use React DevTools to inspect the ObjectLayer component's children count.

**Pass criteria:**
- The number of rendered shape nodes is significantly less than 500
- Only objects within (or near) the visible viewport are rendered
- Panning to a different area updates which objects are rendered
- Objects that scroll into view appear immediately (no visible pop-in)

### Test 8.4: Culling Correctness — No Missing Objects

Zoom out to see the entire board (all 500+ objects visible).

**Pass criteria:**
- All objects are visible — none are permanently culled or missing
- Object positions, colors, and text are correct
- Zooming in to any area shows the expected objects

---

## Part B: Cursor Optimization (Story 6.2)

### Test 8.5: Five-User Cursor Smoothness

Open the board in **5 browser windows** (use incognito, profiles, or separate browsers).
Sign in as 5 different users (create Users C, D, E via emulator API if needed and grant
board membership). All 5 windows should be on the same board.

Move the mouse in all 5 windows simultaneously.

**Pass criteria:**
- Each window displays 4 remote cursors (one per other user)
- Cursors track smoothly (no teleporting or >1s lag)
- The presence roster shows all 5 users
- No console errors related to RTDB write rate or quota limits

### Test 8.6: Cursor Throttling Under Rapid Movement

In **Window A**, move the mouse in fast circles for 10 seconds.
Observe the cursor representation in **Window B**.

**Pass criteria:**
- The remote cursor in Window B follows the general trajectory
- Updates are visibly throttled (cursor doesn't match every micro-movement, but feels responsive)
- No RTDB rate-limit errors in the console
- Other windows remain responsive during rapid cursor movement

### Test 8.7: Off-Screen Cursor Culling

In **Window A**, zoom into the top-left corner of the board. In **Window B**, move the
cursor to the bottom-right corner (far from Window A's viewport).

**Pass criteria:**
- Window A does not render Bob's cursor (it is off-screen)
- When Bob moves his cursor into Window A's visible area, it reappears smoothly
- No console errors from attempting to render off-screen cursors

---

## Part C: Batch Write Performance (Story 6.1)

### Test 8.8: Rapid Drag Does Not Flood Firestore

In **Window A**, select an object and drag it continuously for 5 seconds (moving slowly
across the canvas). Open the Firestore emulator UI at `http://localhost:4000/firestore`
and observe the write count, or use the browser console Network tab filtered to Firestore
requests.

**Pass criteria:**
- Writes to Firestore are batched/throttled (not one write per mousemove event)
- The number of Firestore writes during a 5-second drag is < 50 (ideally < 20)
- The final position syncs correctly to **Window B**
- No write failures or quota errors

### Test 8.9: Bulk Delete Performance

Select all 500+ objects (Cmd+A) and delete them (Delete/Backspace key).

**Pass criteria:**
- The delete operation completes without freezing the UI for more than 3 seconds
- All objects are removed from the canvas
- **Window B** shows all objects removed (sync completes within 10 seconds)
- No Firestore write errors from the bulk operation
- The board is usable after the bulk delete (can create new objects)

---

## Part D: Integration Tests (Story 6.3)

### Test 8.10: Full Intent-to-Sync Round Trip

In **Window A**, create a sticky note via the toolbar. Edit its text. Change its color.
Move it. Resize it. Rotate it. Then duplicate it.

After each operation, verify in **Window B** that the change appeared.

**Pass criteria:**
- Every operation (create, edit, color, move, resize, rotate, duplicate) syncs correctly
- The duplicate appears as a separate object with offset position
- All object properties in Window B match Window A exactly
- No operations are lost or applied out of order

### Test 8.11: AI Tool Creates Valid Board State

Use the AI agent to create a complex layout:

> Create a retrospective board with three columns: What Went Well, What Didn't, and Action Items. Add 2 sticky notes in each column.

Then manually interact with every AI-created object: select, move, resize, edit text,
change color.

**Pass criteria:**
- All AI-created objects (frames, sticky notes) behave identically to manually created objects
- AI-created objects can be selected, moved, resized, rotated, duplicated, and deleted
- AI-created connectors (if any) update endpoints when connected objects are moved
- Frame children recompute when the frame is moved
- No type errors or rendering glitches on AI-created objects

### Test 8.12: Connector Integrity Under AI Manipulation

Create two shapes manually. Use the AI to connect them:

> Connect the rectangle to the circle with an arrow

Then move one of the shapes manually.

**Pass criteria:**
- The AI creates a connector between the two objects
- Moving either connected object updates the connector endpoints in real-time
- The connector syncs to **Window B** with correct source/target references
- Deleting the target object causes the connector to handle the dangling reference gracefully

---

## Part E: Build Verification

### Test 8.13: Full CI Pipeline Passes

Run the complete CI command sequence:

```bash
cd /Users/jake/codebases/gauntlet/collabboard
bun install && bun run typecheck && bun run lint && bun run test && bun run build
```

**Pass criteria:**
- All commands pass with exit code 0
- No type errors, lint errors, or test failures
- Production build (`apps/web/dist/`) is created successfully
- Test suite includes tests for viewport culling, geometry, and integration scenarios

---

## Test Summary Format

```
## E2E Test Results — Phase 8: Performance & Polish

| # | Test Name                              | Result | Notes |
|---|----------------------------------------|--------|-------|
| 8.1  | Seed 500+ objects                   |        |       |
| 8.2  | FPS during pan/zoom at scale        |        |       |
| 8.3  | Viewport culling reduces nodes      |        |       |
| 8.4  | Culling correctness (no missing)    |        |       |
| 8.5  | Five-user cursor smoothness         |        |       |
| 8.6  | Cursor throttling (rapid movement)  |        |       |
| 8.7  | Off-screen cursor culling           |        |       |
| 8.8  | Drag write batching                 |        |       |
| 8.9  | Bulk delete performance             |        |       |
| 8.10 | Full intent-to-sync round trip      |        |       |
| 8.11 | AI tool creates valid board state   |        |       |
| 8.12 | Connector integrity under AI        |        |       |
| 8.13 | Full CI pipeline passes             |        |       |

**Overall: X/13 passed**
```
