# CollabBoard MVP Implementation Plan (Codex)

Stack decisions reflected here: `Konva.js + Firebase + Bun`, with Claude integrated after MVP hard gate stability.

## Phase 0: Project Scaffold

### Tasks

- Review which CLI tools are already installed, how they were installed,and what their versions are (`bun`, `node`, `firebase-tools`, `docker`, `docker compose`, `git`).
- Research the preferred way to install or update them, and then install or upgrade required CLI tools and document the bootstrap flow.
- Initialize Bun workspace with TypeScript and lint/format scripts.
- Create React app shell and integrate a baseline Konva stage.
- Configure Firebase project files and local emulator settings (Auth, Firestore, RTDB).
- Spin up local Firebase emulator and confirm startup (`auth`, `firestore`, `database`).
- Implement environment variable loading and `.env.example`.
- Add `Dockerfile` and `docker-compose.yml` for reproducible local startup.
- Add CI skeleton to Github for install, typecheck, build, and test commands.
<!-- - Make sure main branch CI works and passes. The `gh` CLI tool is available. -->

### Acceptance Criteria

- Required CLI tools are installed and meet pinned versions on a fresh machine.
- App boots locally and renders a baseline board page.
- Build pipeline commands execute without errors.
- Firebase emulator config is committed and usable.

### Verification

- Run `bun --version`, `node --version`, `firebase --version`, `docker --version`, `docker compose version`, and `git --version`.
- Run `bun install`.
- Run `bun run typecheck`.
- Run `bun run build`.
- Run Firebase emulators and confirm startup (`auth`, `firestore`, `database`).
- Run `docker compose up --build` and confirm app loads in browser.

## Phase 1: Auth + Board Access

### Tasks

- Implement Firebase Auth provider setup (Google OAuth only).
- Build sign-in/sign-out flows and an authenticated app shell.
- Add board route model (`/board/:id`) with create and join behavior.
- Define board membership schema (`owner` plus collaborators) tied to auth `uid`.
- Add a permissions module with explicit capabilities and role-to-capability mapping.
- Implement Firestore security rules for board and object access by membership.
- Implement RTDB security rules for cursor/presence access using the same capability model.
- Add route guards and explicit unauthorized-state UI.
- Persist user display name metadata for cursor labels and presence.

### Acceptance Criteria

- Users can sign in, create a board, and re-open it later.
- Unauthorized users cannot read or write private board data.
- Session state persists across reloads.

### Verification

- Manual sign-in/sign-out test in browser.
- Test with second account: denied without membership, allowed once membership is granted.
- Run Firebase emulator rule tests (or scripted access checks).

## Phase 2: Infinite Board Foundation

### Tasks

- Implement Konva stage with camera state (`x`, `y`, `scale`) for a virtually infinite workspace.
- Add pan controls (drag and/or space+drag) and zoom controls (wheel/trackpad pinch).
- Implement zoom-to-pointer behavior for natural navigation.
- Implement screen-to-world and world-to-screen coordinate utilities.
- Add min/max zoom constraints and a reset-view action.
- Add pointer/hit-test utilities reused by creation and manipulation flows.
- Ensure interaction updates avoid unnecessary rerenders during pan/zoom.

### Acceptance Criteria

- Pan/zoom is smooth and predictable.
- Coordinate conversions remain accurate at different zoom levels.
- Users can navigate to any area of the board without fixed canvas boundaries.

### Verification

- Manual interaction checks across desktop browsers.
- FPS sanity check during rapid pan/zoom.
- Validate object placement accuracy at multiple zoom levels.

## Phase 3: Core Objects (MVP Primitives)

### Tasks

- Define canonical board object schema for MVP types (`sticky`, `rectangle`) with IDs and timestamps.
- Implement sticky note creation with editable text and color updates.
- Implement rectangle creation with editable visual properties (at minimum color).
- Add single-object selection and drag/move interactions.
- Add minimal editing controls needed for MVP (text/color and basic shape edits).
- Implement object reducers/helpers used by both local state and sync layer.
- Add unit tests for object reducers and coordinate/transform helpers.

### Acceptance Criteria

- Users can create, move, and edit sticky notes.
- Users can create, move, and edit at least one shape type (rectangle).
- Interactions are stable and do not corrupt object state.

### Verification

- Manual CRUD flow for sticky notes and rectangles in browser.
- Unit tests pass for object state transforms.
- Typecheck/build still pass after object feature integration.

## Phase 4: Realtime Sync + Persistence

### Tasks

- Define Firestore collections/doc schema for board objects scoped by board ID.
- Define a shared collaboration protocol envelope for all object mutations (`opId`, `actorId`, `boardId`, `objectId`, `baseVersion`, `clientTs`, `serverTs`, `type`, `payload`).
- Add operation idempotency guarantees (duplicate op suppression by `opId`).
- Implement initial board load and live snapshot listeners.
- Implement create/update/move/edit writes with `serverTimestamp`.
- Implement optimistic local updates with remote reconciliation and local echo suppression.
- Implement drag sync strategy (throttled updates during drag, final write on drag end).
- Define and document conflict policy (last-write-wins based on update timestamp).
- Implement explicit sync connection states (`idle`, `connecting`, `connected`, `degraded`, `reconnecting`, `disconnected`).
- Implement resume/recovery semantics (resume token or checkpoint-based replay from last acknowledged change).
- Add board-session orchestrator module to own ordered startup/shutdown of sync, objects, and presence per route.
- Add reconnect/resubscribe behavior and recovery after transient disconnect.
- Ensure full board state persists after all users leave and rejoin later.

