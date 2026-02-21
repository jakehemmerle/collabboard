# Phase 7 E2E Tests: AI Board Agent

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 7 validates the AI chat panel, single-step and multi-step AI commands,
real-time sync of AI-created objects, chat persistence, and LangSmith observability.

**Prerequisites:**
- Epic 5 Cloud Function is deployed (locally or to Firebase)
- `VITE_AI_FUNCTION_URL` is set in `apps/web/.env` pointing to the AI chat endpoint
- `LANGCHAIN_API_KEY` and `LANGCHAIN_PROJECT` are configured on the Cloud Function
- LangSmith dashboard is accessible at `https://smith.langchain.com`

---

## Setup

- **Window A:** Signed in as Alice, on board `/board/<BOARD_ID>`
- **Window B:** Signed in as Bob, on the same board (with membership granted)
- **LangSmith:** Open `https://smith.langchain.com` in a separate tab, navigate to the
  project configured in `LANGCHAIN_PROJECT`

---

## Tests

### Test 7.1: AI Chat Panel Opens and Closes

Locate the AI chat toggle button (floating button, bottom-right or side of canvas).
Click it to open the panel.

**Pass criteria:**
- A chat panel slides open or becomes visible
- The panel contains a message input field and a send/submit button
- The panel is visually distinct from the canvas (side panel or overlay)
- Clicking the toggle again closes the panel
- The canvas remains interactive behind/beside the panel

### Test 7.2: Single-Step Creation — Sticky Note

With the AI chat panel open in **Window A**, type the following and submit:

> Add a yellow sticky note that says "User Research"

Wait for the AI response to stream in.

**Pass criteria:**
- The AI response streams incrementally (words appear progressively, not all at once)
- A yellow sticky note with text "User Research" appears on the canvas
- The response text acknowledges what was created (e.g., "I've created a yellow sticky note...")
- The sticky note is selectable, movable, and editable like any manually created object
- A loading/streaming indicator is visible while the AI is responding

### Test 7.3: AI-Created Object Syncs to Second User

After Test 7.2, observe **Window B**.

**Pass criteria:**
- The yellow "User Research" sticky note appears in Window B within 3 seconds
- The note has the same text, color, and approximate position as in Window A
- No manual action was required in Window B — sync happened via Firestore

### Test 7.4: Single-Step Creation — Shape

In **Window A**, type in the AI chat:

> Create a blue rectangle

**Pass criteria:**
- A blue rectangle appears on the canvas
- The AI response describes what was created
- The rectangle does not overlap the previously created sticky note (reasonable positioning)

### Test 7.5: Single-Step Manipulation — Move

In **Window A**, type in the AI chat:

> Move the yellow sticky note to the right

**Pass criteria:**
- The "User Research" sticky note moves to a new position (x increases)
- The rectangle remains in its original position
- The AI correctly identified the target object by color/description

### Test 7.6: Single-Step Manipulation — Color Change

In **Window A**, type in the AI chat:

> Change the rectangle's color to green

**Pass criteria:**
- The blue rectangle changes to green
- Other objects are unaffected
- The change syncs to Window B

### Test 7.7: Multi-Step Command — SWOT Analysis

Clear or scroll past previous messages. In **Window A**, type:

> Create a SWOT analysis

Wait for the full response (this may take 10-30 seconds due to multiple tool calls).

**Pass criteria:**
- 4 frames appear on the canvas, labeled: Strengths, Weaknesses, Opportunities, Threats
- The frames are arranged in a roughly 2x2 grid layout
- Each frame contains at least one sticky note as a placeholder
- The AI response describes the SWOT structure it created
- All objects sync to **Window B**

### Test 7.8: Multi-Step Command — Grid Layout

Create 6 sticky notes manually (or ask the AI to create them). Then type:

> Arrange these sticky notes in a 2x3 grid

**Pass criteria:**
- The sticky notes reposition into a 2-column, 3-row grid with consistent spacing
- The grid is visually aligned (columns have matching x-coordinates, rows have matching y)
- Original text and colors of the notes are preserved

### Test 7.9: Context Awareness — getBoardState

In **Window A**, with several objects on the board, type:

> How many objects are on the board?

**Pass criteria:**
- The AI response includes an accurate count of board objects
- The response may list object types (e.g., "3 sticky notes, 2 rectangles, 4 frames")
- This confirms the `getBoardState` tool is working and returning current board data

### Test 7.10: Chat History Persists After Refresh

After the previous tests, note the last few messages in the chat panel.
Hard-refresh **Window A** (F5 or Cmd+R). Sign back in if needed. Navigate to the board.
Open the AI chat panel.

**Pass criteria:**
- Previous chat messages are restored (both user messages and AI responses)
- The conversation is scrollable and shows the full history
- New messages can be sent and the conversation continues naturally

### Test 7.11: Second User Sees Chat History

