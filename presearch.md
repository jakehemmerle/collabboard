# CollabBoard Pre-Search Document

**Author:** Jake  
**Date:** February 16, 2026  
**Project:** Real-Time Collaborative Whiteboard with AI Agent

> **Note:** This document captures architecture decisions and directional plans made during pre-search. High-level decisions (stack choices, hosting, conflict resolution strategy) are firm. Implementation specifics — file structures, schemas, tool signatures — are drafts and will evolve freely during development. We are in early development with zero users and zero backwards compatibility concerns.

---

## Phase 1: Define Your Constraints

### 1. Scale & Load Profile

- **Users at launch:** 5–10 concurrent (build for rubric requirements)
- **Traffic pattern:** Spiky — evaluators testing simultaneously during review windows
- **Real-time requirements:** WebSocket-based for all real-time operations (cursor sync, object mutations, presence)
- **Cold start tolerance:** Low — Compute Engine VM stays warm, no serverless cold start concern

### 3. Time to Ship

- **MVP timeline:** 24 hours (hard gate)
- **Priority:** Clean architecture from day one. No tech debt, no backwards compatibility concerns. Early development with zero users means we can make breaking changes freely.
- **Iteration cadence:** Daily — checkpoints at 24hrs (MVP), 4 days (full features), 7 days (polish + deploy)

### 5. Team & Skill Constraints

- **Solo developer** with multiple AI coding agents working in parallel
- **AI-first workflow:** Claude Code as primary agent, with parallel task execution across agents
- **Core languages:** TypeScript (full stack), Bun runtime
- **Approach:** Define a thorough task graph with clear acceptance criteria, then distribute tasks across agents

---

## Phase 2: Architecture Discovery

### 6. Hosting & Deployment

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **WebSocket Server** | GCP Compute Engine | Persistent connections without timeout limits. WebSocket sessions last hours during whiteboard use — Cloud Run's connection timeouts are a poor fit. |
| **Frontend** | Firebase Hosting (GCP) | Static SPA deployment, CDN-backed, same ecosystem as Auth + Firestore |
| **IaC** | Pulumi (TypeScript) | Reproducible infrastructure, aligns with all-TypeScript stack. Attempt setup early; fall back to Firebase CLI if it blocks MVP. |
| **Containers** | Docker | Reproducible builds, consistent dev/prod parity |
| **CI/CD** | GitHub Actions → GCP | Deploys frontend to Firebase Hosting, server Docker image to Compute Engine |

### 7. Authentication & Authorization

| Decision | Detail |
|----------|--------|
| **Provider** | Firebase Authentication |
| **Methods** | Google sign-in + anonymous guests |
| **Guest flow** | Anonymous users join boards without account creation. Can optionally upgrade to permanent account. |
| **Token verification** | Firebase Admin SDK on WebSocket handshake. Server verifies ID token before accepting connection. |
| **RBAC** | Not needed for MVP. All authenticated/anonymous users have equal board access. |
| **Multi-tenancy** | Boards are isolated by `boardId`. No workspace/org layer needed. |

### 8. Database & Data Layer

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Persistence** | Cloud Firestore | Board state storage, object CRUD, state recovery on reconnect/refresh |
| **Real-time transport** | Bun WebSocket server | All live operations: cursor sync, object mutations, presence |
| **No RTDB** | Eliminated | WebSocket server handles cursor and presence directly. RTDB would be a redundant transport layer. |

**Data flow:**

1. Client sends mutation via WebSocket
2. Server mutation layer processes it (validation, LWW conflict resolution)
3. Server broadcasts to all connected clients on that board
4. Server writes through to Firestore asynchronously for persistence
5. On join/reconnect, client hydrates full board state from Firestore, then WebSocket takes over

**Conflict resolution:** Last-Write-Wins everywhere. Each object carries an `updatedAt` timestamp. Highest timestamp wins. Simple, predictable, easy to reason about. If concurrent text editing inside sticky notes becomes a problem, Yjs can be introduced later — the refactor surface is limited to the text content field.

