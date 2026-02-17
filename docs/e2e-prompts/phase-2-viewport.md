# Phase 2 E2E Tests: Infinite Board Foundation

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 2 validates the infinite canvas with pan, zoom, and coordinate transforms.
Sign in as User A and create/open a board before running these tests.

---

## Tests

### Test 2.1: Initial Board Render
Open a board page.

**Pass criteria:**
- The Konva canvas fills the viewport
- A background grid is visible
- A "Reset View" button is visible (bottom-right)
- No console errors

### Test 2.2: Pan via Mouse Drag
Click and drag on an empty area of the canvas (not on any object).
Drag from the center of the canvas toward the top-left by ~200px.

**Pass criteria:**
- The canvas content (grid, any objects) moves in the drag direction
- The movement is smooth (no jumping or flickering)
- After releasing, the canvas stays at the new position

### Test 2.3: Zoom via Mouse Wheel
Position the mouse cursor over the center of the canvas.
Scroll the mouse wheel up (zoom in) several notches.

**Pass criteria:**
- The canvas zooms in toward the cursor position
- The grid pattern scales appropriately (lines get farther apart)
- The zoom is smooth and incremental

### Test 2.4: Zoom Out
Scroll the mouse wheel down (zoom out) several notches past the original zoom level.

**Pass criteria:**
- The canvas zooms out
- Grid lines get closer together
- There is a minimum zoom level (canvas doesn't zoom out infinitely)

### Test 2.5: Zoom-to-Pointer Accuracy
Place an object or note the position of a grid intersection near the cursor.
Zoom in while keeping the cursor stationary.

**Pass criteria:**
- The point under the cursor remains under the cursor during zoom
- The zoom centers on the pointer, not on the canvas center

### Test 2.6: Combined Pan and Zoom
Pan the canvas far to the right and down (drag several times).
Then zoom in, then pan more, then zoom out.

**Pass criteria:**
- All operations compose correctly
- No canvas boundaries are hit — you can pan/zoom to any area
- The grid continues to render at any position

### Test 2.7: Reset View
After panning and zooming to a non-default position, click the "Reset View" button.

**Pass criteria:**
- The camera returns to the origin (0, 0) at default zoom (scale = 1)
- The grid is back to its default appearance

### Test 2.8: Resize Handling
Resize the browser window (make it smaller, then larger).

**Pass criteria:**
- The Konva canvas resizes to fill the new viewport dimensions
- No blank areas or overflow appear
- The canvas content remains in the correct position

### Test 2.9: Performance During Rapid Interaction
Rapidly pan and zoom in quick succession for 5-10 seconds.

**Pass criteria:**
- The canvas remains responsive
- No visible stuttering or frame drops (should feel >= 30fps)
- No console errors or warnings about performance