In **Window B**, open the AI chat panel.

**Pass criteria:**
- Window B shows the same chat history as Window A
- Messages from Alice are attributed to her (display name or "User" label)
- AI responses are visible and complete

### Test 7.12: Second User Can Issue AI Commands

In **Window B**, type in the AI chat:

> Add a pink sticky note that says "Bob's idea"

**Pass criteria:**
- The AI processes Bob's command and creates the sticky note
- The new note appears in both Window A and Window B
- The chat in Window B shows Bob's message and the AI response
- Window A's chat panel (if open) also shows the new exchange

### Test 7.13: Concurrent AI Commands

In **Window A** and **Window B** simultaneously (within 2-3 seconds of each other), submit:

- Window A: "Create a red circle"
- Window B: "Create an orange rectangle"

**Pass criteria:**
- Both commands are processed (possibly sequentially at the Cloud Function)
- Both objects appear on the canvas in both windows
- Neither command causes an error or is dropped
- Chat history in both windows shows both exchanges

---

## Part B: LangSmith Observability Validation

These tests verify that AI interactions are properly traced in LangSmith.
Open the LangSmith dashboard at `https://smith.langchain.com` and navigate to the
project configured in the Cloud Function's `LANGCHAIN_PROJECT` env var.

### Test 7.14: LangSmith — Traces Appear for AI Commands

After running Tests 7.2-7.9 above, check the LangSmith dashboard.

**Pass criteria:**
- The Runs/Traces list shows new entries corresponding to the AI commands issued
- Each trace has a timestamp within the test session window
- Traces are tagged with the correct project name

### Test 7.15: LangSmith — Single-Step Trace Structure

Click into the trace for a single-step command (e.g., the "Add a yellow sticky note"
from Test 7.2).

**Pass criteria:**
- The trace shows a `streamText` (or equivalent) call as the root span
- Within the trace, there is a tool call span for the relevant tool (e.g., `createStickyNote`)
- The tool call shows input parameters: text, color, position
- The tool call shows a successful result
- The total latency is visible and reasonable (< 5s for single-step)

### Test 7.16: LangSmith — Multi-Step Trace Structure

Click into the trace for the SWOT analysis command (Test 7.7).

**Pass criteria:**
- The trace shows multiple tool call spans (at least 4, one per frame + sticky notes)
- Tool calls include a mix of `createFrame` and `createStickyNote` (or equivalent)
- The agentic loop is visible: LLM reasoning → tool call → tool result → more reasoning
- `maxSteps` was utilized (multiple LLM round-trips within one trace)
- Total latency is visible (expected 10-30s for a multi-step command)

### Test 7.17: LangSmith — Token Usage and Model Info

In any trace on the LangSmith dashboard, check the metadata.

**Pass criteria:**
- The model used is visible (e.g., `claude-sonnet-4-6`)
- Input and output token counts are recorded
- Token usage is reasonable for the command type (single-step < 2k tokens, multi-step < 10k)

### Test 7.18: LangSmith — Error Traces

In **Window A**, type an ambiguous or impossible command:

> Move the purple elephant to Mars

**Pass criteria:**
- The AI responds gracefully (explains it can't find a "purple elephant" or similar)
- No crash or unhandled error in the chat panel
- A trace appears in LangSmith for this interaction
- The trace may show a `getBoardState` tool call followed by a text-only response (no mutation tools called)
- The trace does NOT show an error/exception status (the AI handled it gracefully)

---

## Test Summary Format

```
## E2E Test Results — Phase 7: AI Board Agent

| # | Test Name                              | Result | Notes |
|---|----------------------------------------|--------|-------|
| 7.1  | Chat panel opens/closes             | PASS   |       |
| 7.2  | Single-step creation (sticky)       | PASS   |       |
| 7.3  | AI object syncs to second user      | PASS   |       |
| 7.4  | Single-step creation (shape)        | PASS   |       |
| 7.5  | Single-step manipulation (move)     | PASS   |       |
| 7.6  | Single-step manipulation (color)    | PASS   |       |
| 7.7  | Multi-step SWOT analysis            | PASS   |       |
| 7.8  | Multi-step grid layout              | PASS   |       |
| 7.9  | Context awareness (getBoardState)   | PASS   |       |
| 7.10 | Chat history persists (refresh)     | PASS   |       |
| 7.11 | Second user sees chat history       | PASS   |       |
| 7.12 | Second user issues AI command       | PASS   |       |
| 7.13 | Concurrent AI commands              | PASS   |       |
| 7.14 | LangSmith traces appear             | PASS   |       |
| 7.15 | LangSmith single-step structure     | PASS   |       |
| 7.16 | LangSmith multi-step structure      | PASS   |       |
| 7.17 | LangSmith token usage & model info  | PASS   |       |
| 7.18 | LangSmith error/graceful handling   | PASS   |       |

**Overall: X/18 passed**
```
