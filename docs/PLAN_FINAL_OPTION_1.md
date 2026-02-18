# CollabBoard: Post-MVP Implementation Plan

## Context

The MVP is complete: sticky notes, rectangles, single selection, real-time Firestore sync, multiplayer cursors, presence, and auth all work. The remaining COLLABBOARD_CORE.md requirements fall into six areas: new object types, selection/transforms, object operations, connectors/frames, an AI board agent, and performance hardening. This plan organizes the work into 6 epics (20 stories) with clear dependency ordering.

## Architecture Notes

**Existing patterns every story follows:**
- Object types: discriminated union in `contracts.ts` (`BoardObjectType`, `BoardObject`, `ObjectIntent`)
- Intent processing: `intent-handler.ts` switch-case per intent kind
- In-memory store: `object-store.ts` Map-based CRUD
- Rendering: `ObjectLayer.tsx` conditional per `obj.type`, each type gets a `*Shape.tsx` component
- React bridge: `useObjects.ts` hook via `useSyncExternalStore`
- Sync: `applyLocal()` → Firestore write → remote `onSnapshot` → `applyRemote()` with echo suppression
- Module communication: `getModuleApi<T>(moduleId)` service locator

**Key files touched across multiple stories:**
- `apps/web/src/modules/objects/contracts.ts` — type definitions (every epic)
- `apps/web/src/modules/objects/domain/intent-handler.ts` — business logic (every epic)
- `apps/web/src/modules/objects/ui/ObjectLayer.tsx` — rendering dispatch (Epics 1, 4)
- `apps/web/src/modules/objects/ui/useObjects.ts` — React hook (Epics 1–5)
- `apps/web/src/modules/objects/ui/Toolbar.tsx` — toolbar UI (Epics 1–4)
- `apps/web/src/app/pages/BoardPage.tsx` — page composition (Epics 1–5)

---

## Dependency Graph

```
Epic 0 ─── Story 0.1 (test setup)
              │
   ┌──────────┼──────────┐
   │          │          │
Story 1.1  Story 1.2  Story 1.3    ← Epic 1 (parallel)
(circle)   (line)     (text)
   │          │          │
   └──────────┼──────────┘
              │
         Story 2.1 (multi-select)
              │
         Story 2.2 (resize handles)
              │
         Story 2.3 (rotate)
              │
   ┌──────────┴──────────┐
   │                      │
Epic 3 (operations)    Epic 4 (connectors/frames)  ← parallel tracks
3.1 → 3.2 → 3.3       4.1 → 4.2
   │                      │
   └──────────┬──────────┘
              │
         Epic 5 (AI agent)
     5.1 → 5.2 → 5.3
              ╱ ╲
           5.4   5.5     ← parallel
              ╲ ╱
         Epic 6 (perf)
     6.1 → 6.2 → 6.3
```

---

## Epic 0: Testing Infrastructure

**Branch:** `feat/test-infrastructure`

> Establish a test harness so every subsequent story ships with tests.

### Story 0.1 — Test Setup (Vitest)

**Implements:** Vitest configuration, baseline unit tests for existing domain logic.

**Files:**
- `apps/web/vitest.config.ts` (new) — vitest config
- `apps/web/package.json` (modified) — add `vitest` devDep, `"test"` and `"test:watch"` scripts
- `apps/web/src/modules/objects/__tests__/object-store.test.ts` (new)
- `apps/web/src/modules/objects/__tests__/intent-handler.test.ts` (new)
- `apps/web/src/modules/viewport/__tests__/camera.test.ts` (new) — tests for `screenToWorld`, `worldToScreen`, `zoomAt`

**Dependencies:** None

**Acceptance Criteria:**
- [ ] `bun run test` executes vitest and passes
- [ ] `object-store.ts` has tests for add, get, remove, update, hydrate
- [ ] `intent-handler.ts` has tests for create-sticky, create-rectangle, move, resize, delete
- [ ] `camera.ts` has tests for coordinate conversions at various zoom levels
- [ ] CI pipeline updated to run tests

---