### 9. Backend / API Architecture

**Pattern:** Layered monolith (single Bun process)

```
┌─────────────────────────────────────────┐
│              Bun Process                │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │ WS Handler  │   │   AI Agent      │  │
│  │ (transport) │   │ (Claude tools)  │  │
│  └──────┬──────┘   └────────┬────────┘  │
│         │                   │           │
│         ▼                   ▼           │
│  ┌──────────────────────────────────┐   │
│  │       Mutation Layer             │   │
│  │  (pure TypeScript functions)     │   │
│  │  createObject / moveObject /     │   │
│  │  updateText / deleteObject /     │   │
│  │  getBoardState                   │   │
│  └──────────────┬───────────────────┘   │
│                 │                       │
│                 ▼                       │
│  ┌──────────────────────────────────┐   │
│  │     Persistence Layer            │   │
│  │     (Firestore read/write)       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key design principle:** The mutation layer is a pure TypeScript module with no transport awareness. Three consumers call the same interface: the WebSocket handler, the AI agent, and tests. This is what makes the architecture clean — not service boundaries, but clean function boundaries.

### 10. Frontend Framework & Rendering

| Decision | Detail |
|----------|--------|
| **Framework** | React 18+ with TypeScript |
| **Canvas** | Konva.js via `react-konva` |
| **Bundler** | Vite |
| **State management** | Zustand (with disciplined selectors to avoid unnecessary re-renders) |
| **SSR/SEO** | Not needed — SPA only |
| **PWA/Offline** | Not needed |

**Why Konva.js:** Built-in hit detection, drag-and-drop, transform handles (resize/rotate), and React bindings. These are features you'd otherwise build by hand with raw Canvas. Fabric.js has a jQuery-era API that fights React. PixiJS is fastest but lowest-level.

**Render performance note:** With 500+ objects and 60fps cursor updates, Zustand selectors must be granular. Subscribe to individual object IDs, not the entire board state. If this becomes a bottleneck, Jotai's atomic model is a clean migration — but Zustand with discipline should work.

### 11. Third-Party Integrations

| Service | Purpose | Cost Risk |
|---------|---------|-----------|
| **Firebase Auth** | Authentication | Free tier covers project scale |
| **Cloud Firestore** | Persistence | Free tier: 50K reads/20K writes per day. Sufficient for 5-10 users. |
| **Anthropic Claude API** | AI agent (function calling) | Pay-per-token. Must track and report. |
| **Firebase Hosting** | Frontend hosting (CDN-backed SPA) | Free tier: 10GB hosting, 360MB/day transfer. Sufficient for project scale. |
| **GCP Compute Engine** | WebSocket server | e2-micro is free tier eligible |

**Vendor lock-in assessment:** Fully committed to GCP. Firebase Auth, Firestore, and Firebase Hosting create GCP lock-in, but this is intentional — single provider simplifies ops, billing, and networking. The mutation layer abstracts Firestore behind a persistence interface, so swapping to Postgres later would only touch that layer.

---

## Phase 3: Post-Stack Refinement

### 12. Security Considerations

- **Client never writes directly to Firestore.** All mutations flow through the WebSocket server's mutation layer. Firestore rules restrict writes to the server service account only.
- **Firebase Auth token verified on WebSocket handshake.** Anonymous users get a Firebase anonymous UID, same pipeline.
- **Input validation:** Zod schemas in `packages/shared` validate all mutation payloads at the server boundary.
- **Known risks:** Bun + Firebase Admin SDK uses `@grpc/grpc-js` — needs an early spike to verify compatibility. If gRPC bindings fail, fall back to Firestore REST API.

### 13. File Structure & Project Organization

> **⚠️ DRAFT — SUBJECT TO CHANGE.** This file structure is a starting blueprint, not a contract. Module boundaries, directory names, and component decomposition will evolve as implementation reveals better patterns. We are in early development with no users and no backwards compatibility constraints.

**Monorepo with Bun workspaces:**

```
collabboard/
├── package.json              # Workspace root
├── bun.lockb
├── biome.json                # Linting + formatting config
├── tsconfig.base.json        # Shared TypeScript config
│
├── packages/
│   └── shared/               # Types, schemas, constants, validation
│       ├── package.json
│       └── src/
│           ├── types/
│           │   ├── board.ts          # BoardObject, StickyNote, Shape, etc.
│           │   ├── messages.ts       # WebSocket message types
│           │   ├── presence.ts       # Cursor, user presence types
│           │   └── ai.ts             # AI command/response types
│           ├── schemas/
│           │   └── validation.ts     # Zod schemas for runtime validation
│           └── constants/
│               └── defaults.ts       # Colors, sizes, grid spacing
│
├── apps/
│   ├── client/               # React + Konva.js + Vite
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── canvas/
│   │       │   ├── Board.tsx             # Main Konva Stage + Layer
│   │       │   ├── objects/
│   │       │   │   ├── StickyNote.tsx
│   │       │   │   ├── ShapeRect.tsx
│   │       │   │   ├── ShapeCircle.tsx
│   │       │   │   ├── ShapeLine.tsx
│   │       │   │   ├── Frame.tsx
│   │       │   │   ├── Connector.tsx
│   │       │   │   └── TextElement.tsx
│   │       │   ├── interactions/
│   │       │   │   ├── Selection.tsx      # Single + multi-select
│   │       │   │   ├── Transform.tsx      # Resize/rotate handles
│   │       │   │   └── PanZoom.tsx        # Infinite canvas controls
│   │       │   └── cursors/
│   │       │       └── RemoteCursor.tsx   # Other users' cursors
│   │       ├── collaboration/
│   │       │   ├── useWebSocket.ts        # WS connection + reconnect
│   │       │   ├── usePresence.ts         # Online users tracking
│   │       │   └── useCursorSync.ts       # Cursor position broadcast
│   │       ├── auth/
│   │       │   ├── AuthProvider.tsx
│   │       │   └── useAuth.ts
│   │       ├── store/
│   │       │   ├── boardStore.ts          # Zustand: board objects
│   │       │   ├── uiStore.ts            # Zustand: selection, tool mode
│   │       │   └── presenceStore.ts      # Zustand: online users, cursors
│   │       ├── ai/
│   │       │   └── CommandInput.tsx       # Natural language AI input
│   │       └── components/
│   │           ├── Toolbar.tsx
│   │           └── PresenceBar.tsx
│   │
│   └── server/               # Bun WebSocket server
│       ├── package.json
│       └── src/
│           ├── index.ts                  # Bun.serve() entry point
│           ├── ws/
│           │   ├── handler.ts            # WebSocket message routing
│           │   ├── rooms.ts              # Board room management
│           │   └── auth.ts               # Firebase token verification
│           ├── mutations/
│           │   ├── objects.ts            # create, move, resize, delete, duplicate
│           │   ├── text.ts              # updateText, changeColor
│           │   ├── board.ts             # getBoardState, clearBoard
│           │   └── index.ts             # Unified mutation interface
│           ├── persistence/
│           │   ├── firestore.ts         # Firestore client + operations
│           │   └── serialization.ts     # Object <-> Firestore doc mapping
│           └── ai/
│               ├── agent.ts             # Claude function calling orchestration
│               └── tools.ts             # Tool definitions mapping to mutations
│
├── e2e/                      # Playwright multi-browser tests
│   ├── playwright.config.ts
│   └── tests/
│       ├── collaboration.spec.ts        # 2 users, real-time sync assertions
│       ├── persistence.spec.ts          # Refresh mid-edit, state survives
│       ├── ai-commands.spec.ts          # AI agent E2E
│       └── performance.spec.ts          # 500+ objects, network throttle
│
├── infra/                    # Pulumi GCP config
│   ├── Pulumi.yaml
│   ├── Pulumi.dev.yaml
│   └── index.ts              # Compute Engine, Firestore, networking
│
└── docker/
    ├── Dockerfile.server
    └── docker-compose.yml    # Local dev: server + Firestore emulator