### Acceptance Criteria

- Two or more users see object operations reflected in near real time.
- Refresh during active editing does not lose persisted state.
- Simultaneous edits resolve deterministically per documented policy.
- Reconnect/replay does not duplicate operations or corrupt object state.

### Verification

- Two-browser sync test for create/move/edit.
- Network throttle/disconnect/reconnect test.
- Refresh mid-edit and verify recovered state from Firestore.
- Replay the same operation payload twice and confirm idempotent apply behavior.

## Phase 5: Multiplayer Cursors + Presence

### Tasks

- Add realtime cursor channel in Firebase RTDB for ephemeral cursor state.
- Broadcast cursor position at a controlled frequency to reduce write load.
- Render remote cursors with user name labels.
- Implement presence tracking using RTDB connection state and heartbeats.
- Handle abrupt disconnect cleanup with RTDB `onDisconnect`.
- Add presence roster UI showing current online users.
- Add RTDB security rules for cursor and presence paths.

### Acceptance Criteria

- Active users see each other's cursors and name labels with low latency.
- Presence list accurately reflects online/offline transitions.
- Stale cursor/presence entries are cleaned up after disconnects.

### Verification

- Test with 2-5 concurrent browser sessions.
- Close/crash one client and verify presence cleanup.
- Validate cursor smoothness and label correctness under load.

## Phase 6: MVP Hardening + Public Deploy

### Tasks

- Harden Firestore/RTDB/Auth security rules for least privilege.
- Add end-to-end smoke test flow for auth, board create/join, object edit, sync, cursor, and presence.
- Run performance pass for 5+ users and 500+ objects; optimize obvious hotspots.
- Add user-visible error states for auth, sync, and reconnect failures.
- Configure production Firebase project and hosting pipeline.
- Deploy to a public URL and wire environment secrets safely.
- Run the MVP hard-gate checklist and capture signoff evidence.

### Acceptance Criteria

- Public deployment is accessible and stable.
- All MVP hard-gate items pass in deployed environment.
- Multi-user usage remains reliable without major degradation.

### Verification

- CI pipeline green for typecheck, build, and tests.
- Deployed smoke test with at least two real users.
- Final hard-gate checklist marked complete.

## Hard-Gate Coverage Map

- Infinite board with pan/zoom: Phase 2
- Sticky notes with editable text: Phase 3
- At least one shape type: Phase 3
- Create/move/edit objects: Phases 3-4
- Real-time sync between 2+ users: Phase 4
- Multiplayer cursors with labels: Phase 5
- Presence awareness: Phase 5
- User authentication: Phase 1
- Public deployment: Phase 6

## Modular Monolith Repo Design

### Non-Negotiables

- Single deployable app (`apps/web`) with strict internal module boundaries.
- Every domain module has one public surface: `index.ts`.
- Cross-module calls only through exported interfaces in `contracts.ts`.
- No module imports another module's `domain`, `application`, `infrastructure`, or `ui` internals.
- Composition happens only in `apps/web/src/app/composition-root.ts`.
- Board lifecycle orchestration must live in a dedicated `board-session` module (not in UI components).
- Collaboration change schema must be centralized in `collab-protocol` and reused by `objects` and `sync`.
- Authorization capabilities must be centralized in `permissions` and shared by Firestore and RTDB assumptions.

### Repo Layout Draft

```text
collabboard/
  docs/
    architecture/
      ADR-0001-modular-monolith.md
      ADR-0002-data-model.md
      MODULE_BOUNDARIES.md
  scripts/
    check-prereqs.ts
    bootstrap-dev.ts
  firebase/
    firebase.json
    firestore.rules
    firestore.indexes.json
    database.rules.json
    emulators.seed.json
  apps/
    web/
      bunfig.toml
      package.json
      tsconfig.json
      vite.config.ts
      src/
        app/
          main.tsx
          App.tsx
          router.tsx
          providers.tsx
          composition-root.ts
          module-registry.ts
        core/
          module-system.ts
          env.ts
          ids.ts
          errors.ts
          events.ts
        modules/
          auth/
          board-access/
          permissions/
          viewport/
          objects/
          collab-protocol/
          sync/
          board-session/
          presence/
          reliability/
        shared/
          ui/
          hooks/
          lib/
      tests/
        unit/
        e2e/
  Dockerfile
  docker-compose.yml
  .github/workflows/ci.yml
```

### Module Folder Shape (same for every module)

```text
src/modules/<module>/
  index.ts
  contracts.ts
  domain/
  application/
  infrastructure/
  ui/
  __tests__/
```