## Epic 1: New Object Types (Circle, Line, Text)

**Branch:** `feat/new-object-types`

> Extend the discriminated-union pattern with three new shape types. Each follows the identical 7-file pattern established by sticky notes and rectangles.

### Story 1.1 — Circle Shape

**Implements:** Circle objects with fill, stroke, radius. Rendered via `<Circle>` from react-konva.

**Files:**
- `objects/contracts.ts` — add `'circle'` to `BoardObjectType`, add `CircleObject` interface (fill, stroke, strokeWidth), add `'create-circle'` intent
- `objects/domain/intent-handler.ts` — add `case 'create-circle'`, extend `update-color` for circles
- `objects/ui/CircleShape.tsx` (new) — `React.memo` component: `<Group>` + `<Circle>` + selection border
- `objects/ui/ObjectLayer.tsx` — add `obj.type === 'circle'` branch
- `objects/ui/useObjects.ts` — add `createCircle` action creator
- `objects/ui/Toolbar.tsx` — add Circle button
- `BoardPage.tsx` — wire circle creation
- `objects/__tests__/intent-handler.test.ts` — add circle tests

**Design note:** Circles use `width`/`height` from the base interface for bounding-box math. Visual radius = `Math.min(width, height) / 2`. This keeps resize/selection uniform across types.

**Dependencies:** Story 0.1

### Story 1.2 — Line Shape

**Implements:** Freestanding line segments (NOT connectors — no object references). Defined by start point (`x`, `y`) and end offset (`x2`, `y2`).

**Files:**
- `objects/contracts.ts` — add `'line'` to `BoardObjectType`, add `LineObject` interface (x2, y2, stroke, strokeWidth), add `'create-line'` intent
- `objects/domain/intent-handler.ts` — add `case 'create-line'`
- `objects/ui/LineShape.tsx` (new) — `<Line>` with two points, wider invisible hit area for selection
- `objects/ui/ObjectLayer.tsx` — add line branch
- `objects/ui/useObjects.ts` — add `createLine`
- `objects/ui/Toolbar.tsx` — add Line button
- `BoardPage.tsx` — wire line creation
- `objects/__tests__/intent-handler.test.ts` — add line tests

**Design note:** `move` intent translates both endpoints. A future `move-endpoint` intent could allow dragging individual endpoints — out of scope here.

**Dependencies:** Story 0.1

### Story 1.3 — Text Element

**Implements:** Standalone text objects (independent from sticky notes). Editable via double-click using the existing `TextEditor` overlay.

**Files:**
- `objects/contracts.ts` — add `'text'` to `BoardObjectType`, add `TextObject` interface (text, fontSize, fontFamily, fill), add `'create-text'` intent
- `objects/domain/intent-handler.ts` — add `case 'create-text'`, extend `update-text` to support `type === 'text'`
- `objects/ui/TextShape.tsx` (new) — `<Text>` from react-konva with selection border
- `objects/ui/TextEditor.tsx` — generalize to accept both `TextObject` and `StickyNote`
- `objects/ui/ObjectLayer.tsx` — add text branch
- `objects/ui/useObjects.ts` — add `createText`
- `objects/ui/Toolbar.tsx` — add Text button
- `BoardPage.tsx` — wire text creation, double-click editing for text elements
- `objects/__tests__/intent-handler.test.ts` — add text tests

**Dependencies:** Story 0.1

### Epic 1 Acceptance Criteria
- [x] Circles, lines, and text elements are creatable from the toolbar
- [x] All three types are draggable, selectable (blue dashed border), and deletable
- [x] All three sync in real-time between users via Firestore
- [x] Color changes work for circles (fill) and lines (stroke)
- [x] Text elements are editable via double-click (reuses TextEditor)
- [x] Each type has unit tests for intent-handler cases
- [x] Typecheck and build pass

---

## Epic 2: Selection & Transform System

**Branch:** `feat/selection-transforms`

> Replace single selection with multi-select, add visual resize handles and rotation.

### Story 2.1 — Multi-Select