```

### 14. Naming Conventions & Code Style

| Concern | Convention |
|---------|-----------|
| **Files** | `camelCase.ts` for modules, `PascalCase.tsx` for React components |
| **Variables/functions** | `camelCase` |
| **Types/interfaces** | `PascalCase` |
| **Constants** | `UPPER_SNAKE_CASE` |
| **WebSocket messages** | `snake_case` event names (e.g., `object_created`, `cursor_moved`) |
| **Firestore collections** | `camelCase` (e.g., `boards`, `boardObjects`) |
| **Linter/formatter** | Biome (replaces ESLint + Prettier, native Bun support, fast) |

### 15. Testing Strategy

| Level | Tool | Scope |
|-------|------|-------|
| **Unit** | Vitest | Mutation layer pure functions, validation schemas, serialization |
| **Integration** | Vitest | Firestore persistence layer (against emulator) |
| **E2E** | Playwright | Multi-browser collaboration scenarios |

**Critical E2E test: Two-user collaboration (happy path)**

1. User A and User B open the same board in separate browser contexts
2. User A creates a sticky note → assert User B sees it within 100ms
3. User B moves the sticky note → assert User A sees new position
4. User A refreshes → assert board state is fully restored from Firestore
5. Assert both users' cursors are visible with name labels

**Additional E2E scenarios:**

- Network disconnect → reconnect → state consistency
- AI command execution visible to all connected users
- 500+ objects on board without frame rate degradation

**Local dev testing:** Docker Compose with Firebase Emulator Suite (Firestore + Auth emulators) for offline development and CI.

### 16. Recommended Tooling & DX

| Tool | Purpose |
|------|---------|
| **Biome** | Linting + formatting (single tool, fast, Bun-native) |
| **Vite** | Frontend dev server + bundler |
| **Firebase Emulator Suite** | Local Firestore + Auth for dev/test |
| **Docker Compose** | Reproducible local environment |
| **Playwright UI mode** | Visual test debugging for E2E |
| **Bun --watch** | Server hot reload during development |

---

## Object Schema (Core Data Model)

> **⚠️ DRAFT — SUBJECT TO CHANGE.** This schema represents our initial thinking on the data model. Field names, type hierarchies, and the inheritance structure will be refined during implementation. Nothing here is locked — we will break and reshape this freely as we learn what the rendering layer, sync pipeline, and AI agent actually need.

This is the contract that rendering, sync, AI agent, and persistence all build against.

```typescript
// packages/shared/src/types/board.ts

