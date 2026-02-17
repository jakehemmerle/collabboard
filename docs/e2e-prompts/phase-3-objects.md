# Phase 3 E2E Tests: Core Objects (MVP Primitives)

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 3 validates object creation, editing, selection, and manipulation.
Sign in as User A, create/open a board, and ensure you're on the board page.

**Note:** The exact UI for creating objects (toolbar buttons, context menu, etc.)
depends on the implementation. Adapt selectors/interactions to match the actual UI.

---

## Tests

### Test 3.1: Create a Sticky Note
Use the object creation UI (toolbar button, double-click, or context menu) to create
a new sticky note.

**Pass criteria:**
- A sticky note appears on the canvas
- It has a visible colored background (e.g., yellow)
- It has default or placeholder text
- It is positioned near where the creation action occurred

### Test 3.2: Edit Sticky Note Text
Double-click (or use the edit interaction) on the sticky note created in Test 3.1.
Type "Hello CollabBoard" as the new text. Confirm/commit the edit.

**Pass criteria:**
- A text editing interface appears (inline input, textarea, or overlay)
- After confirming, the sticky note displays "Hello CollabBoard"
- The text is fully visible and properly contained within the note

### Test 3.3: Change Sticky Note Color
Select the sticky note. Use the color/property editor UI to change its color
(e.g., from yellow to blue or pink).

**Pass criteria:**
- The sticky note's background color changes to the selected color
- The text remains readable against the new background

### Test 3.4: Move a Sticky Note
Click and drag the sticky note from its current position to a new position
(move it ~150px to the right and ~100px down).

**Pass criteria:**
- The sticky note follows the cursor during drag
- After releasing, it stays at the new position
- Its text content and color are preserved after the move

### Test 3.5: Create a Rectangle
Use the object creation UI to create a rectangle shape.

**Pass criteria:**
- A rectangle appears on the canvas
- It has a visible fill or stroke color
- It is distinct from sticky notes (no text by default, or different appearance)

### Test 3.6: Edit Rectangle Properties
Select the rectangle. Change its color using the property editor.

**Pass criteria:**
- The rectangle's fill/stroke color updates
- The change is immediately visible on the canvas

### Test 3.7: Move a Rectangle
Click and drag the rectangle to a new position.

**Pass criteria:**
- The rectangle follows the cursor during drag
- It stays at the new position after release

### Test 3.8: Object Selection
Click on the sticky note to select it. Verify selection indicators (handles,
border highlight, or selection outline) appear.
Then click on the rectangle. Verify the selection moves to the rectangle.
Then click on empty canvas space.

**Pass criteria:**
- Clicking an object selects it (visual indicator appears)
- Clicking a different object transfers selection
- Clicking empty space deselects all objects

### Test 3.9: Multiple Objects Coexist
Create 3 more sticky notes and 2 more rectangles at different positions.

**Pass criteria:**
- All objects render correctly without overlapping issues
- Each object can be independently selected and moved
- Objects maintain their individual properties (text, color, position)

### Test 3.10: Object State Survives Viewport Changes
Pan and zoom the canvas. Verify all objects are still present and correctly
positioned relative to each other.

**Pass criteria:**
- Objects scale and move with the canvas during pan/zoom
- Object positions and properties are preserved
- Returning to the original view shows objects unchanged

### Test 3.11: Build and Type Check Still Pass
In a terminal, run:
```bash
bun run typecheck && bun run build
```

**Pass criteria:** Both commands exit with code 0.