**Implements:** Replace `selectedId: string | null` with `selectedIds: string[]`. Add shift-click toggle. Add rubber-band (drag-to-select) box on empty canvas.

**Files:**
- `objects/contracts.ts` — change `ObjectsState.selectedId` to `selectedIds: string[]`, update `ObjectsApi`: replace `select()` with `select(ids)`, add `toggleSelect(id)`, `selectAll()`, `deselectAll()`
- `objects/index.ts` — update selection state from single ID to array
- `objects/ui/useObjects.ts` — expose `selectedIds`, `toggleSelect`, `selectAll`, `deselectAll`
- `objects/ui/SelectionBox.tsx` (new) — transparent `<Rect>` drawn during drag, computes AABB intersection with object bounding boxes
- `BoardPage.tsx` — shift-click logic, rubber-band mouse handlers, update toolbar/delete to work on multiple objects. Stage click deselects only if no shift held.
- Shape components — `isSelected` prop stays boolean (computed per-object by parent)
- `objects/__tests__/multi-select.test.ts` (new)

**Design note:** Rubber-band uses `screenToWorld` from the viewport module. Object intersection is a simple AABB test. All bulk operations (delete, color change) iterate over `selectedIds`.

**Dependencies:** Stories 1.1, 1.2, 1.3 (all types should exist so multi-select covers them)

### Story 2.2 — Resize Handles

**Implements:** 8 resize handles (4 corners + 4 edge midpoints) around the selected object(s) bounding box. Dragging a handle fires a resize intent.

**Files:**
- `objects/domain/geometry.ts` (new) — pure functions: `getBoundingBox(objects)`, `computeResize(handle, delta, originalBounds)`, enforces min size (20x20)
- `objects/ui/TransformHandles.tsx` (new) — renders 8 `<Rect>` handles with drag handlers, computes new x/y/width/height per handle direction
- `BoardPage.tsx` — render `TransformHandles` when selection non-empty
- `objects/__tests__/geometry.test.ts` (new) — bounding box and resize math tests

**Dependencies:** Story 2.1

### Story 2.3 — Rotate Objects

**Implements:** `rotation` property on `BoardObjectBase` (default 0). Rotate handle (circle above top-center of selection). All shape `<Group>` elements receive `rotation` prop.

**Files:**
- `objects/contracts.ts` — add `rotation?: number` to `BoardObjectBase`, add `'rotate'` intent
- `objects/domain/intent-handler.ts` — add `case 'rotate'`
- `objects/domain/geometry.ts` — add `computeRotation(center, mousePos)` using `Math.atan2`
- `objects/ui/TransformHandles.tsx` — add rotation handle above top-center
- All shape components — add `rotation={obj.rotation ?? 0}` to outer `<Group>`
- `objects/ui/useObjects.ts` — add `rotateObject` action creator
- `objects/__tests__/geometry.test.ts` — rotation math tests

**Dependencies:** Story 2.2

### Epic 2 Acceptance Criteria
- [ ] Shift-click toggles objects in/out of selection
- [ ] Rubber-band drag on empty canvas selects contained objects
- [ ] 8 resize handles appear and correctly resize via drag
- [ ] Rotation handle rotates objects around bounding-box center
- [ ] Multi-object delete and color change work
- [ ] All transform math has unit tests
- [ ] Works for all object types (sticky, rectangle, circle, line, text)

---

## Epic 3: Object Operations

**Branch:** `feat/object-operations`

> Duplicate, copy/paste, and keyboard shortcuts. Can run in **parallel** with Epic 4.

### Story 3.1 — Duplicate Objects

**Implements:** Duplicate selected objects with +20/+20 offset, new IDs. Toolbar button + Cmd/Ctrl+D shortcut.

**Files:**
- `objects/contracts.ts` — add `'duplicate'` intent kind (accepts `objectIds: string[]`)
- `objects/domain/intent-handler.ts` — add `case 'duplicate'`: clone each object with new ID + offset
- `objects/ui/useObjects.ts` — add `duplicateObjects`
- `objects/ui/Toolbar.tsx` — add Duplicate button (visible when selection non-empty)
- `BoardPage.tsx` — wire duplicate, add Cmd+D handler
- `objects/__tests__/intent-handler.test.ts` — duplicate tests