interface BoardObject {
  id: string;                    // UUID v4
  type: 'sticky' | 'shape' | 'frame' | 'connector' | 'text';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;              // degrees
  zIndex: number;
  createdBy: string;             // Firebase Auth UID
  createdAt: number;             // Unix timestamp ms
  updatedAt: number;             // LWW conflict resolution key
  boardId: string;
}

interface StickyNote extends BoardObject {
  type: 'sticky';
  text: string;
  color: string;                 // hex, e.g. "#FFEB3B"
}

interface Shape extends BoardObject {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  fill: string;                  // hex
  stroke: string;                // hex
  strokeWidth: number;
}

interface Frame extends BoardObject {
  type: 'frame';
  title: string;
  fill: string;                  // hex, semi-transparent background
}

interface Connector extends BoardObject {
  type: 'connector';
  fromObjectId: string;
  toObjectId: string;
  style: 'line' | 'arrow';
  stroke: string;
  strokeWidth: number;
}

interface TextElement extends BoardObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
}
```

---

## AI Agent Tool Schema

> **⚠️ DRAFT — SUBJECT TO CHANGE.** Tool names, parameter signatures, and available operations will evolve alongside the object schema and mutation layer. This is a directional sketch, not a finalized API.

Maps directly to the mutation layer interface. The AI agent calls the same functions as the WebSocket handler.

```typescript
// Tool definitions for Claude function calling
const tools = [
  createStickyNote(text: string, x: number, y: number, color: string),
  createShape(type: ShapeType, x: number, y: number, width: number, height: number, color: string),
  createFrame(title: string, x: number, y: number, width: number, height: number),
  createConnector(fromId: string, toId: string, style: 'line' | 'arrow'),
  moveObject(objectId: string, x: number, y: number),
  resizeObject(objectId: string, width: number, height: number),
  updateText(objectId: string, newText: string),
  changeColor(objectId: string, color: string),
  deleteObject(objectId: string),
  getBoardState(),  // Returns all current board objects for context
];
```

The AI agent connects as a virtual client through the mutation layer — its operations are broadcast to all connected users via the same WebSocket pipeline. Multiple users can issue AI commands simultaneously; LWW handles any conflicts.

---

## Build Priority Order

1. **WebSocket cursor sync** — Two cursors moving across browsers
2. **Object sync** — Sticky notes appear for all users in real-time
3. **Conflict handling** — LWW with `updatedAt` timestamps
4. **State persistence** — Firestore write-through, hydration on join/reconnect
5. **Board features** — Shapes, frames, connectors, transforms, selection
6. **AI commands (basic)** — Single-step creation and manipulation
7. **AI commands (complex)** — Multi-step templates (SWOT, journey maps)

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bun + Firebase Admin SDK gRPC incompatibility | Blocks persistence layer | Early spike (hour 1). Fallback: Firestore REST API. |
| Pulumi GCP setup exceeds time budget | Delays MVP | Timebox to 2 hours. Fallback: Firebase CLI + manual Compute Engine setup. |
| Konva.js performance at 500+ objects | Fails performance target | Use Konva layer separation (static objects vs. active objects). Virtualize off-screen objects. |
| WebSocket reconnection state drift | Users see stale data | On reconnect, full Firestore hydration + diff against local state. |
| AI agent latency > 2s for complex commands | Fails AI performance target | Stream intermediate results. Batch multi-step tool calls. |

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale |
|---|----------|------------------------|-----------|
| 1 | Bun runtime (full stack) | Node.js | TypeScript-native, fast startup, built-in WebSocket server, native workspace support |
| 2 | WebSocket + Firestore (no RTDB) | Firestore + RTDB hybrid, Firebase listeners only | Simplest architecture. WebSocket handles all real-time ops. Firestore is persistence only. Eliminates sync-of-syncs problem. |
| 3 | Last-Write-Wins everywhere | Custom CRDTs, Yjs | Conflict surface for whiteboards is narrow (mostly position/size). LWW is simple, predictable, debuggable. Yjs can be added later for text editing only. |
| 4 | Compute Engine for WS server | Cloud Run, GKE | Persistent connections without timeout limits. GKE is overkill for a single process. Cloud Run has connection lifecycle constraints. |
| 5 | Konva.js | Fabric.js, PixiJS, raw Canvas | React bindings, built-in interaction primitives, good enough performance for 500+ objects. |
| 6 | Zustand | Jotai, Redux Toolkit | Minimal boilerplate, familiar API. Granular selectors mitigate re-render concerns. |
| 7 | Firebase Auth (Google + anonymous) | Custom auth, Auth0 | Zero backend auth code. Anonymous guests reduce friction for evaluators. |
| 8 | Layered monolith | Microservices, monolith | Clean function boundaries without service overhead. Mutation layer is the shared interface for WS, AI agent, and tests. |
| 9 | Biome | ESLint + Prettier | Single tool, fast, Bun-native. No config sprawl. |
| 10 | Playwright | Cypress, Vitest only | Multi-browser context support is essential for testing real-time collaboration. |