### Core Module Interfaces by Phase

```ts
// Phase 0
export interface AppModule<TApi> {
  id: string;
  init(ctx: ModuleContext): Promise<TApi>;
  dispose(): Promise<void>;
}
export interface EnvApi {
  get(): AppEnv;
  validate(): void;
}

// Phase 1
export interface AuthApi {
  readiness(): Promise<void>;
  observeSession(cb: (s: AuthSession | null) => void): () => void;
  signIn(provider: AuthProvider): Promise<AuthSession>;
  signOut(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  currentUser(): AuthUser | null;
}
export interface BoardAccessApi {
  createBoard(input: CreateBoardInput): Promise<{ boardId: string }>;
  getBoard(boardId: string): Promise<BoardMeta | null>;
  canAccess(boardId: string, capability: BoardCapability): Promise<boolean>;
  grantMembership(boardId: string, userId: string, role: BoardRole): Promise<void>;
  observeMembership(boardId: string, cb: (m: Membership | null) => void): () => void;
}
export interface PermissionsApi {
  can(capability: BoardCapability, ctx: PermissionContext): boolean;
  listCapabilities(role: BoardRole): BoardCapability[];
}

// Phase 2
export interface ViewportApi {
  getCamera(): Camera;
  setCamera(camera: Camera): void;
  panBy(delta: Vec2): void;
  zoomAt(screen: Vec2, factor: number): void;
  screenToWorld(screen: Vec2): Vec2;
  worldToScreen(world: Vec2): Vec2;
}

// Phase 3
export interface ObjectsApi {
  applyLocal(intent: ObjectIntent): Promise<ApplyResult>;
  applyRemote(op: BoardOperation): Promise<ApplyResult>;
  getSnapshot(): ObjectsSnapshot;
  observeObjects(cb: (state: ObjectsState) => void): () => void;
}
export interface BoardOperation {
  opId: string;
  actorId: string;
  boardId: string;
  objectId: string;
  type: ObjectOperationType;
  payload: unknown;
  baseVersion: number;
  clientTs: number;
  serverTs?: number;
}

// Phase 4
export interface SyncApi {
  connect(input: {
    boardId: string;
    actorId: string;
    resumeToken?: string;
  }): Promise<SyncConnectResult>;
  disconnect(): Promise<void>;
  status(): SyncConnectionStatus;
  observeStatus(cb: (status: SyncConnectionStatus) => void): () => void;
  publish(op: BoardOperation): Promise<PublishAck>;
  observeRemote(cb: (events: SyncEvent[]) => void): () => void;
}
export interface BoardSessionApi {
  enter(boardId: string): Promise<void>;
  leave(): Promise<void>;
  observeState(cb: (state: BoardSessionState) => void): () => void;
  currentBoardId(): string | null;
}

// Phase 5
export interface PresenceApi {
  start(boardId: string, user: PresenceUser): Promise<void>;
  stop(): Promise<void>;
  publishCursor(cursor: CursorState): void;
  observeCursors(cb: (cursors: CursorState[]) => void): () => void;
  observeOnlineUsers(cb: (users: PresenceUser[]) => void): () => void;
}

// Phase 6
export interface ReliabilityApi {
  reportError(error: Error, context: Record<string, string>): void;
  reportMetric(metric: ClientMetric): void;
}
```

### Phase-to-Module Mapping (necessary and correct)

- Phase 0: `core`, `app`, toolchain scripts, Firebase config.
- Phase 1: `auth`, `board-access`, `permissions`.
- Phase 2: `viewport`.
- Phase 3: `objects`, `collab-protocol`.
- Phase 4: `sync` (Firestore adapters + conflict policy), `board-session`.
- Phase 5: `presence` (RTDB adapters).
- Phase 6: `reliability` additions + hardening across all modules.

### Start Lock-In Steps

1. Create the directory skeleton and empty `contracts.ts`/`index.ts` files for all modules.
2. Define shared `collab-protocol` operation/event types first, then implement `objects` and `sync` against those contracts.
3. Add lint rule in `MODULE_BOUNDARIES.md` and ESLint config to block cross-module internal imports.
4. Implement `board-session` orchestration and module registration before wiring board UI flows.

### Runtime Execution Flow (authoritative)

1. App boots core modules and waits for `AuthApi.readiness()`.
2. Route enters `/board/:id`; `BoardAccessApi.canAccess(..., "board:read")` gates entry.
3. `BoardSessionApi.enter(boardId)` starts modules in order: `sync.connect` -> objects snapshot hydrate -> `presence.start`.
4. Local UI actions call `ObjectsApi.applyLocal(intent)`, which emits protocol operations.
5. `SyncApi.publish(op)` persists and acks operations; remote events are fed through `ObjectsApi.applyRemote(op)`.
6. Duplicate/replayed operations are ignored by `opId` idempotency rules.
7. Route leave or sign-out calls `BoardSessionApi.leave()` for ordered teardown: cursor publish stop -> presence stop -> sync disconnect.