**Dependencies:** Story 2.1

### Story 3.2 — Copy & Paste

**Implements:** Cmd+C copies selected objects to in-memory clipboard. Cmd+V pastes at viewport center with new IDs.

**Files:**
- `objects/domain/clipboard.ts` (new) — module-scoped `clipboard: BoardObject[]`, `copy(objects)` and `paste(viewportCenter)` functions
- `objects/ui/useObjects.ts` — add `copySelection`, `pasteAtCenter`
- `BoardPage.tsx` — add Cmd+C / Cmd+V handlers
- `objects/__tests__/clipboard.test.ts` (new) — copy/paste logic tests

**Dependencies:** Story 3.1 (shares cloning logic)

### Story 3.3 — Keyboard Shortcuts

**Implements:** Centralized keyboard shortcut hook. Delete/Backspace deletes, Cmd+A selects all, Escape deselects, consolidates Cmd+D/C/V from prior stories.

**Files:**
- `shared/hooks/useKeyboardShortcuts.ts` (new) — shortcut map hook, handles preventDefault for overridden browser defaults
- `BoardPage.tsx` — replace inline keyboard handlers with `useKeyboardShortcuts`

**Dependencies:** Stories 3.1, 3.2

### Epic 3 Acceptance Criteria
- [ ] Cmd+D duplicates selected objects with visual offset
- [ ] Cmd+C / Cmd+V copies and pastes objects at viewport center
- [ ] Delete/Backspace removes selected objects
- [ ] Cmd+A selects all, Escape deselects
- [ ] All operations sync in real-time between users
- [ ] Keyboard shortcuts don't fire when editing text (TextEditor focused)

---

## Epic 4: Connectors & Frames

**Branch:** `feat/connectors-frames`

> More complex object types with object-to-object relationships. Can run in **parallel** with Epic 3.

### Story 4.1 — Connectors

**Implements:** Arrow/line connectors referencing `sourceId` and `targetId`. Endpoints update when connected objects move. Click-source-then-click-target creation workflow.

**Files:**
- `objects/contracts.ts` — add `'connector'` to `BoardObjectType`, `ConnectorObject` interface (sourceId, targetId, style: `'arrow' | 'line'`, stroke, strokeWidth), add `'create-connector'` intent
- `objects/domain/intent-handler.ts` — add `case 'create-connector'`
- `objects/domain/connector-routing.ts` (new) — pure function: `computeConnectorEndpoints(source, target)` — center-to-center line intersected with bounding box edges
- `objects/ui/ConnectorShape.tsx` (new) — reads source/target from objects list, renders `<Arrow>` or `<Line>`, handles dangling endpoint if target deleted
- `objects/ui/ObjectLayer.tsx` — render connectors in a separate pass (below objects for z-order)
- `objects/ui/Toolbar.tsx` — add Connector button (toggles connector creation mode)
- `BoardPage.tsx` — connector creation mode: first click = source, second click = target
- `objects/__tests__/connector-routing.test.ts` (new) — endpoint computation tests

**Design note:** Connectors re-render reactively when connected objects move because the entire objects array triggers a re-render. No special move-tracking needed — React handles it.

**Dependencies:** Stories 1.1–1.3, Story 2.1

### Story 4.2 — Frames

**Implements:** Frame objects that visually group content. Moving a frame moves its children. Children computed on drop (objects whose center falls within frame bounds).

