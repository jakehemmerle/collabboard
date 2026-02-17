# High-Level Implementation Plan

**Stack:** React + Konva.js, Firebase (Auth + Firestore Realtime), Bun, Claude AI

---

## Phase 1: Project Scaffolding & Dev Environment

**What:** Bootstrap a Bun-based React project with Konva.js and Firebase SDKs. Set up Firebase project (Auth, Firestore). Configure build/dev tooling. Set up deployment pipeline (Firebase Hosting or Vercel).

**Work:**

- `bun create` React app (Vite + React + TypeScript)
- Install deps: `react-konva`, `konva`, `firebase`. Always use `bun install` and never edit the file directly.
- Create Firebase project, enable Firestore and Anonymous/Google Auth
- Basic folder structure: `src/components`, `src/hooks`, `src/firebase`
- Deployment config (e.g. `vercel.json` or `firebase.json`)

**Acceptance criteria:**

- `bun dev` starts a dev server and blank page renders in browser
- `bun run build` succeeds with zero errors
- Firebase SDK initializes without errors (console log confirms connection)
- App deploys to a public URL showing a blank page

---

## Phase 2: Infinite Canvas with Pan/Zoom

**What:** Render a Konva `Stage` + `Layer` that supports infinite panning (click-drag on empty space) and zoom (scroll wheel), with a visible grid or background to confirm movement.

**Work:**

- Konva `Stage` filling the viewport
- Pan via mouse drag on empty canvas (track stage position offset)
- Zoom via scroll wheel (scale around cursor point)
- Background grid or dots that move with pan/zoom to give spatial feedback

**Acceptance criteria:**

- Open in browser: canvas fills window
- Click-drag on empty area pans the view
- Scroll wheel zooms in/out smoothly around cursor
- 60 FPS during pan/zoom (check via devtools)

**MVP items completed:** Infinite board with pan/zoom

---

## Phase 3: Local Object Creation & Manipulation (Sticky Notes + Shapes)

**What:** Add ability to create sticky notes and rectangles on the canvas, move them, select them, and edit sticky note text. All local state only—no sync yet.

**Work:**

- Toolbar UI: buttons for "Add Sticky Note", "Add Rectangle"
- Sticky note: colored rectangle with editable text (double-click to edit via HTML overlay textarea)
- Rectangle shape: solid colored rectangle, resizable via Konva transformer
- Select object on click, show transform handles
- Drag to move objects
- Local state array of board objects with id, type, x, y, width, height, text, color

**Acceptance criteria:**

- Can create sticky notes and rectangles from toolbar
- Can click to select, drag to move
- Can double-click sticky note to edit text
- Can resize via transform handles
- Objects persist in local state across interactions (not across refresh)

**MVP items completed:** Sticky notes with editable text, At least one shape type (rectangle), Create/move/edit objects

---

## Phase 4: Firebase Auth

**What:** Add user authentication. Support Google sign-in (and optionally anonymous). Gate the board behind auth. Store user display name and ID for presence/cursors.

**Work:**

- Firebase Auth setup (Google provider)
- Login screen / button
- Auth context/provider in React
- Store `{ uid, displayName, photoURL }` in app state
- Redirect unauthenticated users to login

**Acceptance criteria:**

- User sees login screen on first visit
- Google sign-in works, user lands on the board
- Refresh preserves auth session
- User display name is available in app state

**MVP items completed:** User authentication

---

## Phase 5: Real-Time Object Sync via Firestore

**What:** Persist board objects to Firestore and subscribe to real-time updates. When any user creates/moves/edits an object, all other users see it instantly.

**Work:**

- Firestore collection: `boards/{boardId}/objects/{objectId}`
- On object create/move/edit → write to Firestore
- `onSnapshot` listener on the objects collection → update local state
- Last-write-wins conflict resolution (Firestore timestamps)
- Board ID from URL param (e.g. `/board/:id`)

**Acceptance criteria:**

- Open two browser windows with same board URL
- Create a sticky note in window A → appears in window B within ~100ms
- Move an object in window B → moves in window A
- Edit sticky note text → syncs to other window
- Refresh either window → all objects still there (persistence)

**MVP items completed:** Real-time sync between 2+ users

---

## Phase 6: Multiplayer Cursors & Presence

**What:** Show other users' cursors in real-time with name labels. Show a list of online users (presence awareness).

**Work:**

- Firestore (or Realtime DB) document per user for cursor position: `boards/{boardId}/cursors/{uid}`
- Throttled cursor position updates on `mousemove` (~50ms interval)
- Render other users' cursors as colored arrows/circles + name label on the Konva stage
- Presence: use Firebase Realtime DB `.info/connected` + `onDisconnect` to track online/offline
- UI component showing list of online users (avatars/names)

**Acceptance criteria:**

- Open two browser windows, logged in as different users
- Move mouse in window A → cursor with name visible in window B (and vice versa)
- Cursor latency < 50ms on local network
- Online users list shows both users
- Close one window → that user disappears from presence list within a few seconds

**MVP items completed:** Multiplayer cursors with name labels, Presence awareness (who's online)

---

## Phase 7: Deployment & MVP Verification

**What:** Deploy the full app publicly. Run through all MVP acceptance criteria end-to-end with two real users on different machines/networks.

**Work:**

- Production build + deploy
- Firebase security rules (authenticated reads/writes only)
- Test all MVP items on the deployed URL
- Fix any deployment-specific issues (CORS, env vars, etc.)

**MVP items completed:** Deployed and publicly accessible

**Acceptance criteria (full MVP verification):**

- [ ] Infinite board with pan/zoom works
- [ ] Sticky notes with editable text
- [ ] Rectangle shape type
- [ ] Create, move, and edit objects
- [ ] Real-time sync between 2+ users
- [ ] Multiplayer cursors with name labels
- [ ] Presence awareness (who's online)
- [ ] User authentication
- [ ] Deployed and publicly accessible

---

## Summary

| Phase | Focus | Verification |
|-------|-------|-------------|
| 1 | Scaffolding & deploy pipeline | `bun dev` runs, blank page deploys |
| 2 | Infinite canvas pan/zoom | Manual browser test, 60 FPS |
| 3 | Local objects (sticky notes + rectangles) | Create, move, edit, select locally |
| 4 | Firebase Auth | Google sign-in, session persists |
| 5 | Real-time object sync | Two windows sync creates/moves/edits |
| 6 | Cursors & presence | Two users see each other's cursors + online list |
| 7 | Deploy & MVP verification | Full checklist passes on public URL |