**Files:**
- `objects/contracts.ts` — add `'frame'` to `BoardObjectType`, `FrameObject` interface (title, fill, children: string[]), add `'create-frame'` and `'update-frame-children'` intents
- `objects/domain/intent-handler.ts` — add `case 'create-frame'`, extend `case 'move'` to also move children when the moved object is a frame
- `objects/domain/frame-logic.ts` (new) — pure functions: `findObjectsInBounds(objects, bounds)`, `computeFrameAutoSize(childObjects)`
- `objects/ui/FrameShape.tsx` (new) — `<Rect>` with dashed border + title `<Text>` above, subtle background fill
- `objects/ui/ObjectLayer.tsx` — render frames first (behind all other objects)
- `objects/ui/useObjects.ts` — add `createFrame`
- `objects/ui/Toolbar.tsx` — add Frame button
- `BoardPage.tsx` — wire frame creation, recompute children on frame drag-end
- `objects/__tests__/frame-logic.test.ts` (new) — containment and auto-size tests

**Design note:** `children` is persisted to Firestore so all users see consistent grouping. Recomputed on frame drop via AABB center-point test.

**Dependencies:** Stories 1.1–1.3, Story 2.1

### Epic 4 Acceptance Criteria
- [ ] Connectors visually link two objects with an arrow or line
- [ ] Connector endpoints update when connected objects move
- [ ] Click-source → click-target creation flow works
- [ ] Dangling connectors render gracefully when a target is deleted
- [ ] Frames render as labeled containers behind objects
- [ ] Moving a frame moves its contained objects
- [ ] Frame children recompute on drop
- [ ] Both types sync in real-time
- [ ] Pure routing/containment logic has unit tests

---

## Epic 5: AI Board Agent

**Branch:** `feat/ai-agent`

> Chat-based AI agent using Claude via the **Vercel AI SDK** with **LangSmith** observability. Firebase Cloud Function v2 proxies LLM calls (keeps API key server-side). Tool execution happens server-side using Firebase Admin SDK to write directly to Firestore — all clients see changes via their existing `onSnapshot` listeners.

### Tech Stack for Epic 5

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend chat hook | `@ai-sdk/react` → `useChat` | Streaming UI, message state, tool call rendering for free |
| Backend LLM calls | `ai` + `@ai-sdk/anthropic` → `streamText` | Type-safe tool definitions, agentic `maxSteps` loop, SSE streaming |
| API proxy | Firebase Cloud Function v2 (HTTP, direct URL) | Streaming via direct function URL (not Hosting rewrite), hides API key, Firebase Admin access |
| Tool execution | Server-side via Firebase Admin SDK | Tools read/write Firestore directly; changes propagate to all clients via existing sync |
| Observability | `langsmith` + `wrapAISDK` | Traces every LLM call, tool execution, and latency in LangSmith dashboard |

### Architecture Decision: Server-Side Tool Execution

Tools execute **server-side** in the Cloud Function, not client-side. Reasons:
1. The Cloud Function has Firebase Admin access — it can read/write `boards/{boardId}/objects` directly
2. All clients already have `onSnapshot` listeners on the objects collection — they see AI-created objects instantly via the existing sync pipeline
3. No need to shuttle tool calls and results between client and server — the agentic loop (`maxSteps`) runs entirely within the Cloud Function
4. `getBoardState` reads directly from Firestore (source of truth) rather than a stale client snapshot
5. Simpler client code — `useChat` just displays streamed text, no tool execution logic needed

### Streaming Architecture: Direct Function URL (Critical)

**Do NOT route `useChat` through Firebase Hosting rewrites.** Hosting buffers the entire response before forwarding, which completely breaks SSE streaming — the client sees nothing until the LLM finishes.

Instead, `useChat` must call the **direct Cloud Function URL** (e.g., `https://us-central1-<project>.cloudfunctions.net/aiChat`). This URL is stored in `VITE_AI_FUNCTION_URL` and configured per environment.

The Cloud Function uses `cors: true` in its `onRequest` options to allow cross-origin requests from the Firebase Hosting domain.

### Story 5.1 — AI Agent Scaffold

**Implements:** New `ai-agent` module skeleton — contracts, Vercel AI SDK tool definitions, server-side tool executor (no LLM wiring yet).

**Files:**
- `modules/ai-agent/contracts.ts` (new) — `AiAgentApi` interface (minimal: `{ boardId: string } → useChat handles the rest`), config types
- `modules/ai-agent/index.ts` (new) — module registration, exports `AI_AGENT_MODULE_ID`
- `firebase/functions/` (new directory) — Cloud Function project scaffold
- `firebase/functions/package.json` (new) — deps: `ai`, `@ai-sdk/anthropic`, `langsmith`, `firebase-admin`, `firebase-functions`
- `firebase/functions/src/tools/tool-definitions.ts` (new) — Vercel AI SDK `tool()` definitions for all 9 spec tools: `createStickyNote`, `createShape`, `createFrame`, `createConnector`, `moveObject`, `resizeObject`, `updateText`, `changeColor`, `getBoardState`. Each tool has a Zod input schema and an `execute` function that reads/writes Firestore via Admin SDK.
- `firebase/functions/src/tools/tool-executor.ts` (new) — shared logic: maps tool params → Firestore document writes. Pure functions for computing object defaults (colors, sizes, positions).
- `firebase/functions/src/tools/__tests__/tool-executor.test.ts` (new) — unit tests for tool parameter → Firestore document mapping (mock Firestore)
- `app/composition-root.ts` — register ai-agent module

**Design note:** Tool definitions use Vercel AI SDK's `tool()` helper with Zod schemas for type-safe parameter validation. The `execute` function on each tool writes to Firestore using Firebase Admin. This keeps all board mutation logic server-side and tested independently of the LLM.

**Dependencies:** Epics 3 & 4 complete (all object types exist for tool schema)

### Story 5.2 — AI Chat UI

**Implements:** Slide-out chat panel on the board using `useChat` from `@ai-sdk/react`. Streaming responses render incrementally.

**Files:**
- `apps/web/package.json` — add deps: `ai`, `@ai-sdk/react`
- `modules/ai-agent/ui/AiChatPanel.tsx` (new) — toggle panel with:
  - `useChat({ api: import.meta.env.VITE_AI_FUNCTION_URL, body: { boardId } })` for message state + submission
  - Scrollable message list with auto-scroll to bottom
  - Text input at bottom with submit button
  - Processing/streaming indicator from `useChat`'s `isLoading` state
  - Toggle button (floating, bottom-right or side) to open/close
- `modules/ai-agent/ui/AiMessageBubble.tsx` (new) — renders a single message. User messages right-aligned, assistant left-aligned. Shows user display name and relative timestamp.
- `apps/web/src/core/env.ts` — add `VITE_AI_FUNCTION_URL` to env schema
- `BoardPage.tsx` — add `<AiChatPanel boardId={boardId} />` to layout

**Design note:** `useChat` manages all message state, streaming, and error handling. No custom `useSyncExternalStore` hook needed — the Vercel AI SDK provides this for free. The `api` URL points to the Cloud Function endpoint.

**Dependencies:** Story 5.1

### Story 5.3 — AI LLM Integration

**Implements:** The Cloud Function that calls Claude via `streamText` from the Vercel AI SDK with the tool definitions from 5.1. Includes LangSmith tracing.

**Files:**
- `firebase/functions/src/ai-chat.ts` (new) — Firebase Cloud Function v2 HTTP handler:
  ```typescript
  export const aiChat = onRequest(
    { cors: true, timeoutSeconds: 300, memory: '512MiB' },
    async (req, res) => {
      const { messages, boardId } = req.body;
      const tools = toolDefinitions(db, boardId);
      const result = streamText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: systemPrompt,
        messages,
        tools,
        maxSteps: 10,
      });
      result.pipeUIMessageStreamToResponse(res);
    }
  );
  ```
  Key config: `cors: true` (required since client calls direct URL, not Hosting rewrite), `timeoutSeconds: 300` (agentic loops with 10 steps can take 30s+), `memory: '512MiB'` (LLM response buffering).
- `firebase/functions/src/observability.ts` (new) — LangSmith setup:
  - Import `wrapAISDK` from `langsmith/wrappers/vercel`
  - Wrap `streamText` for automatic tracing of LLM calls, tool invocations, and token usage
  - Configure via `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT` env vars on the Cloud Function
- `firebase/functions/src/system-prompt.ts` (new) — system prompt constant describing coordinate system, available tools, layout math guidance
- `firebase/firebase.json` — add `functions` config pointing to `firebase/functions/`. **Do NOT add a hosting rewrite** for the AI endpoint — this would break streaming.
- `modules/ai-agent/index.ts` — configure the Cloud Function URL for `useChat`'s `api` parameter (reads from env: `VITE_AI_FUNCTION_URL`)
- `apps/web/.env.example` — add `VITE_AI_FUNCTION_URL`

**LangSmith integration pattern:**
```typescript
import { wrapAISDK } from 'langsmith/wrappers/vercel';
import { streamText as baseStreamText } from 'ai';
const streamText = wrapAISDK(baseStreamText);
// Now all streamText calls are automatically traced in LangSmith
```

**Key architecture:**
- `maxSteps: 10` enables the agentic loop — Claude calls tools, gets results, continues reasoning, calls more tools, until it produces a final text response
- Each tool's `execute` function writes to Firestore via Admin SDK → all clients see changes via `onSnapshot`
- LangSmith traces the full conversation: user message → LLM reasoning → tool calls → tool results → final response
- The Cloud Function streams via `pipeUIMessageStreamToResponse(res)` (AI SDK 6.x Node.js method) — `useChat` on the client consumes this automatically
- **Do not** add a Firebase Hosting rewrite for this endpoint — Hosting buffers responses and breaks streaming

**Dependencies:** Story 5.2

### Story 5.4 — AI Shared State

**Implements:** Persist AI chat history per board in Firestore so all users see the conversation and can continue it.

**Files:**
- `firebase/functions/src/ai-chat.ts` — after streaming completes, persist the full message exchange to Firestore subcollection `boards/{boardId}/ai-messages`
- `modules/ai-agent/infrastructure/chat-sync.ts` (new) — Firestore real-time listener on `boards/{boardId}/ai-messages`, hydrates `useChat`'s `initialMessages` on board entry
- `modules/ai-agent/ui/AiChatPanel.tsx` — pass `initialMessages` from chat-sync to `useChat`
- `firebase/firestore.rules` — add rules for `ai-messages` subcollection (same membership-based access as objects)

**Design note:** `useChat` accepts `initialMessages` for hydration. On board enter, we fetch existing chat history from Firestore and pass it in. New messages from the current user stream in real-time via `useChat`; messages from other users appear via the Firestore listener.

**Dependencies:** Story 5.3

### Story 5.5 — AI Complex Commands

**Implements:** Refined system prompt for multi-step commands (SWOT, journey maps, grids, retrospectives). Enhanced `getBoardState` tool for context-aware reasoning.

**Files:**
- `firebase/functions/src/system-prompt.ts` — expand system prompt with:
  - Coordinate system documentation (origin, positive directions, typical viewport size)
  - Layout math instructions (grid spacing formulas, centering, padding)
  - Template examples: SWOT (4 frames + sticky notes), user journey (5 stages), retrospective (3 columns)
  - Instructions for using `getBoardState` before manipulation commands
- `firebase/functions/src/tools/tool-definitions.ts` — enhance `getBoardState` tool: serialize objects with positions, types, colors, text into a concise summary that fits in context
- `firebase/functions/src/tools/__tests__/tool-executor.test.ts` — add tests for `getBoardState` serialization format
- `firebase/functions/src/system-prompt.test.ts` (new) — snapshot test to catch accidental prompt changes

**Dependencies:** Story 5.3 (parallel with 5.4)

### Epic 5 Acceptance Criteria
- [ ] Chat panel opens/closes on the board with a toggle button
- [ ] Users can type natural language commands and see **streamed** responses
- [ ] AI creates sticky notes, shapes, frames, connectors on the board
- [ ] AI moves, resizes, recolors existing objects
- [ ] "Create a SWOT analysis" produces 4 labeled quadrants with sticky notes
- [ ] "Arrange in a grid" aligns elements with consistent spacing
- [ ] Multi-step commands (e.g., retrospective board) execute sequentially via `maxSteps`
- [ ] All users see AI-created board changes in real-time (via existing Firestore sync)
- [ ] Chat history persists — reloading the page shows previous AI conversation
- [ ] Multiple users can issue AI commands without conflict
- [ ] API key is not exposed client-side (Cloud Function proxy)
- [ ] All LLM calls, tool invocations, and latencies traced in LangSmith
- [ ] AI response latency <2s for single-step commands

---

## Epic 6: Performance & Polish

**Branch:** `perf/performance-polish`

> Optimize for 500+ objects, 5+ users, 60fps targets.

### Story 6.1 — Viewport Culling

**Implements:** Only render objects within the visible viewport. Memoize filtered list.

**Files:**
- `objects/domain/viewport-culling.ts` (new) — `getVisibleObjects(objects, cameraBounds)` — AABB intersection filter
- `objects/ui/useObjects.ts` — add `useVisibleObjects(camera)` hook
- `BoardPage.tsx` — apply culling before rendering ObjectLayer
- `sync/infrastructure/firestore-sync.ts` — batch writes within 50ms window

**Dependencies:** All prior epics

### Story 6.2 — Cursor Optimization

**Implements:** Throttle cursor broadcasts, cull off-screen cursors, verify RTDB performance with 5+ users.

**Files:**
- `presence/infrastructure/rtdb-presence.ts` — review/optimize publish frequency
- `presence/ui/CursorLayer.tsx` — filter cursors to visible viewport

**Dependencies:** Story 6.1

### Story 6.3 — Integration Tests

**Implements:** Integration tests verifying cross-module interactions.

**Files:**
- `objects/__tests__/integration.test.ts` (new) — full intent → store → serialization cycle
- `ai-agent/__tests__/tool-executor-integration.test.ts` (new) — AI tool calls producing correct board state

**Dependencies:** All prior stories

### Epic 6 Acceptance Criteria
- [ ] 60fps maintained with 500 objects during pan/zoom (manual test)
- [ ] 5 concurrent users see smooth cursors
- [ ] Firestore writes batched during rapid drag
- [ ] Integration tests pass
- [ ] Build + typecheck + lint + test all green

---

## Verification Plan

After each epic, verify:
1. `bun run typecheck` — no type errors
2. `bun run lint` — no lint errors
3. `bun run test` — all tests pass
4. `bun run build` — production build succeeds
5. Manual two-browser sync test — objects, cursors, presence all work
6. (After Epic 5) Test AI commands from two browsers simultaneously
7. (After Epic 5) Verify LangSmith dashboard shows traces for LLM calls and tool executions
8. (After Epic 6) Load test with 500+ objects, measure FPS via Chrome DevTools

## Story Count Summary

| Epic | Stories | Parallel? |
|------|---------|-----------|
| 0. Testing Infrastructure | 1 | — |
| 1. New Object Types | 3 | All three parallel |
| 2. Selection & Transforms | 3 | Sequential |
| 3. Object Operations | 3 | Sequential (parallel with Epic 4) |
| 4. Connectors & Frames | 2 | Sequential (parallel with Epic 3) |
| 5. AI Agent | 5 | 5.4 and 5.5 parallel |
| 6. Performance & Polish | 3 | Sequential |
| **Total** | **20** | |

## Key Dependencies (install via `bun add`)

**Epic 0 — `apps/web/`:**
```bash
cd apps/web && bun add -d vitest
```

**Epic 5 — `apps/web/`:**
```bash
cd apps/web && bun add ai @ai-sdk/react
```

**Epic 5 — `firebase/functions/` (new package):**
```bash
cd firebase/functions && bun add ai @ai-sdk/anthropic langsmith zod firebase-admin firebase-functions
```

Sources referenced during planning:
- [Vercel AI SDK docs](https://ai-sdk.dev/docs/introduction)
- [LangSmith + Vercel AI SDK integration](https://docs.langchain.com/langsmith/trace-with-vercel-ai-sdk)
- [AI SDK observability: LangSmith](https://ai-sdk.dev/providers/observability/langsmith)
